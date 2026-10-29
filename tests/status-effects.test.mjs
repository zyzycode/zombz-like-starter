import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPlayer } from '../src/game/core/entities/createPlayer.ts';
import { createEnemy } from '../src/game/core/entities/createEnemy.ts';
import { AttackController } from '../src/game/core/combat/AttackController.ts';
import { AbilitySystem } from '../src/game/core/combat/AbilitySystem.ts';
import { CombatResolver } from '../src/game/core/combat/CombatResolver.ts';
import { ProjectileSystem } from '../src/game/core/combat/ProjectileSystem.ts';
import { EnemyAiSystem } from '../src/game/core/systems/EnemyAiSystem.ts';
import { RunController } from '../src/game/session/RunController.ts';
import { MetaProgression } from '../src/game/core/meta/MetaProgression.ts';
import { LocalMetaProfileRepository } from '../src/game/session/LocalMetaProfileRepository.ts';

const idle = { up: false, down: false, left: false, right: false, attackPressed: false, attackHeld: false, interactPressed: false, aim: { x: 1000, y: 0 } };
const stun = { kind: 'stun', durationMs: 1400 };
const resolvePosition = (position) => position;

test('shield bash aims a sector, spends resources once, and respects dodge/death/mana', () => {
  const player = createPlayer();
  player.position = { x: 0, y: 0 };
  const front = createEnemy('front', 60, 0), back = createEnemy('back', -60, 0);
  const system = new AbilitySystem(), projectiles = new ProjectileSystem();
  const cast = () => system.update({ player, input: { ...idle, shieldBashPressed: true }, enemies: [front, back], projectiles });
  cast(); cast();
  assert.equal(front.hp, 70); assert.equal(front.stunRemainingMs, 1400);
  assert.equal(back.hp, 100); assert.equal(back.stunRemainingMs, 0);
  assert.equal(player.getAbilities().mana, 75); assert.equal(player.getAbilities().shieldBashPulse, 1);
  assert.equal(player.getAbilities().shieldBashDirection, 'right');
  const state = player.toState();
  state.abilities.shieldBashCooldownMs = 0; state.abilities.mana = 24;
  player.applyResolvedState(state); cast(); assert.equal(player.getAbilities().mana, 24);
  state.abilities.mana = 100; state.abilities.dodgeRemainingMs = 100;
  player.applyResolvedState(state); cast(); assert.equal(player.getAbilities().mana, 100);
  state.abilities.dodgeRemainingMs = 0; state.hp = 0;
  player.applyResolvedState(state); cast(); assert.equal(player.getAbilities().mana, 100);
});

test('stun interrupts melee and ranged windups without refund, blocks AI, expires and uses max duration', () => {
  for (const kind of ['grunt', 'ranged']) {
    const player = createPlayer(); player.position = { x: 0, y: 0 };
    const enemy = createEnemy('target', kind === 'ranged' ? 200 : 40, 0, kind);
    const attack = new AttackController(); attack.update(enemy, 10, true);
    const cooldown = enemy.attack.runtime.cooldownRemainingMs;
    enemy.applyStatus(stun);
    assert.equal(enemy.attack.runtime.isActive, false);
    assert.equal(enemy.attack.runtime.cooldownRemainingMs, cooldown);
    enemy.applyStatus({ kind: 'stun', durationMs: 300 });
    enemy.applyStatus({ kind: 'stun', durationMs: NaN });
    assert.equal(enemy.stunRemainingMs, 1400);
    const ai = new EnemyAiSystem(), projectiles = new ProjectileSystem();
    const tick = (deltaMs) => ai.update({ enemies: [enemy], player: player.toState(), deltaMs, resolvePosition, projectiles });
    const origin = { ...enemy.position };
    for (let i = 0; i < 14; i++) assert.equal(tick(100).length, 0);
    assert.deepEqual(enemy.position, origin); assert.equal(projectiles.getState().length, 0);
    assert.equal(enemy.stunRemainingMs, 0);
    let hits = 0;
    for (let i = 0; i < 40; i++) hits += tick(100).length;
    assert.ok(kind === 'ranged' ? projectiles.getState().length > 0 : hits > 0);
  }
  const boss = createEnemy('boss', 0, 0, 'boss'); boss.applyStatus(stun);
  assert.equal(boss.stunRemainingMs, 350);
});

test('resolver excludes friends and dead targets; player dodge also protects from status', () => {
  const player = createPlayer(); player.position = { x: 0, y: 0 };
  const dead = createEnemy('dead', 0, 0); dead.hp = 0;
  const friend = createEnemy('friend', 0, 0); friend.team = 'player';
  const attack = { sourceId: 'source', team: 'player', type: 'melee', damageType: 'magic', damage: 1, range: 0, radius: 100, direction: 'right', origin: { x: 0, y: 0 }, knockback: 0, hitStopMs: 0, statusEffects: [stun] };
  const resolver = new CombatResolver(); resolver.resolveAttack(attack, [dead, friend]);
  assert.equal(dead.stunRemainingMs, 0); assert.equal(friend.stunRemainingMs, 0);
  const state = player.toState(); state.abilities.dodgeRemainingMs = 100; player.applyResolvedState(state);
  resolver.resolveAttack({ ...attack, team: 'enemy' }, [player]);
  assert.equal(player.stunRemainingMs, 0); assert.equal(player.hp, 100);
  state.abilities.dodgeRemainingMs = 0; player.applyResolvedState(state); player.applyStatus(stun);
  assert.equal(player.cast('shieldBash'), false);
});

test('pause and hit-stop freeze stun; changing level preserves ability cooldown but resets enemies', async () => {
  const meta = new MetaProgression(new LocalMetaProfileRepository({ getItem: () => null, setItem() {} }));
  const run = new RunController(meta); await run.startRun();
  for (let i = 0; i < 50 && run.getWorld().enemies.length === 0; i++) run.update(100, idle);
  const world = run.getWorld(), enemy = world.enemies[0]; assert.ok(enemy);
  enemy.applyStatus(stun);
  run.togglePause(); run.update(100, idle); assert.equal(enemy.stunRemainingMs, 1400);
  run.togglePause(); world.hitStopRemainingMs = 100; run.update(32, idle);
  assert.equal(enemy.stunRemainingMs, 1400); world.hitStopRemainingMs = 0;
  for (let i = 0; i < 100 && run.getPhase() === 'playing'; i++) {
    for (const target of world.enemies) target.hp = 0;
    run.update(100, idle);
  }
  assert.equal(run.getPhase(), 'reward');
  world.player.cast('shieldBash');
  const cooldown = world.player.getAbilities().shieldBashCooldownMs;
  await run.chooseReward(run.getState().rewards[0].id);
  assert.equal(run.getWorld().player.getAbilities().shieldBashCooldownMs, cooldown);
  for (let i = 0; i < 50 && run.getWorld().enemies.length === 0; i++) run.update(100, idle);
  assert.ok(run.getWorld().enemies.length > 0);
  assert.ok(run.getWorld().enemies.every((target) => target.stunRemainingMs === 0));
});
