import type { TFunction } from "@/lib/i18n";

export const getImportantDates = (t: TFunction) => [
  {
    date: new Date("2023-11-01"),
    label: "Now on Epic",
  },
  {
    date: new Date("2023-10-01"),
    label: "Epic First Run",
  },
  {
    date: new Date("2025-05-01"),
    label: "100% Revenue Share Program",
  },
  {
    date: new Date("2025-01-01"),
    label: "Launch Everywhere",
  },
  {
    date: new Date("2025-01-01"),
    label: "EGS Mobile 3rd Party",
  },
  {
    date: new Date("2023-03-01"),
    label: "Self Publish Tool (PC)",
  },
  {
    // https://store.epicgames.com/en-US/news/epic-games-launcher-preview
    date: new Date("2026-10-14"),
    label: t("stats.chart.launcherBeta"),
  },
];

export function getImportantEventLabels(
  dateStr: string,
  importantDates: ReturnType<typeof getImportantDates>,
): string[] {
  const date = new Date(dateStr);
  const events = importantDates.filter(
    (d) => d.date.getFullYear() === date.getFullYear() && d.date.getMonth() === date.getMonth(),
  );
  return events.map((e) => e.label);
}
