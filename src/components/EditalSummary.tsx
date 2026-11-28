import React, { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { EDITAL_METADATA } from '../data/editalData';
import { Card, StatusBadge, Button, OriginBadge } from './ui';
import { MaterialLinksSection } from './MaterialLinksSection';
import { StudyResumeCompactCard } from './StudyResumePrompt';
import type { ResolvedStudyResume, TimerLaunchTarget } from '../utils/studyResume';
import {
  Clock,
  FileSpreadsheet,
  Target,
  BookMarked,
  Layers,
  ExternalLink,
  ArrowRight,
  Info,
} from 'lucide-react';

gsap.registerPlugin(useGSAP);

interface EditalSummaryProps {
  onNavigateTab?: (tabId: string) => void;
  resumeContext?: ResolvedStudyResume | null;
  onResumeTimer?: (target: TimerLaunchTarget) => void;
  onOpenScheduleDate?: (dateKey: string) => void;
}

export const EditalSummary: React.FC<EditalSummaryProps> = ({
  onNavigateTab,
  resumeContext = null,
  onResumeTimer,
  onOpenScheduleDate,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.from('.summary-stagger', {
          y: 10,
          scale: 0.985,
          autoAlpha: 0,
          duration: 0.27,
          stagger: 0.045,
          ease: 'power3.out',
          clearProps: 'transform,opacity,visibility',
        });
      });

      mm.add('(prefers-reduced-motion: reduce)', () => {
        gsap.from('.summary-stagger', {
          autoAlpha: 0,
          duration: 0.16,
          ease: 'power1.out',
          clearProps: 'opacity,visibility',
        });
      });

      return () => mm.revert();
    },
    { scope: containerRef }
  );

  return (
    <div ref={containerRef} className="space-y-6">
      {resumeContext && onResumeTimer && (
        <div className="summary-stagger">
          <StudyResumeCompactCard
            resumeContext={resumeContext}
            onResumeTimer={onResumeTimer}
            onOpenSchedule={onOpenScheduleDate}
            showScheduleLink={Boolean(onOpenScheduleDate)}
          />
        </div>
      )}

      {/* Awaiting Edital Hero Bento Card */}
      <Card padding="lg" className="summary-stagger relative overflow-hidden">
        <div
          className="pointer-events-none absolute -top-24 -right-24 w-72 h-72 rounded-full bg-[#008542]/[0.05] blur-2xl"
          aria-hidden="true"
        />
        <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3.5 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge tone="orange" icon={<Clock className="w-3 h-3" />}>
                Edital Ainda Não Aberto
              </StatusBadge>
              <OriginBadge origem="ambos" />
            </div>

            <h2 className="text-xl sm:text-2xl lg:text-3xl font-display font-extrabold text-slate-900 tracking-[-0.02em] leading-tight">
              Edital do Concurso em Aguardo de Publicação
            </h2>

            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-[65ch]">
              Esta aba permanece sem dados de vagas, polos, datas de inscrição ou cronograma oficial porque o edital do novo concurso ainda não foi publicado. Assim que o edital abrir, as informações oficiais poderão ser preenchidas aqui.
            </p>

            <div className="bg-gradient-to-r from-[#F5F7F6] to-[#E6F4EC]/50 border border-slate-200/80 rounded-xl p-3.5 text-xs text-slate-700 flex items-start gap-2.5 max-w-[68ch]">
              <Info className="w-4 h-4 text-[#008542] shrink-0 mt-0.5" aria-hidden="true" />
              <span className="leading-relaxed">
                Enquanto o edital não abre, toda a plataforma já está estruturada sobre o{' '}
                <strong className="text-slate-900">conteúdo programático mesclado</strong> de referência:{' '}
                <strong className="text-slate-900 font-mono tabular-nums">
                  {EDITAL_METADATA.resumoMesclagem.totalUnificados} tópicos unificados
                </strong>{' '}
                ({EDITAL_METADATA.resumoMesclagem.emComum} em comum entre Transpetro e Petrobras,{' '}
                {EDITAL_METADATA.resumoMesclagem.exclusivosTranspetro} exclusivos da Transpetro e{' '}
                {EDITAL_METADATA.resumoMesclagem.exclusivosPetrobras} exclusivos da Petrobras).
              </span>
            </div>
          </div>

          {onNavigateTab && (
            <div className="flex flex-col gap-2 shrink-0 sm:min-w-[245px]">
              <Button
                variant="primary"
                size="md"
                onClick={() => onNavigateTab('verticalizado')}
                leftIcon={<FileSpreadsheet className="w-4 h-4" />}
                rightIcon={<ArrowRight className="w-3.5 h-3.5 hover-nudge-right" />}
                className="group justify-between"
              >
                Ir para Edital Verticalizado
              </Button>
              <Button
                variant="outline"
                size="md"
                onClick={() => onNavigateTab('material')}
                leftIcon={<BookMarked className="w-4 h-4 text-[#008542]" />}
                rightIcon={<ArrowRight className="w-3.5 h-3.5 hover-nudge-right" />}
                className="group justify-between"
              >
                Abrir Material de Estudos
              </Button>
              <Button
                variant="outline"
                size="md"
                onClick={() => onNavigateTab('pareto')}
                leftIcon={<Target className="w-4 h-4 text-orange-600" />}
                rightIcon={<ArrowRight className="w-3.5 h-3.5 hover-nudge-right" />}
                className="group justify-between"
              >
                Ver Pareto Recursivo
              </Button>
              <Button
                variant="outline"
                size="md"
                onClick={() => onNavigateTab('cronograma')}
                leftIcon={<Layers className="w-4 h-4 text-[#006837]" />}
                rightIcon={<ArrowRight className="w-3.5 h-3.5 hover-nudge-right" />}
                className="group justify-between"
              >
                Acessar Ciclos de Estudo
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* Compact Reference of Consolidated Bases */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {EDITAL_METADATA.basesConsolidadas.map((base) => (
          <Card
            key={base.id}
            variant="interactive"
            padding="md"
            className="summary-stagger flex flex-col justify-between gap-4"
          >
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <OriginBadge origem={base.id} />
                <span className="text-[11px] font-mono tabular-nums font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                  {base.totalItensEspecificos} itens específicos
                </span>
              </div>
              <h3 className="text-sm sm:text-base font-display font-bold text-slate-900">
                {base.titulo}
              </h3>
              <p className="text-xs text-slate-600">{base.editalReferencia}</p>
              <p className="text-xs text-slate-500 leading-relaxed max-w-[65ch]">{base.observacao}</p>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
              <span className="font-semibold text-slate-700">Banca base: {base.banca}</span>
              <a
                href={base.urlReferencia}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[#006837] hover:text-[#071F14] font-semibold transition-colors duration-150"
              >
                <span>Referência Oficial</span>
                <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
              </a>
            </div>
          </Card>
        ))}
      </div>

      {/* Global Material Links Central moved from TabMaterialEstudo footer */}
      <Card padding="lg" className="summary-stagger space-y-4">
        <div className="border-b border-slate-100 pb-3">
          <h3 className="text-base sm:text-lg font-display font-bold text-slate-900">
            Materiais e Referências do Edital
          </h3>
          <p className="text-xs text-slate-600 mt-0.5 max-w-[68ch]">
            Central global de links, apostilas em PDF, cadernos de questões e pastas de apoio por macroárea (ordenada por incidência Pareto).
          </p>
        </div>
        <MaterialLinksSection
          moduloId="todos"
          showAllModulesFilter={true}
        />
      </Card>
    </div>
  );
};
