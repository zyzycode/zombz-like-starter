import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HazardSystem } from '../src/game/core/environment/HazardSystem.ts';
import { createPlayer } from '../src/game/core/entities/createPlayer.ts';
import { GameWorld } from '../src/game/core/world/GameWorld.ts';
import { RunSession } from '../src/game/core/world/RunSession.ts';
import { createCampaignLevel } from '../src/game/session/createCampaignLevel.ts';
import { RunController } from '../src/game/session/RunController.ts';
import { MetaProgression } from '../src/game/core/meta/MetaProgression.ts';
import { LocalMetaProfileRepository } from '../src/game/session/LocalMetaProfileRepository.ts';
import { CAMPAIGN } from '../src/game/content/campaign/campaign.ts';
import { createArenaMap } from '../src/game/content/campaign/createArenaMap.ts';

const idle = { up: false, down: false, left: false, right: false, attackPressed: false, attackHeld: false, interactPressed: false, aim: { x: 480, y: 352 } };
const rune = (overrides = {}) => ({
  id: 'test-rune', position: { x: 600, y: 352 }, radius: 48, damage: 20,
  damageType: 'magic', cooldownMs: 1000, warningMs: 1000, activeMs: 300,
  initialDelayMs: 1000, theme: 'fire', ...overrides,
});
function target(id, team, x = 600) {
  return {
    id, team, position: { x, y: 352 }, radius: 16, hp: 10000,
    get isAlive() { return this.hp > 0; },
    applyDamage(amount) { this.hp = Math.max(0, this.hp - amount); },
  };
}

test('runes warn before striking both teams once per pulse, including late arrivals', () => {
  const system = new HazardSystem([rune()]);
  const player = target('player', 'player');
  const enemy = target('enemy', 'enemy');
  const late = target('late', 'enemy', 665); // Just outside radius 48 + target radius 16.
  const actors = [player, enemy, late];
  system.update(1000, actors);
  assert.equal(system.getState()[0].phase, 'warning');
  system.update(999, actors);
  assert.deepEqual(actors.map((actor) => actor.hp), [10000, 10000, 10000]);
  system.update(1, actors);
  system.update(0, actors); // A boundary-entry pulse may be applied at update(0).
  assert.equal(system.getState()[0].phase, 'active');
  assert.deepEqual(actors.map((actor) => actor.hp), [9980, 9980, 10000]);
  late.position.x = 664;
  system.update(100, actors);
  system.update(100, actors);
  assert.deepEqual(actors.map((actor) => actor.hp), [9980, 9980, 9980]);
  system.update(2100, actors); // Second activation at t=4300.
  system.update(0, actors);
  assert.deepEqual(actors.map((actor) => actor.hp), [9960, 9960, 9960]);
});

test('dodging consumes the pulse attempt and prevents a delayed hit after dodge expires', () => {
  const system = new HazardSystem([rune()]);
  const player = createPlayer();
  player.position = { x: 600, y: 352 };
  system.update(1999, [player]);
  const dodging = player.toState();
  dodging.abilities.dodgeRemainingMs = 180;
  player.applyResolvedState(dodging);
  system.update(1, [player]);
  system.update(0, [player]);
  assert.equal(player.hp, 100);
  const afterDodge = player.toState();
  afterDodge.abilities.dodgeRemainingMs = 0;
  player.applyResolvedState(afterDodge);
  system.update(200, [player]);
  assert.equal(player.hp, 100, 'the same pulse must not strike again after invulnerability ends');
  system.update(2100, [player]);
  system.update(0, [player]);
  assert.equal(player.hp, 80, 'a new pulse can hit the player normally');
});

test('16 ms and 100 ms steps produce the same pulse count and damage for stationary targets', () => {
  const simulate = (step) => {
    const system = new HazardSystem([rune()]);
    const actor = target('static', 'enemy');
    for (let remaining = 10000; remaining > 0; remaining -= Math.min(step, remaining)) {
      system.update(Math.min(step, remaining), [actor]);
    }
    return { hp: actor.hp, state: system.getState() };
  };
  const fine = simulate(16), coarse = simulate(100);
  assert.equal(fine.hp, 9920, 'four activations must occur by t=10000');
  assert.deepEqual(coarse, fine);
});

async function singleWaveLevel(depth, session, previousPlayer) {
  const built = await createCampaignLevel(depth, session, previousPlayer);
  built.map.hazards = [rune({ damage: 1000 })];
  built.level.rules.waves.table = [{ waveIndex: 1, delayMs: 0, spawnBudget: 1, spawns: [{ archetypeId: 'grunt', count: 1 }] }];
  return built;
}
async function worldFixture() {
  const session = new RunSession({ playerClassId: 'wanderer' });
  const built = await singleWaveLevel(1, session);
  const world = new GameWorld({ builtLevel: built, runSession: session, mode: 'campaign', runResultGateway: { submitRunResult: async () => {} } });
  world.update(0, idle);
  const enemy = world.enemies[0];
  assert.ok(enemy, 'fixture must spawn its real campaign wave');
  enemy.position = { x: 600, y: 352 };
  enemy.speed = 0;
  enemy.attack.runtime.cooldownRemainingMs = 99999;
  return { world, session };
}

