export enum RequirementRevisionChangeType {
  Created = "requirement_created",
  ContentChanged = "content_changed",
  CategoryChanged = "category_changed",
  Approved = "approved",
  Rejected = "rejected",
  Implemented = "implemented",
  Obsoleted = "obsoleted",
  ImplementationTicketCreated = "implementation_ticket_created",
  ImplementationTicketUpdated = "implementation_ticket_updated",
  ImplementationTicketRemoved = "implementation_ticket_removed",
}

export interface RequirementRevisionActor {
  readonly userId: string | null;
  readonly displayName: string;
}

export interface RequirementRevisionMetadata {
  readonly changeType: RequirementRevisionChangeType;
  readonly changeReason: string;
  readonly actor: RequirementRevisionActor;
}

export const systemRevisionActor: RequirementRevisionActor = {
  userId: null,
  displayName: "System",
};

export function revisionActorFromAuthenticatedUser(user: { readonly id: string; readonly displayName: string }): RequirementRevisionActor {
  return { userId: user.id, displayName: user.displayName };
}
