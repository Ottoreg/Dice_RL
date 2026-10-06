import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { ROLL_MS } from './Die';

/** Resting spot of a die on the board, as fractions of the free area, plus its spin on the table. */
interface Slot {
  fx: number;
  fy: number;
  rz: number;
}

const PAD = 14;

const dieSizeFor = (width: number) => (width < 460 ? 56 : 70);

function randomSlot(): Slot {
  return { fx: Math.random(), fy: Math.random(), rz: Math.round(Math.random() * 50 - 25) };
}

/** Scatter the thrown dice so they don't overlap each other or the kept ones. */
function scatter(prev: Slot[], thrown: boolean[], w: number, h: number, size: number): Slot[] {
  const freeW = Math.max(1, w - 2 * PAD - size);
  const freeH = Math.max(1, h - 2 * PAD - size);
  const minDist = size * 1.2;
  const placed: Slot[] = [];
  const out: Slot[] = thrown.map((t, i) => (t || !prev[i] ? null : prev[i])) as Slot[];
  out.forEach((sl) => sl && placed.push(sl));
  thrown.forEach((t, i) => {
    if (!t && prev[i]) return;
    let best = randomSlot();
    let bestGap = -1;
    for (let tries = 0; tries < 80; tries++) {
      const c = randomSlot();
      const gap = Math.min(Infinity, ...placed.map((p) => Math.hypot((p.fx - c.fx) * freeW, (p.fy - c.fy) * freeH)));
      if (gap > bestGap) {
        best = c;
        bestGap = gap;
      }
      if (gap >= minDist) break;
    }
    out[i] = best;
    placed.push(best);
  });
  return out;
}

interface Props {
  count: number;
  rollId: number;
  locked: boolean[];
  renderDie: (i: number) => ReactNode;
}

/** A felt-covered dice tray: dice are thrown in from the player's side and land scattered on it. */
export function DiceBoard({ count, rollId, locked, renderDie }: Props) {
  const boardRef = useRef<HTMLDivElement>(null);
  const slotRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [size, setSize] = useState({ w: 520, h: 230 });
  const [layout, setLayout] = useState<{ slots: Slot[]; thrown: boolean[]; seq: number }>({ slots: [], thrown: [], seq: 0 });
  const dieSize = dieSizeFor(size.w);

  // Track the board size.
  useLayoutEffect(() => {
    const el = boardRef.current;
    if (!el) return;
    const update = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // New roll: scatter every die that was thrown.
  useLayoutEffect(() => {
    const el = boardRef.current;
    const w = el?.clientWidth ?? size.w;
    const h = el?.clientHeight ?? size.h;
    const thrown = Array.from({ length: count }, (_, i) => !locked[i]);
    setLayout((l) => ({ slots: scatter(l.slots, thrown, w, h, dieSizeFor(w)), thrown, seq: l.seq + 1 }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rollId, count]);

  const pos = (sl: Slot) => ({
    left: PAD + sl.fx * Math.max(0, size.w - 2 * PAD - dieSize),
    top: PAD + sl.fy * Math.max(0, size.h - 2 * PAD - dieSize),
  });

  // Animate the thrown dice from the player's side of the table to their spot.
  useLayoutEffect(() => {
    layout.slots.forEach((sl, i) => {
      const el = slotRefs.current[i];
      if (!el || !layout.thrown[i]) return;
      const { left, top } = pos(sl);
      const dx = size.w / 2 - dieSize / 2 + (Math.random() * 120 - 60) - left;
      const dy = size.h + dieSize - top;
      const spin = 240 + Math.random() * 300;
      el.animate(
        [
          { transform: `translate(${dx}px, ${dy}px) rotate(${sl.rz + spin}deg)` },
          { transform: `translate(${-dx * 0.04}px, ${-dy * 0.04}px) rotate(${sl.rz - 10}deg)`, offset: 0.72 },
          { transform: `translate(0, 0) rotate(${sl.rz}deg)` },
        ],
        { duration: ROLL_MS, easing: 'cubic-bezier(0.2, 0.7, 0.3, 1)' },
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout.seq]);

  return (
    <div className="dice-board" ref={boardRef} style={{ '--die-size': `${dieSize}px` } as React.CSSProperties}>
      {Array.from({ length: count }, (_, i) => {
        const sl = layout.slots[i];
        if (!sl) return null;
        const { left, top } = pos(sl);
        return (
          <div
            key={i}
            className="die-slot"
            ref={(el) => {
              slotRefs.current[i] = el;
            }}
            style={{ left, top, transform: `rotate(${sl.rz}deg)`, zIndex: layout.thrown[i] ? 2 : 1 }}
          >
            {renderDie(i)}
          </div>
        );
      })}
    </div>
  );
}
