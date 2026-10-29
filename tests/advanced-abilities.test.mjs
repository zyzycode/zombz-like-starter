import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RunBuild } from '../src/game/core/progression/RunBuild.ts';
import { createPlayer } from '../src/game/core/entities/createPlayer.ts';
import { createEnemy } from '../src/game/core/entities/createEnemy.ts';
import { Player } from '../src/game/core/characters/Player.ts';
import { AbilitySystem } from '../src/game/core/combat/AbilitySystem.ts';
import { ProjectileSystem } from '../src/game/core/combat/ProjectileSystem.ts';
import { RunController } from '../src/game/session/RunController.ts';
import { MetaProgression } from '../src/game/core/meta/MetaProgression.ts';
import { LocalMetaProfileRepository } from '../src/game/session/LocalMetaProfileRepository.ts';

const idle = { up: false, down: false, left: false, right: false, attackPressed: false, attackHeld: false, interactPressed: false, aim: { x: 1000, y: 0 } };
const advanced = ['cleave', 'iceRing', 'secondWind'];
function fixture(ability, stats = {}) {
  const player = createPlayer(); player.position = { x: 0, y: 0 };
  player.applyBuild({ ...new RunBuild().getState().stats, ...stats });
  player.setUnlockedAbilities(advanced);
  player.setAbilityLoadout({ z: ability, x: null, c: null });
  const system = new AbilitySystem(), projectiles = new ProjectileSystem();
  return { player, cast: (enemies = []) => system.update({ player, enemies, projectiles, input: { ...idle, slotZPressed: true } }) };
}
function clearLevel(run) {
  for (let frame = 0; frame < 100 && run.getPhase() === 'playing'; frame++) {
    for (const enemy of run.getWorld().enemies) enemy.hp = 0;
    run.update(100, idle);
  }
  assert.equal(run.getPhase(), 'reward');
}

test('advanced skills require the second branch node and manual assignment; fresh builds remain unchanged', () => {
  const build = new RunBuild(); build.gainXp(10000);
  const initial = build.getState().abilityLoadout;
  for (const [branch, ability] of [['warrior', 'cleave'], ['mage', 'iceRing'], ['survivor', 'secondWind']]) {
    assert.equal(build.learn(`${branch}4`), false);
    assert.equal(build.assignAbility('z', ability), false);
    assert.equal(build.learn(`${branch}1`), true);
    assert.equal(build.learn(`${branch}4`), false);
    assert.equal(build.learn(`${branch}2`), true);
    assert.equal(build.learn(`${branch}4`), true);
    assert.equal(build.learn(`${branch}4`), false);
    assert.ok(build.getState().unlockedAbilities.includes(ability));
    assert.deepEqual(build.getState().abilityLoadout, initial);
  }
  assert.equal(build.assignAbility('x', 'iceRing'), true);
  assert.equal(build.getState().abilityLoadout.x, 'iceRing');
  assert.deepEqual(new RunBuild().getState().unlockedAbilities, []);
});

test('cleave is an aimed narrow physical sector with elite armor and one-shot resource use', () => {
  const { player, cast } = fixture('cleave');
  const front = createEnemy('front', 160, 0); front.hp = 500;
  const armored = createEnemy('armored', 160, 0, 'grunt', 'armored');
  const side = createEnemy('side', 80, 150), rear = createEnemy('rear', -100, 0), far = createEnemy('far', 300, 0);
  const armorHp = armored.hp;
  cast([front, armored, side, rear, far]); cast([front, armored, side, rear, far]);
  assert.ok(Math.abs(front.hp - 390) < 1e-8);
  assert.ok(Math.abs(armored.hp - (armorHp - 110 * .65)) < 1e-8);
  for (const excluded of [side, rear, far]) assert.equal(excluded.hp, excluded.maxHp);
  assert.equal(front.stunRemainingMs, 0);
  assert.equal(player.getAbilities().cleaveDirection, 'right');
  assert.equal(player.getAbilities().cleaveCooldownMs, 6500);
  assert.equal(player.getAbilities().cleavePulse, 1);
  assert.equal(player.getAbilities().mana, 65);
});

