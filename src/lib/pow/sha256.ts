/**
 * Small, dependency-free SHA-256 implementation used by the proof-of-work
 * worker. The worker runs off the UI thread; this module itself does not touch
 * browser globals at import time and is also exercised by unit tests.
 *
 * The solver keeps the SHA-256 state for the `challenge + ":"` prefix and only
 * feeds the nonce and padding for every candidate. That avoids allocating a
 * digest per attempt and keeps 20-bit searches practical.
 */

export const NONCE_PATTERN = /^[a-zA-Z0-9_-]{1,64}$/;

const INITIAL_STATE = new Uint32Array([
  0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
]);

const ROUND_CONSTANTS = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

function rotr(value: number, bits: number): number {
  return ((value >>> bits) | (value << (32 - bits))) >>> 0;
}

export function utf8Encode(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

export type Sha256Prefix = {
  state: Uint32Array;
  remainder: Uint8Array;
  byteLength: number;
};

export function createSha256Prefix(prefix: Uint8Array): Sha256Prefix {
  const state = new Uint32Array(INITIAL_STATE);
  const words = new Uint32Array(64);
  let offset = 0;

  while (prefix.length - offset >= 64) {
    processSha256Block(state, prefix, offset, words);
    offset += 64;
  }

  return {
    state,
    remainder: prefix.slice(offset),
    byteLength: prefix.length,
  };
}

function processSha256Block(
  state: Uint32Array,
  block: Uint8Array,
  offset: number,
  words: Uint32Array,
): void {
  for (let index = 0; index < 16; index += 1) {
    const position = offset + index * 4;
    words[index] =
      ((block[position] << 24) |
        (block[position + 1] << 16) |
        (block[position + 2] << 8) |
        block[position + 3]) >>>
      0;
  }

  for (let index = 16; index < 64; index += 1) {
    const previous15 = words[index - 15];
    const previous2 = words[index - 2];
    const gamma0 = (rotr(previous15, 7) ^ rotr(previous15, 18) ^ (previous15 >>> 3)) >>> 0;
    const gamma1 = (rotr(previous2, 17) ^ rotr(previous2, 19) ^ (previous2 >>> 10)) >>> 0;

    words[index] = (words[index - 16] + gamma0 + words[index - 7] + gamma1) >>> 0;
  }

  let a = state[0];
  let b = state[1];
  let c = state[2];
  let d = state[3];
  let e = state[4];
  let f = state[5];
  let g = state[6];
  let h = state[7];

  for (let index = 0; index < 64; index += 1) {
    const sigma1 = (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) >>> 0;
    const choose = ((e & f) ^ (~e & g)) >>> 0;
    const temp1 = (h + sigma1 + choose + ROUND_CONSTANTS[index] + words[index]) >>> 0;
    const sigma0 = (rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) >>> 0;
    const majority = ((a & b) ^ (a & c) ^ (b & c)) >>> 0;
    const temp2 = (sigma0 + majority) >>> 0;

    h = g;
    g = f;
    f = e;
    e = (d + temp1) >>> 0;
    d = c;
    c = b;
    b = a;
    a = (temp1 + temp2) >>> 0;
  }

  state[0] = (state[0] + a) >>> 0;
  state[1] = (state[1] + b) >>> 0;
  state[2] = (state[2] + c) >>> 0;
  state[3] = (state[3] + d) >>> 0;
  state[4] = (state[4] + e) >>> 0;
  state[5] = (state[5] + f) >>> 0;
  state[6] = (state[6] + g) >>> 0;
  state[7] = (state[7] + h) >>> 0;
}

function writeLength(buffer: Uint8Array, blockCount: number, byteLength: number): void {
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  const end = blockCount * 64;
  const high = Math.floor(byteLength / 0x20000000) >>> 0;
  const low = (byteLength * 8) >>> 0;

  view.setUint32(end - 8, high, false);
  view.setUint32(end - 4, low, false);
}

/** Full SHA-256 digest of an arbitrary byte string. */
export function sha256(input: Uint8Array): Uint8Array {
  const state = new Uint32Array(INITIAL_STATE);
  const words = new Uint32Array(64);
  let offset = 0;

  while (input.length - offset >= 64) {
    processSha256Block(state, input, offset, words);
    offset += 64;
  }

  const remainderLength = input.length - offset;
  const blockCount = remainderLength + 9 <= 64 ? 1 : 2;
  const finalBlocks = new Uint8Array(blockCount * 64);
  finalBlocks.set(input.subarray(offset));
  finalBlocks[remainderLength] = 0x80;
  writeLength(finalBlocks, blockCount, input.length);

  for (let block = 0; block < blockCount; block += 1) {
    processSha256Block(state, finalBlocks, block * 64, words);
  }

  const digest = new Uint8Array(32);
  const view = new DataView(digest.buffer);

  for (let index = 0; index < 8; index += 1) {
    view.setUint32(index * 4, state[index], false);
  }

  return digest;
}

export function bytesToHex(bytes: Uint8Array): string {
  let output = "";

  for (const byte of bytes) {
    output += byte.toString(16).padStart(2, "0");
  }

  return output;
}

export function hasLeadingZeroBits(bytes: Uint8Array, difficulty: number): boolean {
  let remaining = difficulty;

  for (const byte of bytes) {
    if (remaining <= 0) {
      return true;
    }

    if (remaining >= 8) {
      if (byte !== 0) {
        return false;
      }
      remaining -= 8;
      continue;
    }

    const mask = (0xff << (8 - remaining)) & 0xff;
    return (byte & mask) === 0;
  }

  return remaining <= 0;
}

/**
 * Reusable hasher for a fixed prefix. Each call copies only the eight state
 * words and writes the nonce plus padding into a reused 192-byte block buffer.
 */
export class Sha256PrefixMatcher {
  private readonly state: Uint32Array;
  private readonly remainder: Uint8Array;
  private readonly prefixLength: number;
  private readonly scratchState = new Uint32Array(8);
  private readonly words = new Uint32Array(64);
  private readonly finalBlocks = new Uint8Array(192);

  constructor(prefix: Sha256Prefix) {
    this.state = prefix.state;
    this.remainder = prefix.remainder;
    this.prefixLength = prefix.byteLength;
  }

  matchesNonce(nonce: string, difficulty: number): boolean {
    const remainderLength = this.remainder.length;
    const tailLength = remainderLength + nonce.length;
    const blockCount = Math.ceil((tailLength + 9) / 64);
    const finalBlocks = this.finalBlocks;

    finalBlocks.set(this.remainder, 0);

    for (let index = 0; index < nonce.length; index += 1) {
      finalBlocks[remainderLength + index] = nonce.charCodeAt(index) & 0xff;
    }

    finalBlocks.fill(0, tailLength, blockCount * 64);
    finalBlocks[tailLength] = 0x80;
    writeLength(finalBlocks, blockCount, this.prefixLength + nonce.length);

    this.scratchState.set(this.state);

    for (let block = 0; block < blockCount; block += 1) {
      processSha256Block(this.scratchState, finalBlocks, block * 64, this.words);
    }

    return hasLeadingZeroBitsInState(this.scratchState, difficulty);
  }
}

function hasLeadingZeroBitsInState(state: Uint32Array, difficulty: number): boolean {
  let remaining = difficulty;

  for (let byteIndex = 0; byteIndex < 32 && remaining > 0; byteIndex += 1) {
    const word = state[byteIndex >>> 2];
    const byte = (word >>> (24 - (byteIndex & 3) * 8)) & 0xff;

    if (remaining >= 8) {
      if (byte !== 0) {
        return false;
      }
      remaining -= 8;
      continue;
    }

    const mask = (0xff << (8 - remaining)) & 0xff;
    return (byte & mask) === 0;
  }

  return remaining <= 0;
}

export function verifyProofNonce(challenge: string, nonce: string, difficulty: number): boolean {
  if (!NONCE_PATTERN.test(nonce)) {
    return false;
  }

  const digest = sha256(utf8Encode(`${challenge}:${nonce}`));

  return hasLeadingZeroBits(digest, difficulty);
}

export type FindProofNonceOptions = {
  challenge: string;
  difficulty: number;
  deadline: number;
  now?: () => number;
  startNonce?: number;
  /** Checks the clock every N candidates. */
  checkpointInterval?: number;
};

/**
 * Synchronous nonce search. This is only safe inside the dedicated worker.
 * Returns `null` when the deadline is reached.
 */
export function findProofNonce(options: FindProofNonceOptions): string | null {
  const now = options.now ?? Date.now;
  const checkpointInterval = options.checkpointInterval ?? 1024;
  const prefix = createSha256Prefix(utf8Encode(`${options.challenge}:`));
  const matcher = new Sha256PrefixMatcher(prefix);
  let counter = options.startNonce ?? 0;

  while (true) {
    if (counter % checkpointInterval === 0 && now() >= options.deadline) {
      return null;
    }

    const nonce = String(counter);

    if (nonce.length > 64) {
      return null;
    }

    if (matcher.matchesNonce(nonce, options.difficulty)) {
      return nonce;
    }

    counter += 1;
  }
}
