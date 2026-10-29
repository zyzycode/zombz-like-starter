import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RunBuild } from '../src/game/core/progression/RunBuild.ts';
import { createPlayer } from '../src/game/core/entities/createPlayer.ts';
import { createEnemy } from '../src/game/core/entities/createEnemy.ts';
import { AttackController } from '../src/game/core/combat/AttackController.ts';
import { AbilitySystem } from '../src/game/core/combat/AbilitySystem.ts';
import { ProjectileSystem } from '../src/game/core/combat/ProjectileSystem.ts';

const idle = { up: false, down: false, left: false, right: false, attackPressed: false, attackHeld: false, interactPressed: false, aim: { x: 1000, y: 0 } };
const baseStats = () => new RunBuild().getState().stats;
const update = (player, deltaMs, input = idle) => player.update({ input, deltaMs, attackController: new AttackController(), onHit() {}, resolvePosition: position => position });

test('generated properties scale, cap after stacking, and equipment previews match removal', () => {
  let roll = 0, middleTemplate = false;
  const build = new RunBuild({}, () => ++roll % 2 ? 0 : middleTemplate ? .5 : 0);
  assert.equal(build.getState().stats.cooldownReduction, 0);
  assert.equal(build.getState().stats.stunDurationBonus, 0);
  const take = (depth, slot) => {
    const item = build.createRewards(depth).find(candidate => candidate.slot === slot);
    assert.ok(build.claimReward(item.id));
    return item;
  };
  const blade = take(9, 'weapon'), seal = take(9, 'charm');
  assert.equal(blade.definitionId, 'weapon-guard-blade');
  assert.equal(seal.definitionId, 'charm-iron-seal');
  assert.equal(blade.bonuses.stunDurationBonus, .5);
  assert.equal(seal.bonuses.stunDurationBonus, .4);
  assert.equal(build.getState().stats.stunDurationBonus, .5);
  middleTemplate = true;
  const robe = take(9, 'armor'), circlet = take(10, 'helmet');
  assert.equal(robe.definitionId, 'armor-ash-robe');
  assert.equal(circlet.definitionId, 'helmet-ember-circlet');
  assert.equal(robe.bonuses.cooldownReduction, .3);
  assert.equal(circlet.bonuses.cooldownReduction, .22);
  const capped = build.getState();
  assert.equal(capped.stats.cooldownReduction, .4);
  const removal = capped.equipmentPreviews.unequip.armor;
  assert.equal(removal.stats.cooldownReduction, .22);
  assert.equal(removal.delta.cooldownReduction, -.18);
  build.unequip('armor');
  assert.deepEqual(build.getState().stats, removal.stats);
  assert.equal(build.getState().inventory.length, 4);
  const replacement = build.getState().equipmentPreviews.equip[robe.id];
  build.equip(robe.id);
  assert.deepEqual(build.getState().stats, replacement.stats);
  build.unequip('weapon');
  assert.equal(build.getState().stats.stunDurationBonus, .4);
  build.unequip('charm');
  build.unequip('armor');
  build.unequip('helmet');
  assert.deepEqual(build.getState().stats, baseStats());
});

test('recovery affects newly cast spells only, leaves mana costs and ticking intact, and excludes dodge', () => {
  for (const [spell, duration, cost] of [
    ['firebolt', 550, 20], ['nova', 4500, 40], ['shieldBash', 6000, 25],
    ['whirlwind', 4000, 30], ['frostWave', 7000, 30], ['mend', 12000, 45],
  ]) {
    const player = createPlayer();
    player.setUnlockedAbilities(['whirlwind', 'frostWave', 'mend']);
    player.applyBuild({ ...baseStats(), cooldownReduction: .25 });
    player.hp = 50;
    assert.equal(player.cast(spell), true);
    const key = `${spell}CooldownMs`, remaining = Math.round(duration * .75);
    assert.equal(player.getAbilities()[key], remaining);
    assert.equal(player.getAbilities().mana, 100 - cost);
    const afterCast = player.toState();
    assert.equal(player.cast(spell), false);
    assert.deepEqual(player.toState(), afterCast);
    player.applyBuild(baseStats(), 'preserve-current');
    assert.equal(player.getAbilities()[key], remaining, 'removing gear keeps the active timer');
    player.applyBuild({ ...baseStats(), cooldownReduction: .4 }, 'preserve-current');
    assert.equal(player.getAbilities()[key], remaining, 'equipping gear does not shorten an active timer');
    update(player, 100);
    assert.equal(player.getAbilities()[key], remaining - 100);
    update(player, remaining);
    const depleted = player.toState(); depleted.abilities.mana = 0; player.applyResolvedState(depleted);
    assert.equal(player.cast(spell), false);
    assert.equal(player.getAbilities()[key], 0);
    assert.equal(player.getAbilities().mana, 0);
  }
  const player = createPlayer();
  player.applyBuild({ ...baseStats(), cooldownReduction: .4 });
  update(player, 16, { ...idle, dodgePressed: true });
  assert.equal(player.getAbilities().dodgeCooldownMs, 1400);
  assert.equal(player.getAbilities().dodgeRemainingMs, 180);
});

test('control gear lengthens shield and frost stun before boss resistance, while excluded targets stay untouched', () => {
  for (const [button, duration] of [['shieldBashPressed', 1400], ['frostWavePressed', 800]]) {
    const player = createPlayer(); player.position = { x: 0, y: 0 };
    player.setUnlockedAbilities(['frostWave']);
    player.applyBuild({ ...baseStats(), stunDurationBonus: .5 });
    const normal = createEnemy('normal', 60, 0), boss = createEnemy('boss', 100, 0, 'boss');
    const rear = createEnemy('rear', -100, 0), dead = createEnemy('dead', 60, 0), lethal = createEnemy('lethal', 60, 0);
    dead.hp = 0; lethal.hp = 1;
    const system = new AbilitySystem();
    system.update({ player, input: { ...idle, [button]: true }, enemies: [normal, boss, rear, dead, lethal], projectiles: new ProjectileSystem() });
    assert.equal(normal.stunRemainingMs, duration * 1.5);
    assert.equal(boss.stunRemainingMs, duration * 1.5 * .25);
    assert.equal(rear.stunRemainingMs, 0);
    assert.equal(dead.stunRemainingMs, 0);
    assert.equal(lethal.stunRemainingMs, 0);
    assert.equal(lethal.isAlive, false);
    player.applyBuild(baseStats(), 'preserve-current');
    assert.equal(normal.stunRemainingMs, duration * 1.5, 'removing gear does not rewrite existing enemy status');
  }
});