test('ice ring deals no damage, controls every direction and applies gear before boss resistance', () => {
  const { player, cast } = fixture('iceRing', { spellPower: 3, stunDurationBonus: .5, cooldownReduction: .4 });
  const front = createEnemy('front', 100, 0), rear = createEnemy('rear', -100, 0), boss = createEnemy('boss', 0, 140, 'boss');
  const far = createEnemy('far', 300, 0), dead = createEnemy('dead', 0, 0), friend = createEnemy('friend', 0, 0);
  dead.hp = 0; friend.team = 'player';
  cast([front, rear, boss, far, dead, friend]);
  for (const enemy of [front, rear, boss, far, friend]) assert.equal(enemy.hp, enemy.maxHp);
  assert.equal(front.stunRemainingMs, 2700);
  assert.equal(rear.stunRemainingMs, 2700);
  assert.equal(boss.stunRemainingMs, 675);
  for (const enemy of [far, dead, friend]) assert.equal(enemy.stunRemainingMs, 0);
  assert.equal(player.getAbilities().iceRingCooldownMs, 6600);
  assert.equal(player.getAbilities().mana, 55);
});

test('second wind rejects full mana freely, restores a capped fraction without healing, and respects recovery gear', () => {
  for (const [mana, expected] of [[0, 40], [80, 100]]) {
    const { player, cast } = fixture('secondWind', { cooldownReduction: .4 });
    player.hp = 30;
    const full = player.toState(); cast();
    assert.deepEqual(player.toState(), full);
    const state = player.toState(); state.abilities.mana = mana; player.applyResolvedState(state);
    cast(); cast();
    assert.equal(player.hp, 30);
    assert.equal(player.getAbilities().mana, expected);
    assert.equal(player.getAbilities().secondWindCooldownMs, 10800);
    assert.equal(player.getAbilities().secondWindPulse, 1);
  }
});

test('advanced skills require an assigned unlocked slot and live actionable player; old ability snapshots normalize', () => {
  for (const ability of advanced) {
    for (const rejection of ['locked', 'unassigned', 'dead', 'stun', 'dodge']) {
      const { player, cast } = fixture(ability);
      if (rejection === 'locked') player.setUnlockedAbilities([]);
      if (rejection === 'unassigned') player.setAbilityLoadout({ z: null, x: null, c: null });
      const state = player.toState(); state.abilities.mana = 50;
      if (rejection === 'dead') state.hp = 0;
      if (rejection === 'stun') state.stunRemainingMs = 100;
      if (rejection === 'dodge') state.abilities.dodgeRemainingMs = 100;
      player.applyResolvedState(state);
      const before = player.toState(); cast();
      assert.deepEqual(player.toState(), before, `${ability}: ${rejection}`);
    }
  }
  const old = createPlayer().toState();
  for (const ability of advanced) {
    delete old.abilities[`${ability}CooldownMs`]; delete old.abilities[`${ability}Pulse`];
  }
  delete old.abilities.cleaveDirection;
  const player = new Player(old);
  for (const ability of advanced) {
    assert.equal(player.getAbilities()[`${ability}CooldownMs`], 0);
    assert.equal(player.getAbilities()[`${ability}Pulse`], 0);
  }
  assert.equal(player.getAbilities().cleaveDirection, old.direction);
});

test('learned advanced loadout and cooldown survive the next arena', async () => {
  const run = new RunController(new MetaProgression(new LocalMetaProfileRepository({ getItem: () => null, setItem() {} })));
  await run.startRun(); clearLevel(run);
  await run.chooseReward(run.getState().rewards[0].id);
  clearLevel(run);
  run.learn('warrior1'); run.learn('warrior2'); run.learn('warrior4');
  assert.ok(run.getState().build.unlockedAbilities.includes('cleave'));
  run.assignAbility('c', 'cleave');
  assert.equal(run.getWorld().player.cast('cleave'), true);
  const before = run.getState();
  await run.chooseReward(before.rewards[0].id);
  assert.equal(run.getState().depth, 3);
  assert.equal(run.getState().world.runSession.runId, before.world.runSession.runId);
  assert.equal(run.getWorld().player.getSlotAbility('c'), 'cleave');
  assert.equal(run.getWorld().player.getAbilities().cleaveCooldownMs, before.world.player.abilities.cleaveCooldownMs);
});
