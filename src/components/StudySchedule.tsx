import React, { useState, useEffect } from 'react';
import {
  CICLOS_ESTUDO,
  StudyCycle,
  StudySession,
  SessionBlock,
  TOTAL_CICLOS_ESTUDO,
  TOTAL_SESSOES_ESTUDO,
  TOTAL_QUESTOES_PLANEJADAS,
} from '../data/scheduleData';
import { Card, Button, StatusBadge, ProgressBar, OriginBadge } from './ui';
import type { OrigemEdital } from './ui/OriginBadge';
import {
  CheckCircle2,
  Circle,
  Play,
  ChevronLeft,
  ChevronRight,
  Save,
  Check,
  ChevronDown,
  ChevronUp,
  FileText,
  Trash2,
  Database,
  Target,
  Filter,
} from 'lucide-react';
import { exportFullBackup, STORAGE_KEYS } from '../utils/backupStorage';

interface StudyScheduleProps {
  completedSessions: string[];
  onToggleSession: (sessionId: string) => void;
  onOpenSessionTimer: (session: StudySession) => void;
}

export const StudySchedule: React.FC<StudyScheduleProps> = ({
  completedSessions,
  onToggleSession,
  onOpenSessionTimer,
}) => {
  const [selectedCicloNum, setSelectedCicloNum] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('transpetro_schedule_selected_ciclo');
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed >= 1 && parsed <= TOTAL_CICLOS_ESTUDO) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    return 1;
  });

  const [activePhaseFilter, setActivePhaseFilter] = useState<string>(() => {
    try {
      return localStorage.getItem('transpetro_schedule_phase_filter') || 'todas';
    } catch {
      return 'todas';
    }
  });

  const [originFilter, setOriginFilter] = useState<'todas' | OrigemEdital>('todas');

  useEffect(() => {
    try {
      localStorage.setItem('transpetro_schedule_selected_ciclo', String(selectedCicloNum));
    } catch {
      // ignore
    }
  }, [selectedCicloNum]);

  useEffect(() => {
    try {
      localStorage.setItem('transpetro_schedule_phase_filter', activePhaseFilter);
    } catch {
      // ignore
    }
  }, [activePhaseFilter]);

  const [expandedNotes, setExpandedNotes] = useState<Record<string, boolean>>({});
  const [completedBlocks, setCompletedBlocks] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.COMPLETED_BLOCKS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.COMPLETED_BLOCKS, JSON.stringify(completedBlocks));
    } catch {}
  }, [completedBlocks]);

  const handleToggleSessionWrapper = (sessionId: string) => {
    const isDone = Array.isArray(completedSessions) && completedSessions.includes(sessionId);
    const keyA = `${sessionId}_blocoA`;
    const keyB = `${sessionId}_blocoB`;

    if (!isDone) {
      setCompletedBlocks((prev) => {
        const next = new Set(prev);
        next.add(keyA);
        next.add(keyB);
        return Array.from(next);
      });
    } else {
      setCompletedBlocks((prev) => prev.filter((k) => k !== keyA && k !== keyB));
    }
    onToggleSession(sessionId);
  };

  const handleToggleBlock = (sessionId: string, blockKey: 'blocoA' | 'blocoB') => {
    const isSessionDone =
      Array.isArray(completedSessions) && completedSessions.includes(sessionId);
    const keyA = `${sessionId}_blocoA`;
    const keyB = `${sessionId}_blocoB`;
    const targetKey = blockKey === 'blocoA' ? keyA : keyB;
    const otherKey = blockKey === 'blocoA' ? keyB : keyA;

    const isCurrentBlockDone = isSessionDone || completedBlocks.includes(targetKey);
    const isOtherBlockDone = isSessionDone || completedBlocks.includes(otherKey);

    if (isCurrentBlockDone) {
      const next = completedBlocks.filter((k) => k !== targetKey);
      if (isSessionDone && !next.includes(otherKey)) {
        next.push(otherKey);
      }
      setCompletedBlocks(next);
      if (isSessionDone) {
        onToggleSession(sessionId);
      }
    } else {
      const next = Array.from(new Set([...completedBlocks, targetKey]));
      setCompletedBlocks(next);
      if (isOtherBlockDone && !isSessionDone) {
        onToggleSession(sessionId);
      }
    }
  };

  const [subjectNotes, setSubjectNotes] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SCHEDULE_DAY_NOTES);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [savedNoteToasts, setSavedNoteToasts] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.SCHEDULE_DAY_NOTES, JSON.stringify(subjectNotes));
    } catch (e) {
      console.error('Error saving schedule session notes', e);
    }
  }, [subjectNotes]);

  useEffect(() => {
    const handleStorageRestore = () => {
      try {
        const saved = localStorage.getItem(STORAGE_KEYS.SCHEDULE_DAY_NOTES);
        if (saved) {
          setSubjectNotes(JSON.parse(saved));
        }
      } catch {
        // ignore
      }
    };
    window.addEventListener('transpetro_data_restored', handleStorageRestore);
    return () => window.removeEventListener('transpetro_data_restored', handleStorageRestore);
  }, []);

  const handleUpdateNote = (key: string, text: string) => {
    setSubjectNotes((prev) => {
      const updated = { ...prev, [key]: text };
      try {
        localStorage.setItem(STORAGE_KEYS.SCHEDULE_DAY_NOTES, JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  };

  const handleClearNote = (key: string) => {
    handleUpdateNote(key, '');
    setSavedNoteToasts((prev) => ({ ...prev, [key]: false }));
  };

  const handleSaveNoteExplicit = (key: string) => {
    const currentText = subjectNotes[key] || '';
    handleUpdateNote(key, currentText);
    setSavedNoteToasts((prev) => ({ ...prev, [key]: true }));
    setTimeout(() => {
      setSavedNoteToasts((prev) => ({ ...prev, [key]: false }));
    }, 2500);
  };

  const handleToggleNoteExpand = (key: string) => {
    setExpandedNotes((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const phases = Array.from(new Set(CICLOS_ESTUDO.map((c) => c.phase)));

  const filteredCycles: StudyCycle[] =
    activePhaseFilter === 'todas'
      ? CICLOS_ESTUDO
      : CICLOS_ESTUDO.filter((c) => c.phase === activePhaseFilter);

  const currentCycle =
    CICLOS_ESTUDO.find((c) => c.cicloNumber === selectedCicloNum) || CICLOS_ESTUDO[0];

  const displayedSessions = currentCycle.sessions.filter(
    (s) =>
      originFilter === 'todas' ||
      s.blockA.origem === originFilter ||
      s.blockB.origem === originFilter
  );

  const cycleCompletedCount = currentCycle.sessions.filter(
    (s) => Array.isArray(completedSessions) && completedSessions.includes(s.id)
  ).length;
  const cycleProgressPct = Math.round(
    (cycleCompletedCount / Math.max(1, currentCycle.sessions.length)) * 100
  );

  return (
    <div className="space-y-6">
      {/* Overview & Phase Filter */}
      <Card padding="lg">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs font-semibold text-slate-600 mb-2">
              <StatusBadge tone="success">
                <span className="tabular-nums">
                  {TOTAL_CICLOS_ESTUDO} Ciclos · {TOTAL_SESSOES_ESTUDO} Sessões
                </span>
              </StatusBadge>
              <span className="text-slate-300" aria-hidden="true">·</span>
              <span className="tabular-nums">{TOTAL_QUESTOES_PLANEJADAS} questões-alvo</span>
              <span className="text-slate-300" aria-hidden="true">·</span>
              <span className="text-[#006837]">Progressão flexível no seu ritmo (sem prazos fixos)</span>
            </div>
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-display font-extrabold text-slate-900 tracking-tight">
              Ciclos de Estudo — Matriz Intercalada
            </h2>
            <p className="text-slate-600 mt-1 text-xs sm:text-sm max-w-3xl leading-relaxed">
              Cada sessão combina <strong>2 blocos complementares</strong> do conteúdo mesclado
              (Transpetro + Petrobras), com metas de questões e registro de anotações. Avance
              pelos ciclos no seu próprio ritmo.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <Button
              id="btn-schedule-backup-json"
              variant="primary"
              size="sm"
              leftIcon={<Database className="w-3.5 h-3.5" aria-hidden="true" />}
              onClick={() => exportFullBackup()}
              title="Baixar backup completo de todos os dados e anotações"
            >
              Salvar Backup JSON
            </Button>
          </div>
        </div>

        {/* Phase & Origin Filters */}
        <div className="mt-5 pt-4 border-t border-slate-100 space-y-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-bold text-slate-500 mr-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" aria-hidden="true" /> Fase:
            </span>
            <button
              type="button"
              id="btn-phase-todas"
              aria-pressed={activePhaseFilter === 'todas'}
              onClick={() => setActivePhaseFilter('todas')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activePhaseFilter === 'todas'
                  ? 'bg-[#071F14] text-[#FDB913] border-b-2 border-orange-500'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Todos os Ciclos
            </button>
            {phases.map((phase, idx) => {
              const firstInPhase = CICLOS_ESTUDO.find((c) => c.phase === phase);
              return (
                <button
                  key={phase}
                  type="button"
                  id={`btn-phase-${idx + 1}`}
                  aria-pressed={activePhaseFilter === phase}
                  onClick={() => {
                    setActivePhaseFilter(phase);
                    if (firstInPhase) {
                      setSelectedCicloNum(firstInPhase.cicloNumber);
                    }
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    activePhaseFilter === phase
                      ? 'bg-[#071F14] text-[#FDB913] border-b-2 border-orange-500'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {phase}
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-bold text-slate-500 mr-1">Filtrar origem na sessão:</span>
            {(
              [
                { id: 'todas', label: 'Todas' },
                { id: 'ambos', label: 'Transpetro + Petrobras' },
                { id: 'transpetro', label: 'Transpetro' },
                { id: 'petrobras', label: 'Petrobras' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                aria-pressed={originFilter === opt.id}
                onClick={() => setOriginFilter(opt.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  originFilter === opt.id
                    ? 'bg-[#008542] text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Cycle Selector Horizontal Scroller */}
        <div className="mt-5 pt-4 border-t border-slate-100">
          <div className="text-[11px] font-bold text-slate-500 mb-2.5 uppercase tracking-wider flex flex-wrap items-center justify-between gap-2">
            <span>Navegar pelos {TOTAL_CICLOS_ESTUDO} Ciclos Temáticos</span>
            <span className="text-[#006837] font-mono font-semibold tabular-nums">
              Ciclo {selectedCicloNum} de {TOTAL_CICLOS_ESTUDO}
            </span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {filteredCycles.map((ciclo) => {
              const isSelected = selectedCicloNum === ciclo.cicloNumber;
              const completedInCycle = ciclo.sessions.filter(
                (s) => Array.isArray(completedSessions) && completedSessions.includes(s.id)
              ).length;
              const isCycleFull = completedInCycle === ciclo.sessions.length;

              return (
                <button
                  key={ciclo.cicloNumber}
                  type="button"
                  id={`btn-select-ciclo-${ciclo.cicloNumber}`}
                  aria-pressed={isSelected}
                  onClick={() => setSelectedCicloNum(ciclo.cicloNumber)}
                  className={`flex flex-col items-center justify-center min-w-[96px] py-2 px-3 rounded-xl border text-xs transition-all relative cursor-pointer shrink-0 ${
                    isSelected
                      ? 'bg-[#071F14] text-white border-[#071F14] border-b-2 border-b-orange-500 shadow-2xs font-bold'
                      : 'bg-[#F6F8F7] text-slate-700 border-slate-200 hover:bg-[#EFF4F1]'
                  }`}
                >
                  {isCycleFull && (
                    <CheckCircle2
                      className="w-3.5 h-3.5 text-[#008542] absolute top-1.5 right-1.5"
                      aria-hidden="true"
                    />
                  )}
                  <span className="text-[10px] opacity-75">Ciclo</span>
                  <span
                    className={`text-sm font-display font-extrabold font-mono tabular-nums ${
                      isSelected ? 'text-[#FDB913]' : ''
                    }`}
                  >
                    {ciclo.cicloNumber}
                  </span>
                  <span className="text-[10px] opacity-70 mt-0.5 tabular-nums">
                    {completedInCycle}/{ciclo.sessions.length} sessões
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Selected Cycle Header Card */}
      <Card variant="dark" padding="md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 mb-2 text-xs text-slate-300">
              <span className="px-2.5 py-0.5 rounded-md bg-[#008542]/25 text-[#FDB913] border border-[#FDB913]/35 font-bold font-mono">
                {currentCycle.phase}
              </span>
              <span className="text-orange-400" aria-hidden="true">·</span>
              <span className="font-mono tabular-nums text-orange-300">
                {currentCycle.sessions.length} sessões de estudo
              </span>
            </div>
            <h3 className="text-lg sm:text-xl font-display font-bold tracking-tight text-white">
              {currentCycle.title}
            </h3>
            <p className="text-xs sm:text-sm text-slate-200 mt-1 max-w-3xl leading-relaxed flex items-start gap-1.5">
              <Target className="w-4 h-4 text-[#FDB913] shrink-0 mt-0.5" aria-hidden="true" />
              <span>
                <strong className="text-white">Foco do Ciclo:</strong> {currentCycle.focus}
              </span>
            </p>
          </div>

          <div className="bg-[#0A281A] p-3.5 rounded-xl border border-[#184831] min-w-[180px] text-right shrink-0">
            <div className="text-[11px] text-slate-300">Progresso do Ciclo</div>
            <div className="text-base sm:text-lg font-bold text-[#FDB913] font-mono tabular-nums mb-1.5">
              {cycleCompletedCount} de {currentCycle.sessions.length} ({cycleProgressPct}%)
            </div>
            <ProgressBar
              value={cycleProgressPct}
              tone="gold"
              trackTheme="dark"
              label={`Progresso do ciclo ${currentCycle.cicloNumber}`}
            />
          </div>
        </div>
      </Card>

      {/* Sessions List */}
      <div className="space-y-4">
        {displayedSessions.map((session) => {
          const isDone =
            Array.isArray(completedSessions) && completedSessions.includes(session.id);
          const isBlockADone = isDone || completedBlocks.includes(`${session.id}_blocoA`);
          const isBlockBDone = isDone || completedBlocks.includes(`${session.id}_blocoB`);
          const sessionQuestionsTotal =
            session.blockA.questionsTarget + session.blockB.questionsTarget;

          const renderBlock = (
            blockKey: 'blocoA' | 'blocoB',
            blockNum: 1 | 2,
            blockData: SessionBlock,
            isBlockDone: boolean
          ) => {
            const noteKey = `${session.id}_${blockKey}`;
            const isExpanded = Boolean(expandedNotes[noteKey]);
            const hasSavedNote = Boolean(subjectNotes[noteKey]);
            const accentTone = blockNum === 1 ? 'emerald' : 'orange';

            return (
              <div
                className={`rounded-xl p-4 border flex flex-col justify-between space-y-3 transition-colors ${
                  isBlockDone
                    ? blockNum === 1
                      ? 'bg-[#E6F4EC]/50 border-[#008542]/30'
                      : 'bg-orange-50/50 border-orange-200'
                    : 'bg-[#F6F8F7] border-slate-200/80'
                }`}
              >
                <div className="space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase ${
                          accentTone === 'emerald'
                            ? 'bg-[#E6F4EC] text-[#006837]'
                            : 'bg-orange-100 text-orange-800'
                        }`}
                      >
                        Bloco {blockNum}
                      </span>
                      <OriginBadge origem={blockData.origem} compact />
                      {blockData.codigoRef && (
                        <span className="text-[10px] font-mono text-slate-600 bg-white border border-slate-200 px-1.5 py-0.5 rounded">
                          {blockData.codigoRef}
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      id={`btn-check-${session.id}-${blockKey}`}
                      aria-pressed={isBlockDone}
                      onClick={() => handleToggleBlock(session.id, blockKey)}
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold transition-colors cursor-pointer border ${
                        isBlockDone
                          ? accentTone === 'emerald'
                            ? 'bg-[#008542] text-white border-[#008542]'
                            : 'bg-orange-600 text-white border-orange-600'
                          : 'bg-white text-slate-600 hover:text-slate-900 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {isBlockDone ? (
                        <>
                          <Check className="w-3 h-3 stroke-[3]" aria-hidden="true" />
                          <span>Concluído</span>
                        </>
                      ) : (
                        <>
                          <Circle className="w-3 h-3 text-slate-400" aria-hidden="true" />
                          <span>Marcar Bloco</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="text-xs font-bold text-[#006837]">{blockData.subject}</div>
                  <h5 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                    {blockData.topic}
                  </h5>

                  <p className="text-xs text-slate-600 leading-relaxed">{blockData.notes}</p>

                  <div className="flex items-center justify-between bg-white py-1.5 px-2.5 rounded-lg border border-slate-200 text-[11px] font-mono tabular-nums font-semibold">
                    <span className="text-slate-600">Meta prática recomendada:</span>
                    <span className="text-[#006837] font-bold">
                      {blockData.questionsTarget} questões
                    </span>
                  </div>
                </div>

                {/* Collapsible Personal Notes */}
                <div className="pt-3 border-t border-slate-200/80">
                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      id={`btn-toggle-note-${session.id}-${blockKey}`}
                      aria-expanded={isExpanded}
                      onClick={() => handleToggleNoteExpand(noteKey)}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-[#006837] transition-colors cursor-pointer py-1"
                    >
                      <FileText
                        className={`w-3.5 h-3.5 ${
                          accentTone === 'emerald' ? 'text-[#008542]' : 'text-orange-600'
                        }`}
                        aria-hidden="true"
                      />
                      <span>Anotações do Bloco</span>
                      {isExpanded ? (
                        <ChevronUp className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                      )}
                    </button>

                    {hasSavedNote && !isExpanded && (
                      <StatusBadge tone={accentTone === 'emerald' ? 'success' : 'orange'}>
                        Salvo
                      </StatusBadge>
                    )}
                  </div>

                  {isExpanded && (
                    <div className="mt-2.5 p-3 bg-white rounded-xl border border-slate-200 space-y-2.5 animate-fadeIn">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-900">
                        <label htmlFor={`textarea-note-${session.id}-${blockKey}`}>
                          Dúvidas, Fórmulas &amp; Pontos de Revisão
                        </label>
                        {savedNoteToasts[noteKey] ? (
                          <StatusBadge tone="success" icon={<Check className="w-3 h-3" />}>
                            Salvo no Backup!
                          </StatusBadge>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-normal">
                            Persistido no JSON
                          </span>
                        )}
                      </div>

                      <textarea
                        id={`textarea-note-${session.id}-${blockKey}`}
                        value={subjectNotes[noteKey] || ''}
                        onChange={(e) => handleUpdateNote(noteKey, e.target.value)}
                        placeholder={`Anotações sobre ${blockData.topic}...`}
                        rows={3}
                        className="w-full p-2.5 bg-[#F6F8F7] border border-slate-200 rounded-lg text-xs text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#008542]/20 focus:border-[#008542]"
                      />

                      <div className="flex items-center justify-between gap-2 pt-1">
                        <Button
                          id={`btn-save-note-${session.id}-${blockKey}`}
                          variant="primary"
                          size="sm"
                          leftIcon={<Save className="w-3.5 h-3.5" aria-hidden="true" />}
                          onClick={() => handleSaveNoteExplicit(noteKey)}
                        >
                          Salvar Anotação
                        </Button>

                        {hasSavedNote && (
                          <button
                            type="button"
                            id={`btn-clear-note-${session.id}-${blockKey}`}
                            onClick={() => handleClearNote(noteKey)}
                            className="text-slate-500 hover:text-rose-600 text-[11px] flex items-center gap-1 transition-colors p-1 cursor-pointer"
                            title="Limpar anotações deste bloco"
                          >
                            <Trash2 className="w-3 h-3" aria-hidden="true" />
                            <span>Limpar</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          };

          return (
            <Card
              key={session.id}
              padding="md"
              className={
                isDone
                  ? 'border-[#008542]/45 bg-[#E6F4EC]/25'
                  : 'border-slate-200/90 hover:border-[#008542]/40'
              }
            >
              {/* Session Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3.5 flex-1 min-w-0">
                  <button
                    type="button"
                    id={`btn-check-${session.id}`}
                    aria-pressed={isDone}
                    aria-label={
                      isDone
                        ? `Desmarcar ${session.title} como concluída`
                        : `Marcar ${session.title} como concluída`
                    }
                    onClick={() => handleToggleSessionWrapper(session.id)}
                    className={`rounded-xl p-1 transition-transform active:scale-95 shrink-0 cursor-pointer ${
                      isDone
                        ? 'text-[#008542] hover:text-[#006837]'
                        : 'text-slate-300 hover:text-[#008542]'
                    }`}
                  >
                    {isDone ? (
                      <CheckCircle2
                        className="w-8 h-8 fill-[#E6F4EC] text-[#008542]"
                        aria-hidden="true"
                      />
                    ) : (
                      <Circle
                        className="w-8 h-8 text-slate-300 hover:text-[#008542] transition-colors"
                        aria-hidden="true"
                      />
                    )}
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-mono font-bold text-[#006837] bg-[#E6F4EC] border border-[#008542]/25 px-2 py-0.5 rounded-md tabular-nums">
                        {session.id}
                      </span>
                      <StatusBadge tone="orange">{session.sessionType}</StatusBadge>
                      <span className="text-[11px] font-mono text-slate-500 tabular-nums">
                        Meta: {sessionQuestionsTotal} questões
                      </span>
                      {isDone && (
                        <StatusBadge
                          tone="success"
                          icon={<Check className="w-3 h-3 stroke-[3]" />}
                        >
                          Concluída
                        </StatusBadge>
                      )}
                    </div>
                    <h4
                      className={`text-sm sm:text-base font-bold text-slate-900 mt-1 ${
                        isDone ? 'line-through text-slate-400' : ''
                      }`}
                    >
                      {session.title}
                    </h4>
                  </div>
                </div>

                <Button
                  id={`btn-timer-${session.id}`}
                  variant="primary"
                  size="sm"
                  leftIcon={<Play className="w-3.5 h-3.5 fill-white" aria-hidden="true" />}
                  onClick={() => onOpenSessionTimer(session)}
                  className="self-start sm:self-center"
                >
                  Cronômetro da Sessão
                </Button>
              </div>

              {/* 2 Subject Blocks Side-by-Side */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                {renderBlock('blocoA', 1, session.blockA, isBlockADone)}
                {renderBlock('blocoB', 2, session.blockB, isBlockBDone)}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Navigation Footer */}
      <div className="flex items-center justify-between pt-2 gap-3">
        <Button
          id="btn-prev-ciclo"
          variant="outline"
          size="md"
          disabled={selectedCicloNum === 1}
          onClick={() => setSelectedCicloNum((prev) => Math.max(1, prev - 1))}
          leftIcon={<ChevronLeft className="w-4 h-4" aria-hidden="true" />}
        >
          Ciclo Anterior
        </Button>

        <span className="text-xs text-slate-500 font-mono font-medium tabular-nums text-center">
          Ciclo {selectedCicloNum} de {TOTAL_CICLOS_ESTUDO}
        </span>

        <Button
          id="btn-next-ciclo"
          variant="outline"
          size="md"
          disabled={selectedCicloNum === TOTAL_CICLOS_ESTUDO}
          onClick={() =>
            setSelectedCicloNum((prev) => Math.min(TOTAL_CICLOS_ESTUDO, prev + 1))
          }
          rightIcon={<ChevronRight className="w-4 h-4" aria-hidden="true" />}
        >
          Próximo Ciclo
        </Button>
      </div>
    </div>
  );
};
