import { BadRequestException, ConflictException } from "@nestjs/common";
import type { DataSource } from "typeorm";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AccountRole } from "@/auth/accounts/account-role.enum";
import { UserStatus } from "@/auth/accounts/user-status.enum";
import { User } from "@/auth/accounts/users.entity";
import { UserAdministrationService } from "@/auth/administration/user-administration.service";
import { ProjectMembership } from "@/auth/authorization/project-membership.entity";
import type { SessionService } from "@/auth/sessions/session.service";

function user(overrides: Partial<User> = {}): User {
  return Object.assign(new User(), {
    id: "3a7f9e0c-8d9c-4a5f-a3d2-1a44a28e0d11",
    username: "account",
    email: "account@example.org",
    displayName: "Account",
    status: UserStatus.Pending,
    role: null,
    emailVerifiedAt: new Date(),
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  });
}

describe("UserAdministrationService role model", () => {
  const repository = {
    find: vi.fn(),
    findOneBy: vi.fn(),
    save: vi.fn((value: User) => Promise.resolve(value)),
  };
  const membershipRepository = {
    countBy: vi.fn(),
  };
  const dataSource = {
    getRepository: vi.fn((entity: unknown) =>
      entity === ProjectMembership ? membershipRepository : repository,
    ),
  };
  const sessions = {
    revokeAllForUser: vi.fn(),
    listForUser: vi.fn(),
    revokeSession: vi.fn(),
  };
  const service = new UserAdministrationService(
    dataSource as unknown as DataSource,
    sessions as unknown as SessionService,
  );

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("assigns exactly one role while the account is pending.", async () => {
    repository.findOneBy.mockResolvedValue(user());

    await expect(
      service.assignRole(
        "3a7f9e0c-8d9c-4a5f-a3d2-1a44a28e0d11",
        AccountRole.RequirementsEngineer,
      ),
    ).resolves.toMatchObject({ role: AccountRole.RequirementsEngineer });
    expect(repository.save).toHaveBeenCalledWith(
      expect.objectContaining({ role: AccountRole.RequirementsEngineer }),
    );
  });

  it("does not allow an active account to be converted into another role.", async () => {
    repository.findOneBy.mockResolvedValue(
      user({ status: UserStatus.Active, role: AccountRole.Viewer }),
    );

    await expect(
      service.assignRole(
        "3a7f9e0c-8d9c-4a5f-a3d2-1a44a28e0d11",
        AccountRole.Developer,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(repository.save).not.toHaveBeenCalled();
  });

  it("requires a role before activation.", async () => {
    repository.findOneBy.mockResolvedValue(user({ role: null }));

    await expect(
      service.updateStatus(
        "3a7f9e0c-8d9c-4a5f-a3d2-1a44a28e0d11",
        UserStatus.Active,
      ),
    ).rejects.toEqual(
      new BadRequestException(
        "An account role must be assigned before activation.",
      ),
    );
  });

  it("activates a verified pending account after a role was assigned.", async () => {
    repository.findOneBy.mockResolvedValue(
      user({ role: AccountRole.Developer }),
    );

    await expect(
      service.updateStatus(
        "3a7f9e0c-8d9c-4a5f-a3d2-1a44a28e0d11",
        UserStatus.Active,
      ),
    ).resolves.toMatchObject({
      status: UserStatus.Active,
      role: AccountRole.Developer,
    });
  });

  it("allows an unassigned pending account to be deactivated.", async () => {
    repository.findOneBy.mockResolvedValue(user({ role: null }));

    await expect(
      service.updateStatus(
        "3a7f9e0c-8d9c-4a5f-a3d2-1a44a28e0d11",
        UserStatus.Deactivated,
      ),
    ).resolves.toMatchObject({
      status: UserStatus.Deactivated,
      role: null,
    });
    expect(sessions.revokeAllForUser).toHaveBeenCalledWith(
      "3a7f9e0c-8d9c-4a5f-a3d2-1a44a28e0d11",
    );
  });

  it("allows a deactivated account to change its project-scoped role.", async () => {
    repository.findOneBy.mockResolvedValue(
      user({
        status: UserStatus.Deactivated,
        role: AccountRole.RequirementsEngineer,
      }),
    );

    await expect(
      service.assignRole(
        "3a7f9e0c-8d9c-4a5f-a3d2-1a44a28e0d11",
        AccountRole.Viewer,
      ),
    ).resolves.toMatchObject({ role: AccountRole.Viewer });
    expect(repository.save).toHaveBeenCalledWith(
      expect.objectContaining({ role: AccountRole.Viewer }),
    );
  });

  it("allows a deactivated account without memberships to become Administrator.", async () => {
    repository.findOneBy.mockResolvedValue(
      user({ status: UserStatus.Deactivated, role: AccountRole.Viewer }),
    );
    membershipRepository.countBy.mockResolvedValue(0);

    await expect(
      service.assignRole(
        "3a7f9e0c-8d9c-4a5f-a3d2-1a44a28e0d11",
        AccountRole.Administrator,
      ),
    ).resolves.toMatchObject({ role: AccountRole.Administrator });
    expect(membershipRepository.countBy).toHaveBeenCalledWith({
      userId: "3a7f9e0c-8d9c-4a5f-a3d2-1a44a28e0d11",
    });
  });

  it("blocks Administrator assignment while project memberships still exist.", async () => {
    repository.findOneBy.mockResolvedValue(
      user({ status: UserStatus.Deactivated, role: AccountRole.Viewer }),
    );
    membershipRepository.countBy.mockResolvedValue(1);

    await expect(
      service.assignRole(
        "3a7f9e0c-8d9c-4a5f-a3d2-1a44a28e0d11",
        AccountRole.Administrator,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(repository.save).not.toHaveBeenCalled();
  });
});
