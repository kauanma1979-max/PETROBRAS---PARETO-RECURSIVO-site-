import React from 'react';
import { EDITAL_METADATA } from '../data/editalData';
import { Card, StatusBadge, Button, OriginBadge } from './ui';
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

interface EditalSummaryProps {
  onNavigateTab?: (tabId: string) => void;
}

export const EditalSummary: React.FC<EditalSummaryProps> = ({ onNavigateTab }) => {
  return (
    <div className="space-y-6">
      {/* Awaiting Edital Placeholder Card */}
      <Card padding="lg">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge tone="orange" icon={<Clock className="w-3 h-3" />}>
                Edital Ainda Não Aberto
              </StatusBadge>
              <OriginBadge origem="ambos" />
            </div>

            <h2 className="text-xl sm:text-2xl lg:text-3xl font-display font-extrabold text-slate-900 tracking-tight">
              Edital do Concurso em Aguardo de Publicação
            </h2>

            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Esta aba permanece sem dados de vagas, polos, datas de inscrição ou cronograma oficial porque o edital do novo concurso ainda não foi publicado. Assim que o edital abrir, as informações oficiais poderão ser preenchidas aqui.
            </p>

            <div className="bg-[#F6F8F7] border border-slate-200/80 rounded-xl p-3.5 text-xs text-slate-700 flex items-start gap-2.5">
              <Info className="w-4 h-4 text-[#008542] shrink-0 mt-0.5" aria-hidden="true" />
              <span>
                Enquanto o edital não abre, toda a plataforma já está estruturada sobre o{' '}
                <strong>conteúdo programático mesclado</strong> de referência:{' '}
                <strong>{EDITAL_METADATA.resumoMesclagem.totalUnificados} tópicos unificados</strong>{' '}
                ({EDITAL_METADATA.resumoMesclagem.emComum} em comum entre Transpetro e Petrobras,{' '}
                {EDITAL_METADATA.resumoMesclagem.exclusivosTranspetro} exclusivos da Transpetro e{' '}
                {EDITAL_METADATA.resumoMesclagem.exclusivosPetrobras} exclusivos da Petrobras).
              </span>
            </div>
          </div>

          {onNavigateTab && (
            <div className="flex flex-col gap-2 shrink-0 sm:min-w-[230px]">
              <Button
                variant="primary"
                size="md"
                onClick={() => onNavigateTab('verticalizado')}
                leftIcon={<FileSpreadsheet className="w-4 h-4" />}
                rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                className="justify-between"
              >
                Ir para Edital Verticalizado
              </Button>
              <Button
                variant="outline"
                size="md"
                onClick={() => onNavigateTab('material')}
                leftIcon={<BookMarked className="w-4 h-4 text-[#008542]" />}
                rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                className="justify-between"
              >
                Abrir Material de Estudos
              </Button>
              <Button
                variant="outline"
                size="md"
                onClick={() => onNavigateTab('pareto')}
                leftIcon={<Target className="w-4 h-4 text-orange-600" />}
                rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                className="justify-between"
              >
                Ver Pareto Recursivo
              </Button>
              <Button
                variant="outline"
                size="md"
                onClick={() => onNavigateTab('cronograma')}
                leftIcon={<Layers className="w-4 h-4 text-[#006837]" />}
                rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                className="justify-between"
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
          <Card key={base.id} padding="md" className="flex flex-col justify-between gap-4">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <OriginBadge origem={base.id} />
                <span className="text-[11px] font-mono font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                  {base.totalItensEspecificos} itens específicos
                </span>
              </div>
              <h3 className="text-sm sm:text-base font-display font-bold text-slate-900">
                {base.titulo}
              </h3>
              <p className="text-xs text-slate-600">{base.editalReferencia}</p>
              <p className="text-xs text-slate-500 leading-relaxed">{base.observacao}</p>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
              <span className="font-semibold text-slate-700">Banca base: {base.banca}</span>
              <a
                href={base.urlReferencia}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[#006837] hover:text-[#071F14] font-semibold"
              >
                <span>Referência Oficial</span>
                <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
              </a>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
