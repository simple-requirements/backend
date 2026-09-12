import { SetMetadata } from "@nestjs/common";

export enum ProjectPermission {
  ReadProject = "read_project",
  Read = "read",
  Administer = "administer",
  ManageRequirements = "manage_requirements",
  ManageTickets = "manage_tickets",
}
export const PROJECT_PERMISSION_KEY = "projectPermission";
export const RequireProjectPermission = (permission: ProjectPermission) =>
  SetMetadata(PROJECT_PERMISSION_KEY, permission);
