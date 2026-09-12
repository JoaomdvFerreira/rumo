import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';

async function clearPersistedState(page: Page) {
  await page.evaluate(() => window.localStorage.clear());
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await clearPersistedState(page);
  await page.reload();
});

test('homepage renders proposition, search, and the three common scenarios', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Rumo', exact: true })).toBeVisible();
  await expect(page.getByText('Não precisa de saber por onde começar.')).toBeVisible();
  await expect(page.getByRole('textbox', { name: /precisa de resolver/i })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Mudar de casa' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Eletricidade e gás na nova casa' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Internet numa mudança' })).toBeVisible();
});

test('unsupported search returns zero-result UX, not a fabricated route', async ({ page }) => {
  await page.getByRole('textbox', { name: /precisa de resolver/i }).fill('preciso de um advogado para divórcio');
  await page.getByRole('button', { name: 'Procurar' }).click();

  await expect(page.getByText('Ainda não conseguimos ajudar com isso')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Mudar de casa' })).toBeVisible();
});

test('ambiguous electricity+internet search requires explicit selection', async ({ page }) => {
  await page.getByRole('textbox', { name: /precisa de resolver/i }).fill('preciso de eletricidade e internet');
  await page.getByRole('button', { name: 'Procurar' }).click();

  await expect(page.getByText('Encontrámos mais do que uma opção')).toBeVisible();
  const electricityOption = page.getByRole('button', { name: /Get electricity and gas connected/i });
  const internetOption = page.getByRole('button', { name: /Get internet connected/i });
  await expect(electricityOption).toBeVisible();
  await expect(internetOption).toBeVisible();

  await internetOption.click();
  await expect(page.getByRole('heading', { name: 'Get internet connected' })).toBeVisible();
});

test('J01 asks Citizen Card question and routes correctly on answer', async ({ page }) => {
  await page.getByRole('button', { name: 'Mudar de casa' }).click();

  await expect(page.getByRole('group', { name: 'Tem Cartão de Cidadão português?' })).toBeVisible();

  await page.getByRole('button', { name: 'Sim' }).click();

  await expect(page.getByText('Faça isto agora')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Update your address on the Citizen Card' })).toBeVisible();
});

test('Évora rental alias preserves municipality fact and still asks only the missing Citizen Card question', async ({ page }) => {
  await page.getByRole('textbox', { name: /precisa de resolver/i }).fill('Entrei numa casa arrendada em Évora');
  await page.getByRole('button', { name: 'Procurar' }).click();

  await expect(page.getByRole('group', { name: 'Tem Cartão de Cidadão português?' })).toBeVisible();
  await page.getByRole('button', { name: 'Sim' }).click();

  await expect(page.getByText('Faça isto agora')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Update your address on the Citizen Card' })).toBeVisible();

  // The Évora water subjourney is part of this destination's progression,
  // currently gated by its own unmet requirements (rendered in "Antes de
  // avançar", not as executable parallel work) until they are confirmed.
  await expect(page.getByText('Antes de avançar')).toBeVisible();
  await expect(page.getByText('Request a new water supply contract with Câmara Municipal de Évora')).toBeVisible();

  const identificationCheckbox = page.getByRole('checkbox', { name: /Valid identification document/ });
  const occupancyCheckbox = page.getByRole('checkbox', { name: /Proof of right to occupy the property/ });
  const nifCheckbox = page.getByRole('checkbox', { name: /Tax identification number/ });

  await identificationCheckbox.click();
  await expect(identificationCheckbox).toBeChecked();
  await occupancyCheckbox.click();
  await expect(occupancyCheckbox).toBeChecked();
  await nifCheckbox.click();

  await expect(page.getByText('Trabalho em paralelo')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Set up water supply in Évora' })).not.toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Request a new water supply contract with Câmara Municipal de Évora' }),
  ).toBeVisible();
});

test('J02 asks gas-connection question and shows correct executable hierarchy', async ({ page }) => {
  await page.getByRole('button', { name: 'Eletricidade e gás na nova casa' }).click();

  await expect(page.getByRole('group', { name: 'A nova casa já tem ligação de gás?' })).toBeVisible();
  await page.getByRole('button', { name: 'Sim' }).click();

  await expect(page.getByRole('heading', { name: 'Choose and sign up with an electricity supplier' })).toBeVisible();
  await expect(page.getByText('Trabalho em paralelo')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Choose and sign up with a natural gas supplier' })).toBeVisible();
});

test('J03 keep-number alias selects portability behaviour without asking the question again', async ({ page }) => {
  await page.getByRole('textbox', { name: /precisa de resolver/i }).fill('mudar de operador de internet e manter o meu número de telefone');
  await page.getByRole('button', { name: 'Procurar' }).click();

  await expect(page.getByRole('heading', { name: 'Request number portability with your CVP code' })).toBeVisible();
  await expect(page.getByRole('group', { name: 'Quer manter o seu número de telefone atual?' })).not.toBeVisible();
});

test('J03 generic flow asks the missing portability question', async ({ page }) => {
  await page.getByRole('button', { name: 'Internet numa mudança' }).click();

  await expect(page.getByRole('group', { name: 'Quer manter o seu número de telefone atual?' })).toBeVisible();
  await page.getByRole('button', { name: 'Não' }).click();

  await expect(page.getByRole('heading', { name: 'Choose an internet/telecom operator and sign up' })).toBeVisible();
});

test('manual task completion advances progress', async ({ page }) => {
  await page.getByRole('button', { name: 'Mudar de casa' }).click();
  await page.getByRole('button', { name: 'Sim' }).click();

  await expect(page.getByRole('heading', { name: 'Update your address on the Citizen Card' })).toBeVisible();
  await page.getByRole('button', { name: 'Marcar como concluído' }).click();

  await expect(page.getByRole('heading', { name: 'Update your address on the Citizen Card' })).not.toBeVisible();
});

test('wait appears as A AGUARDAR only when executable work is exhausted', async ({ page }) => {
  await page.getByRole('button', { name: 'Internet numa mudança' }).click();
  await page.getByRole('button', { name: 'Não' }).click();

  await expect(page.getByRole('heading', { name: 'Choose an internet/telecom operator and sign up' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'A aguardar', exact: true })).not.toBeVisible();

  await page.getByRole('button', { name: 'Marcar como concluído' }).click();

  await expect(page.getByRole('heading', { name: 'A aguardar', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Wait for technician installation' })).toBeVisible();
});

test('requirements/blockers cannot be executed before satisfaction', async ({ page }) => {
  await page.getByRole('textbox', { name: /precisa de resolver/i }).fill('Entrei numa casa arrendada em Évora');
  await page.getByRole('button', { name: 'Procurar' }).click();
  await page.getByRole('button', { name: 'Sim' }).click();

  await expect(page.getByText('Antes de avançar')).toBeVisible();
  const blockedHeading = page.getByRole('heading', {
    name: 'Request a new water supply contract with Câmara Municipal de Évora',
  });
  await expect(blockedHeading).not.toBeVisible();

  const identificationCheckbox = page.getByRole('checkbox', { name: /Valid identification document/ });
  const occupancyCheckbox = page.getByRole('checkbox', { name: /Proof of right to occupy the property/ });
  const nifCheckbox = page.getByRole('checkbox', { name: /Tax identification number/ });

  await identificationCheckbox.click();
  await expect(identificationCheckbox).toBeChecked();
  await expect(blockedHeading).not.toBeVisible();
  await occupancyCheckbox.click();
  await expect(occupancyCheckbox).toBeChecked();
  await expect(blockedHeading).not.toBeVisible();
  await nifCheckbox.click();

  await expect(blockedHeading).toBeVisible();
});

test('reload restores saved progress', async ({ page }) => {
  await page.getByRole('button', { name: 'Mudar de casa' }).click();
  await page.getByRole('button', { name: 'Sim' }).click();
  await expect(page.getByRole('heading', { name: 'Update your address on the Citizen Card' })).toBeVisible();

  await page.reload();

  await expect(page.getByRole('heading', { name: 'Update your address on the Citizen Card' })).toBeVisible();
  await expect(page.getByRole('group', { name: 'Tem Cartão de Cidadão português?' })).not.toBeVisible();
});

test('reset clears active progress and returns home', async ({ page }) => {
  await page.getByRole('button', { name: 'Mudar de casa' }).click();
  await page.getByRole('button', { name: 'Sim' }).click();
  await expect(page.getByRole('heading', { name: 'Update your address on the Citizen Card' })).toBeVisible();

  await page.getByRole('button', { name: 'Começar de novo' }).click();

  await expect(page.getByRole('textbox', { name: /precisa de resolver/i })).toBeVisible();

  await page.reload();
  await expect(page.getByRole('textbox', { name: /precisa de resolver/i })).toBeVisible();
});

test('mobile ~360px has no horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.getByRole('button', { name: 'Mudar de casa' }).click();
  await page.getByRole('button', { name: 'Sim' }).click();

  const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  expect(hasOverflow).toBe(false);
});

test('keyboard smoke flow works end to end', async ({ page }) => {
  await page.getByRole('textbox', { name: /precisa de resolver/i }).focus();
  await page.keyboard.type('Mudar de casa');
  await page.keyboard.press('Enter');

  await expect(page.getByRole('group', { name: 'Tem Cartão de Cidadão português?' })).toBeVisible();

  await page.getByRole('button', { name: 'Sim' }).focus();
  await page.keyboard.press('Enter');

  await expect(page.getByRole('heading', { name: 'Update your address on the Citizen Card' })).toBeVisible();
});

test('axe reports no serious/critical violations on homepage, question state, and active journey state', async ({ page }) => {
  const homepageScan = await new AxeBuilder({ page }).analyze();
  expect(homepageScan.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')).toEqual([]);

  await page.getByRole('button', { name: 'Mudar de casa' }).click();
  const questionScan = await new AxeBuilder({ page }).analyze();
  expect(questionScan.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')).toEqual([]);

  await page.getByRole('button', { name: 'Sim' }).click();
  await expect(page.getByRole('heading', { name: 'Update your address on the Citizen Card' })).toBeVisible();
  const activeScan = await new AxeBuilder({ page }).analyze();
  expect(activeScan.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')).toEqual([]);
});
