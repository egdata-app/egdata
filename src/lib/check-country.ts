export function checkCountryCode(country: string) {
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(country);
  } catch (e) {
    return false;
  }
}
