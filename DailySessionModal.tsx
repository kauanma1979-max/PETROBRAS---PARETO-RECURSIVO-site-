import React, { useState, useEffect, useMemo } from 'react';
import { StudySession, SessionBlock } from '../data/scheduleData';
import {
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  BookOpen,
  HelpCircle,
  PenTool,
  FastForward,
  Clock,
} from 'lucide-react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { ProgressBar } from './ui/ProgressBar';
import { OriginBadge } from './ui/OriginBadge';

interface DailySessionModalProps {
  session: StudySession | null;
  onClose: () => void;
  onCompleteSession: (sessionId: string) => void;
}

const PHASES = [
  {
    name: 'Teoria & Conceitos',
    durationMin: 25,
    icon: BookOpen,
    desc: 'Leitura objetiva dos conceitos-chave, fórmulas e condições operacionais do bloco.',
  },
  {
    name: 'Questões Cesgranrio / Cebraspe',
    durationMin: 40,
    icon: HelpCircle,
    desc: 'Resolução focada de questões da banca sem consulta prévia ao gabarito.',
  },
  {
    name: 'Revisão & Caderno de Erros',
    durationMin: 15,
    icon: PenTool,
    desc: 'Registro das pegadinhas encontradas no Caderno de Erros e revisão das unidades SI.',
  },
];

