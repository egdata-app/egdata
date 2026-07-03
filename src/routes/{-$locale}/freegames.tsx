import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/{-$locale}/freegames")({
  component: RouteComponent,

  beforeLoad: async () => {
    throw redirect({
      to: "/{-$locale}/freebies",
      search: { developerDisplayName: undefined, publisherDisplayName: undefined },
    });
  },
});

function RouteComponent() {
  return <div>Hello "/freegames"!</div>;
}
