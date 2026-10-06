import { CLASSES, COMBO_MULT, COMBO_NAMES, ENEMIES, FACE_INFO, JOKER_KINDS, MAX_MINIONS, MINIONS, SPELLS, hasValue } from './data';
import { randInt } from './rng';
import type {
  AnimKind,
  CombatState,
  Combo,
  DieState,
  EnemyState,
  FaceKind,
  Fighter,
  FxEvent,
  Intent,
  Minion,
  MinionKind,
  RunState,
  Target,
} from './types';

let fxCounter = 0;
let uidCounter = 0;


const clone = (s: CombatState): CombatState => ({ ...structuredClone(s), events: [], anims: [] });

function fx(s: CombatState, target: Target, text: string, tone: FxEvent['tone']) {
  s.events.push({ id: ++fxCounter, target, text, tone });
}

function anim(s: CombatState, target: Target, kind: AnimKind) {
  s.anims.push({ id: ++fxCounter, target, kind });
}

function log(s: CombatState, line: string) {
  s.log = [...s.log.slice(-30), line];
}

const alive = (s: CombatState) => s.enemies.filter((e) => e.hp > 0);

function getTarget(s: CombatState): EnemyState | undefined {
  const t = s.enemies.find((e) => e.uid === s.target && e.hp > 0);
  if (t) return t;
  const first = alive(s)[0];
  if (first) s.target = first.uid;
  return first;
}

export function currentIntent(e: EnemyState): Intent {
  return ENEMIES[e.defId].moves[e.moveIdx];
}

function nextMove(e: EnemyState) {
  const def = ENEMIES[e.defId];
  if (def.pattern === 'cycle') {
    e.moveIdx = (e.moveIdx + 1) % def.moves.length;
  } else if (def.moves.length > 1) {
    let idx = e.moveIdx;
    while (idx === e.moveIdx) idx = randInt(0, def.moves.length - 1);
    e.moveIdx = idx;
  }
}

/** After ticking, poison is halved (rounded down), so a stack of 1 wears off. */
export const decayPoison = (p: number) => Math.floor(p / 2);

/** Damage an attacker would deal with a given base, before the defender's block. */
export function attackDamage(attacker: Fighter, defender: Fighter, base: number): number {
  let d = base + attacker.strength;
  if (attacker.weak > 0) d = Math.floor(d * 0.75);
  if (defender.vulnerable > 0) d = Math.floor(d * 1.5);
  return Math.max(0, d);
}

/** Apply raw damage to a fighter (block absorbs first). Returns HP lost. */
function hurt(s: CombatState, who: { hp: number; block: number }, target: Target, amount: number, ignoreBlock = false): number {
  let dmg = amount;
  if (!ignoreBlock && who.block > 0) {
    const absorbed = Math.min(who.block, dmg);
    who.block -= absorbed;
    dmg -= absorbed;
    if (absorbed > 0 && dmg === 0) fx(s, target, `🛡️ -${absorbed}`, 'block');
  }
  const lost = Math.min(who.hp, dmg);
  who.hp -= lost;
  if (dmg > 0) fx(s, target, `-${dmg}`, 'dmg');
  return lost;
}

function heal(s: CombatState, who: Fighter, target: Target, amount: number) {
  const gained = Math.min(amount, who.maxHp - who.hp);
  who.hp += gained;
  if (gained > 0) fx(s, target, `+${gained} PV`, 'heal');
}

/** Vampire passive (Soif): +1 Strength per 10 % of max HP missing — 90–99 % → +1, …, 0–9 % → +10. */
export function thirstBonus(s: CombatState): number {
  if (s.classId !== 'vampire' || s.player.hp >= s.player.maxHp) return 0;
  return Math.min(10, Math.max(0, 10 - Math.floor((s.player.hp * 10) / s.player.maxHp)));
}

/** The player's Strength including temporary bonuses (Soif). */
export function playerStrength(s: CombatState): number {
  return s.player.strength + thirstBonus(s);
}

function playerHits(s: CombatState, enemy: EnemyState, base: number): number {
  const dmg = attackDamage({ ...s.player, strength: playerStrength(s) }, enemy, base);
  return hurt(s, enemy, enemy.uid, dmg);
}

/** Heal from a drain effect; Festin doubles it. */
function drainHeal(s: CombatState, amount: number) {
  const h = s.feast ? amount * 2 : amount;
  if (h <= 0) return;
  anim(s, 'player', 'heal');
  heal(s, s.player, 'player', h);
}

function applyPoison(s: CombatState, enemy: EnemyState, amount: number) {
  const bonus = CLASSES[s.classId].poisonBonus + (s.relics.includes('toxicVial') ? 2 : 0);
  const total = amount + bonus;
  enemy.poison += total;
  fx(s, enemy.uid, `🧪 +${total}`, 'debuff');
}

// ---------- Minions (Nécromancien) ----------

let minionCounter = 0;
export const minionKey = (uid: number): Target => `m${uid}`;

