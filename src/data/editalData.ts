export interface EditalMetadata {
  statusEdital: 'aguardando';
  tituloPlataforma: string;
  bancaPrincipal: string;
  basesConsolidadas: {
    id: 'transpetro' | 'petrobras';
    titulo: string;
    editalReferencia: string;
    enfase: string;
    banca: string;
    totalItensEspecificos: number;
    urlReferencia: string;
    observacao: string;
  }[];
  resumoMesclagem: {
    totalUnificados: number;
    emComum: number;
    exclusivosTranspetro: number;
    exclusivosPetrobras: number;
  };
}

export const EDITAL_METADATA: EditalMetadata = {
  statusEdital: 'aguardando',
  tituloPlataforma: 'Transpetro (Ênfase 4: Dutos e Terminais) & Petrobras (Ênfase 8: Operação)',
  bancaPrincipal: 'Fundação Cesgranrio',
  basesConsolidadas: [
    {
      id: 'transpetro',
      titulo: 'Transpetro — Ênfase 4: Dutos e Terminais',
      editalReferencia: 'Profissional Transpetro de Nível Médio Júnior · Ref. histórica: Transpetro 2023.1 (60 questões: 20 básicas + 40 específicas)',
      enfase: 'Ênfase 4: Dutos e Terminais',
      banca: 'Fundação Cesgranrio',
      totalItensEspecificos: 38,
      urlReferencia: 'https://concursos.cesgranrio.org.br/portal/avaliacoes/22',
      observacao: '38 itens de Conhecimentos Específicos considerados na base (sem Língua Portuguesa e Matemática).',
    },
    {
      id: 'petrobras',
      titulo: 'Petrobras / Transpetro — Ênfase 8: Operação Júnior',
      editalReferencia: 'Técnico de Operação Júnior · Ref. histórica Cesgranrio: Transpetro 2018 (60 questões: Química 16, Física 11, Mecânica 11 + demais)',
      enfase: 'Ênfase 8: Operação',
      banca: 'Fundação Cesgranrio',
      totalItensEspecificos: 32,
      urlReferencia: 'https://concursos.cesgranrio.org.br/portal/avaliacoes/22',
      observacao: '32 objetos de avaliação distribuídos em Bloco I (17), Bloco II (9) e Bloco III (6), preparados no padrão Cesgranrio.',
    },
  ],
  resumoMesclagem: {
    totalUnificados: 42,
    emComum: 27,
    exclusivosTranspetro: 11,
    exclusivosPetrobras: 4,
  },
};
