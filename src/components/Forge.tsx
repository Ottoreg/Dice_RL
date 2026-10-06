import { useEffect, useState } from 'react';
import { FACE_INFO, hasValue } from '../game/data';
import { canUpgrade, upgradedFace } from '../game/run';
import type { Face } from '../game/types';
import { FaceView, ORIENT, PLACEMENT } from './Die';

const HITS = 3;
const HIT_MS = 520;

/** The die's faces after the forge: one face, or every face for a super forge. */
function forged(faces: Face[], slot: number, all: boolean): Face[] {
  return faces.map((f, i) => ((all || i === slot) && canUpgrade(f) ? upgradedFace(f) : f));
}

/** Before/after preview of a forge upgrade, to confirm or pick another face (or die, for a super forge). */
export function ForgePreview({
  faces,
  slot,
  all = false,
  onConfirm,
  onCancel,
}: {
  faces: Face[];
  slot: number;
  all?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const after = forged(faces, slot, all);
  if (all) {
    return (
      <div className="forge-preview">
        <div className="forge-rows">
          <span className="small-label">Avant</span>
          <div className="inv-faces">
            {faces.map((f, i) => (
              <FaceView key={i} face={f} />
            ))}
          </div>
          <span className="forge-arrow">⬇</span>
          <span className="small-label">Après</span>
          <div className="inv-faces">
            {after.map((f, i) => (
              <FaceView key={i} face={f} selected={f !== faces[i]} />
            ))}
          </div>
        </div>
        <div className="dice-actions">
          <button className="btn" onClick={onCancel}>
            ↩ Choisir un autre dé
          </button>
          <button className="btn primary" onClick={onConfirm}>
            ⚒️ Forger tout le dé
          </button>
        </div>
      </div>
    );
  }
  const old = faces[slot];
  const up = after[slot];
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
        {after.map((f, i) => (
          <FaceView key={i} face={f} selected={i === slot} />
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

/**
 * The die appears in 3D on an anvil, a hammer strikes it three times and the new face shines.
 * For a super forge every face is upgraded and the die then spins to show them all.
 */
export function ForgeAnimation({ faces, slot, all = false, onDone }: { faces: Face[]; slot: number; all?: boolean; onDone: () => void }) {
  const [hits, setHits] = useState(0);
  const after = forged(faces, slot, all);
  const done = hits >= HITS;

  useEffect(() => {
    const timers = Array.from({ length: HITS }, (_, i) => setTimeout(() => setHits(i + 1), 650 + (i + 1) * HIT_MS));
    return () => timers.forEach(clearTimeout);
  }, []);

  const o = ORIENT[slot % 6];
  const shown = done ? after : faces;
  const sparkCount = done ? (all ? 16 : 10) : 6;
  return (
    <div className={`forge-stage ${all ? 'super' : ''}`}>
      <div className="forge-scene">
        <div className={`forge-die ${hits === 0 ? 'enter' : 'bump'} ${done ? 'forged' : ''}`} key={hits} style={{ '--die-size': '120px' } as React.CSSProperties}>
          <div
            className={`cube forge-cube ${done && all ? 'showcase' : ''}`}
            style={{ transform: `rotateX(-20deg) rotateY(-28deg) rotateX(${o.x}deg) rotateY(${o.y}deg)` }}
          >
            {shown.slice(0, 6).map((f, i) => (
              <div
                key={i}
                className={`cube-face ${done && f !== faces[i] ? 'shine' : ''}`}
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
            {Array.from({ length: sparkCount }, (_, i) => (
              <span key={i} style={{ '--a': `${(360 / sparkCount) * i}deg` } as React.CSSProperties}>
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
            {all ? (
              <div className="forge-rows">
                <span>Tout le dé est amélioré :</span>
                <div className="inv-faces">
                  {after.map((f, i) => (
                    <FaceView key={i} face={f} selected={f !== faces[i]} />
                  ))}
                </div>
              </div>
            ) : (
              <p>
                Face améliorée : <FaceView face={faces[slot]} /> ➜ <FaceView face={after[slot]} selected />
              </p>
            )}
            <button className="btn primary" onClick={onDone}>
              Continuer
            </button>
          </>
        ) : (
          <p className="small-label">{all ? 'La super forge rugit…' : 'Le forgeron s’active…'}</p>
        )}
      </div>
    </div>
  );
}