/** Raise a minion; with a full board, the weakest minion is reinforced instead. */
function summon(s: CombatState, kind: MinionKind, hp: number, dmg: number) {
  const info = MINIONS[kind];
  if (s.minions.length >= MAX_MINIONS) {
    const weakest = s.minions.reduce((a, b) => (b.hp < a.hp ? b : a));
    weakest.maxHp += hp;
    weakest.hp += hp;
    anim(s, minionKey(weakest.uid), 'heal');
    fx(s, minionKey(weakest.uid), `+${hp} PV`, 'heal');
    log(s, `${info.emoji} Plateau plein : ${MINIONS[weakest.kind].name} est renforcé (+${hp} PV).`);
    return;
  }
  const m: Minion = { uid: ++minionCounter, kind, hp, maxHp: hp, dmg, block: 0, guard: kind === 'knight', vorace: kind === 'ghoul' };
  s.minions.push(m);
  anim(s, minionKey(m.uid), 'summon');
  log(s, `${info.emoji} ${info.name} se relève (${hp} PV, ${dmg} dégâts).`);
}

/** A minion strikes the current target. The player's Strength does not apply. */
function minionStrike(s: CombatState, m: Minion) {
  const target = getTarget(s);
  if (!target || m.hp <= 0) return;
  let dmg = m.dmg + s.minionBonus;
  if (target.vulnerable > 0) dmg = Math.floor(dmg * 1.5);
  anim(s, minionKey(m.uid), 'strike');
  anim(s, target.uid, 'slash');
  hurt(s, target, target.uid, dmg);
  if (m.vorace && m.hp < m.maxHp) {
    const h = Math.min(2, m.maxHp - m.hp);
    m.hp += h;
    fx(s, minionKey(m.uid), `+${h} PV`, 'heal');
  }
  checkEnd(s);
}

/** End-of-turn attack of one minion (by uid), between the player's and the enemies' turns. */
export function minionAct(prev: CombatState, uid: number): CombatState {
  const m0 = prev.minions.find((m) => m.uid === uid);
  if (prev.phase !== 'enemy' || !m0) return prev;
  const s = clone(prev);
  minionStrike(s, s.minions.find((m) => m.uid === uid)!);
  if (s.phase === 'won' || s.phase === 'lost') return s;
  s.phase = 'enemy';
  return s;
}

function checkEnd(s: CombatState) {
  let harvested = 0;
  for (const e of s.enemies) {
    if (e.hp <= 0 && !e.dead) {
      e.dead = true;
      e.hp = 0;
      log(s, `${e.emoji} ${e.name} est vaincu !`);
      harvested++;
    }
  }
  // Necromancer passive (Moisson): fallen minions give mana back, fallen enemies rise as skeletons.
  for (const m of s.minions.filter((x) => x.hp <= 0)) {
    s.player.mana += 1;
    fx(s, 'player', '✨ +1', 'mana');
    if (s.player.hp > 0) heal(s, s.player, 'player', 3);
    log(s, `${MINIONS[m.kind].emoji} ${MINIONS[m.kind].name} tombe en poussière (+1 ✨, +3 PV).`);
  }
  s.minions = s.minions.filter((x) => x.hp > 0);
  if (s.classId === 'necro' && alive(s).length > 0) {
    for (let i = 0; i < harvested; i++) summon(s, 'skeleton', 3, 2);
  }
  if (s.player.hp <= 0 && s.reviveAvailable) {
    s.reviveAvailable = false;
    s.revived = true;
    s.player.hp = Math.ceil(s.player.maxHp * 0.3);
    s.player.poison = 0;
    anim(s, 'player', 'heal');
    anim(s, 'player', 'rage');
    fx(s, 'player', '☠️ Réassemblage !', 'heal');
    log(s, `☠️ Réassemblage ! Vos os se recollent : vous revenez avec ${s.player.hp} PV.`);
  }
  if (s.player.hp <= 0) {
    s.phase = 'lost';
    log(s, '☠️ Vous avez été vaincu…');
  } else if (alive(s).length === 0) {
    s.phase = 'won';
    log(s, '🏆 Victoire !');
  } else {
    getTarget(s);
  }
}

// ---------- Setup ----------

