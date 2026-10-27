import { expect, test } from '@playwright/test';

async function dragTo(page, locator, destination) {
  const source = await locator.boundingBox();
  const target = await destination.boundingBox();
  if (!source || !target) throw new Error('The draggable item or Recycle Bin has no visible box.');
  await page.mouse.move(source.x + source.width / 2, source.y + source.height / 2);
  await page.mouse.down();
  await page.mouse.move(target.x + target.width / 2, target.y + target.height / 2, { steps: 8 });
  await page.mouse.up();
}

async function trash(page, id) {
  await dragTo(page, page.locator(`[data-world-id="${id}"]`), page.locator('[data-bin="true"]'));
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.__toneStarts = 0;
    window.__toneFrequencies = [];
    class MockAudioContext {
      constructor() { this.currentTime = 0; this.state = 'running'; this.destination = {}; }
      createOscillator() {
        return {
          frequency: { setValueAtTime(value) { window.__toneFrequencies.push(value); } }, type: '', connect() {},
          start() { window.__toneStarts += 1; }, stop() {},
        };
      }
      createGain() { return { gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} }; }
      resume() { return Promise.resolve(); }
    }
    Object.defineProperty(window, 'AudioContext', { configurable: true, value: MockAudioContext });
    Object.defineProperty(window, 'Notification', { configurable: true, value: undefined });
  });
  await page.goto('/');
});

test('the desktop layout, Start menu, clock, movable scene, and sounds work', async ({ page }, testInfo) => {
  const bin = page.locator('[data-bin="true"]');
  const binBox = await bin.boundingBox();
  expect(binBox.width).toBeLessThan(180);
  expect(binBox.height).toBeLessThan(190);
  expect(binBox.x).toBeLessThan(30);
  expect(binBox.y + binBox.height).toBeCloseTo(748, 0);
  await expect(page.getByRole('timer')).toBeVisible();

  const start = page.getByRole('button', { name: 'start' });
  await start.click();
  await expect(page.getByRole('region', { name: 'Start menu' })).toBeVisible();
  await start.click();
  expect(await page.evaluate(() => window.__toneStarts)).toBeGreaterThanOrEqual(4);
  expect(await page.evaluate(() => [523, 659, 784].every((value) => window.__toneFrequencies.includes(value)))).toBe(true);

  const cloud = page.locator('[data-world-id="cloud-center"]');
  const before = await cloud.evaluate((node) => node.style.left);
  const cloudBox = await cloud.boundingBox();
  await page.mouse.move(cloudBox.x + cloudBox.width / 2, cloudBox.y + cloudBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(cloudBox.x + cloudBox.width / 2 + 65, cloudBox.y + cloudBox.height / 2 + 34, { steps: 5 });
  await page.mouse.up();
  await expect.poll(() => cloud.evaluate((node) => node.style.left)).not.toBe(before);

  const title = page.locator('[data-world-id="window-xtreme"]');
  await expect(title).toHaveAttribute('aria-label', /Window Xtreme title/);
  const titleBefore = await title.evaluate((node) => node.style.left);
  const titleBox = await title.boundingBox();
  await page.mouse.move(titleBox.x + titleBox.width / 2, titleBox.y + titleBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(titleBox.x + titleBox.width / 2 + 40, titleBox.y + titleBox.height / 2 + 25, { steps: 4 });
  await page.mouse.up();
  await expect.poll(() => title.evaluate((node) => node.style.left)).not.toBe(titleBefore);

  await trash(page, 'cloud-left');
  await expect(page.locator('[data-world-id="cloud-left"]')).toHaveCount(0);
  expect(await page.evaluate(() => window.__toneStarts)).toBeGreaterThanOrEqual(8);
  expect(await page.evaluate(() => [660, 523, 392, 294].every((value) => window.__toneFrequencies.includes(value)))).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('xp-desktop.png') });
});

test('dropping the account too early opens 25 XP error windows and leaves the account intact', async ({ page }) => {
  await trash(page, 'account');
  await expect(page.locator('.desktop')).toHaveAttribute('data-phase', 'premature-spam');
  await expect(page.getByRole('dialog')).toHaveCount(25);
  await expect(page.getByText('You cannot delete the account yet.').first()).toBeVisible();
  await expect(page.locator('[data-world-id="account"]')).toBeAttached();
  expect(await page.evaluate(() => [220, 196, 164].every((value) => window.__toneFrequencies.includes(value)))).toBe(true);

  for (let number = 25; number >= 1; number -= 1) {
    await page.getByRole('button', { name: `Close delete account window ${number} of 25` }).click();
  }
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('.desktop')).toHaveAttribute('data-phase', 'desktop');
  await expect(page.locator('[data-world-id="account"]')).toBeAttached();
  await expect(page.getByText('Account deleted')).toHaveCount(0);
});

