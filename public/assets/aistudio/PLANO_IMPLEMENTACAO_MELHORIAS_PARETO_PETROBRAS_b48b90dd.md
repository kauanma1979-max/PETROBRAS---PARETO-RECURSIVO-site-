# PLANO DE IMPLEMENTAÇÃO — MELHORIAS DO PETROBRAS / TRANSPETRO — PARETO RECURSIVO

**Destino:** Google AI Studio  
**Projeto-alvo:** Petrobras/Transpetro — Pareto Recursivo  
**Base analisada:** código do ZIP do projeto e documentos PROMPT 01 a 09 enviados pelo usuário  
**Período do cronograma:** janeiro a outubro de **2027**  
**Carga desejada:** 2 horas líquidas por dia, exclusivamente de segunda-feira a sexta-feira (10 horas semanais)  
**Status deste documento:** especificação de melhoria; não representa alterações já executadas no código.

**Correção desta versão:** dias de estudo ajustados para segunda a sexta-feira; sábado e domingo são descanso. A meta passa a ser 120 minutos por dia útil e 600 minutos (10 horas) por semana. Foram incluídos o fluxo `Continuar de onde parei` ao abrir o app e o alarme sonoro ao zerar cada fase do cronômetro.

---

## 1. OBJETIVO E DIRETRIZ CENTRAL

Implementar melhorias no aplicativo existente, aproveitando somente os recursos dos nove prompts que fazem sentido para a arquitetura e para o objetivo do **Petrobras/Transpetro — Pareto Recursivo**. As mudanças específicas solicitadas pelo usuário nesta conversa têm prioridade sobre os exemplos genéricos dos materiais de referência.

**Não transforme o projeto em ESTUDAI.** Os prompts 01 a 09 foram escritos para outra plataforma. Eles devem ser tratados como referências de funcionalidades, interações e organização, nunca como autorização para copiar a arquitetura, a marca, a navegação ou os módulos daquela plataforma.

### Regras inegociáveis

1. Não reconstruir, substituir ou simplificar o aplicativo atual.
2. Preservar as oito abas existentes, seus identificadores, seus componentes e suas responsabilidades.
3. Fazer alterações incrementais nos componentes existentes sempre que possível.
4. Não criar cópias paralelas de disciplinas, tópicos, conteúdo programático, incidência Pareto, materiais ou progresso.
5. Usar os dados já existentes em `src/data/` como fonte de verdade.
6. Não inventar questões, incidências, percentuais, tópicos ou tempo estudado.
7. Preservar as chaves existentes do LocalStorage, os dados de backup JSON e o fluxo atual do Google Drive.
8. Toda nova informação persistida deverá ser incluída no sistema de backup e restauração, com compatibilidade com backups antigos.
9. Não declarar testes como aprovados sem executá-los de fato.
10. Não instalar bibliotecas externas sem necessidade comprovada. Reutilizar React, TypeScript, Tailwind, Motion, Lucide e os componentes de interface existentes.

---

## 2. LEITURA DO PROJETO ATUAL — REFERÊNCIA OBRIGATÓRIA

O inventário técnico produzido a partir do ZIP identifica:

| Aba atual | Componente principal | Papel atual |
|---|---|---|
| Edital (Em Breve) | `EditalSummary` | Resumo dos editais-base e atalhos para as demais abas |
| Edital Verticalizado | `EditalVerticalizado` | Conteúdo programático unificado, filtros e progresso |
| Pareto Recursivo | `ParetoMatrix` | Hierarquia macro, meso e micro com incidência e prioridade |
| Material de Estudos | `TabMaterialEstudo` | Conteúdo didático, fórmulas, mapas mentais, notas e links |
| Ciclos de Estudo | `StudySchedule` | Ciclos, sessões, blocos, anotações e progresso |
| Regras de Corte | `CutRules` | Priorização, redução e corte de conteúdo |
| Raio-X Bancas | `BancaCesgranrio` | Perfil das bancas e padrões conceituais |
| Caderno de Erros | `ErrorNotebook` | Registro e análise de erros |

### 2.1 Arquitetura que deve ser preservada

- React 19, TypeScript, Vite 6 e Tailwind CSS 4.
- Motion 12 e CSS existentes para animações.
- Lucide React para ícones.
- LocalStorage para persistência local.
- Backup e restauração JSON centralizados em `src/utils/backupStorage.ts`.
- Integração Google Apps Script/JSONP em `src/utils/driveSync.ts` e nos componentes de Drive já existentes.
- Identidade visual existente: verdes `#008542`, `#006837` e `#071F14`, amarelo `#FDB913`, laranja `#EA580C`, fundo `#F6F8F7`, fontes Plus Jakarta Sans, Outfit e JetBrains Mono.

### 2.2 Fontes de dados Pareto já disponíveis

- `src/data/paretoData.ts`: hierarquia macro/meso/micro, pesos, quantidade de questões, prioridade e indicadores de núcleo Pareto.
- `src/data/verticalSyllabusData.ts`: 42 tópicos com IDs estáveis, macroárea, incidência estimada, questões mapeadas, participação Pareto, presença em provas, prioridade e resumo estratégico.
- `src/data/materialEstudosData.ts`: conteúdos de estudo.
- `src/data/scheduleData.ts`: ciclos e sessões atuais.

A base registrada no código informa 270 questões consideradas, 266 associadas aos 42 tópicos e 4 excluídas; o núcleo declarado contém 22 tópicos e corte de 81,2%. Esses números são dados registrados na aplicação, não uma validação externa feita nesta tarefa. Não alterá-los sem fonte rastreável.

### 2.3 Situação atual relevante para as mudanças

- `StudySchedule` já possui navegação entre ciclos, blocos de estudo, anotações e indicadores de conclusão, mas não apresenta um calendário mensal por data com distribuição de segunda a sexta-feira.
- `DailySessionModal` já contém cronômetro, porém as etapas atuais são 25, 40 e 15 minutos. Não correspondem ao ciclo solicitado de 50 minutos de estudo e 20 minutos de descanso.
- O cronômetro atual conclui uma sessão/ciclo, mas o fluxo identificado não mantém um histórico granular de minutos líquidos estudados por data.
- `EditalVerticalizado` agrupa tópicos pela ordem de inserção dos dados; não há garantia de ordenação geral por incidência Pareto em todos os grupos.
- `PARETO_MATRIX` já apresenta as macroáreas em ordem decrescente de peso, mas essa ordenação deve ser explicitada e protegida também nos níveis meso e micro.
- `TabMaterialEstudo` apresenta `MaterialLinksSection` no fim da página. `EditalSummary` ainda não usa esse componente.
- A persistência do cronograma utiliza chaves existentes, entre elas `transpetro_schedule_selected_ciclo`, `transpetro_schedule_phase_filter`, `transpetro_schedule_day_notes`, `transpetro_completed_days_v2` e `transpetro_completed_blocks_v1`.
- O estado de conclusão atual não deve ser interpretado como prova de que foram estudadas duas horas. Marcação planejada e tempo efetivamente estudado são informações diferentes.

---

## 3. TRIAGEM DOS NOVE PROMPTS RECEBIDOS

Os arquivos `Paste November 24, 2026 - 6_10PM.txt` e `Paste November 24, 2026 - 6_17PM.txt` repetem, respectivamente, os conteúdos dos prompts 06 e 07. Devem ser considerados cópias de referência, não requisitos extras.

O arquivo `09 PLANO.txt` começa com um relato de implementação do módulo Revisões no ESTUDAI e, depois, contém o Prompt 09 — Estatísticas. O relato de implementação diz respeito ao outro sistema e **não comprova** que esse módulo exista no aplicativo Petrobras/Transpetro.

