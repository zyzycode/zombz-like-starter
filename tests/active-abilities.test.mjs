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

const idle = { up: false, down: false, left: false, right: false, attackPressed: false, attackHeld: false, interactPressed: false, aim: { x: 1000, y: 0 } };
const abilities = ['whirlwind', 'frostWave', 'mend'];
function combatFixture() {
  const player = createPlayer();
  player.position = { x: 0, y: 0 };
  const system = new AbilitySystem(), projectiles = new ProjectileSystem();
  return { player, cast: (input, enemies = []) => system.update({ player, enemies, projectiles, input: { ...idle, ...input } }) };
}
function clearLevel(run) {
  for (let frame = 0; frame < 100 && run.getPhase() === 'playing'; frame++) {
    for (const enemy of run.getWorld().enemies) enemy.hp = 0;
    run.update(100, idle);
  }
  assert.equal(run.getPhase(), 'reward');
}

test('active skills require branch prerequisites and points, cannot rank twice, and reset with a fresh build', () => {
  const build = new RunBuild();
  assert.equal(build.learn('warrior3'), false);
  build.gainXp(1000);
  for (const branch of ['warrior', 'mage', 'survivor']) {
    assert.equal(build.learn(`${branch}3`), false);
    assert.equal(build.learn(`${branch}1`), true);
    const points = build.getState().skillPoints;
    assert.equal(build.learn(`${branch}3`), true);
    assert.equal(build.getState().skillPoints, points - 1);
    assert.equal(build.learn(`${branch}3`), false);
  }
  assert.deepEqual([...build.getState().unlockedAbilities].sort(), [...abilities].sort());
  const state = build.getState(); state.unlockedAbilities.length = 0;
  assert.equal(build.getState().unlockedAbilities.length, 3);
  assert.deepEqual(new RunBuild().getState().unlockedAbilities, []);
});

test('whirlwind hits around the wearer once, while frost is aimed and stuns surviving targets', () => {
  const whirl = combatFixture(); whirl.player.setUnlockedAbilities(['whirlwind']);
  const front = createEnemy('front', 60, 0), back = createEnemy('back', -60, 0), far = createEnemy('far', 300, 0);
  whirl.cast({ whirlwindPressed: true }, [front, back, far]);
  whirl.cast({ whirlwindPressed: true }, [front, back, far]);
  assert.equal(front.hp, 25); assert.equal(back.hp, 25); assert.equal(far.hp, 100);
  assert.equal(whirl.player.getAbilities().mana, 70);
  assert.equal(whirl.player.getAbilities().whirlwindCooldownMs, 4000);
  assert.equal(whirl.player.getAbilities().whirlwindPulse, 1);

  const frost = combatFixture(); frost.player.setUnlockedAbilities(['frostWave']);
  const target = createEnemy('target', 150, 0), rear = createEnemy('rear', -80, 0), boss = createEnemy('boss', 100, 0, 'boss');
  frost.cast({ frostWavePressed: true }, [target, rear, boss]);
  assert.equal(target.hp, 60); assert.equal(target.stunRemainingMs, 800);
  assert.equal(rear.hp, 100); assert.equal(rear.stunRemainingMs, 0);
  assert.equal(boss.hp, boss.maxHp - 40); assert.equal(boss.stunRemainingMs, 200);
  assert.equal(frost.player.getAbilities().frostWaveDirection, 'right');
  assert.equal(frost.player.getAbilities().mana, 70);
  assert.equal(frost.player.getAbilities().frostWaveCooldownMs, 7000);
});

test('locked or unaffordable active abilities and dodge, stun or death cannot consume resources', () => {
  for (const ability of abilities) {
    for (const rejection of ['locked', 'mana', 'dodge', 'stun', 'dead']) {
      const { player, cast } = combatFixture(); player.hp = 10;
      if (rejection !== 'locked') player.setUnlockedAbilities(abilities);
      const state = player.toState();
      if (rejection === 'mana') state.abilities.mana = 0;
      if (rejection === 'dodge') state.abilities.dodgeRemainingMs = 100;
      if (rejection === 'stun') state.stunRemainingMs = 100;
      if (rejection === 'dead') state.hp = 0;
      player.applyResolvedState(state);
      const before = player.toState();
      cast({ [`${ability}Pressed`]: true });
      assert.deepEqual(player.toState(), before, `${ability}: ${rejection}`);
    }
  }
});

test('mend restores 35 percent maximum HP with a cap; full health is a free rejection', () => {
  const full = combatFixture(); full.player.setUnlockedAbilities(['mend']);
  const before = full.player.toState(); full.cast({ mendPressed: true });
  assert.deepEqual(full.player.toState(), before);
  for (const [health, expected] of [[10, 45], [90, 100]]) {
    const { player, cast } = combatFixture(); player.setUnlockedAbilities(['mend']); player.hp = health;
    cast({ mendPressed: true }); cast({ mendPressed: true });
    assert.equal(player.hp, expected);
    assert.equal(player.getAbilities().mana, 55);
    assert.equal(player.getAbilities().mendCooldownMs, 12000);
    assert.equal(player.getAbilities().mendPulse, 1);
  }
});

test('campaign learns actives, carries cooldown across levels, freezes on pause/hit-stop and resets on restart', async () => {
  const meta = new MetaProgression(new LocalMetaProfileRepository({ getItem: () => null, setItem() {} }));
  const run = new RunController(meta); await run.startRun(); clearLevel(run);
  run.learn('warrior1'); run.learn('warrior3');
  assert.ok(run.getState().build.unlockedAbilities.includes('whirlwind'));
  const oldWorld = run.getWorld();
  assert.equal(oldWorld.player.cast('whirlwind'), true);
  await run.chooseReward(run.getState().rewards[0].id);
  assert.equal(run.getWorld().player.getAbilities().whirlwindCooldownMs, 4000);
  assert.ok(run.getState().build.unlockedAbilities.includes('whirlwind'));
  run.togglePause(); run.update(100, idle);
  assert.equal(run.getWorld().player.getAbilities().whirlwindCooldownMs, 4000);
  run.togglePause(); run.getWorld().hitStopRemainingMs = 100; run.update(32, idle);
  assert.equal(run.getWorld().player.getAbilities().whirlwindCooldownMs, 4000);
  run.getWorld().hitStopRemainingMs = 0;
  const steps = [], world = run.getWorld(), update = world.update.bind(world);
  world.update = (deltaMs, input) => { steps.push(input); update(deltaMs, input); };
  run.update(100, { ...idle, whirlwindPressed: true, frostWavePressed: true, mendPressed: true });
  assert.ok(steps.length > 1);
  for (const ability of abilities) {
    assert.equal(steps[0][`${ability}Pressed`], true);
    assert.ok(steps.slice(1).every(input => input[`${ability}Pressed`] === false));
  }
  const state = world.player.toState(); state.abilities.whirlwindCooldownMs = 0;
  world.player.applyResolvedState(state);
  assert.equal(world.player.cast('whirlwind'), true, 'new world received the learned unlock');
  world.player.hp = 0; run.update(16, idle);
  assert.equal(run.getPhase(), 'lost');
  await run.startRun();
  assert.deepEqual(run.getState().build.unlockedAbilities, []);
  assert.equal(run.getWorld().player.getAbilities().whirlwindCooldownMs, 0);
  assert.equal(run.getWorld().player.cast('whirlwind'), false);
});
