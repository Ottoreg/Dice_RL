import { useCallback, useEffect, useRef, useState } from 'react';
import {
  beginEnemyTurn,
  canCast,
  castSpell,
  computeCombos,
  confirmDice,
  describeIntent,
  dieValue,
  endPlayerTurn,
  enemyAct,
  reroll,
  setTarget,
  startPlayerTurn,
  toggleLock,
  useDie,
} from '../game/combat';
import { CLASSES, FACE_INFO, SPELLS } from '../game/data';
import type { CombatState, Fighter, FxEvent } from '../game/types';
import { Die } from './Die';

const DAMAGE_KINDS = ['attack', 'dagger', 'fire', 'frost', 'vamp'];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface Props {
  initial: CombatState;
  onEnd: (result: { won: boolean; hp: number }) => void;
}

export function CombatScreen({ initial, onEnd }: Props) {
  const [s, setS] = useState(initial);
  const [floaters, setFloaters] = useState<FxEvent[]>([]);
  const [shake, setShake] = useState<'player' | number | null>(null);
  const mounted = useRef(true);
  const busy = useRef(false);
  const cls = CLASSES[s.classId];

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // Floating combat text from engine events.
  useEffect(() => {
    if (s.events.length === 0) return;
    const evs = s.events;
    setFloaters((f) => [...f, ...evs]);
    const hit = evs.find((e) => e.tone === 'dmg');
    if (hit) {
      setShake(hit.target);
      setTimeout(() => mounted.current && setShake(null), 350);
    }
    const ids = new Set(evs.map((e) => e.id));
    const t = setTimeout(() => mounted.current && setFloaters((f) => f.filter((x) => !ids.has(x.id))), 1100);
    return () => clearTimeout(t);
  }, [s.events]);

  const runEnemyTurn = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    setS((x) => endPlayerTurn(x));
    await sleep(350);
    if (!mounted.current) return;
    setS((x) => beginEnemyTurn(x));
    await sleep(450);
    for (let i = 0; i < initial.enemies.length; i++) {
      if (!mounted.current) return;
      setS((x) => enemyAct(x, i));
      await sleep(550);
    }
    if (!mounted.current) return;
    setS((x) => (x.phase === 'enemy' ? startPlayerTurn(x) : x));
    busy.current = false;
  }, [initial.enemies.length]);

  const preview = s.phase === 'rolling' ? computeCombos(s) : null;
  const usableDice = s.dice.some((d) => !d.used);

  // Keyboard shortcuts.
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === 'r' || ev.key === 'R') setS((x) => reroll(x));
      if (ev.key === 'Enter') {
        ev.preventDefault();
        if (s.phase === 'rolling') setS((x) => confirmDice(x));
        else if (s.phase === 'acting') runEnemyTurn();
      }
      const n = Number(ev.key);
      if (n >= 1 && n <= s.dice.length) {
        const i = n - 1;
        setS((x) => (x.phase === 'rolling' ? toggleLock(x, i) : useDie(x, i)));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [s.phase, s.dice.length, runEnemyTurn]);

  const floatersFor = (target: 'player' | number) =>
    floaters
      .filter((f) => f.target === target)
      .map((f, i) => (
        <span key={f.id} className={`floater tone-${f.tone}`} style={{ '--offset': `${(i % 4) * 24}px` } as React.CSSProperties}>
          {f.text}
        </span>
      ));

  return (
    <div className="combat">
      <div className="enemies">
        {s.enemies.map((e) => {
          const intent = describeIntent(s, e);
          const dead = e.hp <= 0;
          return (
            <div
              key={e.uid}
              className={`enemy ${dead ? 'dead' : ''} ${s.target === e.uid && !dead ? 'targeted' : ''} ${shake === e.uid ? 'shake' : ''}`}
              onClick={() => setS((x) => setTarget(x, e.uid))}
            >
              {!dead && (
                <div className="intent" title={intent.tip}>
                  <span>{intent.icon}</span>
                  {intent.text && <b>{intent.text}</b>}
                </div>
              )}
              <div className="enemy-emoji">{e.emoji}</div>
              <div className="enemy-name">{e.name}</div>
              <HpBar f={e} />
              <Statuses f={e} frozen={e.frozen} />
              <div className="floaters">{floatersFor(e.uid)}</div>
              {s.target === e.uid && !dead && <div className="target-marker">🎯</div>}
            </div>
          );
        })}
      </div>

      <div className="combo-banner">
        {s.phase === 'rolling' && preview && (preview.combos.length > 0 || preview.suite) && (
          <span className="preview">
            Combos en vue :{' '}
            {preview.combos.map((c) => `${c.name} ${FACE_INFO[c.kind].icon} ×${c.mult}`).join(' · ')}
            {preview.suite && ' · Suite (+2)'}
          </span>
        )}
        {s.phase === 'acting' &&
          [...s.combos.map((c) => `${c.name} ${FACE_INFO[c.kind].icon} ×${c.mult}`), ...s.bonusText].map((t) => (
            <span key={t} className="combo-chip">
              {t}
            </span>
          ))}
        {s.phase === 'enemy' && <span className="enemy-turn">Tour des ennemis…</span>}
      </div>

      <div className="player-zone">
        <div className={`player-card ${shake === 'player' ? 'shake' : ''}`}>
          <div className="player-emoji">{cls.emoji}</div>
          <div>
            <div className="player-name">{cls.name}</div>
            <HpBar f={s.player} />
            <Statuses f={s.player} />
            <div className="mana">✨ Mana : <b>{s.player.mana}</b></div>
          </div>
          <div className="floaters">{floatersFor('player')}</div>
        </div>

        <div className="dice-zone">
          <div className="phase-hint">
            {s.phase === 'rolling' &&
              (s.rerollsLeft > 0
                ? 'Cliquez sur les dés pour les garder 🔒, puis relancez les autres — comme au Yam !'
                : 'Plus de relance : validez vos dés.')}
            {s.phase === 'acting' && 'Cliquez sur un dé pour l’utiliser (cible : 🎯). Lancez des sorts avec votre mana.'}
            {s.phase === 'enemy' && '…'}
          </div>
          <div className="dice-row">
            {s.dice.map((d, i) => (
              <Die
                key={i}
                faces={d.faces}
                faceIdx={d.faceIdx}
                rollId={s.rollId}
                rolling={!d.locked}
                locked={d.locked}
                used={d.used}
                mult={preview ? preview.mults[i] : d.mult}
                value={
                  (preview ? dieValue({ ...s, suite: preview.suite }, d, preview.mults[i]) : dieValue(s, d)) +
                  (DAMAGE_KINDS.includes(d.faces[d.faceIdx].kind) ? s.player.strength : 0)
                }
                combo={(preview ? preview.mults[i] : d.mult) > 1}
                disabled={s.phase !== 'rolling' && s.phase !== 'acting'}
                onClick={() => setS((x) => (x.phase === 'rolling' ? toggleLock(x, i) : useDie(x, i)))}
              />
            ))}
          </div>
          <div className="dice-actions">
            {s.phase === 'rolling' && (
              <>
                <button className="btn" onClick={() => setS((x) => reroll(x))} disabled={s.rerollsLeft <= 0 || s.dice.every((d) => d.locked)}>
                  🎲 Relancer ({s.rerollsLeft})
                </button>
                <button className="btn primary" onClick={() => setS((x) => confirmDice(x))}>
                  ✅ Valider les dés
                </button>
              </>
            )}
            {s.phase === 'acting' && (
              <button className={`btn ${usableDice ? '' : 'primary'}`} onClick={runEnemyTurn}>
                ⏭️ Fin du tour
              </button>
            )}
          </div>
        </div>

        <div className="spells">
          <div className="spells-title">Sorts</div>
          {cls.spells.map((id) => {
            const sp = SPELLS[id];
            return (
              <button key={id} className="spell" disabled={!canCast(s, id)} onClick={() => setS((x) => castSpell(x, id))} title={sp.desc}>
                <span className="spell-icon">{sp.icon}</span>
                <span className="spell-name">{sp.name}</span>
                <span className="spell-cost">{sp.cost}✨</span>
                <span className="spell-desc">{sp.desc}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="log">
        {s.log.slice(-6).map((l, i) => (
          <div key={`${s.log.length}-${i}`}>{l}</div>
        ))}
      </div>

      {(s.phase === 'won' || s.phase === 'lost') && (
        <div className="overlay">
          <div className="modal">
            <h2>{s.phase === 'won' ? '🏆 Victoire !' : '☠️ Défaite'}</h2>
            <button className="btn primary" onClick={() => onEnd({ won: s.phase === 'won', hp: s.player.hp })}>
              Continuer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function HpBar({ f }: { f: Fighter }) {
  const pct = Math.max(0, (f.hp / f.maxHp) * 100);
  return (
    <div className="hpbar">
      <div className="hpbar-fill" style={{ width: `${pct}%` }} />
      <span className="hpbar-text">
        {f.hp} / {f.maxHp}
      </span>
      {f.block > 0 && <span className="hpbar-block">🛡️ {f.block}</span>}
    </div>
  );
}

function Statuses({ f, frozen }: { f: Fighter; frozen?: boolean }) {
  const items: [string, string, string][] = [];
  if (f.strength) items.push(['💪', `${f.strength}`, `Force : +${f.strength} dégâts par attaque`]);
  if (f.weak) items.push(['🥀', `${f.weak}`, `Faiblesse : -25% dégâts (${f.weak} tours)`]);
  if (f.vulnerable) items.push(['💔', `${f.vulnerable}`, `Vulnérable : +50% dégâts subis (${f.vulnerable} tours)`]);
  if (f.poison) items.push(['🧪', `${f.poison}`, `Poison : perd ${f.poison} PV au début du tour, puis -1`]);
  if (frozen) items.push(['🧊', '', 'Gelé : passe son prochain tour']);
  return (
    <div className="statuses">
      {items.map(([icon, v, tip]) => (
        <span key={icon} className="status" title={tip}>
          {icon}
          {v}
        </span>
      ))}
    </div>
  );
}
