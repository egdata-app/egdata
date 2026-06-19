import { Link } from "@tanstack/react-router";
import { Button } from "../aria/button";

export function NotFound({ children }: { children?: any }) {
  return (
    <div className="space-y-2 p-2">
      <div className="text-text-subtle dark:text-text-muted">
        {children || <p>The page you are looking for does not exist.</p>}
      </div>
      <p className="flex items-center gap-2 flex-wrap">
        <Button
          onClick={() => window.history.back()}
          className="bg-emerald-500 text-text-primary px-2 py-1 rounded uppercase font-black text-sm"
        >
          Go back
        </Button>
        <Link
          to="/"
          className="bg-interactive text-text-primary px-2 py-1 rounded uppercase font-black text-sm"
        >
          Start Over
        </Link>
      </p>
    </div>
  );
}
