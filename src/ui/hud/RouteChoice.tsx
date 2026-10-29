import type { RunActions, RunSnapshot } from '@/game/session/RunState';

export function RouteChoice({ snapshot, actions }: { snapshot: RunSnapshot; actions: RunActions | null }) {
  if (snapshot.routeChoices.length === 0) return null;
  if (snapshot.routeChoices.length === 1) return <p className="next-route">Дальше: <strong>{snapshot.routeChoices[0].name}</strong></p>;
  return <fieldset className="route-choice">
    <legend>Куда дальше?</legend>
    <p>Выбери путь. Забрав предмет ниже, ты перейдёшь в выбранную локацию.</p>
    <div className="route-options">{snapshot.routeChoices.map((route) => <label className="route-option" key={route.id}>
      <input type="radio" name="next-route" value={route.id} checked={snapshot.selectedNextStageId === route.id} disabled={!actions} onChange={() => actions?.selectRoute(route.id)} />
      <span><strong>{route.name}</strong><small>{route.biome}</small><span className="route-description">{route.description}</span></span>
    </label>)}</div>
  </fieldset>;
}
