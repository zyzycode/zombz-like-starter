# Zombs-like Starter

Локальный top-down prototype на **React + Phaser + TypeScript**.

Проект уже вышел за рамки пустого шаблона: сейчас это играемый extraction-lite combat prototype с волнами врагов, ресурсными нодами, подбором лута, зоной эвакуации и отдельным React HUD.

## Как запустить

```bash
npm install
npm run dev
```

## Что это за проект

На текущем этапе игра работает полностью локально на клиенте:

- React отвечает за оболочку приложения и боковой HUD
- Phaser отвечает за цикл сцены, рендер, инпут и камеру движка
- `GameWorld` хранит и обновляет чистую игровую логику
- сетевого слоя, сервера и синхронизации пока нет

## Архитектура проекта

### Верхний уровень

Поток запуска выглядит так:

`src/main.tsx`
-> `App`
-> `GameShell`
-> `createGameConfig`
-> `Phaser.Game`
-> `BootScene`
-> `GameScene`
-> `GameWorld`
-> системы игрового мира
-> `WorldRenderer`
-> React HUD через `useHudStore`

### Кто что запускает

#### React-слой

- `src/main.tsx` создаёт React root и монтирует `App`
- `src/app/App.tsx` является корневым компонентом и просто рендерит `GameShell`
- `src/app/GameShell.tsx`
  - создаёт DOM-контейнер под Phaser
  - вызывает `new Phaser.Game(createGameConfig(container))`
  - рендерит справа `Hud`
  - синхронизирует флаг готовности игры через `useHudStore`

#### Phaser-слой

- `src/game/config/createGameConfig.ts`
  - собирает конфиг Phaser
  - регистрирует сцены `BootScene` и `GameScene`
  - настраивает resize и arcade physics

- `src/game/presentation/phaser/scenes/BootScene.ts`
  - грузит sprite sheets персонажей
  - грузит текстуры объектов и лута
  - после preload запускает `GameScene`

- `src/game/presentation/phaser/scenes/GameScene.ts`
  - создаёт `GameWorld`
  - создаёт `KeyboardController`
  - создаёт логическую `Camera`
  - создаёт `WorldRenderer`
  - на каждом тике:
    - читает input
    - вызывает `world.update(delta, input)`
    - обновляет логическую камеру
    - рендерит state через `WorldRenderer`
    - пробрасывает статистику в `useHudStore`

### Сердце игры: `GameWorld`

`src/game/core/world/GameWorld.ts` это главный orchestrator доменной логики. Он:

- хранит состояние карты, игрока, врагов, ресурсных нод, лута, extraction-зон и run-сессии
- создаёт стартовый мир
- вызывает системы в нужном порядке
- собирает итоговый `WorldState` для рендера
- завершает забег и отправляет результат в `RunResultGateway`

Текущий порядок обновления мира такой:

1. Обновление таймеров мира и `RunSession`
2. Обновление волн через `WaveSystem`
3. Обновление игрока и его атак через `CombatSystem`
4. Обновление врагов через `EnemyAiSystem`
5. Разделение юнитов через `SeparationSystem`
6. Применение попаданий игрока и врагов
7. Создание дропа через `LootResolver`
8. Подбор ресурсов и взаимодействия через `InteractionSystem`
9. Прогресс extraction через `ExtractionSystem`
10. Очистка уничтоженных и истёкших сущностей через `CleanupSystem`

### Зависимости между основными классами

#### Точка входа и сцены

- `App` зависит от `GameShell`
- `GameShell` зависит от `createGameConfig`, `Hud`, `useHudStore`
- `createGameConfig` зависит от `BootScene` и `GameScene`
- `BootScene` зависит от asset-конфига анимаций и текстур
- `GameScene` зависит от `GameWorld`, `KeyboardController`, `Camera`, `WorldRenderer`, `useHudStore`

#### Логика мира

- `GameWorld` зависит от:
  - `createPlayer`
  - `createResourceNode`
  - `ExtractionZone`
  - `RunSession`
  - `LocalRunResultGateway`
  - `CombatSystem`
  - `EnemyAiSystem`
  - `CleanupSystem`
  - `CollisionSystem`
  - `SeparationSystem`
  - `LootResolver`
  - `InteractionSystem`
  - `WaveSystem`

#### Боевые и игровые сущности

- `Character` это базовый класс
- `Player` наследуется от `Character`
- `Enemy` наследуется от `Character` и дополнительно зависит от `EnemyArchetype`
- `createPlayer` создаёт `Player`
- `createEnemy` создаёт `Enemy` из `enemyArchetypes`
- `createDestructible` создаёт `Destructible`
- `createResourceNode` создаёт `ResourceNode`

#### Системы

