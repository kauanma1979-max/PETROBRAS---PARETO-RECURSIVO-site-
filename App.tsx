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
import {
  StudySession,
  TOTAL_CICLOS_ESTUDO,
  TOTAL_SESSOES_ESTUDO,
  TOTAL_QUESTOES_PLANEJADAS,
} from './data/scheduleData';
import { SYLLABUS_COUNTS } from './data/verticalSyllabusData';
import {
  getDriveEndpoint,
  getDriveAutoSync,
  getDriveSyncValidated,
  fetchGoogleDriveDataViaJsonp,
  mergeTranspetroBackupData,
  savePreSyncSafetyBackup,
  setDriveSyncValidated,
  setLastDriveSyncDate
} from './utils/driveSync';
import { generateBackupPayload, restoreFromRawData } from './utils/backupStorage';

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

  const parseCompletedSessions = (raw: string | null): string[] => {
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.filter(item => typeof item === 'string' && item.trim().length > 0);
      }
      if (parsed && typeof parsed === 'object') {
        return Object.keys(parsed).filter(k => Boolean(parsed[k]));
      }
    } catch {
      // ignore
    }
    return [];
  };

  const [completedSessions, setCompletedSessions] = useState<string[]>(() => {
    try {
      const saved =
        localStorage.getItem('transpetro_completed_days_v2') ||
        localStorage.getItem('transpetro_completed_days');
      return parseCompletedSessions(saved);
    } catch {
      return [];
    }
  });

  const [activeSession, setActiveSession] = useState<StudySession | null>(null);
  const [isCalculatorOpen, setIsCalculatorOpen] = useState<boolean>(false);
  const [calculatorFormula, setCalculatorFormula] = useState<string | undefined>(undefined);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState<boolean>(false);
  const [backupModalTab, setBackupModalTab] = useState<'drive' | 'file' | 'code'>('drive');
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState<boolean>(false);

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

  useEffect(() => {
    try {
      localStorage.setItem('transpetro_completed_days_v2', JSON.stringify(completedSessions));
    } catch (e) {
      console.error('Error writing completed sessions to storage:', e);
    }
  }, [completedSessions]);

  const handleDataRestored = () => {
    try {
      const raw =
        localStorage.getItem('transpetro_completed_days_v2') ||
        localStorage.getItem('transpetro_completed_days');
      setCompletedSessions(parseCompletedSessions(raw));
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    window.addEventListener('transpetro_data_restored', handleDataRestored);
    return () => {
      window.removeEventListener('transpetro_data_restored', handleDataRestored);
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

  const handleToggleSession = (sessionId: string) => {
    setCompletedSessions(prev => {
      const arr = Array.isArray(prev) ? prev : [];
      const isCompleted = arr.includes(sessionId);
      const next = isCompleted ? arr.filter(id => id !== sessionId) : [...arr, sessionId];
      try {
        localStorage.setItem('transpetro_completed_days_v2', JSON.stringify(next));
      } catch (e) {
        console.error('Error saving completed sessions', e);
      }
      return next;
    });
  };

  const handleCompleteSession = (sessionId: string) => {
    setCompletedSessions(prev => {
      const arr = Array.isArray(prev) ? prev : [];
      if (!arr.includes(sessionId)) {
        const next = [...arr, sessionId];
        try {
          localStorage.setItem('transpetro_completed_days_v2', JSON.stringify(next));
        } catch (e) {
          console.error(e);
        }
        return next;
      }
      return arr;
    });
  };

  const confirmResetProgress = () => {
    try {
      localStorage.setItem('transpetro_completed_days_v2', JSON.stringify([]));
    } catch {}
    setCompletedSessions([]);
  };

  const handleExportReport = () => {
    const progressPct = Math.round((completedSessions.length / Math.max(1, TOTAL_SESSOES_ESTUDO)) * 100);

    const report = `# RELATÓRIO DE ESTUDOS — TRANSPETRO & PETROBRAS (CONTEÚDO MESCLADO)
Bases Programáticas:
- Transpetro 2026 — Ênfase 4: Dutos e Terminais (38 itens específicos)
- Petrobras 2023.2 — Ênfase 8: Operação (32 objetos em Blocos I, II e III)

## Matriz Unificada (${SYLLABUS_COUNTS.total} Tópicos):
- Em comum (Transpetro + Petrobras): ${SYLLABUS_COUNTS.ambos} tópicos
- Exclusivos Transpetro: ${SYLLABUS_COUNTS.transpetro} tópicos
- Exclusivos Petrobras: ${SYLLABUS_COUNTS.petrobras} tópicos

## Progresso nos Ciclos de Estudo:
- Sessões Concluídas: ${completedSessions.length} de ${TOTAL_SESSOES_ESTUDO} (${progressPct}%)
- Ciclos Temáticos: ${TOTAL_CICLOS_ESTUDO} ciclos (${TOTAL_QUESTOES_PLANEJADAS} questões-alvo planejadas)

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
          completedSessions={completedSessions.length}
          totalSessions={TOTAL_SESSOES_ESTUDO}
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
            <EditalSummary onNavigateTab={handleTabChange} />
          </div>

          <div
            role="tabpanel"
            aria-labelledby="body-tab-nav-verticalizado"
            className={activeTab === 'verticalizado' ? 'block animate-tabEnter' : 'hidden'}
          >
            <EditalVerticalizado />
          </div>

          <div
            role="tabpanel"
            aria-labelledby="body-tab-nav-pareto"
            className={activeTab === 'pareto' ? 'block animate-tabEnter' : 'hidden'}
          >
            <ParetoMatrix />
          </div>

          <div
            role="tabpanel"
            aria-labelledby="body-tab-nav-material"
            className={activeTab === 'material' ? 'block animate-tabEnter' : 'hidden'}
          >
            <TabMaterialEstudo onOpenCalculator={handleOpenCalculator} />
          </div>

          <div
            role="tabpanel"
            aria-labelledby="body-tab-nav-cronograma"
            className={activeTab === 'cronograma' ? 'block animate-tabEnter' : 'hidden'}
          >
            <StudySchedule
              completedSessions={completedSessions}
              onToggleSession={handleToggleSession}
              onOpenSessionTimer={(session) => setActiveSession(session)}
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
            <BancaCesgranrio />
          </div>

          <div
            role="tabpanel"
            aria-labelledby="body-tab-nav-caderno"
            className={activeTab === 'caderno' ? 'block animate-tabEnter' : 'hidden'}
          >
            <ErrorNotebook />
          </div>
        </main>

        {/* Confirm Reset Progress Dialog */}
        <ConfirmDialog
          isOpen={isResetConfirmOpen}
          title="Reiniciar progresso dos ciclos de estudo?"
          message="Deseja realmente zerar o seu progresso de sessões concluídas? Esta ação não afetará o Caderno de Erros nem o Edital Verticalizado."
          confirmLabel="Zerar Progresso"
          cancelLabel="Manter Progresso"
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

        {/* Interactive Session Timer Modal */}
        <DailySessionModal
          session={activeSession}
          onClose={() => setActiveSession(null)}
          onCompleteSession={handleCompleteSession}
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
              {SYLLABUS_COUNTS.total} Tópicos Unificados · {TOTAL_CICLOS_ESTUDO} Ciclos · {TOTAL_SESSOES_ESTUDO} Sessões
            </div>
          </div>
        </footer>
      </div>
    </MotionConfig>
  );
}
