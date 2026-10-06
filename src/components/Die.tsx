import { useEffect, useState } from 'react';
import { FACE_INFO } from '../game/data';
import type { Face } from '../game/types';

interface FaceViewProps {
  face: Face;
  size?: 'sm' | 'md' | 'lg';
  value?: number;
  onClick?: () => void;
  selected?: boolean;
  title?: string;
}

/** A single static die face. */
export function FaceView({ face, size = 'sm', value, onClick, selected, title }: FaceViewProps) {
  const info = FACE_INFO[face.kind];
  const shown = value ?? face.value;
  return (
    <div
      className={`face face-${size} ${onClick ? 'clickable' : ''} ${selected ? 'selected' : ''}`}
      style={{ '--face-color': info.color } as React.CSSProperties}
      onClick={onClick}
      title={title ?? `${info.name} — ${info.desc(shown)}`}
    >
      <span className="face-icon">{info.icon}</span>
      {face.kind !== 'blank' && <span className="face-value">{shown}</span>}
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

/** A combat die: animates through random faces whenever rollId changes (if not locked). */
export function Die({ faces, faceIdx, rollId, rolling, locked, used, mult, value, combo, onClick, disabled }: DieProps) {
  const [display, setDisplay] = useState(faceIdx);
  const [anim, setAnim] = useState(false);

  useEffect(() => {
    if (!rolling) {
      setDisplay(faceIdx);
      return;
    }
    setAnim(true);
    const iv = setInterval(() => setDisplay(Math.floor(Math.random() * faces.length)), 60);
    const to = setTimeout(() => {
      clearInterval(iv);
      setDisplay(faceIdx);
      setAnim(false);
    }, 480);
    return () => {
      clearInterval(iv);
      clearTimeout(to);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rollId]);

  const face = faces[anim ? display : faceIdx];
  const info = FACE_INFO[face.kind];
  const shownValue = anim ? face.value : value;
  return (
    <button
      className={`die ${anim ? 'rolling' : ''} ${locked ? 'locked' : ''} ${used ? 'used' : ''} ${combo && !anim ? 'combo' : ''}`}
      style={{ '--face-color': info.color } as React.CSSProperties}
      onClick={onClick}
      disabled={disabled || used}
      title={`${info.name} — ${info.desc(shownValue)}\nFaces : ${faces.map((x) => FACE_INFO[x.kind].icon + (x.kind === 'blank' ? '' : x.value)).join('  ')}`}
    >
      <span className="die-icon">{info.icon}</span>
      {face.kind !== 'blank' && <span className="die-value">{shownValue}</span>}
      {mult > 1 && !anim && <span className="die-mult">×{mult}</span>}
      {locked && <span className="die-lock">🔒</span>}
    </button>
  );
}
