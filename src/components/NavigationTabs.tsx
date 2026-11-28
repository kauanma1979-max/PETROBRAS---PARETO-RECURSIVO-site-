import React, { useCallback, useLayoutEffect, useRef, useState } from 'react';
import {
  FileText,
  FileSpreadsheet,
  Target,
  BookMarked,
  Layers,
  Scissors,
  AlertTriangle,
  BookOpen,
} from 'lucide-react';

export interface NavTabItem {
  id: string;
  label: string;
  shortLabel: string;
  icon: React.ElementType;
}

export const NAV_TABS: NavTabItem[] = [
  { id: 'edital', label: 'Edital (Em Breve)', shortLabel: 'Edital', icon: FileText },
  { id: 'verticalizado', label: 'Edital Verticalizado', shortLabel: 'Verticalizado', icon: FileSpreadsheet },
  { id: 'pareto', label: 'Pareto Recursivo', shortLabel: 'Pareto 80/20', icon: Target },
  { id: 'material', label: 'Material de Estudos', shortLabel: 'Material', icon: BookMarked },
  { id: 'cronograma', label: 'Ciclos de Estudo', shortLabel: 'Ciclos', icon: Layers },
  { id: 'cortes', label: 'Regras de Corte', shortLabel: 'Cortes', icon: Scissors },
  { id: 'banca', label: 'Raio-X Cesgranrio', shortLabel: 'Cesgranrio', icon: AlertTriangle },
  { id: 'caderno', label: 'Caderno de Erros', shortLabel: 'Caderno Erros', icon: BookOpen },
];

interface NavigationTabsProps {
  activeTab: string;
  setActiveTab: (tabId: string) => void;
}

interface IndicatorBounds {
  leftPx: number;
  rightPx: number;
  ready: boolean;
}

export const NavigationTabs: React.FC<NavigationTabsProps> = ({ activeTab, setActiveTab }) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [bounds, setBounds] = useState<IndicatorBounds>({
    leftPx: 0,
    rightPx: 0,
    ready: false,
  });

  const measureIndicator = useCallback(() => {
    const track = trackRef.current;
    const activeBtn = tabRefs.current[activeTab];
    if (!track || !activeBtn) return;

    const totalWidth = track.scrollWidth;
    if (totalWidth <= 0) return;

    const leftPx = activeBtn.offsetLeft;
    const rightPx = Math.max(0, totalWidth - (activeBtn.offsetLeft + activeBtn.offsetWidth));

    setBounds((prev) => {
      if (
        prev.ready &&
        Math.abs(prev.leftPx - leftPx) < 0.5 &&
        Math.abs(prev.rightPx - rightPx) < 0.5
      ) {
        return prev;
      }
      return { leftPx, rightPx, ready: true };
    });
  }, [activeTab]);

  useLayoutEffect(() => {
    measureIndicator();

    const activeBtn = tabRefs.current[activeTab];
    if (activeBtn && typeof activeBtn.scrollIntoView === 'function') {
      activeBtn.scrollIntoView({
        behavior: 'auto',
        inline: 'nearest',
        block: 'nearest',
      });
    }

    const track = trackRef.current;
    if (!track || typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver(() => {
      measureIndicator();
    });
    observer.observe(track);
    return () => observer.disconnect();
  }, [activeTab, measureIndicator]);

  return (
    <nav
      aria-label="Navegação principal dos módulos"
      className="sticky top-0 z-30 bg-[#F5F7F6]/90 backdrop-blur-lg border-b border-slate-200/85 shadow-[0_1px_0_rgba(7,31,20,0.03),0_6px_18px_-14px_rgba(7,31,20,0.12)]"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div
          role="tablist"
          aria-label="Módulos do plano de estudos"
          className="overflow-x-auto scrollbar-none py-2"
        >
          <div
            ref={trackRef}
            className="relative flex items-center gap-1 min-w-max lg:min-w-full lg:grid lg:grid-cols-8 lg:gap-1.5"
          >
            {/* GPU-composited clip-path active indicator (replaces Motion layoutId main-thread animation) */}
            {bounds.ready && (
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 left-0 right-0 bg-[#071F14] rounded-xl border-b-2 border-orange-500 shadow-[0_2px_8px_-2px_rgba(7,31,20,0.28)]"
                style={{
                  clipPath: `inset(0px ${bounds.rightPx}px 0px ${bounds.leftPx}px round 12px)`,
                  transition: 'clip-path 220ms var(--ease-out)',
                }}
              />
            )}

            {NAV_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  ref={(el) => {
                    tabRefs.current[tab.id] = el;
                  }}
                  id={`body-tab-nav-${tab.id}`}
                  role="tab"
                  type="button"
                  aria-selected={isActive}
                  onClick={() => setActiveTab(tab.id)}
                  className={`btn-tactile relative z-10 flex items-center justify-center gap-2 px-3.5 py-2.5 lg:px-2 lg:py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-colors duration-150 ease-[var(--ease-out)] cursor-pointer ${
                    isActive
                      ? 'text-white'
                      : 'text-slate-600 hover:text-[#071F14] hover:bg-[#E7EFEA]/80'
                  } ${!bounds.ready && isActive ? 'bg-[#071F14] border-b-2 border-orange-500' : ''}`}
                >
                  <Icon
                    className={`w-4 h-4 shrink-0 transition-colors duration-150 ${
                      isActive ? 'text-[#FDB913]' : 'text-slate-500'
                    }`}
                    aria-hidden="true"
                  />
                  <span className="lg:hidden">{tab.shortLabel}</span>
                  <span className="hidden lg:inline truncate">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
};
