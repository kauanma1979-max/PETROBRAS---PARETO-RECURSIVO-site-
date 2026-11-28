import React, { useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { BANCA_PROFILE, PARES_CONCEITUAIS_IRMAOS } from '../data/bancaData';
import { Card, StatusBadge, Button, EmptyState, OriginBadge, SubjectBaseBadge } from './ui';
import type { OrigemEdital } from './ui/OriginBadge';
import { classifyByCodigoRef } from '../utils/subjectClassification';
import { sortItemsByCodigoRefPareto } from '../utils/paretoOrdering';
import {
  AlertTriangle,
  Sparkles,
  Search,
  ChevronDown,
  ChevronUp,
  Target,
  Building2,
  ShieldAlert,
} from 'lucide-react';

gsap.registerPlugin(useGSAP);

export const BancaCesgranrio: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedDiscipline, setSelectedDiscipline] = useState<string>('todas');
  const [selectedOrigin, setSelectedOrigin] = useState<'todas' | OrigemEdital>('todas');
  const [openCardId, setOpenCardId] = useState<string | null>(null);
  const [showDistractors, setShowDistractors] = useState<boolean>(false);
  const distractorsRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!showDistractors) return;
      const mm = gsap.matchMedia();

      mm.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.from('.distractor-card', {
          y: 6,
          scale: 0.98,
          autoAlpha: 0,
          duration: 0.22,
          stagger: 0.03,
          ease: 'power3.out',
          clearProps: 'transform,opacity,visibility',
        });
      });

      mm.add('(prefers-reduced-motion: reduce)', () => {
        gsap.from('.distractor-card', {
          autoAlpha: 0,
          duration: 0.16,
          ease: 'power1.out',
          clearProps: 'opacity,visibility',
        });
      });

      return () => mm.revert();
    },
    { scope: distractorsRef, dependencies: [showDistractors] }
  );

  const orderedParesBase = useMemo(() => sortItemsByCodigoRefPareto(PARES_CONCEITUAIS_IRMAOS), []);

  const disciplines = useMemo(
    () => Array.from(new Set(orderedParesBase.map((p) => p.discipline))),
    [orderedParesBase]
  );

  const filteredPares = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return orderedParesBase.filter((par) => {
      const matchesSearch =
        searchTerm === '' ||
        par.conceptA.toLowerCase().includes(q) ||
        par.conceptB.toLowerCase().includes(q) ||
        par.difference.toLowerCase().includes(q) ||
        par.bancaTrap.toLowerCase().includes(q) ||
        (par.codigoRef && par.codigoRef.toLowerCase().includes(q));

      const matchesDisc =
        selectedDiscipline === 'todas' ||
        par.discipline.toLowerCase().includes(selectedDiscipline.toLowerCase());

      const matchesOrigin = selectedOrigin === 'todas' || par.origem === selectedOrigin;

      return matchesSearch && matchesDisc && matchesOrigin;
    });
  }, [orderedParesBase, searchTerm, selectedDiscipline, selectedOrigin]);

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header */}
      <Card padding="lg">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs font-semibold text-slate-500 mb-2">
              <StatusBadge tone="success">Raio-X da Banca Examinadora</StatusBadge>
              <span className="text-slate-300" aria-hidden="true">·</span>
              <span>Exclusivo Fundação Cesgranrio (Múltipla Escolha A–E)</span>
            </div>
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-display font-extrabold text-slate-900 tracking-tight">
              {BANCA_PROFILE.title}
            </h2>
            <p className="text-slate-600 mt-2 text-xs sm:text-sm max-w-3xl leading-relaxed">
              {BANCA_PROFILE.subtitle}
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDistractors((v) => !v)}
            leftIcon={<ShieldAlert className="w-3.5 h-3.5 text-orange-600" aria-hidden="true" />}
            rightIcon={
              showDistractors ? (
                <ChevronUp className="w-3.5 h-3.5" aria-hidden="true" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
              )
            }
            className="shrink-0"
          >
            {showDistractors ? 'Ocultar Padrões de Distratores' : 'Ver Padrões de Distratores'}
          </Button>
        </div>

        {showDistractors && (
          <div
            ref={distractorsRef}
            className="mt-5 pt-5 border-t border-slate-200 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3"
          >
            {BANCA_PROFILE.distractorPatterns.map((d) => (
              <div
                key={d.id}
                className="distractor-card bg-[#F5F7F6] p-3.5 rounded-xl border border-slate-200 text-xs space-y-1"
              >
                <div className="font-bold text-slate-900">{d.label}</div>
                <p className="text-slate-600 leading-relaxed">{d.description}</p>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Cesgranrio Rules + Reference Profiles (Operação Júnior & Dutos e Terminais) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <Card padding="md" className="lg:col-span-6 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-base font-display font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#008542]" aria-hidden="true" />
              <span>Comportamento Histórico — Fundação Cesgranrio</span>
            </h3>
            <StatusBadge tone="neutral">60 Questões A–E</StatusBadge>
          </div>
          <ul className="space-y-2 text-xs text-slate-700 leading-relaxed">
            {BANCA_PROFILE.cesgranrioRules.map((rule, idx) => (
              <li
                key={idx}
                className="flex items-start gap-2 bg-[#F6F8F7] p-2.5 rounded-xl border border-slate-200/80"
              >
                <span className="font-mono font-bold text-[#006837] shrink-0 tabular-nums">
                  #{idx + 1}
                </span>
                <span>{rule}</span>
              </li>
            ))}
          </ul>
        </Card>

        <div className="lg:col-span-6 space-y-4">
          {BANCA_PROFILE.referenceProfiles.map((prof) => (
            <Card key={prof.id} padding="md" className="space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm sm:text-base font-display font-bold text-slate-900">
                  {prof.title}
                </h3>
                <OriginBadge origem={prof.origem} />
              </div>
              <div className="text-xs text-slate-600">
                <strong className="text-slate-800">Referência:</strong> {prof.provaReferencia} ·{' '}
                {prof.composicao}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {prof.distribuicao.map((item) => (
                  <span
                    key={item.label}
                    className="text-[11px] font-mono font-bold tabular-nums px-2 py-0.5 rounded bg-[#E6F4EC] text-[#006837] border border-[#008542]/20"
                  >
                    {item.label}: {item.questoes}q
                  </span>
                ))}
              </div>
              <p className="text-xs text-slate-700 leading-relaxed">{prof.focoTecnico}</p>
            </Card>
          ))}
        </div>
      </div>

      {/* Pares Conceituais Irmãos */}
      <Card padding="lg" className="space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg sm:text-xl font-display font-bold text-slate-900 flex items-center gap-2 tracking-tight">
                <Sparkles className="w-4 h-4 text-[#008542] shrink-0" aria-hidden="true" />
                <span>Dicionário Técnico de "Pares Conceituais Irmãos"</span>
              </h3>
              <StatusBadge tone="success">
                <span className="tabular-nums">{filteredPares.length}</span> pares mapeados
              </StatusBadge>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Conceitos frequentemente invertidos nos distratores das provas da Fundação Cesgranrio
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="w-full sm:w-44">
              <label htmlFor="select-banca-origin" className="sr-only">
                Filtrar por origem
              </label>
              <select
                id="select-banca-origin"
                value={selectedOrigin}
                onChange={(e) => setSelectedOrigin(e.target.value as 'todas' | OrigemEdital)}
                className="w-full px-3 py-2 text-xs bg-[#F6F8F7] border border-slate-200 rounded-xl text-slate-700 font-medium focus:outline-hidden focus:ring-2 focus:ring-[#008542]/20 focus:border-[#008542]"
              >
                <option value="todas">Todas as Origens</option>
                <option value="ambos">Transpetro + Petrobras</option>
                <option value="transpetro">Exclusivo Transpetro</option>
                <option value="petrobras">Exclusivo Petrobras</option>
              </select>
            </div>

            <div className="w-full sm:w-48">
              <label htmlFor="select-banca-disc" className="sr-only">
                Filtrar por área técnica
              </label>
              <select
                id="select-banca-disc"
                value={selectedDiscipline}
                onChange={(e) => setSelectedDiscipline(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-[#F6F8F7] border border-slate-200 rounded-xl text-slate-700 font-medium focus:outline-hidden focus:ring-2 focus:ring-[#008542]/20 focus:border-[#008542]"
              >
                <option value="todas">Todas as áreas</option>
                {disciplines.map((disc) => (
                  <option key={disc} value={disc}>
                    {disc}
                  </option>
                ))}
              </select>
            </div>

            <div className="relative w-full sm:w-60">
              <label htmlFor="input-banca-search" className="sr-only">
                Buscar par conceitual
              </label>
              <Search
                className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <input
                id="input-banca-search"
                type="text"
                placeholder="Buscar par (ex: cavitação, PID, vácuo...)"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-[#F6F8F7] border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#008542]/20 focus:border-[#008542] font-medium"
              />
            </div>
          </div>
        </div>

        {/* Pairs Grid */}
        {filteredPares.length > 0 ? (
          <div className="space-y-3.5">
            {filteredPares.map((par) => {
              const isOpen = openCardId === par.id;

              return (
                <div
                  key={par.id}
                  className="bg-[#F6F8F7] rounded-2xl p-4 sm:p-5 border border-slate-200/80 hover:border-[#008542]/40 transition-colors"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-slate-200/80 pb-3 mb-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <OriginBadge origem={par.origem} />
                      {classifyByCodigoRef(par.codigoRef).badges.map((cat) => (
                        <SubjectBaseBadge key={cat} category={cat} compact />
                      ))}
                      <StatusBadge tone="neutral">{par.discipline}</StatusBadge>
                      {par.codigoRef && (
                        <span className="text-[11px] font-mono text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded">
                          {par.codigoRef}
                        </span>
                      )}
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                        {par.conceptA} <span className="text-slate-400">×</span> {par.conceptB}
                      </h4>
                    </div>

                    <Button
                      id={`btn-toggle-par-${par.id}`}
                      variant="ghost"
                      size="sm"
                      aria-expanded={isOpen}
                      onClick={() => setOpenCardId(isOpen ? null : par.id)}
                      rightIcon={
                        isOpen ? (
                          <ChevronUp className="w-3.5 h-3.5" aria-hidden="true" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
                        )
                      }
                      className="text-[#006837] hover:text-[#071F14] self-start md:self-auto"
                    >
                      {isOpen ? 'Ocultar Armadilha' : 'Ver Armadilha de Prova'}
                    </Button>
                  </div>

                  <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 text-xs text-slate-700 leading-relaxed flex items-start gap-2">
                    <Target className="w-4 h-4 text-[#008542] shrink-0 mt-0.5" aria-hidden="true" />
                    <div>
                      <strong className="text-[#006837]">Diferença-chave:</strong> {par.difference}
                    </div>
                  </div>

                  {isOpen && (
                    <div className="toast-enter mt-3 bg-orange-50/90 p-3.5 rounded-xl border border-orange-200 text-xs text-orange-950 leading-relaxed flex items-start gap-2">
                      <AlertTriangle
                        className="w-4 h-4 text-orange-600 shrink-0 mt-0.5"
                        aria-hidden="true"
                      />
                      <div>
                        <strong className="text-orange-900">Pegadinha clássica da Cesgranrio:</strong>{' '}
                        {par.bancaTrap}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState
            title={`Nenhum par conceitual encontrado para "${searchTerm}"`}
            description="Ajuste a busca ou redefina os filtros para visualizar os conceitos."
            actionLabel="Limpar filtros"
            onAction={() => {
              setSearchTerm('');
              setSelectedDiscipline('todas');
              setSelectedOrigin('todas');
            }}
          />
        )}
      </Card>
    </div>
  );
};
