import {
  expectErrorResponseBody,
  expectIsoDateString,
  expectNullableIsoDateString,
  expectRequirementResponseBody,
  type ErrorResponseBody,
  type RequirementResponseBody,
} from "@/projects/projects-api.e2e-helpers";
import { test, expect } from "@/projects/projects-api.e2e-fixtures";
import { RequirementStatus } from "@/projects/requirement-status.enum";
import { RequirementReviewCommentCloseReason } from "@/requirement-reviews/requirement-review-comment-close-reason.enum";
import { RequirementReviewCommentStatus } from "@/requirement-reviews/requirement-review-comment-status.enum";
import { RequirementReviewState } from "@/requirement-reviews/requirement-review-state.enum";

interface RequirementReviewCommentReplyResponseBody {
  id: string;
  commentId: string;
  text: string;
  author: string;
  createdAt: string;
}

interface RequirementReviewCommentResponseBody {
  id: string;
  projectId: string;
  requirementId: string;
  createdForRevisionNumber: number;
  text: string;
  status: RequirementReviewCommentStatus;
  author: string;
  closedBy: string | null;
  closeReason: RequirementReviewCommentCloseReason | null;
  closedInRevisionNumber: number | null;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
  replies: RequirementReviewCommentReplyResponseBody[];
}

function expectReviewCommentResponseBody(
  body: RequirementReviewCommentResponseBody,
  expected: Readonly<{
    projectId: string;
    requirementId: string;
    createdForRevisionNumber?: number;
    text?: string;
    status?: RequirementReviewCommentStatus;
    author?: string;
    closedBy?: string | null;
    closeReason?: RequirementReviewCommentCloseReason | null;
    closedInRevisionNumber?: number | null;
  }>,
): void {
  expect(body.projectId).toBe(expected.projectId);
  expect(body.requirementId).toBe(expected.requirementId);

  if (expected.createdForRevisionNumber !== undefined) {
    expect(body.createdForRevisionNumber).toBe(
      expected.createdForRevisionNumber,
    );
  }

  if (expected.text !== undefined) {
    expect(body.text).toBe(expected.text);
  }

  if (expected.status !== undefined) {
    expect(body.status).toBe(expected.status);
  }

  if (expected.author !== undefined) {
    expect(body.author).toBe(expected.author);
  }

  if (expected.closedBy !== undefined) {
    expect(body.closedBy).toBe(expected.closedBy);
  }

  if (expected.closeReason !== undefined) {
    expect(body.closeReason).toBe(expected.closeReason);
  }

  if (expected.closedInRevisionNumber !== undefined) {
    expect(body.closedInRevisionNumber).toBe(expected.closedInRevisionNumber);
  }

  expectIsoDateString(body.createdAt);
  expectIsoDateString(body.updatedAt);
  expectNullableIsoDateString(body.closedAt);
}