| Material | Classificação no projeto atual | Tratamento definido |
|---|---|---|
| Prompt 01 — Criação de planos | **Incompatível como módulo completo** | Não criar assistente de cadastro de múltiplos planos, importador genérico de editais ou nova hierarquia Plano/Disciplina/Tópico. O projeto já possui uma base específica para Petrobras/Transpetro. Aproveitar apenas validação, pré-visualização e preservação de identificadores como boas práticas quando houver edição de dados existente. |
| Prompt 02 — Home | **Adaptável parcialmente** | Não criar uma nova Home nem uma nova aba. Aproveitar indicadores compactos de evolução somente onde houver dados reais, preferencialmente na área superior de Ciclos de Estudo ou em componentes existentes. |
| Prompt 03 — Ciclo de Estudos | **Compatível parcialmente** | Evoluir `StudySchedule` e `DailySessionModal`; preservar os ciclos, blocos, anotações, IDs e estado de progresso já existentes. A nova organização principal deverá ser por calendário e Pareto. |
| Prompt 04 — Planejamento Semanal | **Compatível parcialmente e prioritário** | Aproveitar a navegação temporal e a visualização de calendário semanal/mensal, mas sem criar wizard, segundo planejamento, agenda paralela ou funcionalidades de recorrência que não foram solicitadas. Integrar o calendário à aba Ciclos de Estudo existente. |
| Prompt 05 — Registro de Estudos | **Adaptável parcialmente** | Aproveitar a execução funcional do cronômetro e a persistência de tempo real. Não criar um formulário completo de registros, histórico paralelo ou nova fonte de métricas nesta etapa. |
| Prompt 06 — Edital Verticalizado | **Compatível parcialmente** | Melhorar ordenação Pareto e identificação visual de Química/Física no `EditalVerticalizado`, preservando os 42 tópicos, IDs, progresso, filtros e vínculos. Não reconstruir o módulo. |
| Prompt 07 — Histórico de Estudos | **Fora do escopo como módulo completo; adaptável para o cronômetro** | Não criar uma nova aba de Histórico nem um sistema completo de CRUD de registros. Criar somente o log mínimo de sessões do cronômetro necessário para somar tempo líquido por dia e alimentar o calendário. |
| Prompt 08 — Revisões | **Fora do escopo desta implementação** | Não criar uma aba Revisões, agendador de revisões, estados programadas/atrasadas/ignoradas/concluídas ou um novo sistema de registros. Manter o projeto atual sem expansão de navegação não solicitada. |
| Prompt 09 — Estatísticas | **Adaptável parcialmente** | Mostrar indicadores derivados do cronômetro e do calendário, como minutos estudados hoje/na semana e percentual da meta diária. Não criar módulo de Estatísticas independente nem gerar números sem registros. |

---

## 4. REQUISITO GLOBAL — DESTAQUE DE QUÍMICA E FÍSICA EM TODAS AS ABAS

### 4.1 Objetivo

Em todas as abas que exibem disciplinas, macroáreas, tópicos, materiais, exemplos, questões, erros ou referências temáticas, destacar visualmente quando o conteúdo estiver relacionado a **Química** ou **Física**. O destaque deve ajudar o estudante que está iniciando o nivelamento nessas matérias.

### 4.2 Implementação recomendada

Criar uma classificação única e reutilizável em um utilitário, por exemplo:

- `src/utils/subjectClassification.ts`
- Um componente reutilizável, por exemplo `SubjectBaseBadge.tsx`.

A função de classificação deve receber o ID estável do tópico ou da macroárea, não depender somente de comparação textual aproximada. Ela deverá retornar uma categoria controlada, como `quimica`, `fisica` ou `tecnico`.

**Mapeamento inicial recomendado, a validar contra todos os registros existentes:**

| Classificação | Conteúdos do projeto |
|---|---|
| Química | Tópicos fundamentais identificados por IDs `qui-01` a `qui-12` |
| Física — Mecânica/Fluidos/Termodinâmica | Tópicos `mec-01` a `mec-11` |
| Física — Eletricidade/Eletromagnetismo | Tópicos `ele-01` a `ele-06` |
| Física básica complementar | `inst-08` (Sistema Internacional de Unidades) e `inst-10` (Escalas de temperatura), após conferência do conteúdo e do vínculo no edital |
| Eixo técnico correlato, não classificar automaticamente como nivelamento de Química/Física | Demais tópicos de instrumentação e os tópicos `qui-13` a `qui-15` (operações unitárias, processos de refino e SMS), que pertencem ao macrogrupo amplo de Química/Processos no código, mas não são todos conteúdos de Química básica |

Se o código confirmar outra relação entre ID e conteúdo, corrigir o mapa antes de implementar. Não utilizar apenas palavras como “temperatura”, “energia”, “processo” ou “elétrico” em uma busca genérica para classificar itens sem revisão.

### 4.3 Aparência dos destaques

- Badge textual sempre visível: `QUÍMICA` ou `FÍSICA`.
- Cor de Química: laranja/âmbar dentro da identidade visual existente.
- Cor de Física: azul, com contraste suficiente para leitura.
- Ícone discreto opcional: frasco para Química e átomo/raio para Física, usando Lucide disponível.
- O texto deve acompanhar a cor; não depender exclusivamente da cor para comunicar a categoria.
- Quando estiver no período de janeiro a março de 2027, acrescentar uma identificação secundária `NIVELAMENTO` aos itens do cronograma que fazem parte da fase.
- Não alterar a cor identificadora original das macroáreas nem a badge de origem Transpetro/Petrobras. Os marcadores devem coexistir sem competir visualmente.

### 4.4 Onde aplicar

Aplicar a classificação nos componentes existentes, quando houver informação temática confiável:

- `EditalSummary`: links e referências que possam ser associados a um assunto.
- `EditalVerticalizado`: cabeçalhos de tópicos, grupos e detalhes expandidos.
- `ParetoMatrix`: cards de macro, meso e microáreas.
- `TabMaterialEstudo`: título da seção, conteúdo e materiais associados, quando houver vínculo temático confiável.
- `StudySchedule`: calendário e cards do estudo diário.
- `CutRules`: áreas e tópicos que estejam relacionados a essas disciplinas.
- `BancaCesgranrio`: pares conceituais e temas quando houver associação exata.
- `ErrorNotebook`: registros associados a tópicos Química/Física.

Se um item não puder ser classificado com segurança, não inventar o badge. Preservar o conteúdo e a ordem atual, sinalizando tecnicamente a necessidade de mapeamento.

---

## 5. REGRA GLOBAL — ORDENAR O CONTEÚDO DO MAIS RELEVANTE AO MENOS RELEVANTE PELO PARETO

### 5.1 Objetivo

Nas listas de conteúdo das oito abas, apresentar primeiro as áreas, disciplinas e tópicos com maior incidência na base de provas, caminhando de cima para baixo até os assuntos de menor incidência.

### 5.2 Fonte de ordenação

Usar os indicadores Pareto reais do projeto, sem criar uma nova tabela de pesos:

1. Macroárea: `exactPct` ou `weightPct` em `PARETO_MATRIX`, em ordem decrescente.
2. Mesoárea: `weightInDiscipline`, em ordem decrescente dentro da macroárea.
3. Microárea: `paretoPct` e `questionCount`, em ordem decrescente.
4. Tópicos do Edital Verticalizado: `paretoSharePct` em ordem decrescente; em empate, `mappedQuestions` em ordem decrescente; depois `incidenceEstimate` e ID estável como desempate.
5. Materiais e conteúdos: ordenar somente quando houver vínculo confiável com macroárea/tópico; usar o rank do tópico relacionado.

**Não usar `incidenceEstimate` como único indicador primário**, pois a base também possui participação percentual e quantidade de questões mapeadas, mais específicas para ordenar o retorno histórico.

### 5.3 Ordem macro atualmente registrada

O código apresenta a seguinte distribuição macro, totalizando 266 questões mapeadas no universo dos 42 tópicos:

| Ordem | Macroárea | Peso exato no código | Questões mapeadas |
|---:|---|---:|---:|
| 1 | Química, Operações Unitárias, Refino & SMS | 38,7% (rótulo arredondado: 39%) | 103 |
| 2 | Mecânica, Fluidos, Termodinâmica & Equipamentos | 35,3% (rótulo arredondado: 35%) | 94 |
| 3 | Instrumentação, Metrologia & Controle | 16,9% (rótulo arredondado: 17%) | 45 |
| 4 | Eletricidade, Eletromagnetismo & Eletrônica | 9,0% | 24 |

A ordenação deve valer também para os filtros, grupos expandidos, listas e resultados de busca. Filtrar não pode alterar o ranking relativo dos itens restantes.

### 5.4 Aplicação por aba

- `ParetoMatrix`: ordenar explicitamente macro, meso e micro por seus pesos. Não confiar apenas na ordem manual do array.
- `EditalVerticalizado`: alterar `groupedByMacro` para percorrer as macroáreas no ranking Pareto e ordenar seus tópicos por `paretoSharePct`.
- `TabMaterialEstudo`: ordenar módulos e seções vinculados por rank Pareto, sem reordenar arbitrariamente páginas ou componentes internos de uma aula.
- `StudySchedule`: selecionar os assuntos da agenda segundo a mesma sequência ponderada.
- `CutRules`: exibir as áreas de maior retorno primeiro, preservando a classificação específica das regras.
- `BancaCesgranrio` e `ErrorNotebook`: priorizar temas vinculados por ranking Pareto. Quando a função da tela exigir uma cronologia, manter cronologia como eixo principal e utilizar Pareto como prioridade visual/filtro; não destruir a ordem temporal de um histórico.
- `EditalSummary`: ordenar materiais globais por macroárea e ranking, sem alterar links oficiais ou seus destinos.

### 5.5 Preservação

A ordenação deve ser feita sobre cópias derivadas dos arrays, com `useMemo` quando apropriado. Não executar `.sort()` diretamente sobre os arrays importados de `src/data/`. Não modificar IDs, códigos de edital, progresso ou conteúdo-fonte apenas para obter nova ordem visual.

---

