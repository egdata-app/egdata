import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { DonateKeyForm } from "@/components/forms/donate-key";

export const Route = createFileRoute("/donate-key")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <main className="flex flex-col items-start justify-start h-full gap-1 px-4 w-full">
      <h1 className="text-2xl font-bold">Donate a Key</h1>
      <p className="mb-4">
        If you have a key that you would like to donate to the project, please fill out the form
        below.
      </p>
      <DonateKeyForm />
    </main>
  );
}
