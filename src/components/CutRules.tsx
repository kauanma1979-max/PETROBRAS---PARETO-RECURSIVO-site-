import React, { useMemo, useState } from 'react';
import { CUT_RULES_DATA } from '../data/cutRulesData';
import { Card, StatusBadge, OriginBadge, SubjectBaseBadge } from './ui';
import { Scissors, Zap, TrendingUp, Award, XCircle, Filter } from 'lucide-react';
import type { OrigemEdital } from './ui/OriginBadge';
import { classifyByCodigoRef } from '../utils/subjectClassification';
import { sortItemsByCodigoRefPareto } from '../utils/paretoOrdering';

export const CutRules: React.FC = () => {
  const [selectedOrigin, setSelectedOrigin] = useState<'todas' | OrigemEdital>('todas');

  const filteredRules = useMemo(
    () =>
      sortItemsByCodigoRefPareto(
        CUT_RULES_DATA.filter(
          (r) => selectedOrigin === 'todas' || r.origem === selectedOrigin
        )
      ),
    [selectedOrigin]
  );

  const priorizar = filteredRules.filter((r) => r.action === 'PRIORIZAR');
  const reduzir = filteredRules.filter((r) => r.action === 'REDUZIR');
  const cortar = filteredRules.filter((r) => r.action === 'CORTAR');

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header Card */}
      <Card padding="lg">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs font-semibold text-slate-500 mb-2">
              <StatusBadge tone="orange">Estratégia de Alto Rendimento</StatusBadge>
              <span className="text-slate-300" aria-hidden="true">·</span>
              <span>O que priorizar, reduzir ou cortar no conteúdo mesclado</span>
            </div>
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-display font-extrabold text-slate-900 tracking-tight">
              Regras de Corte &amp; Priorização Técnica
            </h2>
            <p className="text-slate-600 mt-2 text-xs sm:text-sm max-w-3xl leading-relaxed">
              Calibragem de profundidade para <strong>Transpetro (Ênfase 4: Dutos e Terminais)</strong> e{' '}
              <strong>Petrobras (Ênfase 8: Operação)</strong>, focando no nível técnico exigido pelas bancas.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-bold text-slate-500 mr-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" aria-hidden="true" /> Origem:
            </span>
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
                aria-pressed={selectedOrigin === opt.id}
                onClick={() => setSelectedOrigin(opt.id)}
                className={`btn-tactile px-3 py-1.5 rounded-xl text-xs font-semibold transition-[color,background-color,border-color,transform] duration-150 ease-[var(--ease-out)] cursor-pointer ${
                  selectedOrigin === opt.id
                    ? 'bg-[#071F14] text-[#FDB913] border-b-2 border-orange-500'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* O Trade-Off Central */}
      <Card variant="dark" padding="lg">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-orange-500/20 border border-orange-500/35 text-orange-400 flex items-center justify-center shrink-0">
            <Zap className="w-5 h-5" aria-hidden="true" />
          </div>
          <div className="space-y-4 flex-1 min-w-0">
            <div>
              <h3 className="text-lg sm:text-xl font-display font-bold text-white tracking-tight">
                Diretriz Pareto: Profundidade de Nível Médio Técnico vs. Formalismo Acadêmico
              </h3>
              <p className="text-xs sm:text-sm text-slate-200 mt-1 leading-relaxed">
                Os 27 tópicos em interseção entre Transpetro e Petrobras formam o núcleo de retorno máximo. O erro clássico é aprofundar em cálculo diferencial ou programação de CLP fora do escopo do edital.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              <div className="bg-[#0A281A] p-4 rounded-xl border border-[#184831]">
                <div className="flex items-center gap-2 text-orange-400 font-bold text-xs uppercase mb-1.5">
                  <Scissors className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span>Decisão Estratégica</span>
                </div>
                <p className="text-xs text-slate-200 leading-relaxed">
                  Cortar derivadas/integrais, química quântica avançada e programação Ladder de CLP; concentrar energia nas aplicações algébricas e operacionais.
                </p>
              </div>

              <div className="bg-[#0A281A] p-4 rounded-xl border border-[#184831]">
                <div className="flex items-center gap-2 text-[#FDB913] font-bold text-xs uppercase mb-1.5">
                  <TrendingUp className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span>Núcleo de Máximo Retorno</span>
                </div>
                <p className="text-xs text-slate-200 leading-relaxed">
                  Fluidos e perda de carga, equipamentos de processo (bombas, permutadores, válvulas), controle 4–20 mA, operações unitárias, refino e SMS.
                </p>
              </div>
            </div>

            <div className="bg-[#008542]/20 border border-[#FDB913]/35 p-3.5 rounded-xl text-xs text-[#FDB913] flex items-start gap-2 leading-relaxed">
              <Award className="w-4 h-4 text-[#FDB913] shrink-0 mt-0.5" aria-hidden="true" />
              <strong>
                Regra de Ouro: Domine 100% da interseção (27 tópicos) antes de refinar os 15 itens exclusivos de cada empresa.
              </strong>
            </div>
          </div>
        </div>
      </Card>

      {/* PRIORIZAR */}
      {priorizar.length > 0 && (
        <div className="space-y-3.5">
          <h3 className="text-base sm:text-lg font-display font-bold text-slate-900 flex items-center gap-2 tracking-tight">
            <TrendingUp className="w-5 h-5 text-[#008542] shrink-0" aria-hidden="true" />
            <span>Priorizar (Máxima Incidência nas Provas)</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {priorizar.map((rule) => (
              <Card key={rule.id} variant="interactive" padding="md" className="flex flex-col justify-between gap-3">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <StatusBadge tone="success">PRIORIZAR</StatusBadge>
                      <OriginBadge origem={rule.origem} />
                      {classifyByCodigoRef(rule.codigoRef).badges.map((cat) => (
                        <SubjectBaseBadge key={cat} category={cat} compact />
                      ))}
                    </div>
                    {rule.codigoRef && (
                      <span className="text-[11px] font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                        {rule.codigoRef}
                      </span>
                    )}
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 leading-snug">{rule.topic}</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">{rule.reason}</p>
                  <div className="bg-[#E6F4EC]/70 p-3 rounded-xl border border-[#008542]/25 text-xs text-[#071F14] leading-relaxed">
                    <strong className="text-[#006837]">Foco prático:</strong> {rule.replacement}
                  </div>
                </div>
                <div className="text-[11px] text-slate-500 font-mono border-t border-slate-100 pt-2">
                  Área: {rule.discipline}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* REDUZIR */}
      {reduzir.length > 0 && (
        <div className="space-y-3.5">
          <h3 className="text-base sm:text-lg font-display font-bold text-slate-900 flex items-center gap-2 tracking-tight">
            <Scissors className="w-5 h-5 text-amber-600 shrink-0" aria-hidden="true" />
            <span>Reduzir Profundidade (Estudo Direto e Objetivo)</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {reduzir.map((rule) => (
              <Card key={rule.id} variant="interactive" padding="md" className="flex flex-col justify-between gap-3">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <StatusBadge tone="warning">REDUZIR</StatusBadge>
                      <OriginBadge origem={rule.origem} />
                      {classifyByCodigoRef(rule.codigoRef).badges.map((cat) => (
                        <SubjectBaseBadge key={cat} category={cat} compact />
                      ))}
                    </div>
                    {rule.codigoRef && (
                      <span className="text-[11px] font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                        {rule.codigoRef}
                      </span>
                    )}
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 leading-snug">{rule.topic}</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">{rule.reason}</p>
                  <div className="bg-amber-50/70 p-3 rounded-xl border border-amber-200 text-xs text-amber-950 leading-relaxed">
                    <strong className="text-amber-900">Substituir por:</strong> {rule.replacement}
                  </div>
                </div>
                <div className="text-[11px] text-slate-500 font-mono border-t border-slate-100 pt-2">
                  Área: {rule.discipline}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* CORTAR */}
      {cortar.length > 0 && (
        <div className="space-y-3.5">
          <h3 className="text-base sm:text-lg font-display font-bold text-slate-900 flex items-center gap-2 tracking-tight">
            <XCircle className="w-5 h-5 text-orange-600 shrink-0" aria-hidden="true" />
            <span>Cortar (Fora do Escopo ou Desvio de Nível)</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {cortar.map((rule) => (
              <Card key={rule.id} variant="interactive" padding="md" className="flex flex-col justify-between gap-3">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <StatusBadge tone="danger">CORTAR</StatusBadge>
                      <OriginBadge origem={rule.origem} />
                      {classifyByCodigoRef(rule.codigoRef).badges.map((cat) => (
                        <SubjectBaseBadge key={cat} category={cat} compact />
                      ))}
                    </div>
                    {rule.codigoRef && (
                      <span className="text-[11px] font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                        {rule.codigoRef}
                      </span>
                    )}
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 leading-snug">{rule.topic}</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">{rule.reason}</p>
                  <div className="bg-orange-50/70 p-3 rounded-xl border border-orange-200 text-xs text-orange-950 leading-relaxed">
                    <strong className="text-orange-900">Direcionar esforço para:</strong> {rule.replacement}
                  </div>
                </div>
                <div className="text-[11px] text-slate-500 font-mono border-t border-slate-100 pt-2">
                  Área: {rule.discipline}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
