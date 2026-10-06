import type { ClassId, Face, FaceKind, Intent, MinionKind } from './types';

// ---------- Dice faces ----------

export const FACE_INFO: Record<FaceKind, { icon: string; name: string; color: string; desc: (v: number) => string }> = {
  attack: { icon: '⚔️', name: 'Attaque', color: '#e05252', desc: (v) => `Inflige ${v} dégâts à la cible.` },
  dagger: { icon: '🗡️', name: 'Dague', color: '#d9785b', desc: (v) => `Inflige ${v} dégâts deux fois.` },
  fire: { icon: '🔥', name: 'Feu', color: '#ff8a30', desc: (v) => `Inflige ${v} dégâts à tous les ennemis.` },
  frost: { icon: '❄️', name: 'Givre', color: '#6cc6ff', desc: (v) => `Inflige ${v} dégâts et applique 1 Faiblesse.` },
  defend: { icon: '🛡️', name: 'Défense', color: '#5b8de0', desc: (v) => `Gagne ${v} armure.` },
  magic: { icon: '✨', name: 'Magie', color: '#b07cff', desc: (v) => `Gagne ${v} mana.` },
  heal: { icon: '❤️', name: 'Soin', color: '#4fc27a', desc: (v) => `Soigne ${v} PV.` },
  poison: { icon: '🧪', name: 'Poison', color: '#8bc34a', desc: (v) => `Applique ${v} Poison à la cible.` },
  rage: { icon: '💢', name: 'Rage', color: '#ff5c8a', desc: (v) => `Gagne ${v} Force pour le combat.` },
  vamp: { icon: '🩸', name: 'Drain', color: '#c2185b', desc: (v) => `Inflige ${v} dégâts, soigne la moitié.` },
  venom: { icon: '☣️', name: 'Venin', color: '#c6ff00', desc: (v) => `Applique ${v} Poison, puis double le Poison de la cible.` },
  staff: { icon: '🪄', name: 'Sceptre', color: '#9575ff', desc: (v) => `Inflige ${v} dégâts à la cible et donne 1 mana.` },
  bone: {
    icon: '🦴',
    name: 'Os',
    color: '#d9cba3',
    desc: (v) => `Joker : rejoint votre plus grand groupe de faces et agit comme elles, avec une valeur de ${v}.`,
  },
  skull: {
    icon: '💀',
    name: 'Crâne hurlant',
    color: '#eceff1',
    desc: (v) => `Joker de valeur ${v} : rejoint votre plus grand groupe, dont le multiplicateur gagne +0,5.`,
  },
  raise: {
    icon: '🪦',
    name: 'Invocation',
    color: '#9e9e9e',
    desc: (v) => `Relève un 💀 Squelette serviteur (${v} PV, ${v} dégâts par tour).`,
  },
  exhume: {
    icon: '⚰️',
    name: 'Exhumer',
    color: '#8d6e63',
    desc: (v) => `Soigne ${v} PV à tous vos serviteurs. Sans serviteur, relève un Squelette de ${Math.ceil(v / 2)} PV.`,
  },
  haunt: { icon: '👻', name: 'Hantise', color: '#b39ddb', desc: (v) => `Inflige ${v} dégâts à la cible, +1 par serviteur.` },
  crown: { icon: '👑', name: 'Couronne de la liche', color: '#ffca28', desc: (v) => `Tous vos serviteurs gagnent +${v} dégâts pour le combat.` },
  ghoul: {
    icon: '🧌',
    name: 'Charnier',
    color: '#7cb342',
    desc: (v) => `Relève une 🧌 Goule (${v} PV, ${Math.ceil(v / 2)} dégâts) qui se soigne de 2 à chaque coup.`,
  },
  swarm: { icon: '🦇', name: 'Nuée', color: '#7e57c2', desc: (v) => `Inflige ${v} dégâts à tous les ennemis, soigne 1 PV par ennemi touché.` },
  bite: { icon: '🦷', name: 'Morsure', color: '#b71c1c', desc: (v) => `Inflige ${v} dégâts et applique ${Math.ceil(v / 2)} Saignement.` },
  embrace: { icon: '💋', name: 'Étreinte', color: '#880e4f', desc: (v) => `Inflige ${v} dégâts et soigne 100 % des PV retirés.` },
  chalice: { icon: '🍷', name: 'Calice', color: '#ad1457', desc: (v) => `+${v} PV max pour la partie, puis la face devient ❌ Raté.` },
  cleave: { icon: '🪓', name: 'Fendoir', color: '#ff7043', desc: (v) => `Inflige ${v} dégâts à tous les ennemis.` },
  rebirth: { icon: '💖', name: 'Renaissance', color: '#ff7eb6', desc: () => 'Rend tous vos PV, puis cette face devient ❌ Raté pour de bon.' },
  blank: { icon: '❌', name: 'Raté', color: '#555a66', desc: () => 'Ne fait rien.' },
};