test.describe("Requirement reviews API - POST /projects/{projectId}/requirements/{requirementId}/review-comments", () => {
  test("creates and lists open review comments for a draft requirement.", async ({
    request,
    draftRequirement,
  }) => {
    const { project, requirement } = draftRequirement;

    const createResponse = await request.post(
      `/projects/${project.id}/requirements/${requirement.id}/review-comments`,
      {
        data: {
          text: "Please define allowed authentication methods.",
          author: "E2E Requirements Engineer",
        },
      },
    );

    expect(createResponse.status()).toBe(201);

    const createdComment =
      (await createResponse.json()) as RequirementReviewCommentResponseBody;

    expectReviewCommentResponseBody(createdComment, {
      projectId: project.id,
      requirementId: requirement.id,
      createdForRevisionNumber: 1,
      text: "Please define allowed authentication methods.",
      status: RequirementReviewCommentStatus.Open,
      author: "E2E Requirements Engineer",
      closedBy: null,
      closeReason: null,
      closedInRevisionNumber: null,
    });

    const listResponse = await request.get(
      `/projects/${project.id}/requirements/${requirement.id}/review-comments`,
    );

    expect(listResponse.status()).toBe(200);

    const listedComments =
      (await listResponse.json()) as readonly RequirementReviewCommentResponseBody[];

    expect(listedComments.map((comment) => comment.id)).toContain(
      createdComment.id,
    );
  });

  test("creates replies only while the main comment is open and reports the derived review state.", async ({
    request,
    draftRequirement,
  }) => {
    const { project, requirement } = draftRequirement;
    const createCommentResponse = await request.post(
      `/projects/${project.id}/requirements/${requirement.id}/review-comments`,
      {
        data: {
          text: "Please clarify this.",
          author: "E2E Requirements Engineer",
        },
      },
    );
    const comment =
      (await createCommentResponse.json()) as RequirementReviewCommentResponseBody;
    const replyResponse = await request.post(
      `/projects/${project.id}/requirements/${requirement.id}/review-comments/${comment.id}/replies`,
      {
        data: {
          text: "The requirement has been clarified.",
          author: "E2E Requirements Engineer",
        },
      },
    );

    expect(replyResponse.status()).toBe(201);
    expect(await replyResponse.json()).toMatchObject({
      commentId: comment.id,
      author: "E2E Requirements Engineer",
    });

    const summaryResponse = await request.get(
      `/projects/${project.id}/requirements/${requirement.id}/review-summary`,
    );
    expect(await summaryResponse.json()).toEqual({
      commentCount: 1,
      openCommentCount: 1,
      state: RequirementReviewState.InReview,
    });

    await request.patch(
      `/projects/${project.id}/requirements/${requirement.id}/review-comments/${comment.id}`,
      {
        data: { closedBy: "E2E Requirements Engineer" },
      },
    );
    const lateReplyResponse = await request.post(
      `/projects/${project.id}/requirements/${requirement.id}/review-comments/${comment.id}/replies`,
      { data: { text: "A late reply.", author: "E2E Requirements Engineer" } },
    );
    expect(lateReplyResponse.status()).toBe(400);
  });
});

test.describe("Requirement reviews API - PATCH /projects/{projectId}/requirements/{requirementId}/review-comments/{commentId}", () => {
  test("closes an open review comment.", async ({
    request,
    draftRequirement,
  }) => {
    const { project, requirement } = draftRequirement;
    const createResponse = await request.post(
      `/projects/${project.id}/requirements/${requirement.id}/review-comments`,
      {
        data: {
          text: "Please define allowed authentication methods.",
          author: "E2E Requirements Engineer",
        },
      },
    );
    const comment =
      (await createResponse.json()) as RequirementReviewCommentResponseBody;

    const closeResponse = await request.patch(
      `/projects/${project.id}/requirements/${requirement.id}/review-comments/${comment.id}`,
      { data: { closedBy: "E2E Requirements Engineer" } },
    );

    expect(closeResponse.status()).toBe(200);

    const closedComment =
      (await closeResponse.json()) as RequirementReviewCommentResponseBody;

    expectReviewCommentResponseBody(closedComment, {
      projectId: project.id,
      requirementId: requirement.id,
      status: RequirementReviewCommentStatus.Closed,
      closedBy: "E2E Requirements Engineer",
      closeReason: RequirementReviewCommentCloseReason.Resolved,
      closedInRevisionNumber: 1,
    });
    expect(closedComment.closedAt).not.toBeNull();
  });
});

