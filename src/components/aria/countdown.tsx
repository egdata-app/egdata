import * as React from "react";

function Countdown({
  date,
  targetDate,
}: {
  date?: Date | string | number;
  targetDate?: Date | string | number;
}) {
  const resolvedDate = date ?? targetDate ?? Date.now();
  const target = React.useMemo(() => new Date(resolvedDate).getTime(), [resolvedDate]);
  const [now, setNow] = React.useState(Date.now());

  React.useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const seconds = Math.max(0, Math.floor((target - now) / 1000));
  const days = Math.floor(seconds / 86_400);
  const hours = Math.floor((seconds % 86_400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  return <span>{days > 0 ? `${days}d ` : ""}{hours}h {minutes}m</span>;
}

export { Countdown };
