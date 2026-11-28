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
  bancaPrincipal: 'Cesgranrio (Transpetro) · Cebraspe (Petrobras)',
  basesConsolidadas: [
    {
      id: 'transpetro',
      titulo: 'Transpetro 2026 — Ênfase 4: Dutos e Terminais',
      editalReferencia: 'Edital nº 03 — Profissional Transpetro de Nível Médio Júnior (Anexo IV)',
      enfase: 'Ênfase 4: Dutos e Terminais',
      banca: 'Fundação Cesgranrio',
      totalItensEspecificos: 38,
      urlReferencia: 'https://concursos.cesgranrio.org.br/portal/avaliacoes/22',
      observacao: '38 itens de Conhecimentos Específicos considerados na base (sem Língua Portuguesa e Matemática).',
    },
    {
      id: 'petrobras',
      titulo: 'Petrobras 2023.2 — Ênfase 8: Operação',
      editalReferencia: 'Edital nº 1 — Petrobras/PSP RH 2023.2 (Anexo IV — Blocos I, II e III)',
      enfase: 'Ênfase 8: Operação',
      banca: 'Cebraspe',
      totalItensEspecificos: 32,
      urlReferencia:
        'https://cdn.cebraspe.org.br/concursos/petrobras_23_ntj/arquivos/ED_1_PETROBRAS_PSP_23_2_ABERTURA_ATUALIZADO_RET_3_DOU.PDF',
      observacao: '32 objetos de avaliação distribuídos em Bloco I (17), Bloco II (9) e Bloco III (6).',
    },
  ],
  resumoMesclagem: {
    totalUnificados: 42,
    emComum: 27,
    exclusivosTranspetro: 11,
    exclusivosPetrobras: 4,
  },
};