test('only My Account uses native confirmations; four accounts reset then delete cleanly', async ({ page }) => {
  for (const id of [
    'cloud-left', 'cloud-center', 'cloud-right', 'sun-glow', 'xp-logo', 'window-xtreme', 'hill',
    'grass-left', 'grass-middle', 'grass-right', 'start', 'clock', 'taskbar',
  ]) await trash(page, id);

  await expect(page.locator('[data-world-id]')).toHaveCount(1);

  const dialogMessages = [];
  let dismissFirstSequence = true;
  page.on('dialog', async (dialog) => {
    dialogMessages.push(dialog.message());
    if (dismissFirstSequence && dialogMessages.length === 2) {
      dismissFirstSequence = false;
      await dialog.dismiss();
    } else await dialog.accept();
  });

  const firstSequenceStart = dialogMessages.length;
  await trash(page, 'account');
  await expect(page.locator('.desktop')).toHaveAttribute('data-phase', 'desktop');
  expect(dialogMessages.slice(firstSequenceStart)).toHaveLength(2);
  await expect(page.locator('[data-world-id="account"]')).toBeAttached();

  const secondSequenceStart = dialogMessages.length;
  await trash(page, 'account');
  await expect(page.locator('.desktop')).toHaveAttribute('data-phase', 'evasive-choice');
  const secondSequence = dialogMessages.slice(secondSequenceStart);
  expect(secondSequence).toHaveLength(11);
  expect(secondSequence[1].match(/really/g)).toHaveLength(2);
  expect(secondSequence[10].match(/really/g)).toHaveLength(11);

  const evasivePrompt = page.getByRole('dialog', { name: 'Windows XP Account Manager' });
  await expect(evasivePrompt).toBeVisible();
  const deleteButton = evasivePrompt.getByRole('button', { name: 'Delete Account' });
  const beforeDodge = await deleteButton.boundingBox();
  await deleteButton.hover();
  const afterDodge = await deleteButton.boundingBox();
  expect(Math.hypot(afterDodge.x - beforeDodge.x, afterDodge.y - beforeDodge.y)).toBeGreaterThan(20);
  await evasivePrompt.getByRole('button', { name: 'Keep Account' }).click();
  await expect(page.locator('.desktop')).toHaveAttribute('data-phase', 'desktop');
  await expect(page.locator('[data-world-id="account"]')).toBeAttached();
  await expect(page.locator('[data-world-id^="account-"]')).toHaveCount(0);

  await trash(page, 'account');
  await expect(page.locator('.desktop')).toHaveAttribute('data-phase', 'evasive-choice');
  const keyboardDelete = page.getByRole('dialog', { name: 'Windows XP Account Manager' }).getByRole('button', { name: 'Delete Account' });
  await keyboardDelete.focus();
  await keyboardDelete.press('Enter');
  await expect(page.getByRole('status')).toHaveText('Hooray! You have created another account!');
  await expect(page.locator('[data-world-id^="account"]')).toHaveCount(2);
  const existing = await page.locator('[data-world-id="account"]').boundingBox();
  const created = await page.locator('[data-world-id="account-2"]').boundingBox();
  expect(created.x).toBeGreaterThan(existing.x);
  expect(Math.abs(created.y - existing.y)).toBeLessThan(8);

  const nativePromptCount = dialogMessages.length;
  for (const id of ['account-2', 'account-3']) {
    await trash(page, id);
    await expect(page.locator('.desktop')).toHaveAttribute('data-phase', 'evasive-choice');
    expect(dialogMessages).toHaveLength(nativePromptCount);
    const nextAccountButton = page.getByRole('dialog', { name: 'Windows XP Account Manager' }).getByRole('button', { name: 'Delete Account' });
    await nextAccountButton.focus();
    await nextAccountButton.press('Enter');
  }

  await expect(page.locator('.desktop')).toHaveAttribute('data-phase', 'desktop');
  await expect(page.locator('[data-world-id^="account"]')).toHaveCount(4);
  await expect(page.locator('[data-world-id="cloud-left"]')).toBeAttached();
  await expect(page.locator('[data-world-id]')).toHaveCount(17);

  for (const id of [
    'cloud-left', 'cloud-center', 'cloud-right', 'sun-glow', 'xp-logo', 'window-xtreme', 'hill',
    'grass-left', 'grass-middle', 'grass-right', 'start', 'clock', 'taskbar',
  ]) await trash(page, id);

  for (const id of ['account', 'account-2', 'account-3', 'account-4']) {
    const promptsBeforeDrop = dialogMessages.length;
    await trash(page, id);
    await expect(page.locator('.desktop')).toHaveAttribute('data-phase', 'evasive-choice');
    expect(dialogMessages.length - promptsBeforeDrop).toBe(id === 'account' ? 11 : 0);
    const deleteButton = page.getByRole('dialog', { name: 'Windows XP Account Manager' }).getByRole('button', { name: 'Delete Account' });
    await deleteButton.focus();
    await deleteButton.press('Enter');
  }
  await expect(page.locator('.deleted-screen')).toHaveText('You have deleted your account. You were sure. I am sorry. Create a new account, please.');
  await expect(page.locator('[data-world-id]')).toHaveCount(0);
});
