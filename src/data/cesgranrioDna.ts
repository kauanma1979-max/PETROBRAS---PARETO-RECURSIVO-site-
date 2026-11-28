import { EDITAL_VERTICALIZADO_DATA, type EditalTopic } from './verticalSyllabusData';

export type CesgranrioProfileId = 'operacao_jr' | 'dutos_terminais';

export type DifficultyLevel = 1 | 2 | 3 | 4;

export interface CesgranrioProfileSpec {
  id: CesgranrioProfileId;
  title: string;
  shortTitle: string;
  cargoReferencia: string;
  provaReferenciaPrincipal: string;
  anoReferencia: string;
  banca: 'Fundação CESGRANRIO';
  totalQuestoes: number;
  composicaoProva: string;
  distribuicaoHistorica: { label: string; questoes?: number; detalhe: string }[];
  totalTopicosNoPerfil: number;
  focoPrioritario: string;
  resumoEstilo: string;
}

export const CESGRANRIO_PROFILES: Record<CesgranrioProfileId, CesgranrioProfileSpec> = {
  operacao_jr: {
    id: 'operacao_jr',
    title: 'Perfil 1 — Operação Júnior',
    shortTitle: 'Operação Júnior',
    cargoReferencia: 'Técnico(a) de Operação Júnior',
    provaReferenciaPrincipal: 'Transpetro 2018 — Técnico de Operação Júnior',
    anoReferencia: '2018',
    banca: 'Fundação CESGRANRIO',
    totalQuestoes: 60,
    composicaoProva: '60 questões objetivas (Múltipla Escolha A–E) · Prioridade nas Específicas',
    distribuicaoHistorica: [
      { label: 'Química', questoes: 16, detalhe: 'Maior peso específico na referência TP 2018' },
      { label: 'Física', questoes: 11, detalhe: 'Termodinâmica, hidrostática, fluidos e eletricidade' },
      { label: 'Mecânica', questoes: 11, detalhe: 'Equipamentos, bombas, tubulações e materiais' },
      { label: 'Demais disciplinas', questoes: 22, detalhe: 'Conhecimentos básicos e complementares (total 60q)' },
    ],
    totalTopicosNoPerfil: 31,
    focoPrioritario:
      'Fundamentos físico-químicos aplicados à operação de processos, equilíbrio, estequiometria, gases, termodinâmica, mecânica dos fluidos e equipamentos rotativos/estáticos.',
    resumoEstilo:
      'Na referência Transpetro 2018 (Operação Júnior), a CESGRANRIO privilegia questões específicas com forte base em Química (16), Física (11) e Mecânica (11), exigindo domínio de unidades, leis termodinâmicas e diagnóstico operacional sem uso de calculadora.',
  },
  dutos_terminais: {
    id: 'dutos_terminais',
    title: 'Perfil 2 — Dutos e Terminais',
    shortTitle: 'Dutos e Terminais',
    cargoReferencia: 'Técnico(a) de Dutos e Terminais Júnior',
    provaReferenciaPrincipal: 'Transpetro 2023.1 — Técnico de Dutos e Terminais',
    anoReferencia: '2023.1',
    banca: 'Fundação CESGRANRIO',
    totalQuestoes: 60,
    composicaoProva: '60 questões (20 Básicas + 40 Específicas) · Múltipla Escolha A–E',
    distribuicaoHistorica: [
      { label: 'Conhecimentos Básicos', questoes: 20, detalhe: 'Língua Portuguesa (10) e Matemática (10)' },
      { label: 'Conhecimentos Específicos', questoes: 40, detalhe: 'Foco prioritário na análise e pontuação' },
    ],
    totalTopicosNoPerfil: 38,
    focoPrioritario:
      'Instrumentação e controle (4–20 mA, válvulas FO/FC, SIS, ISA-5.1), escoamento em dutos, bombas e compressores, tanques, movimentação/armazenagem, corrosão/proteção catódica e SMS (NR-13, NR-20, NR-33).',
    resumoEstilo:
      'Na referência Transpetro 2023.1 (Dutos e Terminais), a CESGRANRIO divide a prova em 20 básicas + 40 específicas, cobrando interpretação de rotinas de dutovias/terminais, instrumentação industrial, bombas/cavitação, perda de carga e normas de segurança.',
  },
};