export function createCombat(run: RunState, enemyIds: string[]): CombatState {
  // Regular enemies get a little tougher deeper in the dungeon.
  const hpScale = 1 + Math.max(0, run.floor) * 0.02;
  const cls = CLASSES[run.classId];
  const enemies: EnemyState[] = enemyIds.map((id) => {
    const def = ENEMIES[id];
    const hp = Math.round(randInt(def.hp[0], def.hp[1]) * (id === 'dragon' ? 1 : hpScale));
    return {
      uid: ++uidCounter,
      defId: id,
      name: def.name,
      emoji: def.emoji,
      hp,
      maxHp: hp,
      block: 0,
      strength: 0,
      weak: 0,
      vulnerable: 0,
      poison: 0,
      bleed: 0,
      moveIdx: def.pattern === 'cycle' ? 0 : randInt(0, def.moves.length - 1),
      frozen: false,
      dead: false,
    };
  });
  const rerolls = cls.rerolls + (run.relics.includes('loadedDie') ? 1 : 0);
  const s: CombatState = {
    classId: run.classId,
    relics: run.relics,
    player: {
      hp: run.hp,
      maxHp: run.maxHp,
      block: 0,
      strength: cls.startStrength,
      weak: 0,
      vulnerable: 0,
      poison: 0,
      bleed: 0,
      mana: cls.startMana,
    },
    enemies,
    dice: run.dice.map((faces) => ({ faces, faceIdx: 0, locked: false, used: false, mult: 1 })),
    rerollsLeft: rerolls,
    rerollsPerTurn: rerolls,
    phase: 'rolling',
    turn: 0,
    target: enemies[0].uid,
    rollId: 0,
    combos: [],
    bonusText: [],
    suite: false,
    log: [`Combat contre ${enemies.map((e) => `${e.emoji} ${e.name}`).join(', ')} !`],
    events: [],
    anims: [],
    dodge: false,
    feast: false,
    vulnCarry: false,
    reviveAvailable: run.classId === 'skeleton' && !run.reviveUsed,
    revived: false,
    minions: [],
    minionBonus: 0,
  };
  return startPlayerTurn(s);
}

// ---------- Player turn ----------

function rollDie(d: DieState) {
  d.faceIdx = randInt(0, d.faces.length - 1);
}

export function startPlayerTurn(prev: CombatState): CombatState {
  const s = clone(prev);
  if (s.phase === 'won' || s.phase === 'lost') return s;
  s.turn += 1;
  s.player.block = 0;
  // Vulnerable on the player counts enemy turns; stacks applied during the
  // enemy turn that just ended only start counting down from the next one.
  if (s.vulnCarry && s.player.vulnerable > 0) s.player.vulnerable -= 1;
  s.vulnCarry = false;
  if (s.turn === 1 && s.relics.includes('ancestralShield')) {
    s.player.block += 8;
    fx(s, 'player', '🛡️ +8', 'block');
    anim(s, 'player', 'shield');
  }
  if (s.player.poison > 0) {
    anim(s, 'player', 'poison');
    log(s, `🧪 Le poison vous inflige ${s.player.poison} dégâts.`);
    hurt(s, s.player, 'player', s.player.poison, true);
    s.player.poison = decayPoison(s.player.poison);
    checkEnd(s);
    if (s.player.hp <= 0) return s;
  }
  const crystal = s.relics.includes('manaCrystal');
  const manaGain = (s.turn > 1 ? CLASSES[s.classId].manaPerTurn : 0) + (crystal && s.classId !== 'vampire' ? 1 : 0);
  if (manaGain > 0) s.player.mana += manaGain;
  if (crystal && s.classId === 'vampire' && s.turn > 1) heal(s, s.player, 'player', 2);
  s.dodge = false;
  s.feast = false;

  s.dice.forEach((d) => {
    d.locked = false;
    d.used = false;
    d.mult = 1;
    rollDie(d);
  });
  s.rollId += 1;
  s.rerollsLeft = s.rerollsPerTurn;
  s.combos = [];
  s.bonusText = [];
  s.suite = false;
  s.phase = 'rolling';
  return s;
}

export function toggleLock(prev: CombatState, i: number): CombatState {
  if (prev.phase !== 'rolling') return prev;
  const s = clone(prev);
  s.dice[i].locked = !s.dice[i].locked;
  return s;
}

export function reroll(prev: CombatState): CombatState {
  if (prev.phase !== 'rolling' || prev.rerollsLeft <= 0) return prev;
  if (prev.dice.every((d) => d.locked)) return prev;
  const s = clone(prev);
  s.dice.forEach((d) => {
    if (!d.locked) rollDie(d);
  });
  s.rollId += 1;
  s.rerollsLeft -= 1;
  return s;
}

