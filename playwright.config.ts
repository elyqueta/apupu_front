import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env['E2E_BASE_URL'];

const mobileViewport = { width: 360, height: 640 };
const desktopViewport = { width: 1440, height: 900 };

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env['CI']),
  retries: process.env['CI'] ? 2 : 0,
  reporter: 'list',
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'mobile-light',
      use: {
        ...devices['Pixel 5'],
        viewport: mobileViewport,
        colorScheme: 'light',
      },
    },
    {
      name: 'mobile-dark',
      use: {
        ...devices['Pixel 5'],
        viewport: mobileViewport,
        colorScheme: 'dark',
      },
    },
    {
      name: 'desktop-light',
      use: {
        ...devices['Desktop Chrome'],
        viewport: desktopViewport,
        colorScheme: 'light',
      },
    },
    {
      name: 'desktop-dark',
      use: {
        ...devices['Desktop Chrome'],
        viewport: desktopViewport,
        colorScheme: 'dark',
      },
    },
  ],
});