export const CESGRANRIO_CHARACTERISTICS: readonly string[] = [
  'Cobrança conceitual com aplicação prática em ambientes de refino, dutos e terminais.',
  'Interpretação de situações técnicas operacionais (partida de bombas, falhas de malha, segurança).',
  'Resolução de problemas numéricos limpos (sem uso de calculadora em prova).',
  'Aplicação direta de fórmulas e interpretação física/química dos resultados obtidos.',
  'Identificação de características construtivas e operacionais de equipamentos e instrumentos.',
  'Interpretação de gráficos, curvas características, tabelas de dados e esquemas P&ID/ISA-5.1.',
  'Diferenciação precisa entre conceitos semelhantes ("pares conceituais irmãos").',
  'Exploração rigorosa de unidades de medida (K vs °C, 4–20 mA, Pa vs kgf/cm²), condições operacionais e relações físicas.',
  'Cinco alternativas (A, B, C, D e E) tecnicamente plausíveis e bem balanceadas em extensão.',
  'Questões que avaliam compreensão real e raciocínio técnico, nunca apenas memorização mecânica.',
];

export const CESGRANRIO_SKILLS: readonly string[] = [
  'Identificar',
  'Diferenciar',
  'Interpretar',
  'Calcular',
  'Aplicar',
  'Relacionar',
  'Analisar',
  'Reconhecer condições de funcionamento',
  'Avaliar resultados',
];

export const CESGRANRIO_DISTRACTOR_TYPES: readonly { id: string; label: string; description: string }[] = [
  {
    id: 'conceitos_semelhantes',
    label: 'Confusão entre conceitos semelhantes',
    description: 'Troca termos próximos como exatidão × precisão, agente oxidante × redutor ou gaveta × globo.',
  },
  {
    id: 'inversao_relacoes',
    label: 'Inversão de relações físicas',
    description: 'Inverte proporcionalidades diretas e inversas (ex.: viscosidade × Reynolds, pressão × velocidade em Bernoulli).',
  },
  {
    id: 'troca_unidades',
    label: 'Troca de unidades de medida',
    description: 'Usa °C no lugar de K em gases ideais, esquece zero vivo de 4 mA ou mistura bar/Pa/mca.',
  },
  {
    id: 'erro_sinal',
    label: 'Erro de sinal ou convenção',
    description: 'Inverte sinal em ΔH (endo/exo), ΔU = Q − W, balanço de massa ou sentido de fluxo.',
  },
  {
    id: 'formula_inadequada',
    label: 'Aplicação de fórmula inadequada',
    description: 'Usa equação de gás ideal ou processo isotérmico em cenário adiabático, ou confunde série × paralelo.',
  },
  {
    id: 'interpretacao_incompleta',
    label: 'Interpretação incompleta',
    description: 'Afirmação parcialmente verdadeira que omite uma condição restritiva essencial da norma ou fenômeno.',
  },
  {
    id: 'confusao_equipamentos',
    label: 'Confusão entre equipamentos',
    description: 'Troca bomba centrífuga por deslocamento positivo, termopar por Pt100 ou válvula FO por FC.',
  },
  {
    id: 'condicoes_operacionais',
    label: 'Desconsideração de condições operacionais',
    description: 'Ignora pressão de vapor/NPSH, regime CA vs CC em transformadores ou estado físico nas CNTP.',
  },
  {
    id: 'causa_consequencia',
    label: 'Confusão entre causa e consequência',
    description: 'Inverte o gatilho operacional com o efeito resultante (ex.: causa da cavitação vs dano no impelidor).',
  },
  {
    id: 'generalizacao_indevida',
    label: 'Generalização indevida de uma regra',
    description: 'Estende propriedade válida apenas para um caso restrito (ex.: todo hidrocarboneto, qualquer válvula).',
  },
];