/** Compute combos for the current dice (also used for the live preview). */
export function computeCombos(s: CombatState): { combos: Combo[]; suite: boolean; mults: number[]; asKinds: (FaceKind | undefined)[] } {
  const faces = s.dice.map((d) => d.faces[d.faceIdx]);
  const counts = new Map<FaceKind, number>();
  const totals = new Map<FaceKind, number>();
  for (const f of faces) {
    if (f.kind === 'blank' || JOKER_KINDS.includes(f.kind)) continue;
    counts.set(f.kind, (counts.get(f.kind) ?? 0) + 1);
    totals.set(f.kind, (totals.get(f.kind) ?? 0) + f.value);
  }
  // Jokers (🦴) join the biggest group (ties: highest total value); alone they act as 🛡️.
  const jokers = faces.filter((f) => JOKER_KINDS.includes(f.kind)).length;
  let jokerKind: FaceKind | undefined;
  if (jokers > 0) {
    jokerKind = 'defend';
    let best = -1;
    for (const [k, c] of counts) {
      const score = c * 1000 + (totals.get(k) ?? 0);
      if (score > best) {
        best = score;
        jokerKind = k;
      }
    }
    counts.set(jokerKind, (counts.get(jokerKind) ?? 0) + jokers);
  }
  const skullBonus = faces.some((f) => f.kind === 'skull') ? 0.5 : 0;
  const extra = s.relics.includes('hourglass') ? 0.25 : 0;
  const combos: Combo[] = [];
  for (const [kind, count] of counts) {
    const bonus = kind === jokerKind ? skullBonus : 0;
    if (count >= 2 || bonus > 0) {
      combos.push({
        kind,
        count,
        jokers: kind === jokerKind ? jokers : 0,
        mult: (COMBO_MULT[count] ?? 2.5) + extra + bonus,
        name: count >= 2 ? (COMBO_NAMES[count] ?? 'YAM !') : 'Crâne',
      });
    }
  }
  combos.sort((a, b) => b.count - a.count);
  const suite = s.dice.length >= 4 && jokers === 0 && counts.size === s.dice.length;
  const asKinds = faces.map((f) => (JOKER_KINDS.includes(f.kind) ? jokerKind : undefined));
  const mults = faces.map((f, i) => {
    const k = asKinds[i] ?? f.kind;
    return combos.find((c) => c.kind === k)?.mult ?? 1;
  });
  return { combos, suite, mults, asKinds };
}

/** "Brelan ⚔️ (+1🦴) ×1.5" */
export function comboLabel(c: Combo): string {
  return `${c.name} ${FACE_INFO[c.kind].icon}${c.jokers ? ` (+${c.jokers}🦴)` : ''} ×${c.mult}`;
}

export function confirmDice(prev: CombatState): CombatState {
  if (prev.phase !== 'rolling') return prev;
  const s = clone(prev);
  const { combos, suite, mults, asKinds } = computeCombos(s);
  s.combos = combos;
  s.suite = suite;
  s.dice.forEach((d, i) => {
    d.mult = mults[i];
    d.asKind = asKinds[i];
    d.locked = false;
  });
  s.bonusText = [];
  for (const c of combos) log(s, `🎲 ${comboLabel(c)}`);
  if (suite) {
    s.bonusText.push('Suite ! +2 à tous les dés');
    log(s, '🎲 Suite ! Toutes les faces sont différentes : +2 à chaque dé.');
  }
  const counts = combos.map((c) => c.count).sort((a, b) => b - a);
  if (counts[0] === 3 && counts[1] === 2) {
    s.player.block += 6;
    s.bonusText.push('Full ! +6 armure');
    fx(s, 'player', '🛡️ +6', 'block');
    anim(s, 'player', 'shield');
    log(s, '🎲 Full ! Vous gagnez 6 armure.');
  } else if (counts[0] === 2 && counts[1] === 2) {
    s.player.block += 3;
    s.bonusText.push('Double paire ! +3 armure');
    fx(s, 'player', '🛡️ +3', 'block');
    anim(s, 'player', 'shield');
    log(s, '🎲 Double paire ! Vous gagnez 3 armure.');
  }
  const raiseCombo = combos.find((c) => c.kind === 'raise' && c.count >= 4);
  if (raiseCombo) {
    summon(s, 'knight', 14, 5);
    s.bonusText.push(`${raiseCombo.name} d’Invocation ! Un 🤺 Chevalier mort se relève`);
  }
  s.phase = 'acting';
  return s;
}

export function dieValue(s: CombatState, d: DieState, mult = d.mult): number {
  const face = d.faces[d.faceIdx];
  if (!hasValue(face.kind)) return 0;
  const kind = d.asKind ?? face.kind;
  let base = face.value;
  if (s.relics.includes('whetstone') && (kind === 'attack' || kind === 'dagger')) base += 1;
  if (s.suite) base += 2;
  return Math.round(base * mult);
}

