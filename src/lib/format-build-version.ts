const releaseVersionPrefix = /^\+\+[^+]+\+Release-/;

export function formatBuildVersion(buildVersion: string) {
  return buildVersion.split("+")[0] || buildVersion.replace(releaseVersionPrefix, "");
}