export const CESGRANRIO_DIFFICULTY_LEVELS: readonly {
  level: DifficultyLevel;
  code: string;
  title: string;
  description: string;
}[] = [
  {
    level: 1,
    code: 'NÍVEL 1',
    title: 'Reconhecimento',
    description: 'Conceitos fundamentais, definições, propriedades físico-químicas e funções de equipamentos/instrumentos.',
  },
  {
    level: 2,
    code: 'NÍVEL 2',
    title: 'Aplicação',
    description: 'Aplicação de fórmulas, conversões de escala, cálculos diretos limpos e utilização operacional de conceitos.',
  },
  {
    level: 3,
    code: 'NÍVEL 3',
    title: 'Interpretação',
    description: 'Análise de cenários operacionais, gráficos, curvas características, tabelas e problemas contextualizados.',
  },
  {
    level: 4,
    code: 'NÍVEL 4',
    title: 'Integração',
    description: 'Combinação de dois ou mais conceitos de áreas distintas para diagnosticar ou resolver problemas complexos.',
  },
];

export const CESGRANRIO_PROFESSOR_9_STEPS: readonly string[] = [
  '1. Explicar o conceito desde a fundamentação.',
  '2. Apresentar uma analogia ou aplicação prática (Feynman / Visual).',
  '3. Demonstrar o funcionamento ou mecanismo envolvido.',
  '4. Apresentar exemplos técnicos objetivos.',
  '5. Destacar os conceitos que não podem ser confundidos.',
  '6. Identificar como a CESGRANRIO pode cobrar o assunto no perfil ativo.',
  '7. Apresentar as principais pegadinhas e distratores.',
  '8. Resolver uma questão comentada passo a passo.',
  '9. Apresentar uma questão inédita (5 alternativas A–E) para testar a aprendizagem.',
];

export const CESGRANRIO_PRECISION_RULES: readonly string[] = [
  'Não inventar estatísticas de cobrança nem apresentar estimativas como fatos.',
  'Não inventar características atribuídas à banca fora das provas de referência.',
  'Não confundir CESGRANRIO com CEBRASPE (foco exclusivo em múltipla escolha A–E CESGRANRIO).',
  'Não utilizar provas de outra banca como evidência direta do estilo CESGRANRIO.',
  'Não extrapolar o conteúdo do edital ativo do perfil selecionado.',
  'Diferenciar expressamente QUESTÃO REAL (de prova identificada/CSV) de QUESTÃO INÉDITA (gerada por IA).',
  'Não classificar uma questão correlata como diretamente prevista sem justificativa técnica explícita.',
];

export interface ProfileTopicMatch {
  topic: EditalTopic;
  inActiveProfile: boolean;
  isIntersection: boolean;
  profileCode: string;
  otherProfileCode?: string;
}

export function isTopicInCesgranrioProfile(
  topic: EditalTopic,
  profileId: CesgranrioProfileId
): boolean {
  if (topic.origem === 'ambos') return true;
  if (profileId === 'operacao_jr') return topic.origem === 'petrobras';
  return topic.origem === 'transpetro';
}

export function getTopicsForCesgranrioProfile(
  profileId: CesgranrioProfileId
): ProfileTopicMatch[] {
  return EDITAL_VERTICALIZADO_DATA.map((topic) => {
    const inActiveProfile = isTopicInCesgranrioProfile(topic, profileId);
    const isIntersection = topic.origem === 'ambos';
    const profileCode =
      profileId === 'operacao_jr'
        ? topic.codigoPetrobras || topic.codigoTranspetro || topic.id
        : topic.codigoTranspetro || topic.codigoPetrobras || topic.id;
    const otherProfileCode =
      profileId === 'operacao_jr' ? topic.codigoTranspetro : topic.codigoPetrobras;

    return {
      topic,
      inActiveProfile,
      isIntersection,
      profileCode,
      otherProfileCode,
    };
  });
}

export function getProfileIntersectionSummary() {
  const total = EDITAL_VERTICALIZADO_DATA.length;
  const intersection = EDITAL_VERTICALIZADO_DATA.filter((t) => t.origem === 'ambos').length;
  const exclusiveOperacao = EDITAL_VERTICALIZADO_DATA.filter((t) => t.origem === 'petrobras').length;
  const exclusiveDutos = EDITAL_VERTICALIZADO_DATA.filter((t) => t.origem === 'transpetro').length;
  return {
    total,
    intersection,
    operacaoTotal: intersection + exclusiveOperacao,
    dutosTotal: intersection + exclusiveDutos,
    exclusiveOperacao,
    exclusiveDutos,
  };
}