export function useDie(prev: CombatState, i: number): CombatState {
  if (prev.phase !== 'acting' || prev.dice[i].used) return prev;
  const s = clone(prev);
  const d = s.dice[i];
  d.used = true;
  const face = d.faces[d.faceIdx];
  const v = dieValue(s, d);
  // Jokers act as the face type they joined (alone, as a 🛡️).
  const kind = JOKER_KINDS.includes(face.kind) ? (d.asKind ?? 'defend') : face.kind;
  const info = FACE_INFO[kind];
  const target = getTarget(s);
  switch (kind) {
    case 'attack':
      if (target) {
        anim(s, target.uid, 'slash');
        playerHits(s, target, v);
        log(s, `${info.icon} Vous attaquez ${target.name}.`);
      }
      break;
    case 'dagger':
      if (target) {
        anim(s, target.uid, 'dagger');
        playerHits(s, target, v);
        if (target.hp > 0) playerHits(s, target, v);
        log(s, `${info.icon} Double coup de dague sur ${target.name}.`);
      }
      break;
    case 'fire':
      for (const e of alive(s)) {
        anim(s, e.uid, 'fire');
        playerHits(s, e, v);
      }
      log(s, `${info.icon} Les flammes frappent tous les ennemis.`);
      break;
    case 'frost':
      if (target) {
        anim(s, target.uid, 'frost');
        playerHits(s, target, v);
        target.weak += 1;
        fx(s, target.uid, '❄️ Faible', 'debuff');
        log(s, `${info.icon} Givre sur ${target.name}.`);
      }
      break;
    case 'defend':
      anim(s, 'player', 'shield');
      s.player.block += v;
      fx(s, 'player', `🛡️ +${v}`, 'block');
      log(s, `${info.icon} Vous gagnez ${v} armure.`);
      break;
    case 'magic':
      anim(s, 'player', 'magic');
      s.player.mana += v;
      fx(s, 'player', `✨ +${v}`, 'mana');
      log(s, `${info.icon} Vous gagnez ${v} mana.`);
      break;
    case 'heal':
      if (s.classId === 'vampire') {
        // Mort-vivant: healing burns the vampire.
        anim(s, 'player', 'curse');
        hurt(s, s.player, 'player', v, true);
        log(s, `${info.icon} La lumière vous brûle : -${v} PV.`);
      } else {
        anim(s, 'player', 'heal');
        heal(s, s.player, 'player', v);
        log(s, `${info.icon} Vous vous soignez de ${v}.`);
      }
      break;
    case 'poison':
      if (target) {
        anim(s, target.uid, 'poison');
        applyPoison(s, target, v);
        log(s, `${info.icon} Vous empoisonnez ${target.name}.`);
      }
      break;
    case 'rage':
      anim(s, 'player', 'rage');
      s.player.strength += v;
      fx(s, 'player', `💪 +${v}`, 'buff');
      log(s, `${info.icon} Vous gagnez ${v} Force.`);
      break;
    case 'vamp':
      if (target) {
        anim(s, target.uid, 'vamp');
        const lost = playerHits(s, target, v);
        drainHeal(s, Math.ceil(lost / 2));
        log(s, `${info.icon} Vous drainez ${target.name}.`);
      }
      break;
    case 'venom':
      if (target) {
        anim(s, target.uid, 'venom');
        applyPoison(s, target, v);
        target.poison *= 2;
        fx(s, target.uid, `☣️ ×2 → ${target.poison}`, 'debuff');
        log(s, `${info.icon} Le venin double le poison de ${target.name} (${target.poison}).`);
      }
      break;
    case 'staff':
      if (target) {
        anim(s, target.uid, 'slash');
        anim(s, 'player', 'magic');
        playerHits(s, target, v);
        s.player.mana += 1;
        fx(s, 'player', '✨ +1', 'mana');
        log(s, `${info.icon} Coup de sceptre sur ${target.name}, +1 mana.`);
      }
      break;
    case 'raise':
      summon(s, 'skeleton', v, v);
      break;
    case 'exhume':
      if (s.minions.length === 0) {
        summon(s, 'skeleton', Math.ceil(v / 2), Math.ceil(v / 2));
      } else {
        for (const m of s.minions) {
          const h = Math.min(v, m.maxHp - m.hp);
          m.hp += h;
          anim(s, minionKey(m.uid), 'heal');
          if (h > 0) fx(s, minionKey(m.uid), `+${h} PV`, 'heal');
        }
        log(s, `${info.icon} Vos serviteurs se reconstituent (+${v} PV).`);
      }
      break;
    case 'haunt':
      if (target) {
        anim(s, target.uid, 'curse');
        playerHits(s, target, v + s.minions.length);
        log(s, `${info.icon} Vos morts hantent ${target.name}.`);
      }
      break;
    case 'crown':
      s.minionBonus += v;
      for (const m of s.minions) anim(s, minionKey(m.uid), 'rage');
      anim(s, 'player', 'rage');
      fx(s, 'player', `👑 Serviteurs +${v}`, 'buff');
      log(s, `${info.icon} Vos serviteurs gagnent +${v} dégâts pour le combat.`);
      break;
    case 'ghoul':
      summon(s, 'ghoul', v, Math.ceil(v / 2));
      break;
    case 'swarm': {
      let hit = 0;
      for (const e of alive(s)) {
        anim(s, e.uid, 'vamp');
        playerHits(s, e, v);
        hit++;
      }
      drainHeal(s, hit);
      log(s, `${info.icon} Une nuée de chauves-souris s’abat sur les ennemis.`);
      break;
    }
    case 'bite':
      if (target) {
        anim(s, target.uid, 'vamp');
        playerHits(s, target, v);
        if (target.hp > 0) {
          const b = Math.ceil(v / 2);
          target.bleed += b;
          fx(s, target.uid, `🩸 +${b}`, 'debuff');
        }
        log(s, `${info.icon} Vous mordez ${target.name}.`);
      }
      break;
    case 'embrace':
      if (target) {
        anim(s, target.uid, 'vamp');
        drainHeal(s, playerHits(s, target, v));
        log(s, `${info.icon} Étreinte mortelle sur ${target.name}.`);
      }
      break;
    case 'chalice':
      s.player.maxHp += v;
      heal(s, s.player, 'player', v);
      anim(s, 'player', 'heal');
      fx(s, 'player', `🍷 +${v} PV max`, 'buff');
      // One use only: the face is permanently replaced by a blank.
      d.faces = d.faces.map((x, j) => (j === d.faceIdx ? { kind: 'blank', value: 0 } : x));
      log(s, `${info.icon} Vous buvez au Calice : +${v} PV max pour la partie. La face devient ❌ Raté.`);
      break;
    case 'cleave':
      for (const e of alive(s)) {
        anim(s, e.uid, 'slash');
        playerHits(s, e, v);
      }
      log(s, `${info.icon} Votre fendoir balaie tous les ennemis.`);
      break;
    case 'rebirth':
      anim(s, 'player', 'heal');
      anim(s, 'player', 'magic');
      heal(s, s.player, 'player', s.player.maxHp - s.player.hp);
      // One use only: the face is permanently replaced by a blank.
      d.faces = d.faces.map((x, j) => (j === d.faceIdx ? { kind: 'blank', value: 0 } : x));
      log(s, `${info.icon} Renaissance ! Vous récupérez tous vos PV. La face devient ❌ Raté.`);
      break;
    case 'blank':
      anim(s, 'player', 'blank');
      log(s, `${info.icon} Raté…`);
      break;
  }
  checkEnd(s);
  return s;
}

