import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RunController } from '../src/game/session/RunController.ts';
import { createCampaignLevel } from '../src/game/session/createCampaignLevel.ts';
import { CAMPAIGN } from '../src/game/content/campaign/campaign.ts';
import { MetaProgression } from '../src/game/core/meta/MetaProgression.ts';
import { LocalMetaProfileRepository } from '../src/game/session/LocalMetaProfileRepository.ts';

const idle = { up: false, down: false, left: false, right: false, attackPressed: false, attackHeld: false, interactPressed: false, aim: { x: 480, y: 352 } };
function fixture(buildLevel) {
  let saved = null;
  const repository = new LocalMetaProfileRepository({ getItem: () => saved, setItem: (_key, value) => { saved = value; } });
  const meta = new MetaProgression(repository);
  return { run: new RunController(meta, buildLevel), meta, repository };
}
function clearLevel(run) {
  for (let frame = 0; frame < 100 && run.getPhase() === 'playing'; frame++) {
    // Combat seam: kill current enemies, retaining actual wave/director/session cleanup.
    for (const enemy of run.getWorld().enemies) enemy.hp = 0;
    run.update(100, idle);
    for (const obelisk of run.getState().world.obelisks ?? []) {
      if (obelisk.activated || run.getPhase() !== 'playing') continue;
      run.getWorld().player.position = { ...obelisk.position };
      run.update(16, { ...idle, interactPressed: true });
    }
  }
  assert.equal(run.getPhase(), 'reward', 'all configured waves must lead to a reward');
}

test('all six stages preserve one run, award every level, and end in victory once', async () => {
  const { run, meta } = fixture();
  await run.startRun();
  const runId = run.getState().world.runSession.runId;
  let expectedKills = 0;
  for (let depth = 1; depth <= CAMPAIGN.length; depth++) {
    assert.equal(run.getState().depth, depth);
    assert.equal(run.getState().world.runSession.runId, runId);
    clearLevel(run);
    expectedKills += CAMPAIGN[depth - 1].encounters.flat().reduce((sum, entry) => sum + entry.count, 0);
    const state = run.getState();
    assert.equal(state.clearedLevels, depth);
    assert.equal(state.world.runSession.killedEnemies, expectedKills);
    assert.equal(state.world.runSession.wavesCleared, depth * 2);
    assert.equal(state.world.runResult, null, 'clearing one world must not finish the whole run');
    assert.equal(state.rewards.length, 3);
    await run.chooseReward(state.rewards[0].id);
  }
  const won = run.getState();
  assert.equal(won.phase, 'won');
  assert.equal(won.world.runResult.outcome, 'victory');
  assert.equal(won.build.inventory.length, 6);
  assert.ok(won.build.level > 1, 'kills and level completion grant XP');
  assert.equal(meta.getState().shards, 36);
  assert.equal(meta.getState().runs, 1);
  run.update(100, idle);
  run.returnToMenu();
  assert.equal(meta.getState().runs, 1);
});

test('reward selection is one-shot and carries damaged HP plus 25% between levels', async () => {
  const { run } = fixture();
  await run.startRun();
  clearLevel(run);
  run.getWorld().player.hp = 40;
  const offer = run.getState().rewards;
  await run.chooseReward('not-offered');
  assert.equal(run.getPhase(), 'reward');
  const reward = offer.find((item) => item.slot === 'charm');
  await Promise.all([run.chooseReward(reward.id), run.chooseReward(reward.id)]);
  const state = run.getState();
  assert.equal(state.depth, 2);
  assert.equal(state.phase, 'playing');
  assert.equal(state.build.inventory.length, 1);
  assert.equal(state.world.player.hp, 65);
});

test('death ends the run; restart resets temporary build and retains persistent rewards', async () => {
  const { run, meta } = fixture();
  await run.startRun();
  const oldId = run.getState().world.runSession.runId;
  clearLevel(run);
  await run.chooseReward(run.getState().rewards[0].id);
  run.togglePause();
  run.learn('warrior1');
  assert.equal(run.getState().build.skills.warrior1, 1);
  run.togglePause();
  run.getWorld().player.hp = 0;
  run.update(16, idle);
  assert.equal(run.getState().phase, 'lost');
  assert.equal(meta.getState().shards, 4);
  assert.equal(run.getState().world.runResult.outcome, 'died');
  await run.startRun();
  const fresh = run.getState();
  assert.equal(fresh.phase, 'playing');
  assert.notEqual(fresh.world.runSession.runId, oldId);
  assert.equal(fresh.build.level, 1);
  assert.equal(fresh.build.inventory.length, 0);
  assert.equal(fresh.build.skills.warrior1, 0);
  assert.equal(fresh.meta.shards, 4);
  assert.equal(fresh.world.player.hp, fresh.world.player.maxHp);
});

test('disposing during a delayed level load ignores the late completion', async () => {
  let release;
  const { run } = fixture(async (...args) => {
    const built = await createCampaignLevel(...args);
    await new Promise((resolve) => { release = resolve; });
    return built;
  });
  const starting = run.startRun();
  while (!release) await new Promise((resolve) => setImmediate(resolve));
  run.dispose();
  release();
  await starting;
  assert.equal(run.getWorld(), null);
  assert.equal(run.getBuiltLevel(), null);
  assert.notEqual(run.getPhase(), 'playing');
});

test('returning to menu during load prevents an obsolete failure from replacing a new run', async () => {
  let rejectOld;
  let requests = 0;
  const { run } = fixture((...args) => {
    requests += 1;
    if (requests === 1) return new Promise((_resolve, reject) => { rejectOld = reject; });
    return createCampaignLevel(...args);
  });
  const oldStarting = run.startRun();
  run.returnToMenu();
  await run.startRun();
  const newId = run.getState().world.runSession.runId;
  rejectOld(new Error('obsolete failure'));
  await oldStarting;
  assert.equal(run.getPhase(), 'playing');
  assert.equal(run.getState().world.runSession.runId, newId);
  assert.equal(run.getState().error, null);
});
