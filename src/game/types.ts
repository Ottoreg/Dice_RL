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
  | 'raise'
  | 'exhume'
  | 'haunt'
  | 'crown'
  | 'ghoul'
  | 'blank';

export interface Face {
  kind: FaceKind;
  value: number;
}

export type ClassId = 'warrior' | 'mage' | 'rogue' | 'skeleton' | 'necro';

/** Who an effect lands on: the player, an enemy (uid) or a minion ("m" + uid). */
export type Target = 'player' | number | `m${number}`;

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
  /** Damage hits the player and every minion. */
  sweep?: boolean;
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

export type MinionKind = 'skeleton' | 'knight' | 'ghoul';

export interface Minion {
  uid: number;
  kind: MinionKind;
  hp: number;
  maxHp: number;
  dmg: number;
  /** Always 0: minions have no armor, but share the damage code with fighters. */
  block: number;
  /** Single-target enemy attacks hit this minion instead of the player. */
  guard: boolean;
  /** Heals 2 each time it strikes. */
  vorace: boolean;
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
  target: Target;
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
  | 'summon'
  | 'strike'
  | 'lunge';

export interface AnimEvent {
  id: number;
  target: Target;
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
  /** Necromancer's servants (max 4). */
  minions: Minion[];
  /** Extra damage for every minion (👑 Couronne de la liche). */
  minionBonus: number;
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