/** Number of 🦴 / 💀 faces showing on the dice this turn. */
export function bonesRolled(s: CombatState): number {
  return s.dice.filter((d) => JOKER_KINDS.includes(d.faces[d.faceIdx].kind)).length;
}

export function canCast(s: CombatState, spellId: string) {
  if (s.phase !== 'acting' || s.player.mana < SPELLS[spellId].cost) return false;
  if ((spellId === 'corpseExplosion' || spellId === 'command') && s.minions.length === 0) return false;
  if (spellId === 'pact' && s.player.hp <= 6) return false;
  const hpCost = SPELLS[spellId].hpCost ?? 0;
  if (hpCost && s.player.hp <= hpCost) return false;
  if (spellId === 'mistForm' && s.dodge) return false;
  if (spellId === 'feast' && s.feast) return false;
  return true;
}

export function castSpell(prev: CombatState, spellId: string): CombatState {
  if (!canCast(prev, spellId)) return prev;
  const s = clone(prev);
  const spell = SPELLS[spellId];
  s.player.mana -= spell.cost;
  if (spell.hpCost) {
    anim(s, 'player', 'vamp');
    hurt(s, s.player, 'player', spell.hpCost, true);
  }
  const target = getTarget(s);
  log(s, `${spell.icon} Vous lancez ${spell.name} !`);
  switch (spellId) {
    case 'heroicStrike':
      if (target) {
        anim(s, target.uid, 'slash');
        playerHits(s, target, 12);
      }
      break;
    case 'warCry':
      anim(s, 'player', 'rage');
      s.player.strength += 2;
      fx(s, 'player', '💪 +2', 'buff');
      break;
    case 'whirlwind':
      for (const e of alive(s)) {
        anim(s, e.uid, 'whirlwind');
        playerHits(s, e, 7);
      }
      break;
    case 'fireball':
      if (target) {
        anim(s, target.uid, 'fire');
        playerHits(s, target, 15);
      }
      break;
    case 'frostNova':
      for (const e of alive(s)) {
        anim(s, e.uid, 'frost');
        playerHits(s, e, 5);
        e.weak += 1;
      }
      break;
    case 'arcaneBarrier':
      anim(s, 'player', 'shield');
      s.player.block += 10;
      fx(s, 'player', '🛡️ +10', 'block');
      break;
    case 'icePrison':
      if (target) {
        anim(s, target.uid, 'ice');
        target.frozen = true;
        fx(s, target.uid, '🧊 Gelé', 'debuff');
      }
      break;
    case 'poisonBlade':
      if (target) {
        anim(s, target.uid, 'dagger');
        anim(s, target.uid, 'poison');
        playerHits(s, target, 4);
        if (target.hp > 0) applyPoison(s, target, 4);
      }
      break;
    case 'smokeBomb':
      s.player.block += 8;
      fx(s, 'player', '🛡️ +8', 'block');
      anim(s, 'player', 'shield');
      for (const e of alive(s)) {
        anim(s, e.uid, 'smoke');
        e.weak += 1;
      }
      break;
    case 'corpseExplosion': {
      const victim = s.minions.reduce((a, b) => (b.hp < a.hp ? b : a));
      const dmg = victim.hp;
      victim.hp = 0;
      anim(s, minionKey(victim.uid), 'fire');
      for (const e of alive(s)) {
        anim(s, e.uid, 'fire');
        hurt(s, e, e.uid, e.vulnerable > 0 ? Math.floor(dmg * 1.5) : dmg);
      }
      break;
    }
    case 'command':
      for (const m of [...s.minions]) minionStrike(s, m);
      break;
    case 'pact':
      hurt(s, s.player, 'player', 6, true);
      summon(s, 'knight', 14, 5);
      break;
    case 'bloodletting':
      if (target) {
        anim(s, target.uid, 'vamp');
        playerHits(s, target, 12);
      }
      break;
    case 'mistForm':
      s.dodge = true;
      anim(s, 'player', 'smoke');
      fx(s, 'player', '🌫️ Brume', 'buff');
      break;
    case 'feast':
      s.feast = true;
      anim(s, 'player', 'rage');
      fx(s, 'player', '🍷 Festin', 'buff');
      break;
    case 'boneRain':
      if (target) {
        anim(s, target.uid, 'fire');
        playerHits(s, target, 4 + 4 * bonesRolled(s));
      }
      break;
    case 'boneArmor': {
      const armor = 5 + 3 * bonesRolled(s);
      anim(s, 'player', 'shield');
      s.player.block += armor;
      fx(s, 'player', `🛡️ +${armor}`, 'block');
      break;
    }
    case 'shatter':
      for (const e of alive(s)) {
        anim(s, e.uid, 'slash');
        playerHits(s, e, 6);
        e.vulnerable += 1;
      }
      break;
    case 'execute':
      if (target) {
        anim(s, target.uid, 'execute');
        playerHits(s, target, target.poison * 2);
      }
      break;
  }
  checkEnd(s);
  return s;
}

