import React, { useState, useEffect, useMemo } from 'react';
import { MATERIAL_ESTUDOS } from '../data/materialEstudosData';
import { MindMapSection, MindMapItem } from './MindMapSection';
import { StudyMarkdownRenderer, renderChemicalAndMathText } from './StudyMarkdownRenderer';
import { OriginBadge } from './ui/OriginBadge';
import { SubjectBaseBadge } from './ui/SubjectBaseBadge';
import { classifyByCodigoRef, classifyModuleId } from '../utils/subjectClassification';
import { sortMaterialModulesByPareto, sortItemsByCodigoRefPareto } from '../utils/paretoOrdering';
import {
  BookOpen,
  Calculator,
  Bookmark,
  Search,
  Lightbulb,
  Table,
  ChevronRight,
} from 'lucide-react';

interface TabMaterialEstudoProps {
  onOpenCalculator: (formulaNome?: string) => void;
}

export const TabMaterialEstudo: React.FC<TabMaterialEstudoProps> = ({ onOpenCalculator }) => {
  const orderedModules = useMemo(() => sortMaterialModulesByPareto(MATERIAL_ESTUDOS), []);

  const [moduloAtivo, setModuloAtivo] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('transpetro_material_selected_modulo');
      if (saved && MATERIAL_ESTUDOS.some((m) => m.id === saved)) {
        return saved;
      }
      return orderedModules[0]?.id || 'quimica_processos';
    } catch {
      return orderedModules[0]?.id || 'quimica_processos';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('transpetro_material_selected_modulo', moduloAtivo);
    } catch {
      // ignore
    }
  }, [moduloAtivo]);

  const [busca, setBusca] = useState<string>('');

  // Storage for custom mind maps & user notes per secao
  const [customDataBySecao, setCustomDataBySecao] = useState<
    Record<string, { mindMaps?: MindMapItem[]; notes?: string }>
  >(() => {
    const saved = localStorage.getItem('transpetro_material_estudo_custom_v1');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return {};
      }
    }
    return {};
  });

  useEffect(() => {
    localStorage.setItem('transpetro_material_estudo_custom_v1', JSON.stringify(customDataBySecao));
  }, [customDataBySecao]);

  useEffect(() => {
    const handleRestore = () => {
      try {
        const saved = localStorage.getItem('transpetro_material_estudo_custom_v1');
        if (saved) {
          setCustomDataBySecao(JSON.parse(saved));
        } else {
          setCustomDataBySecao({});
        }
      } catch {
        // ignore
      }
    };

    window.addEventListener('transpetro_data_restored', handleRestore);
    return () => window.removeEventListener('transpetro_data_restored', handleRestore);
  }, []);

  const handleSaveSecaoData = (
    secaoId: string,
    updated: { mindMaps?: MindMapItem[]; notes?: string }
  ) => {
    setCustomDataBySecao((prev) => ({
      ...prev,
      [secaoId]: updated,
    }));
  };

  const moduloSelecionado =
    orderedModules.find((m) => m.id === moduloAtivo) || orderedModules[0];

  const secoesFiltradas = useMemo(() => {
    const filtered = moduloSelecionado.secoes.filter((s) => {
      if (!busca) return true;
      const termo = busca.toLowerCase();
      return (
        s.titulo.toLowerCase().includes(termo) ||
        s.conteudoMarkdown.toLowerCase().includes(termo)
      );
    });
    return sortItemsByCodigoRefPareto(filtered);
  }, [moduloSelecionado, busca]);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Banner with Quick Actions */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#006837] tracking-wide">
              <BookOpen className="w-4 h-4 text-[#008542]" aria-hidden="true" />
              <span>Material de Estudo Oficial Condensado</span>
            </div>
            <h2 className="font-display text-2xl sm:text-[26px] font-bold text-[#071F14] tracking-[-0.02em] leading-tight">
              Conhecimentos Específicos — Dutos e Terminais &amp; Operação
            </h2>
            <p className="text-sm sm:text-[15px] text-slate-600 max-w-3xl leading-relaxed">
              Síntese teórica, quadros comparativos, normas técnicas/NRs, fórmulas matemáticas,
              pontos focais de prova, <strong className="font-semibold text-[#071F14]">mapas mentais em imagem/PDF</strong> e{' '}
              <strong className="font-semibold text-[#071F14]">anotações pessoais</strong>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              id="btn-open-calc-tab-material"
              type="button"
              onClick={() => onOpenCalculator()}
              className="h-10 px-4 rounded-xl bg-[#008542] hover:bg-[#006837] text-white font-semibold text-xs sm:text-sm inline-flex items-center gap-2 shadow-xs cursor-pointer transition-colors whitespace-nowrap"
            >
              <Calculator className="w-4 h-4" aria-hidden="true" />
              <span>Calculadora de Fórmulas</span>
            </button>
          </div>
        </div>

        {/* Module Selector Bar */}
        <div className="mt-6 flex flex-wrap gap-2 border-t border-slate-100 pt-5">
          {orderedModules.map((mod) => (
            <button
              key={mod.id}
              id={`pill-modulo-${mod.id}`}
              type="button"
              onClick={() => {
                setModuloAtivo(mod.id);
                setBusca('');
              }}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                moduloAtivo === mod.id
                  ? 'bg-[#071F14] text-[#FDB913] shadow-xs'
                  : 'bg-[#F6F8F7] text-slate-700 hover:bg-[#EFF4F1] border border-slate-200/80'
              }`}
            >
              <span>{mod.titulo}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content Area */}
      <div className="space-y-6">
        {/* Module Subtitle & Search */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-4 sm:px-6 rounded-xl border border-slate-200 shadow-xs">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h3 className="font-display text-base sm:text-lg font-bold text-[#071F14]">
                {moduloSelecionado.titulo}
              </h3>
              <SubjectBaseBadge category={classifyModuleId(moduloSelecionado.id)} compact />
            </div>
            <p className="text-xs sm:text-[13px] text-slate-600 mt-0.5 leading-relaxed">
              {moduloSelecionado.subtitulo}
            </p>
          </div>
          <div className="relative w-full sm:w-72 shrink-0">
            <Search
              className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <input
              type="text"
              placeholder="Buscar no módulo (conceito, lei, fórmula)..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full bg-[#F6F8F7] border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-xs sm:text-[13px] text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-hidden focus:border-[#008542] transition-colors"
            />
          </div>
        </div>

        {/* Sections List */}
        <div className="space-y-8">
          {secoesFiltradas.map((secao) => {
            const secaoCustom = customDataBySecao[secao.id] || {};

            return (
              <article
                key={secao.id}
                id={`secao-${secao.id}`}
                className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs space-y-7"
              >
                {/* Section Header — Editorial Kicker Above Title */}
                <header className="border-b border-slate-200/80 pb-5 space-y-2.5">
                  <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
                    <OriginBadge origem={secao.origem} />
                    {classifyByCodigoRef(secao.codigoRef).badges.map((cat) => (
                      <SubjectBaseBadge key={cat} category={cat} compact />
                    ))}
                    {secao.badge && (
                      <span className="text-xs font-semibold text-[#006837]">
                        · {secao.badge}
                      </span>
                    )}
                    {secao.codigoRef && (
                      <span className="text-[11px] font-mono font-medium text-slate-500 tabular-nums">
                        · {secao.codigoRef}
                      </span>
                    )}
                  </div>

                  <h4 className="font-display text-xl sm:text-[22px] font-bold text-[#071F14] tracking-[-0.015em] leading-snug flex items-start gap-2.5">
                    <Bookmark
                      className="w-5 h-5 text-[#008542] shrink-0 mt-1"
                      aria-hidden="true"
                    />
                    <span>{secao.titulo}</span>
                  </h4>
                </header>

                {/* Main Editorial Study Content */}
                <StudyMarkdownRenderer markdown={secao.conteudoMarkdown} />

                {/* Optional Table */}
                {secao.tabelaDestaque && (
                  <div className="bg-[#F6F8F7] p-4 sm:p-5 rounded-xl border border-slate-200 space-y-3">
                    <div className="flex items-center gap-2 font-display text-xs sm:text-sm font-bold text-[#071F14]">
                      <Table className="w-4 h-4 text-[#008542]" aria-hidden="true" />
                      <span>Quadro de Referência Rápida</span>
                    </div>
                    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
                      <table className="w-full text-left text-xs sm:text-[13px] border-collapse">
                        <thead>
                          <tr className="bg-[#EFF4F1] text-[#071F14] border-b border-slate-200 font-display font-semibold">
                            {secao.tabelaDestaque.colunas.map((col, cIdx) => (
                              <th key={cIdx} className="p-3">
                                {renderChemicalAndMathText(col)}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 tabular-nums">
                          {secao.tabelaDestaque.linhas.map((row, rIdx) => (
                            <tr key={rIdx} className="hover:bg-[#F6F8F7] transition-colors">
                              {row.map((cell, cellIdx) => (
                                <td
                                  key={cellIdx}
                                  className={`p-3 ${
                                    cellIdx === 0
                                      ? 'font-semibold text-[#071F14]'
                                      : 'text-slate-700 font-normal'
                                  }`}
                                >
                                  {renderChemicalAndMathText(cell)}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Optional Formulas Cards */}
                {secao.formulas && secao.formulas.length > 0 && (
                  <div className="space-y-3">
                    <div className="font-display text-xs sm:text-sm font-bold text-[#071F14] flex items-center gap-2">
                      <Calculator className="w-4 h-4 text-[#008542]" aria-hidden="true" />
                      <span>Fórmulas-Chave do Tópico</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {secao.formulas.map((f, fIdx) => (
                        <div
                          key={fIdx}
                          className="bg-[#F6F8F7] p-4 rounded-xl border border-slate-200 flex flex-col justify-between"
                        >
                          <div>
                            <div className="font-display font-bold text-sm text-[#071F14] mb-2">
                              {f.nome}
                            </div>
                            <div className="font-mono text-xs sm:text-[13px] text-[#006837] bg-white px-3 py-2.5 rounded-lg border border-slate-200 font-semibold tabular-nums">
                              {renderChemicalAndMathText(f.formula)}
                            </div>
                            <div className="mt-3 space-y-1 text-xs text-slate-600 leading-relaxed">
                              {f.variaveis.map((v, vIdx) => (
                                <div key={vIdx}>
                                  <strong className="font-mono font-semibold text-[#071F14]">
                                    {renderChemicalAndMathText(v.simbolo)}:
                                  </strong>{' '}
                                  {renderChemicalAndMathText(v.significado)}
                                </div>
                              ))}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => onOpenCalculator(f.nome)}
                            className="mt-4 w-full py-2 rounded-lg bg-[#E6F4EC] hover:bg-[#008542] text-xs font-semibold text-[#006837] hover:text-white border border-[#008542]/25 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                          >
                            <Calculator className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>Simular na Calculadora</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Pontos de Prova / Dicas Finais */}
                <div className="bg-amber-50/75 border border-amber-200 rounded-xl p-5 space-y-2.5">
                  <div className="flex items-center gap-2 font-display text-xs sm:text-sm font-bold text-amber-900">
                    <Lightbulb className="w-4 h-4 text-amber-600" aria-hidden="true" />
                    <span>Pontos de Atenção para a Prova (Fundação Cesgranrio)</span>
                  </div>
                  <ul className="space-y-2 text-[13.5px] sm:text-sm text-slate-700 leading-relaxed max-w-[76ch]">
                    {secao.pontosDeProva.map((ponto, pIdx) => (
                      <li key={pIdx} className="flex items-start gap-2">
                        <ChevronRight
                          className="w-4 h-4 text-amber-600 shrink-0 mt-0.5"
                          aria-hidden="true"
                        />
                        <span>{renderChemicalAndMathText(ponto)}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* SEÇÃO 1: Mapas Mentais em Imagem / PDF & Anotações Pessoais */}
                <MindMapSection
                  secaoId={secao.id}
                  secaoTitulo={secao.titulo}
                  customData={secaoCustom}
                  onSaveData={handleSaveSecaoData}
                />
              </article>
            );
          })}

          {secoesFiltradas.length === 0 && (
            <div className="text-center py-12 bg-white rounded-xl border border-slate-200 shadow-xs">
              <p className="text-slate-500 text-sm">
                Nenhum conteúdo encontrado para a busca "{busca}".
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
