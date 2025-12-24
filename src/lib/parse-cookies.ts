export function parseCookieString(cookieString: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (cookieString) {
    cookieString.split("; ").forEach((cookie) => {
      const [name, value] = cookie.split("=");
      cookies[decodeURIComponent(name)] = decodeURIComponent(value);
    });
  }
  return cookies;
}