## 6. ABA MATERIAL DE ESTUDOS — REMOVER A ÁREA DE CARDS DE LINKS DO RODAPÉ E MANTER O RECURSO NO EDITAL

### Estado atual

`TabMaterialEstudo.tsx` renderiza `MaterialLinksSection` no final da página, depois das seções didáticas e dos mapas mentais. `MaterialLinksSection.tsx` utiliza a chave `transpetro_material_links_v1` e já suporta exibição global por módulo.

### Alteração solicitada

1. Remover de `TabMaterialEstudo` somente o bloco inferior que renderiza `MaterialLinksSection` como uma seção global de cards.
2. Manter integralmente o conteúdo didático, busca, fórmulas, calculadora, mapas mentais, anotações e a persistência personalizada.
3. Não remover nem desativar o componente `MaterialLinksSection`.
4. Inserir o mesmo componente na primeira aba, `EditalSummary`, abaixo do conteúdo de resumo/links de navegação, em uma seção com título claro, por exemplo **Materiais e Referências do Edital**.
5. Configurar a exibição global, contemplando os links de todas as macroáreas e os materiais gerais. Reutilizar o filtro global já existente (`moduloId="todos"` ou `showAllModulesFilter={true}`, conforme a API real do componente).
6. Manter a chave `transpetro_material_links_v1`, os IDs dos links, a edição, exclusão, cadastro, validação de URL e deduplicação existentes.
7. Não copiar os links para outra chave e não duplicar o componente com uma fonte de dados diferente.
8. Testar se os links já cadastrados continuam visíveis depois da mudança e se links adicionados pela aba Edital permanecem disponíveis após atualizar a página, exportar/importar backup e restaurar.

**Resultado esperado:** a aba Material de Estudos fica dedicada ao conteúdo didático, enquanto o cadastro e a gestão dos cards globais de materiais ficam na primeira aba Edital.

---

## 7. ABA CICLOS DE ESTUDO — NOVO CALENDÁRIO NA PARTE SUPERIOR

### 7.1 Objetivo da alteração

Evoluir a aba `StudySchedule` para que o calendário seja a primeira área da tela. Abaixo dele, apresentar os detalhes do dia selecionado, reaproveitando o padrão de cartões, descrições, tópicos, notas e ações que já existe na aba atual.

Não criar uma nova aba chamada Planejamento nem um segundo componente de planejamento independente.

### 7.2 Estrutura visual da página

Ordem vertical obrigatória:

1. Cabeçalho atual de Ciclos de Estudo, adaptado sem perder ações existentes importantes.
2. Identificação da etapa ativa do cronograma: `Nivelamento — Química e Física` ou `Pareto completo — todas as macroáreas`.
3. Calendário mensal no topo, com navegação entre os meses de janeiro e outubro de 2027.
4. Legenda de categorias Química/Física e demais macroáreas, com indicação de dias de estudo e descanso.
5. Indicadores do dia selecionado: meta diária de 2h, minutos efetivamente estudados, minutos restantes e percentual cumprido.
6. Abaixo do calendário, painel **Estudos do dia** com descrição dos assuntos distribuídos para a data selecionada.
7. Cards ou blocos diários com macroárea, mesoárea, microárea/tópico, ranking Pareto, participação/questões mapeadas e orientação de estudo já existente, quando houver.
8. Anotações já existentes e controles de execução, sem eliminar a funcionalidade atual de observação por sessão.

### 7.3 Calendário — referência visual obrigatória

A imagem enviada pelo usuário deve ser utilizada como referência direta de composição. Reproduzir o modelo de calendário mensal mostrado, adaptando integralmente os textos para português do Brasil e preservando a identidade visual Petrobras/Transpetro já existente no aplicativo.

**A referência é o formato do calendário, não o conteúdo do exemplo.** Não copiar fases da Lua, datas de 2018, horários, fuso do Arizona, marca Google, botão de impressão ou qualquer dado demonstrativo da captura.

#### 7.3.1 Barra superior do calendário

Na parte superior do quadro, reproduzir uma barra compacta, com esta organização:

- Título à esquerda: `Calendário de Estudos`.
- Botão `Hoje` para voltar à data atual/selecionar a data de referência, quando estiver dentro do período do cronograma.
- Botões de seta `Mês anterior` e `Próximo mês`, com ícones e rótulos acessíveis.
- Identificação do mês e ano em português, por exemplo `Janeiro de 2027`.
- Controles de visualização à direita: `Semana`, `Mês` e `Agenda`; a visualização inicial e principal deve ser `Mês`.
- Os controles devem ter estado selecionado visível, foco de teclado e rótulos acessíveis. Não exibir controles sem ação real.

O calendário deve abrir por padrão no mês vigente do período de estudo (janeiro de 2027, na primeira utilização do cronograma) e lembrar a última data selecionada, se isso puder ser feito sem criar persistência redundante.

#### 7.3.2 Grade mensal — composição semelhante à imagem

- Exibir uma grade com sete colunas e linhas suficientes para cobrir todos os dias do mês, incluindo os dias residuais do mês anterior e seguinte em tom mais discreto, quando necessário para completar a semana.
- Usar os dias da semana em português e abreviados: `Seg`, `Ter`, `Qua`, `Qui`, `Sex`, `Sáb`, `Dom`.
- A semana começa na segunda-feira. Sábado e domingo permanecem visíveis nas duas últimas colunas e recebem a indicação `DESCANSO`.
- Cada célula deve mostrar o número do dia no topo, com espaçamento suficiente para acomodar pequenos eventos de estudo.
- De segunda a sexta-feira, exibir pequenos rótulos/cartões de evento com nome abreviado da matéria ou tópico e, quando couber, a duração planejada. Sábado e domingo devem exibir `DESCANSO`, sem eventos planejados. Diferenciar as macroáreas por cores já previstas na identidade do aplicativo e manter os badges `QUÍMICA`/`FÍSICA` nos eventos de nivelamento.
- Quando houver mais eventos do que couberem na célula, mostrar uma indicação como `+2 atividades`; ao selecionar a data, o painel diário abaixo deve mostrar todos os blocos, sem ocultar nenhum.
- Datas fora do mês corrente podem aparecer em tom cinza, mas não devem receber agenda indevida. Datas fora de janeiro a outubro de 2027 não devem gerar atribuições automáticas.
- Destacar a data selecionada com fundo suave e borda de destaque. Destacar a data atual com um marcador diferente, sem confundir data atual com data selecionada. Utilizar preferencialmente o verde já adotado pelo app e um detalhe âmbar discreto compatível com `#FDB913`.
- Sábado e domingo devem exibir `Descanso`, sem eventos de estudo nem meta de 120 minutos.
- A grade deve manter linhas finas, fundo claro, células bem delimitadas, cabeçalho dos dias distinto e aparência limpa, próxima à referência enviada, mas sem copiar a marca ou o estilo de terceiros. Sábado e domingo ficam visivelmente identificados como dias de descanso.

#### 7.3.3 Interações de data e evento

- Clicar em uma célula seleciona a data e atualiza o painel `Estudos do dia` abaixo do calendário sem recarregar a aplicação.
- Clicar em um evento abre um popover/modal compacto em português, posicionado próximo ao evento quando houver espaço. Exibir nome do assunto, macroárea, data, duração planejada, prioridade/incidência Pareto e ação `Ver detalhes`.
- A ação `Ver detalhes` deve selecionar a data correspondente e conduzir o foco visual ao painel diário abaixo; não criar uma tela paralela.
- O popover deve ter botão de fechar e fechar ao clicar fora ou pressionar `Esc`, sem interromper um cronômetro que já esteja em andamento.
- O clique no evento e o clique na data não podem iniciar o cronômetro automaticamente. A execução só começa quando o usuário acionar `Iniciar estudo` no detalhe diário.

#### 7.3.4 Navegação e visualizações

- `Mês`: grade mensal no formato da imagem enviada; é a visão padrão.
- `Semana`: mostrar os sete dias da semana selecionada, mantendo segunda a sexta como dias de estudo e sábado/domingo como descanso, sem blocos.
- `Agenda`: listar cronologicamente somente os blocos planejados de segunda a sexta-feira, com data, horário/duração se aplicável e assunto; fins de semana podem aparecer como separadores de descanso, nunca como sessões. Não inventar horários fixos, pois a exigência do usuário é por duração diária e não por hora do relógio.
- As três visualizações devem apresentar os mesmos eventos e a mesma fonte de dados; alternar a visualização não pode criar, apagar ou duplicar sessões.
- As setas de navegação devem atualizar mês/semana/agenda de forma coerente com a visualização ativa.
- O botão `Hoje` deve retornar ao período que contém a data atual. Se a data atual estiver fora de janeiro–outubro de 2027, não criar dados de estudo retroativos ou futuros; exibir uma mensagem informativa e permitir navegar para o intervalo programado.

#### 7.3.5 Idioma, responsividade e identidade visual

