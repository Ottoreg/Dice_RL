# 🧟 Nécromancien — fiche de conception

Statut : **implémenté**. Choix retenus :
- Les ennemis ne visent que le joueur, sauf un serviteur avec Garde. Les élites et le Dragon ont une attaque de Balayage.
- 4 serviteurs au maximum.
- La Force du joueur ne s'applique pas aux serviteurs.
- Les serviteurs ne sont pas conservés entre les combats.

Réglages d'équilibrage par rapport à la proposition initiale :
- Les Squelettes infligent X dégâts au lieu de X/2.
- 56 PV au lieu de 48.
- Dé de départ : le ❌ est remplacé par 🛡️5 et 🛡️4 passe à 🛡️5.
- Moisson rend aussi 3 PV par serviteur détruit.
- Le Chevalier mort se relève avec un Carré d'Invocation (au lieu d'un Yam, impossible avec 4 dés).

## Fantasme de jeu

Un lanceur fragile qui ne se bat presque jamais lui-même : ses dés relèvent des **serviteurs** qui frappent à sa place, encaissent pour lui et explosent au bon moment. Plus le combat dure, plus son armée grossit.

## Fiche de classe

| | |
|---|---|
| PV | 56 |
| Dés | 4 |
| Relances | 2 |
| Mana | 1 au départ, rien par tour |
| Passif **Moisson** | Chaque ennemi tué relève gratuitement un 💀 Squelette (3 PV, 2 dégâts). Chaque serviteur détruit vous rend 1 ✨ mana et 3 PV. |

Dé de départ (×4) : 🪦4 · 🪦4 · ⚔️4 · 🛡️5 · ✨2 · 🛡️5

## Les serviteurs

Un serviteur a des **PV**, des **dégâts** et peut avoir des **mots-clés**. Il reste jusqu'à la fin du combat ou jusqu'à sa destruction. Il n'est pas conservé d'un combat à l'autre.

| Serviteur | Origine | PV | Dégâts | Mot-clé |
|---|---|---|---|---|
| 💀 Squelette | Face 🪦 Invocation, passif Moisson | valeur de la face | valeur de la face (2 via Moisson) | — |
| 🤺 Chevalier mort | Carré d'Invocation, ou sort Pacte | 14 | 5 | **Garde** : les attaques ciblées le frappent à la place du joueur |
| 🧌 Goule | Rare : face 🧌 Charnier | 6 | 3 | **Vorace** : se soigne de 2 à chaque coup porté |

- **Limite** : 4 serviteurs sur le plateau. Une invocation en trop donne à la place +X PV au serviteur le plus faible.
- **Tour des serviteurs** : après « Fin du tour » et avant les ennemis, chaque serviteur attaque la cible 🎯, dans l'ordre d'invocation. Il y a une animation de charge vers l'ennemi.
- **Combos** : ils marchent normalement. Un Brelan de 🪦4 relève 3 Squelettes de 6 PV (4 × 1,5), qui frappent pour 6. Un **Carré d'Invocation** relève en plus un Chevalier mort.
- **Force** : la Force du joueur ne s'applique **pas** aux serviteurs, sinon ils deviendraient trop forts avec Cri de guerre ou la Rage.

### Qui les ennemis attaquent-ils ? (option 1 retenue)

C'est la décision qui change le plus le ressenti :

1. **Le joueur seulement**, sauf s'il y a un serviteur avec **Garde**. Les serviteurs ne meurent que par les attaques de zone ou par le sacrifice. C'est simple, lisible et facile à équilibrer. **Recommandé.**
2. **Au hasard** entre le joueur et ses serviteurs, avec l'intention qui affiche la cible. C'est plus vivant, mais moins contrôlable.
3. **Toujours le serviteur le plus en avant**, comme un mur. C'est très fort, et il faudrait sans doute baisser les PV des serviteurs.

Avec l'option 1, il faut des intentions ennemies **« Balayage »** qui frappent le joueur et tous les serviteurs. On en ajouterait aux élites et au Dragon (le Souffle de feu toucherait tout le monde).

## Faces

| Face | Effet | Où |
|---|---|---|
| 🪦 Invocation X | Relève un Squelette (X PV, X dégâts) | Départ, récompenses (5, 6) |
| 🪦 Exhumer X | Soigne X PV à tous les serviteurs. S'il n'y en a aucun, relève un Squelette de X/2 PV | Récompenses (4) |
| 👻 Hantise X | Inflige X dégâts à la cible + 1 dégât par serviteur | Récompenses (4) |
| ⚔️ 🛡️ ✨ 🩸 ❤️ | Comme les autres classes | Départ, récompenses |
| **Rare** 👑 Couronne de la liche | Tous les serviteurs gagnent +2 dégâts pour le combat | Récompense rare uniquement |
| **Rare** 🧌 Charnier | Relève une 🧌 Goule | Récompense rare uniquement |

## Sorts

| Sort | Coût | Effet |
|---|---|---|
| 💥 Explosion de cadavre | 2 ✨ | Sacrifie le serviteur le plus faible : inflige ses PV actuels en dégâts à tous les ennemis (et rend 1 ✨ grâce à Moisson). |
| 📯 Commandement | 2 ✨ | Tous les serviteurs attaquent immédiatement, en plus de leur attaque de fin de tour. |
| 🩸 Pacte | 3 ✨ | Perd 6 PV : relève un ⚔️ Chevalier mort. |

## Interface

- **Rangée des serviteurs** entre les ennemis et la zone du joueur : petites cartes avec emoji, barre de PV, dégâts, mot-clé, et une étiquette « Garde » visible.
- Les animations existantes servent aussi aux serviteurs (entaille, bouclier, soin). On ajoute une **apparition** (le serviteur sort du sol) et une **destruction** (il tombe en os).
- Le bandeau affiche « Tour des serviteurs… » avant « Tour des ennemis… ».
- Les intentions ennemies « Balayage » ont une icône dédiée 🌊.

## Changements techniques

1. **Types** : `Minion { uid, kind, hp, maxHp, dmg, block, keywords }`, `CombatState.minions`. Les cibles d'animation et de texte flottant acceptent un serviteur (`'player' | enemyUid | 'm' + minionUid`).
2. **Moteur** (`combat.ts`) :
   - `summon()` (avec la limite de 4) ;
   - une nouvelle étape `minionsAct()` entre `endPlayerTurn` et `beginEnemyTurn` ;
   - le choix de cible des ennemis (Garde, Balayage) ;
   - la mort des serviteurs (passif Moisson), les 3 sorts et les nouvelles faces.
3. **Écran de combat** : la rangée de serviteurs et une étape de plus dans l'enchaînement du tour.
4. **Données** : la classe, les faces, les sorts, les intentions « Balayage » pour les élites et le boss.
5. **Codex** : un onglet ou une section « Serviteurs », et les nouvelles faces (généré à partir des données, comme le reste).
6. **Équilibrage** : apprendre au bot de simulation à invoquer, puis viser un taux de victoire proche des autres classes (35–50 %).

Estimation : c'est le plus gros ajout depuis le prototype, environ deux fois le travail du Squelette. L'essentiel est dans le moteur (étape des serviteurs et ciblage).

## Pistes pour plus tard

- Garder 1 Squelette d'un combat à l'autre, pour donner un sentiment d'armée qui grandit pendant la partie.
- Des reliques propres aux serviteurs (+1 PV à chaque invocation, Garde sur le premier serviteur, etc.).
