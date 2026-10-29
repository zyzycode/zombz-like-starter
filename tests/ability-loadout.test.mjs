import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RunBuild } from '../src/game/core/progression/RunBuild.ts';
import { createPlayer } from '../src/game/core/entities/createPlayer.ts';
import { createEnemy } from '../src/game/core/entities/createEnemy.ts';
import { AbilitySystem } from '../src/game/core/combat/AbilitySystem.ts';
import { ProjectileSystem } from '../src/game/core/combat/ProjectileSystem.ts';
import { RunController } from '../src/game/session/RunController.ts';
import { MetaProgression } from '../src/game/core/meta/MetaProgression.ts';
import { LocalMetaProfileRepository } from '../src/game/session/LocalMetaProfileRepository.ts';

const initial = { z: 'whirlwind', x: 'frostWave', c: 'mend' };
const idle = { up: false, down: false, left: false, right: false, attackPressed: false, attackHeld: false, interactPressed: false, aim: { x: 1000, y: 0 } };
function clearLevel(run) {
  for (let frame = 0; frame < 100 && run.getPhase() === 'playing'; frame++) {
    for (const enemy of run.getWorld().enemies) enemy.hp = 0;
    run.update(100, idle);
  }
  assert.equal(run.getPhase(), 'reward');
}

test('loadout assignment validates unlocks, swaps existing assignments and preserves empty slots', () => {
  const build = new RunBuild();
  assert.deepEqual(build.getState().abilityLoadout, initial);
  assert.equal(build.assignAbility('x', 'whirlwind'), false);
  assert.equal(build.assignAbility('unknown', null), false);
  build.gainXp(1000);
  build.learn('warrior1'); build.learn('warrior3');
  assert.equal(build.assignAbility('x', 'whirlwind'), true);
  assert.deepEqual(build.getState().abilityLoadout, { z: 'frostWave', x: 'whirlwind', c: 'mend' });
  assert.equal(build.assignAbility('x', 'whirlwind'), false);
  assert.equal(build.assignAbility('z', null), true);
  assert.equal(build.assignAbility('z', 'whirlwind'), true);
  assert.deepEqual(build.getState().abilityLoadout, { z: 'whirlwind', x: null, c: 'mend' });
  assert.equal(build.assignAbility('x', 'frostWave'), false, 'moving an unlearned ability stays forbidden');
  const snapshot = build.getState(); snapshot.abilityLoadout.z = null;
  assert.equal(build.getState().abilityLoadout.z, 'whirlwind');
  assert.deepEqual(new RunBuild().getState().abilityLoadout, initial);
});

test('slot input casts the assigned skill, while empty or unassigned skills cannot spend resources', () => {
  const player = createPlayer(); player.position = { x: 0, y: 0 }; player.hp = 50;
  player.setUnlockedAbilities(['whirlwind', 'frostWave', 'mend']);
  const loadout = { z: 'mend', x: 'whirlwind', c: null };
  player.setAbilityLoadout(loadout); loadout.z = null;
  const system = new AbilitySystem(), projectiles = new ProjectileSystem();
  const target = createEnemy('target', 60, 0);
  const cast = input => system.update({ player, projectiles, enemies: [target], input: { ...idle, ...input } });
  cast({ slotZPressed: true });
  assert.equal(player.hp, 85);
  assert.equal(player.getAbilities().mendPulse, 1);
  assert.equal(player.getAbilities().whirlwindPulse, 0);
  cast({ slotXPressed: true });
  assert.equal(target.hp, 25);
  assert.equal(player.getAbilities().whirlwindPulse, 1);
  assert.equal(player.getAbilities().frostWavePulse, 0);
  const before = player.toState();
  cast({ slotCPressed: true });
  assert.equal(player.cast('frostWave'), false);
  assert.deepEqual(player.toState(), before);
});

test('session guards assignments, carries slot choices and ability cooldown across levels, and resets a new run', async () => {
  const run = new RunController(new MetaProgression(new LocalMetaProfileRepository({ getItem: () => null, setItem() {} })));
  await run.startRun();
  run.assignAbility('z', null);
  assert.deepEqual(run.getState().build.abilityLoadout, initial);
  clearLevel(run);
  run.learn('warrior1'); run.learn('warrior3');
  run.assignAbility('c', 'whirlwind');
  const loadout = { z: 'mend', x: 'frostWave', c: 'whirlwind' };
  assert.deepEqual(run.getState().build.abilityLoadout, loadout);
  assert.equal(run.getWorld().player.getSlotAbility('c'), 'whirlwind');
  assert.equal(run.getWorld().player.cast('whirlwind'), true);
  const cooldown = run.getWorld().player.getAbilities().whirlwindCooldownMs;
  run.assignAbility('x', 'whirlwind');
  assert.equal(run.getWorld().player.getAbilities().whirlwindCooldownMs, cooldown);
  run.assignAbility('c', 'whirlwind');
  run.exploreArena();
  run.assignAbility('c', null);
  assert.deepEqual(run.getState().build.abilityLoadout, loadout);
  run.finishExploration();
  await run.chooseReward(run.getState().rewards[0].id);
  assert.deepEqual(run.getState().build.abilityLoadout, loadout);
  assert.equal(run.getWorld().player.getSlotAbility('c'), 'whirlwind');
  assert.equal(run.getWorld().player.getAbilities().whirlwindCooldownMs, cooldown);
  run.assignAbility('c', null);
  assert.equal(run.getWorld().player.getSlotAbility('c'), 'whirlwind');
  run.togglePause(); run.assignAbility('c', null);
  assert.equal(run.getWorld().player.getSlotAbility('c'), null);
  assert.equal(run.getWorld().player.getAbilities().whirlwindCooldownMs, cooldown);
  assert.equal(run.getWorld().player.cast('whirlwind'), false);
  run.returnToMenu(); await run.startRun();
  assert.deepEqual(run.getState().build.abilityLoadout, initial);
  assert.equal(run.getWorld().player.getAbilities().whirlwindCooldownMs, 0);
  assert.equal(run.getWorld().player.cast('whirlwind'), false);
});