export const f = (kind: FaceKind, value = 0): Face => ({ kind, value });

/** Faces whose effect has no number. */
export const VALUELESS: FaceKind[] = ['blank', 'rebirth'];
export const hasValue = (kind: FaceKind) => !VALUELESS.includes(kind);

// ---------- Spells ----------

export interface SpellDef {
  id: string;
  name: string;
  icon: string;
  /** Mana cost. */
  cost: number;
  /** HP cost (Vampire): paid from your health, ignoring armor. */
  hpCost?: number;
  desc: string;
}

export const SPELLS: Record<string, SpellDef> = {
  heroicStrike: { id: 'heroicStrike', name: 'Frappe héroïque', icon: '💥', cost: 2, desc: 'Inflige 12 dégâts.' },
  warCry: { id: 'warCry', name: 'Cri de guerre', icon: '📯', cost: 2, desc: 'Gagne 2 Force.' },
  whirlwind: { id: 'whirlwind', name: 'Tourbillon', icon: '🌪️', cost: 3, desc: 'Inflige 7 dégâts à tous les ennemis.' },

  fireball: { id: 'fireball', name: 'Boule de feu', icon: '☄️', cost: 3, desc: 'Inflige 15 dégâts.' },
  frostNova: { id: 'frostNova', name: 'Nova de givre', icon: '🌨️', cost: 3, desc: 'Inflige 5 dégâts et 1 Faiblesse à tous.' },
  arcaneBarrier: { id: 'arcaneBarrier', name: 'Barrière arcanique', icon: '🔷', cost: 2, desc: 'Gagne 10 armure.' },
  icePrison: { id: 'icePrison', name: 'Prison de glace', icon: '🧊', cost: 4, desc: 'La cible passe son prochain tour.' },

  poisonBlade: { id: 'poisonBlade', name: 'Lame empoisonnée', icon: '🐍', cost: 2, desc: 'Inflige 4 dégâts et 4 Poison.' },
  smokeBomb: { id: 'smokeBomb', name: 'Fumigène', icon: '💨', cost: 2, desc: 'Gagne 8 armure, 1 Faiblesse à tous.' },
  execute: { id: 'execute', name: 'Exécution', icon: '🎯', cost: 3, desc: 'Inflige 2× le Poison de la cible.' },

  boneRain: { id: 'boneRain', name: 'Pluie d’os', icon: '🦴', cost: 2, desc: 'Inflige 4 dégâts, +4 par 🦴 lancé ce tour.' },
  boneArmor: { id: 'boneArmor', name: 'Armure d’os', icon: '🩻', cost: 2, desc: 'Gagne 5 armure, +3 par 🦴 lancé ce tour.' },
  corpseExplosion: {
    id: 'corpseExplosion',
    name: 'Explosion de cadavre',
    icon: '💥',
    cost: 2,
    desc: 'Sacrifie votre serviteur le plus faible : ses PV en dégâts à tous les ennemis.',
  },
  command: { id: 'command', name: 'Commandement', icon: '📯', cost: 2, desc: 'Tous vos serviteurs attaquent immédiatement.' },
  pact: { id: 'pact', name: 'Pacte', icon: '🩸', cost: 3, desc: 'Perd 6 PV : relève un 🤺 Chevalier mort (14 PV, 5 dégâts, Garde).' },
  bloodletting: { id: 'bloodletting', name: 'Saignée', icon: '🩸', cost: 0, hpCost: 8, desc: 'Inflige 12 dégâts.' },
  mistForm: { id: 'mistForm', name: 'Forme de brume', icon: '🌫️', cost: 0, hpCost: 5, desc: 'La prochaine attaque ennemie ne vous touche pas.' },
  feast: { id: 'feast', name: 'Festin', icon: '🍷', cost: 0, hpCost: 4, desc: 'Vos 🩸 Drain, 🦇 Nuée et 💋 Étreinte soignent le double ce tour.' },
  shatter: { id: 'shatter', name: 'Os brisés', icon: '💥', cost: 3, desc: 'Inflige 6 dégâts et 1 Vulnérable à tous.' },
};

// ---------- Classes ----------

