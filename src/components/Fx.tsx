import type { AnimEvent, AnimKind } from '../game/types';

type Motion = 'burst' | 'rise' | 'pop' | 'spin' | 'fall' | 'slash';

interface Particle {
  e?: string; // emoji; omitted for slash streaks
  x?: number;
  y?: number;
  d?: number; // delay (ms)
  r?: number; // rotation (deg)
  s?: number; // scale
}

interface FxDef {
  motion: Motion;
  flash?: string;
  particles: Particle[];
}

/** Visual recipe of every effect animation: a motion + a few particles. */
const FX: Record<Exclude<AnimKind, 'lunge' | 'strike'>, FxDef> = {
  slash: { motion: 'slash', flash: '#ff5c5c', particles: [{ r: -35 }] },
  dagger: { motion: 'slash', flash: '#ff8a5c', particles: [{ r: -35 }, { r: 35, d: 140 }] },
  fire: {
    motion: 'rise',
    flash: '#ff8a30',
    particles: [{ e: '🔥', x: -26, s: 0.8 }, { e: '🔥', s: 1.3, d: 60 }, { e: '🔥', x: 26, s: 0.9, d: 120 }],
  },
  frost: {
    motion: 'burst',
    flash: '#6cc6ff',
    particles: [{ e: '❄️', x: -40, y: -30 }, { e: '❄️', x: 40, y: -30, d: 40 }, { e: '❄️', x: -30, y: 34, d: 80 }, { e: '❄️', x: 34, y: 30, d: 120 }],
  },
  shield: { motion: 'pop', flash: '#5b8de0', particles: [{ e: '🛡️', s: 1.6 }] },
  magic: {
    motion: 'burst',
    flash: '#b07cff',
    particles: [{ e: '✨', x: -38, y: -24 }, { e: '✨', x: 36, y: -30, d: 50 }, { e: '✨', x: 0, y: -44, d: 100 }, { e: '✨', x: -8, y: 30, d: 150 }],
  },
  heal: { motion: 'rise', flash: '#4fc27a', particles: [{ e: '💚', x: -24 }, { e: '➕', d: 90, s: 1.2 }, { e: '💚', x: 24, d: 170 }] },
  poison: { motion: 'rise', flash: '#8bc34a', particles: [{ e: '🫧', x: -22, s: 0.8 }, { e: '☠️', d: 80 }, { e: '🫧', x: 24, d: 160, s: 0.9 }] },
  rage: { motion: 'pop', flash: '#ff3d6e', particles: [{ e: '💢', s: 1.7 }] },
  vamp: { motion: 'fall', flash: '#c2185b', particles: [{ e: '🩸', x: -18 }, { e: '🩸', x: 16, d: 110 }, { e: '🩸', d: 220, s: 1.3 }] },
  blank: { motion: 'rise', particles: [{ e: '💨', s: 1.4 }] },
  venom: {
    motion: 'pop',
    flash: '#c6ff00',
    particles: [{ e: '☣️', s: 1.8 }, { e: '🧪', s: 1.2, d: 200 }],
  },
  whirlwind: { motion: 'spin', flash: '#cfd8dc', particles: [{ e: '🌪️', s: 1.8 }] },
  ice: { motion: 'fall', flash: '#9be7ff', particles: [{ e: '🧊', s: 2 }] },
  smoke: { motion: 'burst', flash: '#90a4ae', particles: [{ e: '💨', x: -36, y: 0, s: 1.4 }, { e: '💨', x: 36, y: -10, d: 60, s: 1.4 }, { e: '💨', x: 0, y: -30, d: 120, s: 1.2 }] },
  execute: { motion: 'pop', flash: '#ffd54f', particles: [{ e: '🎯', s: 1.6 }, { e: '💥', s: 2, d: 280 }] },
  curse: { motion: 'spin', flash: '#9c6bff', particles: [{ e: '🌀', s: 1.6 }] },
  summon: { motion: 'rise', flash: '#b0bec5', particles: [{ e: '🪦', s: 1.3 }, { e: '✨', x: -22, d: 120 }, { e: '✨', x: 22, d: 200 }] },
};

/** Renders the effect animations currently playing on one combatant. */
export function EffectLayer({ anims }: { anims: AnimEvent[] }) {
  return (
    <div className="fx-layer">
      {anims.map((a) => {
        if (a.kind === 'lunge' || a.kind === 'strike') return null;
        const def = FX[a.kind];
        return (
          <div key={a.id} className="fx">
            {def.flash && <div className="fx-flash" style={{ '--c': def.flash } as React.CSSProperties} />}
            {def.particles.map((p, i) => (
              <span
                key={i}
                className={`fx-p fx-${def.motion}`}
                style={
                  {
                    '--x': `${p.x ?? 0}px`,
                    '--y': `${p.y ?? 0}px`,
                    '--r': `${p.r ?? 0}deg`,
                    '--s': p.s ?? 1,
                    '--c': def.flash ?? '#fff',
                    animationDelay: `${p.d ?? 0}ms`,
                  } as React.CSSProperties
                }
              >
                {p.e}
              </span>
            ))}
          </div>
        );
      })}
    </div>
  );
}
