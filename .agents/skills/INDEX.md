# Índice de Skills Instaladas (`.agents/skills/`)

Este diretório centraliza **apenas** os dois pacotes oficiais solicitados para uso no Google AI Studio Build:

1. **GSAP Skills** (`https://github.com/greensock/gsap-skills`)
2. **Emil Kowalski Skills** (`https://github.com/emilkowalski/skills`)

> Todas as sub-skills estão organizadas diretamente no padrão `.agents/skills/<nome-da-skill>/SKILL.md`, preservando referências relativas entre skills (ex.: `../choreograph/SKILL.md`) e guias auxiliares em `_guides/`.

---

## 1. GSAP Skills (8 skills + guias)

- `gsap-core/` — API principal (`gsap.to`, `from`, `fromTo`, eases, stagger, `matchMedia`, `prefers-reduced-motion`)
- `gsap-react/` — Integração oficial com React (`useGSAP`, `scope`, `contextSafe`, cleanup, SSR)
- `gsap-timeline/` — Sequenciamento com `gsap.timeline()`, position parameter e labels
- `gsap-scrolltrigger/` — Animações guiadas por scroll, `pin`, `scrub`, `ScrollTrigger.refresh()`
- `gsap-plugins/` — Plugins GSAP (Flip, Draggable, SplitText, ScrollTo, CustomEase, Observer, etc.)
- `gsap-utils/` — Utilitários (`clamp`, `mapRange`, `normalize`, `interpolate`, `snap`, `wrap`, `toArray`)
- `gsap-performance/` — Otimização a 60fps, GPU/transforms, `will-change`, batching
- `gsap-frameworks/` — Padrões de ciclo de vida e cleanup em frameworks JS

**Guias de apoio:**
- `_guides/gsap-llms.txt`
- `_guides/gsap-examples/`

---

## 2. Emil Kowalski Skills (20 skills + cheatsheets)

### Core Web / React UI & Motion (18 skills aplicáveis ao projeto)
- `emil-design-eng/` — Filosofia geral de Design Engineering, curvas customizadas, duração <300ms, `scale(0.95)`, `scale(0.97)` em `:active`, popover origin, blur crossfade, `clip-path`
- `animate/` (+ `RECIPES.md`) — Construção de animações do zero com curva, duração e propriedades corretas
- `choreograph/` (+ `RECIPES.md`) — Coordenação e stagger não-uniforme entre múltiplos elementos
- `animation-performance/` — Correção de queda de frames, compositor vs main thread
- `animation-vocabulary/` — Vocabulário técnico preciso de motion
- `apple-design/` — Princípios de fluidez e design de interface inspirados na Apple
- `gestures/` — Arraste, swipe, captura de ponteiro, momento/velocidade e fricção
- `improve-animations/` (+ `AUDIT.md`, `PLAN-TEMPLATE.md`) — Auditoria completa das animações existentes
- `review-animations/` (+ `STANDARDS.md`) — Revisão rigorosa com tabela Antes/Depois/Por quê
- `find-animation-opportunities/` — Identificação de pontos onde motion melhora a UX (e onde não usar)
- `remove-animations/` — Remoção de animações desnecessárias ou repetitivas (ex.: atalhos de teclado)
- `mobile-native/` — Ajustes de app nativo na web mobile (hover em touch, tap highlight, 100vh, zoom em input, safe areas)
- `break-ui/` (+ `CATALOG.md`) — Testes de quebra com textos longos, contagens gigantes, listas vazias
- `pick-ui-library/` — Seleção de bibliotecas confiáveis de UI/motion
- `prototype/` (+ `PICKER.md`) — Prototipação com múltiplas variações comparáveis
- `learn-taste/` — Registro de preferências e correções visuais
- `ask-emil/` — Roteador para escolher a skill certa do pacote
- `ask-sonner/` (+ `API.md`) — Guia de implementação e receitas para toasts Sonner

### Específicas para Mobile Nativo (ignorar neste projeto Web React)
- `animate-expo/` (+ `RECIPES.md`) — React Native / Expo
- `write-swift/` — Swift / iOS nativo

**Cheatsheets de apoio:**
- `_guides/emil-ui-cheatsheet.md`
- `_guides/emil-performance-cheatsheet.md`