test('hazard kills use normal cleanup and wave accounting; simultaneous player death wins over clearance', async () => {
  const { world, session } = await worldFixture();
  world.update(2000, idle);
  world.update(0, idle);
  assert.equal(world.getState().status, 'cleared');
  assert.equal(session.toState().killedEnemies, 1);
  assert.equal(session.toState().wavesCleared, 1);
  const finished = world.getState();
  world.update(5000, idle);
  assert.deepEqual(world.getState(), finished, 'a cleared level must freeze hazard phases and accounting');

  const lethal = await worldFixture();
  lethal.world.player.position = { x: 600, y: 352 };
  lethal.world.player.hp = 10;
  lethal.world.update(2000, idle);
  lethal.world.update(0, idle);
  assert.equal(lethal.world.getState().status, 'dead');
  assert.equal(lethal.session.toState().killedEnemies, 1);
  const dead = lethal.world.getState();
  lethal.world.update(5000, idle);
  assert.deepEqual(lethal.world.getState(), dead, 'a dead level must freeze hazard phases');
});

test('pause freezes hazard time and changing levels resets hazards while retaining run resources', async () => {
  const meta = new MetaProgression(new LocalMetaProfileRepository({ getItem: () => null, setItem: () => {} }));
  const run = new RunController(meta, singleWaveLevel);
  await run.startRun();
  run.update(100, idle);
  const beforePause = run.getState().world.hazards;
  run.getWorld().hitStopRemainingMs = 100;
  run.update(32, idle);
  assert.deepEqual(run.getState().world.hazards, beforePause, 'hit-stop freezes warning and damage together');
  run.getWorld().hitStopRemainingMs = 0;
  run.togglePause();
  run.update(1000, idle);
  assert.deepEqual(run.getState().world.hazards, beforePause);
  run.togglePause();
  for (const enemy of run.getWorld().enemies) enemy.hp = 0;
  run.update(16, idle);
  assert.equal(run.getPhase(), 'reward');
  const oldWorld = run.getWorld();
  const state = oldWorld.player.toState();
  state.hp = 50;
  state.abilities.mana = 40;
  oldWorld.player.applyResolvedState(state);
  const runId = run.getState().world.runSession.runId;
  const reward = run.getState().rewards.find((item) => item.slot === 'charm');
  await run.chooseReward(reward.id);
  const next = run.getState();
  assert.equal(next.depth, 2);
  assert.equal(next.world.runSession.runId, runId);
  assert.equal(next.world.player.hp, 75, 'normal between-level healing still applies');
  assert.equal(next.world.player.abilities.mana, 40);
  assert.deepEqual(next.world.hazards, new HazardSystem([rune({ damage: 1000 })]).getState());
});

test('campaign runes leave player, jittered enemy spawns and springs safe for radius 38', () => {
  for (const [index, stage] of CAMPAIGN.entries()) {
    const map = createArenaMap(stage, index + 1);
    const hazards = map.hazards ?? [];
    assert.ok(index === 0 ? hazards.length === 0 : hazards.length > 0, `${stage.id}: expected hazard introduction after level 1`);
    assert.ok(hazards.length <= 3, `${stage.id}: keep safe bypass lanes`);
    for (const hazard of hazards) {
      assert.ok(hazard.warningMs >= 1000);
      assert.ok(hazard.initialDelayMs + hazard.warningMs >= 3500, 'the first strike must allow time to orient after loading');
      const safe = (position, label) => assert.ok(Math.hypot(position.x - hazard.position.x, position.y - hazard.position.y) > hazard.radius + 38, `${stage.id}/${hazard.id}: ${label} overlaps hazard`);
      for (const marker of map.markers) {
        if (marker.kind === 'player_spawn') safe(marker.position, marker.id);
        if (marker.kind === 'enemy_spawn') {
          for (const dx of [-57.2, 0, 57.2]) for (const dy of [-57.2, 0, 57.2]) {
            safe({ x: Math.max(80, Math.min(map.width - 80, marker.position.x + dx)), y: Math.max(80, Math.min(map.height - 80, marker.position.y + dy)) }, `${marker.id} jitter`);
          }
        }
      }
      for (const site of map.restorationSites ?? []) safe(site.position, site.id);
      for (const shape of map.collision) {
        if (shape.kind === 'circle') assert.ok(Math.hypot(shape.position.x - hazard.position.x, shape.position.y - hazard.position.y) > hazard.radius + shape.radius, `${stage.id}/${hazard.id}: hidden by collision ${shape.id}`);
      }
    }
  }
});
