import type { OrigemEdital } from '../components/ui/OriginBadge';

export interface ParetoMicro {
  name: string;
  origem: OrigemEdital;
  codigoRef?: string;
  priority: 'CRÍTICA' | 'ALTA' | 'MÉDIA';
  questionCount: number;
  paretoPct: number;
  examPresence: string;
  isNucleo80: boolean;
  bancaPattern: string;
  keyTrap: string;
}

export interface ParetoMeso {
  id: string;
  name: string;
  origem: OrigemEdital;
  weightInDiscipline: number;
  questionCount: number;
  summary: string;
  micros: ParetoMicro[];
}

export interface ParetoMacro {
  id: string;
  discipline: string;
  weightPct: number;
  exactPct: number;
  questionCount: number;
  topicsCount: number;
  color: string;
  description: string;
  mesos: ParetoMeso[];
}

export const PARETO_SOURCE_STATS = {
  totalProvas: 5,
  provasLabel: 'TP 2018 · PB 2023.1 · PB 2023.2 · TP 2023.1 · ANSA 2026',
  totalQuestoesBase: 270,
  totalDentroDos42: 266,
  excluidasForaDos42: 4,
  excluidasMotivo:
    '4 questões exclusivas de Transpetro 2018 (Mancais, Engrenagens, Desenho Técnico e Lubrificação) não constam nos 42 tópicos de Transpetro 2026 + Petrobras 2023.2.',
  nucleo80CortePct: 81.2,
  nucleo80TopicosCount: 22,
};

