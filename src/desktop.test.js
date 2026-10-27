import { describe, expect, it, vi } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import App, { DeleteWindow, EvasiveAccountPrompt } from './App.jsx';
import {
  BIN_ID,
  clampPosition,
  confirmAccountDeletion,
  createDesktopState,
  DELETE_WINDOW_COUNT,
  desktopReducer,
  getAccountConfirmationMessages,
  getBinSize,
  getItemSize,
  getDraggedPosition,
  MOVABLE_IDS,
  pointIsInBin,
  WORLD_ITEMS,
} from './desktop.js';
import { RETRO_SOUND_NOTES, synthesizeRetroSound } from './sounds.js';

const assetsPath = (file) => resolve(process.cwd(), 'public/assets', file);

describe('XP desktop controls and artwork', () => {
  it('renders the account, reduced-size bin, movable XP scene, Start control, and clock', () => {
    const markup = renderToStaticMarkup(React.createElement(App));
    expect(markup).toContain('aria-label="Windows XP desktop"');
    expect(markup).toContain('My Account');
    expect(markup).toContain('Recycle Bin');
    expect(markup).toContain('aria-expanded="false"');
    expect(markup).toContain('start');
    expect(markup).toContain('class="desktop-clock"');
    expect((markup.match(/class="world-item/g) ?? [])).toHaveLength(WORLD_ITEMS.length);
    expect((markup.match(/class="recycle-bin/g) ?? [])).toHaveLength(1);
    expect(markup).toContain('data-world-id="window-xtreme"');
    expect(markup).toContain('Window Xtreme title. Drag to move; move to Recycle Bin to remove.');
    for (const item of WORLD_ITEMS) expect(markup).toContain(`${item.label}. Drag to move; move to Recycle Bin to remove.`);
  });

  it('ships every movable visual as a local PNG', () => {
    for (const item of WORLD_ITEMS) {
      if (item.image) {
        expect(item.image).toMatch(/\.png$/);
        expect(existsSync(assetsPath(item.image.split('/').at(-1)))).toBe(true);
      }
    }
    for (const asset of ['xp-pixel-wallpaper.png', 'pixel-cursor.png', 'pixel-hold-cursor.png', 'recycle-bin-icon.png']) {
      expect(existsSync(assetsPath(asset))).toBe(true);
    }
    expect(existsSync(assetsPath('window-xtreme-title.png'))).toBe(true);
    const state = createDesktopState(1280, 800);
    expect(state.positions['window-xtreme'].x).toBeGreaterThan(state.positions['xp-logo'].x + 210);
  });

  it('moves objects with the pointer while honoring a movement threshold and desktop edges', () => {
    expect(getDraggedPosition({ x: 100, y: 100 }, { x: 10, y: 10 }, { x: 25, y: 20 }, { width: 800, height: 600 }, { width: 100, height: 80 })).toEqual({ x: 115, y: 110 });
    expect(getDraggedPosition({ x: 100, y: 100 }, { x: 10, y: 10 }, { x: 12, y: 11 }, { width: 800, height: 600 })).toBeNull();
    expect(clampPosition({ x: 790, y: 590 }, { width: 800, height: 600 }, { width: 100, height: 80 })).toEqual({ x: 692, y: 512 });
  });

  it('uses the large bin rectangle as the drop target', () => {
    const binRect = { left: 20, top: 500, right: 256, bottom: 736 };
    expect(pointIsInBin({ x: 100, y: 610 }, binRect)).toBe(true);
    expect(pointIsInBin({ x: 400, y: 610 }, binRect)).toBe(false);
    expect(MOVABLE_IDS).not.toContain(BIN_ID);
    expect(getBinSize(1024)).toEqual({ width: 132, height: 140 });
    expect(getBinSize(390)).toEqual({ width: 108, height: 116 });
  });

  it('keeps every starting item reachable on a narrow phone screen', () => {
    const state = createDesktopState(360, 740);
    for (const item of WORLD_ITEMS) {
      const size = getItemSize(item, 360);
      const position = state.positions[item.id];
      const gutterX = size.width >= 360 - 16 ? 0 : 8;
      const gutterY = item.kind === 'rail' || size.height >= 740 - 16 ? 0 : 8;
      expect(position.x).toBeGreaterThanOrEqual(gutterX);
      expect(position.x + size.width).toBeLessThanOrEqual(360 - gutterX);
      expect(position.y).toBeGreaterThanOrEqual(gutterY);
      expect(position.y + size.height).toBeLessThanOrEqual(740 - gutterY);
    }
    expect(state.positions[BIN_ID].y + getBinSize(360).height).toBe(740 - 52);
  });

  it('keeps the wallpaper, cloud, hill, grass, flag, bin, and cursor in pixel style', () => {
    const css = readFileSync(resolve(process.cwd(), 'src/styles.css'), 'utf8');
    expect(css).toContain("url('/assets/xp-pixel-wallpaper.png')");
    expect(css).toContain("url('/assets/pixel-cursor.png')");
    expect(css).toContain("url('/assets/pixel-hold-cursor.png')");
    expect(css).toContain('image-rendering: pixelated');
    expect(css).toContain('.recycle-bin {');
    expect(css).toContain('width: 132px; height: 140px;');
    expect(existsSync(assetsPath('xp-window-logo.png'))).toBe(true);
    expect(existsSync(assetsPath('xp-green-hill.png'))).toBe(true);
    expect(existsSync(assetsPath('pixel-grass.png'))).toBe(true);
    expect(existsSync(assetsPath('pixel-cloud.png'))).toBe(true);
    expect(css).toContain('.evasive-dialog');
  });

  it('renders premature warning windows and the evasive final choice', () => {
    const windowMarkup = renderToStaticMarkup(React.createElement(DeleteWindow, { number: 7, total: 25, blocked: true, onClose: () => {} }));
    const choiceMarkup = renderToStaticMarkup(React.createElement(EvasiveAccountPrompt, { onKeep: () => {}, onDelete: () => {} }));
    expect(windowMarkup).toContain('role="dialog"');
    expect(windowMarkup).toContain('Close delete account window 7 of 25');
    expect(windowMarkup).toContain('Windows XP - Delete Error');
    expect(choiceMarkup).toContain('role="dialog"');
    expect(choiceMarkup).toContain('Do you want to delete this account?');
    expect(choiceMarkup).toContain('Delete Account');
    expect(choiceMarkup).toContain('Keep Account');
  });
});

describe('account deletion safeguards', () => {
  it('blocks the account until all other desktop items have been thrown away', () => {
    const initial = createDesktopState(1280, 800);
    let blocked = desktopReducer(initial, { type: 'drop', id: 'account' });
    expect(blocked.phase).toBe('premature-spam');
    expect(blocked.remaining).toContain('account');
    expect(blocked.message).toMatch(/every other desktop item/i);
    expect(blocked.remaining).toHaveLength(MOVABLE_IDS.length);
    expect(blocked.windows).toHaveLength(DELETE_WINDOW_COUNT);
    for (const id of blocked.windows.slice()) blocked = desktopReducer(blocked, { type: 'close-delete-window', id });
    expect(blocked.phase).toBe('desktop');
    expect(blocked.remaining).toContain('account');
    expect(blocked.windows).toHaveLength(0);
    const blockedAgain = desktopReducer(blocked, { type: 'drop', id: 'account' });
    expect(blockedAgain.phase).toBe('premature-spam');
    expect(blockedAgain.windows).toHaveLength(DELETE_WINDOW_COUNT);
    expect(blockedAgain.remaining).toContain('account');
  });

  it('cancelling any confirm leaves the account intact and restores its original position', () => {
    let state = createDesktopState(1280, 800);
    for (const id of MOVABLE_IDS.filter((itemId) => itemId !== 'account')) {
      state = desktopReducer(state, { type: 'drop', id });
    }
    state = desktopReducer(state, { type: 'drop', id: 'account' });
    expect(state.phase).toBe('confirming');
    const cancelled = desktopReducer(state, { type: 'cancel-account-confirmation' });
    expect(cancelled.phase).toBe('desktop');
    expect(cancelled.remaining).toEqual(['account']);
    expect(cancelled.windows).toHaveLength(0);
    expect(cancelled.positions.account).toEqual(createDesktopState(1280, 800).positions.account);
  });

  it('creates a second draggable account after the evasive Delete choice is activated', () => {
    let state = createDesktopState(1280, 800);
    for (const id of MOVABLE_IDS.filter((itemId) => itemId !== 'account')) {
      state = desktopReducer(state, { type: 'drop', id });
    }
    state = desktopReducer(state, { type: 'drop', id: 'account' });
    state = desktopReducer(state, { type: 'show-evasive-choice' });
    expect(state.phase).toBe('evasive-choice');
    const original = state.positions.account;
    const result = desktopReducer(state, { type: 'create-account', bounds: { width: 1280, height: 800 } });
    expect(result.phase).toBe('desktop');
    expect(result.remaining).toEqual(['account', 'account-2']);
    expect(result.newAccounts).toEqual([{ id: 'account-2', label: 'New Account 2' }]);
    expect(result.positions.account).toEqual(original);
    expect(result.positions['account-2'].x).toBe(original.x + 84);
    expect(result.message).toMatch(/Hooray! You have created another account!/);
  });

  it('resets the desktop with four accounts, then finishes after all four are deleted', () => {
    let state = createDesktopState(1280, 800);
    const clearNonAccountsAndCreate = () => {
      for (const id of state.remaining.filter((itemId) => itemId !== 'account' && !itemId.startsWith('account-'))) {
        state = desktopReducer(state, { type: 'drop', id });
      }
      state = desktopReducer(state, { type: 'drop', id: 'account' });
      state = desktopReducer(state, { type: 'show-evasive-choice' });
      state = desktopReducer(state, { type: 'create-account', bounds: { width: 1280, height: 800 } });
    };

    clearNonAccountsAndCreate();
    expect(state.newAccounts.map((account) => account.id)).toEqual(['account-2']);
    clearNonAccountsAndCreate();
    expect(state.newAccounts.map((account) => account.id)).toEqual(['account-2', 'account-3']);
    clearNonAccountsAndCreate();

    expect(state.accountCycleComplete).toBe(true);
    expect(state.newAccounts.map((account) => account.id)).toEqual(['account-2', 'account-3', 'account-4']);
    expect(state.remaining).toEqual([...MOVABLE_IDS, 'account-2', 'account-3', 'account-4']);
    expect(state.remaining.filter((id) => id.startsWith('account'))).toHaveLength(4);
    expect(state.remaining).toContain('cloud-left');

    for (const id of state.remaining.filter((itemId) => itemId !== 'account' && !itemId.startsWith('account-'))) {
      state = desktopReducer(state, { type: 'drop', id });
    }
    for (const id of ['account', 'account-2', 'account-3', 'account-4']) {
      state = desktopReducer(state, { type: 'drop', id });
      expect(state.phase).toBe('confirming');
      state = desktopReducer(state, { type: 'show-evasive-choice' });
      state = desktopReducer(state, { type: 'create-account', bounds: { width: 1280, height: 800 } });
    }
    expect(state.phase).toBe('account-deleted');
    expect(state.remaining).toHaveLength(0);
    expect(state.message).toBe('You have deleted your account. You were sure. I am sorry. Create a new account, please.');
  });
});

describe('native delete confirmation sequence', () => {
  it('asks once to choose, then asks ten times with an additional really each time', () => {
    const messages = getAccountConfirmationMessages();
    const answers = [];
    expect(confirmAccountDeletion((message) => { answers.push(message); return true; })).toBe(true);
    expect(answers).toHaveLength(11);
    expect(answers[0]).toMatch(/OK to continue.*Cancel to keep/);
    for (let index = 1; index <= 10; index += 1) {
      expect(answers[index].match(/really/g)).toHaveLength(index + 1);
    }
    expect(messages).toEqual(answers);
  });

  it('stops immediately when the user cancels a native confirm', () => {
    const messages = [];
    expect(confirmAccountDeletion((message) => { messages.push(message); return messages.length < 4; })).toBe(false);
    expect(messages).toHaveLength(4);
    expect(messages[3]).toContain('really really really really want');
  });
});

describe('retro sound effects', () => {
  it('plays distinct click, Start, Keep, Delete, warning, and trash sounds', () => {
    const makeContext = () => {
      const oscillators = [];
      const context = {
        currentTime: 1,
        destination: {},
        createOscillator: vi.fn(() => {
          const oscillator = { frequency: { setValueAtTime: vi.fn() }, connect: vi.fn(), start: vi.fn(), stop: vi.fn(), type: '' };
          oscillators.push(oscillator);
          return oscillator;
        }),
        createGain: vi.fn(() => ({ gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() }, connect: vi.fn() })),
      };
      return { context, oscillators };
    };
    const click = makeContext();
    expect(synthesizeRetroSound(click.context, 'click')).toBe(2);
    expect(click.oscillators.map((oscillator) => oscillator.frequency.setValueAtTime.mock.calls[0][0])).toEqual([880, 660]);
    expect(click.oscillators.every((oscillator) => oscillator.type === 'square')).toBe(true);
    const trash = makeContext();
    expect(synthesizeRetroSound(trash.context, 'trash')).toBe(4);
    expect(trash.oscillators.map((oscillator) => oscillator.frequency.setValueAtTime.mock.calls[0][0])).toEqual([660, 523, 392, 294]);
    expect(RETRO_SOUND_NOTES.start).toEqual([523, 659, 784]);
    expect(RETRO_SOUND_NOTES.keep).toEqual([659, 784, 988]);
    expect(RETRO_SOUND_NOTES.delete).toEqual([784, 587, 392]);
    expect(RETRO_SOUND_NOTES.blocked).toEqual([220, 196, 164]);
    const start = makeContext();
    expect(synthesizeRetroSound(start.context, 'start')).toBe(3);
    expect(start.oscillators.map((oscillator) => oscillator.frequency.setValueAtTime.mock.calls[0][0])).toEqual([523, 659, 784]);
  });
});
