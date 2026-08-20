import { useState } from 'react';
import { Search, Trophy, CheckCircle, Trash2, X } from 'lucide-react';
import type { Screen, Tournament } from '../core/models/types';
import { TournamentListRow, TournamentList } from '../components/tournament/TournamentListRow';
import { EmptyState } from '../components/ui/EmptyState';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';

interface HistoryScreenProps {
  tournaments: Tournament[];
  onNavigate: (screen: Screen) => void;
  onTeamClick?: (teamId: string) => void;
  onDelete?: (id: string) => void;
}

type FilterOption = 'all' | 'active' | 'completed' | 'draft';

export function HistoryScreen({ tournaments, onNavigate, onDelete }: HistoryScreenProps) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterOption>('all');
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState(false);

  const filtered = tournaments
    .filter((t) => filter === 'all' || t.status === filter)
    .filter((t) =>
      search.trim() === '' ||
      t.name.toLowerCase().includes(search.toLowerCase()),
    )
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const counts = {
    all: tournaments.length,
    active: tournaments.filter((t) => t.status === 'active').length,
    completed: tournaments.filter((t) => t.status === 'completed').length,
    draft: tournaments.filter((t) => t.status === 'draft').length,
  };

  const filterOptions: { id: FilterOption; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'active', label: 'Active' },
    { id: 'completed', label: 'Done' },
    { id: 'draft', label: 'Draft' },
  ];

  const selectedCount = selectedIds.size;

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function enterSelectMode() {
    setSelectionMode(true);
    setSelectedIds(new Set());
  }

  function exitSelectMode() {
    setSelectionMode(false);
    setSelectedIds(new Set());
  }

  function handleDeleteSelected() {
    if (onDelete) {
      selectedIds.forEach((id) => onDelete(id));
    }
    exitSelectMode();
    setConfirmDelete(false);
  }

  return (
    <div className="flex flex-col gap-5 pb-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-ink tracking-tight">History</h1>
          <p className="text-sm text-ink-faint">{tournaments.length} tournament{tournaments.length !== 1 ? 's' : ''}</p>
        </div>
        {onDelete && !selectionMode && (
          <Button size="sm" variant="secondary" icon={<CheckCircle size={15} />} onClick={enterSelectMode}>Select</Button>
        )}
      </div>

      {/* Selection mode bar */}
      {selectionMode && (
        <div className="flex items-center justify-between gap-3 glass rounded-2xl p-3 animate-fade-in">
          <div className="flex items-center gap-2">
            <button
              onClick={exitSelectMode}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-app-surface-2 border border-app-border hover:bg-app-surface-3 transition-colors duration-200 ease-out active:scale-95"
              aria-label="Exit select mode"
            >
              <X size={16} />
            </button>
            <span className="text-sm font-semibold text-ink-muted">
              {selectedCount === 0 ? 'Tap tournaments to select' : `${selectedCount} selected`}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {selectedCount > 0 && (
              <Button
                size="sm"
                variant="danger"
                icon={<Trash2 size={15} />}
                onClick={() => setConfirmDelete(true)}
              >
                Delete Selected
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-faint pointer-events-none" />
        <input
          type="text"
          placeholder="Search tournaments..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-11 pr-4 py-3 bg-app-surface-2 border border-app-border/50 rounded-xl text-sm text-ink placeholder-ink-faint/40 outline-none focus:border-gold-400/40 focus:bg-app-surface-3 transition-all duration-200 ease-out"
          style={{
            backgroundImage:
              'linear-gradient(180deg, color-mix(in srgb, var(--accent-500) 4%, transparent) 0%, transparent 60%)',
          }}
        />
      </div>

      {/* Filters */}
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-1 px-1">
        {filterOptions.map((opt) => {
          const isActive = filter === opt.id;
          return (
            <button
              key={opt.id}
              onClick={() => setFilter(opt.id)}
              className={[
                'shrink-0 flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold tracking-tight transition-all duration-200 ease-out active:scale-95',
                isActive
                  ? 'accent-gradient text-gold-50 shadow-sm shadow-gold-500/15 border border-gold-400/20'
                  : 'bg-app-solid-2 text-ink-faint hover:bg-app-solid-3 hover:text-ink-muted border border-app-border/50',
              ].join(' ')}
            >
              {opt.label}
              <span className="text-[10px] opacity-60 tabular-nums">{counts[opt.id]}</span>
            </button>
          );
        })}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={<Trophy size={32} className="mx-auto mb-3 text-ink-faint" />}
          title={tournaments.length === 0 ? 'No Tournaments' : 'No Results'}
          description={tournaments.length === 0 ? 'Create your first tournament to see it here.' : 'Try a different search or filter.'}
        />
      ) : (
        <TournamentList>
          {filtered.map((t, i) => (
            <TournamentListRow
              key={t.id}
              tournament={t}
              selected={selectedIds.has(t.id)}
              selectionMode={selectionMode}
              onToggleSelect={() => toggleSelect(t.id)}
              onClick={() => onNavigate({ name: 'tournament', id: t.id })}
            />
          ))}
        </TournamentList>
      )}

      {/* Delete confirmation */}
      <Modal open={confirmDelete} onClose={() => setConfirmDelete(false)} title="Delete Tournaments">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-ink-muted">
            Are you sure you want to delete <strong className="text-ink">{selectedCount} tournament{selectedCount !== 1 ? 's' : ''}</strong>? This cannot be undone.
          </p>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setConfirmDelete(false)} className="flex-1">Cancel</Button>
            <Button variant="danger" icon={<Trash2 size={16} />} onClick={handleDeleteSelected} className="flex-1">Delete</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
