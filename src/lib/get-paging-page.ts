export default (url: URL) => {
  const page = Number.parseInt(url.searchParams.get("page") || "");

  return page || 1;
};
