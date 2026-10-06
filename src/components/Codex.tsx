import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { CLASSES, COMBO_MULT, COMBO_NAMES, ENCOUNTERS, ENEMIES, FACE_INFO, RELICS, SPELLS, hasValue } from '../game/data';
import type { Face, FaceKind, Intent } from '../game/types';
import { FaceView, StartRareNote } from './Die';

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return createPortal(
    <div className="overlay" onClick={onClose}>
      <div className="modal big-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="btn close" onClick={onClose} aria-label="Fermer">
            ✕
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

// ---------- Faces ----------

const FACE_DETAILS: Record<FaceKind, { effect: string; notes: string[] }> = {
  attack: {
    effect: 'Inflige X dégâts à la cible 🎯.',
    notes: ['Ajoute votre Force.', 'L’armure de la cible absorbe les dégâts en premier.', 'Bonus de la Pierre à aiguiser : +1.'],
  },
  dagger: {
    effect: 'Inflige X dégâts deux fois à la cible.',
    notes: [
      'La Force s’ajoute à chaque coup : elle compte double.',
      'L’armure absorbe chaque coup séparément. Le second coup est annulé si la cible meurt.',
      'Bonus de la Pierre à aiguiser : +1 sur chaque coup.',
    ],
  },
  fire: {
    effect: 'Inflige X dégâts à tous les ennemis.',
    notes: ['Ajoute votre Force à chaque ennemi touché.', 'Idéal contre les groupes.'],
  },
  frost: {
    effect: 'Inflige X dégâts à la cible et lui applique 1 Faiblesse.',
    notes: ['Ajoute votre Force.', 'La Faiblesse appliquée reste 1, quel que soit le combo.'],
  },
  defend: {
    effect: 'Vous gagnez X armure.',
    notes: ['L’armure absorbe les dégâts avant vos PV.', 'Elle disparaît au début de votre tour suivant.', 'Le poison ignore l’armure.'],
  },
  magic: {
    effect: 'Vous gagnez X mana.',
    notes: ['Le mana sert à lancer les sorts de votre classe.', 'Il se garde d’un tour à l’autre, mais repart de la valeur de départ de la classe à chaque combat.'],
  },
  heal: { effect: 'Vous récupérez X PV.', notes: ['Ne dépasse pas vos PV max.'] },
  poison: {
    effect: 'Applique X Poison à la cible.',
    notes: ['+1 avec le passif du Voleur, +2 avec la Fiole toxique.', 'Voir l’onglet États pour le fonctionnement détaillé.'],
  },
  rage: {
    effect: 'Vous gagnez X Force jusqu’à la fin du combat.',
    notes: [
      'Utilisez-la avant vos attaques pour qu’elles en profitent.',
      'La valeur est arrondie : 1 × 1,25 (Paire) donne toujours 1, mais 1 × 1,5 (Brelan) donne 2.',
    ],
  },
  vamp: {
    effect: 'Inflige X dégâts à la cible et vous soigne de la moitié des PV qu’elle perd.',
    notes: ['Ajoute votre Force.', 'Les dégâts absorbés par l’armure ne soignent pas. Le soin est arrondi au supérieur.'],
  },
  venom: {
    effect: 'Applique X Poison à la cible, puis double tout son Poison.',
    notes: [
      'Face rare. Le X profite des combos et des bonus de Poison (Toxines du Voleur, Fiole toxique), puis le total est doublé.',
      'Exemple : avec 5 Poison sur la cible, ☣️2 du Voleur donne 5 + 3 = 8, doublé à 16.',
      'Utilisez-la après vos autres faces 🧪 pour doubler un maximum. Ne forme pas de combo avec 🧪.',
      'À la Forge : +1.',
    ],
  },
  staff: {
    effect: 'Inflige X dégâts à la cible et vous donne 1 mana.',
    notes: ['Version mage de l’Attaque. Ajoute votre Force.', 'Le mana gagné reste 1, quel que soit le combo.', 'Ne profite pas de la Pierre à aiguiser.'],
  },
  bone: {
    effect: 'Joker : rejoint votre plus grand groupe de faces pour former un combo, et agit comme ces faces avec sa propre valeur.',
    notes: [
      'Exemple : ⚔️5 ⚔️5 🦴3 🛡️4 donne un Brelan de ⚔️ : l’Os inflige 3 × 1,5 = 5 dégâts (+ Force).',
      'En cas d’égalité, il rejoint le groupe dont les valeurs sont les plus hautes.',
      'Sans autre face pour l’accueillir, il agit comme 🛡️ Défense.',
      'Empêche la Suite. Face du Squelette.',
    ],
  },
  skull: {
    effect: 'Joker comme 🦴, et le groupe qu’il rejoint gagne +0,5 de multiplicateur.',
    notes: ['Face rare du Squelette, obtenue uniquement en récompense.', 'Même seul avec une autre face, il donne un bonus ×1,5 au groupe.'],
  },
  raise: {
    effect: 'Relève un 💀 Squelette serviteur avec X PV, qui inflige X dégâts à la fin de chacun de vos tours.',
    notes: [
      'Face du Nécromancien. Les combos agrandissent chaque Squelette : un Brelan de 🪦4 en relève 3 de 6 PV.',
      'Un Carré (ou mieux) d’Invocation relève en plus un 🤺 Chevalier mort.',
      'Plateau plein (4 serviteurs) : le serviteur le plus faible gagne X PV à la place.',
    ],
  },
  exhume: {
    effect: 'Soigne X PV à tous vos serviteurs.',
    notes: ['Sans serviteur, relève à la place un Squelette de X/2 PV.', 'Ne dépasse pas les PV max des serviteurs.'],
  },
  haunt: { effect: 'Inflige X dégâts à la cible, +1 par serviteur sur le plateau.', notes: ['Ajoute votre Force (c’est votre attaque, pas celle des serviteurs).'] },
  crown: {
    effect: 'Tous vos serviteurs gagnent +X dégâts jusqu’à la fin du combat, y compris ceux relevés ensuite.',
    notes: ['Face rare du Nécromancien, obtenue uniquement en récompense.'],
  },
  ghoul: {
    effect: 'Relève une 🧌 Goule : X PV, X/2 dégâts, et elle se soigne de 2 à chaque coup porté (Vorace).',
    notes: ['Face rare du Nécromancien, obtenue uniquement en récompense.'],
  },
  cleave: {
    effect: 'Inflige X dégâts à tous les ennemis, comme le sort Tourbillon.',
    notes: ['Face rare du Guerrier, obtenue uniquement en récompense.', 'Ajoute votre Force à chaque ennemi touché.', 'Ne forme pas de combo avec 🔥 Feu.'],
  },
  rebirth: {
    effect: 'Vous récupérez tous vos PV.',
    notes: [
      'Face rare du Mage, obtenue uniquement en récompense.',
      'Usage unique : une fois utilisée, la face devient ❌ Raté pour le reste de la partie.',
      'Si elle sort quand vous êtes en pleine forme, vous pouvez ne pas l’utiliser : elle reste disponible pour un prochain lancer.',
      'Ne peut pas être améliorée à la Forge.',
    ],
  },
  blank: { effect: 'Ne fait rien.', notes: ['Ne compte pas dans les combos et empêche la Suite.', 'Au feu de camp, la Forge la transforme en 🛡️3.'] },
};

const FACE_ORDER: FaceKind[] = ['attack', 'staff', 'dagger', 'cleave', 'fire', 'frost', 'vamp', 'poison', 'venom', 'defend', 'heal', 'rebirth', 'magic', 'rage', 'bone', 'skull', 'raise', 'exhume', 'haunt', 'crown', 'ghoul', 'blank'];

function whereFound(kind: FaceKind): string[] {
  const out: string[] = [];
  for (const c of Object.values(CLASSES)) {
    const start = c.die.filter((f) => f.kind === kind).map((f) => f.value);
    const pool = c.facePool.filter((f) => f.kind === kind).map((f) => f.value);
    const rare = (c.rarePool ?? []).filter((f) => f.kind === kind).map((f) => f.value);
    if (start.length) out.push(`${c.emoji} ${c.name}, dé de départ : ${start.join(', ')}`);
    if (c.startRare?.face.kind === kind) out.push(`${c.emoji} ${c.name}, dé ${c.startRare.die + 1} au départ : ${c.startRare.face.value}`);
    if (pool.length) out.push(`${c.emoji} ${c.name}, récompenses : ${pool.join(', ')}`);
    const cross = (c.crossPool ?? []).filter((f) => f.kind === kind).map((f) => f.value);
    if (cross.length) out.push(`${c.emoji} ${c.name}, récompense occasionnelle : ${cross.join(', ')}`);
    if (rare.length) out.push(`${c.emoji} ${c.name}, récompense rare : ${rare.join(', ')}`);
  }
  return out;
}

function FacesTab() {
  return (
    <div className="codex-list">
      <p className="codex-intro">
        Valeur d’un dé = arrondi((valeur de la face + bonus) × multiplicateur de combo). Les faces de dégâts ajoutent ensuite votre <b>Force</b>.
        Les dégâts sont réduits de 25 % si vous êtes <b>Faible</b> et augmentés de 50 % si la cible est <b>Vulnérable</b>.
      </p>
      {FACE_ORDER.map((k) => {
        const info = FACE_INFO[k];
        const d = FACE_DETAILS[k];
        return (
          <div key={k} className="codex-entry">
            <FaceView face={{ kind: k, value: 0 }} size="lg" label="X" />
            <div>
              <h4>{info.name}</h4>
              <p>{d.effect}</p>
              <ul>
                {d.notes.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
              <div className="codex-where">{whereFound(k).join(' · ') || 'Aucune source pour le moment.'}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------- Rules & combos ----------

function RulesTab() {
  return (
    <div className="codex-list">
      <h3>Déroulement d’un tour</h3>
      <ol>
        <li>Vos dés sont lancés automatiquement.</li>
        <li>Cliquez sur un dé pour le garder 🔒, puis relancez les autres. Vous avez 2 relances par tour (+1 avec le Dé pipé).</li>
        <li>Validez : les combos sont calculés une fois pour toutes, puis vous utilisez vos dés dans l’ordre de votre choix.</li>
        <li>Lancez des sorts avec votre mana. Les dés non utilisés sont perdus à la fin du tour.</li>
        <li>Les ennemis exécutent l’intention affichée au-dessus d’eux.</li>
      </ol>
      <h3>Combos (faces de même type)</h3>
      <p className="codex-intro">
        Seul le <b>type</b> de face compte : ⚔️6 et ⚔️9 forment une paire. Le multiplicateur s’applique à chaque dé du groupe.
        Les faces 🦴 Os (Squelette) sont des jokers : elles rejoignent votre plus grand groupe.
      </p>
      <table className="codex-table">
        <thead>
          <tr>
            <th>Dés identiques</th>
            <th>Nom</th>
            <th>Multiplicateur</th>
            <th>Total (dés × mult.)</th>
          </tr>
        </thead>
        <tbody>
          {[2, 3, 4, 5, 6].map((n) => (
            <tr key={n}>
              <td>{n}</td>
              <td>{COMBO_NAMES[n]}</td>
              <td>×{COMBO_MULT[n]}</td>
              <td>{(n * COMBO_MULT[n]).toFixed(2).replace(/\.?0+$/, '')} fois la valeur d’un dé</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h3>Bonus de figure</h3>
      <table className="codex-table">
        <tbody>
          <tr>
            <td>
              <b>Full</b>
            </td>
            <td>Un Brelan et une Paire (5 dés minimum) : +6 armure immédiatement.</td>
          </tr>
          <tr>
            <td>
              <b>Double paire</b>
            </td>
            <td>Deux Paires : +3 armure immédiatement.</td>
          </tr>
          <tr>
            <td>
              <b>Suite</b>
            </td>
            <td>Tous les dés ont un type différent, sans ❌ (4 dés minimum) : +2 à la valeur de chaque dé.</td>
          </tr>
          <tr>
            <td>
              <b>Sablier</b>
            </td>
            <td>La relique ajoute +0,25 à tous les multiplicateurs de combo.</td>
          </tr>
        </tbody>
      </table>
      <h3>Progression</h3>
      <ul>
        <li>
          <b>Combat</b> : choisissez une face parmi 3 (tirées des récompenses de votre classe) et remplacez la face de votre choix. À partir de
          l’étage 6, les faces proposées gagnent +1 (+2 dès l’étage 11), sauf ✨ et 💢.
        </li>
        <li>
          <b>Face occasionnelle</b> : 15 % de chance qu’une des 3 faces proposées vienne d’une autre classe. Pour l’instant, seul le Guerrier en
          a : 🗡️ Dague et 🧪 Poison.
        </li>
        <li>
          <b>Face rare</b> : après un combat, une des 3 faces proposées peut être remplacée par une face rare de votre classe (15 % de chance,
          40 % contre une élite). Guerrier : 🪓 Fendoir. Mage : 💖 Renaissance. Voleur : ☣️ Venin (qu’il a aussi sur son premier dé au départ).
          Squelette : 💀 Crâne hurlant. Nécromancien : 👑 Couronne de la liche ou 🧌 Charnier.
        </li>
        <li>
          <b>Élite</b> : récompense de face + une relique.
        </li>
        <li>
          <b>Trésor</b> : choisissez 1 relique parmi 3.
        </li>
        <li>
          <b>Feu de camp</b> : soignez 30 % de vos PV max, ou forgez une face (+2, ou +1 pour ✨, 💢 et ☣️, et ❌ devient 🛡️3 ; 💖 ne peut pas être forgée).
          Rarement (12 %), le feu de camp abrite une <b>super forge</b> qui améliore toutes les faces d’un dé d’un coup.
        </li>
        <li>
          Les ennemis normaux gagnent +2 % de PV par étage. Le Dragon ancien attend au 12e étage.
        </li>
      </ul>
    </div>
  );
}

// ---------- States ----------

const STATES: { icon: string; name: string; text: string }[] = [
  {
    icon: '💀',
    name: 'Serviteurs',
    text: 'Alliés du Nécromancien (4 au maximum). À la fin de votre tour, avant les ennemis, chacun attaque la cible 🎯. Votre Force ne s’applique pas à eux. Les ennemis ne les visent pas, sauf avec une attaque de Balayage ou s’ils ont la Garde. Ils disparaissent à la fin du combat.',
  },
  { icon: '🤺', name: 'Garde', text: 'Les attaques ciblées des ennemis frappent ce serviteur à votre place, tant qu’il est debout.' },
  { icon: '🌊', name: 'Balayage', text: 'Attaque ennemie qui touche le joueur et tous ses serviteurs. Les élites et le Dragon en ont une.' },
  { icon: '🛡️', name: 'Armure', text: 'Absorbe les dégâts avant les PV. Celle du joueur disparaît au début de son tour, celle des ennemis au début du leur. Le poison l’ignore.' },
  { icon: '💪', name: 'Force', text: 'Ajoute +1 dégât par point à chaque coup porté (attaque, dague, feu, givre, drain, sorts de dégâts). Dure tout le combat.' },
  {
    icon: '🥀',
    name: 'Faiblesse',
    text: 'Les coups portés font 25 % de dégâts en moins. Perd 1 point à la fin de chaque tour de celui qui la subit : appliquée à un ennemi pendant votre tour, elle affaiblit sa prochaine attaque.',
  },
  {
    icon: '💔',
    name: 'Vulnérable',
    text: 'Les dégâts reçus sont augmentés de 50 %. Sur le joueur, chaque point dure un tour ennemi complet, en commençant par le tour ennemi suivant.',
  },
  {
    icon: '🧪',
    name: 'Poison',
    text: 'Au début de son tour, la victime perd autant de PV que son Poison (l’armure ne protège pas), puis le Poison est divisé par 2, arrondi à l’inférieur. Les applications s’additionnent. Sans recharge, une pile inflige au total environ 2 fois sa valeur de départ.',
  },
  { icon: '🧊', name: 'Gel', text: 'La cible passe sa prochaine action, qui est perdue. Au tour suivant, elle enchaîne sur son action suivante.' },
];

function StatesTab() {
  return (
    <div className="codex-list">
      {STATES.map((st) => (
        <div key={st.name} className="codex-entry">
          <span className="codex-big">{st.icon}</span>
          <div>
            <h4>{st.name}</h4>
            <p>{st.text}</p>
          </div>
        </div>
      ))}
      <h3>Exemple de poison</h3>
      <p className="codex-intro">
        10 Poison sur un ennemi : 10 dégâts au début de son tour, puis 5, 2 et 1, soit 18 dégâts en tout. La pile fond vite : rechargez-la
        souvent. Si vous ajoutez 4 Poison alors qu’il en reste 5, la pile monte à 9. L’<b>Exécution</b> du Voleur inflige 2 × le Poison actuel, sans consommer la pile.
      </p>
    </div>
  );
}

// ---------- Classes & spells ----------

function ClassesTab() {
  return (
    <div className="codex-list">
      <p className="codex-intro">
        Les sorts de dégâts profitent de la Force, de la Faiblesse et de la Vulnérabilité, mais pas des combos.
      </p>
      {Object.values(CLASSES).map((c) => (
        <div key={c.id} className="codex-class">
          <h3>
            {c.emoji} {c.name}
          </h3>
          <div className="class-stats">
            <span>❤️ {c.maxHp} PV</span>
            <span>🎲 {c.diceCount} dés</span>
            <span>🔄 {c.rerolls} relances</span>
            <span>✨ {c.startMana} au départ</span>
          </div>
          <p className="passive">{c.passive}</p>
          <div className="inv-faces">
            {c.die.map((f, i) => (
              <FaceView key={i} face={f} />
            ))}
          </div>
          <StartRareNote classId={c.id} />
          <table className="codex-table">
            <thead>
              <tr>
                <th>Sort</th>
                <th>Coût</th>
                <th>Effet</th>
              </tr>
            </thead>
            <tbody>
              {c.spells.map((id) => (
                <tr key={id}>
                  <td>
                    {SPELLS[id].icon} {SPELLS[id].name}
                  </td>
                  <td>{SPELLS[id].cost} ✨</td>
                  <td>{SPELLS[id].desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="codex-where">
            Faces en récompense :{' '}
            {c.facePool.map((f, i) => (
              <FaceView key={i} face={f} />
            ))}
            {c.crossPool?.length ? (
              <>
                {' '}· occasionnelles :{' '}
                {c.crossPool.map((f, i) => (
                  <FaceView key={`c${i}`} face={f} />
                ))}
              </>
            ) : null}
            {c.rarePool?.length ? (
              <>
                {' '}· rare :{' '}
                {c.rarePool.map((f, i) => (
                  <FaceView key={`r${i}`} face={f} />
                ))}
              </>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}

function RelicsTab() {
  return (
    <div className="codex-list">
      {Object.values(RELICS).map((r) => (
        <div key={r.id} className="codex-entry">
          <span className="codex-big">{r.icon}</span>
          <div>
            <h4>{r.name}</h4>
            <p>{r.desc}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function describeMove(m: Intent): string {
  const parts: string[] = [];
  if (m.dmg !== undefined) parts.push(`⚔️ ${m.dmg}${m.times && m.times > 1 ? `×${m.times}` : ''}`);
  if (m.block) parts.push(`🛡️ ${m.block}`);
  if (m.str) parts.push(`💪 +${m.str}`);
  if (m.heal) parts.push(`💚 ${m.heal}`);
  if (m.weak) parts.push(`🥀 ${m.weak}`);
  if (m.vuln) parts.push(`💔 ${m.vuln}`);
  if (m.poison) parts.push(`🧪 ${m.poison}`);
  if (m.sweep) parts.push('🌊 Balayage');
  return (m.label ? `${m.label} : ` : '') + (parts.join(' ') || 'rien');
}

function EnemiesTab() {
  const tier = (id: string) =>
    ENCOUNTERS.boss.flat().includes(id) ? 'Boss' : ENCOUNTERS.elite.flat().includes(id) ? 'Élite' : 'Normal';
  return (
    <table className="codex-table">
      <thead>
        <tr>
          <th>Ennemi</th>
          <th>Rang</th>
          <th>PV</th>
          <th>Actions ({'cycle = dans l’ordre'})</th>
        </tr>
      </thead>
      <tbody>
        {Object.values(ENEMIES).map((e) => (
          <tr key={e.id}>
            <td>
              {e.emoji} {e.name}
            </td>
            <td>{tier(e.id)}</td>
            <td>{e.hp[0] === e.hp[1] ? e.hp[0] : `${e.hp[0]}–${e.hp[1]}`}</td>
            <td>
              <small>{e.pattern === 'cycle' ? 'cycle' : 'aléatoire'}</small> — {e.moves.map(describeMove).join(' → ')}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const TABS = [
  { id: 'rules', name: '📜 Règles & combos', el: RulesTab },
  { id: 'faces', name: '🎲 Faces', el: FacesTab },
  { id: 'states', name: '🧪 États', el: StatesTab },
  { id: 'classes', name: '🧙 Classes & sorts', el: ClassesTab },
  { id: 'relics', name: '💎 Reliques', el: RelicsTab },
  { id: 'enemies', name: '👹 Ennemis', el: EnemiesTab },
];

export function Codex({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState('rules');
  const Current = TABS.find((t) => t.id === tab)!.el;
  return (
    <Modal title="📖 Codex" onClose={onClose}>
      <div className="tabs">
        {TABS.map((t) => (
          <button key={t.id} className={`tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
            {t.name}
          </button>
        ))}
      </div>
      <Current />
    </Modal>
  );
}

// ---------- My dice ----------

export function DiceModal({ dice, onClose }: { dice: Face[][]; onClose: () => void }) {
  const kinds = FACE_ORDER.filter((k) => dice.some((d) => d.some((f) => f.kind === k)));
  return (
    <Modal title="🎲 Mes dés" onClose={onClose}>
      <div className="inventory">
        {dice.map((faces, di) => (
          <div key={di} className="inv-die">
            <span className="inv-label">Dé {di + 1}</span>
            <div className="inv-faces">
              {faces.map((face, fi) => (
                <FaceView key={fi} face={face} />
              ))}
            </div>
          </div>
        ))}
      </div>
      <h3>Probabilités au premier lancer</h3>
      <table className="codex-table">
        <thead>
          <tr>
            <th>Face</th>
            <th>Nb de faces</th>
            <th>Valeur moyenne</th>
            <th>Au moins 1</th>
            <th>Nb moyen de dés</th>
          </tr>
        </thead>
        <tbody>
          {kinds.map((k) => {
            const all = dice.flatMap((d) => d.filter((f) => f.kind === k));
            const avg = all.reduce((a, f) => a + f.value, 0) / all.length;
            const pNone = dice.reduce((p, d) => p * (1 - d.filter((f) => f.kind === k).length / d.length), 1);
            const expected = dice.reduce((a, d) => a + d.filter((f) => f.kind === k).length / d.length, 0);
            return (
              <tr key={k}>
                <td>
                  {FACE_INFO[k].icon} {FACE_INFO[k].name}
                </td>
                <td>{all.length}</td>
                <td>{hasValue(k) ? avg.toFixed(1) : '—'}</td>
                <td>{Math.round((1 - pNone) * 100)} %</td>
                <td>{expected.toFixed(2)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Modal>
  );
}