export interface ClassDef {
  id: ClassId;
  name: string;
  emoji: string;
  tagline: string;
  maxHp: number;
  diceCount: number;
  rerolls: number;
  startMana: number;
  manaPerTurn: number;
  startStrength: number;
  poisonBonus: number;
  passive: string;
  die: Face[];
  /** Special face set on one die at the start of a run. */
  startRare?: { die: number; slot: number; face: Face };
  spells: string[];
  facePool: Face[];
  /** Rare faces that can show up as an end-of-combat reward. */
  rarePool?: Face[];
  /** Faces from other classes that can occasionally show up as rewards. */
  crossPool?: Face[];
}

/** Faces that only appear as rare rewards / starting bonuses. */
export const RARE_KINDS: FaceKind[] = ['venom', 'cleave', 'rebirth', 'skull', 'crown', 'ghoul', 'embrace', 'chalice'];

/** Most minions on the board at once. */
export const MAX_MINIONS = 4;

export const MINIONS: Record<MinionKind, { name: string; emoji: string }> = {
  skeleton: { name: 'Squelette', emoji: '💀' },
  knight: { name: 'Chevalier mort', emoji: '🤺' },
  ghoul: { name: 'Goule', emoji: '🧌' },
};

/** Faces that join another group in combos and copy its effect. */
export const JOKER_KINDS: FaceKind[] = ['bone', 'skull'];

/** Chance that one of the three combat rewards is replaced by a rare face. */
export const RARE_CHANCE = { combat: 0.15, elite: 0.4 };

/** Chance that one of the three combat rewards comes from the class's cross pool. */
export const CROSS_CHANCE = 0.15;

/** Chance that a rest site holds a super forge, which upgrades a whole die. */
export const SUPER_FORGE_CHANCE = 0.12;

export const CLASSES: Record<ClassId, ClassDef> = {
  warrior: {
    id: 'warrior',
    name: 'Guerrier',
    emoji: '🪓',
    tagline: 'Robuste et brutal. Encaisse et frappe fort.',
    maxHp: 72,
    diceCount: 4,
    rerolls: 2,
    startMana: 0,
    manaPerTurn: 0,
    startStrength: 1,
    poisonBonus: 0,
    passive: 'Robuste : commence chaque combat avec 1 Force.',
    die: [f('attack', 6), f('attack', 6), f('defend', 5), f('defend', 5), f('magic', 2), f('blank')],
    spells: ['heroicStrike', 'warCry', 'whirlwind'],
    facePool: [f('attack', 9), f('attack', 8), f('defend', 9), f('rage', 1), f('vamp', 6), f('heal', 6), f('magic', 3)],
    rarePool: [f('cleave', 7)],
    crossPool: [f('dagger', 3), f('poison', 4)],
  },
  mage: {
    id: 'mage',
    name: 'Mage',
    emoji: '🧙',
    tagline: 'Fragile mais maître des arcanes.',
    maxHp: 52,
    diceCount: 4,
    rerolls: 2,
    startMana: 2,
    manaPerTurn: 1,
    startStrength: 0,
    poisonBonus: 0,
    passive: 'Afflux arcanique : +1 mana par tour, commence avec 2 mana.',
    die: [f('fire', 3), f('frost', 4), f('magic', 2), f('magic', 2), f('defend', 4), f('blank')],
    spells: ['fireball', 'frostNova', 'arcaneBarrier', 'icePrison'],
    facePool: [f('fire', 5), f('frost', 6), f('magic', 3), f('magic', 4), f('defend', 7), f('heal', 5), f('staff', 6), f('vamp', 4)],
    rarePool: [f('rebirth')],
  },
  rogue: {
    id: 'rogue',
    name: 'Voleur',
    emoji: '🥷',
    tagline: 'Rapide et sournois. Lance plus de dés.',
    maxHp: 52,
    diceCount: 5,
    rerolls: 2,
    startMana: 0,
    manaPerTurn: 0,
    startStrength: 0,
    poisonBonus: 1,
    passive: 'Toxines : chaque application de Poison gagne +1.',
    die: [f('dagger', 2), f('dagger', 2), f('poison', 2), f('poison', 2), f('defend', 4), f('magic', 1)],
    startRare: { die: 0, slot: 3, face: f('venom', 2) },
    spells: ['poisonBlade', 'smokeBomb', 'execute'],
    facePool: [f('dagger', 4), f('dagger', 3), f('poison', 5), f('poison', 4), f('defend', 6), f('magic', 2), f('vamp', 4), f('heal', 4)],
    rarePool: [f('venom', 2)],
  },
  skeleton: {
    id: 'skeleton',
    name: 'Squelette',
    emoji: '☠️',
    tagline: 'Ses os comblent toujours les trous : les combos tombent tout seuls.',
    maxHp: 60,
    diceCount: 4,
    rerolls: 2,
    startMana: 0,
    manaPerTurn: 0,
    startStrength: 0,
    poisonBonus: 0,
    passive: 'Réassemblage : une fois par partie, quand il tombe à 0 PV, il se relève avec 30 % de ses PV max.',
    die: [f('attack', 5), f('attack', 5), f('defend', 4), f('bone', 3), f('bone', 3), f('magic', 2)],
    spells: ['boneRain', 'boneArmor', 'shatter'],
    facePool: [f('attack', 8), f('attack', 7), f('defend', 7), f('bone', 4), f('bone', 5), f('magic', 3), f('vamp', 5), f('heal', 5)],
    rarePool: [f('skull', 3)],
  },
  necro: {
    id: 'necro',
    name: 'Nécromancien',
    emoji: '🧟',
    tagline: 'Se bat rarement lui-même : ses serviteurs frappent et encaissent pour lui.',
    maxHp: 56,
    diceCount: 4,
    rerolls: 2,
    startMana: 1,
    manaPerTurn: 0,
    startStrength: 0,
    poisonBonus: 0,
    passive:
      'Moisson : chaque ennemi tué relève un 💀 Squelette (3 PV, 2 dégâts) ; chaque serviteur détruit rend 1 ✨ et 3 PV. Les serviteurs (4 max) attaquent la cible à la fin de votre tour.',
    die: [f('raise', 4), f('raise', 4), f('attack', 4), f('defend', 5), f('magic', 2), f('defend', 5)],
    spells: ['corpseExplosion', 'command', 'pact'],
    facePool: [f('raise', 6), f('raise', 5), f('exhume', 4), f('haunt', 4), f('attack', 6), f('defend', 6), f('magic', 3), f('vamp', 4)],
    rarePool: [f('crown', 2), f('ghoul', 6)],
  },
  vampire: {
    id: 'vampire',
    name: 'Vampire',
    emoji: '🧛',
    tagline: 'Paie ses sorts avec son sang et se soigne en drainant ses proies.',
    maxHp: 52,
    diceCount: 4,
    rerolls: 2,
    startMana: 0,
    manaPerTurn: 0,
    startStrength: 0,
    poisonBonus: 0,
    passive:
      'Soif : +1 Force par tranche de 10 % de PV manquants (jusqu’à +10 sous 10 % de PV). Mort-vivant : pas de mana, ses sorts coûtent des PV, et les ❤️ Soins le blessent.',
    die: [f('vamp', 4), f('attack', 4), f('attack', 4), f('swarm', 2), f('defend', 4), f('blank')],
    spells: ['bloodletting', 'mistForm', 'feast'],
    facePool: [f('vamp', 6), f('vamp', 7), f('swarm', 4), f('bite', 4), f('attack', 7), f('defend', 6), f('heal', 5)],
    rarePool: [f('embrace', 5), f('chalice', 6)],
  },
};

