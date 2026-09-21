import { Home, ClipboardList, BarChart3, User, Sparkles } from 'lucide-react';
import type { PageId } from '@/types';

interface NavItem {
  id: PageId;
  label: string;
  icon: typeof Home;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Acasă', icon: Home },
  { id: 'lessons', label: 'Lecții', icon: ClipboardList },
  { id: 'photo', label: 'Pozează', icon: Sparkles },
  { id: 'progress', label: 'Progres', icon: BarChart3 },
  { id: 'profile', label: 'Profil', icon: User },
];

export function BottomNav({
  current,
  onNavigate,
}: {
  current: PageId;
  onNavigate: (page: PageId) => void;
}) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200/80 bg-white/95 backdrop-blur-md safe-bottom">
      <div className="mx-auto flex max-w-md items-center justify-around px-3 py-1.5">
        {NAV_ITEMS.map((item) => {
          const isActive = current === item.id;
          const Icon = item.icon;
          const isCenter = item.id === 'photo';

          if (isCenter) {
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className="flex flex-col items-center justify-center py-1 transition-transform active:scale-95"
              >
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-xl transition-all ${
                    isActive
                      ? 'bg-brand-600 text-white shadow-xs'
                      : 'bg-slate-900 text-white hover:bg-slate-800'
                  }`}
                >
                  <Icon size={20} strokeWidth={2.2} />
                </div>
                <span className={`mt-0.5 text-[10px] font-medium ${isActive ? 'text-brand-600' : 'text-slate-500'}`}>
                  {item.label}
                </span>
              </button>
            );
          }

          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className="flex flex-col items-center justify-center py-1.5 px-3 transition-colors active:scale-95"
            >
              <Icon
                size={20}
                className={`transition-colors ${isActive ? 'text-brand-600' : 'text-slate-400 hover:text-slate-600'}`}
                strokeWidth={isActive ? 2.2 : 1.75}
              />
              <span className={`mt-1 text-[10px] font-medium tracking-tight ${isActive ? 'text-brand-600 font-semibold' : 'text-slate-400'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
