import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('renders the Rumo foundation shell accessibly', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Rumo' })).toBeVisible();
  await expect(page.getByText('Production foundation')).toBeVisible();

  const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
  expect(accessibilityScanResults.violations).toEqual([]);
});
