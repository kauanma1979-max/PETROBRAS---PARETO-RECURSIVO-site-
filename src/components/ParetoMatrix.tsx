import React, { useState, useMemo } from 'react';
import { PARETO_MATRIX, PARETO_SOURCE_STATS } from '../data/paretoData';
import { Card, Button, StatusBadge, EmptyState, OriginBadge, SubjectBaseBadge } from './ui';
import type { OrigemEdital } from './ui/OriginBadge';
import { classifyByCodigoRef, classifyMacroArea } from '../utils/subjectClassification';
import { sortParetoMacros, sortMesosByPareto, sortMicrosByPareto } from '../utils/paretoOrdering';
import {
  Search,
  Filter,
  Gauge,
  Cog,
  FlaskConical,
  Zap,
  Database,
  Flame,
  Sparkles,
  Clock,
  AlertTriangle,
  Target,
  Layers,
  Brain,
} from 'lucide-react';
import { exportFullBackup } from '../utils/backupStorage';
import {
  findMatchingSyllabusTopicId,
  type CesgranrioAiLaunchRequest,
} from '../data/cesgranrioDna';

interface ParetoMatrixProps {
  onLaunchCesgranrioAi?: (req: CesgranrioAiLaunchRequest) => void;
}

export const ParetoMatrix: React.FC<ParetoMatrixProps> = ({ onLaunchCesgranrioAi }) => {
  const [activeLayer, setActiveLayer] = useState<'todas' | 'camada1' | 'camada2' | 'camada3'>('todas');
  const [selectedDiscipline, setSelectedDiscipline] = useState<string>('todas');
  const [selectedOrigin, setSelectedOrigin] = useState<'todas' | OrigemEdital>('todas');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const getThemeMeta = (id: string) => {
    switch (id) {
      case 'instrumentacao':
        return {
          icon: <Gauge className="w-4 h-4" aria-hidden="true" />,
          iconBg: 'bg-[#E6F4EC] text-[#006837] border border-[#008542]/25',
        };
      case 'mecanica_fluidos':
        return {
          icon: <Cog className="w-4 h-4" aria-hidden="true" />,
          iconBg: 'bg-amber-50 text-amber-800 border border-amber-300',
        };
      case 'quimica_processos':
        return {
          icon: <FlaskConical className="w-4 h-4" aria-hidden="true" />,
          iconBg: 'bg-orange-50 text-orange-800 border border-orange-200',
        };
      case 'eletricidade':
      default:
        return {
          icon: <Zap className="w-4 h-4" aria-hidden="true" />,
          iconBg: 'bg-sky-50 text-sky-700 border border-sky-200',
        };
    }
  };

  const getPriorityBadge = (priority: 'CRÍTICA' | 'ALTA' | 'MÉDIA') => {
    if (priority === 'CRÍTICA') {
      return (
        <StatusBadge tone="orange" icon={<Flame className="w-3 h-3" />}>
          CRÍTICA
        </StatusBadge>
      );
    }
    if (priority === 'ALTA') {
      return (
        <StatusBadge tone="success" icon={<Sparkles className="w-3 h-3" />}>
          ALTA
        </StatusBadge>
      );
    }
    return (
      <StatusBadge tone="neutral" icon={<Clock className="w-3 h-3" />}>
        MÉDIA
      </StatusBadge>
    );
  };

  const orderedMacros = useMemo(() => sortParetoMacros(PARETO_MATRIX), []);

  const filteredMacros = useMemo(() => {
    return orderedMacros.filter(
      (macro) => selectedDiscipline === 'todas' || macro.id === selectedDiscipline
    );
  }, [orderedMacros, selectedDiscipline]);

  const filteredMesoList = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return filteredMacros.flatMap((macro) =>
      sortMesosByPareto(macro.mesos)
        .filter((meso) => {
          const matchesOrigin =
            selectedOrigin === 'todas' ||
            meso.origem === selectedOrigin ||
            meso.micros.some((mic) => mic.origem === selectedOrigin);
          const matchesSearch =
            q === '' ||
            meso.name.toLowerCase().includes(q) ||
            meso.summary.toLowerCase().includes(q) ||
            meso.micros.some(
              (mic) =>
                mic.name.toLowerCase().includes(q) ||
                mic.bancaPattern.toLowerCase().includes(q) ||
                mic.keyTrap.toLowerCase().includes(q) ||
                (mic.codigoRef && mic.codigoRef.toLowerCase().includes(q))
            );
          return matchesOrigin && matchesSearch;
        })
        .map((meso) => ({ macro, meso }))
    );
  }, [filteredMacros, selectedOrigin, searchQuery]);

  const filteredMicroList = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = filteredMacros.flatMap((macro) =>
      sortMesosByPareto(macro.mesos).flatMap((meso) =>
        sortMicrosByPareto(meso.micros)
          .filter((micro) => {
            const matchesOrigin = selectedOrigin === 'todas' || micro.origem === selectedOrigin;
            const matchesSearch =
              q === '' ||
              micro.name.toLowerCase().includes(q) ||
              micro.bancaPattern.toLowerCase().includes(q) ||
              micro.keyTrap.toLowerCase().includes(q) ||
              meso.name.toLowerCase().includes(q) ||
              (micro.codigoRef && micro.codigoRef.toLowerCase().includes(q));
            return matchesOrigin && matchesSearch;
          })
          .map((micro) => ({ macro, meso, micro }))
      )
    );
    return list.sort((a, b) => {
      if (b.micro.paretoPct !== a.micro.paretoPct) return b.micro.paretoPct - a.micro.paretoPct;
      if (b.micro.questionCount !== a.micro.questionCount) {
        return b.micro.questionCount - a.micro.questionCount;
      }
      return a.micro.name.localeCompare(b.micro.name, 'pt-BR');
    });
  }, [filteredMacros, selectedOrigin, searchQuery]);

  const layers = [
    { id: 'todas' as const, btnId: 'btn-layer-todas', label: 'Visão Completa' },
    { id: 'camada1' as const, btnId: 'btn-layer-1', label: 'Camada 1 (Macro)' },
    { id: 'camada2' as const, btnId: 'btn-layer-2', label: 'Camada 2 (Meso)' },
    { id: 'camada3' as const, btnId: 'btn-layer-3', label: 'Camada 3 (Micro)' },
  ];

  const totalTopics = PARETO_MATRIX.reduce((acc, m) => acc + m.topicsCount, 0);

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header Info */}
      <Card padding="lg">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs font-semibold text-slate-500 mb-2">
              <StatusBadge tone="success">Pareto Recursivo 80/20</StatusBadge>
              <span className="text-slate-300" aria-hidden="true">·</span>
              <span className="tabular-nums">
                4 Macro Áreas · {totalTopics} Tópicos · {PARETO_SOURCE_STATS.totalDentroDos42} Questões Mapeadas
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-display font-extrabold text-slate-900 tracking-tight">
              Mapa de Prioridades Pareto Recursivo
            </h2>
            <p className="text-slate-600 mt-1 text-xs sm:text-sm max-w-3xl leading-relaxed">
              Pesos calibrados com <strong>{PARETO_SOURCE_STATS.totalDentroDos42} questões reais</strong>{' '}
              ({PARETO_SOURCE_STATS.provasLabel}) enquadradas estritamente dentro dos{' '}
              <strong>42 tópicos</strong> de <strong>Transpetro (Ênfase 4)</strong> e{' '}
              <strong>Petrobras (Ênfase 8)</strong>.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <Button
              id="btn-pareto-backup-json"
              variant="primary"
              size="sm"
              leftIcon={<Database className="w-3.5 h-3.5" aria-hidden="true" />}
              onClick={() => exportFullBackup()}
              title="Baixar backup completo de todos os dados do sistema em JSON"
            >
              Salvar Backup JSON
            </Button>

            <div
              role="group"
              aria-label="Selecionar camada do Pareto"
              className="flex flex-wrap items-center gap-1 p-1 bg-[#EFF4F1] rounded-xl border border-slate-200/70"
            >
              {layers.map((layer) => (
                <button
                  key={layer.id}
                  id={layer.btnId}
                  type="button"
                  aria-pressed={activeLayer === layer.id}
                  onClick={() => setActiveLayer(layer.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    activeLayer === layer.id
                      ? 'bg-[#071F14] text-[#FDB913] border-b-2 border-orange-500 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {layer.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="space-y-3 mt-5 pt-4 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-bold text-slate-500 mr-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" aria-hidden="true" /> Área Técnica:
            </span>
            <button
              id="filter-disc-todas"
              type="button"
              aria-pressed={selectedDiscipline === 'todas'}
              onClick={() => setSelectedDiscipline('todas')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedDiscipline === 'todas'
                  ? 'bg-[#071F14] text-[#FDB913]'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Todas ({totalTopics} tópicos)
            </button>
            {orderedMacros.map((m) => (
              <button
                key={m.id}
                id={`filter-disc-${m.id}`}
                type="button"
                aria-pressed={selectedDiscipline === m.id}
                onClick={() => setSelectedDiscipline(m.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                  selectedDiscipline === m.id
                    ? 'bg-[#008542] text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <span>{m.discipline}</span>
                <span
                  className={`text-[11px] font-mono tabular-nums px-1.5 py-0.5 rounded-md font-semibold ${
                    selectedDiscipline === m.id
                      ? 'bg-[#006837] text-[#FDB913]'
                      : 'bg-slate-200/80 text-slate-600'
                  }`}
                >
                  {m.weightPct}%
                </span>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-center">
            <div className="lg:col-span-8 flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-bold text-slate-500 mr-1 flex items-center gap-1">
                <Layers className="w-3.5 h-3.5" aria-hidden="true" /> Origem:
              </span>
              {(
                [
                  { id: 'todas', label: 'Todas as Origens' },
                  { id: 'ambos', label: 'Transpetro + Petrobras' },
                  { id: 'transpetro', label: 'Transpetro' },
                  { id: 'petrobras', label: 'Petrobras' },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  id={`pareto-origin-${opt.id}`}
                  type="button"
                  aria-pressed={selectedOrigin === opt.id}
                  onClick={() => setSelectedOrigin(opt.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    selectedOrigin === opt.id
                      ? 'bg-[#071F14] text-[#FDB913] border-b-2 border-orange-500'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div className="lg:col-span-4 relative">
              <label htmlFor="input-pareto-search" className="sr-only">
                Buscar tópico, código ou armadilha no mapa Pareto
              </label>
              <Search
                className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <input
                id="input-pareto-search"
                type="text"
                placeholder="Buscar tópico, código ou armadilha..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-[#F6F8F7] border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#008542]/20 focus:border-[#008542] font-medium"
              />
            </div>
          </div>
        </div>
      </Card>

      {/* ================= CAMADA 1: MACRO ================= */}
      {(activeLayer === 'todas' || activeLayer === 'camada1') && (
        <div className="space-y-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-base sm:text-lg font-display font-bold text-slate-900 flex items-center gap-2 tracking-tight">
              <span className="w-5 h-5 rounded-md bg-orange-100 text-orange-800 flex items-center justify-center text-xs font-mono font-bold">
                1
              </span>
              CAMADA 1 — Macro (Distribuição de Peso pelas 4 Áreas Técnicas)
            </h3>
            <span className="text-xs text-slate-500 font-medium tabular-nums">
              100% do conteúdo técnico mesclado
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {filteredMacros.map((m) => {
              const themeStyle = getThemeMeta(m.id);
              return (
                <Card
                  key={m.id}
                  variant="interactive"
                  padding="md"
                  className="flex flex-col justify-between"
                >
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <StatusBadge tone={m.weightPct >= 30 ? 'orange' : 'success'}>
                          Peso {m.weightPct}% ({m.questionCount}q)
                        </StatusBadge>
                        <SubjectBaseBadge category={classifyMacroArea(m.id)} compact />
                      </div>
                      <span className="text-xs font-bold text-slate-500 font-mono tabular-nums">
                        {m.topicsCount} tópicos
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${themeStyle.iconBg}`}
                      >
                        {themeStyle.icon}
                      </span>
                      <h4 className="text-sm font-bold text-slate-900 leading-snug">
                        {m.discipline}
                      </h4>
                    </div>
                    <p className="text-xs text-slate-600 mt-2 leading-relaxed">{m.description}</p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-500">Incidência exata / Mesos:</span>
                    <span className="font-mono font-bold text-[#006837] tabular-nums">
                      {m.exactPct.toFixed(1)}% · {m.mesos.length} blocos
                    </span>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* ================= CAMADA 2: MESO ================= */}
      {(activeLayer === 'todas' || activeLayer === 'camada2') && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-base sm:text-lg font-display font-bold text-slate-900 flex items-center gap-2 tracking-tight">
                <span className="w-5 h-5 rounded-md bg-[#FDB913] text-[#071F14] flex items-center justify-center text-xs font-mono font-bold">
                  2
                </span>
                CAMADA 2 — Meso (Blocos Temáticos e Peso Interno)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Agrupamento tático de tópicos dentro de cada área técnica com identificação de origem.
              </p>
            </div>
          </div>

          {filteredMesoList.length === 0 ? (
            <EmptyState
              title="Nenhum bloco meso encontrado"
              description="Tente limpar o filtro de busca, área ou origem."
              actionLabel="Limpar filtros"
              onAction={() => {
                setSearchQuery('');
                setSelectedDiscipline('todas');
                setSelectedOrigin('todas');
              }}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredMesoList.map(({ macro, meso }) => {
                const themeStyle = getThemeMeta(macro.id);
                const mesoBadges = Array.from(
                  new Set(
                    meso.micros.flatMap((mic) => classifyByCodigoRef(mic.codigoRef).badges)
                  )
                );
                return (
                  <Card key={meso.id} padding="md" className="flex flex-col justify-between gap-3">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${themeStyle.iconBg}`}
                          >
                            {themeStyle.icon}
                          </span>
                          <span className="text-xs font-semibold text-slate-600">
                            {macro.discipline}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {mesoBadges.map((cat) => (
                            <SubjectBaseBadge key={cat} category={cat} compact />
                          ))}
                          <OriginBadge origem={meso.origem} compact />
                        </div>
                      </div>

                      <h4 className="text-sm sm:text-base font-display font-bold text-slate-900 leading-snug">
                        {meso.name}
                      </h4>
                      <p className="text-xs text-slate-600 leading-relaxed">{meso.summary}</p>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-mono tabular-nums">
                      <span className="text-slate-500">
                        {meso.micros.length} subtópicos · {meso.questionCount} questões
                      </span>
                      <span className="font-bold text-[#006837]">
                        {meso.weightInDiscipline}% da área
                      </span>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ================= CAMADA 3: MICRO ================= */}
      {(activeLayer === 'todas' || activeLayer === 'camada3') && (
        <div className="space-y-4">
          <div>
            <h3 className="text-base sm:text-lg font-display font-bold text-slate-900 flex items-center gap-2 tracking-tight">
              <span className="w-5 h-5 rounded-md bg-[#E6F4EC] text-[#006837] flex items-center justify-center text-xs font-mono font-bold">
                3
              </span>
              CAMADA 3 — Micro (Padrão das Bancas &amp; Armadilhas de Prova)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Detalhamento de cobrança (Fundação Cesgranrio), origem no edital e pegadinha mais recorrente.
            </p>
          </div>

          {filteredMicroList.length === 0 ? (
            <EmptyState
              title="Nenhum subtópico micro encontrado"
              description="Ajuste a busca ou redefina os filtros para visualizar os subtópicos."
              actionLabel="Limpar filtros"
              onAction={() => {
                setSearchQuery('');
                setSelectedDiscipline('todas');
                setSelectedOrigin('todas');
              }}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredMicroList.map(({ macro, meso, micro }, idx) => (
                <Card
                  key={`${meso.id}-${idx}`}
                  variant="interactive"
                  padding="md"
                  className="flex flex-col justify-between gap-3"
                >
                  <div className="space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <OriginBadge origem={micro.origem} compact />
                        {classifyByCodigoRef(micro.codigoRef).badges.map((cat) => (
                          <SubjectBaseBadge key={cat} category={cat} compact />
                        ))}
                        {getPriorityBadge(micro.priority)}
                        {micro.isNucleo80 && (
                          <StatusBadge tone="gold">Núcleo 80/20</StatusBadge>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[11px] font-mono font-bold text-[#006837] bg-[#E6F4EC] px-2 py-0.5 rounded tabular-nums">
                          {micro.questionCount}q ({micro.paretoPct.toFixed(1)}%) · {micro.examPresence}
                        </span>
                        {micro.codigoRef && (
                          <span className="text-[11px] font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                            {micro.codigoRef}
                          </span>
                        )}
                      </div>
                    </div>

                    <div>
                      <div className="text-[11px] text-slate-500 font-medium mb-0.5">
                        {macro.discipline} · {meso.name}
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 leading-snug">
                        {micro.name}
                      </h4>
                    </div>

                    <div className="bg-[#F6F8F7] p-3 rounded-xl border border-slate-200/80 text-xs text-slate-700 leading-relaxed flex items-start gap-2">
                      <Target className="w-3.5 h-3.5 text-[#008542] shrink-0 mt-0.5" aria-hidden="true" />
                      <div>
                        <strong className="text-[#006837]">Como cai na prova:</strong>{' '}
                        {micro.bancaPattern}
                      </div>
                    </div>

                    <div className="bg-orange-50/80 p-3 rounded-xl border border-orange-200 text-xs text-orange-950 leading-relaxed flex items-start gap-2">
                      <AlertTriangle
                        className="w-3.5 h-3.5 text-orange-600 shrink-0 mt-0.5"
                        aria-hidden="true"
                      />
                      <div>
                        <strong className="text-orange-900">Armadilha clássica:</strong>{' '}
                        {micro.keyTrap}
                      </div>
                    </div>
                  </div>

                  {onLaunchCesgranrioAi && (
                    <div className="pt-2.5 border-t border-slate-100 flex flex-wrap items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        leftIcon={<Brain className="w-3.5 h-3.5 text-[#006837]" aria-hidden="true" />}
                        onClick={() =>
                          onLaunchCesgranrioAi({
                            topicId: findMatchingSyllabusTopicId(micro.codigoRef || micro.name),
                            subTab: 'professor',
                            customContext: `${micro.name} (${micro.bancaPattern})`,
                            timestamp: Date.now(),
                          })
                        }
                      >
                        Estudar (9 Passos)
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        leftIcon={<Sparkles className="w-3.5 h-3.5 text-orange-600" aria-hidden="true" />}
                        onClick={() =>
                          onLaunchCesgranrioAi({
                            topicId: findMatchingSyllabusTopicId(micro.codigoRef || micro.name),
                            subTab: 'questoes',
                            customContext: `${micro.name} — foco em ${micro.keyTrap}`,
                            timestamp: Date.now(),
                          })
                        }
                      >
                        Treinar Questões A–E
                      </Button>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