export const DailySessionModal: React.FC<DailySessionModalProps> = ({
  session,
  onClose,
  onCompleteSession,
}) => {
  const [activeBlockTab, setActiveBlockTab] = useState<'blocoA' | 'blocoB'>('blocoA');
  const [currentPhaseIdx, setCurrentPhaseIdx] = useState<number>(0);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(PHASES[0].durationMin * 60);
  const [isActive, setIsActive] = useState<boolean>(false);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);

  const currentBlock: SessionBlock | null = useMemo(() => {
    if (!session) return null;
    return activeBlockTab === 'blocoA' ? session.blockA : session.blockB;
  }, [session, activeBlockTab]);

  useEffect(() => {
    if (session) {
      setActiveBlockTab('blocoA');
      setCurrentPhaseIdx(0);
      setIsActive(false);
      setIsCompleted(false);
      setSecondsRemaining(PHASES[0].durationMin * 60);
    }
  }, [session]);

  const handleSwitchTab = (tab: 'blocoA' | 'blocoB') => {
    if (!session) return;
    setActiveBlockTab(tab);
    setCurrentPhaseIdx(0);
    setSecondsRemaining(PHASES[0].durationMin * 60);
    setIsActive(false);
    setIsCompleted(false);
  };

  useEffect(() => {
    if (!session || !isActive) return;

    if (secondsRemaining > 0) {
      const interval = setInterval(() => {
        setSecondsRemaining((sec) => sec - 1);
      }, 1000);
      return () => clearInterval(interval);
    }

    if (secondsRemaining === 0) {
      if (currentPhaseIdx < PHASES.length - 1) {
        const nextIdx = currentPhaseIdx + 1;
        setCurrentPhaseIdx(nextIdx);
        setSecondsRemaining(PHASES[nextIdx].durationMin * 60);
      } else {
        setIsActive(false);
        setIsCompleted(true);
        onCompleteSession(session.id);
      }
    }
  }, [isActive, secondsRemaining, currentPhaseIdx, session, onCompleteSession]);

  const currentPhase = PHASES[currentPhaseIdx] || PHASES[0];

  const handleNextPhase = () => {
    if (!session) return;
    if (currentPhaseIdx < PHASES.length - 1) {
      const nextIdx = currentPhaseIdx + 1;
      setCurrentPhaseIdx(nextIdx);
      setSecondsRemaining(PHASES[nextIdx].durationMin * 60);
    } else {
      setIsActive(false);
      setIsCompleted(true);
      onCompleteSession(session.id);
    }
  };

  const handleResetPhase = () => {
    setIsActive(false);
    setSecondsRemaining((currentPhase?.durationMin || 25) * 60);
  };

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const PhaseIcon = currentPhase?.icon || BookOpen;
  const totalPhaseSec = (currentPhase?.durationMin || 25) * 60;
  const phaseElapsed = Math.max(0, totalPhaseSec - secondsRemaining);

  return (
    <Modal
      isOpen={Boolean(session)}
      onClose={onClose}
      theme="dark"
      maxWidth="2xl"
      title={session?.title || 'Cronômetro da Sessão'}
      subtitle={
        session
          ? `Ciclo ${session.cicloNumber} · ${session.sessionType} · 2 Blocos Intercalados`
          : undefined
      }
      icon={<Clock className="w-5 h-5" />}
    >
      {session && currentBlock && (
        <div className="p-5 sm:p-6 space-y-5">
          {/* Block Switcher */}
          <div
            role="tablist"
            aria-label="Selecionar bloco de estudo"
            className="grid grid-cols-2 gap-2 p-1 bg-[#05160E] rounded-xl border border-[#123826]"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeBlockTab === 'blocoA'}
              onClick={() => handleSwitchTab('blocoA')}
              className={`p-3 rounded-lg text-left transition-all cursor-pointer ${
                activeBlockTab === 'blocoA'
                  ? 'bg-[#0C2F1E] text-white border border-[#008542] shadow-2xs'
                  : 'text-slate-300 hover:text-white border border-transparent'
              }`}
            >
              <div className="flex items-center justify-between text-[11px] font-mono font-semibold text-[#FDB913]">
                <span>Bloco 1</span>
                <span>{session.blockA.questionsTarget} questões</span>
              </div>
              <div className="text-xs font-bold truncate mt-0.5 text-white">
                {session.blockA.subject}
              </div>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeBlockTab === 'blocoB'}
              onClick={() => handleSwitchTab('blocoB')}
              className={`p-3 rounded-lg text-left transition-all cursor-pointer ${
                activeBlockTab === 'blocoB'
                  ? 'bg-[#0C2F1E] text-white border border-orange-500 shadow-2xs'
                  : 'text-slate-300 hover:text-white border border-transparent'
              }`}
            >
              <div className="flex items-center justify-between text-[11px] font-mono font-semibold text-orange-400">
                <span>Bloco 2</span>
                <span>{session.blockB.questionsTarget} questões</span>
              </div>
              <div className="text-xs font-bold truncate mt-0.5 text-white">
                {session.blockB.subject}
              </div>
            </button>
          </div>

          {/* Active Block Context */}
          <div className="p-4 bg-[#0A2719] rounded-xl border border-[#15412B] space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs font-semibold text-[#FDB913]">{currentBlock.subject}</div>
              <div className="flex items-center gap-1.5">
                <OriginBadge origem={currentBlock.origem} compact />
                {currentBlock.codigoRef && (
                  <span className="text-[10px] font-mono text-slate-200 bg-[#05160E] border border-[#15412B] px-2 py-0.5 rounded">
                    {currentBlock.codigoRef}
                  </span>
                )}
              </div>
            </div>
            <div className="text-sm font-bold text-white leading-snug">{currentBlock.topic}</div>
            <p className="text-xs text-slate-200 leading-relaxed">{currentBlock.notes}</p>
          </div>

          {/* Phase Stepper */}
          <div className="grid grid-cols-3 gap-2">
            {PHASES.map((p, idx) => {
              const isCurrent = idx === currentPhaseIdx && !isCompleted;
              const isDone = idx < currentPhaseIdx || isCompleted;

              return (
                <div
                  key={p.name}
                  className={`p-2.5 rounded-xl border text-center transition-all ${
                    isCurrent
                      ? 'bg-[#0D3321] border-[#FDB913] text-white'
                      : isDone
                      ? 'bg-[#008542]/25 border-[#008542]/50 text-[#FDB913]'
                      : 'bg-[#05160E] border-[#123826] text-slate-400'
                  }`}
                >
                  <div className="text-[11px] font-mono tabular-nums font-semibold">
                    {isDone ? '✓ ' : `Etapa ${idx + 1} · `}
                    {p.durationMin}m
                  </div>
                  <div className="text-xs font-bold truncate mt-0.5">{p.name.split(' ')[0]}</div>
                </div>
              );
            })}
          </div>

          {/* Timer Display */}
          {!isCompleted ? (
            <div className="py-4 text-center space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-[#0A2719] border border-[#174630] text-xs font-semibold text-slate-200">
                <PhaseIcon className="w-4 h-4 text-[#FDB913]" aria-hidden="true" />
                <span>
                  {currentPhase?.name} · {activeBlockTab === 'blocoA' ? 'Bloco 1' : 'Bloco 2'}
                </span>
              </div>

              <div
                aria-live="off"
                className="text-5xl sm:text-6xl font-bold font-mono tabular-nums tracking-tight text-white"
              >
                {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
              </div>

              <p className="text-xs text-slate-300 max-w-sm mx-auto leading-relaxed">
                {currentPhase?.desc}
              </p>

              <div className="max-w-md mx-auto">
                <ProgressBar
                  value={phaseElapsed}
                  max={totalPhaseSec}
                  label="Progresso da etapa atual"
                  tone="gold"
                  trackTheme="dark"
                  height="md"
                />
              </div>
            </div>
          ) : (
            <div className="my-4 text-center space-y-3 py-6 px-4 bg-[#008542]/20 border border-[#FDB913]/40 rounded-2xl">
              <CheckCircle2 className="w-12 h-12 text-[#FDB913] mx-auto" aria-hidden="true" />
              <h4 className="text-lg font-display font-bold text-white">
                Sessão Concluída!
              </h4>
              <p className="text-xs text-slate-200 max-w-md mx-auto leading-relaxed">
                Excelente trabalho! A sessão {session.id} foi registrada nos seus Ciclos de Estudo.
              </p>
            </div>
          )}

          {/* Controls */}
          <div className="flex items-center justify-center gap-3 pt-2 border-t border-[#123826]">
            {!isCompleted ? (
              <>
                <Button
                  variant="secondary"
                  size="icon"
                  onClick={handleResetPhase}
                  aria-label="Reiniciar etapa atual"
                  title="Reiniciar Etapa"
                  className="bg-[#0A2719] hover:bg-[#123C27] border border-[#1B5136]"
                >
                  <RotateCcw className="w-4 h-4" />
                </Button>

                <Button
                  variant="primary"
                  size="lg"
                  onClick={() => setIsActive(!isActive)}
                  leftIcon={
                    isActive ? (
                      <Pause className="w-4 h-4 fill-current" />
                    ) : (
                      <Play className="w-4 h-4 fill-current" />
                    )
                  }
                  className={
                    isActive
                      ? 'bg-orange-600 hover:bg-orange-700 text-white px-7'
                      : 'bg-[#008542] hover:bg-[#006837] text-white px-7'
                  }
                >
                  {isActive ? 'Pausar' : 'Iniciar Cronômetro'}
                </Button>

                <Button
                  variant="secondary"
                  size="icon"
                  onClick={handleNextPhase}
                  aria-label="Avançar para próxima etapa"
                  title="Avançar para Próxima Etapa"
                  className="bg-[#0A2719] hover:bg-[#123C27] border border-[#1B5136]"
                >
                  <FastForward className="w-4 h-4" />
                </Button>
              </>
            ) : (
              <Button variant="primary" size="lg" onClick={onClose}>
                Fechar e Salvar
              </Button>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
};
