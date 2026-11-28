import React, { useState, useEffect } from 'react';
import { MotionConfig } from 'motion/react';
import { Header } from './components/Header';
import { EditalSummary } from './components/EditalSummary';
import { EditalVerticalizado } from './components/EditalVerticalizado';
import { ParetoMatrix } from './components/ParetoMatrix';
import { StudySchedule } from './components/StudySchedule';
import { CutRules } from './components/CutRules';
import { BancaCesgranrio } from './components/BancaCesgranrio';
import { ErrorNotebook } from './components/ErrorNotebook';
import { DailySessionModal } from './components/DailySessionModal';
import { TabMaterialEstudo } from './components/TabMaterialEstudo';
import { FormulaCalculatorModal } from './components/FormulaCalculatorModal';
import { BackupRestoreModal } from './components/BackupRestoreModal';
import { NavigationTabs } from './components/NavigationTabs';
import { ConfirmDialog } from './components/ui/ConfirmDialog';
import { StudyResumePrompt } from './components/StudyResumePrompt';
import { SYLLABUS_COUNTS } from './data/verticalSyllabusData';
import {
  getDriveEndpoint,
  getDriveAutoSync,
  getDriveAutoPush,
  getDriveSyncValidated,
  setDriveEndpoint,
  setDriveAutoSync,
  setDriveAutoPush,
  fetchGoogleDriveDataViaJsonp,
  pushBackupToGoogleDrive,
  extractDriveSyncEndpointFromLocation,
  mergeTranspetroBackupData,
  savePreSyncSafetyBackup,
  setDriveSyncValidated,
  setLastDriveSyncDate
} from './utils/driveSync';
import { OfflineIndicator } from './components/OfflineIndicator';
import { ToastBanner } from './components/ui/ToastBanner';
import { generateBackupPayload, restoreFromRawData } from './utils/backupStorage';
import {
  FOCUS_STORAGE_KEYS,
  formatMinutesAsHoursMinutes,
  getDistinctFocusDaysCount,
  getWeekdayFocusStreakCount,
  loadActivePomodoroState,
  loadFocusLogs,
  normalizeRestoredPomodoroOnAppOpen,
  saveActivePomodoroState,
  saveFocusLogs,
  saveStudyResumeState,
} from './utils/studyFocusStorage';
import { getInitialCalendarDateKey } from './utils/studyCalendar2027';
import {
  resolveStudyResumeContext,
  type ResolvedStudyResume,
  type TimerLaunchTarget,
} from './utils/studyResume';
import type { CesgranrioAiLaunchRequest } from './data/cesgranrioDna';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>(() => {
    return localStorage.getItem('transpetro_active_tab_v1') || 'edital';
  });

  const scrollPositionsRef = React.useRef<Record<string, number>>({});

  const handleTabChange = (newTab: string) => {
    if (newTab === activeTab) return;

    scrollPositionsRef.current[activeTab] = window.scrollY;
    setActiveTab(newTab);
    try {
      localStorage.setItem('transpetro_active_tab_v1', newTab);
    } catch {
      // ignore
    }

    requestAnimationFrame(() => {
      const targetScroll = scrollPositionsRef.current[newTab] ?? 0;
      window.scrollTo({
        top: targetScroll,
        behavior: 'instant' as ScrollBehavior
      });
    });
  };

  const [activeTimerTarget, setActiveTimerTarget] = useState<TimerLaunchTarget | null>(null);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(FOCUS_STORAGE_KEYS.SELECTED_DATE);
      if (saved && /^\d{4}-\d{2}-\d{2}$/.test(saved)) return saved;
    } catch {
      // ignore
    }
    return getInitialCalendarDateKey();
  });
  const [resumeContext, setResumeContext] = useState<ResolvedStudyResume | null>(() => {
    // Na abertura do app, normaliza qualquer cronômetro que tenha sido deixado rodando (pausa no último checkpoint)
    const active = loadActivePomodoroState();
    const normalized = normalizeRestoredPomodoroOnAppOpen(active);
    if (active && normalized && active.isRunning && !normalized.isRunning) {
      saveActivePomodoroState(normalized);
    }
    return resolveStudyResumeContext();
  });
  const [isResumePromptOpen, setIsResumePromptOpen] = useState<boolean>(() => {
    return resolveStudyResumeContext() !== null;
  });

  const [isCalculatorOpen, setIsCalculatorOpen] = useState<boolean>(false);
  const [calculatorFormula, setCalculatorFormula] = useState<string | undefined>(undefined);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState<boolean>(false);
  const [backupModalTab, setBackupModalTab] = useState<'drive' | 'file' | 'code'>('drive');
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState<boolean>(false);
  const [cesgranrioLaunchRequest, setCesgranrioLaunchRequest] =
    useState<CesgranrioAiLaunchRequest | null>(null);
  const [globalToast, setGlobalToast] = useState<string | null>(null);

  const handleLaunchCesgranrioAi = (req: CesgranrioAiLaunchRequest) => {
    setCesgranrioLaunchRequest(req);
    handleTabChange('banca');
  };

  const handleSelectCalendarDate = (dateKey: string) => {
    setSelectedCalendarDate(dateKey);
    try {
      localStorage.setItem(FOCUS_STORAGE_KEYS.SELECTED_DATE, dateKey);
    } catch {
      // ignore
    }
  };

  const handleOpenScheduleAtDate = (dateKey: string) => {
    handleSelectCalendarDate(dateKey);
    setIsResumePromptOpen(false);
    handleTabChange('cronograma');
  };

  const handleResumeTimerFromPrompt = (target: TimerLaunchTarget) => {
    setIsResumePromptOpen(false);
    setActiveTimerTarget(target);
  };

  const handleOpenCalculator = (formulaNome?: string) => {
    setCalculatorFormula(formulaNome);
    setIsCalculatorOpen(true);
  };

  const handleOpenBackupModal = (tab: 'drive' | 'file' | 'code' = 'file') => {
    setBackupModalTab(tab);
    setIsBackupModalOpen(true);
  };

  const handleOpenDriveSync = () => {
    setBackupModalTab('drive');
    setIsBackupModalOpen(true);
  };

  const handleDataRestored = () => {
    try {
      const savedDate = localStorage.getItem(FOCUS_STORAGE_KEYS.SELECTED_DATE);
      if (savedDate && /^\d{4}-\d{2}-\d{2}$/.test(savedDate)) {
        setSelectedCalendarDate(savedDate);
      }
      setResumeContext(resolveStudyResumeContext());
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    const refreshResume = () => setResumeContext(resolveStudyResumeContext());
    window.addEventListener('transpetro_data_restored', handleDataRestored);
    window.addEventListener('transpetro_focus_updated', refreshResume);
    return () => {
      window.removeEventListener('transpetro_data_restored', handleDataRestored);
      window.removeEventListener('transpetro_focus_updated', refreshResume);
    };
  }, []);

  useEffect(() => {
    const handleDriveJsonLoaded = (e: any) => {
      try {
        const incomingData = e?.detail;
        if (!incomingData || typeof incomingData !== 'object') return;

        savePreSyncSafetyBackup();
        const currentLocal = generateBackupPayload();
        const merged = mergeTranspetroBackupData(currentLocal, incomingData);
        restoreFromRawData(merged);

        setDriveSyncValidated(true);
        setLastDriveSyncDate(new Date().toLocaleString('pt-BR'));
        handleDataRestored();
      } catch (err) {
        console.error('Error integrating Google Drive data:', err);
      }
    };

    (window as any).sincronizarGoogleDrive = () => {
      const endpoint = getDriveEndpoint();
      if (endpoint) {
        return fetchGoogleDriveDataViaJsonp(endpoint);
      }
      return Promise.reject(new Error('Endpoint do Google Apps Script não configurado.'));
    };

    window.addEventListener('drive-json-loaded', handleDriveJsonLoaded);
    return () => {
      window.removeEventListener('drive-json-loaded', handleDriveJsonLoaded);
    };
  }, []);

  useEffect(() => {
    const pairedEndpoint = extractDriveSyncEndpointFromLocation();
    if (pairedEndpoint) {
      setDriveEndpoint(pairedEndpoint);
      setDriveAutoSync(true);
      setDriveAutoPush(true);
      setDriveSyncValidated(true);
      setGlobalToast('Conectando este dispositivo ao seu Google Drive...');
      fetchGoogleDriveDataViaJsonp(pairedEndpoint)
        .then(() => {
          setGlobalToast('Dispositivo conectado e sincronizado com seu Google Drive!');
          setTimeout(() => setGlobalToast(null), 5000);
        })
        .catch((err) => {
          console.warn('Device pairing sync notice:', err?.message);
          setGlobalToast('Link do Drive salvo neste aparelho! Confira a aba Drive se precisar revalidar.');
          setTimeout(() => setGlobalToast(null), 6000);
        });
      return;
    }

    const isAutoSync = getDriveAutoSync();
    const isValidated = getDriveSyncValidated();
    const endpoint = getDriveEndpoint();

    if (isAutoSync && isValidated && endpoint && endpoint.startsWith('https://script.google.com/')) {
      const timer = setTimeout(() => {
        fetchGoogleDriveDataViaJsonp(endpoint).catch((err) => {
          console.warn('Auto-sync notice:', err?.message);
        });
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, []);

  // Debounced auto-push to Google Drive when local study data changes
  useEffect(() => {
    let pushTimer: ReturnType<typeof setTimeout> | null = null;
    const scheduleAutoPush = () => {
      const autoPush = getDriveAutoPush();
      const validated = getDriveSyncValidated();
      const endpoint = getDriveEndpoint();
      if (!autoPush || !validated || !endpoint || !endpoint.startsWith('https://script.google.com/')) {
        return;
      }
      if (pushTimer) clearTimeout(pushTimer);
      pushTimer = setTimeout(() => {
        pushBackupToGoogleDrive(endpoint).catch((err) => {
          console.warn('Auto-push Drive notice:', err?.message);
        });
      }, 5000);
    };

    window.addEventListener('transpetro_storage_changed', scheduleAutoPush);
    window.addEventListener('transpetro_focus_updated', scheduleAutoPush);
    window.addEventListener('transpetro_cesgranrio_memory_updated', scheduleAutoPush);
    return () => {
      if (pushTimer) clearTimeout(pushTimer);
      window.removeEventListener('transpetro_storage_changed', scheduleAutoPush);
      window.removeEventListener('transpetro_focus_updated', scheduleAutoPush);
      window.removeEventListener('transpetro_cesgranrio_memory_updated', scheduleAutoPush);
    };
  }, []);

  const confirmResetProgress = () => {
    saveFocusLogs([]);
    saveActivePomodoroState(null);
    saveStudyResumeState(null);
    setResumeContext(null);
  };

  const handleExportReport = () => {
    const logs = loadFocusLogs();
    const totalMinutes = Math.floor(
      logs.reduce((acc, seg) => acc + seg.durationSeconds, 0) / 60
    );
    const distinctWeekdays = getDistinctFocusDaysCount(logs);
    const weekdayStreak = getWeekdayFocusStreakCount(logs);

    const report = `# RELATÓRIO DE ESTUDOS — TRANSPETRO & PETROBRAS (CONTEÚDO MESCLADO)
Bases Programáticas:
- Transpetro 2026 — Ênfase 4: Dutos e Terminais (38 itens específicos)
- Petrobras 2023.2 — Ênfase 8: Operação (32 objetos em Blocos I, II e III)

## Matriz Unificada (${SYLLABUS_COUNTS.total} Tópicos):
- Em comum (Transpetro + Petrobras): ${SYLLABUS_COUNTS.ambos} tópicos
- Exclusivos Transpetro: ${SYLLABUS_COUNTS.transpetro} tópicos
- Exclusivos Petrobras: ${SYLLABUS_COUNTS.petrobras} tópicos

## Plano 2027 & Progresso de Foco (50m + 20m + 50m):
- Jan–Mar/2027 (Nivelamento): 1 matéria/dia útil (alternando Química ↔ Física, 2 × 50 min/dia)
- Abr–Out/2027 (Pareto Recursivo): 10 blocos de 50 min/semana (500 min/semana)
- Total acumulado registrado: ${formatMinutesAsHoursMinutes(totalMinutes)} (${logs.length} registros)
- Dias úteis estudados (Seg–Sex): ${distinctWeekdays} · Sequência atual: ${weekdayStreak}

## 4 Macro Áreas Técnicas:
1. Instrumentação, Metrologia & Controle de Processos (10 tópicos)
2. Mecânica, Fluidos, Termodinâmica & Equipamentos de Processo (11 tópicos)
3. Química, Operações Unitárias, Refino & SMS (15 tópicos)
4. Eletricidade, Eletromagnetismo & Eletrônica (6 tópicos)

Gerado em: ${new Date().toLocaleString('pt-BR')}
`;

    const blob = new Blob([report], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `relatorio_estudos_transpetro_petrobras_${new Date().toISOString().slice(0, 10)}.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen bg-[#F6F8F7] flex flex-col selection:bg-[#008542] selection:text-white font-sans antialiased">
        <Header
          onResetProgress={() => setIsResetConfirmOpen(true)}
          onExportReport={handleExportReport}
          onOpenBackupModal={() => handleOpenBackupModal('file')}
          onOpenDriveSync={handleOpenDriveSync}
        />

        {/* Sticky Primary Tab Navigation */}
        <NavigationTabs activeTab={activeTab} setActiveTab={handleTabChange} />

        {/* Main Content Canvas with unified spacing */}
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <div
            role="tabpanel"
            aria-labelledby="body-tab-nav-edital"
            className={activeTab === 'edital' ? 'block animate-tabEnter' : 'hidden'}
          >
            <EditalSummary
              onNavigateTab={handleTabChange}
              resumeContext={resumeContext}
              onResumeTimer={setActiveTimerTarget}
              onOpenScheduleDate={handleOpenScheduleAtDate}
            />
          </div>

          <div
            role="tabpanel"
            aria-labelledby="body-tab-nav-verticalizado"
            className={activeTab === 'verticalizado' ? 'block animate-tabEnter' : 'hidden'}
          >
            <EditalVerticalizado onLaunchCesgranrioAi={handleLaunchCesgranrioAi} />
          </div>

          <div
            role="tabpanel"
            aria-labelledby="body-tab-nav-pareto"
            className={activeTab === 'pareto' ? 'block animate-tabEnter' : 'hidden'}
          >
            <ParetoMatrix onLaunchCesgranrioAi={handleLaunchCesgranrioAi} />
          </div>

          <div
            role="tabpanel"
            aria-labelledby="body-tab-nav-material"
            className={activeTab === 'material' ? 'block animate-tabEnter' : 'hidden'}
          >
            <TabMaterialEstudo
              onOpenCalculator={handleOpenCalculator}
              onLaunchCesgranrioAi={handleLaunchCesgranrioAi}
            />
          </div>

          <div
            role="tabpanel"
            aria-labelledby="body-tab-nav-cronograma"
            className={activeTab === 'cronograma' ? 'block animate-tabEnter' : 'hidden'}
          >
            <StudySchedule
              onLaunchTimer={setActiveTimerTarget}
              selectedCalendarDate={selectedCalendarDate}
              onSelectCalendarDate={handleSelectCalendarDate}
            />
          </div>

          <div
            role="tabpanel"
            aria-labelledby="body-tab-nav-cortes"
            className={activeTab === 'cortes' ? 'block animate-tabEnter' : 'hidden'}
          >
            <CutRules />
          </div>

          <div
            role="tabpanel"
            aria-labelledby="body-tab-nav-banca"
            className={activeTab === 'banca' ? 'block animate-tabEnter' : 'hidden'}
          >
            <BancaCesgranrio launchRequest={cesgranrioLaunchRequest} />
          </div>

          <div
            role="tabpanel"
            aria-labelledby="body-tab-nav-caderno"
            className={activeTab === 'caderno' ? 'block animate-tabEnter' : 'hidden'}
          >
            <ErrorNotebook onLaunchCesgranrioAi={handleLaunchCesgranrioAi} />
          </div>
        </main>

        {/* Confirm Reset Progress Dialog */}
        <ConfirmDialog
          isOpen={isResetConfirmOpen}
          title="Reiniciar registros de foco e cronômetro?"
          message="Deseja realmente zerar o histórico de tempo líquido de foco e o cronômetro ativo? Esta ação não afetará o Caderno de Erros, anotações nem o Edital Verticalizado."
          confirmLabel="Zerar Registros"
          cancelLabel="Manter Dados"
          variant="danger"
          onConfirm={confirmResetProgress}
          onCancel={() => setIsResetConfirmOpen(false)}
        />

        {/* Backup and Restore Modal */}
        <BackupRestoreModal
          isOpen={isBackupModalOpen}
          onClose={() => setIsBackupModalOpen(false)}
          onDataRestored={handleDataRestored}
          initialTab={backupModalTab}
        />

        {/* Formula Calculator Modal */}
        <FormulaCalculatorModal
          isOpen={isCalculatorOpen}
          initialFormulaNome={calculatorFormula}
          onClose={() => {
            setIsCalculatorOpen(false);
            setCalculatorFormula(undefined);
          }}
        />

        {/* Interactive 50/20 Focus Timer Modal */}
        <DailySessionModal
          target={activeTimerTarget}
          onClose={() => setActiveTimerTarget(null)}
        />

        {/* Startup Study Resume Prompt */}
        <StudyResumePrompt
          isOpen={isResumePromptOpen && !activeTimerTarget}
          resumeContext={resumeContext}
          onResumeTimer={handleResumeTimerFromPrompt}
          onOpenSchedule={handleOpenScheduleAtDate}
          onDismiss={() => setIsResumePromptOpen(false)}
        />

        {/* Clean Institutional Footer */}
        <footer className="bg-[#071F14] text-slate-300 border-t border-[#133B28] text-xs mt-auto">
          <div className="h-0.5 w-full bg-gradient-to-r from-[#008542] via-[#FDB913] to-[#F97316]" aria-hidden="true" />
          <div className="max-w-7xl mx-auto py-5 px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <span className="font-display font-bold text-[#FDB913] tracking-tight">TRANSPETRO &amp; PETROBRAS</span>
              <span aria-hidden="true" className="text-orange-400">·</span>
              <span className="text-slate-200">Ênfase 4: Dutos e Terminais + Ênfase 8: Operação</span>
            </div>
            <div className="text-slate-300 font-mono tabular-nums text-[11px]">
              {SYLLABUS_COUNTS.total} Tópicos Unificados · Plano Jan–Out/2027 (50m + 20m + 50m)
            </div>
          </div>
        </footer>

        {globalToast && (
          <div className="fixed bottom-4 right-4 z-50 max-w-sm">
            <ToastBanner
              message={globalToast}
              tone="success"
              onDismiss={() => setGlobalToast(null)}
            />
          </div>
        )}
        <OfflineIndicator />
      </div>
    </MotionConfig>
  );
}
