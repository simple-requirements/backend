export enum AccountRole {
  Administrator = "administrator",
  RequirementsEngineer = "requirements_engineer",
  Developer = "developer",
  Viewer = "viewer",
}

export const PROJECT_ACCOUNT_ROLES = [
  AccountRole.RequirementsEngineer,
  AccountRole.Developer,
  AccountRole.Viewer,
] as const;

export type ProjectAccountRole = (typeof PROJECT_ACCOUNT_ROLES)[number];

export function isProjectAccountRole(
  role: AccountRole | null,
): role is ProjectAccountRole {
  return (
    role !== null && PROJECT_ACCOUNT_ROLES.includes(role as ProjectAccountRole)
  );
}
