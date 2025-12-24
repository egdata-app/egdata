export function getHashType(hash: string): string {
  const length = hash.length;

  // Check for specific hash prefixes (bcrypt, Argon2)
  if (hash.startsWith("$2a$") || hash.startsWith("$2b$") || hash.startsWith("$2y$"))
    return "bcrypt";
  if (hash.startsWith("$argon2id$") || hash.startsWith("$argon2i$")) return "Argon2";

  // Check length to infer hash type
  switch (length) {
    case 32:
      return "MD5";
    case 40:
      return "SHA-1";
    case 56:
      return "SHA-224";
    case 64:
      return "SHA-256";
    case 96:
      return "SHA-384";
    case 128:
      return "SHA-512 ";
    case 60:
      return "bcrypt";
    default:
      return "Unknown hash type";
  }
}
