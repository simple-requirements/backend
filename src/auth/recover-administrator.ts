import dataSource from "@/database/data-source";
import { AuthenticationBootstrap } from "@/auth/bootstrap/authentication-bootstrap.entity";
import { GlobalRole } from "@/auth/authorization/global-role.enum";
import { GlobalUserRole } from "@/auth/authorization/global-user-role.entity";
import { UserStatus } from "@/auth/accounts/user-status.enum";
import { User } from "@/auth/accounts/users.entity";

async function main(): Promise<void> {
  const username = process.argv.at(2)?.trim();
  if (!username)
    throw new Error("Usage: pnpm auth:recover-administrator <username>");
  await dataSource.initialize();
  try {
    await dataSource.transaction(async (manager) => {
      if ((await manager.getRepository(AuthenticationBootstrap).count()) === 0)
        throw new Error("Initial Administrator bootstrap has not completed.");
      const user = await manager.getRepository(User).findOneBy({
        normalizedUsername: username
          .normalize("NFKC")
          .toLocaleLowerCase("en-US"),
      });
      if (user === null) throw new Error(`User "${username}" was not found.`);
      if (user.emailVerifiedAt === null)
        throw new Error(
          "The recovery account must have a verified email address.",
        );
      user.status = UserStatus.Active;
      await manager.getRepository(User).save(user);
      const roles = manager.getRepository(GlobalUserRole);
      if (
        (await roles.findOneBy({
          userId: user.id,
          role: GlobalRole.Administrator,
        })) === null
      )
        await roles.save(
          roles.create({ userId: user.id, role: GlobalRole.Administrator }),
        );
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
