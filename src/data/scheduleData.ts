import type { OrigemEdital } from '../components/ui/OriginBadge';

export interface SessionBlock {
  subject: string;
  topic: string;
  origem: OrigemEdital;
  codigoRef?: string;
  questionsTarget: number;
  notes: string;
}

export interface StudySession {
  id: string;
  sessionNumber: number;
  cicloNumber: number;
  title: string;
  sessionType: 'Teoria + Questões' | 'Prática Intensiva' | 'Revisão Ativa & Erros' | 'Simulado Temático';
  blockA: SessionBlock;
  blockB: SessionBlock;
}

export interface StudyCycle {
  cicloNumber: number;
  title: string;
  phase: 'Fase 1: Base & Núcleo Comum' | 'Fase 2: Aprofundamento Técnico' | 'Fase 3: Refino, Segurança & Simulados';
  focus: string;
  sessions: StudySession[];
}

export const CICLOS_ESTUDO: StudyCycle[] = [
  {
    cicloNumber: 1,
    title: 'Ciclo 1 · Fundamentos de Medição, SI & Escalas',
    phase: 'Fase 1: Base & Núcleo Comum',
    focus: 'Domínio de metrologia, unidades do SI, escalas de temperatura e propriedades da matéria.',
    sessions: [
      {
        id: 'C1-S1',
        sessionNumber: 1,
        cicloNumber: 1,
        title: 'Sessão 1 · Metrologia & Sistema Internacional (SI)',
        sessionType: 'Teoria + Questões',
        blockA: {
          subject: 'Instrumentação & Metrologia',
          topic: 'Noções de metrologia: exatidão, precisão, range, span e calibração',
          origem: 'ambos',
          codigoRef: 'TP-01 / PB-B1.16',
          questionsTarget: 20,
          notes: 'Diferenciar erro sistemático de erro aleatório e calcular alcance (span) e erro percentual.',
        },
        blockB: {
          subject: 'Instrumentação & Metrologia',
          topic: 'Sistema Internacional de Unidades (SI) e grandezas de medição',
          origem: 'transpetro',
          codigoRef: 'TP-07, TP-08',
          questionsTarget: 20,
          notes: 'Memorizar as 7 grandezas de base, unidades derivadas (Pa, N, J, W) e conversões de pressão e vazão.',
        },
      },
      {
        id: 'C1-S2',
        sessionNumber: 2,
        cicloNumber: 1,
        title: 'Sessão 2 · Escalas Térmicas & Estrutura Química',
        sessionType: 'Teoria + Questões',
        blockA: {
          subject: 'Termologia & Medição',
          topic: 'Escalas de temperatura (°C, °F, K) e variação térmica',
          origem: 'petrobras',
          codigoRef: 'PB-B2.08',
          questionsTarget: 20,
          notes: 'Treinar conversões diretas e distinguir leitura pontual de variação de temperatura (ΔT).',
        },
        blockB: {
          subject: 'Química & Processos',
          topic: 'Modelos atômicos, classificação periódica e ligações químicas',
          origem: 'transpetro',
          codigoRef: 'TP-19, TP-20',
          questionsTarget: 20,
          notes: 'Revisar eletronegatividade, ligações iônicas/covalentes e forças intermoleculares.',
        },
      },
      {
        id: 'C1-S3',
        sessionNumber: 3,
        cicloNumber: 1,
        title: 'Sessão 3 · Mecânica Geral & Leis de Newton',
        sessionType: 'Prática Intensiva',
        blockA: {
          subject: 'Mecânica & Fluidos',
          topic: 'Estática, cinemática, dinâmica e Leis de Newton',
          origem: 'ambos',
          codigoRef: 'TP-10 / PB-B1.09, PB-B2.01',
          questionsTarget: 25,
          notes: 'Resolver questões de força resultante, atrito, plano inclinado e sistemas de ação e reação.',
        },
        blockB: {
          subject: 'Mecânica & Fluidos',
          topic: 'Condições de equilíbrio e conservação da energia mecânica',
          origem: 'ambos',
          codigoRef: 'TP-11 / PB-B1.05, PB-B2.02',
          questionsTarget: 20,
          notes: 'Equilíbrio de corpo extenso (momentos) e balanço entre energia cinética e potencial.',
        },
      },
    ],
  },
  {
    cicloNumber: 2,
    title: 'Ciclo 2 · Fluidos, Hidrostática & Escoamento em Dutos',
    phase: 'Fase 1: Base & Núcleo Comum',
    focus: 'Núcleo de maior retorno para Dutos, Terminais e Operação: fluidos, hidrostática e cálculo gasoso.',
    sessions: [
      {
        id: 'C2-S1',
        sessionNumber: 4,
        cicloNumber: 2,
        title: 'Sessão 4 · Hidrostática & Propriedades dos Fluidos',
        sessionType: 'Teoria + Questões',
        blockA: {
          subject: 'Mecânica dos Fluidos',
          topic: 'Propriedades dos fluidos, massa específica, viscosidade e Stevin/Pascal',
          origem: 'ambos',
          codigoRef: 'TP-12 / PB-B2.07',
          questionsTarget: 25,
          notes: 'Calcular pressão em fundo de tanques e colunas manométricas com diferentes fluidos.',
        },
        blockB: {
          subject: 'Química & Gases',
          topic: 'Estudo dos gases (Boyle, Charles, Gay-Lussac e Clapeyron PV=nRT)',
          origem: 'ambos',
          codigoRef: 'TP-22 / PB-B2.09',
          questionsTarget: 25,
          notes: 'Aplicar temperatura absoluta em Kelvin em todos os problemas de variação de pressão e volume.',
        },
      },
      {
        id: 'C2-S2',
        sessionNumber: 5,
        cicloNumber: 2,
        title: 'Sessão 5 · Escoamento em Tubulações & Perda de Carga',
        sessionType: 'Prática Intensiva',
        blockA: {
          subject: 'Mecânica dos Fluidos',
          topic: 'Continuidade, Bernoulli, Reynolds e perda de carga em dutos',
          origem: 'ambos',
          codigoRef: 'TP-12 / PB-B3.05',
          questionsTarget: 25,
          notes: 'Identificar regime laminar x turbulento e relação inversa entre velocidade e pressão estática.',
        },
        blockB: {
          subject: 'Instrumentação & Medição',
          topic: 'Instrumentos de medição de pressão, nível, temperatura e vazão',
          origem: 'transpetro',
          codigoRef: 'TP-09',
          questionsTarget: 20,
          notes: 'Associar placa de orifício, Venturi, Coriolis, Bourdon, Pt100 e termopar ao princípio físico.',
        },
      },
      {
        id: 'C2-S3',
        sessionNumber: 6,
        cicloNumber: 2,
        title: 'Sessão 6 · Revisão Ativa de Mecânica dos Fluidos & Gases',
        sessionType: 'Revisão Ativa & Erros',
        blockA: {
          subject: 'Mecânica dos Fluidos',
          topic: 'Bateria mista de Hidrostática, Bernoulli e Perda de Carga',
          origem: 'ambos',
          codigoRef: 'TP-12 / PB-B2.07, B3.05',
          questionsTarget: 30,
          notes: 'Registrar toda armadilha de unidade (bar, kPa, mca, atm) no Caderno de Erros.',
        },
        blockB: {
          subject: 'Instrumentação',
          topic: 'Simbologia ISA-5.1 e terminologia de instrumentos',
          origem: 'ambos',
          codigoRef: 'TP-05 / PB-B1.14',
          questionsTarget: 20,
          notes: 'Treinar leitura rápida de fluxogramas P&ID (tags PT, TIC, LIC, FV, PSV).',
        },
      },
    ],
  },
  {
    cicloNumber: 3,
    title: 'Ciclo 3 · Controle de Processos, Transmissores & Válvulas',
    phase: 'Fase 2: Aprofundamento Técnico',
    focus: 'Automação industrial, sinais analógicos/digitais, válvulas de controle e sistemas instrumentados de segurança.',
    sessions: [
      {
        id: 'C3-S1',
        sessionNumber: 7,
        cicloNumber: 3,
        title: 'Sessão 7 · Malhas de Controle & Transmissores',
        sessionType: 'Teoria + Questões',
        blockA: {
          subject: 'Instrumentação & Controle',
          topic: 'Malha aberta x malha fechada e ações P, PI, PD e PID',
          origem: 'ambos',
          codigoRef: 'TP-03 / PB-B3.01',
          questionsTarget: 25,
          notes: 'Mapear sensor → transmissor → controlador → elemento final e papel de cada ação do PID.',
        },
        blockB: {
          subject: 'Instrumentação & Controle',
          topic: 'Transmissores pneumáticos (3–15 psi), 4–20 mA, HART e inteligentes',
          origem: 'ambos',
          codigoRef: 'TP-02 / PB-B3.06',
          questionsTarget: 25,
          notes: 'Praticar conversão linear de 4–20 mA para % e grandezas de processo.',
        },
      },
      {
        id: 'C3-S2',
        sessionNumber: 8,
        cicloNumber: 3,
        title: 'Sessão 8 · Elementos Finais de Controle & SIS',
        sessionType: 'Teoria + Questões',
        blockA: {
          subject: 'Instrumentação & Controle',
          topic: 'Válvulas de controle pneumáticas, hidráulicas e motorizadas',
          origem: 'transpetro',
          codigoRef: 'TP-04',
          questionsTarget: 20,
          notes: 'Dominar posição de falha segura (FO/FC), atuadores e curvas características de vazão.',
        },
        blockB: {
          subject: 'Instrumentação & Controle',
          topic: 'Sistemas Instrumentados de Segurança (SIS / SIF / SIL)',
          origem: 'transpetro',
          codigoRef: 'TP-06',
          questionsTarget: 20,
          notes: 'Diferenciar controle básico de processo (BPCS) de intertravamento de segurança (SIS).',
        },
      },
    ],
  },
  {
    cicloNumber: 4,
    title: 'Ciclo 4 · Química Geral, Estequiometria & Funções',
    phase: 'Fase 2: Aprofundamento Técnico',
    focus: 'Consolidação completa dos blocos de Química presentes na Transpetro e no Bloco I da Petrobras.',
    sessions: [
      {
        id: 'C4-S1',
        sessionNumber: 9,
        cicloNumber: 4,
        title: 'Sessão 9 · Estequiometria & Concentração de Soluções',
        sessionType: 'Prática Intensiva',
        blockA: {
          subject: 'Química Aplicada',
          topic: 'Cálculo estequiométrico, limitante, pureza e rendimento',
          origem: 'ambos',
          codigoRef: 'TP-21 / PB-B1.03',
          questionsTarget: 25,
          notes: 'Executar passo a passo: balancear → converter para mol → proporção → pureza/rendimento.',
        },
        blockB: {
          subject: 'Química Aplicada',
          topic: 'Unidades de concentração (g/L, mol/L, %, ppm) e diluição',
          origem: 'transpetro',
          codigoRef: 'TP-26',
          questionsTarget: 20,
          notes: 'Resolver questões de preparação de soluções e conversão entre ppm e porcentagem.',
        },
      },
      {
        id: 'C4-S2',
        sessionNumber: 10,
        cicloNumber: 4,
        title: 'Sessão 10 · Inorgânica, Redox, Soluções & Dispersões',
        sessionType: 'Teoria + Questões',
        blockA: {
          subject: 'Química Aplicada',
          topic: 'Ácidos, bases, sais, óxidos e reações de oxidação-redução',
          origem: 'ambos',
          codigoRef: 'TP-23, TP-24 / PB-B1.01, PB-B1.02',
          questionsTarget: 25,
          notes: 'Focar em pH, neutralização, cálculo de NOX e corrosão/proteção catódica.',
        },
        blockB: {
          subject: 'Química Aplicada',
          topic: 'Soluções aquosas, dispersões (coloides) e equilíbrio químico',
          origem: 'ambos',
          codigoRef: 'TP-27, TP-29, TP-30 / PB-B1.04,06,07',
          questionsTarget: 25,
          notes: 'Revisar Princípio de Le Chatelier, solubilidade e efeito Tyndall.',
        },
      },
    ],
  },
  {
    cicloNumber: 5,
    title: 'Ciclo 5 · Termodinâmica, Calor, Equipamentos & Refino',
    phase: 'Fase 2: Aprofundamento Técnico',
    focus: 'Integração entre termodinâmica, máquinas térmicas, trocadores, bombas, orgânica e processos de refino.',
    sessions: [
      {
        id: 'C5-S1',
        sessionNumber: 11,
        cicloNumber: 5,
        title: 'Sessão 11 · Termodinâmica, Máquinas Térmicas & Calor',
        sessionType: 'Teoria + Questões',
        blockA: {
          subject: 'Termodinâmica & Calor',
          topic: '1ª e 2ª Leis, máquinas térmicas (Carnot) e processos térmicos',
          origem: 'ambos',
          codigoRef: 'TP-14, TP-16 / PB-B1.13, B2.03, B2.04',
          questionsTarget: 25,
          notes: 'Treinar sinais de Q e W na 1ª Lei, rendimento de Carnot e calor sensível/latente.',
        },
        blockB: {
          subject: 'Termodinâmica & Calor',
          topic: 'Transmissão de calor (condução, convecção, radiação) e Termoquímica',
          origem: 'ambos',
          codigoRef: 'TP-13, TP-28 / PB-B2.05',
          questionsTarget: 20,
          notes: 'Relacionar Lei de Fourier, isolamento térmico em dutos e variação de entalpia (Lei de Hess).',
        },
      },
      {
        id: 'C5-S2',
        sessionNumber: 12,
        cicloNumber: 5,
        title: 'Sessão 12 · Equipamentos de Processo & Resistência dos Materiais',
        sessionType: 'Prática Intensiva',
        blockA: {
          subject: 'Equipamentos de Processo',
          topic: 'Bombas centrífugas/alternativas, compressores, casco/tubo e válvulas',
          origem: 'ambos',
          codigoRef: 'TP-17 / PB-B3.03',
          questionsTarget: 30,
          notes: 'Revisar NPSH, cavitação, escorva, válvulas gaveta/globo/retenção e arranjo de permutadores.',
        },
        blockB: {
          subject: 'Mecânica & Materiais',
          topic: 'Resistência dos Materiais: tensões normais, cisalhantes, flexão e torção',
          origem: 'transpetro',
          codigoRef: 'TP-15',
          questionsTarget: 20,
          notes: 'Fixar Lei de Hooke, diagrama tensão-deformação e diferença entre tração e cisalhamento.',
        },
      },
      {
        id: 'C5-S3',
        sessionNumber: 13,
        cicloNumber: 5,
        title: 'Sessão 13 · Química Orgânica, Operações Unitárias & Refino',
        sessionType: 'Teoria + Questões',
        blockA: {
          subject: 'Química & Processos',
          topic: 'Química orgânica (hidrocarbonetos e polímeros) e operações unitárias',
          origem: 'ambos',
          codigoRef: 'TP-25, TP-32 / PB-B1.15, B3.02',
          questionsTarget: 25,
          notes: 'Correlacionar cadeia carbônica com volatilidade na destilação fracionada.',
        },
        blockB: {
          subject: 'Refino & Petróleo',
          topic: 'Noções de processos de refino (atmosférica, vácuo, FCC, HDT)',
          origem: 'transpetro',
          codigoRef: 'TP-33',
          questionsTarget: 20,
          notes: 'Memorizar cortes principais do petróleo e finalidade de cada unidade de conversão/tratamento.',
        },
      },
    ],
  },
  {
    cicloNumber: 6,
    title: 'Ciclo 6 · Eletricidade, Eletromagnetismo, SMS & Revisão Final',
    phase: 'Fase 3: Refino, Segurança & Simulados',
    focus: 'Fechamento de Eletricidade/Eletrônica, revisão crítica de SMS e simulados integrados Cesgranrio + Cebraspe.',
    sessions: [
      {
        id: 'C6-S1',
        sessionNumber: 14,
        cicloNumber: 6,
        title: 'Sessão 14 · Eletrostática, Leis de Ohm & Eletrônica',
        sessionType: 'Teoria + Questões',
        blockA: {
          subject: 'Eletricidade & Eletrônica',
          topic: 'Natureza elétrica da matéria, eletrostática e cargas em movimento',
          origem: 'ambos',
          codigoRef: 'TP-31,34,35 / PB-B1.08,10,11',
          questionsTarget: 25,
          notes: 'Praticar Leis de Ohm, associação de resistores, Efeito Joule e aterramento estático.',
        },
        blockB: {
          subject: 'Eletricidade & Eletrônica',
          topic: 'Noções de eletricidade e eletrônica (Kirchhoff, diodos, portas lógicas)',
          origem: 'ambos',
          codigoRef: 'TP-38 / PB-B1.17',
          questionsTarget: 20,
          notes: 'Revisar retificação, capacitores e lógica booleana básica.',
        },
      },
      {
        id: 'C6-S2',
        sessionNumber: 15,
        cicloNumber: 6,
        title: 'Sessão 15 · Eletromagnetismo, Radiações & SMS Operacional',
        sessionType: 'Teoria + Questões',
        blockA: {
          subject: 'Eletromagnetismo & Ondas',
          topic: 'Eletromagnetismo (Faraday-Lenz, transformadores) e radiações eletromagnéticas',
          origem: 'ambos',
          codigoRef: 'TP-36, TP-37 / PB-B1.12, B2.06',
          questionsTarget: 20,
          notes: 'Aplicar v = λ·f e relação de espiras em transformadores.',
        },
        blockB: {
          subject: 'SMS & Normas',
          topic: 'Segurança do trabalho, meio ambiente e saúde (NRs, PT, APR, FDS)',
          origem: 'ambos',
          codigoRef: 'TP-18 / PB-B3.04',
          questionsTarget: 30,
          notes: 'Revisar NR-10, NR-13, NR-20, NR-33, NR-35, áreas classificadas e prevenção de incêndios.',
        },
      },
      {
        id: 'C6-S3',
        sessionNumber: 16,
        cicloNumber: 6,
        title: 'Sessão 16 · Simulado Integrado & Revisão de Caderno de Erros',
        sessionType: 'Simulado Temático',
        blockA: {
          subject: 'Simulado Interseção TP + PB',
          topic: '27 tópicos comuns (Fluidos, Equipamentos, Instrumentação, Química e SMS)',
          origem: 'ambos',
          codigoRef: 'Interseção 27 itens',
          questionsTarget: 40,
          notes: 'Simular questões no estilo múltipla escolha (Cesgranrio) e Certo/Errado (Cebraspe).',
        },
        blockB: {
          subject: 'Simulado Exclusivos TP & PB',
          topic: '15 tópicos complementares (Refino, Válvulas/SIS, SI, Newton, Escalas)',
          origem: 'transpetro',
          codigoRef: 'TP exclusivos + PB exclusivos',
          questionsTarget: 30,
          notes: 'Revisar todos os itens marcados como "Com Erros" no Edital Verticalizado.',
        },
      },
    ],
  },
];

// Alias compatível com referências existentes sem contagens de dias/datas
export const TOTAL_CICLOS_ESTUDO = CICLOS_ESTUDO.length;
export const TOTAL_SESSOES_ESTUDO = CICLOS_ESTUDO.reduce((acc, ciclo) => acc + ciclo.sessions.length, 0);
export const TOTAL_QUESTOES_PLANEJADAS = CICLOS_ESTUDO.reduce(
  (acc, ciclo) =>
    acc +
    ciclo.sessions.reduce(
      (sAcc, s) => sAcc + s.blockA.questionsTarget + s.blockB.questionsTarget,
      0
    ),
  0
);
