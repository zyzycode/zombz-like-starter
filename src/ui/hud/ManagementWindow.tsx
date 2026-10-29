import { useEffect, useRef } from 'react';
import type { RunActions, RunSnapshot } from '@/game/session/RunState';
import { ControlsPanel, InventoryPanel, MetaPanel, SkillsPanel } from './BuildPanels';

export type ManagementTab = 'inventory' | 'skills' | 'meta' | 'controls';
export const MANAGEMENT_TABS: { id: ManagementTab; label: string }[] = [
  { id: 'inventory', label: 'Вещи' }, { id: 'skills', label: 'Навыки' },
  { id: 'meta', label: 'Наследие' }, { id: 'controls', label: 'Управление' },
];

type Props = {
  tab: ManagementTab | null;
  snapshot: RunSnapshot | null;
  actions: RunActions | null;
  onTab: (tab: ManagementTab) => void;
  onClose: () => void;
};

/** Native modal keeps focus and pointer input out of the paused game. */
export function ManagementWindow({ tab, snapshot, actions, onTab, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (tab && !dialog.open) dialog.showModal();
    else if (!tab && dialog.open) dialog.close();
  }, [tab]);
  return <dialog ref={dialogRef} className="management-window" aria-labelledby="management-title" onCancel={(event) => { event.preventDefault(); onClose(); }}>
    {tab && snapshot && <>
      <header className="management-header">
        <div><h1 id="management-title">Персонаж</h1><p>{snapshot.phase === 'paused' ? 'Бой приостановлен' : snapshot.phase === 'reward' ? 'Арена зачищена' : 'Подготовка к пути'} · Ранг {snapshot.build.level}</p></div>
        <button autoFocus className="button secondary" onClick={onClose}>Закрыть <kbd>Esc</kbd></button>
      </header>
      <nav className="management-tabs" aria-label="Разделы персонажа">{MANAGEMENT_TABS.map((entry) => <button key={entry.id} aria-pressed={tab === entry.id} onClick={() => onTab(entry.id)}>{entry.label}{entry.id === 'skills' && snapshot.build.skillPoints > 0 ? ` · ${snapshot.build.skillPoints}` : ''}</button>)}</nav>
      <div className={`management-content management-${tab}`}>
        {tab === 'inventory' && <InventoryPanel snapshot={snapshot} actions={actions} />}
        {tab === 'skills' && <SkillsPanel snapshot={snapshot} actions={actions} />}
        {tab === 'meta' && <MetaPanel snapshot={snapshot} actions={actions} />}
        {tab === 'controls' && <ControlsPanel />}
      </div>
    </>}
  </dialog>;
}