export function setTarget(prev: CombatState, uid: number): CombatState {
  const e = prev.enemies.find((x) => x.uid === uid);
  if (!e || e.hp <= 0) return prev;
  return { ...prev, target: uid, events: [], anims: [] };
}

export function endPlayerTurn(prev: CombatState): CombatState {
  if (prev.phase !== 'acting' && prev.phase !== 'rolling') return prev;
  const s = clone(prev);
  if (s.player.weak > 0) s.player.weak -= 1;
  s.phase = 'enemy';
  return s;
}

// ---------- Enemy turn ----------

export function beginEnemyTurn(prev: CombatState): CombatState {
  if (prev.phase !== 'enemy') return prev;
  const s = clone(prev);
  s.vulnCarry = s.player.vulnerable > 0;
  for (const e of alive(s)) {
    e.block = 0;
    if (e.poison > 0) {
      anim(s, e.uid, 'poison');
      log(s, `🧪 ${e.name} subit ${e.poison} dégâts de poison.`);
      hurt(s, e, e.uid, e.poison, true);
      e.poison = decayPoison(e.poison);
    }
  }
  checkEnd(s);
  if (s.phase === 'won') return s;
  s.phase = 'enemy';
  return s;
}

export function enemyAct(prev: CombatState, idx: number): CombatState {
  const e0 = prev.enemies[idx];
  if (prev.phase !== 'enemy' || !e0 || e0.hp <= 0) return prev;
  const s = clone(prev);
  const e = s.enemies[idx];
  const p = s.player;
  if (e.frozen) {
    e.frozen = false;
    log(s, `🧊 ${e.name} est gelé et passe son tour.`);
    fx(s, e.uid, '🧊 Gelé', 'debuff');
    anim(s, e.uid, 'ice');
  } else {
    const m = currentIntent(e);
    if (m.label) log(s, `${e.emoji} ${e.name} : ${m.label}`);
    if (m.heal) {
      anim(s, e.uid, 'heal');
      heal(s, e, e.uid, m.heal);
    }
    if (m.block) {
      anim(s, e.uid, 'shield');
      e.block += m.block;
      fx(s, e.uid, `🛡️ +${m.block}`, 'block');
    }
    if (m.str) {
      anim(s, e.uid, 'rage');
      e.strength += m.str;
      fx(s, e.uid, `💪 +${m.str}`, 'buff');
    }
    if (m.dmg !== undefined && e.bleed > 0) {
      // Bleeding enemies lose HP when they attack, then the bleed is halved.
      anim(s, e.uid, 'vamp');
      log(s, `🩸 ${e.name} saigne en attaquant : -${e.bleed} PV.`);
      hurt(s, e, e.uid, e.bleed, true);
      e.bleed = Math.floor(e.bleed / 2);
    }
    const guardUp = !m.sweep && s.minions.some((x) => x.guard && x.hp > 0);
    const dodged = m.dmg !== undefined && e.hp > 0 && s.dodge && !guardUp;
    if (dodged) {
      s.dodge = false;
      fx(s, 'player', '🌫️ Esquive', 'buff');
      log(s, `🌫️ Vous vous dissipez en brume : l’attaque de ${e.name} vous traverse.`);
    }
    if (m.dmg !== undefined && e.hp > 0) {
      const times = m.times ?? 1;
      const hitAnim = times > 1 ? 'dagger' : 'slash';
      anim(s, e.uid, 'lunge');
      if (m.sweep) {
        // Sweeping attack: the player and every minion are hit.
        if (!dodged) {
          anim(s, 'player', hitAnim);
          for (let t = 0; t < times && p.hp > 0; t++) hurt(s, p, 'player', attackDamage(e, p, m.dmg));
        }
        for (const mi of s.minions) {
          anim(s, minionKey(mi.uid), hitAnim);
          for (let t = 0; t < times && mi.hp > 0; t++) hurt(s, mi, minionKey(mi.uid), minionDamage(e, m.dmg));
        }
        log(s, `${e.emoji} ${e.name} frappe tout le monde (${attackDamage(e, p, m.dmg)}).`);
      } else {
        for (let t = 0; t < times && p.hp > 0; t++) {
          // A minion with Guard takes single-target hits for the player.
          const guard = s.minions.find((x) => x.guard && x.hp > 0);
          if (guard) {
            anim(s, minionKey(guard.uid), hitAnim);
            hurt(s, guard, minionKey(guard.uid), minionDamage(e, m.dmg));
          } else if (!dodged) {
            if (t === 0) anim(s, 'player', hitAnim);
            hurt(s, p, 'player', attackDamage(e, p, m.dmg));
          }
        }
        log(s, `${e.emoji} ${e.name} attaque${times > 1 ? ` ${times} fois` : ''} (${attackDamage(e, p, m.dmg)}).`);
      }
    }
    if (m.weak || m.vuln) anim(s, 'player', 'curse');
    if (m.weak) {
      p.weak += m.weak;
      fx(s, 'player', `Faible +${m.weak}`, 'debuff');
    }
    if (m.vuln) {
      p.vulnerable += m.vuln;
      fx(s, 'player', `Vulnérable +${m.vuln}`, 'debuff');
    }
    if (m.poison) {
      anim(s, 'player', 'poison');
      p.poison += m.poison;
      fx(s, 'player', `🧪 +${m.poison}`, 'debuff');
    }
  }
  if (e.weak > 0) e.weak -= 1;
  if (e.vulnerable > 0) e.vulnerable -= 1;
  nextMove(e);
  checkEnd(s);
  if (s.phase === 'won' || s.phase === 'lost') return s;
  s.phase = 'enemy';
  return s;
}