- Toda a interface do calendário deve estar em português do Brasil: nome dos meses, dias da semana, botões, tooltips, popovers, mensagens vazias e acessibilidade.
- Usar datas no formato brasileiro (`dd/MM/yyyy`) nos detalhes e no padrão textual `dia da semana, dd de mês de yyyy` quando necessário.
- Usar o fuso local já adotado pela aplicação, sem copiar o fuso exibido na captura de referência.
- Desktop: manter a grade mensal completa, com células suficientemente altas para os eventos.
- Tablet: reduzir espaçamentos e tipografia de maneira proporcional, preservando a leitura dos nomes dos assuntos.
- Celular: manter os sete dias reconhecíveis sem rolagem horizontal; se necessário, compactar os rótulos na grade e apresentar os nomes completos no painel `Estudos do dia`.
- Reutilizar os componentes, tokens CSS e ícones já instalados. Não instalar biblioteca de calendário externa sem demonstrar que os componentes atuais não atendem.
- Respeitar `prefers-reduced-motion` e não utilizar animações que prejudiquem a leitura.

#### 7.3.6 Regras de agenda e progresso

- Permitir selecionar uma data e atualizar o painel de detalhes abaixo sem recarregar a aplicação.
- Permitir navegar de janeiro a outubro de 2027.
- Cada dia de segunda a sexta-feira deve apresentar a meta planejada de 2h e um resumo curto das matérias/tópicos atribuídos. Sábado e domingo devem aparecer como dias de descanso, sem blocos ou metas.
- Mostrar o progresso real do dia usando somente minutos líquidos registrados pelo cronômetro.
- Sábado e domingo devem ser marcados como `DESCANSO`, sem atribuição automática de 2 horas.
- Não presumir feriados ou dias de descanso adicionais sem configuração do usuário.
- Fora do intervalo janeiro–outubro de 2027, não criar matérias agendadas automaticamente; apresentar estado informativo.
- O total dos blocos de cada dia de estudo deve fechar exatamente 120 minutos. Os textos abreviados dentro da célula são apenas uma prévia visual; o painel diário abaixo deve conter todos os detalhes e a soma completa.

### 7.3.7 Correspondência com a imagem enviada

| Elemento observado na referência | Adaptação no aplicativo |
|---|---|
| Cabeçalho do calendário | Título `Calendário de Estudos` |
| Botão Today | Botão `Hoje` |
| Setas de navegação | `Mês anterior` e `Próximo mês` |
| Mês/ano em inglês | Mês/ano em português, como `Janeiro de 2027` |
| Abas Week / Month / Agenda | `Semana` / `Mês` / `Agenda`, com `Mês` selecionada inicialmente |
| Grade de sete colunas | Grade Seg–Dom, em português e com semana iniciando na segunda-feira |
| Evento com balão de detalhes | Popover em português com assunto, data, duração e prioridade Pareto |
| Dia destacado | Data selecionada destacada; data atual com marcador distinto |
| Rodapé com fuso/localização de terceiro | Omitir; usar o fuso local da aplicação, sem marca de terceiro |

**A captura fornecida é agora a referência visual obrigatória para o formato mensal.** O calendário deve ficar na parte superior da aba Ciclos de Estudo e o painel com a descrição diária deve permanecer imediatamente abaixo dele, como solicitado pelo usuário.

### 7.4 Painel diário abaixo do calendário

Ao selecionar um dia, exibir a descrição diária em padrão compatível com os cards atuais:

- Data e dia da semana.
- Em dias úteis (segunda a sexta): meta planejada de 2h. Em sábado/domingo: estado `DESCANSO`, sem meta e sem botão de iniciar sessão programada.
- Macroárea e disciplina-base (somente quando houver atividade programada).
- Mesoárea e microárea/tópico.
- Prioridade Pareto e incidência histórica.
- Tempo planejado por bloco.
- Orientação/resumo estratégico existente, sem reescrever o conteúdo técnico automaticamente.
- Ação para iniciar o cronômetro já associada ao tópico daquele bloco.
- Anotações da sessão, preservando as notas existentes e seus vínculos.

O painel deve permitir que cada dia útil tenha um ou mais blocos conforme a distribuição ponderada. A soma dos tempos atribuídos aos blocos de cada dia útil deve totalizar exatamente 120 minutos planejados; sábado e domingo não recebem blocos.

---

## 8. CRONOGRAMA 2027 — JANEIRO A OUTUBRO, 2 HORAS POR DIA

### 8.1 Premissas de planejamento

- Ano: 2027.
- Vigência: 01/01/2027 a 31/10/2027.
- Dias de estudo: exclusivamente de segunda-feira a sexta-feira.
- Sábado e domingo: descanso, sem estudo programado.
- Meta: 120 minutos líquidos de estudo em cada dia útil.
- Meta semanal: 600 minutos líquidos (10 horas), distribuídos por Pareto.
- Janeiro, fevereiro e março: somente Química e Física no cronograma ativo de nivelamento.
- Abril a outubro: todas as macroáreas, macro/meso/microáreas e tópicos do conteúdo-base, seguindo o peso Pareto.

A limitação de Química/Física de janeiro a março é uma regra do **cronograma de estudo**, não uma exclusão dos demais tópicos do banco. Os demais conteúdos continuam disponíveis para consulta nas outras abas, porém identificados como `A partir de abril` ou `Fora do nivelamento atual`, sem entrar na agenda do período.

### 8.2 Fase 1 — Nivelamento (janeiro, fevereiro e março de 2027)

Durante os três primeiros meses, o calendário só pode atribuir assuntos classificados como Química ou Física básica.

**Conjunto inicial recomendado para o nivelamento:**

- Química: `qui-01` a `qui-12`.
- Física — Mecânica/Fluidos/Termodinâmica: `mec-01` a `mec-11`.
- Física — Eletricidade/Eletromagnetismo: `ele-01` a `ele-06`.
- Fundamentos físicos complementares: `inst-08` (SI) e `inst-10` (escalas de temperatura), após validação da descrição de cada tópico.

Não programar no nivelamento inicial os demais tópicos de instrumentação (`inst-*` não listados) nem os tópicos `qui-13` a `qui-15` ligados a operações unitárias, refino e SMS. Esses assuntos permanecem no edital e entram na fase completa a partir de abril, salvo decisão futura explícita do usuário.

**Distribuição:** calcular automaticamente a participação relativa de Química e Física usando a soma de `mappedQuestions` dos tópicos elegíveis, normalizada para 100%. A distribuição deve manter os 120 minutos de cada dia útil e os 600 minutos da semana. Não usar pesos inventados nem incluir assuntos fora da lista permitida.

O algoritmo deve começar pelos tópicos de maior `paretoSharePct`/`mappedQuestions`, alternando Química e Física de forma equilibrada segundo os pesos calculados. Deve cobrir progressivamente o conjunto elegível, sem repetir indefinidamente apenas os dois ou três assuntos mais incidentes.

**Exemplo de distribuição semanal apenas para demonstrar a regra de carga (não é uma lista fixa de tópicos):**

| Dia | Distribuição ilustrativa | Total |
|---|---|---:|
| Segunda | Química e/ou Física conforme o saldo Pareto | 120 min |
| Terça | Química e/ou Física conforme o saldo Pareto | 120 min |
| Quarta | Química e/ou Física conforme o saldo Pareto | 120 min |
| Quinta | Química e/ou Física conforme o saldo Pareto | 120 min |
| Sexta | Química e/ou Física conforme o saldo Pareto | 120 min |
| Sábado | Descanso | 0 min |
| Domingo | Descanso | 0 min |
| **Total semanal** | **Distribuição ponderada de Química/Física** | **600 min** |

A sequência real deve ser ajustada a cada semana para manter a proporção calculada. O exemplo não deve ser gravado como regra rígida se a soma ponderada dos tópicos elegíveis recomendar outra divisão.

### 8.3 Fase 2 — Pareto completo (abril a outubro de 2027)

A partir de 01/04/2027, o calendário passa a incluir as quatro macroáreas do projeto, mantendo os 2h líquidos por dia e a distribuição por Pareto.

**Distribuição de referência derivada das 266 questões mapeadas, normalizada para 600 minutos semanais:**

| Macroárea | Peso exato no código | Meta semanal aproximada (600 min) | Tempo arredondado para blocos de 5 min |
|---|---:|---:|---:|
| Química, Operações Unitárias, Refino & SMS | 38,7% | 232 min | 235 min (3h55) |
| Mecânica, Fluidos, Termodinâmica & Equipamentos | 35,3% | 212 min | 210 min (3h30) |
| Instrumentação, Metrologia & Controle | 16,9% | 102 min | 100 min (1h40) |
| Eletricidade, Eletromagnetismo & Eletrônica | 9,0% | 54 min | 55 min (0h55) |
| **Total** | **99,9% por arredondamento** | **600 min** | **600 min (10h00)** |

