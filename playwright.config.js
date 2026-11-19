// Playwright config run through the BrowserStack SDK (npm run test:bstack).
const config = {
  testDir: './tests',
  testMatch: '**/*.spec.js',

  /* Maximum time one test can run for. */
  timeout: 90 * 1000,
  expect: {
    timeout: 10 * 1000,
  },
  use: {
    viewport: { width: 1280, height: 900 },
  },
  /* tests in parallel */
  workers: 1,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'line',
  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chrome',
      use: {
        browserName: 'chromium',
        channel: 'chrome',
      },
    },
  ],
};

module.exports = config;
