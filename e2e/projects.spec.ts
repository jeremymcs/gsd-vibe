// VCCA - E2E Projects Page Tests
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { test, expect } from '@playwright/test';

test.describe('Projects Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/projects');
    await expect(page.getByRole('heading', { name: 'Projects' })).toBeVisible();
  });

  test('renders projects page and branding', async ({ page }) => {
    await expect(page).toHaveURL('/projects');
    await expect(page.getByText('VCCA')).toBeVisible();
  });

  test('supports searching projects', async ({ page }) => {
    const searchInput = page.getByPlaceholder('Search by name, path, or description...');
    await expect(searchInput).toBeVisible();

    await searchInput.fill('demo project');
    await expect(searchInput).toHaveValue('demo project');

    await searchInput.clear();
    await expect(searchInput).toHaveValue('');
  });

  test('shows filter controls', async ({ page }) => {
    const comboboxes = page.locator('button[role="combobox"]');
    await expect(comboboxes).toHaveCount(2);
  });

  test('opens new project dialog', async ({ page }) => {
    const addProjectButton = page.getByRole('button', { name: 'Add Project' });
    await addProjectButton.click();

    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'New Project' })).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toBeHidden();
  });

  test('returns to home via sidebar navigation', async ({ page }) => {
    const homeButton = page.getByRole('button', { name: 'Home' });
    await homeButton.click();

    await expect(page).toHaveURL('/');
    await expect(page.getByRole('button', { name: 'Settings' })).toBeVisible();
  });
});
