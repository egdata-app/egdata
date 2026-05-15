import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/freegames")({
  component: RouteComponent,

  beforeLoad: async () => {
    throw redirect({
      to: "/freebies",
      search: { developerDisplayName: undefined, publisherDisplayName: undefined },
    });
  },
});

function RouteComponent() {
  return <div>Hello "/freegames"!</div>;
}
