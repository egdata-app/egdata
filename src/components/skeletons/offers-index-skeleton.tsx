import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export function OffersIndexSkeleton() {
  return (
    <div className="flex flex-col items-start justify-start h-full gap-1 px-4 w-full">
      {/* Performance Table Skeleton */}
      <div className="w-full">
        <Skeleton className="h-12 w-full" />
      </div>

      <div className="grid gap-8 grid-cols-1 md:grid-cols-2 mt-4 w-full">
        {/* Left Column */}
        <div className="flex flex-col gap-4 w-full">
          {/* Genres Section */}
          <div className="flex flex-col gap-2 w-full mt-2">
            <Skeleton className="h-8 w-24" />
            <Card className="w-full">
              <CardContent className="p-6">
                <div className="flex flex-row items-center justify-center gap-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={`genre-${i}`} className="h-8 w-24" />
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Age Rating Section */}
          <div className="flex flex-col gap-2 w-full mt-2">
            <Skeleton className="h-8 w-32" />
            <Card className="w-full">
              <CardContent className="p-6">
                <div className="flex flex-row items-center justify-center gap-4">
                  {Array.from({ length: 2 }).map((_, i) => (
                    <Skeleton key={`rating-${i}`} className="h-20 w-72" />
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Giveaways Section */}
          <div className="flex flex-col gap-2 w-full mt-2">
            <Skeleton className="h-8 w-32" />
            <Card className="w-full">
              <CardContent className="p-9">
                <div className="flex flex-row items-center justify-center gap-4">
                  <Skeleton className="h-6 w-48" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Achievements Section */}
          <div className="flex flex-col gap-2 w-full mt-2">
            <Skeleton className="h-8 w-32" />
            <Card className="w-full bg-card text-white p-4">
              <div className="flex flex-col gap-4 w-full">
                <div className="flex flex-row items-center justify-center gap-10">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={`achievement-${i}`} className="h-16 w-16" />
                  ))}
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Right Column */}
        <div className="flex flex-col gap-4 w-full">
          {/* Price Section */}
          <div className="flex flex-col gap-2 w-full mt-2">
            <Skeleton className="h-8 w-24" />
            <Card className="w-full bg-card text-white p-4">
              <CardContent className="p-6">
                <div className="flex flex-col gap-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={`price-${i}`} className="flex items-start justify-start gap-2">
                      <Skeleton className="h-6 w-24" />
                      <Skeleton className="h-6 w-32" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* How Long To Beat Section */}
          <div className="flex flex-col gap-2 w-full mt-2">
            <Skeleton className="h-8 w-40" />
            <Card className="w-full">
              <CardContent className="p-6">
                <div className="flex flex-row items-center justify-center gap-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {Array.from({ length: 2 }).map((_, i) => (
                      <div key={`hltb-${i}`} className="text-center">
                        <Skeleton className="h-8 w-32 mx-auto mb-1" />
                        <Skeleton className="h-4 w-24 mx-auto" />
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Epic Players Rating Section */}
          <div className="flex flex-col gap-2 w-full mt-2">
            <Skeleton className="h-8 w-40" />
            <Card className="w-full">
              <CardContent className="p-6">
                <div className="flex flex-col items-center justify-center gap-2">
                  <Skeleton className="h-16 w-16" />
                  <Skeleton className="h-6 w-32" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
