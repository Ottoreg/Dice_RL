# 🎲 Dice Dungeon

Prototype de roguelike tour par tour qui mêle le **Yam** (Yahtzee) et les combats à la *Slay the Spire*.

## Le jeu

- Choisissez une classe : **Guerrier** 🪓, **Mage** 🧙 ou **Voleur** 🥷. Chacune a ses PV, son nombre de dés, ses faces de dé, un passif et des sorts.
- Traversez un donjon de 12 étages sur une carte à embranchements (combats, élites, feux de camp, trésors) jusqu'au **Dragon ancien**.
- **Chaque tour** :
  1. Vos dés sont lancés. Leurs faces sont vos actions possibles (⚔️ attaque, 🛡️ défense, ✨ magie, ❤️ soin, 🧪 poison, 🔥 feu…).
  2. Comme au Yam, gardez 🔒 les dés voulus et relancez les autres (2 relances).
  3. Validez : les faces identiques forment des **combos** (Paire ×1.25, Brelan ×1.5, Carré ×1.75, Yam ×2). Un **Full** et une **Double paire** donnent de l'armure, une **Suite** (toutes les faces différentes) ajoute +2 à chaque dé.
  4. Cliquez les dés pour les utiliser sur la cible 🎯, puis dépensez votre mana ✨ en sorts.
  5. Les ennemis jouent l'intention affichée au-dessus d'eux.
- Après chaque combat, choisissez une **nouvelle face** et placez-la sur le dé de votre choix (construction de « deck » via les dés). Les élites et les trésors donnent des **reliques**.

Raccourcis clavier en combat : `1`–`5` garder / utiliser un dé, `R` relancer, `Entrée` valider / finir le tour.

## Lancer en local

Il faut Node.js 20.19+ (ou 22.12+).

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # build de production dans dist/
```

## Déployer sur Vercel

**Option 1 — depuis le site (recommandé)** : sur [vercel.com/new](https://vercel.com/new), importez le dépôt GitHub `ottoreg/dice_rl`, choisissez la branche, puis cliquez sur *Deploy*. Vercel détecte Vite tout seul (build `npm run build`, dossier `dist`).

**Option 2 — en ligne de commande** :

```bash
npm install -g vercel
vercel login
vercel          # déploiement de prévisualisation
vercel --prod   # déploiement en production
```

## Structure

```
src/
  game/        moteur pur (sans React)
    data.ts      classes, faces, sorts, ennemis, reliques
    combat.ts    règles du combat (dés, combos, tours, IA ennemie)
    run.ts       carte du donjon, récompenses, progression
  components/  écrans React (combat, carte, récompenses…)
```
