import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createEnemy } from '../src/game/core/entities/createEnemy.ts';
import { createPlayer } from '../src/game/core/entities/createPlayer.ts';
import { enemyArchetypes } from '../src/game/config/enemies/enemyArchetypes.ts';
import { ELITE_MODIFIERS, ELITE_BONUS_XP } from '../src/game/core/enemies/eliteModifiers.ts';
import { WaveSystem } from '../src/game/core/systems/WaveSystem.ts';
import { CombatResolver } from '../src/game/core/combat/CombatResolver.ts';
import { CAMPAIGN } from '../src/game/content/campaign/campaign.ts';
import { createCampaignLevel } from '../src/game/session/createCampaignLevel.ts';
import { RunController } from '../src/game/session/RunController.ts';
import { MetaProgression } from '../src/game/core/meta/MetaProgression.ts';
import { LocalMetaProfileRepository } from '../src/game/session/LocalMetaProfileRepository.ts';

const idle = { up: false, down: false, left: false, right: false, attackPressed: false, attackHeld: false, interactPressed: false, aim: { x: 800, y: 352 } };
const totalXp = ({ level, xp }) => xp + (level - 1) * 40 + (level - 1) * (level - 2) * 25 / 2;

test('elite modifiers alter instance stats and damage defence without mutating base archetypes or attack timing', () => {
  const before = structuredClone(enemyArchetypes);
  const ordinary = createEnemy('normal', 0, 0);
  for (const id of ['armored', 'swift']) {
    const elite = createEnemy(id, 0, 0, 'grunt', id), modifier = ELITE_MODIFIERS[id];
    assert.equal(elite.maxHp, Math.round(ordinary.maxHp * modifier.hpMultiplier));
    assert.equal(elite.speed, ordinary.speed * modifier.speedMultiplier);
    assert.equal(elite.attack.config.damage, ordinary.attack.config.damage * modifier.damageMultiplier);
    assert.equal(elite.radius, ordinary.radius);
    for (const field of ['windupMs', 'activeMs', 'recoveryMs', 'cooldownMs']) {
      assert.equal(elite.attack.config[field], ordinary.attack.config[field]);
    }
    const hp = elite.hp;
    elite.applyDamage(20, 'physical');
    assert.equal(elite.hp, hp - 20 * modifier.physicalDamageMultiplier);
    elite.applyDamage(20, 'magic');
    assert.equal(elite.hp, hp - 20 * modifier.physicalDamageMultiplier - 20);
    elite.applyStatus({ kind: 'stun', durationMs: 800 });
    assert.equal(elite.stunRemainingMs, 800);
    assert.equal(elite.toState().elite, id);
  }
  assert.deepEqual(enemyArchetypes, before);
  assert.equal(createEnemy('later', 0, 0).maxHp, ordinary.maxHp);
});

test('campaign replaces one ordinary enemy with an elite after stage one and the wave system preserves the modifier', () => {
  const originalCounts = [6, 7, 7, 7, 9, 6];
  for (const [index, stage] of CAMPAIGN.entries()) {
    const entries = stage.encounters.flat();
    assert.equal(entries.reduce((sum, entry) => sum + entry.count, 0), originalCounts[index]);
    const expected = index === 0 ? 0 : 1;
    assert.equal(entries.reduce((sum, entry) => sum + (entry.elite ? entry.count : 0), 0), expected);
    assert.ok(entries.filter(entry => entry.archetypeId === 'boss').every(entry => !entry.elite));
    const waveTable = stage.encounters.map((spawns, i) => ({ waveIndex: i + 1, delayMs: 0, spawnBudget: spawns.reduce((sum, item) => sum + item.count, 0), spawns }));
    const waves = new WaveSystem({ waveTable, enabled: true });
    const spawned = [];
    for (const wave of waveTable) {
      const result = waves.update({ deltaMs: 1, enemies: [], player: createPlayer().toState(), map: { width: 960, height: 704 }, spawnPoints: [{ x: 100, y: 100 }] });
      assert.equal(result.currentWaveIndex, wave.waveIndex);
      spawned.push(...result.enemies);
    }
    assert.equal(spawned.filter(enemy => enemy.elite).length, expected);
    assert.equal(spawned.length, originalCounts[index]);
  }
});

async function eliteLevel(depth, session, previousPlayer) {
  const built = await createCampaignLevel(depth, session, previousPlayer);
  built.map.hazards = [];
  built.level.rules.waves.table = [{ waveIndex: 1, delayMs: 0, spawnBudget: 2, spawns: [
    { archetypeId: 'grunt', count: 1, elite: 'armored' }, { archetypeId: 'grunt', count: 1 },
  ] }];
  return built;
}
function defeat(enemy) {
  new CombatResolver().resolveAttack({ sourceId: 'player', team: 'player', type: 'melee', damageType: 'magic', damage: 10000,
    range: 0, radius: 100, origin: { ...enemy.position }, direction: 'right', knockback: 0, hitStopMs: 0 }, [enemy]);
}

test('elite cleanup grants one bonus, retains the ordinary kill, and resets only the level objective on transition', async () => {
  const meta = new MetaProgression(new LocalMetaProfileRepository({ getItem: () => null, setItem() {} }));
  const run = new RunController(meta, eliteLevel); await run.startRun(); run.update(16, idle);
  assert.deepEqual(run.getState().world.eliteObjective, { total: 1, defeated: 0 });
  const elite = run.getWorld().enemies.find(enemy => enemy.elite);
  defeat(elite); run.update(16, idle);
  assert.equal(run.getPhase(), 'playing', 'ordinary survivors still prevent level completion');
  assert.deepEqual(run.getState().world.eliteObjective, { total: 1, defeated: 1 });
  assert.equal(run.getState().world.runSession.killedEnemies, 1);
  assert.equal(totalXp(run.getState().build), 18 + ELITE_BONUS_XP);
  run.togglePause(); run.update(100, idle); run.togglePause(); run.update(16, idle);
  assert.equal(totalXp(run.getState().build), 18 + ELITE_BONUS_XP);
  defeat(run.getWorld().enemies[0]); run.update(16, idle);
  assert.equal(run.getPhase(), 'reward');
  const completed = run.getState();
  assert.equal(totalXp(completed.build), 36 + ELITE_BONUS_XP + 30);
  run.exploreArena(); run.update(100, idle); run.finishExploration();
  assert.equal(totalXp(run.getState().build), totalXp(completed.build));
  await run.chooseReward(completed.rewards[0].id); run.update(16, idle);
  assert.deepEqual(run.getState().world.eliteObjective, { total: 1, defeated: 0 });
  defeat(run.getWorld().enemies.find(enemy => enemy.elite)); run.update(16, idle);
  assert.equal(totalXp(run.getState().build), totalXp(completed.build) + 18 + ELITE_BONUS_XP);
  run.returnToMenu(); await run.startRun();
  assert.equal(totalXp(run.getState().build), 0);
  assert.deepEqual(run.getState().world.eliteObjective, { total: 1, defeated: 0 });
});
