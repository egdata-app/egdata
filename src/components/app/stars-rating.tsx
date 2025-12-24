import { Star } from "lucide-react";

interface StarRatingProps {
  rating: number;
}

export default function StarsRating({ rating }: StarRatingProps) {
  // Ensure the rating is between 0 and 5
  const clampedRating = Math.max(0, Math.min(5, rating));

  // Create an array of 5 stars
  const stars = Array(5).fill(0);

  return (
    <div className="flex">
      {stars.map((_, index) => {
        const fillPercentage = Math.min(100, Math.max(0, (clampedRating - index) * 100));

        return (
          <div key={index} className="relative">
            <Star className="w-6 h-6 text-muted-foreground/25" fill="currentColor" />
            <div
              className="absolute top-0 left-0 overflow-hidden"
              style={{ width: `${fillPercentage}%` }}
            >
              <Star className="w-6 h-6 text-white" fill="currentColor" />
            </div>
          </div>
        );
      })}
    </div>
  );
}
