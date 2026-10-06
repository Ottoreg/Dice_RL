import { useState } from 'react';
import { CombatScreen } from './components/CombatScreen';
import { ClassSelect, EndScreen, FaceReward, MapScreen, RestScreen, TitleScreen, TopBar, TreasureScreen } from './components/Screens';
import { createCombat } from './game/combat';
import { addRelic, faceRewards, newRun, pickEncounter, relicChoices, replaceFace, upgradeFace } from './game/run';
import type { CombatState, Face, MapNode, RunState } from './game/types';

type Screen =
  | { kind: 'title' }
  | { kind: 'class' }
  | { kind: 'map' }
  | { kind: 'combat'; combat: CombatState; node: MapNode; key: number }
  | { kind: 'reward'; faces: Face[]; relic: string | null }
  | { kind: 'rest' }
  | { kind: 'treasure'; choices: string[] }
  | { kind: 'end'; won: boolean };

let combatKey = 0;

export default function App() {
  const [screen, setScreen] = useState<Screen>({ kind: 'title' });
  const [run, setRun] = useState<RunState | null>(null);

  const enterNode = (node: MapNode) => {
    if (!run) return;
    const r: RunState = { ...run, floor: node.floor, lane: node.lane };
    setRun(r);
    switch (node.type) {
      case 'combat':
      case 'elite':
      case 'boss':
        setScreen({ kind: 'combat', combat: createCombat(r, pickEncounter(node.type, node.floor)), node, key: ++combatKey });
        break;
      case 'rest':
        setScreen({ kind: 'rest' });
        break;
      case 'treasure':
        setScreen({ kind: 'treasure', choices: relicChoices(r, 3) });
        break;
    }
  };

  const onCombatEnd = (node: MapNode, result: { won: boolean; hp: number; dice: Face[][]; revived: boolean }) => {
    if (!run) return;
    if (!result.won) {
      setRun({ ...run, hp: 0 });
      setScreen({ kind: 'end', won: false });
      return;
    }
    let hp = result.hp;
    if (run.relics.includes('vampFang')) hp = Math.min(run.maxHp, hp + 6);
    // Faces can change during a fight (e.g. 💖 Renaissance turns into ❌).
    const r = { ...run, hp, dice: result.dice, reviveUsed: run.reviveUsed || result.revived };
    setRun(r);
    if (node.type === 'boss') {
      setScreen({ kind: 'end', won: true });
      return;
    }
    const relic = node.type === 'elite' ? (relicChoices(r, 1)[0] ?? null) : null;
    setScreen({ kind: 'reward', faces: faceRewards(r, node.type === 'elite'), relic });
  };

  if (screen.kind === 'title') return <TitleScreen onStart={() => setScreen({ kind: 'class' })} />;
  if (screen.kind === 'class')
    return (
      <ClassSelect
        onPick={(id) => {
          setRun(newRun(id));
          setScreen({ kind: 'map' });
        }}
      />
    );
  if (!run) return null;

  switch (screen.kind) {
    case 'map':
      return <MapScreen run={run} onPick={enterNode} />;
    case 'combat':
      return (
        <div className="screen">
          <TopBar run={run} hideHp />
          <CombatScreen key={screen.key} initial={screen.combat} onEnd={(res) => onCombatEnd(screen.node, res)} />
        </div>
      );
    case 'reward':
      return (
        <FaceReward
          run={run}
          faces={screen.faces}
          relic={screen.relic}
          onDone={({ face, die, slot, relic }) => {
            let r = run;
            if (relic) r = addRelic(r, relic);
            if (face && die !== undefined && slot !== undefined) r = replaceFace(r, die, slot, face);
            setRun(r);
            setScreen({ kind: 'map' });
          }}
        />
      );
    case 'rest':
      return (
        <RestScreen
          run={run}
          onHeal={() => {
            setRun({ ...run, hp: Math.min(run.maxHp, run.hp + Math.round(run.maxHp * 0.3)) });
            setScreen({ kind: 'map' });
          }}
          onUpgrade={(die, slot) => {
            setRun(upgradeFace(run, die, slot));
            setScreen({ kind: 'map' });
          }}
        />
      );
    case 'treasure':
      return (
        <TreasureScreen
          run={run}
          choices={screen.choices}
          onPick={(id) => {
            setRun(id ? addRelic(run, id) : run);
            setScreen({ kind: 'map' });
          }}
        />
      );
    case 'end':
      return (
        <EndScreen
          won={screen.won}
          run={run}
          onRestart={() => {
            setRun(null);
            setScreen({ kind: 'class' });
          }}
        />
      );
  }
}
