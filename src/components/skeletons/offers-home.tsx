import { Skeleton } from "@/components/ui/skeleton";

export function OffersHomeSkeleton() {
  return (
    <main className="flex flex-col items-start justify-start w-full min-h-screen gap-4 relative">
      <header className="grid col-span-1 gap-4 md:grid-cols-2 w-full">
        <div className="flex flex-col gap-1">
          {/* Title and seller info */}
          <Skeleton className="h-12 w-3/4" />
          <Skeleton className="h-6 w-1/2" />

          {/* Info table skeleton */}
          <div className="rounded-xl border border-gray-300/10 mt-2">
            <div className="p-4 space-y-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={`table-row-${i}`} className="flex gap-4">
                  <Skeleton className="h-6 w-[300px]" />
                  <Skeleton className="h-6 flex-1" />
                </div>
              ))}
            </div>
          </div>

          {/* Internal banner skeleton */}
          <Skeleton className="h-24 w-full mt-4" />

          {/* Base game skeleton */}
          <Skeleton className="h-32 w-full mt-4" />

          {/* Bundle skeleton */}
          <Skeleton className="h-32 w-full mt-4" />
        </div>

        <div className="flex justify-start items-start flex-col gap-4">
          {/* Action buttons skeleton */}
          <div className="inline-flex items-center gap-2 justify-end w-full h-8">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-24" />
          </div>

          {/* Hero section skeleton */}
          <Skeleton className="h-[400px] w-full" />

          {/* Description skeleton */}
          <div className="px-1 space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        </div>
      </header>

      {/* Sections navigation skeleton */}
      <div className="w-full">
        <div className="flex gap-4 overflow-x-auto pb-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={`nav-item-${i}`} className="h-8 w-24" />
          ))}
        </div>
      </div>

      {/* Content area skeleton */}
      <section className="w-full min-h-[50vh]">
        <Skeleton className="h-[400px] w-full" />
      </section>

      <hr className="my-4 border-gray-300/40" />

      {/* Seller offers skeleton */}
      <div className="w-full space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={`seller-offer-${i}`} className="h-[200px] w-full" />
          ))}
        </div>
      </div>

      {/* Suggested offers skeleton */}
      <div className="w-full space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={`suggested-offer-${i}`} className="h-[200px] w-full" />
          ))}
        </div>
      </div>
    </main>
  );
}
