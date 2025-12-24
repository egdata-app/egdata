import { cn } from "@/lib/utils";

interface CircularRatingProps {
  rating: number;
  maxRating: number;
  size?: "sm" | "md" | "lg";
  strokeWidth?: number;
  suffix?: string;
}

export function CircularRating({
  rating,
  maxRating,
  size = "md",
  strokeWidth = 10,
  suffix = "",
}: CircularRatingProps) {
  const percentage = (rating / maxRating) * 100;
  const radius = size === "sm" ? 40 : size === "md" ? 60 : 80;
  const center = radius + strokeWidth;
  const circumference = 2 * Math.PI * radius;

  const sizeClasses = {
    sm: "w-24 h-24",
    md: "w-32 h-32",
    lg: "w-40 h-40",
  };

  const fontSizeClasses = {
    sm: "text-xl",
    md: "text-2xl",
    lg: "text-3xl",
  };

  const suffixFontSizeClasses = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  };

  return (
    <div className={cn("relative", sizeClasses[size])}>
      <svg className="w-full h-full" viewBox={`0 0 ${center * 2} ${center * 2}`}>
        <circle
          className="text-muted"
          strokeWidth={strokeWidth}
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={center}
          cy={center}
        />
        <circle
          className="text-primary"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={circumference - (percentage / 100) * circumference}
          strokeLinecap="round"
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={center}
          cy={center}
          transform={`rotate(-90 ${center} ${center})`}
        />
      </svg>
      <div
        className={cn(
          "absolute inset-0 flex flex-row gap-1 items-center justify-center",
          fontSizeClasses[size],
          "font-semibold",
        )}
      >
        <span>{rating.toFixed(0)}</span>
        {suffix && (
          <span className={cn(suffixFontSizeClasses[size], "text-muted-foreground font-normal")}>
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}