export const PARETO_MATRIX: ParetoMacro[] = [
  {
    id: 'quimica_processos',
    discipline: 'Química, Operações Unitárias, Refino & SMS',
    weightPct: 39,
    exactPct: 38.7,
    questionCount: 103,
    topicsCount: 15,
    color: 'orange',
    description:
      'Maior bloco em incidência real (103 de 266 questões dentro dos 42 tópicos): destaque absoluto para Orgânica/Polímeros, Estequiometria, Gases, Equilíbrio, Redox, Dispersões, Operações Unitárias e SMS.',
    mesos: [
      {
        id: 'qp-funcoes-equilibrio',
        name: 'Orgânica, Equilíbrio, Redox, Dispersões & Funções Químicas',
        origem: 'ambos',
        weightInDiscipline: 57,
        questionCount: 59,
        summary:
          'Bloco mais cobrado da Química nas 5 provas: hidrocarbonetos/polímeros, Le Chatelier, oxirredução/corrosão, soluções/dispersões, ácidos/bases e estrutura atômica.',
        micros: [
          {
            name: 'Química Orgânica: hidrocarbonetos e polímeros',
            origem: 'ambos',
            codigoRef: 'TP-25 / PB-B1.15',
            priority: 'CRÍTICA',
            questionCount: 19,
            paretoPct: 7.1,
            examPresence: '5/5 provas',
            isNucleo80: true,
            bancaPattern:
              'Relaciona massa molar e ramificação de hidrocarbonetos com ponto de ebulição, classificação de alcenos/alcanos e polimerização por adição (polietileno/PTFE).',
            keyTrap:
              'Considerar hidrocarbonetos como polares/solúveis em água (são apolares e hidrofóbicos) ou errar fórmula geral de alcenos.',
          },
          {
            name: 'Transformações químicas e equilíbrio (cinética, Kc/Kp e Le Chatelier)',
            origem: 'ambos',
            codigoRef: 'TP-27 / PB-B1.04',
            priority: 'CRÍTICA',
            questionCount: 9,
            paretoPct: 3.4,
            examPresence: '4/5 provas',
            isNucleo80: true,
            bancaPattern:
              'Deslocamento de equilíbrio por pressão, temperatura ou concentração e igualdade das velocidades direta/inversa no equilíbrio.',
            keyTrap:
              'Acreditar que catalisador desloca o equilíbrio químico ou altera o ΔH (ele apenas reduz a energia de ativação igualmente nos dois sentidos).',
          },
          {
            name: 'Reações de oxidação-redução (NOX, oxidante/redutor e corrosão)',
            origem: 'ambos',
            codigoRef: 'TP-23 / PB-B1.02',
            priority: 'CRÍTICA',
            questionCount: 8,
            paretoPct: 3.0,
            examPresence: '5/5 provas',
            isNucleo80: true,
            bancaPattern:
              'Identificação de quem sofre oxidação/redução, cálculo de NOX e aplicação em corrosão e proteção catódica.',
            keyTrap:
              'Confundir agente oxidante (sofre redução, NOX diminui) com agente redutor (sofre oxidação, NOX aumenta).',
          },
          {
            name: 'Dispersões e soluções aquosas (coloides, Tyndall e solubilidade)',
            origem: 'ambos',
            codigoRef: 'TP-29,30 / PB-B1.06, B1.07',
            priority: 'ALTA',
            questionCount: 12,
            paretoPct: 4.5,
            examPresence: '3/5 provas',
            isNucleo80: true,
            bancaPattern:
              'Distinção entre solução verdadeira, coloide (efeito Tyndall) e suspensão (7q), além de curvas de solubilidade e propriedades coligativas (5q).',
            keyTrap:
              'Classificar emulsões ou aerossóis como soluções verdadeiras homogêneas (são sistemas coloidais heterogêneos).',
          },
          {
            name: 'Química Inorgânica (ácidos, bases, sais e óxidos)',
            origem: 'ambos',
            codigoRef: 'TP-24 / PB-B1.01',
            priority: 'ALTA',
            questionCount: 5,
            paretoPct: 1.9,
            examPresence: '4/5 provas',
            isNucleo80: true,
            bancaPattern:
              'Teorias de Arrhenius e Brønsted-Lowry, neutralização ácido-base em razão molar e classificação de óxidos.',
            keyTrap:
              'Confundir ácido de Brønsted-Lowry (doador de H⁺) com base conjugada ou errar estequiometria da neutralização.',
          },
          {
            name: 'Modelos atômicos, classificação periódica e ligações químicas',
            origem: 'transpetro',
            codigoRef: 'TP-19,20',
            priority: 'MÉDIA',
            questionCount: 6,
            paretoPct: 2.3,
            examPresence: '2/5 provas',
            isNucleo80: false,
            bancaPattern:
              'Cobrança concentrada nos editais Transpetro: evolução Rutherford-Bohr, configuração eletrônica, eletronegatividade e polaridade de ligações.',
            keyTrap:
              'Confundir eletronegatividade com afinidade eletrônica ou polaridade de ligação com polaridade resultante da molécula.',
          },
        ],
      },
      {
        id: 'qp-calculos-gases',
        name: 'Estequiometria, Gases, Termoquímica & Concentração',
        origem: 'ambos',
        weightInDiscipline: 30,
        questionCount: 31,
        summary:
          'Núcleo quantitativo presente nas 5 provas: cálculos estequiométricos, leis dos gases ideais, variação de entalpia e unidades de concentração.',
        micros: [
          {
            name: 'Cálculo estequiométrico (mol, massa molar, limitante e rendimento)',
            origem: 'ambos',
            codigoRef: 'TP-21 / PB-B1.03',
            priority: 'CRÍTICA',
            questionCount: 12,
            paretoPct: 4.5,
            examPresence: '5/5 provas',
            isNucleo80: true,
            bancaPattern:
              'Balanceamento de reação, cálculo direto de massa de reagente/produto, pureza e rendimento percentual inferior a 100%.',
            keyTrap:
              'Montar regra de três diretamente em gramas sem converter para mol ou usar equação química ainda não balanceada.',
          },
          {
            name: 'Estudo dos gases (Clapeyron PV=nRT e transformações)',
            origem: 'ambos',
            codigoRef: 'TP-22 / PB-B2.09',
            priority: 'CRÍTICA',
            questionCount: 10,
            paretoPct: 3.8,
            examPresence: '5/5 provas',
            isNucleo80: true,
            bancaPattern:
              'Transformações isotérmica, isobárica e isocórica, Lei Geral dos Gases, CNTP e pressões parciais em misturas gasosas.',
            keyTrap:
              'Substituir temperatura em °C nas equações de gases em vez de converter obrigatoriamente para Kelvin (K = °C + 273).',
          },
          {
            name: 'Termoquímica (Entalpia, Lei de Hess e combustão)',
            origem: 'ambos',
            codigoRef: 'TP-28 / PB-B2.05',
            priority: 'CRÍTICA',
            questionCount: 6,
            paretoPct: 2.3,
            examPresence: '4/5 provas',
            isNucleo80: true,
            bancaPattern:
              'Sinal de ΔH em combustão/reações exotérmicas e cálculo de energia liberada por massa ou mol de combustível.',
            keyTrap:
              'Inverter equação termoquímica na Lei de Hess esquecendo de inverter o sinal de ΔH ou multiplicar pelo coeficiente.',
          },
          {
            name: 'Unidades de concentração (g/L, mol/L, %, ppm e diluição)',
            origem: 'transpetro',
            codigoRef: 'TP-26',
            priority: 'MÉDIA',
            questionCount: 3,
            paretoPct: 1.1,
            examPresence: '2/5 provas',
            isNucleo80: false,
            bancaPattern:
              'Concentração molar de íons em solução, conversão g/L ↔ mol/L e aplicação de C1·V1 = C2·V2.',
            keyTrap:
              'Esquecer o fator estequiométrico de dissociação iônica ao calcular molaridade de íons (ex.: CaCl₂ gera 2 Cl⁻).',
          },
        ],
      },
      {
        id: 'qp-processos-sms',
        name: 'Operações Unitárias, SMS & Processos de Refino',
        origem: 'ambos',
        weightInDiscipline: 13,
        questionCount: 13,
        summary:
          'Aplicação industrial direta: destilação, sedimentação, absorção, normas de segurança operacional (NRs, APR, PT) e refino (TP-33).',
        micros: [
          {
            name: 'Operações unitárias (destilação, sedimentação, absorção, filtração)',
            origem: 'ambos',
            codigoRef: 'TP-32 / PB-B3.02',
            priority: 'ALTA',
            questionCount: 7,
            paretoPct: 2.6,
            examPresence: '3/5 provas',
            isNucleo80: true,
            bancaPattern:
              'Associação entre método de separação e propriedade física (ponto de ebulição na destilação, densidade na sedimentação gravítica).',
            keyTrap:
              'Confundir destilação fracionada (líquidos miscíveis) com decantação/sedimentação (fases imiscíveis).',
          },
          {
            name: 'Segurança do trabalho, meio ambiente e saúde (SMS)',
            origem: 'ambos',
            codigoRef: 'TP-18 / PB-B3.04',
            priority: 'ALTA',
            questionCount: 6,
            paretoPct: 2.3,
            examPresence: '3/5 provas',
            isNucleo80: true,
            bancaPattern:
              'Atmosferas explosivas (triângulo do fogo), NR-13, NR-20, NR-33, NR-35, Permissão de Trabalho (PT), APR e FDS/FISPQ.',
            keyTrap:
              'Priorizar EPI antes de controle na fonte/EPC ou liberar serviço em espaço confinado sem PET e medição contínua.',
          },
          {
            name: 'Noções de processos de refino (atmosférica, vácuo, FCC, HDT)',
            origem: 'transpetro',
            codigoRef: 'TP-33',
            priority: 'MÉDIA',
            questionCount: 0,
            paretoPct: 0.0,
            examPresence: '0/5 provas (edital TP-33)',
            isNucleo80: false,
            bancaPattern:
              'Embora sem questão isolada nas 5 provas mapeadas, integra o programa Transpetro 2026: cortes de destilação e função do vácuo/FCC/HDT.',
            keyTrap:
              'Inverter a saída das frações leves (GLP/nafta no topo) e pesadas (gasóleo/resíduo no fundo) na torre atmosférica.',
          },
        ],
      },
    ],
  },
  {
    id: 'mecanica_fluidos',
    discipline: 'Mecânica, Fluidos, Termodinâmica & Equipamentos',
    weightPct: 35,
    exactPct: 35.3,
    questionCount: 94,
    topicsCount: 11,
    color: 'emerald',
    description:
      'Segundo maior bloco (94 de 266 questões dentro dos 42 tópicos): lidera no topo individual com Equipamentos/Bombas/Tubulações (21q), Mecânica Geral (17q) e Fluidos (13q).',
    mesos: [
      {
        id: 'mf-fluidos-equip',
        name: 'Equipamentos de Processo & Mecânica dos Fluidos',
        origem: 'ambos',
        weightInDiscipline: 36,
        questionCount: 34,
        summary:
          'Altíssima frequência (5/5 provas): bombas centrífugas e alternativas, cavitação, permutadores, tubulações, válvulas, Stevin, Bernoulli e perda de carga.',
        micros: [
          {
            name: 'Equipamentos: bombas, compressores, permutadores, tubulações e válvulas',
            origem: 'ambos',
            codigoRef: 'TP-17 / PB-B3.03',
            priority: 'CRÍTICA',
            questionCount: 21,
            paretoPct: 7.9,
            examPresence: '5/5 provas',
            isNucleo80: true,
            bancaPattern:
              'Tópico #1 isolado da base: cavitação/NPSH, funcionamento do impelidor, bombas de deslocamento positivo, permutadores casco/tubo e válvulas.',
            keyTrap:
              'Partir bomba centrífuga com descarga aberta ou bomba positiva com descarga fechada; usar válvula gaveta para regulagem.',
          },
          {
            name: 'Mecânica dos Fluidos: hidrostática, Bernoulli e perda de carga',
            origem: 'ambos',
            codigoRef: 'TP-12 / PB-B2.07, B3.05',
            priority: 'CRÍTICA',
            questionCount: 13,
            paretoPct: 4.9,
            examPresence: '5/5 provas',
            isNucleo80: true,
            bancaPattern:
              'Pressão hidrostática P = Patm + ρgh, vasos comunicantes, Continuidade (A1·v1 = A2·v2), Bernoulli e perda de carga em dutos.',
            keyTrap:
              'Dizer que maior velocidade em estreitamento (Venturi) aumenta a pressão estática (ela diminui por Bernoulli).',
          },
        ],
      },
      {
        id: 'mf-mecanica-resmat',
        name: 'Mecânica Geral, Equilíbrio, Energia & Resistência dos Materiais',
        origem: 'ambos',
        weightInDiscipline: 36,
        questionCount: 34,
        summary:
          'Peso equivalente a Fluidos/Equipamentos na base (34q): estática, cinemática, dinâmica, momentos, conservação de energia mecânica e tensões.',
        micros: [
          {
            name: 'Mecânica Geral: estática, cinemática e dinâmica',
            origem: 'ambos',
            codigoRef: 'TP-10 / PB-B2.01',
            priority: 'CRÍTICA',
            questionCount: 17,
            paretoPct: 6.4,
            examPresence: '5/5 provas',
            isNucleo80: true,
            bancaPattern:
              'Diagrama de corpo livre, torque/momento em válvulas e alavancas, atrito estático, queda livre, impulso e quantidade de movimento.',
            keyTrap:
              'Esquecer decomposição vetorial em planos inclinados/polias ou confundir força de atrito estático máximo com dinâmico.',
          },
          {
            name: 'Condições de Equilíbrio e Leis de Newton',
            origem: 'petrobras',
            codigoRef: 'PB-B1.05, B1.09',
            priority: 'ALTA',
            questionCount: 8,
            paretoPct: 3.0,
            examPresence: '3/5 provas',
            isNucleo80: true,
            bancaPattern:
              'Somatório de forças e momentos (6q em Equilíbrio) e aplicação das 3 Leis de Newton (2q) em polias, cabos e estruturas.',
            keyTrap:
              'Achar que forças de ação e reação se anulam (atuam em corpos distintos).',
          },
          {
            name: 'Conservação da energia mecânica',
            origem: 'ambos',
            codigoRef: 'TP-11 / PB-B2.02',
            priority: 'ALTA',
            questionCount: 5,
            paretoPct: 1.9,
            examPresence: '3/5 provas',
            isNucleo80: false,
            bancaPattern:
              'Trabalho de forças conservativas, energia cinética, potencial gravitacional e elástica em sistemas sem ou com atrito.',
            keyTrap:
              'Aplicar conservação de energia mecânica total quando há força dissipativa realizando trabalho.',
          },
          {
            name: 'Resistência dos Materiais: tensões normais, cisalhantes e flexão',
            origem: 'transpetro',
            codigoRef: 'TP-15',
            priority: 'MÉDIA',
            questionCount: 4,
            paretoPct: 1.5,
            examPresence: '2/5 provas',
            isNucleo80: false,
            bancaPattern:
              'Diagrama tensão-deformação (regime elástico x plástico), tensão normal (σ = F/A), cisalhamento e torção.',
            keyTrap:
              'Confundir limite de escoamento (início da deformação permanente) com limite de ruptura ou módulo de elasticidade.',
          },
        ],
      },
      {
        id: 'mf-termo-calor',
        name: 'Termodinâmica, Máquinas Térmicas & Transmissão de Calor',
        origem: 'ambos',
        weightInDiscipline: 28,
        questionCount: 26,
        summary:
          '26 questões bem distribuídas: 1ª e 2ª Leis, Carnot, condução/convecção/radiação e calorimetria com mudança de fase.',
        micros: [
          {
            name: 'Termodinâmica Básica (1ª e 2ª Leis e entropia)',
            origem: 'ambos',
            codigoRef: 'TP-16 / PB-B1.13',
            priority: 'CRÍTICA',
            questionCount: 8,
            paretoPct: 3.0,
            examPresence: '5/5 provas',
            isNucleo80: true,
            bancaPattern:
              'Presente nas 5 provas: ΔU = Q − W, transformações isotérmica/adiabática, entropia e irreversibilidade térmica.',
            keyTrap:
              'Errar convenção de sinais de calor e trabalho na 1ª Lei ou assumir ΔU = 0 fora de transformação isotérmica.',
          },
          {
            name: 'Máquinas térmicas e processos naturais (Carnot e refrigeradores)',
            origem: 'ambos',
            codigoRef: 'TP-14 / PB-B2.04',
            priority: 'ALTA',
            questionCount: 7,
            paretoPct: 2.6,
            examPresence: '3/5 provas',
            isNucleo80: true,
            bancaPattern:
              'Cálculo do rendimento máximo η = 1 − Tf/Tq e comparação entre máquina real e ciclo reversível de Carnot.',
            keyTrap:
              'Calcular rendimento de Carnot usando temperaturas em °C em vez de Kelvin (K).',
          },
          {
            name: 'Transmissão de Calor (condução, convecção e radiação)',
            origem: 'transpetro',
            codigoRef: 'TP-13',
            priority: 'ALTA',
            questionCount: 6,
            paretoPct: 2.3,
            examPresence: '3/5 provas',
            isNucleo80: true,
            bancaPattern:
              'Condução em paredes multicamadas, convecção na condensação/resfriamento e radiação no vácuo (Lei de Stefan-Boltzmann).',
            keyTrap:
              'Afirmar que convecção ocorre no vácuo ou em sólidos (depende de movimentação de fluido).',
          },
          {
            name: 'Propriedades e processos térmicos (calor sensível, latente e dilatação)',
            origem: 'petrobras',
            codigoRef: 'PB-B2.03',
            priority: 'ALTA',
            questionCount: 5,
            paretoPct: 1.9,
            examPresence: '3/5 provas',
            isNucleo80: false,
            bancaPattern:
              'Balanço de energia no aquecimento e vaporização da água (patamar isotérmico de mudança de fase) e dilatação.',
            keyTrap:
              'Usar Q = m·c·ΔT durante mudança de estado físico em vez de Q = m·L.',
          },
        ],
      },
    ],
  },
  {
    id: 'instrumentacao',
    discipline: 'Instrumentação, Metrologia & Controle',
    weightPct: 17,
    exactPct: 16.9,
    questionCount: 45,
    topicsCount: 10,
    color: 'gold',
    description:
      'Presença constante em todas as provas (45 de 266 questões dentro dos 42 tópicos), com forte concentração em Metrologia, Escalas Térmicas, Controle PID e Transmissores 4–20 mA.',
    mesos: [
      {
        id: 'in-metrologia-medicao',
        name: 'Metrologia, Escalas Térmicas, Sensores & SI',
        origem: 'ambos',
        weightInDiscipline: 60,
        questionCount: 27,
        summary:
          'Responde por 60% do bloco: exatidão/precisão/paquímetro, escalas Celsius/Fahrenheit/Kelvin, sensores de P/T/N/Q e Sistema Internacional.',
        micros: [
          {
            name: 'Noções de metrologia (exatidão, precisão, histerese, paquímetro)',
            origem: 'ambos',
            codigoRef: 'TP-01 / PB-B1.16',
            priority: 'CRÍTICA',
            questionCount: 11,
            paretoPct: 4.1,
            examPresence: '5/5 provas',
            isNucleo80: true,
            bancaPattern:
              'Presente nas 5 provas: diferença entre exatidão e precisão, limite de erro, leitura com paquímetro e características estáticas.',
            keyTrap:
              'Tratar precisão (repetibilidade entre leituras) como sinônimo de exatidão (proximidade ao valor verdadeiro).',
          },
          {
            name: 'Escalas de temperatura (°C, °F e K)',
            origem: 'petrobras',
            codigoRef: 'PB-B2.08',
            priority: 'CRÍTICA',
            questionCount: 9,
            paretoPct: 3.4,
            examPresence: '3/5 provas',
            isNucleo80: true,
            bancaPattern:
              'Conversão entre °C, °F e K, significado do zero absoluto na escala Kelvin e comparação entre variações ΔT.',
            keyTrap:
              'Somar 273 quando o enunciado pede variação de temperatura (Δ°C = ΔK).',
          },
          {
            name: 'Instrumentos e grandezas de medição (P, T, N, Q) e SI',
            origem: 'transpetro',
            codigoRef: 'TP-07,08,09',
            priority: 'ALTA',
            questionCount: 7,
            paretoPct: 2.6,
            examPresence: '2/5 provas',
            isNucleo80: true,
            bancaPattern:
              'Sensores industriais (5q: Bourdon, Pt100, termopar, rotâmetro, Coriolis, bimetálico) + unidades de pressão/SI (2q).',
            keyTrap:
              'Confundir termopar (tensão mV via efeito Seebeck) com RTD/Pt100 (variação de resistência elétrica).',
          },
        ],
      },
      {
        id: 'in-controle-transmissao',
        name: 'Controle de Processos (PID), Transmissores, ISA-5.1 & SIS',
        origem: 'ambos',
        weightInDiscipline: 40,
        questionCount: 18,
        summary:
          'Responde por 40% do bloco: malha fechada/PID/feedforward, transmissores 4–20 mA, tags ISA-5.1, válvulas de controle e SIS.',
        micros: [
          {
            name: 'Controle de processos: malha aberta x fechada, PID e feedforward',
            origem: 'ambos',
            codigoRef: 'TP-03 / PB-B3.01',
            priority: 'CRÍTICA',
            questionCount: 8,
            paretoPct: 3.0,
            examPresence: '4/5 provas',
            isNucleo80: true,
            bancaPattern:
              'Realimentação negativa, função da ação integral (zerar erro estacionário/offset) e estratégia feedforward antecipatória.',
            keyTrap:
              'Confundir variável controlada (medida pelo sensor) com variável manipulada (atuada pela válvula).',
          },
          {
            name: 'Transmissão e transmissores (4–20 mA, 3–15 psi, HART/pneumáticos)',
            origem: 'ambos',
            codigoRef: 'TP-02 / PB-B3.06',
            priority: 'CRÍTICA',
            questionCount: 6,
            paretoPct: 2.3,
            examPresence: '5/5 provas',
            isNucleo80: true,
            bancaPattern:
              'Presente nas 5 provas: cálculo linear 4–20 mA com zero vivo, qualidade do ar em sistemas pneumáticos e protocolos digitais.',
            keyTrap:
              'Calcular % usando base 20 mA em vez de descontar 4 mA e dividir pelo span de 16 mA.',
          },
          {
            name: 'Simbologia ISA-5.1, Válvulas de controle e SIS',
            origem: 'ambos',
            codigoRef: 'TP-04,05,06 / PB-B1.14',
            priority: 'MÉDIA',
            questionCount: 4,
            paretoPct: 1.5,
            examPresence: '3/5 provas',
            isNucleo80: false,
            bancaPattern:
              'Leitura de tags ISA-5.1 (2q), atuação de válvula de controle (1q) e camadas independentes/SIL no SIS (1q).',
            keyTrap:
              'Confundir 1ª letra do tag (variável medida) com função de saída ou misturar BPCS com SIS.',
          },
        ],
      },
    ],
  },
  {
    id: 'eletricidade',
    discipline: 'Eletricidade, Eletromagnetismo & Eletrônica',
    weightPct: 9,
    exactPct: 9.0,
    questionCount: 24,
    topicsCount: 6,
    color: 'sky',
    description:
      'Menor peso percentual global (24 de 266 questões dentro dos 42 tópicos), mas com pontos garantidos em Eletrostática (5/5 provas) e Radiações Eletromagnéticas (4/5 provas).',
    mesos: [
      {
        id: 'el-circuitos-eletro',
        name: 'Eletrostática, Natureza Elétrica, Circuitos & Eletrônica',
        origem: 'ambos',
        weightInDiscipline: 62,
        questionCount: 15,
        summary:
          'Eletrostática responde sozinha por 10 das 15 questões deste grupo (presente em todas as 5 provas), seguida de circuitos/capacitores e leis de Ohm.',
        micros: [
          {
            name: 'Eletrostática (Coulomb, campo elétrico, potencial e aterramento)',
            origem: 'ambos',
            codigoRef: 'TP-34 / PB-B1.10',
            priority: 'CRÍTICA',
            questionCount: 10,
            paretoPct: 3.8,
            examPresence: '5/5 provas',
            isNucleo80: true,
            bancaPattern:
              'Presente nas 5 provas: Lei de Coulomb, superfícies equipotenciais, energia potencial elétrica e aterramento eletrostático.',
            keyTrap:
              'Esquecer que a força elétrica varia com o inverso do quadrado da distância (1/d²) ou que ddp nula não move carga.',
          },
          {
            name: 'Natureza elétrica, Leis de Ohm e Noções de Eletrônica',
            origem: 'ambos',
            codigoRef: 'TP-31,35,38 / PB-B1.08, B1.11, B1.17',
            priority: 'MÉDIA',
            questionCount: 5,
            paretoPct: 1.9,
            examPresence: '3/5 provas',
            isNucleo80: false,
            bancaPattern:
              'Associação série-paralelo de resistores e capacitores, 2ª Lei de Ohm (R = ρ·L/A) e propriedades elétricas da matéria.',
            keyTrap:
              'Inverter a fórmula equivalente de resistores em paralelo com a de capacitores em paralelo.',
          },
        ],
      },
      {
        id: 'el-mag-radiacoes',
        name: 'Radiações Eletromagnéticas & Eletromagnetismo',
        origem: 'ambos',
        weightInDiscipline: 38,
        questionCount: 9,
        summary:
          'Ondas eletromagnéticas, espectro/efeito fotoelétrico (5q em 4/5 provas) e força magnética sobre cargas/condutores (4q).',
        micros: [
          {
            name: 'Radiações eletromagnéticas (espectro, v = λ·f e efeito fotoelétrico)',
            origem: 'ambos',
            codigoRef: 'TP-37 / PB-B2.06',
            priority: 'ALTA',
            questionCount: 5,
            paretoPct: 1.9,
            examPresence: '4/5 provas',
            isNucleo80: false,
            bancaPattern:
              'Natureza transversal das ondas eletromagnéticas, relação comprimento de onda/frequência/cor e efeito fotoelétrico.',
            keyTrap:
              'Confundir ondas eletromagnéticas (transversais, propagam no vácuo) com ondas sonoras (mecânicas/longitudinais).',
          },
          {
            name: 'Eletromagnetismo (campo magnético, força de Lorentz e indução)',
            origem: 'ambos',
            codigoRef: 'TP-36 / PB-B1.12',
            priority: 'MÉDIA',
            questionCount: 4,
            paretoPct: 1.5,
            examPresence: '3/5 provas',
            isNucleo80: false,
            bancaPattern:
              'Trajetória e força magnética em carga/condutor em movimento e campo magnético em fio retilíneo.',
            keyTrap:
              'Dizer que campo magnético realiza trabalho sobre carga livre (a força magnética é perpendicular à velocidade) ou usar transformador em CC.',
          },
        ],
      },
    ],
  },
];
