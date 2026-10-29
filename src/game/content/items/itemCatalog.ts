import type { ItemDefinition } from '@/game/core/progression/types';

/** Authored equipment profiles; rarity and depth scaling belong to RunBuild. */
export const ITEM_DEFINITIONS: readonly ItemDefinition[] = [
  {
    id: 'weapon-guard-blade', name: 'Клинок стража', slot: 'weapon',
    description: 'Усиливает ближние удары и продлевает стан Удара щитом (F) и Ледяной волны (X).',
    baseBonuses: { damage: 14, stunDurationBonus: 0.1 },
  },
  {
    id: 'weapon-ember-blade', name: 'Клинок углей', slot: 'weapon',
    description: 'Усиливает заклинания и немного повышает урон оружия.',
    baseBonuses: { damage: 6, spellPower: 0.15 },
  },
  {
    id: 'weapon-scout-sabre', name: 'Сабля разведчика', slot: 'weapon',
    description: 'Лёгкое оружие для подвижного бойца: урон и скорость движения.',
    baseBonuses: { damage: 10, moveSpeed: 8 },
  },
  {
    id: 'armor-guard-mail', name: 'Кольчуга стража', slot: 'armor',
    description: 'Увеличивает запас здоровья и защищает бронёй.',
    baseBonuses: { maxHp: 18, armor: 2 },
  },
  {
    id: 'armor-ash-robe', name: 'Мантия пепла', slot: 'armor',
    description: 'Даёт ману и силу магии, сокращает перезарядку способностей Q/R/F/Z/X/C. На рывок не влияет.',
    baseBonuses: { maxMana: 18, spellPower: 0.1, cooldownReduction: 0.06 },
  },
  {
    id: 'armor-traveller-coat', name: 'Куртка странника', slot: 'armor',
    description: 'Даёт здоровье и помогает быстрее перемещаться по арене.',
    baseBonuses: { maxHp: 14, moveSpeed: 10 },
  },
  {
    id: 'charm-iron-seal', name: 'Железная печать', slot: 'charm',
    description: 'Добавляет урон и броню, продлевает стан Удара щитом (F) и Ледяной волны (X).',
    baseBonuses: { damage: 6, armor: 1, stunDurationBonus: 0.08 },
  },
  {
    id: 'charm-ether-heart', name: 'Сердце эфира', slot: 'charm',
    description: 'Повышает запас маны, её восстановление и силу заклинаний.',
    baseBonuses: { maxMana: 15, manaRegen: 2, spellPower: 0.1 },
  },
  {
    id: 'charm-wayfarer-knot', name: 'Узел путника', slot: 'charm',
    description: 'Скорость движения и запас маны для подвижного бойца.',
    baseBonuses: { maxMana: 10, moveSpeed: 10 },
  },
  {
    id: 'helmet-iron-helm', name: 'Железный шлем', slot: 'helmet',
    description: 'Небольшой запас здоровья и дополнительная броня.',
    baseBonuses: { maxHp: 10, armor: 1 },
  },
  {
    id: 'helmet-ember-circlet', name: 'Венец углей', slot: 'helmet',
    description: 'Усиливает магию, даёт ману и сокращает перезарядку способностей Q/R/F/Z/X/C. На рывок не влияет.',
    baseBonuses: { maxMana: 10, spellPower: 0.06, cooldownReduction: 0.04 },
  },
  {
    id: 'helmet-scout-hood', name: 'Капюшон разведчика', slot: 'helmet',
    description: 'Лёгкий капюшон: больше здоровья и скорости движения.',
    baseBonuses: { maxHp: 8, moveSpeed: 6 },
  },
  {
    id: 'boots-guard-greaves', name: 'Сапоги стража', slot: 'boots',
    description: 'Укрепляют защиту и немного ускоряют движение.',
    baseBonuses: { moveSpeed: 8, armor: 1 },
  },
  {
    id: 'boots-ether-treads', name: 'Башмаки эфира', slot: 'boots',
    description: 'Ускоряют шаг и восстановление маны.',
    baseBonuses: { moveSpeed: 10, manaRegen: 1 },
  },
  {
    id: 'boots-trail-runners', name: 'Сапоги следопыта', slot: 'boots',
    description: 'Самый быстрый шаг среди сапог и небольшой запас здоровья.',
    baseBonuses: { moveSpeed: 14, maxHp: 6 },
  },
];
