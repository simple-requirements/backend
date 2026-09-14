import { AccountRole } from "@/auth/accounts/account-role.enum";
import { UserStatus } from "@/auth/accounts/user-status.enum";
import { User } from "@/auth/accounts/users.entity";
import { AuthenticationBootstrap } from "@/auth/bootstrap/authentication-bootstrap.entity";
import dataSource from "@/database/data-source";

async function main(): Promise<void> {
  const username = process.argv.at(2)?.trim();
  if (!username) {
    throw new Error("Usage: pnpm auth:recover-administrator <username>");
  }
  await dataSource.initialize();
  try {
    await dataSource.transaction(async (manager) => {
      if (
        (await manager.getRepository(AuthenticationBootstrap).count()) === 0
      ) {
        throw new Error("Initial Administrator bootstrap has not completed.");
      }
      const user = await manager.getRepository(User).findOneBy({
        normalizedUsername: username
          .normalize("NFKC")
          .toLocaleLowerCase("en-US"),
      });
      if (user === null) throw new Error(`User "${username}" was not found.`);
      if (user.emailVerifiedAt === null) {
        throw new Error(
          "The recovery account must have a verified email address.",
        );
      }
      if (user.role !== AccountRole.Administrator) {
        throw new Error(
          "Administrator recovery can only reactivate an existing Administrator account.",
        );
      }
      user.status = UserStatus.Active;
      await manager.getRepository(User).save(user);
    });
  } finally {
    await dataSource.destroy();
  }
}

main().catch((error: unknown) => {
  console.error(
    error instanceof Error ? error.message : "Administrator recovery failed.",
  );
  process.exitCode = 1;
});
