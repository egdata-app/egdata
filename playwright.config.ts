import { defineConfig, devices } from "@playwright/test";

const BETTER_AUTH_SECRET = process.env.BETTER_AUTH_SECRET || "test-secret-key-for-e2e"; // fallback for tests
const PROFILE_APP_PORT = 3100;
const PROFILE_API_PROXY_PORT = 3101;
const baseURL = "http://localhost:3000";
const webServerCommand =
  process.platform === "win32"
    ? `pwsh -Command "& { $env:BETTER_AUTH_URL='${baseURL}'; $env:BETTER_AUTH_SECRET='${BETTER_AUTH_SECRET}'; pnpm start }"`
    : `BETTER_AUTH_URL=${baseURL} BETTER_AUTH_SECRET=${BETTER_AUTH_SECRET} pnpm start`;
const profileWebServerCommand =
  process.platform === "win32"
    ? `pwsh -Command "& { $env:API_ENDPOINT='http://127.0.0.1:${PROFILE_API_PROXY_PORT}'; $env:BETTER_AUTH_URL='http://localhost:${PROFILE_APP_PORT}'; $env:BETTER_AUTH_SECRET='${BETTER_AUTH_SECRET}'; $env:PORT='${PROFILE_APP_PORT}'; pnpm start }"`
    : `API_ENDPOINT=http://127.0.0.1:${PROFILE_API_PROXY_PORT} BETTER_AUTH_URL=http://localhost:${PROFILE_APP_PORT} BETTER_AUTH_SECRET=${BETTER_AUTH_SECRET} PORT=${PROFILE_APP_PORT} pnpm start`;

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: "./tests/e2e",
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry failed tests */
  retries: process.env.CI ? 2 : 1,
  /* Limit workers to avoid overwhelming the dev server */
  workers: process.env.CI ? 1 : 4,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: "html",
  /* Global timeout for each test */
  timeout: 60000,
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL,

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: "on-first-retry",

    /* Take screenshot on failure */
    screenshot: "only-on-failure",

    /* Record video on failure */
    video: "retain-on-failure",

    /* Navigation timeout */
    navigationTimeout: 30000,

    /* Action timeout */
    actionTimeout: 15000,
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: [
    {
      command: "node tests/e2e/support/profile-api-proxy.mjs",
      url: `http://127.0.0.1:${PROFILE_API_PROXY_PORT}/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 30 * 1000,
    },
    {
      // Test-only startup defaults (never intended for production runtime).
      command: webServerCommand,
      url: baseURL,
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000,
    },
    {
      command: profileWebServerCommand,
      url: `http://localhost:${PROFILE_APP_PORT}`,
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000,
    },
  ],
});
