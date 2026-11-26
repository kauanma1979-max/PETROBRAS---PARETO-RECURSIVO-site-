# INVENTÁRIO TÉCNICO E CONTRATO DE PRESERVAÇÃO
## Plataforma Petrobras/Transpetro — Pareto Recursivo

**Versão:** 1.0  
**Base:** ZIP fornecido em 25/11/2026  
**Tipo de auditoria:** inspeção estática do código-fonte  
**Integridade:** nenhum arquivo original foi alterado durante a auditoria.

## 1. Objetivo

Este documento registra a estrutura identificada e funciona como contrato de preservação para futuras atualizações no Google AI Studio.

**Regra central:** novas melhorias devem adaptar-se ao sistema existente. Não reconstruir, redesenhar, simplificar ou substituir módulos, dados, integrações ou configurações como efeito colateral de uma solicitação pontual.

O inventário deve ser atualizado somente após mudanças efetivamente implementadas e verificadas.

## 2. Arquitetura identificada

| Camada | Tecnologia |
|---|---|
| Interface | React 19 |
| Linguagem | TypeScript |
| Build/dev | Vite 6 |
| Estilização | Tailwind CSS 4 |
| Animações | Motion 12 + CSS |
| Ícones | Lucide React |
| Persistência | LocalStorage |
| Backup | JSON |
| Drive | Google Apps Script / JSONP |

Scripts declarados em `package.json`:
- `npm run dev`: Vite na porta 3000.
- `npm run build`: build de produção.
- `npm run preview`: pré-visualização do build.
- `npm run lint`: `tsc --noEmit` (verificação TypeScript, não ESLint).

## 3. Mapa de navegação

A lista é definida em `src/components/NavigationTabs.tsx` e montada em `src/App.tsx`.

| ID | Rótulo | Componente | Responsabilidade |
|---|---|---|---|
| `edital` | Edital (Em Breve) | EditalSummary | Resumo/estado dos editais e navegação |
| `verticalizado` | Edital Verticalizado | EditalVerticalizado | Conteúdo unificado, filtros e progresso |
| `pareto` | Pareto Recursivo | ParetoMatrix | Matriz macro/meso/micro |
| `material` | Material de Estudos | TabMaterialEstudo | Materiais por módulo/seção |
| `cronograma` | Ciclos de Estudo | StudySchedule | Ciclos, sessões, blocos e anotações |
| `cortes` | Regras de Corte | CutRules | Priorização, redução e corte |
| `banca` | Raio-X Bancas | BancaCesgranrio | Perfil de bancas e pares conceituais |
| `caderno` | Caderno de Erros | ErrorNotebook | Registro e análise de erros |

### Elementos globais
- `Header`: progresso, exportação de relatório, backup/Drive e reinício dos ciclos.
- `BackupRestoreModal`: backup/restauração e painel Drive.
- `FormulaCalculatorModal`: calculadora de fórmulas.
- `DailySessionModal`: cronômetro e conclusão de sessão.
- `ConfirmDialog`: confirmação do reinício.
- Rodapé com identificação das bases e totais.

**Observação:** a aba Edital exibe o rótulo “Edital (Em Breve)”, mas `EditalSummary` já é renderizado. Não presumir ausência do módulo apenas pelo rótulo.

## 4. Inventário de componentes

