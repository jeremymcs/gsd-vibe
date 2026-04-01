// VCCA - E2E Navigation Tests
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('VCCA')).toBeVisible();
  });

  test('loads home as the default route', async ({ page }) => {
    await expect(page).toHaveURL('/');
    await expect(page.getByRole('button', { name: 'Home' })).toBeVisible();
  });

  test('navigates between global routes', async ({ page }) => {
    const settingsButton = page.getByRole('button', { name: 'Settings' });
    await settingsButton.click();
    await expect(page).toHaveURL('/settings');

    const notificationsButton = page
      .getByLabel('Sidebar navigation')
      .getByRole('button', { name: 'Notifications' });
    await notificationsButton.click();
    await expect(page).toHaveURL('/notifications');

    const homeButton = page.getByRole('button', { name: 'Home' });
    await homeButton.click();
    await expect(page).toHaveURL('/');
  });

  test('supports direct URL navigation for active routes', async ({ page }) => {
    await page.goto('/projects');
    await expect(page).toHaveURL('/projects');
    await expect(page.getByRole('heading', { name: 'Projects' })).toBeVisible();

    await page.goto('/settings');
    await expect(page).toHaveURL('/settings');
    await expect(page.getByText('VCCA')).toBeVisible();
  });

  test('can collapse and expand sidebar', async ({ page }) => {
    const collapseButton = page.getByRole('button', { name: 'Collapse sidebar' });
    await expect(collapseButton).toBeVisible();
    await collapseButton.click();

    const expandButton = page.getByRole('button', { name: 'Expand sidebar' });
    await expect(expandButton).toBeVisible();
    await expandButton.click();

    await expect(page.getByRole('button', { name: 'Collapse sidebar' })).toBeVisible();
  });
});
