import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RunBuild } from '../src/game/core/progression/RunBuild.ts';
import { createPlayer } from '../src/game/core/entities/createPlayer.ts';
import { RunController } from '../src/game/session/RunController.ts';
import { MetaProgression } from '../src/game/core/meta/MetaProgression.ts';
import { LocalMetaProfileRepository } from '../src/game/session/LocalMetaProfileRepository.ts';

const idle = { up: false, down: false, left: false, right: false, attackPressed: false, attackHeld: false, interactPressed: false, aim: { x: 480, y: 352 } };
function clearLevel(run) {
  for (let frame = 0; frame < 100 && run.getPhase() === 'playing'; frame++) {
    for (const enemy of run.getWorld().enemies) enemy.hp = 0;
    run.update(100, idle);
  }
  assert.equal(run.getPhase(), 'reward');
}

test('equipment previews are isolated, non-mutating and match replacement and removal', () => {
  const build = new RunBuild({ might: 1 }, () => 0.5);
  build.gainXp(40); build.learn('warrior1');
  const first = build.createRewards(1)[0]; build.claimReward(first.id);
  const second = build.createRewards(6)[0]; build.claimReward(second.id);
  const before = build.getState();
  assert.deepEqual(build.getState(), before);
  const preview = before.equipmentPreviews.equip[second.id];
  assert.equal(preview.delta.damage, second.bonuses.damage - first.bonuses.damage);
  assert.equal(build.equip(second.id), true);
  assert.deepEqual(build.getState().stats, preview.stats);
  const removal = build.getState().equipmentPreviews.unequip.weapon;
  assert.equal(build.unequip('weapon'), true);
  const after = build.getState();
  assert.deepEqual(after.stats, removal.stats);
  assert.equal(after.inventory.length, 2);
  assert.equal(after.equipment.weapon, undefined);
  assert.equal(after.equipmentPreviews.unequip.weapon, undefined);
  assert.equal(build.unequip('weapon'), false);
  after.equipmentPreviews.equip[first.id].stats.damage = 99999;
  assert.notEqual(build.getState().equipmentPreviews.equip[first.id].stats.damage, 99999);
  assert.equal(build.equip('unknown'), false);
});

test('session equipment commands respect phases and safely preserve resources when wounded', async () => {
  const meta = new MetaProgression(new LocalMetaProfileRepository({ getItem: () => null, setItem() {} }));
  const run = new RunController(meta);
  await run.startRun(); clearLevel(run);
  const armor = run.getState().rewards.find((item) => item.slot === 'armor');
  await run.chooseReward(armor.id);
  const equipped = run.getState().build;
  run.unequip('armor');
  assert.deepEqual(run.getState().build, equipped, 'playing blocks removal');
  run.togglePause();
  run.getWorld().player.hp = 1;
  run.unequip('armor');
  assert.equal(run.getWorld().player.hp, 1);
  assert.equal(run.getState().build.equipment.armor, undefined);
  assert.equal(run.getState().build.inventory.length, 1);
  run.equip(armor.id);
  assert.equal(run.getWorld().player.hp, 1, 'putting armor back does not heal');
  run.unequip('armor'); run.togglePause();
  run.equip(armor.id);
  assert.equal(run.getState().build.equipment.armor, undefined, 'playing blocks equipping');
  run.getWorld().player.hp = run.getWorld().player.maxHp;
  clearLevel(run);
  run.equip(armor.id);
  assert.equal(run.getState().build.equipment.armor, armor.id, 'reward phase permits equipping');
  run.unequip('armor');
  assert.equal(run.getState().build.equipment.armor, undefined, 'reward phase permits removal');
});

test('preserve-current clamps maxima without healing, killing or reviving; default startup stays full', () => {
  const base = new RunBuild().getState().stats;
  const larger = { ...base, maxHp: 160, maxMana: 150 };
  const player = createPlayer();
  player.applyBuild(larger);
  assert.equal(player.hp, 160, 'default policy retains existing startup/meta semantics');
  player.hp = 5;
  player.applyBuild(base, 'preserve-current');
  assert.equal(player.hp, 5);
  player.applyBuild(larger, 'preserve-current');
  assert.equal(player.hp, 5);
  const state = player.toState(); state.hp = 150; state.abilities.mana = 140;
  player.applyResolvedState(state);
  player.applyBuild(base, 'preserve-current');
  assert.equal(player.hp, 100); assert.equal(player.getAbilities().mana, 100);
  player.applyBuild(larger, 'preserve-current');
  assert.equal(player.hp, 100); assert.equal(player.getAbilities().mana, 100);
  player.hp = 0;
  player.applyBuild(base, 'preserve-current'); player.applyBuild(larger, 'preserve-current');
  assert.equal(player.hp, 0);
});