A distribuição semanal de referência foi recalculada para 600 minutos (cinco dias × 120 minutos). Os pesos apresentados somam 99,9% por arredondamento; o gerador deve normalizar os valores reais e distribuir eventuais minutos residuais por método determinístico.

**Exemplo de distribuição semanal que fecha a meta de 2h em cada dia:**

| Dia | Química | Mecânica/Fluidos | Instrumentação | Eletricidade | Total diário |
|---|---:|---:|---:|---:|---:|
| Segunda | 50 min | 50 min | 20 min | — | 120 min |
| Terça | 50 min | 50 min | — | 20 min | 120 min |
| Quarta | 50 min | 40 min | 30 min | — | 120 min |
| Quinta | 45 min | 50 min | — | 25 min | 120 min |
| Sexta | 40 min | 20 min | 50 min | 10 min | 120 min |
| Sábado | — | — | — | — | 0 min (descanso) |
| Domingo | — | — | — | — | 0 min (descanso) |
| **Total** | **235 min** | **210 min** | **100 min** | **55 min** | **600 min** |

Esta tabela é um ponto de partida verificável; a geração final deve alternar os tópicos meso/micro conforme a incidência e a cobertura dos assuntos, preservando as quotas semanais. Não repetir sempre o mesmo tópico no mesmo dia da semana. Os valores arredondados são quotas de referência, não pesos novos: se a base real mudar, recalcular proporcionalmente e distribuir o resíduo para fechar exatamente 600 minutos.

### 8.4 Distribuição por macro, meso e microárea

- A macroárea recebe tempo proporcional ao seu peso real de questões.
- Dentro da macroárea, mesoáreas recebem tempo proporcional a `weightInDiscipline` e/ou `questionCount`.
- Dentro da mesoárea, microáreas e tópicos são percorridos por `paretoPct`, `questionCount` e `paretoSharePct`.
- Tópicos do núcleo Pareto (22 itens declarados no código) devem receber exposição antecipada e recorrente.
- Os tópicos fora do núcleo também devem aparecer ao longo do período; não devem ser eliminados da agenda.
- O gerador deve intercalar teoria, resolução de questões e retomada de erros como estratégia didática, sem fabricar registros de questões ou de desempenho.
- Ao concluir a lista de tópicos prioritários, o sistema deve iniciar uma nova rodada de revisão/questões com o mesmo conteúdo-fonte, sem criar novos tópicos.
- O calendário deve ser determinístico: a mesma versão dos dados e a mesma data devem gerar a mesma agenda, salvo ajuste manual futuro.

### 8.5 Proteção da programação atual

Não apagar `CICLOS_ESTUDO`, `StudySession`, IDs como `C1-S1` etc., progresso atual, `completedBlocks` ou anotações. O calendário novo deve ser introduzido sem reinterpretar silenciosamente os registros antigos.

A área abaixo do calendário poderá reutilizar os cartões e descrições existentes, mas as novas atribuições por data devem usar identificadores próprios e estáveis. Se for necessário manter a navegação antiga dos ciclos, apresentá-la em área secundária ou em seção recolhível, sem competir com o calendário como elemento principal.

Não converter um ciclo antigo em uma data de 2027 sem uma regra de migração aprovada. Conclusões antigas devem continuar disponíveis exatamente como estavam.

---

## 9. CRONÔMETRO DE FOCO — 50 MINUTOS DE ESTUDO / 20 MINUTOS DE DESCANSO

### 9.1 Reutilizar o cronômetro existente

Modificar `DailySessionModal.tsx` e sua integração com `StudySchedule`/`App.tsx`. Não criar um segundo cronômetro flutuante independente.

A experiência deve abrir ao clicar em iniciar estudo em um bloco do calendário ou no painel diário. O tópico selecionado deve acompanhar a execução para que os minutos sejam associados ao conteúdo correto.

### 9.2 Dimensão e aparência

- Exibir uma janela de foco centralizada que ocupe aproximadamente 50% da área útil da tela em desktop (referência de 50% de largura e altura, limitada por dimensões máximas para legibilidade).
- Em tablet, reduzir proporcionalmente; em celular, utilizar largura total disponível com margens seguras.
- Usar algarismos grandes e fonte tabular para a contagem regressiva.
- Estado de estudo: fundo azul forte, texto branco e contraste alto.
- Estado de descanso: fundo vermelho forte, texto branco e contraste alto.
- Mostrar claramente `ESTUDO` ou `DESCANSO`, o tempo restante e o total líquido acumulado no dia.
- Incluir controles de iniciar, pausar, retomar, encerrar e, quando apropriado, avançar para a próxima fase com confirmação.
- A mudança de cor deve ocorrer automaticamente ao terminar o período.
- Respeitar `prefers-reduced-motion`; não usar animações intensas que atrapalhem a concentração.

### 9.3 Sequência temporal obrigatória

1. Iniciar com **50 minutos de estudo** (fundo azul, texto branco).
2. Ao zerar, tocar o alarme e iniciar **20 minutos de descanso** (fundo vermelho, texto branco), desde que ainda exista meta diária pendente.
3. Ao zerar o descanso, tocar o alarme e iniciar novo período de **50 minutos de estudo** (azul/branco).
4. Em um dia iniciado do zero, depois dos dois blocos de 50 minutos de foco (100 minutos líquidos), iniciar mais **20 minutos de descanso** e, em seguida, um último bloco de **20 minutos de estudo** para completar os 120 minutos líquidos.
5. Ao terminar os 120 minutos líquidos, tocar o alarme e encerrar a sequência. Não iniciar outro descanso depois que a meta diária for atingida.

A meta é de **120 minutos líquidos de estudo por dia útil**, exclusivamente de segunda a sexta-feira. Sábado e domingo são descanso. O descanso do cronômetro não entra na soma do tempo estudado.

A duração de cada etapa de foco será `min(50 minutos, saldo restante da meta diária)`. Assim, se o estudante já tiver minutos registrados antes de iniciar, o próximo bloco será ajustado ao saldo. Em um dia iniciado do zero, a sequência completa será **50 min foco → 20 min descanso → 50 min foco → 20 min descanso → 20 min foco**. O último bloco de foco termina a sessão diária; não acrescentar descanso depois dele. Nunca somar o tempo de descanso à meta líquida.

Caso o usuário pause, o tempo pausado não conta. Caso encerre a sessão antes do fim, registrar somente os segundos de foco efetivamente transcorridos.

### 9.4 Acúmulo diário

- Somar automaticamente cada segmento de foco concluído ou interrompido ao total da data local em que ocorreu.
- Contabilizar apenas tempo de foco; não contar descanso, pausa, modal aberto sem cronômetro ativo ou sessão planejada não iniciada.
- Exibir `Tempo estudado hoje`, `Meta 02h00`, `Tempo restante` e progresso percentual.
- O acumulado deve permanecer correto após fechar o modal, trocar de aba, atualizar a página ou reabrir o navegador.
- Se uma sessão atravessar a meia-noite, dividir os segundos entre as datas locais correspondentes.
- Impedir duplicação de segmento por duplo clique, callback repetido ou restauração do estado.
- Permitir mais de uma sessão por dia, somando-as no mesmo total diário.
- O total semanal deve ser a soma dos registros de foco de segunda a sexta-feira, com meta semanal de 600 minutos (10 horas). Sábado e domingo continuam sendo descanso e não entram na meta planejada.

### 9.5 Persistência e compatibilidade

Criar chaves novas, versionadas e específicas, sem reutilizar chaves de significado diferente. Sugestão de nomes:

- `transpetro_pomodoro_focus_logs_v1` — segmentos de foco realizados.
- `transpetro_pomodoro_active_state_v1` — fase ativa, início, restante, pausa e tópico associado.
- `transpetro_calendar_progress_v1` — progresso específico das datas geradas, se necessário.

Os nomes finais podem seguir a convenção interna já identificada, mas precisam ser estáveis e documentados.

Cada segmento deve ter ID único, data local, `startedAt`, `endedAt`, `durationSeconds`, `topicId`/`sessionId` quando aplicável, tipo `focus` e estado de conclusão/interrupção. Não persistir descansos como tempo estudado.

Incluir os novos dados no tipo e nas funções de `BackupDataPayload` em `src/utils/backupStorage.ts`, na exportação, importação, restauração e nas mesclagens de `src/utils/driveSync.ts`.

Regras de mesclagem:

- Deduplicar segmentos por ID único.
- Não somar duas vezes segmentos repetidos.
- Unir logs locais/remotos mantendo os registros de ambos.
- Preservar chaves desconhecidas e antigas.
- Backups que não tenham as novas chaves devem restaurar normalmente, interpretando ausência como lista vazia/estado inativo.
- Não remover ou renomear nenhuma chave anterior.

O cronômetro ativo deverá usar timestamps absolutos e recalcular o restante ao reabrir a aplicação, em vez de confiar apenas na quantidade de disparos de `setInterval`.

