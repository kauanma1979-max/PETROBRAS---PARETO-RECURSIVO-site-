import React, { useState } from 'react';
import { BANCA_PROFILE, PARES_CONCEITUAIS_IRMAOS } from '../data/bancaData';
import { Card, StatusBadge, Button, EmptyState, OriginBadge } from './ui';
import type { OrigemEdital } from './ui/OriginBadge';
import {
  AlertTriangle,
  Sparkles,
  Search,
  ChevronDown,
  ChevronUp,
  Target,
  Building2,
} from 'lucide-react';

export const BancaCesgranrio: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedDiscipline, setSelectedDiscipline] = useState<string>('todas');
  const [selectedOrigin, setSelectedOrigin] = useState<'todas' | OrigemEdital>('todas');
  const [openCardId, setOpenCardId] = useState<string | null>(null);

  const disciplines = Array.from(new Set(PARES_CONCEITUAIS_IRMAOS.map((p) => p.discipline)));

  const filteredPares = PARES_CONCEITUAIS_IRMAOS.filter((par) => {
    const q = searchTerm.toLowerCase();
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

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header */}
      <Card padding="lg">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs font-semibold text-slate-500 mb-2">
          <StatusBadge tone="orange">Perfil das Bancas Examinadoras</StatusBadge>
          <span className="text-slate-300" aria-hidden="true">·</span>
          <span>Cesgranrio (Transpetro) &amp; Cebraspe (Petrobras)</span>
        </div>
        <h2 className="text-xl sm:text-2xl lg:text-3xl font-display font-extrabold text-slate-900 tracking-tight">
          {BANCA_PROFILE.title}
        </h2>
        <p className="text-slate-600 mt-2 text-xs sm:text-sm max-w-3xl leading-relaxed">
          {BANCA_PROFILE.subtitle}
        </p>
      </Card>

      {/* Dual Banca Comparison Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card padding="md" className="space-y-3 border-l-4 border-l-[#008542]">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-base font-display font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#008542]" aria-hidden="true" />
              <span>Fundação Cesgranrio (Base Transpetro)</span>
            </h3>
            <OriginBadge origem="transpetro" />
          </div>
          <ul className="space-y-2 text-xs text-slate-700 leading-relaxed">
            {BANCA_PROFILE.cesgranrioRules.map((rule, idx) => (
              <li key={idx} className="flex items-start gap-2 bg-[#F6F8F7] p-2.5 rounded-xl border border-slate-200/70">
                <span className="font-mono font-bold text-[#006837] shrink-0">#{idx + 1}</span>
                <span>{rule}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card padding="md" className="space-y-3 border-l-4 border-l-orange-500">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-base font-display font-bold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-600" aria-hidden="true" />
              <span>Cebraspe (Base Petrobras)</span>
            </h3>
            <OriginBadge origem="petrobras" />
          </div>
          <ul className="space-y-2 text-xs text-slate-700 leading-relaxed">
            {BANCA_PROFILE.cebraspeRules.map((rule, idx) => (
              <li key={idx} className="flex items-start gap-2 bg-orange-50/50 p-2.5 rounded-xl border border-orange-200/70">
                <span className="font-mono font-bold text-orange-700 shrink-0">#{idx + 1}</span>
                <span>{rule}</span>
              </li>
            ))}
          </ul>
        </Card>
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
              Conceitos frequentemente invertidos nas questões da Cesgranrio e nos itens de Certo/Errado do Cebraspe
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
                    <div className="mt-3 bg-orange-50/90 p-3.5 rounded-xl border border-orange-200 text-xs text-orange-950 leading-relaxed flex items-start gap-2 animate-fadeIn">
                      <AlertTriangle className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" aria-hidden="true" />
                      <div>
                        <strong className="text-orange-900">Pegadinha clássica das bancas:</strong>{' '}
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
