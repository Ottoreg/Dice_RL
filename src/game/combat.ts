import { CLASSES, COMBO_MULT, COMBO_NAMES, ENEMIES, FACE_INFO, SPELLS } from './data';
import { randInt } from './rng';
import type { CombatState, Combo, DieState, EnemyState, FaceKind, Fighter, FxEvent, Intent, RunState } from './types';

let fxCounter = 0;
let uidCounter = 0;

type Target = 'player' | number;

const clone = (s: CombatState): CombatState => ({ ...structuredClone(s), events: [] });

function fx(s: CombatState, target: Target, text: string, tone: FxEvent['tone']) {
  s.events.push({ id: ++fxCounter, target, text, tone });
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

/** Damage an attacker would deal with a given base, before the defender's block. */
export function attackDamage(attacker: Fighter, defender: Fighter, base: number): number {
  let d = base + attacker.strength;
  if (attacker.weak > 0) d = Math.floor(d * 0.75);
  if (defender.vulnerable > 0) d = Math.floor(d * 1.5);
  return Math.max(0, d);
}

/** Apply raw damage to a fighter (block absorbs first). Returns HP lost. */
function hurt(s: CombatState, who: Fighter, target: Target, amount: number, ignoreBlock = false): number {
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
  if (amount > 0) fx(s, target, `+${gained} PV`, 'heal');
}

function playerHits(s: CombatState, enemy: EnemyState, base: number): number {
  const dmg = attackDamage(s.player, enemy, base);
  return hurt(s, enemy, enemy.uid, dmg);
}

function applyPoison(s: CombatState, enemy: EnemyState, amount: number) {
  const bonus = CLASSES[s.classId].poisonBonus + (s.relics.includes('toxicVial') ? 2 : 0);
  const total = amount + bonus;
  enemy.poison += total;
  fx(s, enemy.uid, `🧪 +${total}`, 'debuff');
}

function checkEnd(s: CombatState) {
  for (const e of s.enemies) {
    if (e.hp <= 0 && !e.dead) {
      e.dead = true;
      e.hp = 0;
      log(s, `${e.emoji} ${e.name} est vaincu !`);
    }
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
  if (s.turn === 1 && s.relics.includes('ancestralShield')) {
    s.player.block += 8;
    fx(s, 'player', '🛡️ +8', 'block');
  }
  if (s.player.poison > 0) {
    log(s, `🧪 Le poison vous inflige ${s.player.poison} dégâts.`);
    hurt(s, s.player, 'player', s.player.poison, true);
    s.player.poison -= 1;
    checkEnd(s);
    if (s.player.hp <= 0) return s;
  }
  const manaGain = (s.turn > 1 ? CLASSES[s.classId].manaPerTurn : 0) + (s.relics.includes('manaCrystal') ? 1 : 0);
  if (manaGain > 0) s.player.mana += manaGain;

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
export function computeCombos(s: CombatState): { combos: Combo[]; suite: boolean; mults: number[] } {
  const counts = new Map<FaceKind, number>();
  for (const d of s.dice) {
    const k = d.faces[d.faceIdx].kind;
    if (k === 'blank') continue;
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  const extra = s.relics.includes('hourglass') ? 0.25 : 0;
  const combos: Combo[] = [];
  for (const [kind, count] of counts) {
    if (count >= 2) combos.push({ kind, count, mult: (COMBO_MULT[count] ?? 2.5) + extra, name: COMBO_NAMES[count] ?? 'YAM !' });
  }
  combos.sort((a, b) => b.count - a.count);
  const suite = s.dice.length >= 4 && counts.size === s.dice.length;
  const mults = s.dice.map((d) => {
    const k = d.faces[d.faceIdx].kind;
    return combos.find((c) => c.kind === k)?.mult ?? 1;
  });
  return { combos, suite, mults };
}

export function confirmDice(prev: CombatState): CombatState {
  if (prev.phase !== 'rolling') return prev;
  const s = clone(prev);
  const { combos, suite, mults } = computeCombos(s);
  s.combos = combos;
  s.suite = suite;
  s.dice.forEach((d, i) => {
    d.mult = mults[i];
    d.locked = false;
  });
  s.bonusText = [];
  for (const c of combos) log(s, `🎲 ${c.name} de ${FACE_INFO[c.kind].icon} — ×${c.mult}`);
  if (suite) {
    s.bonusText.push('Suite ! +2 à tous les dés');
    log(s, '🎲 Suite ! Toutes les faces sont différentes : +2 à chaque dé.');
  }
  const counts = combos.map((c) => c.count).sort((a, b) => b - a);
  if (counts[0] === 3 && counts[1] === 2) {
    s.player.block += 6;
    s.bonusText.push('Full ! +6 armure');
    fx(s, 'player', '🛡️ +6', 'block');
    log(s, '🎲 Full ! Vous gagnez 6 armure.');
  } else if (counts[0] === 2 && counts[1] === 2) {
    s.player.block += 3;
    s.bonusText.push('Double paire ! +3 armure');
    fx(s, 'player', '🛡️ +3', 'block');
    log(s, '🎲 Double paire ! Vous gagnez 3 armure.');
  }
  s.phase = 'acting';
  return s;
}

export function dieValue(s: CombatState, d: DieState, mult = d.mult): number {
  const face = d.faces[d.faceIdx];
  if (face.kind === 'blank') return 0;
  let base = face.value;
  if (s.relics.includes('whetstone') && (face.kind === 'attack' || face.kind === 'dagger')) base += 1;
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
  const info = FACE_INFO[face.kind];
  const target = getTarget(s);
  switch (face.kind) {
    case 'attack':
      if (target) {
        playerHits(s, target, v);
        log(s, `${info.icon} Vous attaquez ${target.name}.`);
      }
      break;
    case 'dagger':
      if (target) {
        playerHits(s, target, v);
        if (target.hp > 0) playerHits(s, target, v);
        log(s, `${info.icon} Double coup de dague sur ${target.name}.`);
      }
      break;
    case 'fire':
      for (const e of alive(s)) playerHits(s, e, v);
      log(s, `${info.icon} Les flammes frappent tous les ennemis.`);
      break;
    case 'frost':
      if (target) {
        playerHits(s, target, v);
        target.weak += 1;
        fx(s, target.uid, '❄️ Faible', 'debuff');
        log(s, `${info.icon} Givre sur ${target.name}.`);
      }
      break;
    case 'defend':
      s.player.block += v;
      fx(s, 'player', `🛡️ +${v}`, 'block');
      log(s, `${info.icon} Vous gagnez ${v} armure.`);
      break;
    case 'magic':
      s.player.mana += v;
      fx(s, 'player', `✨ +${v}`, 'mana');
      log(s, `${info.icon} Vous gagnez ${v} mana.`);
      break;
    case 'heal':
      heal(s, s.player, 'player', v);
      log(s, `${info.icon} Vous vous soignez de ${v}.`);
      break;
    case 'poison':
      if (target) {
        applyPoison(s, target, v);
        log(s, `${info.icon} Vous empoisonnez ${target.name}.`);
      }
      break;
    case 'rage':
      s.player.strength += v;
      fx(s, 'player', `💪 +${v}`, 'buff');
      log(s, `${info.icon} Vous gagnez ${v} Force.`);
      break;
    case 'vamp':
      if (target) {
        const lost = playerHits(s, target, v);
        const h = Math.ceil(lost / 2);
        if (h > 0) heal(s, s.player, 'player', h);
        log(s, `${info.icon} Vous drainez ${target.name}.`);
      }
      break;
    case 'blank':
      log(s, `${info.icon} Raté…`);
      break;
  }
  checkEnd(s);
  return s;
}

export function canCast(s: CombatState, spellId: string) {
  return s.phase === 'acting' && s.player.mana >= SPELLS[spellId].cost;
}

export function castSpell(prev: CombatState, spellId: string): CombatState {
  if (!canCast(prev, spellId)) return prev;
  const s = clone(prev);
  const spell = SPELLS[spellId];
  s.player.mana -= spell.cost;
  const target = getTarget(s);
  log(s, `${spell.icon} Vous lancez ${spell.name} !`);
  switch (spellId) {
    case 'heroicStrike':
      if (target) playerHits(s, target, 12);
      break;
    case 'warCry':
      s.player.strength += 2;
      fx(s, 'player', '💪 +2', 'buff');
      break;
    case 'whirlwind':
      for (const e of alive(s)) playerHits(s, e, 7);
      break;
    case 'fireball':
      if (target) playerHits(s, target, 15);
      break;
    case 'frostNova':
      for (const e of alive(s)) {
        playerHits(s, e, 5);
        e.weak += 1;
      }
      break;
    case 'arcaneBarrier':
      s.player.block += 10;
      fx(s, 'player', '🛡️ +10', 'block');
      break;
    case 'icePrison':
      if (target) {
        target.frozen = true;
        fx(s, target.uid, '🧊 Gelé', 'debuff');
      }
      break;
    case 'poisonBlade':
      if (target) {
        playerHits(s, target, 4);
        if (target.hp > 0) applyPoison(s, target, 4);
      }
      break;
    case 'smokeBomb':
      s.player.block += 8;
      fx(s, 'player', '🛡️ +8', 'block');
      for (const e of alive(s)) e.weak += 1;
      break;
    case 'execute':
      if (target) playerHits(s, target, target.poison * 2);
      break;
  }
  checkEnd(s);
  return s;
}

export function setTarget(prev: CombatState, uid: number): CombatState {
  const e = prev.enemies.find((x) => x.uid === uid);
  if (!e || e.hp <= 0) return prev;
  return { ...prev, target: uid, events: [] };
}

export function endPlayerTurn(prev: CombatState): CombatState {
  if (prev.phase !== 'acting' && prev.phase !== 'rolling') return prev;
  const s = clone(prev);
  if (s.player.weak > 0) s.player.weak -= 1;
  if (s.player.vulnerable > 0) s.player.vulnerable -= 1;
  s.phase = 'enemy';
  return s;
}

// ---------- Enemy turn ----------

export function beginEnemyTurn(prev: CombatState): CombatState {
  if (prev.phase !== 'enemy') return prev;
  const s = clone(prev);
  for (const e of alive(s)) {
    e.block = 0;
    if (e.poison > 0) {
      log(s, `🧪 ${e.name} subit ${e.poison} dégâts de poison.`);
      hurt(s, e, e.uid, e.poison, true);
      e.poison -= 1;
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
  } else {
    const m = currentIntent(e);
    if (m.label) log(s, `${e.emoji} ${e.name} : ${m.label}`);
    if (m.heal) heal(s, e, e.uid, m.heal);
    if (m.block) {
      e.block += m.block;
      fx(s, e.uid, `🛡️ +${m.block}`, 'block');
    }
    if (m.str) {
      e.strength += m.str;
      fx(s, e.uid, `💪 +${m.str}`, 'buff');
    }
    if (m.dmg !== undefined) {
      const times = m.times ?? 1;
      for (let t = 0; t < times && p.hp > 0; t++) {
        hurt(s, p, 'player', attackDamage(e, p, m.dmg));
      }
      log(s, `${e.emoji} ${e.name} attaque${times > 1 ? ` ${times} fois` : ''} (${attackDamage(e, p, m.dmg)}).`);
    }
    if (m.weak) {
      p.weak += m.weak;
      fx(s, 'player', `Faible +${m.weak}`, 'debuff');
    }
    if (m.vuln) {
      p.vulnerable += m.vuln;
      fx(s, 'player', `Vulnérable +${m.vuln}`, 'debuff');
    }
    if (m.poison) {
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
