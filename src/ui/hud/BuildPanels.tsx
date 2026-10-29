import { SKILLS } from '@/game/core/progression/skills';
import { META_UPGRADES } from '@/game/core/meta/MetaProgression';
import type { Item, ItemSlot, Stats } from '@/game/core/progression/types';
import type { RunActions, RunSnapshot } from '@/game/session/RunState';

export const SLOT_LABELS: Record<ItemSlot, string> = { weapon: 'Оружие', armor: 'Доспех', charm: 'Талисман' };
export const RARITY_LABELS = { common: 'Обычное', rare: 'Редкое', epic: 'Эпическое' };
const STAT_LABELS: Record<keyof Stats, string> = {
  maxHp: 'здоровье', damage: 'урон', moveSpeed: 'скорость', maxMana: 'мана',
  manaRegen: 'мана/сек', spellPower: 'сила магии', armor: 'броня',
};

export function ItemBonuses({ item }: { item: Item }) {
  return <ul className="item-bonuses">{Object.entries(item.bonuses).filter(([, value]) => value !== 0).map(([key, value]) => (
    <li key={key}><b>+{key === 'spellPower' ? `${Math.round(value * 100)}%` : Math.round(value)}</b> {STAT_LABELS[key as keyof Stats]}</li>
  ))}</ul>;
}

type PanelProps = { snapshot: RunSnapshot; actions: RunActions | null };

export function InventoryPanel({ snapshot, actions }: PanelProps) {
  const { build, phase } = snapshot;
  const canEdit = ['menu', 'reward', 'paused'].includes(phase);
  return <div className="panel-stack">
    <p className="muted small">Снаряжение действует до конца забега. {canEdit ? 'Выбери предмет для своего билда.' : 'Для смены снаряжения поставь игру на паузу.'}</p>
    <div className="equipped-slots">{(Object.keys(SLOT_LABELS) as ItemSlot[]).map((slot) => {
      const item = build.inventory.find((candidate) => candidate.id === build.equipment[slot]);
      return <div key={slot}><span>{SLOT_LABELS[slot]}</span><strong className={item ? `rarity-${item.rarity}` : ''}>{item?.name ?? 'Базовое'}</strong></div>;
    })}</div>
    {build.inventory.length === 0 && <p className="empty-hint">Первая экипировка ждёт после зачистки уровня.</p>}
    {build.inventory.map((item) => {
      const equipped = build.equipment[item.slot] === item.id;
      return <article className={`item-card border-${item.rarity}`} key={item.id}>
        <span className={`eyebrow rarity-${item.rarity}`}>{RARITY_LABELS[item.rarity]} · {SLOT_LABELS[item.slot]}</span>
        <h3>{item.name}</h3><ItemBonuses item={item} />
        <button className="button secondary compact" disabled={!actions || !canEdit || equipped} onClick={() => actions?.equip(item.id)}>{equipped ? 'Надето' : 'Надеть'}</button>
      </article>;
    })}
  </div>;
}

export function SkillsPanel({ snapshot, actions }: PanelProps) {
  const { build, phase } = snapshot;
  const canEdit = ['menu', 'reward', 'paused'].includes(phase);
  const branches = [{ prefix: 'warrior', name: 'Воин', symbol: 'Ⅰ' }, { prefix: 'mage', name: 'Маг', symbol: 'Ⅱ' }, { prefix: 'survivor', name: 'Выживание', symbol: 'Ⅲ' }];
  return <div className="panel-stack">
    <div className="section-caption"><span>Очки навыков</span><b className="accent">{build.skillPoints}</b></div>
    {!canEdit && <p className="muted small">Пауза останавливает бой и позволяет распределить очки.</p>}
    {branches.map((branch) => <section className="skill-branch" key={branch.prefix}>
      <h3><span>{branch.symbol}</span> {branch.name}</h3>
      {SKILLS.filter((skill) => skill.id.startsWith(branch.prefix)).map((skill) => {
        const rank = build.skills[skill.id];
        const locked = skill.prerequisite !== null && build.skills[skill.prerequisite] === 0;
        const previous = SKILLS.find((entry) => entry.id === skill.prerequisite);
        return <div className={`skill-node ${locked ? 'locked' : ''}`} key={skill.id}>
          <div className="section-caption"><strong>{skill.name}</strong><span>{rank}/{skill.maxRank}</span></div>
          <p>{skill.description}</p>
          {locked && <small>Сначала: {previous?.name}</small>}
          <button className="button secondary compact" disabled={!actions || !canEdit || locked || rank >= skill.maxRank || build.skillPoints === 0} onClick={() => actions?.learn(skill.id)}>{rank >= skill.maxRank ? 'Освоено' : 'Изучить · 1 очко'}</button>
        </div>;
      })}
    </section>)}
  </div>;
}

export function MetaPanel({ snapshot, actions }: PanelProps) {
  const canBuy = ['menu', 'won', 'lost'].includes(snapshot.phase);
  return <div className="panel-stack">
    <div className="section-caption"><span>Осколки наследия</span><b className="gold">✦ {snapshot.meta.shards}</b></div>
    <p className="muted small">Постоянные улучшения для следующих забегов. Осколки начисляются после победы или смерти за пройденные уровни.</p>
    {META_UPGRADES.map((upgrade) => {
      const rank = snapshot.meta.ranks[upgrade.id];
      const cost = upgrade.baseCost * (rank + 1);
      return <article className="meta-upgrade" key={upgrade.id}>
        <div className="section-caption"><strong>{upgrade.name}</strong><span>{rank}/{upgrade.maxRank}</span></div>
        <p>{upgrade.description}</p>
        <button className="button secondary compact" disabled={!actions || !canBuy || rank >= upgrade.maxRank || snapshot.meta.shards < cost} onClick={() => actions?.buyMetaUpgrade(upgrade.id)}>{rank >= upgrade.maxRank ? 'Максимум' : `Улучшить · ${cost} ✦`}</button>
      </article>;
    })}
    {!canBuy && <p className="muted small">Покупки доступны между забегами.</p>}
    {snapshot.metaError && <p className="notice error" role="status">{snapshot.metaError}</p>}
  </div>;
}

export function ControlsPanel() {
  const rows = [['W A S D', 'Движение · 8 направлений'], ['Мышь', 'Направление атаки'], ['ЛКМ / Space', 'Атака · можно удерживать'], ['Q', 'Огненный болт'], ['R', 'Кольцо пламени'], ['Shift', 'Рывок и уклонение'], ['E', 'Использовать источник рядом'], ['Esc', 'Пауза / продолжить']];
  return <div className="panel-stack controls"><h3>Управление</h3>{rows.map(([key, label]) => <div key={key}><kbd>{key}</kbd><span>{label}</span></div>)}<p className="muted small">Удар направляй мышью: после начала замаха направление фиксируется. Рывок прерывает замах и помогает выйти из-под удара. Трать ману на скопления противников.</p><p className="muted small">Со второго уровня встречаются руны: жёлтый контур предупреждает об ударе. Выйди за круг или уклонись. Руны ранят и врагов — заманивай их в ловушку.</p><p className="muted small">Временный билд сбрасывается после забега. Наследие хранится в этом браузере.</p></div>;
}
