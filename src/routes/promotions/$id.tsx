import * as React from "react";
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/promotions/$id")({
  component: RouteComponent,

  beforeLoad: async ({ context, params }) => {
    throw redirect({
      to: `/tags/${params.id}`,
    });
  },
});

function RouteComponent() {
  return "Hello /promotions/$id!";
}