// ---------- Enemies ----------

export interface EnemyDef {
  id: string;
  name: string;
  emoji: string;
  hp: [number, number];
  moves: Intent[];
  pattern: 'cycle' | 'random';
}

export const ENEMIES: Record<string, EnemyDef> = {
  rat: { id: 'rat', name: 'Rat géant', emoji: '🐀', hp: [18, 22], pattern: 'random', moves: [{ dmg: 6 }, { dmg: 3, times: 2 }, { dmg: 4, weak: 1 }] },
  bat: { id: 'bat', name: 'Chauve-souris', emoji: '🦇', hp: [12, 15], pattern: 'random', moves: [{ dmg: 3, times: 2 }, { dmg: 6 }] },
  goblin: { id: 'goblin', name: 'Gobelin', emoji: '👺', hp: [24, 28], pattern: 'random', moves: [{ dmg: 8 }, { dmg: 4, block: 8 }, { dmg: 4, times: 2 }] },
  mushroom: { id: 'mushroom', name: 'Champignon', emoji: '🍄', hp: [22, 26], pattern: 'cycle', moves: [{ poison: 4, label: 'Spores' }, { dmg: 7 }, { dmg: 4, block: 6 }] },
  slime: { id: 'slime', name: 'Slime', emoji: '🟢', hp: [46, 52], pattern: 'random', moves: [{ dmg: 11 }, { dmg: 6, weak: 1 }, { block: 10, heal: 6 }] },
  skeleton: { id: 'skeleton', name: 'Squelette', emoji: '💀', hp: [42, 48], pattern: 'cycle', moves: [{ dmg: 11 }, { block: 12 }, { dmg: 7, vuln: 1 }] },
  bandit: { id: 'bandit', name: 'Bandit', emoji: '🦹', hp: [40, 44], pattern: 'random', moves: [{ dmg: 8, vuln: 1 }, { dmg: 14 }, { block: 10, str: 2 }] },
  wolf: { id: 'wolf', name: 'Loup', emoji: '🐺', hp: [36, 40], pattern: 'random', moves: [{ dmg: 5, times: 2 }, { str: 2, block: 6, label: 'Hurlement' }, { dmg: 12 }] },
  // Elites
  orc: {
    id: 'orc',
    name: 'Orc berserker',
    emoji: '👹',
    hp: [80, 88],
    pattern: 'cycle',
    moves: [{ str: 3, label: 'Rage' }, { dmg: 13, sweep: true, label: 'Moulinet' }, { dmg: 7, times: 2 }],
  },
  golem: {
    id: 'golem',
    name: 'Golem de pierre',
    emoji: '🗿',
    hp: [100, 108],
    pattern: 'cycle',
    moves: [{ block: 18 }, { dmg: 20, sweep: true, label: 'Séisme' }, { dmg: 8, vuln: 2 }],
  },
  witch: {
    id: 'witch',
    name: 'Sorcière',
    emoji: '🧙‍♀️',
    hp: [72, 78],
    pattern: 'cycle',
    moves: [{ poison: 5, weak: 2, label: 'Malédiction' }, { dmg: 15, sweep: true, label: 'Vague maudite' }, { heal: 14, block: 10 }],
  },
  // Boss
  dragon: {
    id: 'dragon',
    name: 'Dragon ancien',
    emoji: '🐉',
    hp: [220, 220],
    pattern: 'cycle',
    moves: [
      { dmg: 16 },
      { dmg: 6, times: 3, label: 'Griffes' },
      { block: 20, str: 3, label: 'Écailles' },
      { label: 'Inspire profondément…' },
      { dmg: 35, sweep: true, label: 'Souffle de feu' },
    ],
  },
};

