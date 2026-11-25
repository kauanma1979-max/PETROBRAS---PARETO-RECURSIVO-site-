import type { OrigemEdital } from '../components/ui/OriginBadge';

export interface CutRuleItem {
  id: string;
  topic: string;
  discipline: string;
  origem: OrigemEdital;
  codigoRef?: string;
  action: 'CORTAR' | 'REDUZIR' | 'PRIORIZAR';
  reason: string;
  replacement: string;
}

export const CUT_RULES_DATA: CutRuleItem[] = [
  // PRIORIZAR (Núcleo Pareto de Máximo Retorno)
  {
    id: 'rule-p1',
    topic: 'Mecânica dos Fluidos, Hidrostática e Perda de Carga em Dutos',
    discipline: 'Mecânica & Fluidos',
    origem: 'ambos',
    codigoRef: 'TP-12 / PB-B2.07, B3.05',
    action: 'PRIORIZAR',
    reason: 'Presente tanto na Transpetro quanto em dois blocos da Petrobras. É a base conceitual direta da operação de dutos, terminais e bombas.',
    replacement: 'Dominar Stevin, Pascal, Continuidade (A·v), Bernoulli, Reynolds e fatores de perda de carga distribuída e localizada.',
  },
  {
    id: 'rule-p2',
    topic: 'Equipamentos de Processo (Bombas, Compressores, Casco/Tubo e Válvulas)',
    discipline: 'Mecânica & Equipamentos',
    origem: 'ambos',
    codigoRef: 'TP-17 / PB-B3.03',
    action: 'PRIORIZAR',
    reason: 'Altíssima incidência prática em provas de Operação e Dutos e Terminais; concentra questões situacionais de falha operacional e seleção de válvulas.',
    replacement: 'Focar em cavitação/NPSH, bombas centrífugas x alternativas, chicanas de permutadores e válvulas gaveta, globo e retenção.',
  },
  {
    id: 'rule-p3',
    topic: 'Controle de Processos, Transmissores 4–20 mA e Simbologia ISA-5.1',
    discipline: 'Instrumentação & Controle',
    origem: 'ambos',
    codigoRef: 'TP-02,03,05 / PB-B1.14, B3.01,06',
    action: 'PRIORIZAR',
    reason: 'Bloco recorrente em ambos os editais com cobrança objetiva de conversão de sinais, malha aberta x fechada e leitura de tags.',
    replacement: 'Treinar conversão linear 4–20 mA / 3–15 psi, ações P/I/D e leitura rápida de letras ISA-5.1.',
  },
  {
    id: 'rule-p4',
    topic: 'Segurança do Trabalho, Meio Ambiente e Saúde (SMS)',
    discipline: 'Química, Processos & SMS',
    origem: 'ambos',
    codigoRef: 'TP-18 / PB-B3.04',
    action: 'PRIORIZAR',
    reason: 'Tema transversal obrigatório no Sistema Petrobras; garante pontos rápidos quando o candidato domina NRs operacionais e bloqueio de energias.',
    replacement: 'Estudar NR-13, NR-20, NR-33, NR-35, Permissão de Trabalho (PT), APR, FDS e hierarquia de controles.',
  },
  {
    id: 'rule-p5',
    topic: 'Estequiometria, Gases Ideais, Operações Unitárias e Refino',
    discipline: 'Química & Processos',
    origem: 'transpetro',
    codigoRef: 'TP-21,22,32,33 / PB-B1.03, B2.09, B3.02',
    action: 'PRIORIZAR',
    reason: 'Responde pela maior parte das questões quantitativas de química e conceituais de separação e refino de petróleo.',
    replacement: 'Automatizar balanceamento, PV=nRT com temperatura em Kelvin e destilação atmosférica/vácuo.',
  },

  // REDUZIR (Estudo Objetivo Sem Aprofundamento Acadêmico Excessivo)
  {
    id: 'rule-r1',
    topic: 'Cálculo Diferencial/Integral em Mecânica dos Fluidos e Termodinâmica',
    discipline: 'Mecânica & Fluidos',
    origem: 'ambos',
    codigoRef: 'TP-12,16 / PB-B1.13',
    action: 'REDUZIR',
    reason: 'Os editais são de Nível Médio Técnico. A cobrança exige equações algébricas, interpretações físicas e proporções, não derivadas parciais ou integrais de Navier-Stokes.',
    replacement: 'Estudar apenas formas algébricas consolidadas (Stevin, Bernoulli simplificado, ΔU = Q − W, Carnot).',
  },
  {
    id: 'rule-r2',
    topic: 'Distribuição Eletrônica Avançada e Números Quânticos Complexos',
    discipline: 'Química Geral',
    origem: 'transpetro',
    codigoRef: 'TP-19',
    action: 'REDUZIR',
    reason: 'Em "Modelos atômicos e classificação periódica", a banca prioriza tendências periódicas e ligações químicas aplicadas às substâncias.',
    replacement: 'Focar em evolução dos modelos (Dalton → Bohr), família/período, eletronegatividade e polaridade.',
  },
  {
    id: 'rule-r3',
    topic: 'Dimensionamento Estrutural Completo em Resistência dos Materiais',
    discipline: 'Mecânica & Materiais',
    origem: 'transpetro',
    codigoRef: 'TP-15',
    action: 'REDUZIR',
    reason: 'Não há necessidade de traçar diagramas complexos de vigas hiperestáticas ou equações avançadas de torção de nível superior.',
    replacement: 'Dominar conceitos de tensão normal (σ = F/A), cisalhamento (τ = V/A), Lei de Hooke e zona elástica x plástica.',
  },

  // CORTAR (Fora do Escopo dos Conhecimentos Específicos Merged)
  {
    id: 'rule-c1',
    topic: 'Programação Avançada de CLP/SCADA (Ladder, SFC) e Redes Industriais Profundas',
    discipline: 'Instrumentação & Controle',
    origem: 'transpetro',
    codigoRef: 'Fora do Anexo IV',
    action: 'CORTAR',
    reason: 'O edital pede noções de controle de processos, transmissores, válvulas e SIS — não há cobrança de sintaxe de programação Ladder ou arquitetura detalhada de redes.',
    replacement: 'Direcionar o tempo para malhas de controle (aberta/fechada/PID), sinais 4–20 mA/HART e lógica de intertravamento SIS.',
  },
  {
    id: 'rule-c2',
    topic: 'Mecanismos Avançados de Síntese Orgânica e Bioquímica',
    discipline: 'Química Orgânica',
    origem: 'ambos',
    codigoRef: 'TP-25 / PB-B1.15',
    action: 'CORTAR',
    reason: 'Ambos os editais especificam expressamente apenas "hidrocarbonetos e polímeros" dentro de Química Orgânica.',
    replacement: 'Cortar funções oxigenadas/nitrogenadas complexas e bioquímica; focar em alcanos, alcenos, aromáticos e polímeros.',
  },
  {
    id: 'rule-c3',
    topic: 'Eletromagnetismo Vetorial Avançado (Equações de Maxwell Integrais)',
    discipline: 'Eletricidade & Eletromagnetismo',
    origem: 'ambos',
    codigoRef: 'TP-36 / PB-B1.12',
    action: 'CORTAR',
    reason: 'Provas técnicas de nível médio cobram aplicações diretas de Faraday-Lenz, transformadores, Leis de Ohm e potência.',
    replacement: 'Trocar formalismo vetorial por exercícios de associação de resistores, transformação de tensão e Lei de Faraday.',
  },
];
