import React from 'react';
import { motion } from 'motion/react';
import {
  FileText,
  FileSpreadsheet,
  Target,
  BookMarked,
  Layers,
  Scissors,
  AlertTriangle,
  BookOpen
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
  { id: 'banca', label: 'DNA Cesgranrio', shortLabel: 'Cesgranrio', icon: AlertTriangle },
  { id: 'caderno', label: 'Caderno de Erros', shortLabel: 'Caderno Erros', icon: BookOpen }
];

interface NavigationTabsProps {
  activeTab: string;
  setActiveTab: (tabId: string) => void;
}

export const NavigationTabs: React.FC<NavigationTabsProps> = ({ activeTab, setActiveTab }) => {
  return (
    <nav
      aria-label="Navegação principal dos módulos"
      className="sticky top-0 z-30 bg-[#F6F8F7]/95 backdrop-blur-md border-b border-slate-200/90"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div
          role="tablist"
          aria-label="Módulos do plano de estudos"
          className="flex items-center gap-1 overflow-x-auto scrollbar-none py-2 lg:grid lg:grid-cols-8 lg:gap-1.5"
        >
          {NAV_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                id={`body-tab-nav-${tab.id}`}
                role="tab"
                type="button"
                aria-selected={isActive}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex items-center justify-center gap-2 px-3.5 py-2.5 lg:px-2 lg:py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-colors duration-150 cursor-pointer ${
                  isActive
                    ? 'text-white'
                    : 'text-slate-600 hover:text-[#071F14] hover:bg-[#E7EFEA]'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeNavIndicator"
                    transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                    className="absolute inset-0 bg-[#071F14] rounded-xl shadow-2xs border-b-2 border-orange-500"
                    aria-hidden="true"
                  />
                )}
                <Icon
                  className={`w-4 h-4 shrink-0 relative z-10 ${
                    isActive ? 'text-[#FDB913]' : 'text-slate-500'
                  }`}
                  aria-hidden="true"
                />
                <span className="relative z-10 lg:hidden">{tab.shortLabel}</span>
                <span className="relative z-10 hidden lg:inline truncate">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
