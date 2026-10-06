import { useEffect, useRef, useState } from 'react';
import { CLASSES, FACE_INFO, RARE_KINDS, RELICS, SPELLS } from '../game/data';
import { FLOORS, canUpgrade, isReachable } from '../game/run';
import type { ClassId, Face, MapNode, NodeType, RunState } from '../game/types';
import { Codex, DiceModal } from './Codex';
import { FaceView, StartRareNote } from './Die';
import { ForgeAnimation, ForgePreview } from './Forge';

// ---------- Shared ----------

export function DiceInventory({
  dice,
  onPick,
  canPick,
  highlight,
}: {
  canPick?: (f: Face) => boolean;
  dice: Face[][];
  onPick?: (die: number, face: number) => void;
  highlight?: (f: Face) => boolean;
}) {
  return (
    <div className="inventory">
      {dice.map((faces, di) => (
        <div key={di} className="inv-die">
          <span className="inv-label">Dé {di + 1}</span>
          <div className="inv-faces">
            {faces.map((face, fi) => (
              <FaceView
                key={fi}
                face={face}
                onClick={onPick && (canPick?.(face) ?? true) ? () => onPick(di, fi) : undefined}
                selected={highlight?.(face)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function RelicBar({ relics }: { relics: string[] }) {
  if (relics.length === 0) return null;
  return (
    <div className="relic-bar">
      {relics.map((id) => (
        <span key={id} className="relic-icon" title={`${RELICS[id].name} — ${RELICS[id].desc}`}>
          {RELICS[id].icon}
        </span>
      ))}
    </div>
  );
}

export function TopBar({ run, hideHp }: { run: RunState; hideHp?: boolean }) {
  const cls = CLASSES[run.classId];
  const [open, setOpen] = useState<'dice' | 'codex' | null>(null);
  return (
    <div className="topbar">
      {open === 'dice' && <DiceModal dice={run.dice} onClose={() => setOpen(null)} />}
      {open === 'codex' && <Codex onClose={() => setOpen(null)} />}
      <span className="tb-class">
        {cls.emoji} {cls.name}
      </span>
      {!hideHp && (
        <span className="tb-hp">
          ❤️ {run.hp} / {run.maxHp}
        </span>
      )}
      <span className="tb-floor">
        🏰 Étage {Math.max(0, run.floor + 1)} / {FLOORS}
      </span>
      <RelicBar relics={run.relics} />
      <div className="tb-buttons">
        <button className="btn small" onClick={() => setOpen('dice')}>
          🎲 Mes dés
        </button>
        <button className="btn small" onClick={() => setOpen('codex')}>
          📖 Codex
        </button>
      </div>
    </div>
  );
}

// ---------- Title ----------

export function TitleScreen({ onStart }: { onStart: () => void }) {
  const [codex, setCodex] = useState(false);
  return (
    <div className="screen title-screen">
      <div className="title-dice">🎲⚔️🎲</div>
      <h1>Dice Dungeon</h1>
      <p className="subtitle">Un roguelike tour par tour où chaque action se joue aux dés.</p>
      <div className="title-buttons">
        <button className="btn primary big" onClick={onStart}>
          Nouvelle partie
        </button>
        <button className="btn big" onClick={() => setCodex(true)}>
          📖 Codex
        </button>
      </div>
      {codex && <Codex onClose={() => setCodex(false)} />}
      <div className="how-to">
        <h3>Comment jouer</h3>
        <ul>
          <li>Chaque tour, lancez vos dés. Leurs faces sont vos actions : attaque, défense, magie, soin…</li>
          <li>Comme au Yam, gardez 🔒 les dés qui vous plaisent et relancez les autres (2 relances).</li>
          <li>
            Les faces identiques forment des <b>combos</b> qui multiplient leur effet : Paire ×1.25, Brelan ×1.5, Carré ×1.75, Yam ×2.
            Full et Suite donnent des bonus.
          </li>
          <li>Les faces ✨ donnent du mana pour lancer les sorts de votre classe.</li>
          <li>Traversez le donjon, améliorez vos dés et terrassez le dragon !</li>
        </ul>
      </div>
    </div>
  );
}

// ---------- Class select ----------

export function ClassSelect({ onPick }: { onPick: (id: ClassId) => void }) {
  return (
    <div className="screen">
      <h2>Choisissez votre héros</h2>
      <div className="class-grid">
        {Object.values(CLASSES).map((c) => (
          <div key={c.id} className="class-card" onClick={() => onPick(c.id)}>
            <div className="class-emoji">{c.emoji}</div>
            <h3>{c.name}</h3>
            <p className="tagline">{c.tagline}</p>
            <div className="class-stats">
              <span>❤️ {c.maxHp} PV</span>
              <span>🎲 {c.diceCount} dés</span>
              <span>🔄 {c.rerolls} relances</span>
            </div>
            <p className="passive">{c.passive}</p>
            <div className="class-die">
              <span className="small-label">Faces de dé :</span>
              <div className="inv-faces">
                {c.die.map((face, i) => (
                  <FaceView key={i} face={face} />
                ))}
              </div>
              <StartRareNote classId={c.id} />
            </div>
            <div className="class-spells">
              {c.spells.map((id) => (
                <div key={id} className="mini-spell">
                  {SPELLS[id].icon} <b>{SPELLS[id].name}</b> ({SPELLS[id].cost}✨) — {SPELLS[id].desc}
                </div>
              ))}
            </div>
            <button className="btn primary">Choisir</button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------- Map ----------

const NODE_INFO: Record<NodeType, { icon: string; name: string }> = {
  combat: { icon: '⚔️', name: 'Combat' },
  elite: { icon: '👹', name: 'Élite' },
  rest: { icon: '🔥', name: 'Feu de camp' },
  treasure: { icon: '💰', name: 'Trésor' },
  boss: { icon: '🐉', name: 'Boss' },
};

export function MapScreen({ run, onPick }: { run: RunState; onPick: (n: MapNode) => void }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.querySelector('.map-node.reachable')?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, []);
  const colX = (lane: number) => 60 + lane * 110;
  const rowY = (floor: number) => (FLOORS - 1 - floor) * 72 + 40;
  const width = 280;
  const height = FLOORS * 72 + 10;

  const edges: [MapNode, MapNode][] = [];
  for (let f = 0; f < run.map.length - 1; f++) {
    for (const a of run.map[f]) for (const b of run.map[f + 1]) if (Math.abs(a.lane - b.lane) <= 1) edges.push([a, b]);
  }

  return (
    <div className="screen map-screen">
      <TopBar run={run} />
      <div className="map-layout">
        <div className="map-scroll" ref={scrollRef}>
          <svg width={width} height={height} className="map-svg">
            {edges.map(([a, b], i) => {
              const visited = a.floor <= run.floor && b.floor <= run.floor;
              return (
                <line
                  key={i}
                  x1={colX(a.lane)}
                  y1={rowY(a.floor)}
                  x2={colX(b.lane)}
                  y2={rowY(b.floor)}
                  className={`map-edge ${visited ? 'visited' : ''}`}
                />
              );
            })}
          </svg>
          {run.map.flat().map((n) => {
            const reachable = isReachable(run, n);
            const current = n.floor === run.floor && n.lane === run.lane;
            const past = n.floor <= run.floor;
            return (
              <button
                key={`${n.floor}-${n.lane}`}
                className={`map-node type-${n.type} ${reachable ? 'reachable' : ''} ${current ? 'current' : ''} ${past && !current ? 'past' : ''}`}
                style={{ left: colX(n.lane), top: rowY(n.floor) }}
                disabled={!reachable}
                onClick={() => onPick(n)}
                title={NODE_INFO[n.type].name}
              >
                {NODE_INFO[n.type].icon}
              </button>
            );
          })}
        </div>
        <div className="map-side">
          <h3>Choisissez votre chemin</h3>
          <div className="legend">
            {Object.entries(NODE_INFO).map(([k, v]) => (
              <div key={k}>
                {v.icon} {v.name}
              </div>
            ))}
          </div>
          <h3>Vos dés</h3>
          <DiceInventory dice={run.dice} />
        </div>
      </div>
    </div>
  );
}

// ---------- Rewards ----------

export function FaceReward({
  run,
  faces,
  relic,
  onDone,
}: {
  run: RunState;
  faces: Face[];
  relic: string | null;
  onDone: (choice: { face?: Face; die?: number; slot?: number; relic?: string }) => void;
}) {
  const [chosen, setChosen] = useState<Face | null>(null);
  const [relicTaken, setRelicTaken] = useState(false);
  const takeRelic = relic && relicTaken ? relic : undefined;
  return (
    <div className="screen">
      <TopBar run={run} />
      <h2>Récompense</h2>
      {relic && (
        <div className={`relic-reward ${relicTaken ? 'taken' : ''}`} onClick={() => setRelicTaken(true)}>
          <span className="relic-big">{RELICS[relic].icon}</span>
          <div>
            <b>{RELICS[relic].name}</b>
            <div>{RELICS[relic].desc}</div>
            {!relicTaken ? <small>Cliquer pour prendre la relique</small> : <small>✔ Relique obtenue</small>}
          </div>
        </div>
      )}
      {!chosen ? (
        <>
          <p>Choisissez une nouvelle face de dé :</p>
          <div className="reward-faces">
            {faces.map((face, i) => (
              <div key={i} className={`reward-card ${RARE_KINDS.includes(face.kind) ? 'rare' : ''}`} onClick={() => setChosen(face)}>
                {RARE_KINDS.includes(face.kind) && <span className="rare-badge">✦ Rare</span>}
                <FaceView face={face} size="lg" />
                <b>{FACE_INFO[face.kind].name}</b>
                <span>{FACE_INFO[face.kind].desc(face.value)}</span>
              </div>
            ))}
          </div>
          <button className="btn" onClick={() => onDone({ relic: takeRelic })}>
            Passer
          </button>
        </>
      ) : (
        <>
          <p>
            Cliquez sur la face à remplacer par <FaceView face={chosen} /> :
          </p>
          <DiceInventory dice={run.dice} onPick={(die, slot) => onDone({ face: chosen, die, slot, relic: takeRelic })} />
          <button className="btn" onClick={() => setChosen(null)}>
            ← Retour
          </button>
        </>
      )}
    </div>
  );
}

export function RestScreen({
  run,
  superForge,
  onHeal,
  onUpgrade,
}: {
  run: RunState;
  /** This rest site has a super forge: the forge upgrades a whole die. */
  superForge: boolean;
  onHeal: () => void;
  onUpgrade: (die: number, slot: number) => void;
}) {
  const [mode, setMode] = useState<'choose' | 'upgrade' | 'preview' | 'forging'>('choose');
  const [pick, setPick] = useState<{ die: number; slot: number } | null>(null);
  const healAmt = Math.round(run.maxHp * 0.3);
  return (
    <div className="screen">
      <TopBar run={run} />
      <h2>🔥 Feu de camp</h2>
      {superForge && mode === 'choose' && <div className="super-forge-banner">✦ Une super forge brûle ici ! Elle améliore un dé entier. ✦</div>}
      {mode === 'choose' ? (
        <div className="rest-options">
          <div className="reward-card" onClick={onHeal}>
            <span className="big-icon">😴</span>
            <b>Se reposer</b>
            <span>Soigne {healAmt} PV.</span>
          </div>
          {superForge ? (
            <div className="reward-card rare" onClick={() => setMode('upgrade')}>
              <span className="rare-badge">✦ Rare</span>
              <span className="big-icon">⚒️</span>
              <b>Super forge</b>
              <span>Améliore toutes les faces d’un dé (+2, ou +1 pour ✨, 💢 et ☣️). Les ❌ deviennent 🛡️3.</span>
            </div>
          ) : (
            <div className="reward-card" onClick={() => setMode('upgrade')}>
              <span className="big-icon">⚒️</span>
              <b>Forger</b>
              <span>Améliore une face de dé (+2, ou +1 pour ✨, 💢 et ☣️). Un ❌ devient 🛡️3.</span>
            </div>
          )}
        </div>
      ) : mode === 'upgrade' || !pick ? (
        <>
          <p>{superForge ? 'Choisissez le dé à améliorer (cliquez sur une de ses faces) :' : 'Choisissez la face à améliorer :'}</p>
          <DiceInventory
            dice={run.dice}
            onPick={(die, slot) => {
              setPick({ die, slot });
              setMode('preview');
            }}
            canPick={superForge ? undefined : canUpgrade}
          />
          <button className="btn" onClick={() => setMode('choose')}>
            ← Retour
          </button>
        </>
      ) : mode === 'preview' ? (
        <>
          <p>
            Dé {pick.die + 1} : confirmez la forge ou choisissez {superForge ? 'un autre dé' : 'une autre face'}.
          </p>
          <ForgePreview
            faces={run.dice[pick.die]}
            slot={pick.slot}
            all={superForge}
            onConfirm={() => setMode('forging')}
            onCancel={() => setMode('upgrade')}
          />
        </>
      ) : (
        <ForgeAnimation faces={run.dice[pick.die]} slot={pick.slot} all={superForge} onDone={() => onUpgrade(pick.die, pick.slot)} />
      )}
    </div>
  );
}

export function TreasureScreen({ run, choices, onPick }: { run: RunState; choices: string[]; onPick: (id: string | null) => void }) {
  return (
    <div className="screen">
      <TopBar run={run} />
      <h2>💰 Trésor</h2>
      <p>Choisissez une relique :</p>
      <div className="reward-faces">
        {choices.map((id) => (
          <div key={id} className="reward-card" onClick={() => onPick(id)}>
            <span className="big-icon">{RELICS[id].icon}</span>
            <b>{RELICS[id].name}</b>
            <span>{RELICS[id].desc}</span>
          </div>
        ))}
      </div>
      {choices.length === 0 && (
        <button className="btn" onClick={() => onPick(null)}>
          Le coffre est vide… Continuer
        </button>
      )}
    </div>
  );
}

export function EndScreen({ won, run, onRestart }: { won: boolean; run: RunState; onRestart: () => void }) {
  const cls = CLASSES[run.classId];
  return (
    <div className="screen end-screen">
      <div className="title-dice">{won ? '🏆' : '☠️'}</div>
      <h1>{won ? 'Victoire !' : 'Game Over'}</h1>
      <p>
        {won
          ? `Le ${cls.name} a terrassé le Dragon ancien !`
          : `Le ${cls.name} est tombé à l'étage ${Math.max(1, run.floor + 1)}.`}
      </p>
      <RelicBar relics={run.relics} />
      <DiceInventory dice={run.dice} />
      <button className="btn primary big" onClick={onRestart}>
        Rejouer
      </button>
    </div>
  );
}