| Arquivo | Função observada |
|---|---|
| `src/components/App.tsx` | Composição principal; controla aba ativa, progresso, modais, restauração e eventos de sincronização. |
| `src/components/Header.tsx` | Cabeçalho, indicadores de progresso e ações globais. |
| `src/components/NavigationTabs.tsx` | Navegação principal por oito abas, com indicador animado. |
| `src/components/EditalSummary.tsx` | Resumo/estado dos editais e atalhos de navegação. |
| `src/components/EditalVerticalizado.tsx` | Conteúdo programático unificado, filtros e progresso por tópico. |
| `src/components/ParetoMatrix.tsx` | Matriz Pareto macro/meso/micro, pesos, incidência e núcleo prioritário. |
| `src/components/TabMaterialEstudo.tsx` | Material de estudos por módulo e seção; integra calculadora, links e mapas mentais. |
| `src/components/MaterialLinksSection.tsx` | Cadastro, edição e apresentação de links e arquivos de apoio. |
| `src/components/MindMapSection.tsx` | Cadastro, edição e visualização de mapas mentais. |
| `src/components/StudySchedule.tsx` | Ciclos, sessões, blocos, filtros e anotações. |
| `src/components/DailySessionModal.tsx` | Cronômetro/execução e conclusão de sessão. |
| `src/components/CutRules.tsx` | Regras de priorização, redução e corte de conteúdos. |
| `src/components/BancaCesgranrio.tsx` | Perfil comparativo Cesgranrio/Cebraspe e pares conceituais. |
| `src/components/ErrorNotebook.tsx` | Caderno de erros e indicadores/projeções de rendimento. |
| `src/components/FormulaCalculatorModal.tsx` | Calculadora/modal de fórmulas. |
| `src/components/BackupRestoreModal.tsx` | Exportação, importação/restauração e acesso ao Drive. |
| `src/components/DriveSyncPanel.tsx` | Configuração e operação da integração com Google Drive. |
| `src/components/PetrobrasLogo.tsx` | Componente visual de logotipo/identidade. |
| `src/components/ui/Button.tsx` | Botão reutilizável. |
| `src/components/ui/Card.tsx` | Card reutilizável. |
| `src/components/ui/ConfirmDialog.tsx` | Diálogo reutilizável de confirmação. |
| `src/components/ui/EmptyState.tsx` | Estado vazio reutilizável. |
| `src/components/ui/Modal.tsx` | Estrutura reutilizável de modal. |
| `src/components/ui/OriginBadge.tsx` | Identificação da origem: Transpetro, Petrobras ou ambos. |
| `src/components/ui/ProgressBar.tsx` | Barra de progresso reutilizável. |
| `src/components/ui/StatusBadge.tsx` | Indicador de status reutilizável. |
| `src/components/ui/ToastBanner.tsx` | Avisos/toasts reutilizáveis. |
| `src/components/ui/index.ts` | Export central dos componentes de interface. |

## 5. Fontes de dados

| Arquivo | Conteúdo |
|---|---|
| `src/data/editalData.ts` | Metadados dos editais-base, bancas, totais e resumo da união. |
| `src/data/verticalSyllabusData.ts` | 42 tópicos unificados, macroáreas, origem, códigos, incidência, prioridade e resumo estratégico. |
| `src/data/paretoData.ts` | Matriz Pareto macro/meso/micro e estatísticas da base de provas. |
| `src/data/materialEstudosData.ts` | Conteúdo didático em módulos/seções, Markdown, fórmulas, tabelas e pontos de prova. |
| `src/data/scheduleData.ts` | Ciclos, sessões, blocos A/B, tipos de sessão, metas e totais. |
| `src/data/cutRulesData.ts` | Regras de priorizar, reduzir e cortar conteúdos. |
| `src/data/bancaData.ts` | Perfil de Cesgranrio/Cebraspe e pares conceituais. |

### Estatísticas registradas no código

Em `src/data/editalData.ts`:
- Transpetro 2026 — Ênfase 4: Dutos e Terminais; 38 itens específicos considerados.
- Petrobras 2023.2 — Ênfase 8: Operação; 32 objetos específicos considerados.
- União declarada: 42 tópicos; 27 em comum, 11 exclusivos Transpetro e 4 exclusivos Petrobras.

Em `src/data/paretoData.ts`:
- 5 provas declaradas: TP 2018, PB 2023.1, PB 2023.2, TP 2023.1 e ANSA 2026.
- 270 questões na base; 266 dentro dos 42 tópicos e 4 excluídas.
- Núcleo de 22 tópicos; corte declarado de 81,2%.

Esses valores foram transcritos do código, não validados independentemente. Não recalcular nem substituir sem fontes rastreáveis e autorização.

## 6. Chaves LocalStorage identificadas

As chaves abaixo foram extraídas de chamadas literais a `localStorage.getItem`, `setItem` ou `removeItem`.

| Chave | Finalidade observada |
|---|---|
| `transpetro_active_tab_v1` | Última aba selecionada. |
| `transpetro_caderno_erros_customized` | Indicador de personalização do Caderno de Erros. |
| `transpetro_completed_days` | Chave legada consultada como fallback do progresso. |
| `transpetro_completed_days_v2` | Progresso das sessões/ciclos concluídos. |
| `transpetro_material_estudo_custom_v1` | Materiais personalizados por seção. |
| `transpetro_material_links_v1` | Links e arquivos de apoio. |
| `transpetro_material_selected_modulo` | Módulo selecionado na área de materiais. |
| `transpetro_schedule_phase_filter` | Filtro de fase no cronograma. |
| `transpetro_schedule_selected_ciclo` | Ciclo selecionado no cronograma. |
| `transpetro_vertical_macro` | Filtro de macroárea. |
| `transpetro_vertical_origem` | Filtro de origem do edital. |
| `transpetro_vertical_prioridade` | Filtro de prioridade. |
| `transpetro_vertical_status` | Filtro de status. |

