import React, { useEffect, useState } from 'react';
import {
  Compass,
  Download,
  RotateCcw,
  Database,
  Cloud,
  Flame,
} from 'lucide-react';
import { ProgressBar } from './ui/ProgressBar';
import { PetrobrasLogo } from './PetrobrasLogo';
import {
  DAILY_GOAL_MINUTES,
  formatMinutesAsHoursMinutes,
  getDistinctFocusDaysCount,
  getNetFocusSecondsForDate,
  getWeekdayFocusStreakCount,
  isWeekdayDateKey,
  loadFocusLogs,
  toLocalDateKey,
} from '../utils/studyFocusStorage';

interface HeaderProps {
  onResetProgress: () => void;
  onExportReport: () => void;
  onOpenBackupModal: () => void;
  onOpenDriveSync?: () => void;
}

interface HeaderFocusSnapshot {
  todayNetMinutes: number;
  todayGoalPct: number;
  isTodayWeekday: boolean;
  distinctDays: number;
  streakDays: number;
}

function readHeaderFocusSnapshot(): HeaderFocusSnapshot {
  const todayKey = toLocalDateKey();
  const logs = loadFocusLogs();
  const todayNetMinutes = Math.floor(getNetFocusSecondsForDate(todayKey, logs) / 60);
  return {
    todayNetMinutes,
    todayGoalPct: Math.min(100, Math.round((todayNetMinutes / DAILY_GOAL_MINUTES) * 100)),
    isTodayWeekday: isWeekdayDateKey(todayKey),
    distinctDays: getDistinctFocusDaysCount(logs),
    streakDays: getWeekdayFocusStreakCount(logs, todayKey),
  };
}

