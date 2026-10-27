import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import {
  BIN_ID,
  confirmAccountDeletion,
  createDesktopState,
  DELETE_WINDOW_COUNT,
  desktopReducer,
  getDraggedPosition,
  getBinSize,
  getItemSize,
  moveBy,
  pointIsInBin,
  WORLD_ITEMS,
} from './desktop.js';
import { playRetroSound } from './sounds.js';

function getClock() {
  return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Dubai' }).format(new Date());
}

export default function App() {
  const viewport = typeof window === 'undefined' ? { width: 1280, height: 800 } : { width: window.innerWidth, height: window.innerHeight };
  const [state, dispatch] = useReducer(desktopReducer, null, () => createDesktopState(viewport.width, viewport.height));
  const [startOpen, setStartOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [clock, setClock] = useState(getClock);
  const [binSelected, setBinSelected] = useState(false);
  const desktopRef = useRef(null);
  const binRef = useRef(null);
  const dragRef = useRef(null);
  const suppressClickRef = useRef(false);

  useEffect(() => {
    const timer = window.setInterval(() => setClock(getClock()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const extraItems = state.newAccounts.map((account) => ({
    ...account,
    kind: 'account',
    image: '/assets/xp-account-icon.png',
    width: 76,
    height: 84,
  }));
  const itemById = useMemo(() => new Map([...WORLD_ITEMS, ...extraItems].map((item) => [item.id, item])), [state.newAccounts]);
  const showingDesktop = ['desktop', 'confirming', 'evasive-choice', 'premature-spam'].includes(state.phase);
  const bounds = () => {
    const rect = desktopRef.current?.getBoundingClientRect();
    return { width: rect?.width ?? viewport.width, height: rect?.height ?? viewport.height };
  };

  const startDrag = (event, id, size) => {
    if (event.button !== 0 || state.phase !== 'desktop') return;
    const rect = desktopRef.current.getBoundingClientRect();
    const point = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    dragRef.current = { id, pointerId: event.pointerId, start: point, origin: state.positions[id], size, moved: false };
    const captureTarget = event.target instanceof Element && event.target.setPointerCapture
      ? event.target
      : event.currentTarget;
    captureTarget.setPointerCapture(event.pointerId);
    if (id === BIN_ID) setBinSelected(true);
  };

  const moveDrag = (event) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const rect = desktopRef.current.getBoundingClientRect();
    const point = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    const position = getDraggedPosition(drag.origin, drag.start, point, bounds(), drag.size);
    if (!position) return;
    drag.moved = true;
    setDragging(true);
    dispatch({ type: 'move', id: drag.id, position, bounds: bounds(), size: drag.size });
  };

  const finishDrag = (event) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    setDragging(false);
    if (!drag.moved) return;
    suppressClickRef.current = true;
    window.setTimeout(() => { suppressClickRef.current = false; }, 0);
    if (drag.id === BIN_ID) return;
    const binRect = binRef.current?.getBoundingClientRect();
    if (binRect && pointIsInBin({ x: event.clientX, y: event.clientY }, binRect)) {
      playRetroSound('trash');
      const allRemainingItemsAreAccounts = state.remaining.every((id) => id === 'account' || id.startsWith('account-'));
      const accountDropBlocked = drag.id.startsWith('account') && !allRemainingItemsAreAccounts;
      const shouldPrompt = drag.id === 'account' && allRemainingItemsAreAccounts;
      dispatch({ type: 'drop', id: drag.id, returnPosition: drag.origin });
      if (accountDropBlocked) playRetroSound('blocked');
      if (drag.id === 'start') setStartOpen(false);
      if (shouldPrompt) {
        const confirmed = confirmAccountDeletion((message) => {
          const answer = window.confirm(message);
          playRetroSound('click');
          return answer;
        });
        dispatch({ type: confirmed ? 'show-evasive-choice' : 'cancel-account-confirmation' });
      } else if (drag.id.startsWith('account-') && allRemainingItemsAreAccounts) {
        dispatch({ type: 'show-evasive-choice' });
      }
    }
  };

  const handleKeyMove = (event, id) => {
    const directions = { ArrowLeft: [-18, 0], ArrowRight: [18, 0], ArrowUp: [0, -18], ArrowDown: [0, 18] };
    if (!directions[event.key] || state.phase !== 'desktop') return;
    event.preventDefault();
    const item = itemById.get(id);
    const [dx, dy] = directions[event.key];
    const size = item ? getItemSize(item, bounds().width) : getBinSize(bounds().width);
    const position = moveBy(state.positions[id], { x: dx, y: dy }, bounds(), size);
    dispatch({ type: 'move', id, position, bounds: bounds(), size });
  };

  const openItem = (id) => {
    if (suppressClickRef.current) return;
    if (id === 'start') setStartOpen((open) => !open);
  };

  if (state.phase === 'account-deleted') {
    return <main className="deleted-screen" aria-label="Account deleted" role="status">{state.message}</main>;
  }

  return (
    <main
      className={`desktop${state.phase === 'confirming' || state.phase === 'evasive-choice' ? ' is-confirming' : ''}${dragging ? ' is-dragging' : ''}`}
      ref={desktopRef}
      aria-label="Windows XP desktop"
      data-phase={state.phase}
      onClickCapture={(event) => {
        if (suppressClickRef.current) { suppressClickRef.current = false; return; }
        if (event.target.closest('button, [role="group"]')) {
          const target = event.target;
          const sound = target.closest('.start-button') ? 'start'
            : target.closest('.keep-account') ? 'keep'
              : target.closest('.delete-evasive') ? 'delete'
                : target.closest('.delete-window') ? 'blocked'
                  : 'click';
          playRetroSound(sound);
        }
      }}
      onPointerMove={moveDrag}
      onPointerUp={finishDrag}
      onPointerCancel={finishDrag}
      onPointerDown={(event) => { if (event.target === desktopRef.current) setStartOpen(false); }}
    >
      {showingDesktop && state.remaining.map((id) => {
        const item = itemById.get(id);
        return (
          <WorldItem
            key={id}
            item={item}
            position={state.positions[id]}
            clock={clock}
            startOpen={startOpen}
            onPointerDown={(event) => startDrag(event, id, getItemSize(item, bounds().width))}
            onClick={() => openItem(id)}
            onKeyDown={(event) => handleKeyMove(event, id)}
            size={getItemSize(item, bounds().width)}
          />
        );
      })}

      {state.phase === 'desktop' && startOpen && state.remaining.includes('start') && (
        <section className="start-menu" aria-label="Start menu" style={{ left: Math.min(Math.max(4, state.positions.start.x), Math.max(4, viewport.width - 334)), top: Math.max(8, state.positions.start.y - 194) }}>
          <div className="start-banner"><span className="user-avatar">A</span><span>Alex Morgan</span></div>
          <button onClick={() => setStartOpen(false)}><span className="start-glyph account-glyph">A</span><span><strong>My Account</strong><small>Profile settings</small></span></button>
          <button onClick={() => setStartOpen(false)}><span className="start-glyph bin-glyph">BIN</span><span><strong>Recycle Bin</strong><small>{state.remaining.length} desktop items</small></span></button>
          <footer><span>Windows XP</span><span>•</span></footer>
        </section>
      )}

      {showingDesktop && (
        <button
          ref={binRef}
          type="button"
          data-bin="true"
          className={`recycle-bin${binSelected ? ' is-selected' : ''}`}
          style={{ left: state.positions[BIN_ID].x, top: state.positions[BIN_ID].y }}
          aria-label={`Recycle Bin. ${state.remaining.length} desktop items remain. Drag items here to remove them.`}
          onPointerDown={(event) => startDrag(event, BIN_ID, getBinSize(bounds().width))}
          onPointerUp={finishDrag}
          onClick={() => { if (!suppressClickRef.current) setBinSelected((selected) => !selected); }}
          onKeyDown={(event) => handleKeyMove(event, BIN_ID)}
          draggable="false"
        >
          <img src="/assets/recycle-bin-icon.png" alt="" draggable="false" />
          <span>Recycle Bin</span>
          <small>{state.remaining.length ? `${state.remaining.length} items` : 'Empty'}</small>
        </button>
      )}

      {state.phase === 'evasive-choice' && (
        <EvasiveAccountPrompt
          onKeep={() => dispatch({ type: 'keep-account' })}
          onDelete={() => dispatch({ type: 'create-account', bounds: bounds() })}
        />
      )}
      {state.message && <div className="desktop-toast" role="status">{state.message}</div>}

      {state.phase === 'premature-spam' && state.windows.map((number) => (
        <DeleteWindow key={number} number={number} total={DELETE_WINDOW_COUNT} blocked onClose={() => dispatch({ type: 'close-delete-window', id: number })} />
      ))}

    </main>
  );
}

function WorldItem({ item, position, clock, startOpen, onPointerDown, onClick, onKeyDown, size }) {
  return (
    <div
      className={`world-item world-${item.kind} world-item-${item.id}`}
      data-world-id={item.id}
      style={{ left: position.x, top: position.y, width: size.width, height: size.height }}
      role="group"
      aria-label={`${item.label}. Drag to move; move to Recycle Bin to remove.`}
      onPointerDown={onPointerDown}
      onKeyDown={onKeyDown}
      tabIndex={0}
      draggable="false"
    >
      {item.kind === 'image' && <img className="scene-image" src={item.image} alt={item.label} draggable="false" />}
      {item.kind === 'account' && <><img className="account-image" src={item.image} alt="" draggable="false" /><span className="desktop-label">{item.label}</span></>}
      {item.kind === 'start' && (
        <button className={`start-button${startOpen ? ' is-open' : ''}`} aria-expanded={startOpen} onClick={onClick}>
          <span className="start-orb" aria-hidden="true"><i /><i /><i /><i /></span><span>start</span>
        </button>
      )}
      {item.kind === 'clock' && <time className="desktop-clock" role="timer" aria-label={`Current time: ${clock}`}>{clock}</time>}
      {item.kind === 'rail' && <div className="taskbar-rail" aria-hidden="true" />}
    </div>
  );
}

export function DeleteWindow({ number, total, blocked = false, onClose }) {
  const label = `Close delete account window ${number} of ${total}`;
  const row = Math.floor((number - 1) / 5);
  const column = (number - 1) % 5;
  return (
    <section className="delete-window" role="dialog" aria-label={`Delete account confirmation ${number} of ${total}`} style={{ '--window-row': row, '--window-column': column }}>
      <header><span>{blocked ? 'Windows XP - Delete Error' : 'Windows XP - Delete Account'}</span><button onClick={onClose} aria-label={label}>x</button></header>
      <div><span className="warning-icon">!</span><p>{blocked ? <>You cannot delete the account yet.<br />Trash every other desktop item first.</> : <>Account deletion in progress.<br />Close this window to continue.</>}</p></div>
      <footer><button onClick={onClose}>Close</button></footer>
    </section>
  );
}

export function EvasiveAccountPrompt({ onKeep, onDelete }) {
  const actionAreaRef = useRef(null);
  const [position, setPosition] = useState(() => ({
    left: Math.min(300, Math.max(8, (typeof window === 'undefined' ? 1280 : window.innerWidth) - 300)),
    top: 18,
  }));
  const dodges = useRef(0);
  const positions = [
    { x: 0.08, y: 0.62 },
    { x: 0.70, y: 0.32 },
    { x: 0.32, y: 0.06 },
    { x: 0.76, y: 0.68 },
    { x: 0.52, y: 0.56 },
  ];
  const dodge = () => {
    if (dodges.current >= positions.length) return;
    const area = actionAreaRef.current?.getBoundingClientRect();
    const maxLeft = Math.max(0, (area?.width ?? 420) - 120);
    const maxTop = Math.max(0, (area?.height ?? 143) - 34);
    const spot = positions[dodges.current];
    setPosition({ left: Math.round(maxLeft * spot.x), top: Math.round(maxTop * spot.y) });
    dodges.current += 1;
  };

  return (
    <section className="evasive-dialog" role="dialog" aria-modal="true" aria-labelledby="evasive-title">
      <header className="window-titlebar"><span id="evasive-title">Windows XP Account Manager</span></header>
      <div className="evasive-content">
        <strong>Do you want to delete this account?</strong>
        <p>Choose carefully. The account will remain if you keep it.</p>
        <div className="evasive-actions" ref={actionAreaRef}>
          <button className="keep-account" onClick={onKeep}>Keep Account</button>
          <button className="delete-evasive" style={position} onPointerEnter={dodge} onClick={onDelete}>Delete Account</button>
        </div>
      </div>
    </section>
  );
}
