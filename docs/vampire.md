# 🧛 Vampire — fiche de conception

Statut : **proposition, pas encore implémentée**. Les points marqués ❓ sont à trancher avant le développement.

## Fantasme de jeu

Un prédateur qui vit sur le fil : il n'a **pas de mana**, il paie ses sorts avec son propre sang et se soigne en drainant ses proies. Plus il est blessé, plus il devient dangereux, mais un tour raté peut lui coûter la vie.

## Fiche de classe

| | |
|---|---|
| PV | 60 |
| Dés | 4 |
| Relances | 2 |
| Mana | **aucun** : ses sorts coûtent des PV (voir ❓ Ressource) |
| Passif **Soif** | Sous 50 % de ses PV max, il gagne +3 Force. Il la perd dès qu'il repasse au-dessus. |
| Malédiction **Mort-vivant** | Les faces ❤️ Soin lui font **perdre** leurs PV au lieu de les rendre. Il ne doit pas en avoir sur ses dés. |

Dé de départ (×4) : 🩸5 · 🩸5 · ⚔️5 · 🦇3 · 🛡️4 · 🛡️4

Pas de ✨ : sans mana, ces faces ne lui servent à rien. Elles disparaissent de ses récompenses.

## Faces

| Face | Effet | Où |
|---|---|---|
| 🩸 Drain X | Inflige X dégâts et soigne la moitié des PV retirés (face existante) | Départ, récompenses (6, 7) |
| 🦇 Nuée X | Inflige X dégâts à tous les ennemis et soigne 1 PV par ennemi touché | Départ, récompenses (4) |
| 🌑 Morsure X | Inflige X dégâts et applique X/2 **Saignement** (nouvel état, voir plus bas) | Récompenses (4) |
| ⚔️ 🛡️ | Comme les autres classes | Départ, récompenses |
| **Rare** 🌑 Étreinte X | Comme un Drain, mais soigne **100 %** des PV retirés | Récompense rare uniquement |
| **Rare** 🍷 Calice X | Gagne X PV max pour le reste de la partie, une seule fois : la face devient ❌ ensuite (comme la 💖 Renaissance) | Récompense rare uniquement |

### Nouvel état : 🩸 Saignement
Quand une cible qui saigne **attaque**, elle perd autant de PV que son Saignement, puis le Saignement baisse de moitié, comme le poison.

C'est une version offensive du poison : elle punit les ennemis agressifs plutôt que d'agir avec le temps.

❓ Faut-il cet état, ou faire de Morsure un simple « dégâts + Faiblesse » pour ne pas ajouter de règle ?

## Sorts (payés en PV)

| Sort | Coût | Effet |
|---|---|---|
| 🩸 Saignée | 6 PV | Inflige 18 dégâts à la cible. |
| 🌫️ Forme de brume | 5 PV | La prochaine attaque ennemie ce tour-ci ne vous touche pas. |
| 🦇 Festin | 4 PV | Vos 🩸 Drain et 🦇 Nuée de ce tour soignent le double. |

- Un sort qui vous tuerait ne peut pas être lancé : il faut garder au moins 1 PV.
- Avec Soif, Saignée inflige 18 + 3 de Force. Le sort coûte cher mais fait d'autant plus mal que vous êtes bas.

## ❓ Ressource : payer en PV, ou une jauge de Sang ?

1. **PV directs** : c'est ce qui est décrit ci-dessus. C'est très tendu et très lisible (« je paie ma vie »), et ça s'accorde avec Soif, puisque se blesser volontairement active le bonus. Le risque : la classe est dure à prendre en main et suicidaire pour un débutant. **Recommandé**, c'est le plus original.
2. **Jauge de Sang** : chaque PV drainé remplit une jauge (max 20), et les sorts coûtent du Sang au lieu des PV. C'est plus sûr et plus facile à équilibrer, mais ça ressemble à du mana renommé.

## Interactions à prévoir

- **Reliques** :
  - 🔮 Cristal de mana devient « +2 PV par tour » pour le Vampire, ou il ne le trouve plus.
  - 🧛 Croc de vampire va naturellement avec lui.
  - 🪨 Pierre à aiguiser pourrait aussi compter les 🩸.
- **Feu de camp** : le repos le soigne normalement. Seules les faces ❤️ le blessent, pas le repos.
- **Faces occasionnelles** : il pourrait recevoir parfois 🗡️ Dague (Force × 2 avec Soif). ❓ À confirmer.
- **Codex** : ajouter l'état Saignement (si retenu), la règle Mort-vivant et les sorts payés en PV.

## Changements techniques

1. **Données** : la classe, les faces (Nuée, Morsure, Étreinte, Calice), les sorts, et un champ « coût en PV » sur les sorts.
2. **Moteur** :
   - lancement des sorts payés en PV ;
   - Soif, recalculée après chaque changement de PV ;
   - soins inversés pour ❤️ ;
   - état Saignement (si retenu) ;
   - Forme de brume (une esquive pour la prochaine attaque) ;
   - Festin (multiplicateur de soin pour le tour).
3. **Interface** :
   - le coût des sorts affiché en ❤️ au lieu de ✨ ;
   - pas de ligne Mana pour le Vampire ;
   - un indicateur de Soif sur la carte du joueur (halo rouge sous 50 %) ;
   - un état « brume » sur le joueur.
4. **Équilibrage** : bot de simulation (il doit éviter les sorts quand ses PV sont bas), avec la même cible que les autres classes (35–50 % au bot).

Estimation : plus léger que le Nécromancien (pas de nouvelles entités à l'écran), proche du travail du Squelette.

## Questions ouvertes

- ❓ Ressource : PV directs (recommandé) ou jauge de Sang ?
- ❓ Saignement : nouvel état, ou Morsure = dégâts + Faiblesse ?
- ❓ Soif à +3 Force sous 50 % : ou plutôt un bonus qui grandit (+1 Force par tranche de 10 PV manquants) ?
- ❓ Faces ❤️ qui blessent : on les garde comme piège, ou on les retire simplement de ses récompenses ?
