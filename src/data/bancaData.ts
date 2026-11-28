import type { OrigemEdital } from '../components/ui/OriginBadge';

export interface ConfusedPair {
  id: string;
  conceptA: string;
  conceptB: string;
  discipline: string;
  origem: OrigemEdital;
  codigoRef?: string;
  difference: string;
  bancaTrap: string;
}

export interface CesgranrioReferenceProfile {
  id: 'operacao_jr' | 'dutos_terminais';
  title: string;
  provaReferencia: string;
  origem: OrigemEdital;
  composicao: string;
  distribuicao: { label: string; questoes: number }[];
  focoTecnico: string;
}

export interface CesgranrioDistractorPattern {
  id: string;
  label: string;
  description: string;
}

export const BANCA_PROFILE = {
  title: 'Raio-X da Banca: Fundação Cesgranrio',
  subtitle:
    'Como a Fundação Cesgranrio cobra os conteúdos técnicos no Sistema Petrobras e Transpetro — provas de múltipla escolha (A–E), perfis históricos e armadilhas recorrentes.',
  cesgranrioRules: [
    'Múltipla escolha com 5 alternativas (A–E) e apenas 1 correta, exigindo compreensão conceitual com aplicação prática em refinarias, terminais aquaviários, dutos e parques de tanques.',
    'Provas de 60 questões sem uso de calculadora: cálculos numéricos limpos com forte exploração de unidades de medida (4–20 mA, Stevin, Bernoulli, PV=nRT em Kelvin, estequiometria) e simplificações diretas.',
    'Distratores tecnicamente plausíveis construídos sobre erros reais de raciocínio: inversão de relações físicas, troca de unidades, erro de sinal, confusão entre equipamentos e desconsideração de condições operacionais.',
    'Cobrança precisa de normas técnicas e de segurança (NR-13, NR-20, NR-33, API/ASME, simbologia ISA-5.1), além de leitura e interpretação de gráficos, curvas de bombas, tabelas e esquemas de processo.',
  ],
  referenceProfiles: [
    {
      id: 'operacao_jr',
      title: 'Operação Júnior (Petrobras / Transpetro)',
      provaReferencia: 'Transpetro 2018 — Técnico de Operação Júnior',
      origem: 'petrobras',
      composicao: '60 questões A–E · Foco em Conhecimentos Específicos',
      distribuicao: [
        { label: 'Química', questoes: 16 },
        { label: 'Física', questoes: 11 },
        { label: 'Mecânica', questoes: 11 },
        { label: 'Demais áreas', questoes: 22 },
      ],
      focoTecnico:
        'Equilíbrio químico, estequiometria, gases, termodinâmica, mecânica dos fluidos, bombas, trocadores e segurança de processo.',
    },
    {
      id: 'dutos_terminais',
      title: 'Dutos e Terminais (Transpetro)',
      provaReferencia: 'Transpetro 2023.1 — Técnico de Dutos e Terminais',
      origem: 'transpetro',
      composicao: '60 questões A–E (20 Básicas + 40 Específicas)',
      distribuicao: [
        { label: 'Conhecimentos Básicos', questoes: 20 },
        { label: 'Conhecimentos Específicos', questoes: 40 },
      ],
      focoTecnico:
        'Instrumentação 4–20 mA, válvulas FO/FC, SIS, ISA-5.1, escoamento em dutos, cavitação/NPSH, tanques, PIG, corrosão e NRs.',
    },
  ] as CesgranrioReferenceProfile[],
  distractorPatterns: [
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
      description: 'Usa °C em vez de Kelvin em gases ideais, esquece o zero vivo de 4 mA ou mistura bar/Pa/mca.',
    },
    {
      id: 'erro_sinal',
      label: 'Erro de sinal ou convenção',
      description: 'Inverte sinal de ΔH (endo/exo), ΔU = Q − W, balanço de massa ou sentido de corrente/fluxo.',
    },
    {
      id: 'confusao_equipamentos',
      label: 'Confusão entre equipamentos',
      description: 'Troca bomba centrífuga por deslocamento positivo, termopar por Pt100 ou válvula falha-abre (FO) por falha-fecha (FC).',
    },
    {
      id: 'condicoes_operacionais',
      label: 'Desconsideração de condições operacionais',
      description: 'Ignora pressão de vapor/NPSH, regime CA vs CC em transformadores ou estado físico nas CNTP.',
    },
  ] as CesgranrioDistractorPattern[],
};

