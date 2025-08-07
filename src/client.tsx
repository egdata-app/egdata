import { startTransition, StrictMode } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { StartClient } from '@tanstack/react-start';
import * as Sentry from '@sentry/react';
import { createRouter } from './router';
import './registerSW';

function clearBrowserExtensionInjectionsBeforeHydration() {
  const selectors = [
    'html > *:not(body, head)',
    'script[src*="extension://"]',
    'link[href*="extension://"]',
  ];

  // @ts-expect-error
  for (const selector of document.querySelectorAll(selectors.join(', '))) {
    selector.parentNode?.removeChild(selector);
  }

  const $targets = {
    html: {
      $elm: document.querySelector('html') as HTMLHtmlElement,
      allowedAttributes: ['lang', 'dir', 'class'],
    },
    head: {
      $elm: document.querySelector('head') as HTMLHeadElement,
      allowedAttributes: [''],
    },
    body: {
      $elm: document.querySelector('body') as HTMLBodyElement,
      allowedAttributes: ['class'],
    },
  };

  for (const [targetName, target] of Object.entries($targets)) {
    for (const attr of target.$elm.getAttributeNames()) {
      if (!target.allowedAttributes.includes(attr)) {
        target.$elm.removeAttribute(attr);
        console.log(`Removed ${attr} from ${targetName}`);
      }
    }
  }
}

const router = createRouter();

function waitForHydration() {
  clearBrowserExtensionInjectionsBeforeHydration();

  Sentry.init({
    dsn: 'https://c0eeadb95071527c986770cd49b7b48c@o4506558481498112.ingest.us.sentry.io/4508779719884800',
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration(),
    ],
    // Tracing
    tracesSampleRate: 1.0, //  Capture 100% of the transactions
    // Set 'tracePropagationTargets' to control for which URLs distributed tracing should be enabled
    tracePropagationTargets: ['localhost', /^https:\/\/egdata\.app\/api/],
    // Session Replay
    replaysSessionSampleRate: 0.1, // This sets the sample rate at 10%. You may want to change it to 100% while in development and then sample at a lower rate in production.
    replaysOnErrorSampleRate: 1.0, // If you're not already sampling the entire session, change the sample rate to 100% when sampling sessions where errors occur.
  });

  startTransition(() => {
    hydrateRoot(
      document,
      <StrictMode>
        <StartClient router={router} />
      </StrictMode>,
    );
  });
}

if (window.requestIdleCallback) {
  window.requestIdleCallback(waitForHydration);
} else {
  // Safari doesn't support requestIdleCallback
  // https://caniuse.com/requestidlecallback
  window.setTimeout(waitForHydration, 1);
}

// Initialize PWA service worker registration
// The registration is handled by the imported registerSW module
