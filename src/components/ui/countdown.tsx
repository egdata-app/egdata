import { useState, useEffect, type JSX } from "react";
import { DateTime } from "luxon";
import { useLocale } from "@/hooks/use-locale";

interface CountdownProps {
  targetDate: string;
  onComplete?: () => void;
}

export function Countdown({ targetDate, onComplete }: CountdownProps) {
  const { timezone } = useLocale();

  const calculateTimeLeft = () => {
    const target = DateTime.fromISO(targetDate).setZone(timezone || "UTC");
    const now = DateTime.now().setZone(timezone || "UTC");
    const difference = target.diff(now, "milliseconds").milliseconds;
    const timeLeft: { hours?: number; minutes?: number; seconds?: number } = {};

    if (difference > 0) {
      timeLeft.hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
      timeLeft.minutes = Math.floor((difference / 1000 / 60) % 60);
      timeLeft.seconds = Math.floor((difference / 1000) % 60);
    }

    return timeLeft;
  };

  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;

    const timer = setTimeout(() => {
      const newTimeLeft = calculateTimeLeft();
      setTimeLeft(newTimeLeft);
      if (Object.keys(newTimeLeft).length === 0) {
        if (onComplete) {
          onComplete();
        }
      }
    }, 1000);

    return () => clearTimeout(timer);
  });

  if (!isClient) {
    return null;
  }

  const timerComponents: JSX.Element[] = [];

  for (const [interval, value] of Object.entries(timeLeft)) {
    if (!value) {
      continue;
    }

    timerComponents.push(
      <span key={interval}>
        {String(value).padStart(2, "0")}
        {interval.charAt(0)}{" "}
      </span>,
    );
  }

  return (
    <div className="tabular-nums p-2">
      {timerComponents.length ? timerComponents : <span>Released!</span>}
    </div>
  );
}
