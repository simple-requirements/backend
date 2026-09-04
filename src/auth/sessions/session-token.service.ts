import { createHash, randomBytes } from "node:crypto";

import { Injectable } from "@nestjs/common";

@Injectable()
export class SessionTokenService {
  generate(): { plaintext: string; hash: string } {
    const plaintext = randomBytes(32).toString("base64url");

    return { plaintext, hash: this.hash(plaintext) };
  }

  hash(plaintext: string): string {
    return createHash("sha256").update(plaintext).digest("hex");
  }
}
