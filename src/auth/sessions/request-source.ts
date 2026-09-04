import type { Request } from "express";

export function getRequestSource(request: Request): string {
  return request.ip ?? request.socket.remoteAddress ?? "unknown";
}