export const PARES_CONCEITUAIS_IRMAOS: ConfusedPair[] = [
  {
    id: 'pair-1',
    conceptA: 'Exatidão (Acurácia)',
    conceptB: 'Precisão (Repetibilidade)',
    discipline: 'Metrologia',
    origem: 'ambos',
    codigoRef: 'TP-01 / PB-B1.16',
    difference:
      'Exatidão é a proximidade entre o valor medido e o valor verdadeiro de referência. Precisão é a concordância/dispersão reduzida entre medições repetidas nas mesmas condições.',
    bancaTrap:
      'Um instrumento pode ser altamente preciso (várias leituras idênticas) e inexato ao mesmo tempo (todas deslocadas do valor real por falta de calibração).',
  },
  {
    id: 'pair-2',
    conceptA: 'Malha Aberta',
    conceptB: 'Malha Fechada (Feedback)',
    discipline: 'Controle de Processos',
    origem: 'ambos',
    codigoRef: 'TP-03 / PB-B3.01',
    difference:
      'Na malha aberta, a ação de controle não depende da medição da variável controlada. Na malha fechada, um sensor mede a saída e realimenta o controlador para corrigir o erro em relação ao set-point.',
    bancaTrap:
      'Afirmar que malha aberta corrige automaticamente perturbações externas no processo — apenas malha fechada compensa perturbações via feedback.',
  },
  {
    id: 'pair-3',
    conceptA: 'Bomba Centrífuga (Dinâmica)',
    conceptB: 'Bomba Alternativa (Desloc. Positivo)',
    discipline: 'Equipamentos de Processo',
    origem: 'ambos',
    codigoRef: 'TP-17 / PB-B3.03',
    difference:
      'A bomba centrífuga fornece energia cinética via rotor/impelidor (vazão varia com a pressão do sistema). A alternativa confina um volume fixo de fluido por ciclo (vazão quase constante independente da pressão).',
    bancaTrap:
      'Partir bomba centrífuga com descarga aberta (sobrecarga de motor) ou partir bomba de deslocamento positivo com descarga fechada (risco de ruptura por sobrepressão).',
  },
  {
    id: 'pair-4',
    conceptA: 'Válvula Gaveta (Bloqueio)',
    conceptB: 'Válvula Globo (Regulagem)',
    discipline: 'Tubulações & Válvulas',
    origem: 'ambos',
    codigoRef: 'TP-17 / PB-B3.03',
    difference:
      'A válvula gaveta opera totalmente aberta ou totalmente fechada com baixa perda de carga. A válvula globo é projetada para estrangulamento/controle de vazão, gerando maior perda de carga.',
    bancaTrap:
      'Trocar as aplicações: indicar válvula gaveta para controle fino de vazão ou afirmar que a válvula globo tem menor perda de carga.',
  },
  {
    id: 'pair-5',
    conceptA: 'Escoamento Laminar',
    conceptB: 'Escoamento Turbulento',
    discipline: 'Mecânica dos Fluidos',
    origem: 'ambos',
    codigoRef: 'TP-12 / PB-B3.05',
    difference:
      'No escoamento laminar (Re < 2000), as camadas de fluido deslizam ordenadamente com predominância viscosa. No turbulento (Re > 4000), predominam forças inerciais com mistura intensa e maior perda de carga.',
    bancaTrap:
      'Inverter o efeito da viscosidade no Número de Reynolds (Re = ρ·v·D/μ): maior viscosidade reduz Re e favorece regime laminar.',
  },
  {
    id: 'pair-6',
    conceptA: 'Termopar (Efeito Seebeck)',
    conceptB: 'Termoresistência (RTD / Pt100)',
    discipline: 'Instrumentação',
    origem: 'transpetro',
    codigoRef: 'TP-09',
    difference:
      'O termopar gera tensão elétrica (mV) na junção de dois metais distintos submetida a diferença de temperatura. O Pt100 varia sua resistência elétrica (100 Ω a 0 °C) com a temperatura.',
    bancaTrap:
      'Atribuir variação de resistência ôhmica ao termopar ou geração espontânea de força eletromotriz ao Pt100.',
  },
  {
    id: 'pair-7',
    conceptA: 'Válvula Falha Abre (FO / Ar para Fechar)',
    conceptB: 'Válvula Falha Fecha (FC / Ar para Abrir)',
    discipline: 'Elementos Finais de Controle',
    origem: 'transpetro',
    codigoRef: 'TP-04',
    difference:
      'Na falta de suprimento pneumático/energia, a mola leva a válvula FO para posição totalmente aberta e a FC para posição totalmente fechada, conforme a condição segura do processo.',
    bancaTrap:
      'Confundir "ar para abrir" com "falha abre": uma válvula "ar para abrir" fecha quando falta ar (portanto é Falha Fecha / FC).',
  },
  {
    id: 'pair-8',
    conceptA: 'Condução & Convecção',
    conceptB: 'Radiação Térmica',
    discipline: 'Transmissão de Calor',
    origem: 'transpetro',
    codigoRef: 'TP-13',
    difference:
      'Condução (sólidos/meios estacionários) e convecção (movimentação de fluidos) exigem meio material. A radiação ocorre por ondas eletromagnéticas e se propaga inclusive no vácuo.',
    bancaTrap:
      'Afirmar que a transferência de calor por convecção ocorre sem deslocamento de massa fluida ou no vácuo.',
  },
  {
    id: 'pair-9',
    conceptA: 'Processo Isotérmico',
    conceptB: 'Processo Adiabático',
    discipline: 'Termodinâmica',
    origem: 'ambos',
    codigoRef: 'TP-16 / PB-B1.13',
    difference:
      'No isotérmico, a temperatura é constante (ΔU = 0 para gás ideal e Q = W). No adiabático, não há troca de calor com a vizinhança (Q = 0 e ΔU = −W).',
    bancaTrap:
      'Pensar que em compressão adiabática a temperatura não muda — ao comprimir sem perder calor (Q = 0), a temperatura e a energia interna aumentam.',
  },
  {
    id: 'pair-10',
    conceptA: 'Agente Oxidante',
    conceptB: 'Agente Redutor',
    discipline: 'Oxidação-Redução',
    origem: 'ambos',
    codigoRef: 'TP-23 / PB-B1.02',
    difference:
      'O agente oxidante provoca oxidação no outro reagente e sofre redução (ganha elétrons, seu NOX diminui). O agente redutor sofre oxidação (perde elétrons, seu NOX aumenta).',
    bancaTrap:
      'Trocar "sofre oxidação" por "é oxidante": quem sofre oxidação é o agente redutor (como o ânodo de sacrifício na proteção catódica).',
  },
  {
    id: 'pair-11',
    conceptA: 'Destilação Atmosférica',
    conceptB: 'Destilação a Vácuo',
    discipline: 'Processos de Refino',
    origem: 'transpetro',
    codigoRef: 'TP-33',
    difference:
      'A atmosférica separa frações leves/médias até o resíduo atmosférico. A destilação a vácuo reduz a pressão para abaixar a temperatura de ebulição e fracionar gasóleos pesados sem craqueamento térmico.',
    bancaTrap:
      'Dizer que a destilação a vácuo aumenta o ponto de ebulição ou que é usada antes da dessalgação.',
  },
  {
    id: 'pair-12',
    conceptA: 'BPCS (Controle Básico)',
    conceptB: 'SIS (Sistema Instrumentado de Segurança)',
    discipline: 'Segurança de Processos',
    origem: 'transpetro',
    codigoRef: 'TP-06',
    difference:
      'O BPCS mantém o processo operando na faixa normal de controle. O SIS atua de forma independente para levar a planta a estado seguro (ESD) quando limites críticos são violados.',
    bancaTrap:
      'Compartilhar o mesmo sensor, lógica e válvula final entre BPCS e SIS sem análise de independência e nível SIL.',
  },
];
