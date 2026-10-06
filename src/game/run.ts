import { CLASSES, ENCOUNTERS, RELICS } from './data';
import { pick, shuffle } from './rng';
import type { ClassId, Face, MapNode, NodeType, RunState } from './types';

export const FLOORS = 12;
export const LANES = 3;

function rollNodeType(floor: number): NodeType {
  const r = Math.random();
  if (floor < 3) return r < 0.85 ? 'combat' : 'treasure';
  if (r < 0.5) return 'combat';
  if (r < 0.68) return 'elite';
  if (r < 0.86) return 'rest';
  return 'treasure';
}

/**
 * Each floor has 2-3 nodes across 3 lanes. The middle lane is always present,
 * so every node is reachable (a node links to adjacent lanes on the next floor).
 */
export function generateMap(): MapNode[][] {
  const map: MapNode[][] = [];
  for (let floor = 0; floor < FLOORS; floor++) {
    if (floor === FLOORS - 1) {
      map.push([{ floor, lane: 1, type: 'boss' }]);
      continue;
    }
    const lanes = [1];
    if (Math.random() < 0.75) lanes.push(0);
    if (Math.random() < 0.75) lanes.push(2);
    lanes.sort();
    map.push(
      lanes.map((lane) => {
        let type: NodeType;
        if (floor === 0) type = 'combat';
        else if (floor === 6) type = 'treasure';
        else if (floor === FLOORS - 2) type = 'rest';
        else type = rollNodeType(floor);
        return { floor, lane, type };
      }),
    );
  }
  return map;
}

export function newRun(classId: ClassId): RunState {
  const cls = CLASSES[classId];
  return {
    classId,
    hp: cls.maxHp,
    maxHp: cls.maxHp,
    dice: Array.from({ length: cls.diceCount }, () => cls.die.map((x) => ({ ...x }))),
    relics: [],
    map: generateMap(),
    floor: -1,
    lane: null,
  };
}

export function isReachable(run: RunState, node: MapNode): boolean {
  if (node.floor !== run.floor + 1) return false;
  if (run.lane === null) return true;
  return Math.abs(node.lane - run.lane) <= 1;
}

export function pickEncounter(type: NodeType, floor: number): string[] {
  if (type === 'boss') return pick(ENCOUNTERS.boss);
  if (type === 'elite') return pick(ENCOUNTERS.elite);
  return pick(floor < 3 ? ENCOUNTERS.easy : ENCOUNTERS.normal);
}

/** Three face rewards from the class pool, slightly stronger deeper in the dungeon. */
export function faceRewards(run: RunState): Face[] {
  const pool = CLASSES[run.classId].facePool;
  const bonus = Math.floor(Math.max(0, run.floor) / 5);
  return shuffle(pool)
    .slice(0, 3)
    .map((x) => ({ kind: x.kind, value: x.value === 0 ? 0 : x.value + (x.kind === 'rage' || x.kind === 'magic' ? 0 : bonus) }));
}

export function relicChoices(run: RunState, n: number): string[] {
  const avail = Object.keys(RELICS).filter((id) => !run.relics.includes(id));
  return shuffle(avail).slice(0, n);
}

export function addRelic(run: RunState, id: string): RunState {
  const r: RunState = { ...run, relics: [...run.relics, id] };
  if (id === 'heartAmulet') {
    r.maxHp += 12;
    r.hp += 12;
  }
  if (id === 'extraDie') r.dice = [...r.dice, r.dice[0].map((x) => ({ ...x }))];
  return r;
}

export function replaceFace(run: RunState, dieIdx: number, faceIdx: number, face: Face): RunState {
  const dice = run.dice.map((d, i) => (i === dieIdx ? d.map((x, j) => (j === faceIdx ? { ...face } : x)) : d));
  return { ...run, dice };
}

export function upgradeFace(run: RunState, dieIdx: number, faceIdx: number): RunState {
  const old = run.dice[dieIdx][faceIdx];
  const up: Face = old.kind === 'blank' ? { kind: 'defend', value: 3 } : { kind: old.kind, value: old.value + (old.kind === 'rage' || old.kind === 'magic' ? 1 : 2) };
  return replaceFace(run, dieIdx, faceIdx, up);
}
