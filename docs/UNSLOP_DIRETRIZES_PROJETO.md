# DIRETRIZES PERMANENTES UNSLOP — PROJETO TRANSPETRO & PETROBRAS

**Status:** Padrão permanente de auditoria, design e implementação de interfaces  
**Subordinação:** Este documento complementa o [`INVENTARIO_TECNICO_CONTRATO_PRESERVACAO.md`](./INVENTARIO_TECNICO_CONTRATO_PRESERVACAO.md). Em qualquer conflito funcional, de persistência, rotas ou regras de negócio, prevalece integralmente o Contrato de Preservação.

---

## 1. Atribuição e Licença (CC BY 4.0)

Metodologia adaptada a partir de **unslop**, criada por **Damir Sokolovsky** ([@heydamir](https://x.com/heydamir)):

- **Repositório oficial:** https://github.com/heydamir/unslop
- **Site oficial:** https://heydamir.design/unslop
- **Licença original:** Creative Commons Attribution 4.0 International (**CC BY 4.0**)

Este crédito deve ser mantido em todas as cópias, adaptações ou derivados desta documentação interna.

---

## 2. Inventário dos Arquivos da Unslop Analisados

| Arquivo analisado (repositório oficial) | Papel na metodologia | Uso neste projeto |
|---|---|---|
| `SKILL.md` | Processo completo: Direção (5 linhas), 9 passagens ordenadas, modo *Light/Heavy Slop*, Story Video e Checklist final | Base do fluxo de auditoria e criação/refinamento de telas e componentes |
| `references/tokens.md` | Escala de 4px, rampas neutras com tintura (*graphite*, *warm*, *ink*), contraste 4.5:1, escala tipográfica, raios aninhados, curva de movimento | Adaptado à paleta institucional Petrobras e tokens de `src/index.css` |
| `references/signs.md` | Catálogo de sinais de *slop* (superfícies, tipografia, ícones, espaçamento, microcopy, componentes, visuais, movimento, RTL, *template look*) | Usado como checklist de revisão antes de finalizar qualquer entrega de UI |
| `references/visuals.md` | Regras para escolha e composição de visuais reais do produto vs. preenchimento decorativo | Aplicado em estados vazios, pré-visualizações e cards de conteúdo |
| `references/effects.md` | Tratamentos em código (`Glyphs`, `Halftone`, `Dithering`, `Duotone`) com regras estritas de performance (`getImageData` fora do loop, cap DPR 2) | Referência opcional para visuais futuros, nunca aplicada como decoração genérica |
| `references/refs.md` | Referências visuais finalizadas por Damir Sokolovsky e critérios de composição | Referência conceitual de hierarquia e *quiet chrome* |
| `references/rtl.md` | Regras completas para interfaces RTL (árabe, hebraico, persa, urdu) | Referência arquitetural caso o sistema suporte idiomas RTL no futuro |
| `README.md`, `CITATION.cff`, `LICENSE` | Instalação, fluxo de trabalho, atribuição oficial e termos CC BY 4.0 | Preservação legal e documental dos créditos |
| `examples/dashboard.html`, `hero.html`, `store.html` | Exemplos didáticos de telas com *slop* para auditoria comparativa | Referência para identificar antipadrões de UI |

---

## 3. Direção Permanente do Produto (*Direction*)

Antes de criar ou alterar qualquer interface, validar o alinhamento com as cinco linhas de direção deste produto:

1. **Produto:** Plataforma de preparação estratégica e acompanhamento de estudos para **Transpetro (Ênfase 4 — Dutos e Terminais)** e **Petrobras (Ênfase 8 — Operação)**, baseada nos **42 tópicos unificados** e na **Matriz Pareto 80/20**.
2. **Caráter:** Técnico, preciso, estável e objetivo *(proibido usar termos genéricos como "moderno", "minimalista", "premium" ou "sleek")*.
3. **Mundo:** Engenharia de processos, instrumentação industrial, operação de dutos e cadernos técnicos de engenharia.
4. **Momentos de riqueza visual:** A **Matriz Pareto Recursiva** (pesos macro/meso/micro e barras proporcionais), o **Progresso por Ciclos/Edital** e os **Indicadores de Desempenho** no Caderno de Erros. Toda a moldura ao redor (*chrome*) deve permanecer calma e discreta para que os dados e o conteúdo técnico conduzam a leitura.
5. **Detalhe de assinatura:** Indicadores de origem institucional (`Transpetro`, `Petrobras`, `TP + PB`) com ponto semântico e códigos de edital em fonte monoespaçada tabular.

---

## 4. Adaptação das 9 Passagens à Arquitetura Atual

Stack preservada: **React 19 + TypeScript + Vite 6 + Tailwind CSS 4 + Motion 12 + Lucide React**.

### Passagem 1 — Espaçamento (Escala de 4px)
- Toda margem, padding, gap e altura fixa deve seguir múltiplos de `4px` (`p-3`, `p-4`, `p-5`, `p-6`, `gap-2`, `gap-3`, `gap-4`, `h-8`, `h-9`, `h-10`, `h-11`).
- Evitar valores arbitrários quebradores de ritmo como `mt-[13px]`, `ml-[7px]`, `h-[31px]`. (Exceções pontuais permitidas apenas para dimensões de viewport em modais como `max-h-[92vh]`.)
- Espaço interno de um grupo é sempre menor que o espaço entre grupos distintos.
- Itens irmãos em listas, grids de cards ou barras de filtros compartilham a mesma altura, o mesmo padding e o mesmo alinhamento de colunas.

### Passagem 2 — Cores, Superfícies e Contraste
- **Reconciliação com a identidade Petrobras:** Diferente de um dashboard puramente monocromático *graphite*, o aplicativo possui identidade real e intencional do Sistema Petrobras definida em `src/index.css`:
  - Superfície base clara: `#F6F8F7` (`--surface-canvas`), cards `#FFFFFF` (`--surface-card`), superfície atenuada `#EFF4F1` (`--surface-muted`), borda hairline `#DCE4DF`.
  - Superfície escura institucional (cabeçalho, rodapé e cards de destaque): `#071F14` (`--color-petro-forest`) com divisórias `#133B28` / `#123826`.
  - Acentos oficiais com propósito semântico: Verde `#008542` / `#006837` (ação primária, progresso e domínio Transpetro), Amarelo `#FDB913` (métricas-chave e foco institucional) e Laranja `#EA580C` (exclusivo Petrobras e destaque de prioridade).
- **O que é estritamente proibido (Slop):**
  - Gradientes genéricos roxo/azul/índigo/rosa em fundos, botões, cards ou textos.
  - Brilhos coloridos (`shadow-[0_0_20px_...]`), *blobs* radiais, bordas neon ou cards "vidro" com realces brancos exagerados.
  - Contraste insuficiente: texto sobre acento ou fundo deve atingir **>= 4,5:1** (`#006837` ou `#071F14` sobre fundos claros; `#FDB913` ou `#FFFFFF` sobre `#071F14`).

### Passagem 3 — Ícones
- Conjunto único: **Lucide React** exclusivamente (`lucide-react`).
- Proibido usar emojis (`📄`, `🎯`, `📊`, `🔥`, `✨`, `🚀`, etc.) em menus, rótulos, badges, contadores, `<option>` ou títulos de interface.
- Padrão de tamanho e alinhamento: `16px` (`w-4 h-4`) em botões, abas e listas; `20px` (`w-5 h-5`) em cabeçalhos de modais e estados vazios, sempre com `shrink-0` e `aria-hidden="true"` quando decorativos, herdando a cor do papel de texto ou do acento semântico.

### Passagem 4 — Textos e Microcopy
- **Sem pontos de exclamação (`!`, `!!`)** em toasts, alertas, botões ou rótulos da interface — usar declarações diretas e claras (ex.: `Backup JSON gerado com sucesso`, `Copiado`).
- **Sem ponto final** em títulos, subtítulos, rótulos curtos, botões e badges; manter ponto apenas em parágrafos explicativos de múltiplas frases.
- **Sem saudações genéricas** (`Bem-vindo de volta`) nem jargões promocionais (*hype* como *revolucionário*, *turbinar*, *mágico*).
- Números, percentuais e variações acompanham contexto claro (`103 questões · 39%`).

### Passagem 5 — Tipografia
- Famílias preservadas de `src/index.css`:
  - Interface e corpo: `Plus Jakarta Sans` (`--font-sans`).
  - Títulos principais: `Outfit` (`--font-display`).
  - Dados numéricos, códigos de edital e contadores: `JetBrains Mono` (`--font-mono`) com `tabular-nums`.
- **Evolução gradual para novas telas e revisões:**
  - Preferir hierarquia por **tamanho e cor** usando pesos `400`, `500` e `600` (reservando `700` apenas para destaque pontual e evitando novos títulos `font-extrabold` `800`/`900`).
  - Preferir **sentence case** nos rótulos de interface novos/revisados, evitando micro-rótulos em `uppercase tracking-wider` (mantendo maiúsculas apenas em siglas técnicas como `NR-33`, `SMS`, `JSON`, `TP + PB` ou na marca institucional `PETROBRAS` / `TRANSPETRO`).
  - Nunca aplicar `tracking` negativo em textos menores que `16px`, nem usar itálico como recurso de ênfase em UI.

### Passagem 6 — Layout e Responsividade
- Preservar integralmente as 8 abas principais (`NavigationTabs.tsx`), o `Header`, o `main` limitado a `max-w-7xl` e o rodapé institucional.
- Manter proporções estáveis entre mobile e desktop, sem colunas esmagadas e sem textos abaixo de `10px–11px` em tabelas densas.
- Em telas novas ou revisões de painéis, priorizar variação visual intencional (ex.: linha de métricas compactas acima de uma matriz ou lista detalhada) em vez de grades repetitivas de cards idênticos.

### Passagem 7 — Detalhes e Componentes Reutilizáveis
- **Primitivos centrais em `src/components/ui/`:** `Button`, `Card`, `Modal`, `ConfirmDialog`, `StatusBadge`, `OriginBadge`, `ProgressBar`, `EmptyState`, `ToastBanner`.
- **Raios aninhados (*Nested Radius*):** `raio interno = raio externo - padding`, nunca menor que `4px` (ex.: card `rounded-2xl` 16px com `p-4` ou `p-5` contendo blocos `rounded-xl` 12px ou controles `rounded-lg` 8px).
- Contadores e metadados usam texto silencioso em `font-mono tabular-nums` ou `StatusBadge`/`OriginBadge` sem excesso de pílulas brilhantes.
- Anel de foco visível preservado via `:focus-visible` (`outline: 2px solid #008542; outline-offset: 2px;`).

### Passagem 8 — Elementos Visuais e Imagens
- Não adicionar *blobs* abstratos, orbes 3D, fundos neon ou ilustrações genéricas em telas de dashboard/estudo.
- O valor visual vem dos próprios dados técnicos: barras proporcionais da Matriz Pareto, tabelas comparativas de bancas e progresso estruturado.

### Passagem 9 — Animações e Movimento
- **Curva única padrão:** `cubic-bezier(0.22, 1, 0.36, 1)` (definida como `--ease-snappy` em `src/index.css` e nos componentes `Modal` / `NavigationTabs`).
- **Propriedades permitidas (somente compositor GPU):** `transform` e `opacity`, além de transições de estado cromático (`color`, `background-color`, `border-color`, `box-shadow`).
- **Durações:**
  - Hover, press e toggles: `120ms–180ms` (`active:scale-[0.98]`).
  - Menus, popovers e modais: `160ms–220ms` com subida sutil (`6–12px`).
  - Barras de progresso e entradas de seção: `180ms–300ms`.
- **Proibições:**
  - Proibido usar `transition-all` (especificar propriedades como `transition-colors` ou `transition-[color,background-color,border-color,transform,opacity]`).
  - Proibido usar `animate-pulse` ou `animate-ping` em ícones ou elementos estáticos que não representem telemetria/transmissão ativa em tempo real.
  - Proibido usar `hover:-translate-y-*` ou `hover:scale-*` que causem saltos de layout em cards.
- **Acessibilidade:** Manter sempre `<MotionConfig reducedMotion="user">` em `src/App.tsx` e a regra `@media (prefers-reduced-motion: reduce)` em `src/index.css`.

---

## 5. Mapeamento de Aplicação por Módulo

| Área do projeto | Como a metodologia Unslop atua |
|---|---|
| `src/index.css` | Centraliza tokens da marca Petrobras, curva `--ease-snappy: cubic-bezier(0.22, 1, 0.36, 1)`, `tabular-nums`, `:focus-visible` e `prefers-reduced-motion` |
| `src/components/ui/*` | Garante transições explícitas (sem `transition-all`), raios consistentes, foco por teclado e ausência de saltos em `Card`/`Button` |
| `Header` & `NavigationTabs` | Mantém barra institucional estável, `layoutId="activeNavIndicator"` com curva unificada e alinhamento uniforme de ícones `16px` |
| `EditalSummary`, `EditalVerticalizado`, `ParetoMatrix` | Preserva 100% dos 42 tópicos, pesos Pareto e filtros; aplica transições limpas, zero emojis e microcopy sem `!` |
| `TabMaterialEstudo`, `MaterialLinksSection`, `MindMapSection` | Harmoniza cores com a paleta do produto (sem gradientes azul/índigo genéricos), remove `animate-pulse` estático e emojis em `<select>` |
| `StudySchedule`, `DailySessionModal`, `CutRules`, `BancaCesgranrio`, `ErrorNotebook` | Preserva cronômetro, ciclos, regras de corte e registro de erros; orienta revisões progressivas de microcopy e transições |
| `BackupRestoreModal`, `DriveSyncPanel`, `backupStorage.ts`, `driveSync.ts` | **Intocáveis na lógica, chaves LocalStorage, schema JSON e JSONP**; refinamento restrito à limpeza de microcopy/UI |

---

## 6. Conflitos Identificados e Resoluções Adotadas

| Regra original Unslop | Padrão existente no projeto | Resolução adotada |
|---|---|---|
| Superfícies exclusivamente neutras (*graphite*), sem fundo verde/escuro de marca | Paleta Petrobras real (`#071F14`, `#008542`, `#FDB913`, `#EA580C`, `#F6F8F7`) | **Marca preservada:** mantém `#071F14` e `#F6F8F7` como identidade do produto e elimina apenas gradientes/cores estranhas sem função (ex.: banners azul/índigo genéricos) |
| Tipografia limitada a pesos `400–600` e proibição de `uppercase` | Títulos existentes com `font-extrabold` e micro-rótulos `uppercase tracking-wider` | **Convergência gradual:** mantém `PetrobrasLogo` e siglas técnicas em maiúsculas; novas telas/refatorações adotam `500–600` e *sentence case*, evitando mudanças bruscas não solicitadas em massa |
| Proibição absoluta de `transition-all`, `hover:-translate-y`, `animate-pulse` e emojis | Ocorrências pontuais em `Button`, `Card`, `ProgressBar`, `EditalVerticalizado`, `MindMapSection` e `MaterialLinksSection` | **Corrigido na fonte:** removidos `animate-pulse` estático, `hover:-translate-y-0.5`, `group-hover:scale-105`, `transition-all` nos primitivos/componentes editados e emojis nos `<select>` |
| Scripts `snapshot.mjs` / `story.mjs` (Playwright + ffmpeg) | Stack web Vite/React sem Playwright nem ffmpeg instalados | **Não instalados:** não são necessários para o app em produção e não foram adicionados ao `package.json` |

---

## 7. Checklist Permanente de Verificação (Pré-Entrega)

Antes de concluir qualquer nova tela, componente ou ajuste visual:

1. **Preservação:** As 8 abas, chaves `localStorage`, cálculos de `src/data/*`, backup JSON e leitura JSONP do Google Drive continuam intactos?
2. **Espaçamento e alinhamento:** Todos os paddings/gaps seguem múltiplos de `4px` e colunas de ícones/números estão alinhadas?
3. **Cores e contraste:** Sem gradientes decorativos roxo/azul, sem glows coloridos e com contraste mínimo `4.5:1`?
4. **Ícones e microcopy:** Somente Lucide `1.5` stroke, zero emojis na UI, zero `!` ou `!!` e números com `tabular-nums`?
5. **Tipografia:** Hierarquia limpa, sem `tracking` negativo em texto pequeno e sem itálico decorativo?
6. **Animações e acessibilidade:** Sem `transition-all`, sem `animate-pulse` não-vivo, curva `cubic-bezier(0.22, 1, 0.36, 1)` e `prefers-reduced-motion` respeitado?
7. **Build e tipagem:** `npm run lint` (`tsc --noEmit`) e `npm run build` executados e aprovados após as alterações?