/** Damage an enemy deals to a minion (minions have no armor or debuffs). */
function minionDamage(e: EnemyState, base: number): number {
  let d = base + e.strength;
  if (e.weak > 0) d = Math.floor(d * 0.75);
  return Math.max(0, d);
}

/** Text + icon describing an enemy intent, with damage computed against the player. */
export function describeIntent(s: CombatState, e: EnemyState): { icon: string; text: string; tip: string } {
  if (e.frozen) return { icon: '🧊', text: 'Gelé', tip: 'Passera son prochain tour.' };
  const m = currentIntent(e);
  const parts: string[] = [];
  const tips: string[] = [];
  let icon = '❔';
  if (m.dmg !== undefined) {
    const d = attackDamage(e, s.player, m.dmg);
    parts.push(m.times && m.times > 1 ? `${d}×${m.times}` : `${d}`);
    tips.push(`Attaque pour ${d}${m.times && m.times > 1 ? ` ×${m.times}` : ''}`);
    icon = '🗡️';
    const guard = s.minions.find((x) => x.guard);
    if (m.sweep) {
      icon = '🌊';
      tips.push('touche aussi tous vos serviteurs');
    } else if (guard) {
      parts.push(`➜${MINIONS[guard.kind].emoji}`);
      tips.push(`vise ${MINIONS[guard.kind].name} (Garde)`);
    }
  }
  if (m.block) {
    tips.push(`Se protège (${m.block})`);
    if (icon === '❔') icon = '🛡️';
  }
  if (m.str) {
    tips.push(`Gagne ${m.str} Force`);
    if (icon === '❔') icon = '💪';
  }
  if (m.heal) {
    tips.push(`Se soigne de ${m.heal}`);
    if (icon === '❔') icon = '💚';
  }
  if (m.weak || m.vuln || m.poison) {
    if (m.weak) tips.push(`Faiblesse ${m.weak}`);
    if (m.vuln) tips.push(`Vulnérable ${m.vuln}`);
    if (m.poison) tips.push(`Poison ${m.poison}`);
    if (icon === '❔') icon = '🌀';
    else parts.push('+🌀');
  }
  if (icon === '❔' && m.label) {
    icon = '💤';
    tips.push('Se prépare…');
  }
  return { icon, text: parts.join(' '), tip: (m.label ? `${m.label} — ` : '') + tips.join(', ') };
}