### 9.6 ALARME SONORO AO ZERAR CADA FASE

O cronômetro deverá emitir um alerta sonoro audível sempre que uma contagem regressiva chegar a zero:

- Fim dos 50 minutos (ou de um bloco de foco reduzido para completar a meta): tocar o alerta e, se ainda houver meta diária pendente, mudar para `DESCANSO` por 20 minutos.
- Fim dos 20 minutos de descanso: tocar o alerta e iniciar a próxima etapa de foco, se ainda houver meta diária pendente.
- Fim do último bloco necessário para atingir os 120 minutos líquidos: tocar o alerta, interromper a sequência automaticamente e mostrar `META DIÁRIA CONCLUÍDA`.

**Implementação técnica:**

1. Gerar o som localmente com a Web Audio API (`AudioContext`/oscilador), sem depender de arquivo remoto, internet ou biblioteca adicional.
2. Criar/liberar o contexto de áudio a partir do clique explícito em `Iniciar estudo`, para respeitar as políticas de áudio automático dos navegadores.
3. Emitir uma sequência curta de bipes distintos e perceptíveis, sem volume agressivo. A mesma rotina deve ser usada no fim de foco e de descanso.
4. Adicionar controle `Som ligado/desligado` no cronômetro, ligado por padrão, e ação `Testar som` para o usuário verificar o áudio.
5. Garantir que cada conclusão de fase dispare apenas um alerta, mesmo com múltiplos renders, callbacks ou reabertura da aplicação. Usar um identificador de evento/fase já processada.
6. Se a aba estiver em segundo plano e o navegador atrasar a execução, ao retornar detectar que o prazo terminou, avançar o estado correto e tocar apenas um alerta referente à transição pendente; não reproduzir vários bipes acumulados.
7. Se o navegador bloquear o áudio até uma nova interação, mostrar também um aviso visual `Tempo encerrado` e tocar o alerta assim que o usuário interagir novamente, sem perder o evento.
8. O alarme é local ao navegador: não pode tocar enquanto o navegador/aplicativo estiver totalmente fechado. Nesse caso, ao reabrir o app, apresentar o aviso de fase encerrada/retomada e executar o som após a primeira interação permitida pelo navegador. Não prometer alarme de sistema operacional.

### 9.7 RETOMAR DE ONDE O ESTUDANTE PAROU AO ABRIR O APP

Ao abrir ou atualizar a aplicação, o estudante deve enxergar claramente qual era o último assunto/atividade em andamento e ter uma ação direta para continuar, sem precisar procurar manualmente o ponto anterior.

**Comportamento obrigatório na inicialização:**

1. `App.tsx` deve recuperar o estado persistido do cronômetro, o último contexto de estudo e os registros de foco antes de montar a experiência de retomada.
2. Se houver um cronômetro iniciado e não finalizado, mostrar um modal/cartão de destaque `Continuar de onde parei`, contendo disciplina/macroárea, tópico, data, fase (`ESTUDO` ou `DESCANSO`), tempo restante salvo e tempo líquido já acumulado no dia.
3. Ao abrir a aplicação novamente, não reiniciar a contagem do zero. Restaurar a fase e o tempo restante do último checkpoint, deixando o cronômetro em estado pausado até o usuário clicar em `Retomar cronômetro`. O período em que o app ficou fechado não deve ser contado como estudo nem como descanso.
4. Se não houver cronômetro inacabado, identificar a próxima atividade ainda não concluída do dia útil atual. Exibir a matéria/tópico, a data, os minutos já estudados e o saldo até a meta de 2h.
5. Se não houver atividade pendente para hoje, apresentar o último tópico/contexto de estudo salvo e oferecer `Continuar neste assunto` e `Abrir planejamento`. Não inventar uma atividade ou marcar conteúdo como concluído.
6. Não iniciar o cronômetro automaticamente ao abrir o app. O usuário sempre confirma a retomada com um clique.
7. O modal/cartão deve oferecer `Continuar`, `Ver planejamento` e `Agora não`. Ao escolher `Agora não`, fechar a janela sem apagar o ponto salvo; manter um cartão compacto de retomada na primeira aba (`EditalSummary`) e na aba Ciclos de Estudo, sem criar uma nova Home ou uma nova aba.
8. Depois de retomar, salvar novamente o estado e continuar a partir dos segundos restantes. Ao concluir/encerrar explicitamente uma sessão, atualizar o ponteiro para a próxima atividade pendente, quando houver.
9. Em sábado/domingo, não sugerir atividade programada para o próprio dia. Se existir uma sessão interrompida em dia útil anterior, oferecer retomada desse contexto; caso contrário, mostrar o próximo dia útil planejado ou o último assunto estudado.
10. Se não houver histórico nem contexto salvo, não exibir modal vazio; iniciar normalmente na tela padrão do aplicativo.

**Dados mínimos para recuperação:**

- Criar a chave versionada `transpetro_study_resume_state_v1`, contendo apenas o ponteiro de retomada: `updatedAt`, `dateKey`, `scheduleBlockId`, `topicId`, `macroAreaId` (quando aplicável) e `lastAction` (`selected`, `started`, `paused`, `interrupted` ou `completed`).
- Manter os segundos restantes, a fase e o status efetivo do cronômetro em `transpetro_pomodoro_active_state_v1`, sem duplicar esses campos na chave de retomada.
- Atualizar o ponteiro quando o usuário seleciona um bloco, inicia, pausa, retoma, encerra ou conclui uma sessão.
- Persistir o estado do cronômetro a cada transição e em checkpoints periódicos curtos (recomendação: até 5 segundos), além de tentar salvar em `pagehide`/`visibilitychange`. Não depender somente desses eventos de fechamento, pois o navegador pode encerrar o processo sem aviso.
- Se o app for encerrado inesperadamente, retomar do último checkpoint persistido, aceitando no máximo a pequena diferença do intervalo de checkpoint. Nunca converter o tempo sem checkpoint em tempo estudado.
- Integrar a nova chave ao backup/restauração JSON e à mesclagem Google Drive. Em conflito, preservar o ponteiro mais recente por `updatedAt`, sem sobrescrever logs de foco já registrados.

**Apresentação da retomada:**

- Título: `Continuar de onde parei`.
- Mostrar em destaque: `Você estava estudando: [nome do tópico]`.
- Se houver sessão inacabada, mostrar `Faltavam MM:SS` e a fase do cronômetro.
- Mostrar `Hoje: XhYYmin de 2h00` calculado a partir dos logs reais, não de estimativas.
- Botão principal: `Retomar estudo` ou `Retomar cronômetro`, conforme o estado.
- Botão secundário: `Ver planejamento`.
- Ao descartar/fechar o cartão, preservar a retomada até o usuário concluir, substituir ou limpar explicitamente o contexto.

### 9.8 Relação entre cronômetro e conclusão do estudo

- Atingir 120 minutos líquidos pode marcar a meta diária como cumprida, mas não marcar automaticamente todos os tópicos como dominados ou com teoria concluída.
- Marcar manualmente uma sessão como concluída não pode acrescentar 120 minutos fictícios.
- O tempo do cronômetro é a única fonte do indicador de tempo líquido desta nova funcionalidade.
- As chaves antigas `transpetro_completed_days_v2` e `transpetro_completed_blocks_v1` continuam representando os estados antigos de conclusão, não minutos efetivamente estudados.
- Não criar questões, acertos, erros, páginas lidas ou videoaulas apenas por decorrer tempo no cronômetro.

---

## 10. ADAPTAÇÃO DOS DEMAIS RECURSOS DOS PROMPTS

### 10.1 Indicadores compactos (aproveitamento parcial dos Prompts 02 e 09)

Incluir na área de Ciclos de Estudo, sem uma nova aba, indicadores pequenos e reais:

- Minutos líquidos estudados hoje.
- Meta diária de 120 minutos nos dias úteis e percentual atingido; fins de semana sem meta.
- Minutos líquidos estudados na semana.
- Quantidade de dias com pelo menos um segmento de foco.
- Distribuição do tempo por macroárea, quando o segmento possuir `topicId` associado.
- Tópicos do dia e sua prioridade Pareto.

Não exibir taxa de acerto se não houver registros confiáveis de questões respondidas. Não inferir constância com base apenas em checkbox antigo.

### 10.2 Histórico mínimo do cronômetro (aproveitamento parcial do Prompt 07)

Não implementar a tela de Histórico Geral/Histórico por Disciplina nesta etapa. A necessidade desta implementação é apenas auditar e acumular tempo real.

Manter uma lista interna de segmentos de foco, vinculada ao dia e ao tópico. Se futuramente for aprovado um módulo Histórico, essa estrutura poderá servir como fonte para ele, evitando criar uma segunda base.

### 10.3 Revisões (Prompt 08)

Não implementar agora. O relatório anexado sobre Revisões no ESTUDAI é apenas um registro de outro projeto. Não criar abas ou estados de revisão no Pareto Recursivo nesta solicitação.

