import { ELITE_BONUS_XP } from '@/game/core/enemies/eliteModifiers';
import { RunBuild } from '@/game/core/progression/RunBuild';
import { MetaProgression } from '@/game/core/meta/MetaProgression';
import type { ActiveAbilityId, ActiveAbilitySlot, ItemSlot, MetaUpgradeId, SkillId } from '@/game/core/progression/types';
import { RunSession } from '@/game/core/world/RunSession';
import { GameWorld } from '@/game/core/world/GameWorld';
import type { BuiltLevel } from '@/game/world/level/types';
import type { InputState, PlayerState } from '@/shared/types/game';
import { CAMPAIGN } from '@/game/content/campaign/campaign';
import { getRouteChoices, resolveCampaignStage } from '@/game/content/campaign/campaignRoutes';
import { createCampaignLevel } from '@/game/session/createCampaignLevel';
import type { RunPhase, RunSnapshot } from '@/game/session/RunState';

/** Owns a whole run. Worlds are replaceable levels, builds and the run ledger are not. */
export class RunController {
  private phase: RunPhase = 'menu';
  private build: RunBuild;
  private session = new RunSession({ playerClassId: 'wanderer' });
  private world: GameWorld | null = null;
  private builtLevel: BuiltLevel | null = null;
  private depth = 1;
  private stageId = CAMPAIGN[0].id;
  private selectedNextStageId: string | null = null;
  private clearedLevels = 0;
  private lastKills = 0;
  private lastEliteKills = 0;
  private lastCacheItem: RunSnapshot['lastCacheItem'] = null;
  private rewards: RunSnapshot['rewards'] = [];
  private error: string | null = null;
  private earnedShards = 0;
  private generation = 0;

  constructor(
    private readonly meta: MetaProgression,
    private readonly buildLevel = createCampaignLevel,
  ) {
    this.build = new RunBuild(meta.getState().ranks);
  }

  getWorld() { return this.world; }
  getBuiltLevel() { return this.builtLevel; }
  getPhase() { return this.phase; }

  getState(): RunSnapshot {
    return {
      phase: this.phase, depth: this.depth, totalLevels: CAMPAIGN.length,
      clearedLevels: this.clearedLevels, stage: resolveCampaignStage(this.depth, this.stageId)!,
      routeChoices: getRouteChoices(this.depth + 1).map(({ id, name, biome, description, color }) => ({ id, name, biome, description, color })),
      selectedNextStageId: this.selectedNextStageId,
      world: this.world?.getState() ?? null, build: this.build.getState(), rewards: structuredClone(this.rewards),
      lastCacheItem: this.lastCacheItem ? structuredClone(this.lastCacheItem) : null,
      meta: this.meta.getState(), metaError: this.meta.getError(), error: this.error, earnedShards: this.earnedShards,
    };
  }

  async startRun() {
    if (['playing', 'exploring', 'loading', 'reward', 'paused'].includes(this.phase)) return;
    this.session = new RunSession({ playerClassId: 'wanderer' });
    this.build = new RunBuild(this.meta.getState().ranks);
    this.depth = 1;
    this.stageId = CAMPAIGN[0].id;
    this.selectedNextStageId = null;
    this.clearedLevels = 0;
    this.lastKills = 0;
    this.earnedShards = 0;
    this.rewards = [];
    await this.loadLevel();
  }

  update(deltaMs: number, input: InputState) {
    if ((this.phase !== 'playing' && this.phase !== 'exploring') || !this.world) return;
    // Bound a background-tab gap and substep movement/projectiles without repeating button edges.
    let remaining = Math.max(0, Math.min(100, deltaMs));
    let stepInput = input;
    while (remaining > 0 && (this.phase === 'playing' || this.phase === 'exploring')) {
      const step = Math.min(16, remaining);
      const exploring = this.phase === 'exploring';
      if (exploring) this.world.updateExploration(step, stepInput);
      else this.world.update(step, stepInput);
      for (const cacheId of this.world.drainOpenedCaches()) {
        const item = this.build.claimCache(cacheId, this.depth);
        if (item) this.lastCacheItem = item;
      }
      remaining -= step;
      stepInput = { ...input, attackPressed: false, interactPressed: false, fireboltPressed: false, novaPressed: false, shieldBashPressed: false, slotZPressed: false, slotXPressed: false, slotCPressed: false, dodgePressed: false };
      if (exploring) continue;
      const state = this.world.getState();
      const kills = state.runSession.killedEnemies;
      if (kills > this.lastKills) {
        this.build.gainXp((kills - this.lastKills) * 18);
        this.lastKills = kills;
      }
      const eliteKills = state.eliteObjective?.defeated ?? 0;
      if (eliteKills > this.lastEliteKills) {
        this.build.gainXp((eliteKills - this.lastEliteKills) * ELITE_BONUS_XP);
        this.lastEliteKills = eliteKills;
      }
      if (state.status === 'dead') {
        this.finish(false);
      } else if (state.status === 'cleared') {
        this.clearedLevels += 1;
        this.build.gainXp(25 + this.depth * 5);
        this.rewards = this.build.createRewards(this.depth);
        this.selectedNextStageId = getRouteChoices(this.depth + 1)[0]?.id ?? null;
        this.phase = 'reward';
      }
    }
  }

