export const DELETE_WINDOW_COUNT = 25;
export const EDGE_GUTTER = 8;
export const DRAG_THRESHOLD = 4;

export const WORLD_ITEMS = [
  { id: 'account', label: 'My Account', kind: 'account', image: '/assets/xp-account-icon.png', width: 76, height: 84, place: (w, h) => ({ x: 22, y: 22 }) },
  { id: 'cloud-left', label: 'Left cloud', kind: 'image', image: '/assets/pixel-cloud.png', width: 150, height: 82, place: (w, h) => ({ x: Math.round(w * 0.13), y: Math.round(h * 0.12) }) },
  { id: 'cloud-center', label: 'Center cloud', kind: 'image', image: '/assets/pixel-cloud.png', width: 150, height: 82, place: (w, h) => ({ x: Math.round(w * 0.40), y: Math.round(h * 0.18) }) },
  { id: 'cloud-right', label: 'Right cloud', kind: 'image', image: '/assets/pixel-cloud.png', width: 150, height: 82, place: (w, h) => ({ x: Math.round(w * 0.77), y: Math.round(h * 0.11) }) },
  { id: 'sun-glow', label: 'Pixel sun', kind: 'image', image: '/assets/pixel-sun.png', width: 126, height: 126, place: (w, h) => ({ x: Math.round(w * 0.70), y: Math.round(h * 0.14) }) },
  { id: 'xp-logo', label: 'Windows XP flag', kind: 'image', image: '/assets/xp-window-logo.png', width: 210, height: 180, place: (w, h) => ({ x: Math.round(w * 0.48), y: Math.round(h * 0.30) }) },
  { id: 'window-xtreme', label: 'Window Xtreme title', kind: 'image', image: '/assets/window-xtreme-title.png', width: 260, height: 100, place: (w, h) => w <= 650 ? ({ x: 8, y: Math.round(h * 0.54) }) : ({ x: Math.round(w * 0.48 + 224), y: Math.round(h * 0.40) }) },
  { id: 'hill', label: 'Rolling green hill', kind: 'image', image: '/assets/xp-green-hill.png', width: 1000, height: 280, place: (w, h) => ({ x: Math.round(w * 0.14), y: Math.round(h * 0.59) }) },
  { id: 'grass-left', label: 'Left grass', kind: 'image', image: '/assets/pixel-grass.png', width: 150, height: 75, place: (w, h) => ({ x: Math.round(w * 0.19), y: Math.round(h * 0.75) }) },
  { id: 'grass-middle', label: 'Middle grass', kind: 'image', image: '/assets/pixel-grass.png', width: 150, height: 75, place: (w, h) => ({ x: Math.round(w * 0.55), y: Math.round(h * 0.73) }) },
  { id: 'grass-right', label: 'Right grass', kind: 'image', image: '/assets/pixel-grass.png', width: 150, height: 75, place: (w, h) => ({ x: Math.round(w * 0.80), y: Math.round(h * 0.72) }) },
  { id: 'start', label: 'Start button', kind: 'start', width: 110, height: 38, place: (w, h) => ({ x: 4, y: h - 42 }) },
  { id: 'clock', label: 'Desktop clock', kind: 'clock', width: 118, height: 32, place: (w, h) => ({ x: w - 126, y: h - 40 }) },
  { id: 'taskbar', label: 'Taskbar', kind: 'rail', width: 1280, height: 38, place: (w, h) => ({ x: 0, y: h - 38 }) },
];

export const MOVABLE_IDS = WORLD_ITEMS.map(({ id }) => id);
export const ACCOUNT_ID = 'account';
export const BIN_ID = 'recycle-bin';
const isAccountId = (id) => id === ACCOUNT_ID || id.startsWith('account-');
const DELETED_ACCOUNT_MESSAGE = 'You have deleted your account. You were sure. I am sorry. Create a new account, please.';

