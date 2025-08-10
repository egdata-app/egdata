import { createRouter as createTanStackRouter } from '@tanstack/react-router';
import { setupRouterSsrQueryIntegration } from '@tanstack/react-router-ssr-query';
import { routeTree } from './routeTree.gen';
import { DefaultCatchBoundary } from '@/components/app/default-catch-boundary';
import { NotFound } from '@/components/app/not-found';
import { getQueryClient } from '@/lib/client';
import { parseSearchWith, stringifySearchWith } from '@tanstack/react-router';
import { stringify, parse } from './lib/jsurl2';

export function createRouter() {
  const queryClient = getQueryClient();

  const router = createTanStackRouter({
    routeTree,
    // @ts-expect-error
    context: { queryClient },
    defaultPreload: 'intent',
    defaultErrorComponent: DefaultCatchBoundary,
    defaultNotFoundComponent: () => <NotFound />,
    scrollRestoration: true,
    defaultViewTransition: {
      types: ({ fromLocation, toLocation }) => {
        let direction = 'none';

        if (fromLocation) {
          const fromIndex = fromLocation.state.__TSR_index;
          const toIndex = toLocation.state.__TSR_index;

          direction = fromIndex > toIndex ? 'right' : 'left';
        }

        return [`slide-${direction}`];
      },
    },
    parseSearch: parseSearchWith(parse),
    stringifySearch: stringifySearchWith(stringify),
  });

  setupRouterSsrQueryIntegration({
    router,
    queryClient,
    wrapQueryClient: true,
  });

  return router;
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createRouter>;
  }
}