### Chaves declaradas em `STORAGE_KEYS` e acessadas por constante

| Chave | Finalidade |
|---|---|
| `transpetro_completed_blocks_v1` | Blocos de estudo concluídos. (declarada em `STORAGE_KEYS` e acessada por constante) |
| `transpetro_caderno_erros` | Registros do Caderno de Erros. (declarada em `STORAGE_KEYS` e acessada por constante) |
| `transpetro_edital_verticalizado_progress_v2` | Progresso dos tópicos do edital verticalizado. (declarada em `STORAGE_KEYS` e acessada por constante) |
| `transpetro_schedule_day_notes` | Anotações por dia/sessão do cronograma. (declarada em `STORAGE_KEYS` e acessada por constante) |
| `transpetro_banca_notes_v1` | Anotações relacionadas às bancas. (declarada em `STORAGE_KEYS` e acessada por constante) |

### Regras obrigatórias de persistência
1. Não renomear/remover chaves por conveniência.
2. Não mudar formato persistido sem migração compatível.
3. Não substituir objetos completos quando a operação exigir mesclagem granular.
4. Preservar chaves desconhecidas/legadas durante backup/restauração, salvo autorização.
5. Testar exportação, importação e restauração com backup anterior à mudança.
6. Ausência de chave não autoriza apagar dados.
7. Operações destrutivas exigem backup verificável e plano de reversão.

## 7. Backup e restauração

Arquivo central: `src/utils/backupStorage.ts`.

O tipo `BackupDataPayload` inclui `version`, `app`, timestamps e dados de sessões concluídas, blocos concluídos, caderno de erros, progresso verticalizado, materiais personalizados, links, notas do cronograma, notas da banca e outras chaves de armazenamento.

Funções identificadas:
- `getBackupStats`
- `generateBackupPayload`
- `getBackupJsonString`
- `copyBackupToClipboard`
- `exportFullBackup`
- `exportErrorNotebookJson`
- `restoreFromRawData`
- `importBackupFromJsonString`
- `importFullBackup`
- `notifyDataUpdated`

O backup é componente crítico. Não substituir sem migração e teste de restauração.

## 8. Integração Google Drive

Arquivos centrais: `src/utils/driveSync.ts`, `src/components/DriveSyncPanel.tsx`, `src/components/BackupRestoreModal.tsx` e `src/App.tsx`.

Elementos identificados:
- Normalização de URL Apps Script para `/exec`.
- Preferência de sincronização automática.
- Indicador de validação do endpoint.
- Data da última sincronização.
- Backup pré-sincronização e restauração de segurança.
- Leitura JSON remoto via JSONP (`fetchGoogleDriveDataViaJsonp`).
- Mesclagem local/remota (`mergeTranspetroBackupData`).
- Geração de template Apps Script (`getGoogleAppsScriptTemplate`), cujo código contém `doGet` e `doPost`.

### Limitação verificada
No cliente `App.tsx`, `sincronizarGoogleDrive` chama `fetchGoogleDriveDataViaJsonp`, isto é, o fluxo cliente identificado executa leitura. O evento `drive-json-loaded` cria backup local, mescla e restaura. Não foi identificada chamada cliente de envio HTTP/POST ao Apps Script.

Logo, a existência de `doPost` no template **não comprova** gravação integrada no cliente. Não afirmar sincronização bidirecional ou upload automático até implementar e testar esse caminho.

### Pontos de atenção na mesclagem
- `mergeTranspetroBackupData` une sessões e blocos concluídos.
- Deduplica caderno de erros e links.
- Combina progresso verticalizado, materiais, notas e outras chaves.
- No progresso verticalizado, combina `estudado`, `teoria`, `revisado`, `questoes`, `acertos` e `erros`. Conferir o schema efetivo de `EditalVerticalizado.tsx` antes de alterar.
- Materiais personalizados usam spread superficial (`Object.assign`/spread de primeiro nível). Se houver objetos aninhados por seção, avaliar mesclagem granular após confirmar o schema.

## 9. Identidade visual e animações

