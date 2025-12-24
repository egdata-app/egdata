/**
 * Format the time to a human readable format
 * hours > minutes > seconds
 * @param time - The time to format
 * @returns The formatted time
 */
export const formatTimeToHumanReadable = (time: number) => {
  if (time === 0) {
    return "N/A";
  }

  if (time > 3600) {
    return `${Math.floor(time / 3600)}h`;
  }

  if (time > 60) {
    return `${Math.floor(time / 60)}m`;
  }

  return `${time}s`;
};
