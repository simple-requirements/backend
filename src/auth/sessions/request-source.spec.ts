import type { Request } from "express";
import { describe, expect, it } from "vitest";

import { getRequestSource } from "@/auth/sessions/request-source";

function request(ip?: string, remoteAddress?: string): Request {
  return {
    ip,
    socket: { remoteAddress },
  } as unknown as Request;
}

describe("getRequestSource", () => {
  it("prefers the Express request IP", () => {
    expect(getRequestSource(request("192.0.2.10", "192.0.2.20"))).toBe(
      "192.0.2.10",
    );
  });

  it("falls back to the socket remote address", () => {
    expect(getRequestSource(request(undefined, "192.0.2.20"))).toBe(
      "192.0.2.20",
    );
  });

  it("uses a stable fallback when no address is available", () => {
    expect(getRequestSource(request())).toBe("unknown");
  });
});