Arquivo central: `src/index.css`.

Tokens observados:
- Verde: `#008542`
- Verde escuro: `#006837`
- Verde floresta: `#071F14`
- Amarelo: `#FDB913`
- Laranja: `#EA580C`
- Fundo: `#F6F8F7`
- Fontes: Plus Jakarta Sans, Outfit e JetBrains Mono.

Animações observadas:
- `fadeIn`
- `scaleUp`
- `tabEnter`
- `.animate-fadeIn`
- `.animate-scaleUp`
- `.animate-tabEnter`
- Motion no indicador da aba ativa.
- `MotionConfig reducedMotion="user"` e regra CSS para `prefers-reduced-motion`.

Diretriz: reutilizar Motion e CSS existentes; respeitar movimento reduzido; não instalar biblioteca redundante sem justificativa. Para padrões permanentes de auditoria visual, microcopy, espaçamento, cores, ícones e animações, consultar [`UNSLOP_DIRETRIZES_PROJETO.md`](./UNSLOP_DIRETRIZES_PROJETO.md) (metodologia **unslop** por Damir Sokolovsky, CC BY 4.0, adaptada ao projeto).

## 10. Arquivos sensíveis

Exigem justificativa técnica e autorização antes de mudanças estruturais:
- `package.json`
- `vite.config.ts`
- `tsconfig.json`
- `index.html`
- `src/main.tsx`
- `src/App.tsx`
- `src/index.css`
- `src/utils/backupStorage.ts`
- `src/utils/driveSync.ts`
- todos os arquivos de `src/data/`.

Não incluir chaves reais, tokens ou segredos em documentação ou prompts. `.env.example` existe; não presumir que contém credenciais válidas.

## 11. Protocolo para futuras atualizações

Antes de implementar:
1. Ler este inventário, [`UNSLOP_DIRETRIZES_PROJETO.md`](./UNSLOP_DIRETRIZES_PROJETO.md) e inspecionar o código atual.
2. Verificar se a função já existe.
3. Classificar: compatível, adaptável, redundante, incompatível ou desnecessária.
4. Mapear arquivos, dados e fluxos afetados.
5. Explicar riscos e reversão.
6. Solicitar autorização para impactos estruturais, em configurações, dados, dependências ou integrações.
7. Implementar somente o escopo aprovado.
8. Executar build, verificação TypeScript e testes pertinentes.
9. Comparar módulos/fluxos antes e depois.
10. Atualizar este inventário apenas após confirmar as alterações.

### Proibições
- Não reconstruir o app.
- Não fazer redesign não solicitado.
- Não substituir módulos existentes.
- Não apagar/renomear chaves sem migração.
- Não alterar schema sem compatibilidade retroativa e backup.
- Não remover dependências ou integrações por iniciativa própria.
- Não declarar testes não executados.
- Não tratar template/protótipo como funcionalidade concluída.

## 12. Checklist de regressão

- [ ] `npm run build` passa.
- [ ] `npm run lint` passa.
- [ ] As oito abas continuam acessíveis.
- [ ] Aba ativa e navegação persistem.
- [ ] Progresso dos ciclos continua salvo.
- [ ] Edital verticalizado mantém filtros e progresso.
- [ ] Matriz Pareto mantém hierarquia e dados.
- [ ] Materiais, links e mapas mentais permanecem acessíveis.
- [ ] Cronômetro e conclusão de sessão funcionam.
- [ ] Regras de corte e Raio-X das bancas permanecem íntegros.
- [ ] Caderno de erros mantém registros.
- [ ] Calculadora continua acessível.
- [ ] Backup JSON exporta e restaura corretamente.
- [ ] Integração Drive preserva backup e leitura.
- [ ] Nenhuma chave LocalStorage foi perdida/alterada indevidamente.
- [ ] Responsividade e movimento reduzido continuam respeitados.

**Status do checklist:** não executado nesta auditoria estática.

## 13. Limitações desta auditoria

- Inspeção estática dos arquivos do ZIP.
- Aplicação não executada em navegador.
- `npm install`, `npm run build` e `npm run lint` não executados.
- Endpoints, credenciais e permissões do Google Drive não testados.
- Sem comparação visual automatizada com o site publicado.
- Dados e estatísticas foram registrados conforme constam no código, sem validação externa independente.

**Regra final:** se o código atual divergir deste inventário, inspecionar o código e o comportamento efetivos antes de decidir; corrigir o inventário com registro da mudança.