export function getAccountConfirmationMessages() {
  return [
    'Choose OK to continue deleting your account, or Cancel to keep it.',
    ...Array.from({ length: 10 }, (_, index) => `Do you ${'really '.repeat(index + 2)}want to delete your account?`),
  ];
}

export function confirmAccountDeletion(confirmFn) {
  for (const message of getAccountConfirmationMessages()) {
    if (!confirmFn(message)) return false;
  }
  return true;
}

export function getBinSize(viewportWidth) {
  return viewportWidth <= 650 ? { width: 108, height: 116 } : { width: 132, height: 140 };
}

export function getItemSize(item, viewportWidth) {
  if (item.kind === 'rail') return { width: viewportWidth, height: item.height };
  const scale = Math.min(1, (viewportWidth - EDGE_GUTTER * 2) / item.width);
  return { width: Math.round(item.width * scale), height: Math.round(item.height * scale) };
}

export function clampPosition(position, bounds, size = { width: 76, height: 76 }) {
  const gutterX = size.width >= bounds.width - EDGE_GUTTER * 2 ? 0 : EDGE_GUTTER;
  const gutterY = size.height >= bounds.height - EDGE_GUTTER * 2 ? 0 : EDGE_GUTTER;
  const maxX = Math.max(gutterX, bounds.width - size.width - gutterX);
  const maxY = Math.max(gutterY, bounds.height - size.height - gutterY);
  return {
    x: Math.min(maxX, Math.max(gutterX, Math.round(position.x))),
    y: Math.min(maxY, Math.max(gutterY, Math.round(position.y))),
  };
}

export function moveBy(position, delta, bounds, size) {
  return clampPosition({ x: position.x + delta.x, y: position.y + delta.y }, bounds, size);
}

export function getDraggedPosition(origin, pointerStart, pointerCurrent, bounds, size) {
  const delta = { x: pointerCurrent.x - pointerStart.x, y: pointerCurrent.y - pointerStart.y };
  if (Math.hypot(delta.x, delta.y) < DRAG_THRESHOLD) return null;
  return moveBy(origin, delta, bounds, size);
}

export function createDesktopState(width = 1280, height = 800) {
  const bounds = { width, height };
  return {
    remaining: MOVABLE_IDS.slice(),
    newAccounts: [],
    positions: {
      ...Object.fromEntries(WORLD_ITEMS.map((item) => [item.id, item.kind === 'rail' ? item.place(width, height) : clampPosition(item.place(width, height), bounds, getItemSize(item, width))])),
      [BIN_ID]: { x: 20, y: Math.max(8, height - getBinSize(width).height - 52) },
    },
    phase: 'desktop',
    accountCycleComplete: false,
    pendingAccountId: null,
    windows: [],
    message: '',
    restoreAccountPosition: null,
  };
}

