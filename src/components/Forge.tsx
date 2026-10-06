import { useEffect, useState } from 'react';
import { FACE_INFO, hasValue } from '../game/data';
import { upgradedFace } from '../game/run';
import type { Face } from '../game/types';
import { FaceView, ORIENT, PLACEMENT } from './Die';

const HITS = 3;
const HIT_MS = 520;

/** Before/after preview of a forge upgrade, to confirm or pick another face. */
export function ForgePreview({
  faces,
  slot,
  onConfirm,
  onCancel,
}: {
  faces: Face[];
  slot: number;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const old = faces[slot];
  const up = upgradedFace(old);
  return (
    <div className="forge-preview">
      <div className="forge-compare">
        <div className="forge-col">
          <span className="small-label">Avant</span>
          <FaceView face={old} size="lg" />
          <span>{FACE_INFO[old.kind].desc(old.value)}</span>
        </div>
        <span className="forge-arrow">➜</span>
        <div className="forge-col">
          <span className="small-label">Après</span>
          <FaceView face={up} size="lg" selected />
          <span>{FACE_INFO[up.kind].desc(up.value)}</span>
        </div>
      </div>
      <div className="small-label">Le dé après la forge :</div>
      <div className="inv-faces">
        {faces.map((f, i) => (
          <FaceView key={i} face={i === slot ? up : f} selected={i === slot} />
        ))}
      </div>
      <div className="dice-actions">
        <button className="btn" onClick={onCancel}>
          ↩ Choisir une autre face
        </button>
        <button className="btn primary" onClick={onConfirm}>
          ⚒️ Forger
        </button>
      </div>
    </div>
  );
}

/** The die appears in 3D on an anvil, a hammer strikes it three times and the face shines with its new value. */
export function ForgeAnimation({ faces, slot, onDone }: { faces: Face[]; slot: number; onDone: () => void }) {
  const [hits, setHits] = useState(0);
  const up = upgradedFace(faces[slot]);
  const done = hits >= HITS;

  useEffect(() => {
    const timers = Array.from({ length: HITS }, (_, i) => setTimeout(() => setHits(i + 1), 650 + (i + 1) * HIT_MS));
    return () => timers.forEach(clearTimeout);
  }, []);

  const o = ORIENT[slot % 6];
  const shown = faces.map((f, i) => (i === slot && done ? up : f));
  return (
    <div className="forge-stage">
      <div className="forge-scene">
        <div className={`forge-die ${hits === 0 ? 'enter' : 'bump'} ${done ? 'forged' : ''}`} key={hits} style={{ '--die-size': '120px' } as React.CSSProperties}>
          <div className="cube forge-cube" style={{ transform: `rotateX(-20deg) rotateY(-28deg) rotateX(${o.x}deg) rotateY(${o.y}deg)` }}>
            {shown.slice(0, 6).map((f, i) => (
              <div
                key={i}
                className={`cube-face ${i === slot && done ? 'shine' : ''}`}
                style={{ '--face-color': FACE_INFO[f.kind].color, transform: `${PLACEMENT[i]} translateZ(60px)` } as React.CSSProperties}
              >
                <span className="die-icon">{FACE_INFO[f.kind].icon}</span>
                {hasValue(f.kind) && <span className="die-value">{f.value}</span>}
              </div>
            ))}
          </div>
        </div>
        {!done && <div className="hammer">🔨</div>}
        {hits > 0 && (
          <div className="sparks" key={`s${hits}`}>
            {Array.from({ length: done ? 10 : 6 }, (_, i) => (
              <span key={i} style={{ '--a': `${(360 / (done ? 10 : 6)) * i}deg` } as React.CSSProperties}>
                {done ? '✨' : '•'}
              </span>
            ))}
          </div>
        )}
        <div className="anvil" />
      </div>
      <div className="forge-result">
        {done ? (
          <>
            <p>
              Face améliorée : <FaceView face={faces[slot]} /> ➜ <FaceView face={up} selected />
            </p>
            <button className="btn primary" onClick={onDone}>
              Continuer
            </button>
          </>
        ) : (
          <p className="small-label">Le forgeron s’active…</p>
        )}
      </div>
    </div>
  );
}
