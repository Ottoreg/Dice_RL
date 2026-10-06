import { useEffect, useState } from 'react';
import { CLASSES, FACE_INFO, RARE_KINDS, hasValue } from '../game/data';
import type { ClassId, Face } from '../game/types';

interface FaceViewProps {
  face: Face;
  size?: 'sm' | 'md' | 'lg';
  value?: number;
  /** Text shown instead of the value (e.g. "X" in the codex). */
  label?: string;
  onClick?: () => void;
  selected?: boolean;
  title?: string;
}

/** A single static die face. */
export function FaceView({ face, size = 'sm', value, label, onClick, selected, title }: FaceViewProps) {
  const info = FACE_INFO[face.kind];
  const shown = value ?? face.value;
  return (
    <div
      className={`face face-${size} ${onClick ? 'clickable' : ''} ${selected ? 'selected' : ''} ${RARE_KINDS.includes(face.kind) ? 'rare' : ''}`}
      style={{ '--face-color': info.color } as React.CSSProperties}
      onClick={onClick}
      title={title ?? `${info.name} — ${info.desc(shown)}`}
    >
      <span className="face-icon">{info.icon}</span>
      {hasValue(face.kind) && <span className="face-value">{label ?? shown}</span>}
    </div>
  );
}

/** "Dé 1 : ☣️2 remplace 🧪2" for classes that start with a rare face. */
export function StartRareNote({ classId }: { classId: ClassId }) {
  const c = CLASSES[classId];
  if (!c.startRare) return null;
  const { die, slot, face } = c.startRare;
  return (
    <div className="rare-note">
      ✦ Dé {die + 1} : <FaceView face={face} /> remplace <FaceView face={c.die[slot]} />
    </div>
  );
}

interface DieProps {
  faces: Face[];
  faceIdx: number;
  rollId: number;
  rolling: boolean;
  locked: boolean;
  used: boolean;
  mult: number;
  value: number;
  combo: boolean;
  onClick: () => void;
  disabled: boolean;
}

export const ROLL_MS = 900;

/** Where each of the 6 faces sits on the cube, and the cube rotation that brings it to the front. */
export const PLACEMENT = ['rotateY(0deg)', 'rotateY(90deg)', 'rotateY(180deg)', 'rotateY(-90deg)', 'rotateX(90deg)', 'rotateX(-90deg)'];
export const ORIENT = [
  { x: 0, y: 0 },
  { x: 0, y: -90 },
  { x: 0, y: -180 },
  { x: 0, y: 90 },
  { x: -90, y: 0 },
  { x: 90, y: 0 },
];

const mod360 = (v: number) => ((v % 360) + 360) % 360;

/** Rotation that shows `faceIdx` after at least one extra full turn on each axis from `prev`. */
function spinTo(prev: { x: number; y: number }, faceIdx: number) {
  const o = ORIENT[faceIdx % 6];
  const turnsX = 1 + Math.floor(Math.random() * 2);
  const turnsY = 1 + Math.floor(Math.random() * 2);
  return {
    x: o.x + 360 * (Math.ceil((prev.x - o.x) / 360) + turnsX),
    y: o.y + 360 * (Math.ceil((prev.y - o.y) / 360) + turnsY),
  };
}

/** A combat die rendered as a 3D cube that tumbles whenever rollId changes (if not locked). */
export function Die({ faces, faceIdx, rollId, rolling, locked, used, mult, value, combo, onClick, disabled }: DieProps) {
  const [rot, setRot] = useState(ORIENT[faceIdx % 6]);
  const [anim, setAnim] = useState(false);

  useEffect(() => {
    if (!rolling) {
      const o = ORIENT[faceIdx % 6];
      setRot((r) => (mod360(r.x) === mod360(o.x) && mod360(r.y) === mod360(o.y) ? r : spinTo(r, faceIdx)));
      return;
    }
    setAnim(true);
    setRot((r) => spinTo(r, faceIdx));
    const to = setTimeout(() => setAnim(false), ROLL_MS);
    return () => clearTimeout(to);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rollId]);

  const face = faces[faceIdx];
  const info = FACE_INFO[face.kind];
  return (
    <button
      className={`die ${anim ? 'rolling' : ''} ${locked ? 'locked' : ''} ${used ? 'used' : ''} ${combo && !anim ? 'combo' : ''}`}
      style={{ '--face-color': info.color } as React.CSSProperties}
      onClick={onClick}
      disabled={disabled || used}
      title={`${info.name} — ${info.desc(value)}\nFaces : ${faces.map((x) => FACE_INFO[x.kind].icon + (hasValue(x.kind) ? x.value : '')).join('  ')}`}
    >
      <div className="cube-wrap">
      <div className="cube" style={{ transform: `rotateX(${rot.x}deg) rotateY(${rot.y}deg)` }}>
        {faces.slice(0, 6).map((f, i) => {
          const fi = FACE_INFO[f.kind];
          const shown = i === faceIdx && !anim ? value : f.value;
          return (
            <div
              key={i}
              className="cube-face"
              style={{ '--face-color': fi.color, transform: `${PLACEMENT[i]} translateZ(calc(var(--die-size) / 2))` } as React.CSSProperties}
            >
              <span className="die-icon">{fi.icon}</span>
              {hasValue(f.kind) && <span className="die-value">{shown}</span>}
            </div>
          );
        })}
      </div>
      </div>
      {mult > 1 && !anim && <span className="die-mult">×{mult}</span>}
      {locked && <span className="die-lock">🔒</span>}
    </button>
  );
}