export function buildCesgranrioSystemInstruction(profileId: CesgranrioProfileId): string {
  const profile = CESGRANRIO_PROFILES[profileId];
  return [
    `Você é o módulo permanente "DNA DA BANCA — CESGRANRIO" de um aplicativo de preparação técnica para o Sistema Petrobras/Transpetro.`,
    `PERFIL ATIVO SELECIONADO: ${profile.title} (${profile.cargoReferencia}).`,
    `REFERÊNCIA HISTÓRICA PRINCIPAL DO PERFIL: ${profile.provaReferenciaPrincipal} (${profile.banca}, ${profile.composicaoProva}).`,
    `FOCO TÉCNICO DO PERFIL: ${profile.focoPrioritario}`,
    ``,
    `REGRAS INEGOCIÁVEIS:`,
    `1. Separação estrita de perfis: NÃO misture automaticamente distribuições ou objetos exclusivos do outro perfil. Quando o assunto for comum aos dois editais (origem "ambos"), identifique explicitamente a interseção.`,
    `2. Estilo exclusivo Fundação CESGRANRIO (múltipla escolha com 5 alternativas A, B, C, D e E, apenas 1 correta). NUNCA confunda com estilo Certo/Errado ou com outra banca.`,
    `3. Cálculos limpos compatíveis com prova sem calculadora (simplificações por potências de 10, frações exatas e constantes usuais).`,
    `4. Distratores obrigatórios baseados em erros reais de raciocínio técnico (troca de unidades, inversão de relação física, confusão entre equipamentos, erro de sinal, desconsideração de condições operacionais, causa/consequência, generalização indevida), sem alternativas absurdas ou descartáveis.`,
    `5. Regras de Precisão: NÃO invente estatísticas de cobrança, NÃO invente números de provas anteriores, NÃO apresente questão gerada por você como se fosse questão oficial — rotule sempre questões geradas por você como QUESTÃO INÉDITA e questões de prova identificada como QUESTÃO REAL.`,
    `6. Responda em Português do Brasil (pt-BR), de forma clara, técnica, visual e didática.`,
  ].join('\n');
}

export type CesgranrioModuleSubTab = 'professor' | 'questoes' | 'reais' | 'pareto_pares';

export interface CesgranrioAiLaunchRequest {
  topicId?: string;
  subTab?: CesgranrioModuleSubTab;
  customContext?: string;
  timestamp: number;
}

export function findMatchingSyllabusTopicId(queryOrCode?: string): string | undefined {
  if (!queryOrCode) return undefined;
  const normalized = queryOrCode
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
  if (!normalized) return undefined;

  const exactId = EDITAL_VERTICALIZADO_DATA.find((t) => t.id.toLowerCase() === normalized);
  if (exactId) return exactId.id;

  const byCode = EDITAL_VERTICALIZADO_DATA.find((t) => {
    const c1 = (t.codigoTranspetro || '').toLowerCase();
    const c2 = (t.codigoPetrobras || '').toLowerCase();
    return (c1 && normalized.includes(c1)) || (c2 && normalized.includes(c2));
  });
  if (byCode) return byCode.id;

  const tokens = normalized
    .split(/[^a-z0-9]+/)
    .filter((tok) => tok.length >= 4);

  let bestId: string | undefined;
  let bestScore = 0;

  for (const topic of EDITAL_VERTICALIZADO_DATA) {
    const haystack = [
      topic.subtopic,
      topic.resumoEstrategico,
      ...topic.palavrasChave,
    ]
      .join(' ')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

    let score = 0;
    for (const tok of tokens) {
      if (haystack.includes(tok)) score += 1;
    }
    if (score > bestScore) {
      bestScore = score;
      bestId = topic.id;
    }
  }

  return bestScore > 0 ? bestId : undefined;
}

