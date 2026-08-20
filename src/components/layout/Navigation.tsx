import { Home, Users, History, Settings, Plus } from 'lucide-react';
import type { Screen } from '../../core/models/types';

interface NavigationProps {
  current: Screen;
  onNavigate: (screen: Screen) => void;
}

const navItems = [
  { id: 'home', label: 'Home', icon: Home, screen: { name: 'home' } as Screen },
  { id: 'teams', label: 'Teams', icon: Users, screen: { name: 'teams' } as Screen },
  { id: 'history', label: 'History', icon: History, screen: { name: 'history' } as Screen },
  { id: 'settings', label: 'Settings', icon: Settings, screen: { name: 'settings' } as Screen },
];

function NavButton({
  label,
  icon: Icon,
  isActive,
  onClick,
}: {
  label: string;
  icon: typeof Home;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      aria-current={isActive ? 'page' : undefined}
      className={[
        'nav-btn group relative flex flex-col items-center justify-center gap-1.5 rounded-2xl transition-all duration-300 ease-out',
        isActive ? 'text-ink' : 'text-ink-faint hover:text-ink-muted',
      ].join(' ')}
      style={{ WebkitTapHighlightColor: 'transparent' }}
    >
      <span
        className={[
          'nav-icon-wrap relative flex items-center justify-center rounded-2xl transition-all duration-300 ease-out',
          isActive ? 'accent-gradient shadow-lg shadow-gold-500/30' : 'group-hover:bg-app-solid-3',
        ].join(' ')}
        style={{ width: 38, height: 38 }}
      >
        {isActive && (
          <span
            className="absolute inset-0 rounded-2xl accent-gradient opacity-30 blur-md"
            aria-hidden
          />
        )}
        <Icon
          size={20}
          strokeWidth={isActive ? 2.4 : 1.85}
          className={['relative transition-colors duration-300', isActive ? 'text-gold-50' : ''].join(' ')}
        />
      </span>
      <span
        className={[
          'text-[10px] font-bold tracking-[0.01em] leading-none transition-all duration-300',
          isActive ? 'opacity-100' : 'opacity-50 group-hover:opacity-70',
        ].join(' ')}
      >
        {label}
      </span>
    </button>
  );
}

function CreateButton({ isActive, onClick }: { isActive: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label="Create tournament"
      aria-current={isActive ? 'page' : undefined}
      className={[
        'nav-btn group relative flex flex-col items-center justify-center gap-1.5 rounded-2xl transition-all duration-300 ease-out',
        isActive ? 'text-ink' : 'text-ink-faint hover:text-ink-muted',
      ].join(' ')}
      style={{ WebkitTapHighlightColor: 'transparent' }}
    >
      <span
        className={[
          'nav-icon-wrap relative flex items-center justify-center rounded-2xl transition-all duration-300 ease-out',
          isActive
            ? 'accent-gradient shadow-lg shadow-gold-500/30'
            : 'bg-app-solid-2 border border-app-border group-hover:bg-app-solid-3 group-hover:border-app-border-strong',
        ].join(' ')}
        style={{ width: 38, height: 38 }}
      >
        {isActive && (
          <span
            className="absolute inset-0 rounded-2xl accent-gradient opacity-30 blur-md"
            aria-hidden
          />
        )}
        <Plus
          size={20}
          strokeWidth={isActive ? 2.6 : 2.25}
          className={['relative transition-colors duration-300', isActive ? 'text-gold-50' : 'text-gold-300'].join(' ')}
        />
      </span>
      <span
        className={[
          'text-[10px] font-bold tracking-[0.01em] leading-none transition-all duration-300',
          isActive ? 'opacity-100' : 'opacity-50 group-hover:opacity-70',
        ].join(' ')}
      >
        Create
      </span>
    </button>
  );
}

export function Navigation({ current, onNavigate }: NavigationProps) {
  const activeName = current.name;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40">
      <div className="mx-auto max-w-xl bg-app-solid-2 border-t border-app-border px-2.5 pt-2 shadow-nav-premium" style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 0.5rem)' }}>
        <div className="flex items-center justify-around">
          {navItems.map(({ id, label, icon, screen }) => (
            <NavButton
              key={id}
              label={label}
              icon={icon}
              isActive={activeName === id}
              onClick={() => onNavigate(screen)}
            />
          ))}

          <CreateButton
            isActive={activeName === 'create-tournament'}
            onClick={() => onNavigate({ name: 'create-tournament', nonce: String(Date.now()) })}
          />
        </div>
      </div>
    </nav>
  );
}
