import type { OrigemEdital } from '../components/ui/OriginBadge';

export interface SecaoMaterial {
  id: string;
  titulo: string;
  badge?: string;
  origem: OrigemEdital;
  codigoRef?: string;
  conteudoMarkdown: string;
  tabelaDestaque?: {
    colunas: string[];
    linhas: string[][];
  };
  formulas?: {
    nome: string;
    formula: string;
    variaveis: { simbolo: string; significado: string }[];
  }[];
  pontosDeProva: string[];
}

export interface ModuloMaterial {
  id: string;
  titulo: string;
  subtitulo: string;
  cor: string;
  secoes: SecaoMaterial[];
}

export const MATERIAL_ESTUDOS: ModuloMaterial[] = [
  // =========================================================================
  // MÓDULO 1: INSTRUMENTAÇÃO, METROLOGIA & CONTROLE DE PROCESSOS
  // =========================================================================
  {
    id: 'instrumentacao',
    titulo: 'Instrumentação, Metrologia & Controle',
    subtitulo:
      'Metrologia, Sistema Internacional (SI), escalas de temperatura, transmissores, simbologia ISA-5.1, malhas de controle, válvulas e SIS.',
    cor: 'emerald',
    secoes: [
      {
        id: 'sec-metrologia-si',
        titulo: '1.1 Metrologia, Sistema Internacional (SI) e Escalas de Temperatura',
        badge: 'Base de Medição',
        origem: 'ambos',
        codigoRef: 'TP-01, TP-07, TP-08 / PB-B1.16, PB-B2.08',
        conteudoMarkdown: `• **Metrologia (Transpetro + Petrobras):**
  - **Exatidão:** Grau de concordância entre o resultado de uma medição e o valor verdadeiro convencional (vício/tendência pequena).
  - **Precisão:** Grau de concordância entre medições repetidas nas mesmas condições (baixa dispersão / alta repetibilidade).
  - **Range (Faixa de Medida):** Conjunto de valores do limite inferior (LRV) ao limite superior (URV). Ex.: 0 a 200 °C.
  - **Span (Alcance):** Diferença algébrica entre os limites da faixa: Span = URV − LRV.
  - **Histerese:** Diferença máxima entre indicações para um mesmo valor medido quando percorrido em sentido crescente e decrescente.
  - **Erro Sistemático x Aleatório:** Sistemático é previsível e corrigível por calibração; aleatório decorre de flutuações imprevisíveis.

• **Sistema Internacional de Unidades — SI (Exclusivo Transpetro · TP-08):**
  - **7 Grandezas de Base:** Comprimento (m), Massa (kg), Tempo (s), Corrente elétrica (A), Temperatura termodinâmica (K), Quantidade de matéria (mol) e Intensidade luminosa (cd).
  - **Unidades Derivadas Essenciais:** Força = Newton (N = kg·m/s²), Pressão = Pascal (Pa = N/m²), Energia/Trabalho = Joule (J = N·m), Potência = Watt (W = J/s).
  - **Pressão e Densidade (TP-07):** P_abs = P_man + P_atm. Vácuo ocorre quando P_abs < P_atm. Densidade absoluta ρ = m/V (kg/m³).

• **Escalas de Temperatura (Exclusivo Petrobras · PB-B2.08):**
  - Pontos fixos da água a 1 atm: Fusão (0 °C / 32 °F / 273,15 K) e Ebulição (100 °C / 212 °F / 373,15 K).
  - Para **variações** térmicas: ΔT(°C) = ΔT(K) e ΔT(°F) = 1,8 · ΔT(°C).`,
        tabelaDestaque: {
          colunas: ['Grandeza', 'Unidade SI', 'Conversões Práticas de Campo', 'Observação de Prova'],
          linhas: [
            ['Pressão', 'Pascal (Pa)', '1 atm ≈ 101,3 kPa ≈ 1,013 bar ≈ 14,7 psi ≈ 10,33 mca', 'P_abs = P_man + P_atm'],
            ['Temperatura', 'Kelvin (K)', 'K = °C + 273,15 | °C/5 = (°F − 32)/9', 'Usar sempre Kelvin em gases e Carnot'],
            ['Vazão Volumétrica', 'm³/s', '1 m³/h = 1000 L/h ≈ 16,67 L/min', 'Q = A · v (Equação da Continuidade)'],
            ['Massa Específica', 'kg/m³', 'Água ≈ 1000 kg/m³ = 1 g/cm³ = 1 kg/L', 'Grau API maior → óleo mais leve'],
          ],
        },
        formulas: [
          {
            nome: 'Conversão de Escalas de Temperatura',
            formula: 'T_K = T_C + 273,15   |   T_F = 1,8 · T_C + 32',
            variaveis: [
              { simbolo: 'T_C', significado: 'Temperatura em graus Celsius (°C)' },
              { simbolo: 'T_F', significado: 'Temperatura em graus Fahrenheit (°F)' },
              { simbolo: 'T_K', significado: 'Temperatura absoluta em Kelvin (K)' },
            ],
          },
        ],
        pontosDeProva: [
          'Cuidado clássico: um instrumento pode ser muito preciso (baixa dispersão) e não ser exato (descalibrado).',
          'Em variação de temperatura (ΔT), não some 273 para converter Celsius para Kelvin: ΔT(°C) = ΔT(K).',
          'Pressão manométrica negativa indica pressão abaixo da atmosférica (vácuo relativo).',
        ],
      },
      {
        id: 'sec-transmissores-controle',
        titulo: '1.2 Transmissores, Controle de Processos & Simbologia ISA-5.1',
        badge: 'Alta Incidência',
        origem: 'ambos',
        codigoRef: 'TP-02, TP-03, TP-05 / PB-B1.14, PB-B3.01, PB-B3.06',
        conteudoMarkdown: `• **Transmissão e Transmissores (Transpetro + Petrobras):**
  - **Sinal Pneumático:** 3 a 15 psi (ou 0,2 a 1,0 kgf/cm²). Imune a faíscas (áreas classificadas), porém sujeito a atraso em longas distâncias.
  - **Sinal Eletrônico Analógico:** **4 a 20 mA** em corrente contínua. Possui **zero vivo** em 4 mA: se o sinal cair para 0 mA, identifica-se ruptura de cabo ou falha de alimentação (diferente de 0% de medição).
  - **Transmissores Digitais e Inteligentes:** Protocolo **HART** (modula sinal digital FSK sobre o loop analógico de 4–20 mA), Foundation Fieldbus e Profibus PA (comunicação bidirecional e autodiagnóstico).

• **Controle de Processos (Transpetro + Petrobras):**
  - **Malha Aberta:** Sem realimentação (feedback); não corrige perturbações automaticamente (ex.: aquecimento por temporizador).
  - **Malha Fechada:** Possui sensor medindo a **Variável Controlada (PV)**, comparada ao **Set-Point (SP)**. O erro (e = SP − PV) aciona o controlador, que ajusta a **Variável Manipulada (MV)** via elemento final.
  - **Ações PID:** **Proporcional (P)** gera resposta imediata (deixa erro de offset); **Integral (I)** elimina o erro de regime permanente (offset); **Derivativa (D)** antecipa variações bruscas reduzindo oscilações.

• **Terminologia e Simbologia ISA-5.1 (Transpetro + Petrobras):**
  - 1ª letra = variável medida (**P** Pressão, **T** Temperatura, **L** Nível, **F** Vazão, **A** Análise).
  - Letras subsequentes = função (**I** Indicador, **R** Registrador, **C** Controlador, **T** Transmissor, **V** Válvula, **S** Chave/Segurança).`,
        tabelaDestaque: {
          colunas: ['% da Faixa (Span)', 'Sinal 4–20 mA', 'Sinal 3–15 psi', 'Significado Operacional'],
          linhas: [
            ['0% (LRV)', '4 mA', '3 psi', 'Início da faixa medida (Zero Vivo)'],
            ['25%', '8 mA', '6 psi', 'Um quarto do alcance (Span)'],
            ['50%', '12 mA', '9 psi', 'Meio de escala (ponto médio)'],
            ['75%', '16 mA', '12 psi', 'Três quartos do alcance'],
            ['100% (URV)', '20 mA', '15 psi', 'Limite superior da faixa'],
          ],
        },
        pontosDeProva: [
          'Para converter corrente I (em mA) para porcentagem: % = ((I − 4) / 16) × 100.',
          'Em simbologia ISA-5.1, PSV indica Válvula de Segurança de Pressão; TIC indica Controlador Indicador de Temperatura.',
          'A ação Integral (I) é a única que elimina completamente o erro estacionário (offset).',
        ],
      },
      {
        id: 'sec-instrumentos-valvulas-sis',
        titulo: '1.3 Instrumentos de Campo, Válvulas de Controle e SIS',
        badge: 'Exclusivo Transpetro',
        origem: 'transpetro',
        codigoRef: 'TP-04, TP-06, TP-09',
        conteudoMarkdown: `• **Instrumentos de Medição (TP-09):**
  - **Pressão:** Tubo de Bourdon (elástico em C/espiral), diafragma, fole e célula capacitiva/piezorresistiva.
  - **Temperatura:** Termopar (efeito Seebeck — gera mV entre dois metais distintos), Termoresistência **Pt100** (varia resistência com T; 100 Ω a 0 °C), termistor e pirômetro óptico (sem contato).
  - **Nível:** Visor de nível, boia, deslocador (princípio de Arquimedes), pressão diferencial (DP cell) e radar/ultrassônico (sem contato).
  - **Vazão:** Placa de orifício e tubo Venturi (pressão diferencial, ΔP ∝ Q²), rotâmetro (área variável), turbina, eletromagnético (fluidos condutivos) e **Coriolis** (mede vazão mássica diretamente).

• **Elementos Finais de Controle — Válvulas (TP-04):**
  - Atuadores **pneumáticos** (mais comuns em áreas classificadas, rápidos e seguros por mola), **hidráulicos** (altos esforços) e **motorizados/elétricos** (acionamento lento, bloqueio remoto).
  - **Posição de Falha Segura:** **Falha Abre (FO / Ar para Fechar)** vs **Falha Fecha (FC / Ar para Abrir)**, definida pela segurança do processo quando falta ar ou energia.

• **Sistemas Instrumentados de Segurança — SIS (TP-06):**
  - Camada independente do sistema básico de controle (**BPCS**). Executa Funções Instrumentadas de Segurança (**SIF**) com Nível de Integridade de Segurança (**SIL 1 a 4**) para levar o processo a estado seguro (ESD — Emergency Shutdown).`,
        pontosDeProva: [
          'Medidor Coriolis mede vazão mássica diretamente; placa de orifício e Venturi medem por pressão diferencial (ΔP).',
          'Medidor eletromagnético exige fluido eletricamente condutivo (não serve para hidrocarbonetos puros isolantes).',
          'Válvula "Ar para Abrir" significa que na falta de ar a mola fecha a válvula → Falha Fecha (FC).',
        ],
      },
    ],
  },

  // =========================================================================
  // MÓDULO 2: MECÂNICA, FLUIDOS, TERMODINÂMICA & EQUIPAMENTOS
  // =========================================================================
  {
    id: 'mecanica_fluidos',
    titulo: 'Mecânica, Fluidos, Termo & Equipamentos',
    subtitulo:
      'Mecânica geral, Leis de Newton, conservação de energia, fluidos, hidrostática, perda de carga, calor, termodinâmica, materiais e equipamentos.',
    cor: 'gold',
    secoes: [
      {
        id: 'sec-mecanica-newton-energia',
        titulo: '2.1 Mecânica Geral, Leis de Newton, Equilíbrio & Energia Mecânica',
        badge: 'Base Física',
        origem: 'ambos',
        codigoRef: 'TP-10, TP-11, TP-15 / PB-B1.05, PB-B1.09, PB-B2.01, PB-B2.02',
        conteudoMarkdown: `• **Mecânica Geral & Leis de Newton (Transpetro + Petrobras):**
  - **1ª Lei (Inércia):** Corpo em repouso ou MRU permanece assim se ΣF = 0.
  - **2ª Lei (F = m·a):** Aceleração é proporcional à força resultante e inversamente proporcional à massa. Peso: P = m·g.
  - **3ª Lei (Ação e Reação):** Forças de mesmo módulo e direção, sentidos opostos, aplicadas em **corpos distintos** (nunca se anulam).
  - **Condições de Equilíbrio (PB-B1.05):** Ponto material (ΣF = 0); corpo extenso (ΣF = 0 e somatório dos momentos/torques ΣM = 0, onde M = F · d · sen θ).

• **Conservação da Energia Mecânica (Transpetro + Petrobras):**
  - Energia Cinética: Ec = ½·m·v². Energia Potencial Gravitacional: Ep = m·g·h.
  - Em sistemas conservativos (sem atrito): Em_inicial = Em_final. Com atrito, parte vira energia térmica (|τ_atrito| = Em_i − Em_f).

• **Resistência dos Materiais (Exclusivo Transpetro · TP-15):**
  - **Tensão Normal (σ = F_normal / A):** Tração ou compressão perpendicular à seção transversal.
  - **Tensão Cisalhante (τ = V / A):** Força cortante paralela à seção transversal (ex.: pinos, rebites, torção em eixos).
  - **Lei de Hooke (regime elástico):** σ = E · ε, onde E é o Módulo de Elasticidade (Young).`,
        formulas: [
          {
            nome: 'Energia Mecânica e Trabalho',
            formula: 'Ec = 0,5 · m · v²   |   Ep = m · g · h   |   Em = Ec + Ep',
            variaveis: [
              { simbolo: 'm', significado: 'Massa do corpo (kg)' },
              { simbolo: 'v', significado: 'Velocidade (m/s)' },
              { simbolo: 'g', significado: 'Aceleração da gravidade (≈ 9,81 ou 10 m/s²)' },
              { simbolo: 'h', significado: 'Altura de referência (m)' },
            ],
          },
        ],
        pontosDeProva: [
          'Pares ação-reação nunca se equilibram porque atuam em corpos diferentes.',
          'Em queda livre sem atrito, a velocidade ao atingir a base depende apenas da altura (v = √(2gh)), não da massa.',
        ],
      },
      {
        id: 'sec-fluidos-hidrostatica',
        titulo: '2.2 Mecânica dos Fluidos, Hidrostática e Perda de Carga em Dutos',
        badge: 'Coração Dutos & Operação',
        origem: 'ambos',
        codigoRef: 'TP-12 / PB-B2.07, PB-B3.05',
        conteudoMarkdown: `• **Propriedades dos Fluidos e Hidrostática (Transpetro + Petrobras):**
  - **Viscosidade:** Resistência do fluido ao escoamento/cisalhamento (em líquidos cai com aumento da temperatura; em gases aumenta com T).
  - **Teorema de Stevin:** P = P_atm + ρ·g·h. A pressão hidrostática depende apenas da densidade, gravidade e profundidade (não depende do formato do tanque).
  - **Princípio de Pascal:** Acréscimo de pressão em fluido incompressível confinado transmite-se integralmente a todos os pontos.
  - **Empuxo (Arquimedes):** E = ρ_fluido · V_submerso · g.

• **Escoamento e Perda de Carga em Tubulações e Dutos:**
  - **Equação da Continuidade:** Para fluido incompressível em regime permanente, Q = A₁·v₁ = A₂·v₂. Reduzir diâmetro aumenta a velocidade.
  - **Equação de Bernoulli:** P + ½ρv² + ρgh = constante (ao longo de linha de corrente em escoamento ideal). Onde a velocidade sobe, a pressão estática cai.
  - **Número de Reynolds (Re = ρ·v·D / μ):** Re < 2000 (Laminar); 2000 ≤ Re ≤ 4000 (Transição); Re > 4000 (Turbulento).
  - **Perda de Carga:** Dissipação de energia mecânica por atrito viscoso nas paredes (**distribuída**) e em válvulas/curvas/reduções (**localizada**). Aumenta com o comprimento L, rugosidade e quadrado da velocidade, e cresce drasticamente quando o diâmetro D diminui.`,
        formulas: [
          {
            nome: 'Pressão Hidrostática (Teorema de Stevin)',
            formula: 'P_abs = P_atm + ρ · g · h',
            variaveis: [
              { simbolo: 'P_abs', significado: 'Pressão absoluta no fundo (Pa)' },
              { simbolo: 'P_atm', significado: 'Pressão atmosférica local (Pa)' },
              { simbolo: 'ρ', significado: 'Massa específica do fluido (kg/m³)' },
              { simbolo: 'h', significado: 'Altura/profundidade da coluna líquida (m)' },
            ],
          },
          {
            nome: 'Número de Reynolds',
            formula: 'Re = (ρ · v · D) / μ',
            variaveis: [
              { simbolo: 'ρ', significado: 'Massa específica do fluido (kg/m³)' },
              { simbolo: 'v', significado: 'Velocidade média do escoamento (m/s)' },
              { simbolo: 'D', significado: 'Diâmetro interno do duto (m)' },
              { simbolo: 'μ', significado: 'Viscosidade dinâmica (Pa·s)' },
            ],
          },
        ],
        pontosDeProva: [
          'Em redução de diâmetro (tubo Venturi), a velocidade aumenta e a pressão estática diminui (Bernoulli).',
          'A perda de carga em dutos cresce com a redução do diâmetro e com o aumento de rugosidade, comprimento e velocidade.',
        ],
      },
      {
        id: 'sec-termodinamica-calor',
        titulo: '2.3 Termodinâmica Básica, Máquinas Térmicas, Processos Térmicos & Calor',
        badge: 'Alta Incidência',
        origem: 'ambos',
        codigoRef: 'TP-13, TP-14, TP-16 / PB-B1.13, PB-B2.03, PB-B2.04',
        conteudoMarkdown: `• **Propriedades e Processos Térmicos (Petrobras PB-B2.03):**
  - **Calor Sensível (Q = m·c·ΔT):** Varia temperatura sem mudar estado físico.
  - **Calor Latente (Q = m·L):** Muda estado físico em temperatura constante (patamar).

• **Transmissão de Calor (Transpetro TP-13):**
  - **Condução:** Transferência molécula a molécula sem transporte macroscópico de matéria (Lei de Fourier). Predomina em sólidos/paredes de tubulações.
  - **Convecção:** Ocorre em fluidos por movimentação de massa devido a diferenças de densidade (natural) ou bombas/ventiladores (forçada).
  - **Radiação:** Ondas eletromagnéticas (infravermelho); **única que se propaga no vácuo**.

• **Termodinâmica e Máquinas Térmicas (Transpetro + Petrobras):**
  - **1ª Lei (Conservação de Energia):** ΔU = Q − W. Processo isotérmico (ΔU=0 → Q=W); isocórico/isovolumétrico (W=0 → ΔU=Q); adiabático (Q=0 → ΔU=−W).
  - **2ª Lei & Entropia:** O calor flui espontaneamente da fonte quente para a fria. Nenhuma máquina térmica cíclica converte 100% do calor em trabalho.
  - **Ciclo de Carnot:** Máximo rendimento teórico possível entre duas temperaturas absolutas (em **Kelvin**): η_max = 1 − (Tf / Tq).`,
        pontosDeProva: [
          'No ciclo de Carnot, usar T em Kelvin obrigatoriamente; se usar °C o resultado estará errado.',
          'Em uma compressão adiabática rápida de gás, Q = 0 e W < 0, logo ΔU > 0 (o gás esquenta).',
        ],
      },
      {
        id: 'sec-equipamentos-processo',
        titulo: '2.4 Equipamentos de Processo: Bombas, Compressores, Permutadores & Válvulas',
        badge: 'Operação Industrial',
        origem: 'ambos',
        codigoRef: 'TP-17 / PB-B3.03',
        conteudoMarkdown: `• **Bombas Centrífugas x Bombas Alternativas (Deslocamento Positivo):**
  - **Centrífugas:** Impelidor transfere energia cinética convertida em pressão na voluta. Requerem **escorva** (enchimento com líquido antes da partida) e admitem partida com descarga fechada brevemente.
  - **Alternativas (pistão/diafragma/engrenagem):** Deslocam volume fixo por ciclo; altas pressões e fluidos viscosos. **NUNCA** podem operar com descarga bloqueada (risco de ruptura) e exigem válvula de alívio.
  - **Cavitação:** Formação e colapso violento de bolhas de vapor na sucção quando a pressão local cai abaixo da **pressão de vapor** do líquido. Previne-se garantindo **NPSH disponível > NPSH requerido**.

• **Compressores:** Elevam pressão de gases/vapores (centrífugos/axiais para grandes vazões; alternativos para altas pressões). Líquido na sucção causa danos severos (uso de vasos separadores/knockout drums).

• **Permutadores Casco e Tubos (Trocadores de Calor):**
  - **Chicanas (baffles):** Suportam os tubos e direcionam o fluido do casco em zigue-zague para aumentar turbulência e troca térmica.
  - Arranjo **contracorrente** oferece maior eficiência térmica média (ΔTml) que o cocorrente.

• **Tubulações, Válvulas e Acessórios (PB-B3.03):**
  - **Válvula Gaveta / Esfera:** Serviço de bloqueio (on/off). Não usar gaveta para controle de vazão.
  - **Válvula Globo:** Regulagem/estrangulamento de vazão (gera alta perda de carga).
  - **Válvula de Retenção (Check):** Impede fluxo reverso automaticamente.
  - **Válvula de Segurança/Alívio (PSV/PRV):** Protege vasos e dutos contra sobrepressão.`,
        tabelaDestaque: {
          colunas: ['Equipamento / Válvula', 'Aplicação Principal', 'Cuidado Operacional Crítico'],
          linhas: [
            ['Bomba Centrífuga', 'Grandes vazões e baixas viscosidades', 'Escorvar antes de partir; monitorar cavitação (NPSH)'],
            ['Bomba Alternativa', 'Altas pressões, dosagem, fluidos viscosos', 'Jamais fechar descarga sem válvula de alívio'],
            ['Válvula Gaveta', 'Bloqueio total (aberta ou fechada)', 'Não operar parcialmente aberta (erosão na sede)'],
            ['Válvula Globo', 'Controle/estrangulamento de vazão', 'Possui sentido preferencial de fluxo; alta ΔP'],
            ['Permutador Casco/Tubo', 'Troca térmica indireta entre fluidos', 'Preferir fluxo contracorrente; limpar incrustações'],
          ],
        },
        pontosDeProva: [
          'Cavitação ocorre na SUCÇÃO da bomba quando a pressão local cai abaixo da pressão de vapor do fluido.',
          'Válvula de bloqueio típica = Gaveta/Esfera; Válvula de regulagem = Globo; Impedir contrafluxo = Retenção.',
        ],
      },
    ],
  },

  // =========================================================================
  // MÓDULO 3: QUÍMICA, OPERAÇÕES UNITÁRIAS, REFINO & SMS
  // =========================================================================
  {
    id: 'quimica_processos',
    titulo: 'Química, Operações, Refino & SMS',
    subtitulo:
      'Química geral, inorgânica e orgânica, estequiometria, gases, concentrações, equilíbrio, termoquímica, operações unitárias, refino e SMS.',
    cor: 'orange',
    secoes: [
      {
        id: 'sec-quimica-geral-inorganica-redox',
        titulo: '3.1 Química Geral, Ligações, Inorgânica & Oxidação-Redução',
        badge: 'Base Química',
        origem: 'ambos',
        codigoRef: 'TP-19, TP-20, TP-23, TP-24 / PB-B1.01, PB-B1.02',
        conteudoMarkdown: `• **Modelos Atômicos, Tabela Periódica e Ligações (Transpetro TP-19, TP-20):**
  - Dalton (esfera maciça) → Thomson (pudim de passas, elétron) → Rutherford (núcleo denso e eletrosfera) → Bohr (órbitas quantizadas).
  - Eletronegatividade cresce da esquerda para direita e de baixo para cima (F > O > N ≈ Cl).
  - Ligação **Iônica** (metal + ametal, transfere e⁻, conduz corrente fundida ou em solução), **Covalente** (compartilha e⁻, molecular), **Metálica** (mar de elétrons).

• **Ácidos, Bases, Sais e Óxidos (Transpetro + Petrobras):**
  - **Ácidos:** Liberam H⁺ (H₃O⁺) em água; pH < 7 a 25 °C. **Bases:** Liberam OH⁻; pH > 7.
  - **Neutralização:** Ácido + Base → Sal + Água.
  - **Óxidos:** Básicos (metais, reagem com ácido formando sal + água), Ácidos/Anidridos (ametais como CO₂, SO₃, formam ácidos com água) e Anfóteros (Al₂O₃, ZnO).

• **Oxidação-Redução / Redox (Transpetro + Petrobras):**
  - **Oxidação:** Perda de elétrons; o número de oxidação (**NOX**) **aumenta** (quem sofre é o **agente redutor**).
  - **Redução:** Ganho de elétrons; o **NOX diminui** (quem sofre é o **agente oxidante**).
  - Aplicação em Dutos: **Proteção Catódica** utiliza ânodo de sacrifício (metal com menor potencial de redução, como Mg ou Zn, que oxida no lugar do aço do duto).`,
        pontosDeProva: [
          'Quem oxida é o agente redutor; quem reduz é o agente oxidante.',
          'Substâncias simples (O₂, Fe, Cl₂) possuem NOX = 0.',
          'Cada unidade a menos no pH representa aumento de 10 vezes na concentração de H⁺.',
        ],
      },
      {
        id: 'sec-estequiometria-gases-concentracao',
        titulo: '3.2 Estequiometria, Estudo dos Gases, Concentração & Soluções',
        badge: 'Cálculos Chave',
        origem: 'ambos',
        codigoRef: 'TP-21, TP-22, TP-26, TP-29, TP-30 / PB-B1.03, PB-B1.06, PB-B1.07, PB-B2.09',
        conteudoMarkdown: `• **Cálculo Estequiométrico (Transpetro + Petrobras):**
  - Roteiro obrigatório: 1) Balancear equação; 2) Converter dados de massa/volume para **mol** (n = m / MM); 3) Aplicar proporção estequiométrica; 4) Ajustar por pureza ou rendimento.
  - **Reagente Limitante:** Aquele que acaba primeiro (menor razão n_disponível / coeficiente) e define a quantidade máxima de produto formado.

• **Estudo dos Gases (Transpetro + Petrobras):**
  - **Equação de Clapeyron:** P · V = n · R · T (R = 0,082 atm·L/(mol·K) ou 8,314 J/(mol·K)).
  - **Lei Geral:** (P₁·V₁)/T₁ = (P₂·V₂)/T₂. Nas CNTP (0 °C = 273 K e 1 atm), 1 mol de gás ideal ocupa 22,4 L.

• **Unidades de Concentração, Soluções & Dispersões (TP-26, TP-29, TP-30):**
  - **Concentração Comum:** C = m₁ / V (g/L). **Molaridade:** M = n₁ / V = m₁ / (MM · V) (mol/L).
  - **Diluição:** C₁ · V₁ = C₂ · V₂ (adicionar solvente reduz concentração mantendo massa de soluto constante).
  - **Dispersões:** Soluções verdadeiras (< 1 nm, homogêneas), **Coloides** (1 a 1000 nm, apresentam **Efeito Tyndall** — dispersão da luz, ex.: emulsões água/óleo), Suspensões (> 1000 nm, sedimentam).`,
        formulas: [
          {
            nome: 'Equação Geral dos Gases Ideais (Clapeyron)',
            formula: 'P · V = n · R · T',
            variaveis: [
              { simbolo: 'P', significado: 'Pressão do gás (atm ou Pa)' },
              { simbolo: 'V', significado: 'Volume do recipiente (L ou m³)' },
              { simbolo: 'n', significado: 'Número de mols (m / MM)' },
              { simbolo: 'R', significado: 'Constante universal (0,082 atm·L/mol·K)' },
              { simbolo: 'T', significado: 'Temperatura absoluta em Kelvin (K = °C + 273,15)' },
            ],
          },
          {
            nome: 'Molaridade e Diluição de Soluções',
            formula: 'M = m / (MM · V)   |   C₁ · V₁ = C₂ · V₂',
            variaveis: [
              { simbolo: 'M', significado: 'Concentração molar (mol/L)' },
              { simbolo: 'm', significado: 'Massa do soluto (g)' },
              { simbolo: 'MM', significado: 'Massa molar do soluto (g/mol)' },
              { simbolo: 'V', significado: 'Volume total da solução (L)' },
            ],
          },
        ],
        pontosDeProva: [
          'Em todos os cálculos com gases, converta a temperatura para Kelvin antes de multiplicar ou dividir.',
          'Em diluições, o número de mols do soluto permanece constante (n₁ = n₂).',
        ],
      },
      {
        id: 'sec-equilibrio-termoquimica-organica',
        titulo: '3.3 Equilíbrio Químico, Termoquímica e Química Orgânica (Hidrocarbonetos & Polímeros)',
        badge: 'Petróleo & Processos',
        origem: 'ambos',
        codigoRef: 'TP-25, TP-27, TP-28 / PB-B1.04, PB-B1.15, PB-B2.05',
        conteudoMarkdown: `• **Transformações Químicas e Equilíbrio (Transpetro + Petrobras):**
  - Catalisador **diminui a energia de ativação** e acelera as reações direta e inversa igualmente, **sem deslocar o equilíbrio** nem alterar ΔH.
  - **Princípio de Le Chatelier:** Aumentar pressão desloca para o lado de **menor volume gasoso**; aumentar temperatura desloca no sentido **endotérmico** (ΔH > 0).

• **Termoquímica (Transpetro + Petrobras):**
  - **Exotérmica (ΔH < 0):** Libera calor (toda combustão completa ou incompleta é exotérmica). **Endotérmica (ΔH > 0):** Absorve calor.
  - **Lei de Hess:** ΔH global depende apenas dos estados inicial e final, sendo a soma algébrica das etapas.

• **Química Orgânica: Hidrocarbonetos e Polímeros (Transpetro + Petrobras):**
  - **Alcanos** (CₙH₂ₙ₊₂, saturados), **Alcenos** (dupla ligação), **Alcinos** (tripla) e **Aromáticos** (anel benzênico — BTX).
  - Hidrocarbonetos são **apolares**: quanto maior a cadeia carbônica, maior o ponto de ebulição e a viscosidade; cadeias ramificadas têm menor ponto de ebulição que normais de mesma massa.
  - **Polímeros:** Macromoléculas formadas por monômeros via **adição** (polietileno, polipropileno, PVC) ou **condensação** (PET, náilon). Termoplásticos amolecem ao aquecer (recicláveis); termofixos não fundem novamente.`,
        pontosDeProva: [
          'Catalisadores não aumentam o rendimento de equilíbrio — apenas fazem o equilíbrio ser atingido mais rápido.',
          'Quanto maior a cadeia carbônica do hidrocarboneto, maior a força de London e maior seu ponto de ebulição.',
        ],
      },
      {
        id: 'sec-operacoes-refino-sms',
        titulo: '3.4 Operações Unitárias, Processos de Refino & SMS Operacional',
        badge: 'Máxima Prioridade',
        origem: 'ambos',
        codigoRef: 'TP-18, TP-32, TP-33 / PB-B3.02, PB-B3.04',
        conteudoMarkdown: `• **Operações Unitárias (Transpetro + Petrobras):**
  - **Destilação Fracionada:** Separa líquidos miscíveis com pontos de ebulição distintos (coluna de pratos/recheio).
  - **Absorção Gasosa:** Transferência de componente gasoso para líquido solvente (ex.: remoção de H₂S/CO₂ em gás natural).
  - **Adsorção:** Retenção superficial em sólido poroso (carvão ativado, sílica gel).
  - **Decantação / Centrifugação / Filtração:** Separação mecânica por diferença de densidade ou tamanho de partículas.

• **Noções de Processos de Refino (Exclusivo Transpetro · TP-33):**
  - **Dessalgação:** Remove água, sais e sedimentos do óleo cru por campo eletrostático para evitar corrosão e incrustação.
  - **Destilação Atmosférica:** Separa do topo para o fundo: Gás combustível/GLP → Nafta → Querosene (QAV) → Diesel → Resíduo Atmosférico (RAT).
  - **Destilação a Vácuo:** Fraciona o RAT sob baixa pressão para obter gasóleos e resíduo de vácuo (asfalto) sem craqueamento térmico indesejado.
  - **Craqueamento Catalítico Fluido (FCC):** Quebra moléculas pesadas (gasóleo) em frações leves de maior valor (GLP e gasolina). **Hidrotratamento (HDT):** Remove S, N e metais com H₂.

• **Segurança, Meio Ambiente e Saúde — SMS (Transpetro + Petrobras):**
  - **NRs Essenciais:** NR-10 (Eletricidade), NR-13 (Caldeiras, Vasos de Pressão e Tubulações), NR-20 (Inflamáveis e Combustíveis), NR-33 (Espaço Confinado — PET, vigia e monitoramento atmosférico), NR-35 (Trabalho em Altura ≥ 2,0 m).
  - **Ferramentas:** **APR** (Análise Preliminar de Riscos), **PT** (Permissão de Trabalho), **LOTO** (Bloqueio e Etiquetagem de energias perigosas) e **FDS/FISPQ** (Ficha com Dados de Segurança).`,
        pontosDeProva: [
          'Ordem clássica na torre atmosférica (do topo mais frio ao fundo mais quente): Gás/GLP → Nafta → Querosene → Diesel → Resíduo.',
          'Em espaço confinado (NR-33), o vigia nunca abandona o posto nem entra para resgate sem equipe e plano de emergência.',
          'EPC (proteção coletiva) tem prioridade legal sobre EPI (proteção individual).',
        ],
      },
    ],
  },

  // =========================================================================
  // MÓDULO 4: ELETRICIDADE, ELETROMAGNETISMO & ELETRÔNICA
  // =========================================================================
  {
    id: 'eletricidade',
    titulo: 'Eletricidade, Eletromagnetismo & Eletrônica',
    subtitulo:
      'Natureza elétrica da matéria, eletrostática, Leis de Ohm, circuitos elétricos, eletromagnetismo, radiações eletromagnéticas e eletrônica básica.',
    cor: 'sky',
    secoes: [
      {
        id: 'sec-eletrostatica-ohm',
        titulo: '4.1 Natureza Elétrica, Eletrostática & Cargas em Movimento (Leis de Ohm)',
        badge: 'Interseção TP + PB',
        origem: 'ambos',
        codigoRef: 'TP-31, TP-34, TP-35 / PB-B1.08, PB-B1.10, PB-B1.11',
        conteudoMarkdown: `• **Natureza Elétrica e Eletrostática:**
  - Carga elétrica quantizada: Q = n · e (e = 1,6 × 10⁻¹⁹ C). Processos de eletrização: atrito (cargas opostas), contato (cargas de mesmo sinal) e indução (sinal oposto ao indutor após aterramento).
  - **Lei de Coulomb:** F = k·|Q₁·Q₂| / d² (inversamente proporcional ao quadrado da distância).
  - **Aplicação em Terminais:** Escoamento de hidrocarbonetos gera eletricidade estática; exige **aterramento e equipotencialização** antes de carregar/descarregar caminhões-tanque e navios.

• **Cargas em Movimento & Leis de Ohm:**
  - Corrente elétrica: i = ΔQ / Δt (em Ampères, A).
  - **1ª Lei de Ohm:** U = R · i. **2ª Lei de Ohm:** R = ρ · (L / A).
  - **Associação de Resistores:** Em **série** (mesma corrente i; R_eq = R₁ + R₂ + ...); em **paralelo** (mesma tensão U; 1/R_eq = 1/R₁ + 1/R₂ + ...).
  - **Potência e Efeito Joule:** P = U · i = R · i² = U² / R. Energia dissipada: E = P · Δt.`,
        formulas: [
          {
            nome: 'Leis de Ohm e Potência Elétrica',
            formula: 'U = R · i   |   P = U · i = R · i² = U² / R',
            variaveis: [
              { simbolo: 'U', significado: 'Diferença de potencial / Tensão (V)' },
              { simbolo: 'R', significado: 'Resistência elétrica (Ω)' },
              { simbolo: 'i', significado: 'Corrente elétrica (A)' },
              { simbolo: 'P', significado: 'Potência elétrica (W)' },
            ],
          },
        ],
        pontosDeProva: [
          'Na eletrização por atrito, dois corpos neutros distintos adquirem cargas de mesmo módulo e sinais opostos.',
          'Em associação paralela, a resistência equivalente é sempre MENOR que o menor resistor do ramo.',
        ],
      },
      {
        id: 'sec-eletromagnetismo-eletronica',
        titulo: '4.2 Eletromagnetismo, Radiações Eletromagnéticas & Eletrônica Básica',
        badge: 'Interseção TP + PB',
        origem: 'ambos',
        codigoRef: 'TP-36, TP-37, TP-38 / PB-B1.12, PB-B1.17, PB-B2.06',
        conteudoMarkdown: `• **Eletromagnetismo:**
  - Toda corrente elétrica gera campo magnético ao redor do condutor.
  - **Indução Eletromagnética (Faraday-Lenz):** A variação do fluxo magnético através de uma espira induz força eletromotriz que se opõe à variação que a gerou.
  - **Transformadores:** Operam exclusivamente em **corrente alternada (CA)** pela relação V₁/V₂ = N₁/N₂ = i₂/i₁ (ideal).

• **Radiações Eletromagnéticas:**
  - Propagam-se no vácuo à velocidade c ≈ 3×10⁸ m/s, obedecendo **v = λ · f**.
  - Ordem crescente de frequência/energia: Rádio < Micro-ondas (medidores radar) < Infravermelho (termografia) < Luz visível < Ultravioleta < Raios X < Raios Gama (gamagrafia industrial).

• **Noções de Eletricidade e Eletrônica:**
  - **Leis de Kirchhoff:** Nós (Σi_entra = Σi_sai — conservação de carga) e Malhas (ΣU = 0 — conservação de energia).
  - **Componentes:** Capacitores armazenam energia em campo elétrico (bloqueiam CC em regime permanente); Diodos conduzem corrente em um único sentido (retificação CA → CC); Transistores atuam como chave eletrônica ou amplificador; Portas Lógicas (AND, OR, NOT, NAND) fundamentam intertravamentos digitais.`,
        pontosDeProva: [
          'Transformador ligado em corrente contínua estacionária NÃO induz tensão no secundário (fluxo constante).',
          'Maior frequência implica menor comprimento de onda (λ = c/f) e maior energia do fóton (E = h·f).',
        ],
      },
    ],
  },
];
