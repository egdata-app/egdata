import { getRarity } from "@/lib/get-rarity";
import { cn } from "@/lib/utils";
import type { Achievement } from "@/queries/offer-achievements";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../ui/card";
import { Image } from "./image";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";

export const rarities = {
  bronze: "bg-gradient-radial from-bronze-start to-transparent",
  silver: "bg-gradient-radial from-silver-start to-transparent",
  gold: "bg-gradient-radial from-gold-start to-transparent",
  platinum: "bg-gradient-radial from-platinum-start to-transparent",
  unknown: "bg-gray-300",
};

export const raritiesTextColors = {
  bronze: "text-bronze-start",
  silver: "text-silver-start",
  gold: "text-gold-start",
  platinum: "text-platinum-start",
  unknown: "text-gray-300",
};

export function FlippableCard({
  achievement,
  flipAll,
  index,
  flipped,
  onCardFlip,
  unlockDate,
  blur,
}: {
  achievement: Achievement;
  flipAll: boolean;
  index: number;
  flipped: boolean;
  onCardFlip: (name: string) => void;
  unlockDate?: Date;
  blur: boolean;
}) {
  const handleClick = () => onCardFlip(achievement.name);
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      onCardFlip(achievement.name);
    }
  };

  const delay = flipAll ? `${index * 100}ms` : "0ms";
  const flipState = flipped === flipAll ? "" : "flipped";

  const rarity = getRarity(achievement.xp);

  return (
    <TooltipProvider>
      <Tooltip>
        <button
          className="relative h-72 w-full perspective cursor-default select-none"
          onClick={handleClick}
          onKeyDown={handleKeyDown}
          tabIndex={0}
          aria-label={achievement.unlockedDisplayName}
        >
          <div className={cn("card", flipState)} style={{ transitionDelay: delay }}>
            <div className="front relative">
              <Card
                className={cn(
                  "justify-between flex flex-col h-full relative transition-all duration-300 ease-in-out",
                  achievement.hidden
                    ? blur
                      ? "blur-[3px] hover:blur-none"
                      : "blur-none"
                    : "blur-none",
                )}
              >
                <div
                  className={cn("absolute inset-0 rounded-md opacity-20", rarities[rarity])}
                  style={{
                    background: `radial-gradient(circle at bottom left, var(--${rarity}-start) 0%, transparent 75%)`,
                    zIndex: 1,
                  }}
                />
                <CardHeader className="flex flex-col w-full items-center gap-2 relative z-10">
                  <div
                    className={cn("h-16 w-16 rounded-sm bg-opacity-25 relative", rarities[rarity])}
                  >
                    <Image
                      src={achievement.unlockedIconLink}
                      alt={achievement.unlockedDisplayName}
                      height={64}
                      width={64}
                      className="z-10 bg-gray-900 rounded-sm"
                    />
                  </div>
                  <CardTitle>{achievement.unlockedDisplayName}</CardTitle>
                </CardHeader>
                <CardContent className="h-full relative z-10">
                  <TooltipTrigger asChild>
                    <CardDescription className="text-xs">
                      {achievement.unlockedDescription.slice(0, 150)}
                      {achievement.unlockedDescription.length > 150 ? "..." : ""}
                    </CardDescription>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-sm">
                    {achievement.unlockedDescription}
                  </TooltipContent>
                </CardContent>
                <CardFooter className="relative z-10">
                  <span className="border border-gray-300 rounded-full px-2 py-1 text-xs inline-flex items-center gap-2">
                    {achievement.completedPercent}% unlocked
                    {unlockDate && <span>|</span>}
                    {unlockDate && (
                      <span>
                        {unlockDate.toLocaleDateString("en-UK", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    )}
                  </span>
                </CardFooter>
              </Card>
            </div>
            <div className="back">
              <Card className="justify-between flex flex-col h-full">
                <CardHeader className="flex flex-col w-full items-center gap-2">
                  <div className="h-16 w-16 opacity-25">
                    <Image
                      src={achievement.lockedIconLink}
                      alt={achievement.lockedDisplayName}
                      height={64}
                      width={64}
                    />
                  </div>
                  <CardTitle>
                    {achievement.lockedDisplayName === ""
                      ? "REDACTED"
                      : achievement.lockedDisplayName}
                  </CardTitle>
                </CardHeader>
                <CardContent className="h-full">
                  <TooltipTrigger asChild>
                    <CardDescription className="text-xs">
                      {achievement.lockedDescription.slice(0, 150)}
                      {achievement.lockedDescription.length > 150 ? "..." : ""}
                    </CardDescription>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-sm">
                    {achievement.lockedDescription}
                  </TooltipContent>
                </CardContent>
                <CardFooter>
                  <span className="border border-gray-300 rounded-full px-2 py-1 text-xs">
                    Locked
                  </span>
                </CardFooter>
              </Card>
            </div>
          </div>
        </button>
      </Tooltip>
    </TooltipProvider>
  );
}
