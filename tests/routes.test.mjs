import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CAMPAIGN } from '../src/game/content/campaign/campaign.ts';
import { GROVE_ALTERNATE } from '../src/game/content/campaign/alternateStages.ts';
import { getRouteChoices, resolveCampaignStage } from '../src/game/content/campaign/campaignRoutes.ts';
import { RunController } from '../src/game/session/RunController.ts';
import { createCampaignLevel } from '../src/game/session/createCampaignLevel.ts';
import { RunSession } from '../src/game/core/world/RunSession.ts';
import { MetaProgression } from '../src/game/core/meta/MetaProgression.ts';
import { LocalMetaProfileRepository } from '../src/game/session/LocalMetaProfileRepository.ts';

const idle = { up: false, down: false, left: false, right: false, attackPressed: false, attackHeld: false, interactPressed: false, aim: { x: 480, y: 352 } };
const fixture = () => new RunController(new MetaProgression(new LocalMetaProfileRepository({ getItem: () => null, setItem() {} })));

function clearLevel(run) {
  for (let frame = 0; frame < 100 && run.getPhase() === 'playing'; frame++) {
    for (const enemy of run.getWorld().enemies) enemy.hp = 0;
    run.update(100, idle);
    for (const obelisk of run.getState().world.obelisks ?? []) {
      if (obelisk.activated || run.getPhase() !== 'playing') continue;
      run.getWorld().player.position = { ...obelisk.position };
      run.update(16, { ...idle, interactPressed: true });
    }
  }
  assert.equal(run.getPhase(), 'reward');
}

test('route content offers one fork, bounds stage IDs to their depth, and builds distinct arenas', async () => {
  assert.deepEqual(getRouteChoices(2).map(stage => stage.id), ['grove-2', 'grove-alt']);
  assert.equal(resolveCampaignStage(2).id, 'grove-2');
  assert.equal(resolveCampaignStage(3, 'grove-alt'), undefined);
  assert.deepEqual(getRouteChoices(7), []);
  const session = new RunSession({ playerClassId: 'wanderer' });
  const main = await createCampaignLevel(2, session);
  const alternate = await createCampaignLevel(2, session, undefined, 'grove-alt');
  assert.equal(alternate.level.id, 'grove-alt');
  assert.notDeepEqual(alternate.map.collision, main.map.collision);
  assert.notDeepEqual(alternate.level.rules.waves.table, main.level.rules.waves.table);
  assert.ok(alternate.map.caches.length && alternate.map.restorationSites.length);
  await assert.rejects(createCampaignLevel(3, session, undefined, 'grove-alt'));
});

for (const destination of [CAMPAIGN[1], GROVE_ALTERNATE]) {
  test(`${destination.id} preserves the run and build, then rejoins the ruins`, async () => {
    const run = fixture();
    await run.startRun();
    clearLevel(run);
    run.learn('warrior1');
    run.selectRoute(destination.id);
    const before = run.getState();
    run.getWorld().player.hp = 40;
    const reward = before.rewards.find(item => item.slot === 'charm');
    await Promise.all([run.chooseReward(reward.id), run.chooseReward(reward.id)]);
    const next = run.getState();
    assert.equal(next.phase, 'playing');
    assert.equal(next.depth, 2);
    assert.equal(next.totalLevels, 6);
    assert.equal(next.stage.name, destination.name);
    assert.equal(run.getBuiltLevel().level.id, destination.id);
    assert.equal(next.world.runSession.runId, before.world.runSession.runId);
    assert.equal(next.world.runSession.killedEnemies, before.world.runSession.killedEnemies);
    assert.deepEqual(next.build.skills, before.build.skills);
    assert.equal(next.build.inventory.length, 1);
    assert.equal(next.world.player.hp, 40 + next.world.player.maxHp * .25);
    assert.equal(next.selectedNextStageId, null);
    clearLevel(run);
    const cleared = run.getState();
    assert.deepEqual(cleared.routeChoices.map(stage => stage.id), ['ruins-1']);
    assert.equal(cleared.selectedNextStageId, 'ruins-1');
    assert.equal(cleared.clearedLevels, 2);
    assert.equal(cleared.world.runSession.killedEnemies - before.world.runSession.killedEnemies,
      destination.encounters.flat().reduce((sum, entry) => sum + entry.count, 0));
    await run.chooseReward(cleared.rewards[0].id);
    assert.equal(run.getBuiltLevel().level.id, 'ruins-1');
    assert.equal(run.getState().depth, 3);
    assert.equal(run.getState().world.runSession.runId, before.world.runSession.runId);
    assert.equal(run.getState().build.inventory.length, 2);
  });
}

test('route selection rejects invalid phases and IDs, survives exploration, and resets on restart', async () => {
  const run = fixture();
  run.selectRoute('grove-alt');
  assert.equal(run.getState().selectedNextStageId, null);
  await run.startRun();
  run.selectRoute('grove-alt');
  assert.equal(run.getState().selectedNextStageId, null);
  clearLevel(run);
  assert.equal(run.getState().selectedNextStageId, 'grove-2');
  run.selectRoute('frost-2');
  assert.equal(run.getState().selectedNextStageId, 'grove-2');
  run.selectRoute('grove-alt');
  const offer = run.getState().rewards;
  await run.chooseReward('not-offered');
  assert.equal(run.getPhase(), 'reward');
  assert.deepEqual(run.getState().rewards, offer);
  assert.equal(run.getState().build.inventory.length, 0);
  const snapshot = run.getState();
  snapshot.routeChoices[1].id = 'corrupted';
  assert.equal(run.getState().routeChoices[1].id, 'grove-alt');
  run.exploreArena();
  run.selectRoute('grove-2');
  run.finishExploration();
  assert.equal(run.getState().selectedNextStageId, 'grove-alt');
  run.returnToMenu();
  assert.equal(run.getState().selectedNextStageId, null);
  await run.startRun();
  assert.equal(run.getBuiltLevel().level.id, 'grove-1');
  assert.equal(run.getState().build.inventory.length, 0);
  clearLevel(run);
  assert.equal(run.getState().selectedNextStageId, 'grove-2');
});
