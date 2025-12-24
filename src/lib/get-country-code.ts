export default (url: URL, cookies: Record<string, string>) => {
  return url.searchParams.get("country") || cookies.EGDATA_COUNTRY || "US";
};
