export const Base64Utils = {
  encode: (input: string) => {
    if (typeof window !== "undefined") {
      // For browsers
      return btoa(unescape(encodeURIComponent(input)));
    }

    return Buffer.from(input, "utf-8").toString("base64");
  },
  decode: (input: string) => {
    if (typeof window !== "undefined") {
      return decodeURIComponent(escape(atob(input)));
    }

    return Buffer.from(input, "base64").toString("utf-8");
  },
};