---

## 11. ARQUIVOS E COMPONENTES PROVAVELMENTE AFETADOS

A lista abaixo é uma previsão fundamentada na auditoria estática. O Google AI Studio deve confirmar o código atual antes de editar.

| Arquivo | Mudança prevista | Nível de atenção |
|---|---|---|
| `src/components/StudySchedule.tsx` | Calendário, seleção de data, agenda diária, metas e ligação com cronômetro | Alto |
| `src/components/DailySessionModal.tsx` | Sequência 50/20, visual azul/vermelho, pausa/retomada, alarme sonoro e registro de tempo líquido | Alto |
| `src/components/EditalSummary.tsx` | Reaproveitar `MaterialLinksSection` na primeira aba | Médio |
| `src/components/TabMaterialEstudo.tsx` | Retirar somente o bloco inferior global de links | Baixo |
| `src/components/MaterialLinksSection.tsx` | Reutilização global; alterar apenas se a API atual não atender ao primeiro tab | Médio |
| `src/components/EditalVerticalizado.tsx` | Ordenação macro/tópicos por Pareto e badges | Médio/alto |
| `src/components/ParetoMatrix.tsx` | Ordenação explícita macro/meso/micro e badges Química/Física | Médio |
| `src/components/CutRules.tsx` | Ordenação Pareto e badges quando houver vínculo exato | Médio |
| `src/components/BancaCesgranrio.tsx` | Badges/ordem temática quando houver vínculo confiável | Médio |
| `src/components/ErrorNotebook.tsx` | Badges e prioridade Pareto em registros associados | Médio |
| `src/components/NavigationTabs.tsx` | Somente se for necessário algum indicador de fase; não adicionar nova aba | Baixo |
| `src/data/scheduleData.ts` | Reutilizar/estender modelos sem apagar ciclos antigos | Alto |
| `src/data/verticalSyllabusData.ts` | Adicionar metadados de classificação somente se necessário, preservando IDs e dados atuais | Alto |
| `src/data/paretoData.ts` | Fonte dos pesos; evitar alteração de números sem validação | Alto |
| `src/utils/backupStorage.ts` | Incluir logs/estado novo do cronômetro no backup JSON | Muito alto |
| `src/utils/driveSync.ts` | Mesclagem e deduplicação dos novos logs | Muito alto |
| `src/App.tsx` | Ligar cronômetro, calendário e exibição da retomada automática ao abrir o app | Muito alto |
| Novo `src/components/StudyResumePrompt.tsx` (ou componente equivalente) | Modal/cartão global `Continuar de onde parei`, sem criar nova aba | Alto |
| Novo `src/utils/studyResume.ts` (ou integração equivalente) | Recuperar e atualizar o ponteiro de retomada com IDs estáveis | Médio |
| Novo `src/utils/subjectClassification.ts` | Classificação canônica de Química/Física | Baixo/médio |
| Novo componente de badge compartilhado | Apresentação uniforme da categoria | Baixo |

Não editar `package.json`, `vite.config.ts`, `tsconfig.json`, `src/main.tsx` ou infraestrutura global sem justificativa técnica explícita.

---

## 12. FLUXO DE IMPLEMENTAÇÃO NO GOOGLE AI STUDIO

Executar em etapas controladas. Não pedir à IA para aplicar todos os prompts originais em bloco.

### Etapa 1 — Inspeção e plano de alteração

1. Ler `docs/INVENTARIO_TECNICO_CONTRATO_PRESERVACAO.md` e `docs/INVENTARIO_TECNICO_MANIFESTO.json`.
2. Inspecionar os arquivos atuais, inclusive quaisquer alterações feitas desde a auditoria.
3. Confirmar os schemas e tipos de LocalStorage, backup, cronômetro e progresso.
4. Verificar todos os vínculos dos 42 tópicos e conferir a classificação Química/Física.
5. Produzir uma lista de arquivos que serão alterados, sem editar ainda.
6. Identificar possíveis conflitos entre os ciclos antigos e o calendário novo.

### Etapa 2 — Classificação e ordenação Pareto

1. Criar o classificador canônico de Química/Física.
2. Criar funções puras de ordenação Pareto para macro, meso, micro e tópicos.
3. Aplicar as funções nas abas com conteúdo temático.
4. Testar filtros, busca, expansão/recolhimento e estabilidade dos IDs.

### Etapa 3 — Transferência da central global de materiais

1. Inserir a mesma instância funcional de `MaterialLinksSection` em `EditalSummary` em visão global.
2. Retirar somente a seção global de links do rodapé de `TabMaterialEstudo`.
3. Confirmar que os dados na chave atual continuam sendo lidos e salvos sem migração.

### Etapa 4 — Calendário e agenda Pareto

1. Implementar no topo de `StudySchedule` o calendário mensal no modelo da imagem enviada: barra `Hoje`/setas/mês-ano/visualização e grade de sete colunas, com todos os rótulos em português.
2. Implementar as visualizações `Semana`, `Mês` e `Agenda`, com `Mês` como padrão, sem duplicar a fonte dos eventos.
3. Implementar seleção de data, popover de evento e painel diário abaixo.
4. Gerar a agenda de janeiro a março apenas a partir dos tópicos elegíveis de Química/Física.
5. Gerar a agenda de abril a outubro com todas as macroáreas, usando quotas Pareto.
6. Garantir 120 minutos por dia de segunda a sexta-feira; sábado e domingo sem estudo.
7. Manter dados antigos de ciclo, notas e conclusões sem reinterpretá-los.

### Etapa 5 — Cronômetro e registro de tempo líquido

1. Adaptar `DailySessionModal` para ciclo 50/20.
2. Ajustar apresentação azul/branco no foco e vermelho/branco no descanso.
3. Implementar contagem baseada em timestamp, com pausa e retomada.
4. Associar cada sessão ao tópico da agenda.
5. Registrar somente tempo de foco e agregar por data local.
6. Adicionar persistência versionada e integração de backup/Drive.
7. Implementar a limitação do último bloco para completar exatamente 120 minutos líquidos.
8. Implementar o alarme sonoro para cada fase concluída, com controle de som e prevenção de alertas duplicados.
9. Persistir checkpoints e recuperar o último contexto de estudo sem contar o tempo em que o app ficou fechado.

### Etapa 6 — Retomada e experiência de abertura

1. Implementar `Continuar de onde parei` na inicialização global do app.
2. Exibir o último tópico ou a próxima atividade pendente, com tempo real já estudado e saldo da meta diária.
3. Não iniciar o cronômetro automaticamente; exigir confirmação em `Retomar estudo`.
4. Manter um atalho compacto de retomada na primeira aba (`EditalSummary`) e em Ciclos de Estudo, sem criar uma nova tela inicial.
5. Testar atualização, fechamento inesperado, reabertura e restauração de backup.

### Etapa 7 — Indicadores, acessibilidade e responsividade

1. Exibir tempo do dia/semana e progresso da meta.
2. Revisar contraste, teclado, foco visível, leitores de tela e estados vazios.
3. Respeitar `prefers-reduced-motion`.
4. Validar desktop, tablet e celular.

### Etapa 8 — Regressão e entrega

Executar todos os testes da seção 13. Apresentar a lista exata de arquivos alterados, novas chaves, migrações, decisões técnicas e resultados reais dos comandos.

---

## 13. CRITÉRIOS DE ACEITAÇÃO E TESTES OBRIGATÓRIOS

### 13.1 Preservação

- [ ] As oito abas continuam existindo com os mesmos IDs.
- [ ] Nenhuma funcionalidade não relacionada foi removida.
- [ ] Os 42 IDs de tópicos, códigos de edital, dados Pareto e progresso permanecem íntegros.
- [ ] As chaves LocalStorage antigas continuam sendo lidas.
- [ ] Os ciclos, sessões, blocos concluídos e anotações anteriores permanecem disponíveis.

### 13.2 Destaques Química/Física

- [ ] Química e Física aparecem com badges textuais consistentes nas abas com dados temáticos.
- [ ] Os tópicos são classificados por ID estável.
- [ ] `qui-13` a `qui-15` não são tratados automaticamente como nivelamento de Química básica.
- [ ] `inst-08` e `inst-10` só entram em Física básica após conferência do conteúdo.
- [ ] O badge não substitui a identificação da origem Transpetro/Petrobras.
- [ ] Itens sem classificação confiável não recebem rótulo inventado.

### 13.3 Ordenação Pareto

- [ ] Macroáreas exibidas de maior para menor peso.
- [ ] Mesoáreas exibidas de maior para menor peso dentro da macroárea.
- [ ] Microáreas e tópicos exibidos de maior para menor incidência.
- [ ] Filtros e buscas preservam a ordem relativa dos resultados.
- [ ] Os arrays de dados originais não são mutados.
- [ ] Empates possuem desempate determinístico.

### 13.4 Materiais