export const Header: React.FC<HeaderProps> = ({
  onResetProgress,
  onExportReport,
  onOpenBackupModal,
  onOpenDriveSync,
}) => {
  const [focusSnapshot, setFocusSnapshot] = useState<HeaderFocusSnapshot>(() =>
    readHeaderFocusSnapshot()
  );

  useEffect(() => {
    const syncCounters = () => {
      setFocusSnapshot(readHeaderFocusSnapshot());
    };
    window.addEventListener('transpetro_focus_updated', syncCounters);
    window.addEventListener('transpetro_data_restored', syncCounters);
    return () => {
      window.removeEventListener('transpetro_focus_updated', syncCounters);
      window.removeEventListener('transpetro_data_restored', syncCounters);
    };
  }, []);

  return (
    <header className="bg-[#071F14] text-white border-b border-[#133B28] relative z-20">
      {/* Petrobras Green · Yellow · Orange Top Accent Bar */}
      <div
        className="h-1 w-full bg-gradient-to-r from-[#008542] via-[#FDB913] to-[#F97316]"
        aria-hidden="true"
      />

      {/* Top Institutional Context Strip */}
      <div className="bg-[#05160E] border-b border-[#123524] px-4 sm:px-6 py-2 text-xs">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-slate-300">
            <span className="font-display font-bold text-[#FDB913] tracking-tight whitespace-nowrap">
              TRANSPETRO &amp; PETROBRAS
            </span>
            <span aria-hidden="true" className="text-orange-400 hidden sm:inline">·</span>
            <span className="hidden sm:inline">
              <strong className="text-white font-semibold">Ênfase 4: Dutos e Terminais</strong>{' '}
              <span className="text-orange-300">+</span>{' '}
              <strong className="text-white font-semibold">Ênfase 8: Operação</strong>
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-200">
            <Compass className="w-3.5 h-3.5 text-orange-400 shrink-0" aria-hidden="true" />
            <span>
              Status:{' '}
              <strong className="text-[#FDB913] font-semibold">Aguardando abertura do edital</strong>
            </span>
            <span aria-hidden="true" className="text-emerald-700 hidden sm:inline">·</span>
            <span className="hidden sm:inline text-orange-300 font-medium">
              Banca: Fundação Cesgranrio
            </span>
          </div>
        </div>
      </div>

      {/* Main Header Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 sm:py-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Brand Lockup with Petrobras Logo at Top */}
          <div className="flex items-center gap-3.5 min-w-0">
            <PetrobrasLogo className="w-11 h-11 sm:w-12 sm:h-12" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5">
                <h1 className="text-lg sm:text-xl font-display font-bold tracking-tight text-white whitespace-nowrap">
                  Plano Pareto Recursivo
                </h1>
                <span className="text-xs text-[#FDB913] font-semibold font-mono tabular-nums whitespace-nowrap">
                  42 Tópicos Unificados
                </span>
                <span className="hidden sm:inline-block text-[11px] font-semibold text-orange-300 whitespace-nowrap">
                  · Sistema Petrobras
                </span>
              </div>
              <p className="text-xs text-slate-200 mt-0.5 truncate">
                Conhecimentos Específicos Mesclados · Transpetro (38) + Petrobras (32) com Identificação de Origem
              </p>
            </div>
          </div>

          {/* Progress Widget & Global Actions */}
          <div className="flex flex-wrap items-center justify-between sm:justify-end gap-3 sm:gap-4 bg-[#0A291A] px-3.5 py-2.5 rounded-xl border border-[#184831]">
            <div className="flex items-center gap-3">
              <div>
                <div className="text-[11px] text-slate-300 font-medium">
                  {focusSnapshot.isTodayWeekday ? 'Meta Hoje (50+50m)' : 'Meta Hoje (Descanso)'}
                </div>
                <div className="text-xs sm:text-sm font-bold text-[#FDB913] font-mono tabular-nums">
                  {focusSnapshot.isTodayWeekday ? (
                    <>
                      {formatMinutesAsHoursMinutes(focusSnapshot.todayNetMinutes)}{' '}
                      <span className="text-slate-200 font-normal">
                        / 1h40min ({focusSnapshot.todayGoalPct}%)
                      </span>
                    </>
                  ) : focusSnapshot.todayNetMinutes > 0 ? (
                    <>
                      {formatMinutesAsHoursMinutes(focusSnapshot.todayNetMinutes)}{' '}
                      <span className="text-slate-200 font-normal">(extra)</span>
                    </>
                  ) : (
                    <span className="text-slate-200 font-normal">Fim de semana</span>
                  )}
                </div>
              </div>
              <div className="w-24 sm:w-28">
                <ProgressBar
                  value={focusSnapshot.todayNetMinutes}
                  max={DAILY_GOAL_MINUTES}
                  label="Progresso diário de foco (2 × 50 min)"
                  tone="gold"
                  trackTheme="dark"
                  height="md"
                />
              </div>
            </div>

            <div
              className="flex items-center gap-2 sm:border-l sm:border-[#1B4F36] sm:pl-3"
              title="Contagem atrelada apenas aos dias úteis estudados (Seg–Sex). Sábados e domingos não contam como foco nem quebram a sequência."
            >
              <Flame className="w-4 h-4 text-[#FDB913] shrink-0" aria-hidden="true" />
              <div>
                <div className="text-[10px] text-slate-300 font-medium leading-tight">
                  Foco (Seg–Sex)
                </div>
                <div className="text-xs font-bold text-white font-mono tabular-nums whitespace-nowrap">
                  {focusSnapshot.distinctDays} {focusSnapshot.distinctDays === 1 ? 'dia' : 'dias'}{' '}
                  <span className="text-[#FDB913]">
                    · {focusSnapshot.streakDays} em sequência
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:border-l sm:border-[#1B4F36] sm:pl-3">
              <button
                id="btn-open-drive-sync"
                type="button"
                onClick={onOpenDriveSync || onOpenBackupModal}
                aria-label="Sincronizar dados com o Google Drive"
                title="Sincronizar dados com o Google Drive (Nuvem)"
                className="h-9 px-3 rounded-lg bg-[#05160E] hover:bg-[#113825] text-slate-100 border border-[#1F5A3D] transition-colors text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Cloud className="w-3.5 h-3.5 text-[#FDB913]" aria-hidden="true" />
                <span className="hidden sm:inline">Drive</span>
              </button>

              <button
                id="btn-open-backup-modal"
                type="button"
                onClick={onOpenBackupModal}
                aria-label="Fazer Backup ou Restaurar Dados"
                title="Fazer Backup ou Restaurar Dados do Aplicativo"
                className="h-9 px-3 rounded-lg bg-[#008542] hover:bg-[#006837] text-white border border-[#1EA861]/40 transition-colors text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Database className="w-3.5 h-3.5" aria-hidden="true" />
                <span className="hidden md:inline">Backup / Restaurar</span>
                <span className="md:hidden">Backup</span>
              </button>

              <button
                id="btn-export-report"
                type="button"
                onClick={onExportReport}
                aria-label="Exportar relatório de estudos em Markdown"
                title="Exportar Resumo de Estudos em Markdown"
                className="h-9 px-3 rounded-lg bg-orange-600 hover:bg-orange-700 text-white border border-orange-500/40 transition-colors text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" aria-hidden="true" />
                <span className="hidden sm:inline">Relatório</span>
              </button>

              <button
                id="btn-reset-progress"
                type="button"
                onClick={onResetProgress}
                aria-label="Reiniciar registros de foco e cronômetro"
                title="Reiniciar Registros de Foco e Cronômetro"
                className="h-9 w-9 rounded-lg bg-[#05160E] hover:bg-rose-950/80 text-slate-300 hover:text-rose-300 border border-[#1F5A3D] transition-colors inline-flex items-center justify-center shrink-0 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
