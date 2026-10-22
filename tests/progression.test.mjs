import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RunBuild } from '../src/game/core/progression/RunBuild.ts';
import { MetaProgression } from '../src/game/core/meta/MetaProgression.ts';
import { LocalMetaProfileRepository } from '../src/game/session/LocalMetaProfileRepository.ts';

function storageFixture(initial = null) {
  let value = initial;
  return { getItem: () => value, setItem: (_key, next) => { value = next; } };
}

test('reward offer is stable and accepts exactly one owned item', () => {
  const build = new RunBuild({}, () => 0.5);
  const offer = build.createRewards(1);
  assert.equal(offer.length, 3);
  assert.deepEqual(build.createRewards(1), offer);
  assert.equal(build.claimReward('unknown'), false);
  assert.equal(build.claimReward(offer[0].id), true);
  assert.equal(build.claimReward(offer[1].id), false);
  assert.equal(build.claimReward(offer[0].id), false);
  assert.equal(build.getState().inventory.length, 1);
  assert.ok(build.getState().stats.damage > 50);
});

test('equipping a replacement does not stack the old equipment bonus', () => {
  const build = new RunBuild({}, () => 0.5);
  const first = build.createRewards(1)[0];
  build.claimReward(first.id);
  const second = build.createRewards(6)[0];
  build.claimReward(second.id);
  assert.equal(build.getState().stats.damage, 50 + first.bonuses.damage);
  assert.equal(build.equip(second.id), true);
  assert.equal(build.getState().stats.damage, 50 + second.bonuses.damage);
  assert.equal(build.equip('unknown'), false);
});

test('skill prerequisites, available points and new-run reset are enforced', () => {
  const build = new RunBuild({ vitality: 2 });
  assert.equal(build.learn('warrior1'), false);
  build.gainXp(105);
  assert.equal(build.getState().level, 3);
  assert.equal(build.learn('warrior2'), false);
  assert.equal(build.learn('warrior1'), true);
  assert.equal(build.learn('warrior2'), true);
  assert.equal(build.learn('mage1'), false);
  assert.equal(build.getState().stats.damage, 70);
  const fresh = new RunBuild({ vitality: 2 }).getState();
  assert.equal(fresh.level, 1);
  assert.equal(fresh.stats.maxHp, 120);
  assert.equal(fresh.stats.damage, 50);
  assert.equal(fresh.inventory.length, 0);
});

test('meta awards survive reload and cannot be granted twice for the same run', () => {
  const storage = storageFixture();
  const meta = new MetaProgression(new LocalMetaProfileRepository(storage));
  assert.equal(meta.award('one', 3, false), true);
  assert.equal(meta.award('one', 3, false), false);
  assert.equal(meta.getState().shards, 12);
  assert.equal(meta.purchase('vitality'), true);
  assert.equal(meta.purchase('vitality'), false);
  const restored = new MetaProgression(new LocalMetaProfileRepository(storage));
  assert.equal(restored.getState().ranks.vitality, 1);
  assert.equal(restored.getState().shards, 4);
  assert.equal(restored.award('one', 6, true), false);
  assert.equal(restored.getState().runs, 1);
});

test('malformed or unavailable storage recovers and reports failure', () => {
  for (const corrupt of ['{', '{"version":1,"shards":999}', '{"version":2}']) {
    const repository = new LocalMetaProfileRepository(storageFixture(corrupt));
    const meta = new MetaProgression(repository);
    assert.equal(meta.getState().shards, 0);
    assert.ok(meta.getError());
  }
  const meta = new MetaProgression(new LocalMetaProfileRepository(null));
  assert.equal(meta.award('offline', 1, false), true);
  assert.equal(meta.getState().shards, 4);
  assert.ok(meta.getError());
});

test('invalid profiles are never written, and returned snapshots are isolated', () => {
  const repository = new LocalMetaProfileRepository(storageFixture());
  const meta = new MetaProgression(repository);
  const snapshot = meta.getState();
  snapshot.shards = -1;
  assert.equal(repository.save(snapshot), false);
  snapshot.ranks.vitality = 99;
  assert.equal(meta.getState().ranks.vitality, 0);
  const build = new RunBuild();
  const state = build.getState();
  state.stats.damage = 10000;
  assert.equal(build.getState().stats.damage, 50);
});