- [ ] Os cards globais não aparecem mais no rodapé de Material de Estudos.
- [ ] O cadastro global de materiais aparece na primeira aba Edital.
- [ ] Links já existentes permanecem disponíveis.
- [ ] Adicionar, editar, excluir, filtrar e abrir links continuam funcionando.
- [ ] A chave `transpetro_material_links_v1` não é trocada.
- [ ] Exportação e restauração mantêm os materiais.

### 13.5 Calendário

- [ ] Barra superior segue a referência: `Hoje`, setas, mês/ano e controles `Semana`, `Mês`, `Agenda`.
- [ ] Toda a interface e todos os popovers estão em português do Brasil.
- [ ] Grade mensal possui sete colunas Seg–Dom e começa na segunda-feira.
- [ ] Selecionar uma data atualiza o painel diário abaixo sem recarregar a aplicação.
- [ ] Selecionar um evento abre detalhes em português, sem iniciar o cronômetro automaticamente.
- [ ] Datas selecionada e atual possuem destaques visualmente diferentes.
- [ ] Calendário mensal aparece antes do painel de descrição diária.
- [ ] Navegação de janeiro a outubro de 2027 funciona.
- [ ] Selecionar um dia atualiza corretamente o painel abaixo.
- [ ] Segunda a sexta-feira possuem 120 minutos planejados por dia.
- [ ] Sábado e domingo aparecem como descanso, sem eventos nem meta.
- [ ] Janeiro, fevereiro e março só atribuem assuntos elegíveis de Química/Física.
- [ ] Abril a outubro distribuem as quatro macroáreas por peso Pareto.
- [ ] A soma semanal é 600 minutos (10 horas).
- [ ] A soma dos blocos de cada dia é 120 minutos.
- [ ] O gerador não repete sempre o mesmo tópico e cobre progressivamente o conjunto elegível.
- [ ] Datas fora do intervalo não recebem plano inventado.

### 13.6 Cronômetro

- [ ] Foco começa com 50:00 e usa fundo azul com texto branco.
- [ ] Descanso começa com 20:00 e usa fundo vermelho com texto branco.
- [ ] A sequência alterna foco e descanso automaticamente.
- [ ] Pausa não contabiliza tempo.
- [ ] Descanso não contabiliza tempo estudado.
- [ ] Encerrar antes do fim registra somente os segundos de foco efetivamente realizados.
- [ ] Atualizar/reabrir a página não reinicia nem duplica o tempo.
- [ ] O alarme sonoro toca uma única vez quando cada fase chega a zero.
- [ ] O controle de som desliga/liga o alarme e `Testar som` confirma a saída de áudio.
- [ ] Se a aba estiver suspensa, o cronômetro recupera a fase correta e não repete alertas acumulados.
- [ ] Se o navegador estiver fechado, o app mostra a fase encerrada/retomada ao reabrir; não promete som enquanto fechado.
- [ ] O tempo é agregado à data local correta.
- [ ] A meta de 120 minutos líquidos é respeitada, incluindo o último bloco parcial de 20 minutos quando aplicável.
- [ ] O total diário permanece correto após várias sessões no mesmo dia.

### 13.7 Retomada ao abrir o aplicativo

- [ ] Ao reabrir o app com sessão interrompida, aparece `Continuar de onde parei` com disciplina/tópico e fase corretos.
- [ ] O tempo restante é recuperado do último checkpoint e não volta para 50:00 nem 20:00 sem motivo.
- [ ] O tempo em que o navegador ficou fechado não é contabilizado como estudo.
- [ ] O cronômetro só continua depois de clicar em `Retomar estudo`.
- [ ] Ao selecionar `Agora não`, o contexto permanece salvo e disponível no cartão compacto.
- [ ] Sem sessão ativa, a próxima atividade pendente do dia útil é apresentada.
- [ ] Em sábado/domingo, não é sugerida uma sessão programada para o próprio dia.
- [ ] Sem histórico/contexto prévio, o app abre normalmente sem modal vazio.

### 13.8 Backup, Drive e regressão

- [ ] Backup JSON antigo restaura sem exigir as novas chaves.
- [ ] Backup novo exporta logs de foco, estado do cronômetro e ponteiro de retomada.
- [ ] Importação não duplica logs.
- [ ] Mesclagem local/remota preserva logs de ambos os lados por ID.
- [ ] O comportamento antigo de sincronização Google Drive continua intacto.
- [ ] `npm run build` executa sem erros.
- [ ] `npm run lint` (que no projeto atual executa `tsc --noEmit`) executa sem erros.
- [ ] Testes automatizados existentes e novos testes relacionados executam sem falha.

---

## 14. TESTES DE CÁLCULO DO CRONOGRAMA

A implementação deve validar automaticamente as seguintes invariantes:

```ts
const STUDY_DAYS_PER_WEEK = 5;
const DAILY_TARGET_MINUTES = 120;
const WEEKLY_TARGET_MINUTES = STUDY_DAYS_PER_WEEK * DAILY_TARGET_MINUTES;

// Deve resultar em 600 minutos (10 horas líquidas por semana).
```

Para abril a outubro, validar a distribuição arredondada:

```ts
const weeklyParetoMinutes = {
  quimica: 235,
  mecanicaFluidos: 210,
  instrumentacao: 100,
  eletricidade: 55,
};

// Soma obrigatória: 600 minutos (valores de referência arredondados em blocos de 5 min).
```

O teste deve provar que a grade de cinco dias úteis fecha 120 minutos em cada dia e 600 na semana. Sábado e domingo devem totalizar zero minutos planejados. A distribuição por tópico deve ser calculada dinamicamente a partir de `mappedQuestions`, `paretoSharePct` e da hierarquia Pareto, não de números inventados.

Para janeiro a março, o teste deve confirmar que todos os tópicos atribuídos pertencem ao conjunto de IDs permitidos da fase de nivelamento e que nenhum tópico de instrumentação não autorizado, operações unitárias, refino ou SMS aparece no calendário.

---

## 15. LIMITES DE ESCOPO — NÃO IMPLEMENTAR NESTA RODADA

Não implementar, mesmo que apareçam nos prompts originais:

- Cadastro de múltiplos planos e objetivos de estudo.
- Importação genérica de planilhas para criar planos.
- Uma nova Home independente.
- Novo módulo semanal separado do Ciclos de Estudo.
- Formulário completo de registro de estudos com histórico paralelo.
- Histórico geral e histórico por disciplina como nova aba.
- Módulo de Revisões com estados programadas/atrasadas/ignoradas/concluídas.
- Módulo de Estatísticas como nova aba.
- Firebase, Supabase, banco externo ou autenticação nova.
- Recriação de design system ou troca da identidade visual.
- Substituição das oito abas ou mudança dos seus IDs.

Esses itens podem ser avaliados posteriormente em um escopo independente, desde que haja uma decisão explícita.

---

## 16. ENTREGA TÉCNICA ESPERADA DO GOOGLE AI STUDIO

Ao concluir, apresentar:

1. Resumo objetivo das melhorias efetivamente implementadas.
2. Relação dos arquivos criados e alterados.
3. Classificação Química/Física aplicada e respectivos IDs.
4. Regra de ordenação Pareto implementada em cada aba.
5. Demonstração da distribuição semanal e mensal do cronograma de 2027.
6. Explicação do cálculo dos 120 minutos líquidos por dia e das pausas.
7. Novas chaves LocalStorage e esquema de cada registro do cronômetro.
8. Ajustes realizados em backup/restauração e mesclagem Google Drive.
9. Resultado real de `npm run build`, `npm run lint` e testes.
10. Limitações, pendências e qualquer requisito que não tenha sido concluído.

**Não declarar concluído um item que esteja apenas desenhado visualmente.** Calendário, cronômetro, seleção de datas, contagem de tempo, filtros, ordenação, persistência e backup precisam funcionar de ponta a ponta.

---

## 17. INSTRUÇÃO FINAL — COPIAR PARA O GOOGLE AI STUDIO

Use este documento como especificação consolidada para evoluir o projeto Petrobras/Transpetro — Pareto Recursivo. Antes de implementar, inspecione o código atual e confronte-o com o inventário técnico. Implemente somente as adaptações classificadas como compatíveis e as mudanças específicas definidas neste documento.

Priorize nesta ordem: **(1) preservação dos dados e da arquitetura; (2) classificação Química/Física e ordenação Pareto; (3) transferência dos cards globais de materiais para Edital; (4) calendário de janeiro a outubro de 2027 com duas horas por dia; (5) cronômetro 50/20 com contabilização de tempo líquido e backup; (6) indicadores compactos.**

Não substitua a plataforma por um modelo genérico, não copie a arquitetura do ESTUDAI, não crie abas duplicadas, não apague ciclos ou dados existentes e não altere números de incidência sem rastreabilidade. Se encontrar diferença entre este documento e o código atual, preserve os dados existentes e apresente a divergência antes de qualquer migração irreversível.