test.describe("Requirement reviews API - POST /projects/{projectId}/requirements/{requirementId}/review/approve", () => {
  test("does not approve requirements while review comments are open.", async ({
    request,
    draftRequirement,
  }) => {
    const { project, requirement } = draftRequirement;

    const createCommentResponse = await request.post(
      `/projects/${project.id}/requirements/${requirement.id}/review-comments`,
      {
        data: {
          text: "Please clarify the acceptance criteria.",
          author: "E2E Requirements Engineer",
        },
      },
    );
    expect(createCommentResponse.status()).toBe(201);

    const approveResponse = await request.post(
      `/projects/${project.id}/requirements/${requirement.id}/review/approve`,
      {
        data: { reviewer: "E2E Requirements Engineer" },
      },
    );

    expect(approveResponse.status()).toBe(400);

    const body = (await approveResponse.json()) as ErrorResponseBody;

    expectErrorResponseBody(
      body,
      400,
      "Requirement cannot be approved while review comments are open.",
      "Bad Request",
    );
  });

  test("approves requirements when all review comments are closed.", async ({
    request,
    draftRequirement,
  }) => {
    const { project, category, requirement } = draftRequirement;
    const createCommentResponse = await request.post(
      `/projects/${project.id}/requirements/${requirement.id}/review-comments`,
      {
        data: {
          text: "Please clarify the acceptance criteria.",
          author: "E2E Requirements Engineer",
        },
      },
    );
    const comment =
      (await createCommentResponse.json()) as RequirementReviewCommentResponseBody;
    const closeResponse = await request.patch(
      `/projects/${project.id}/requirements/${requirement.id}/review-comments/${comment.id}`,
      { data: { closedBy: "E2E Requirements Engineer" } },
    );
    expect(closeResponse.status()).toBe(200);

    const approveResponse = await request.post(
      `/projects/${project.id}/requirements/${requirement.id}/review/approve`,
      {
        data: { reviewer: "E2E Requirements Engineer" },
      },
    );

    expect(approveResponse.status()).toBe(200);

    const approvedRequirement =
      (await approveResponse.json()) as RequirementResponseBody;

    expectRequirementResponseBody(approvedRequirement, {
      id: requirement.id,
      projectId: project.id,
      categoryId: category.id,
      revisionNumber: 2,
      status: RequirementStatus.Approved,
    });
    expect(approvedRequirement.reviewer).toBe("E2E Requirements Engineer");
    expect(approvedRequirement.approvedAt).not.toBeNull();
  });
});

test.describe("Requirement reviews API - POST /projects/{projectId}/requirements/{requirementId}/review/reject", () => {
  test("rejects a requirement and auto-closes open review comments.", async ({
    request,
    draftRequirement,
  }) => {
    const { project, category, requirement } = draftRequirement;
    const createCommentResponse = await request.post(
      `/projects/${project.id}/requirements/${requirement.id}/review-comments`,
      {
        data: {
          text: "Please clarify the acceptance criteria.",
          author: "E2E Requirements Engineer",
        },
      },
    );
    const comment =
      (await createCommentResponse.json()) as RequirementReviewCommentResponseBody;

    const rejectResponse = await request.post(
      `/projects/${project.id}/requirements/${requirement.id}/review/reject`,
      {
        data: {
          reviewer: "E2E Requirements Engineer",
          rejectionReason: "The requirement is not testable.",
        },
      },
    );

    expect(rejectResponse.status()).toBe(200);

    const rejectedRequirement =
      (await rejectResponse.json()) as RequirementResponseBody;

    expectRequirementResponseBody(rejectedRequirement, {
      id: requirement.id,
      projectId: project.id,
      categoryId: category.id,
      revisionNumber: 2,
      status: RequirementStatus.Rejected,
    });
    expect(rejectedRequirement.reviewer).toBe("E2E Requirements Engineer");
    expect(rejectedRequirement.rejectionReason).toBe(
      "The requirement is not testable.",
    );
    expect(rejectedRequirement.rejectedAt).not.toBeNull();

    const listResponse = await request.get(
      `/projects/${project.id}/requirements/${requirement.id}/review-comments`,
    );
    const listedComments =
      (await listResponse.json()) as readonly RequirementReviewCommentResponseBody[];
    const rejectedClosedComment = listedComments.find(
      (listedComment) => listedComment.id === comment.id,
    );

    expect(rejectedClosedComment).toBeDefined();
    expect(rejectedClosedComment?.status).toBe(
      RequirementReviewCommentStatus.Closed,
    );
    expect(rejectedClosedComment?.closedBy).toBe("E2E Requirements Engineer");
    expect(rejectedClosedComment?.closeReason).toBe(
      RequirementReviewCommentCloseReason.RequirementRejected,
    );
    expect(rejectedClosedComment?.closedInRevisionNumber).toBe(2);
  });
});
