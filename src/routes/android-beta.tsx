import { createFileRoute } from "@tanstack/react-router";
import { AndroidBetaForm } from "@/components/forms/android-beta";

export const Route = createFileRoute("/android-beta")({
  component: RouteComponent,
  head: () => ({
    meta: [
      {
        title: "Android Beta - egdata.app",
      },
      {
        name: "description",
        content: "Join the egdata.app Android app closed beta testing program",
      },
    ],
  }),
});

function RouteComponent() {
  return (
    <main className="flex flex-col items-center justify-start min-h-screen gap-6 px-4 py-10 w-full max-w-2xl mx-auto">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">Android Beta Program</h1>
        <p className="text-muted-foreground text-lg">
          Join our closed beta to test the egdata.app Android application before public release.
        </p>
      </div>

      <AndroidBetaForm />

      <div className="text-sm text-muted-foreground space-y-2 max-w-md">
        <h3 className="font-semibold">What happens next?</h3>
        <ol className="list-decimal list-inside space-y-1">
          <li>Sign in with your Google account</li>
          <li>You will be manually added to the closed testing track within a few hours</li>
          <li>Once added, you can download the app from the provided link</li>
        </ol>
      </div>
    </main>
  );
}
