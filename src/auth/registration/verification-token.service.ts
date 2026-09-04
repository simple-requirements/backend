import { createHash, randomBytes } from "node:crypto";

import { Injectable } from "@nestjs/common";

export interface GeneratedVerificationToken {
  plaintext: string;
  hash: string;
}

@Injectable()
export class VerificationTokenService {
  generate(): GeneratedVerificationToken {
    const plaintext = randomBytes(32).toString("base64url");

    return { plaintext, hash: this.hash(plaintext) };
  }

  hash(plaintext: string): string {
    return createHash("sha256").update(plaintext, "utf8").digest("hex");
  }
}
