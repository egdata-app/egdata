import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import {
  NONCE_PATTERN,
  bytesToHex,
  createSha256Prefix,
  findProofNonce,
  hasLeadingZeroBits,
  sha256,
  utf8Encode,
  verifyProofNonce,
  Sha256PrefixMatcher,
} from "../../src/lib/pow/sha256.ts";
import { solvePowRequest } from "../../src/lib/pow/solve-core.ts";
import type { PowSolveRequest } from "../../src/lib/pow/protocol.ts";

function nodeSha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

test("matches the standard SHA-256 vectors", () => {
  assert.equal(
    bytesToHex(sha256(utf8Encode(""))),
    "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  );
  assert.equal(bytesToHex(sha256(utf8Encode("abc"))), nodeSha256("abc"));
  assert.equal(bytesToHex(sha256(utf8Encode("a".repeat(1_000)))), nodeSha256("a".repeat(1_000)));
  assert.equal(bytesToHex(sha256(utf8Encode("x".repeat(55)))), nodeSha256("x".repeat(55)));
  assert.equal(bytesToHex(sha256(utf8Encode("x".repeat(56)))), nodeSha256("x".repeat(56)));
  assert.equal(bytesToHex(sha256(utf8Encode("x".repeat(64)))), nodeSha256("x".repeat(64)));
});

test("prefix matcher agrees with a full SHA-256 digest across padding boundaries", () => {
  const challenge = "padding-boundary-challenge";
  const matcher = new Sha256PrefixMatcher(createSha256Prefix(utf8Encode(`${challenge}:`)));

  for (let nonce = 0; nonce < 2_000; nonce += 1) {
    const value = String(nonce);
    const digest = sha256(utf8Encode(`${challenge}:${value}`));

    for (const difficulty of [1, 7, 8, 16, 20, 24]) {
      assert.equal(
        matcher.matchesNonce(value, difficulty),
        hasLeadingZeroBits(digest, difficulty),
        `difficulty ${difficulty}, nonce ${value}`,
      );
    }
  }
});

test("finds and independently verifies proofs for 16-bit and 20-bit difficulty", () => {
  for (const difficulty of [16, 20]) {
    const challenge = `unit-proof-${difficulty}`;
    const nonce = findProofNonce({
      challenge,
      difficulty,
      deadline: Date.now() + 30_000,
    });

    assert.ok(nonce, `expected a nonce for difficulty ${difficulty}`);
    assert.match(nonce, NONCE_PATTERN);
    assert.equal(verifyProofNonce(challenge, nonce, difficulty), true);

    const digest = nodeSha256(`${challenge}:${nonce}`);
    const digestBytes = Uint8Array.from(Buffer.from(digest, "hex"));
    assert.equal(hasLeadingZeroBits(digestBytes, difficulty), true);
  }
});

test("difficulty 16 needs two zero bytes and difficulty 20 also needs the high nibble", () => {
  const sixteen = new Uint8Array(32);
  sixteen[2] = 0xff;
  assert.equal(hasLeadingZeroBits(sixteen, 16), true);
  assert.equal(hasLeadingZeroBits(sixteen, 20), false);

  const twenty = new Uint8Array(32);
  twenty[2] = 0x0f;
  twenty[3] = 0xff;
  assert.equal(hasLeadingZeroBits(twenty, 20), true);
});

test("nonce validation only accepts the documented ASCII alphabet and length", () => {
  for (const nonce of ["0", "42", "nonce_ABC-123", "a".repeat(64)]) {
    assert.match(nonce, NONCE_PATTERN);
  }

  for (const nonce of ["", "a".repeat(65), "has space", "emoji-🙂", "slash/", "dot."]) {
    assert.doesNotMatch(nonce, NONCE_PATTERN);
  }
});

test("worker core returns a proof, or a bounded timeout when the deadline passed", () => {
  const request: PowSolveRequest = {
    type: "solve",
    challenge: "worker-core-challenge",
    difficulty: 16,
    deadline: Date.now() + 30_000,
  };
  const solved = solvePowRequest(request);

  assert.equal(solved.type, "solved");
  assert.equal(verifyProofNonce(request.challenge, solved.nonce, 16), true);

  const timedOut = solvePowRequest({ ...request, deadline: Date.now() - 1 });
  assert.deepEqual(timedOut, { type: "timeout" });
});