export function desktopReducer(state, action) {
  switch (action.type) {
    case 'move':
      if (action.id !== BIN_ID && !state.remaining.includes(action.id)) return state;
      return { ...state, positions: { ...state.positions, [action.id]: clampPosition(action.position, action.bounds, action.size) } };
    case 'drop': {
      if (action.id === BIN_ID) return state;
      if (!state.remaining.includes(action.id)) return state;
      if (isAccountId(action.id)) {
        const hasOtherItems = state.remaining.some((id) => !isAccountId(id));
        if (hasOtherItems) return {
          ...state,
          phase: 'premature-spam',
          windows: Array.from({ length: DELETE_WINDOW_COUNT }, (_, index) => index + 1),
          message: 'Account deletion is blocked until every other desktop item is trashed.',
          pendingAccountId: action.id,
          restoreAccountPosition: action.returnPosition ?? state.positions[action.id],
        };
        return { ...state, phase: 'confirming', message: '', pendingAccountId: action.id, restoreAccountPosition: action.returnPosition ?? state.positions[action.id] };
      }
      return { ...state, remaining: state.remaining.filter((id) => id !== action.id), message: '' };
    }
    case 'show-evasive-choice':
      if (state.phase !== 'confirming') return state;
      return { ...state, phase: 'evasive-choice', message: '' };
    case 'cancel-account-confirmation':
      if (!['confirming', 'evasive-choice'].includes(state.phase)) return state;
      return {
        ...state,
        phase: 'desktop',
        message: '',
        positions: { ...state.positions, [state.pendingAccountId]: state.restoreAccountPosition ?? state.positions[state.pendingAccountId] },
        pendingAccountId: null,
        restoreAccountPosition: null,
      };
    case 'keep-account':
      if (state.phase !== 'evasive-choice') return state;
      return {
        ...state,
        phase: 'desktop',
        message: '',
        positions: { ...state.positions, [state.pendingAccountId]: state.restoreAccountPosition ?? state.positions[state.pendingAccountId] },
        pendingAccountId: null,
        restoreAccountPosition: null,
      };
    case 'create-account': {
      if (state.phase !== 'evasive-choice') return state;
      if (state.accountCycleComplete) {
        const remaining = state.remaining.filter((id) => id !== state.pendingAccountId);
        if (!remaining.some(isAccountId)) {
          return { ...state, phase: 'account-deleted', remaining, message: DELETED_ACCOUNT_MESSAGE, pendingAccountId: null, restoreAccountPosition: null };
        }
        return {
          ...state,
          phase: 'desktop',
          remaining,
          message: 'Account deleted. The remaining accounts are still here.',
          positions: { ...state.positions, [state.pendingAccountId]: state.restoreAccountPosition ?? state.positions[state.pendingAccountId] },
          pendingAccountId: null,
          restoreAccountPosition: null,
        };
      }
      const accountNumber = state.newAccounts.length + 2;
      const id = `account-${accountNumber}`;
      const newAccount = { id, label: `New Account ${accountNumber}` };
      const originalPosition = state.restoreAccountPosition ?? state.positions[ACCOUNT_ID];
      if (accountNumber === 4) {
        const reset = createDesktopState(action.bounds.width, action.bounds.height);
        const accounts = [
          { id: ACCOUNT_ID, label: 'My Account' },
          ...state.newAccounts,
          newAccount,
        ];
        const positions = { ...reset.positions };
        accounts.forEach((account, index) => {
          positions[account.id] = clampPosition(
            { x: 22 + (index % 2) * 94, y: 22 + Math.floor(index / 2) * 104 },
            action.bounds,
            { width: 76, height: 84 },
          );
        });
        return {
          ...reset,
          phase: 'desktop',
          accountCycleComplete: true,
          newAccounts: accounts.slice(1),
          remaining: [...reset.remaining, ...accounts.slice(1).map((account) => account.id)],
          positions,
          message: '',
        };
      }
      const position = clampPosition(
        { x: originalPosition.x + (accountNumber - 1) * 84, y: originalPosition.y },
        action.bounds,
        { width: 76, height: 84 },
      );
      return {
        ...state,
        phase: 'desktop',
        newAccounts: [...state.newAccounts, newAccount],
        remaining: [...state.remaining, id],
        positions: { ...state.positions, [ACCOUNT_ID]: originalPosition, [id]: position },
        pendingAccountId: null,
        restoreAccountPosition: null,
        message: 'Hooray! You have created another account!',
      };
    }
    case 'close-delete-window': {
      if (state.phase !== 'premature-spam' || !state.windows.includes(action.id)) return state;
      const windows = state.windows.filter((id) => id !== action.id);
      if (windows.length > 0) return { ...state, windows };
      return {
        ...state,
        windows,
        phase: 'desktop',
        message: '',
        positions: { ...state.positions, [state.pendingAccountId]: state.restoreAccountPosition ?? state.positions[state.pendingAccountId] },
        pendingAccountId: null,
        restoreAccountPosition: null,
      };
    }
    case 'clear-message':
      return { ...state, message: '' };
    default:
      return state;
  }
}

export function pointIsInBin(point, binRect) {
  return point.x >= binRect.left && point.x <= binRect.right && point.y >= binRect.top && point.y <= binRect.bottom;
}
