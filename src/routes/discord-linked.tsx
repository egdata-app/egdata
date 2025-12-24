import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle } from "lucide-react";

export const Route = createFileRoute("/discord-linked")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="min-h-[85vh] flex items-center justify-center">
      <div className="max-w-md w-full space-y-8 p-8 bg-card rounded-xl shadow-lg">
        <div className="text-center">
          <div className="flex justify-center">
            <CheckCircle className="h-16 w-16 text-green-500" />
          </div>
          <h2 className="mt-6 text-3xl font-bold text-foreground">Account Linked Successfully!</h2>
          <p className="mt-2 text-sm text-foreground/80">
            Your Discord account has been successfully linked to egdata.app
          </p>
        </div>
        <div className="mt-8 space-y-4">
          <p className="text-sm text-gray-500 text-center">
            You can now close this window and return to Discord. Your account is ready to use with
            egdata.app
          </p>
        </div>
      </div>
    </div>
  );
}