  exploreArena() {
    if (this.phase === 'reward' && this.world?.getState().status === 'cleared') this.phase = 'exploring';
  }

  finishExploration() {
    if (this.phase === 'exploring') this.phase = 'reward';
  }

  selectRoute(id: string) {
    if (this.phase !== 'reward' || !getRouteChoices(this.depth + 1).some((stage) => stage.id === id)) return;
    this.selectedNextStageId = id;
  }

  async chooseReward(id: string) {
    if (this.phase !== 'reward') return;
    const nextStage = this.selectedNextStageId ? resolveCampaignStage(this.depth + 1, this.selectedNextStageId) : undefined;
    if (this.depth < CAMPAIGN.length && !nextStage) return;
    if (!this.build.claimReward(id)) return;
    this.rewards = [];
    this.world?.applyBuild(this.build.getState().stats);
    if (this.depth === CAMPAIGN.length) { this.finish(true); return; }
    this.world?.restoreBetweenLevels();
    const player = this.world?.getState().player;
    this.stageId = nextStage!.id;
    this.selectedNextStageId = null;
    this.depth += 1;
    await this.loadLevel(player);
  }

  equip(id: string) {
    if (!this.canEditBuild() || !this.build.equip(id)) return;
    this.world?.applyBuild(this.build.getState().stats, 'preserve-current');
  }

  unequip(slot: ItemSlot) {
    if (!this.canEditBuild() || !this.build.unequip(slot)) return;
    this.world?.applyBuild(this.build.getState().stats, 'preserve-current');
  }

  learn(id: SkillId) {
    if (!this.canEditBuild() || !this.build.learn(id)) return;
    const build = this.build.getState();
    this.world?.applyBuild(build.stats);
    this.world?.setUnlockedAbilities(build.unlockedAbilities);
    this.world?.setAbilityLoadout(build.abilityLoadout);
  }

  assignAbility(slot: ActiveAbilitySlot, id: ActiveAbilityId | null) {
    if (!this.canEditBuild() || !this.build.assignAbility(slot, id)) return;
    this.world?.setAbilityLoadout(this.build.getState().abilityLoadout);
  }

  buyMetaUpgrade(id: MetaUpgradeId) {
    if (this.phase !== 'menu' && this.phase !== 'won' && this.phase !== 'lost') return;
    if (this.meta.purchase(id) && this.phase === 'menu') this.build = new RunBuild(this.meta.getState().ranks);
  }

  togglePause() {
    if (this.phase === 'exploring') this.finishExploration();
    else if (this.phase === 'playing') this.phase = 'paused';
    else if (this.phase === 'paused') this.phase = 'playing';
  }

  returnToMenu() {
    if (['playing', 'exploring', 'paused', 'reward', 'loading', 'error'].includes(this.phase)) {
      this.session.complete('abandoned');
      this.settle(false);
    }
    this.generation += 1;
    this.phase = 'menu';
    this.world = null;
    this.builtLevel = null;
    this.rewards = [];
    this.selectedNextStageId = null;
    this.lastCacheItem = null;
    this.error = null;
    this.build = new RunBuild(this.meta.getState().ranks);
  }

  failPresentation(message: string) {
    this.error = message;
    this.phase = 'error';
  }

  dispose() { this.generation += 1; }

  private canEditBuild() { return this.phase === 'paused' || this.phase === 'reward'; }

  private async loadLevel(player?: PlayerState) {
    const generation = ++this.generation;
    this.phase = 'loading';
    this.lastEliteKills = 0;
    this.lastCacheItem = null;
    this.world = null;
    this.builtLevel = null;
    this.error = null;
    try {
      const builtLevel = await this.buildLevel(this.depth, this.session, player, this.stageId);
      if (generation !== this.generation) return;
      const world = new GameWorld({ builtLevel, runSession: this.session, mode: 'campaign', runResultGateway: { submitRunResult: async () => {} } });
      const build = this.build.getState();
      world.applyBuild(build.stats);
      world.setUnlockedAbilities(build.unlockedAbilities);
      world.setAbilityLoadout(build.abilityLoadout);
      this.builtLevel = builtLevel;
      this.world = world;
      this.phase = 'playing';
    } catch (error) {
      if (generation !== this.generation) return;
      this.error = error instanceof Error ? error.message : 'Не удалось загрузить уровень';
      this.phase = 'error';
    }
  }

  private finish(victory: boolean) {
    this.session.complete(victory ? 'victory' : 'died');
    this.phase = victory ? 'won' : 'lost';
    this.settle(victory);
  }

  private settle(victory: boolean) {
    const before = this.meta.getState().shards;
    this.meta.award(this.session.toState().runId, this.clearedLevels, victory);
    this.earnedShards = this.meta.getState().shards - before;
  }
}
