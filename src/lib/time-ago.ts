export function timeAgo(date: Date): string {
  const now = new Date();
  const isPastDate = date < now;
  const diff = Math.abs(date.getTime() - now.getTime());
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const months = Math.floor(days / 30);
  const years = Math.floor(months / 12);

  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  if (seconds < 60) {
    return rtf.format(isPastDate ? -seconds : seconds, "second");
  }

  if (minutes < 60) {
    return rtf.format(isPastDate ? -minutes : minutes, "minute");
  }

  if (hours < 24) {
    return rtf.format(isPastDate ? -hours : hours, "hour");
  }

  if (days < 30) {
    return rtf.format(isPastDate ? -days : days, "day");
  }

  if (months < 12) {
    return rtf.format(isPastDate ? -months : months, "month");
  }

  return rtf.format(isPastDate ? -years : years, "year");
}

/**
 * Compares two dates and returns a string representing the time difference between them.
 * @param date The date A to compare.
 * @param dateB The date B to compare.
 * @returns A string representing the time difference between the two dates.
 * @example
 * ```
 * const dateA = new Date('2021-01-01T00:00:00Z');
 * const dateB = new Date('2021-01-01T00:00:00Z');
 * const result = compareDates(dateA, dateB);
 * console.log(result); // "0 seconds before"
 * ```
 * @example
 * ```
 * const dateA = new Date('2021-01-01T00:00:00Z');
 * const dateB = new Date('2022-01-01T00:00:00Z');
 * const result = compareDates(dateA, dateB);
 * console.log(`Released ${result}`); // "Released 1 year after"
 * ```
 */
export function compareDates(date: Date, dateB: Date): string {
  const diff = Math.abs(date.getTime() - dateB.getTime());
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const months = Math.floor(days / 30);
  const years = Math.floor(months / 12);

  const suffix = date < dateB ? "before" : "after";

  if (years > 0) {
    return `${years} year${years > 1 ? "s" : ""} ${suffix}`;
  }
  if (months > 0) {
    return `${months} month${months > 1 ? "s" : ""} ${suffix}`;
  }
  if (days > 0) {
    return `${days} day${days > 1 ? "s" : ""} ${suffix}`;
  }
  if (hours > 0) {
    return `${hours} hour${hours > 1 ? "s" : ""} ${suffix}`;
  }
  if (minutes > 0) {
    return `${minutes} minute${minutes > 1 ? "s" : ""} ${suffix}`;
  }
  return `${seconds} second${seconds > 1 ? "s" : ""} ${suffix}`;
}
