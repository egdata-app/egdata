import {
  ErrorComponent,
  type ErrorComponentProps,
  Link,
  rootRouteId,
  useMatch,
  useRouter,
} from "@tanstack/react-router";
import { Button } from "../aria/button";

export function DefaultCatchBoundary({ error }: ErrorComponentProps) {
  const router = useRouter();
  const isRoot = useMatch({
    strict: false,
    select: (state) => state.id === rootRouteId,
  });

  console.error(error);

  return (
    <div className="min-w-0 flex-1 p-4 flex flex-col items-center justify-center gap-6">
      <ErrorComponent error={error} />
      <div className="flex gap-2 items-center flex-wrap">
        <Button
          onClick={() => {
            router.invalidate();
          }}
          className="px-2 py-1 bg-surface-hover dark:bg-surface-hover rounded text-text-primary uppercase font-extrabold"
        >
          Try Again
        </Button>
        {isRoot ? (
          <Link
            to="/"
            className={
              "px-2 py-1 bg-surface-hover dark:bg-surface-hover rounded text-text-primary uppercase font-extrabold"
            }
          >
            Home
          </Link>
        ) : (
          <Link
            to="/"
            className={
              "px-2 py-1 bg-surface-hover dark:bg-surface-hover rounded text-text-primary uppercase font-extrabold"
            }
            onClick={(e) => {
              e.preventDefault();
              window.history.back();
            }}
          >
            Go Back
          </Link>
        )}
      </div>
    </div>
  );
}
