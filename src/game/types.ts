export type FaceKind =
  | 'attack'
  | 'dagger'
  | 'fire'
  | 'frost'
  | 'defend'
  | 'magic'
  | 'heal'
  | 'poison'
  | 'rage'
  | 'vamp'
  | 'venom'
  | 'cleave'
  | 'rebirth'
  | 'staff'
  | 'bone'
  | 'skull'
  | 'blank';

export interface Face {
  kind: FaceKind;
  value: number;
}

export type ClassId = 'warrior' | 'mage' | 'rogue' | 'skeleton';

export interface Fighter {
  hp: number;
  maxHp: number;
  block: number;
  strength: number;
  weak: number;
  vulnerable: number;
  poison: number;
}

/** A move an enemy can telegraph. Every field present is applied. */
export interface Intent {
  label?: string;
  dmg?: number;
  times?: number;
  block?: number;
  str?: number;
  weak?: number;
  vuln?: number;
  poison?: number;
  heal?: number;
}

export interface EnemyState extends Fighter {
  uid: number;
  defId: string;
  name: string;
  emoji: string;
  moveIdx: number;
  frozen: boolean;
  dead: boolean;
}

export interface DieState {
  faces: Face[];
  faceIdx: number;
  locked: boolean;
  used: boolean;
  mult: number;
  /** For joker faces (🦴): the face type they copy this turn. */
  asKind?: FaceKind;
}

export interface Combo {
  kind: FaceKind;
  count: number;
  /** How many jokers (🦴) joined this group. */
  jokers: number;
  mult: number;
  name: string;
}

export type CombatPhase = 'rolling' | 'acting' | 'enemy' | 'won' | 'lost';

export interface FxEvent {
  id: number;
  target: 'player' | number;
  text: string;
  tone: 'dmg' | 'block' | 'heal' | 'buff' | 'debuff' | 'mana';
}

export type AnimKind =
  | 'slash'
  | 'dagger'
  | 'fire'
  | 'frost'
  | 'shield'
  | 'magic'
  | 'heal'
  | 'poison'
  | 'rage'
  | 'vamp'
  | 'venom'
  | 'blank'
  | 'whirlwind'
  | 'ice'
  | 'smoke'
  | 'execute'
  | 'curse'
  | 'lunge';

export interface AnimEvent {
  id: number;
  target: 'player' | number;
  kind: AnimKind;
}

export interface CombatState {
  classId: ClassId;
  relics: string[];
  player: Fighter & { mana: number };
  enemies: EnemyState[];
  dice: DieState[];
  rerollsLeft: number;
  rerollsPerTurn: number;
  phase: CombatPhase;
  turn: number;
  target: number;
  rollId: number;
  combos: Combo[];
  bonusText: string[];
  suite: boolean;
  log: string[];
  events: FxEvent[];
  anims: AnimEvent[];
  /** Whether the player was already Vulnerable when the current enemy turn began. */
  vulnCarry: boolean;
  /** Skeleton passive still available in this run. */
  reviveAvailable: boolean;
  /** The skeleton passive triggered during this fight. */
  revived: boolean;
}

export type NodeType = 'combat' | 'elite' | 'rest' | 'treasure' | 'boss';

export interface MapNode {
  floor: number;
  lane: number;
  type: NodeType;
}

export interface RunState {
  classId: ClassId;
  hp: number;
  maxHp: number;
  dice: Face[][];
  relics: string[];
  map: MapNode[][];
  floor: number;
  lane: number | null;
  /** The skeleton's once-per-run revive has been spent. */
  reviveUsed?: boolean;
}