export const ENCOUNTERS = {
  easy: [['rat'], ['goblin'], ['bat', 'bat'], ['mushroom'], ['rat', 'bat']],
  normal: [
    ['slime'],
    ['skeleton'],
    ['goblin', 'rat'],
    ['bandit'],
    ['wolf'],
    ['mushroom', 'bat'],
    ['skeleton', 'rat'],
    ['wolf', 'bat'],
    ['goblin', 'mushroom'],
  ],
  elite: [['orc'], ['golem'], ['witch']],
  boss: [['dragon']],
};

// ---------- Relics ----------

export interface RelicDef {
  id: string;
  name: string;
  icon: string;
  desc: string;
}

export const RELICS: Record<string, RelicDef> = {
  whetstone: { id: 'whetstone', name: 'Pierre à aiguiser', icon: '🪨', desc: 'Les faces ⚔️ Attaque et 🗡️ Dague gagnent +1.' },
  loadedDie: { id: 'loadedDie', name: 'Dé pipé', icon: '🎲', desc: '+1 relance par tour.' },
  extraDie: { id: 'extraDie', name: 'Dé supplémentaire', icon: '➕', desc: 'Gagne un dé (copie de votre premier dé).' },
  heartAmulet: { id: 'heartAmulet', name: 'Amulette de vie', icon: '💗', desc: '+12 PV max.' },
  ancestralShield: { id: 'ancestralShield', name: 'Bouclier ancestral', icon: '🪬', desc: 'Commence chaque combat avec 8 armure.' },
  manaCrystal: { id: 'manaCrystal', name: 'Cristal de mana', icon: '🔮', desc: '+1 mana par tour (Vampire : +2 PV par tour).' },
  vampFang: { id: 'vampFang', name: 'Croc de vampire', icon: '🧛', desc: 'Soigne 6 PV après chaque combat.' },
  hourglass: { id: 'hourglass', name: 'Sablier du joueur', icon: '⏳', desc: 'Les multiplicateurs de combo gagnent +0.25.' },
  toxicVial: { id: 'toxicVial', name: 'Fiole toxique', icon: '⚗️', desc: 'Chaque application de Poison gagne +2.' },
};

export const COMBO_NAMES: Record<number, string> = {
  2: 'Paire',
  3: 'Brelan',
  4: 'Carré',
  5: 'YAM !',
  6: 'SUPER YAM !',
  7: 'MÉGA YAM !',
};

export const COMBO_MULT: Record<number, number> = { 1: 1, 2: 1.25, 3: 1.5, 4: 1.75, 5: 2, 6: 2.25, 7: 2.5 };