- `CombatSystem` зависит от `AttackController` и `CombatResolver`
- `EnemyAiSystem` зависит от `AttackController` и обновляет `Enemy`
- `WaveSystem` зависит от `WaveDirector` и `createEnemy`
- `InteractionSystem` работает с `DroppedResource`, `RunSession` и `Interactable`
- `ExtractionSystem` работает с `ExtractionZone` и `RunSession`
- `CleanupSystem` чистит коллекции мира
- `CollisionSystem` резолвит упор в карту, пропсы, destructible и resource nodes
- `SeparationSystem` раздвигает `Character`-сущности между собой

#### Рендер и представление

- `WorldRenderer` зависит от:
  - `BlockoutMapView`
  - `PlayerView`
  - `EnemyView`
  - `DestructibleView`
  - `ResourceNodeView`
  - `DroppedResourceView`
  - `ExtractionZoneView`
  - `Camera`

- `WorldRenderer` не считает игровую логику, а только отображает `WorldState`
- `Hud` зависит от `useHudStore`
- `GameScene` пишет данные в `useHudStore`, а React HUD их отображает

### Краткая схема слоёв

```txt
React
  main.tsx -> App -> GameShell -> Hud/useHudStore

Phaser
  createGameConfig -> BootScene -> GameScene

Domain
  GameScene -> GameWorld
  GameWorld -> Player / Enemy / ResourceNode / DroppedResource / ExtractionZone / RunSession
  GameWorld -> CombatSystem / EnemyAiSystem / WaveSystem / InteractionSystem / ExtractionSystem / CollisionSystem / SeparationSystem / CleanupSystem / LootResolver

Presentation
  GameScene -> Camera + WorldRenderer -> *View classes
```

## Что уже реализовано

### Базовый runtime

- Vite + React + TypeScript
- Phaser, встроенный в React shell
- отдельный Zustand store для HUD
- чистый `WorldState`, который отделён от Phaser-объектов

### Игрок

- локальный игрок
- движение по WASD
- 4-направленный facing
- melee-атака по `Space` или ЛКМ
- cooldown, windup, active window, recovery
- hurt state
- knockback
- смерть игрока

### Враги

- базовый класс врага через `Enemy`
- конфигурируемые архетипы в `enemyArchetypes`
- melee chase AI
- волновой спавн через `WaveSystem`
- получение урона, hurt state, смерть
- debug-данные первого врага в HUD

### Боевая система

- `AttackController` для жизненного цикла атаки
- `CombatResolver` для hit detection и применения урона
- `CombatSystem` как orchestration-слой боёвки
- friendly-fire фильтрация по `team`
- hit stop
- camera shake от сильных ударов

### Мир и окружение

- blockout-карта `firstBlockoutMap`
- world bounds
- статические пропсы карты
- collision игрока и врагов с окружением
- separation юнитов между собой
- ресурсные зоны с процедурным размещением нод
- resource nodes: `ore_vein`, `scrap_pile`, `bush`
- поддержка destructible объектов

### Лут и ресурсы

- loot tables
- выпадение ресурсов после уничтожения объектов
- pickup delay и время жизни дропа
- автоматический подбор nearby ресурсов
- учёт ресурсов в `RunSession`
- ledger по типам: `scrap`, `ore`, `essence`

### Extraction run loop

- `RunSession` с мета-состоянием забега
- волны врагов с ростом pressure
- extraction zone с channel progress
- потеря прогресса extraction при получении урона
- завершение run с outcome:
  - `extracted`
  - `died`
  - `abandoned` тип уже подготовлен в модели результата
- локальный `LocalRunResultGateway` вместо сетевой отправки

### Рендер и UI

- логическая `Camera`, не завязанная на Phaser API
- `WorldRenderer`, который отображает `WorldState`
- отдельные view-классы под разные типы объектов
- React HUD со статистикой:
  - HP
  - готовность атаки
  - ресурсы
  - волны
  - extraction status
  - позиция игрока
  - FPS
  - enemy debug

## Структура проекта

```txt
src/
  app/
    App.tsx
    GameShell.tsx

  game/
    animation/
    camera/
    config/
      enemies/
      loot/
      maps/
    core/
      characters/
      combat/
      contracts/
      enemies/
      entities/
      extraction/
      objects/
      resources/
      systems/
      waves/
      world/
    presentation/
      phaser/
        input/
        objects/
        renderer/
        scenes/

  shared/
    types/

  ui/
    hud/
```

## Что пока не реализовано

- multiplayer
- backend API
- реальный networking layer
- server authority
- сохранение прогресса между сессиями
- полноценные ranged/projectile механики
- inventory, crafting, meta-progression

Проще всего воспринимать текущую версию как хороший локальный фундамент под дальнейшее развитие extraction-combat игры.
