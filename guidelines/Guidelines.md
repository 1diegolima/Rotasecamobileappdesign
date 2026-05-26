# RotaSeca — Design System

Aplicativo de mobilidade urbana focado em enchentes e alagamentos para Recife, Pernambuco. Funciona como um Waze de enchentes — mostra ruas alagadas, zonas de risco e sugere rotas seguras em tempo real.

## Stance: Funcional e Confiável

O RotaSeca segue uma abordagem **swiss/data-dense** — funcional, direto, com grid preciso e máxima clareza de informação. Este é um app de segurança pública, não um produto de entretenimento. A interface prioriza legibilidade, acessibilidade e resposta rápida em situações de emergência.

## Tipografia

**Família principal:** Inter (Google Fonts)

- **Display:** Inter SemiBold (600) / Bold (700) para títulos
- **Body:** Inter Regular (400) para corpo de texto
- **Medium:** Inter Medium (500) para labels, botões e elementos de UI

Inter foi escolhida por ser uma sans-serif neutra, altamente legível em dispositivos móveis e com excelente suporte a diferentes pesos. É uma fonte funcional que transmite seriedade e confiabilidade.

## Paleta de Cores

### Cores Principais

- **Azul Escuro:** `#0A1628` — Texto principal, backgrounds escuros (modo emergência)
- **Azul Médio:** `#1E3A5F` — Cor primária, elementos interativos, navegação
- **Laranja Alerta:** `#FF6B35` — Destaque para ações urgentes, botões de atenção
- **Branco:** `#FFFFFF` — Backgrounds de cards, texto sobre fundos escuros
- **Cinza Claro:** `#F4F6F9` — Background principal, superfícies secundárias

### Cores de Alerta (Sistema de Severidade)

- **Verde:** `#2ECC71` — Alerta leve, situação sob controle
- **Amarelo:** `#F39C12` — Alerta moderado, atenção necessária
- **Vermelho:** `#E74C3C` — Alerta crítico, risco iminente

### Aplicação

A paleta opera em dois modos:

1. **Modo normal (dia):** Background claro (#F4F6F9), texto escuro, cards brancos
2. **Modo emergência (noite/crise):** Background escuro (#0A1628), texto claro, alto contraste

## Design Tokens

```css
--background: #F4F6F9
--foreground: #0A1628
--card: #FFFFFF
--primary: #1E3A5F
--accent: #FF6B35
--destructive: #E74C3C
--chart-1: #2ECC71 (verde)
--chart-2: #F39C12 (amarelo)
--chart-3: #E74C3C (vermelho)
--radius: 1rem (16px)
```

## Layout e Estrutura

### Grid e Espaçamento

- **Container mobile:** 390px × 844px (iPhone padrão)
- **Padding padrão:** 24px (1.5rem)
- **Gap entre elementos:** 12px (cards), 16px (seções)
- **Border radius:** 16px para cards, 12px para botões

### Componentes Base

#### Cards

- Background branco (#FFFFFF)
- Border radius de 16px
- Sombra sutil (shadow-lg em overlays, shadow-md em hover)
- Padding interno de 16px
- Border de 1px com opacity de 12%

#### Botões

- **Primário:** Background azul médio (#1E3A5F), texto branco
- **Emergência:** Background vermelho (#E74C3C), texto branco, circular
- **Secundário:** Background muted, texto foreground
- Altura mínima de 44px (acessibilidade touch)
- Border radius de 12-16px

#### Navegação

- Fixed bottom navigation com 4 itens
- Ícones de 22px
- Labels em 10px
- Cor primária quando ativo, muted quando inativo

## Imagery e Iconografia

### Ícones

Usa **Lucide React** para todos os ícones:

- **MapPin:** Localização, marcadores de mapa
- **Droplets:** Chuva, alagamento, precipitação
- **AlertTriangle:** Alertas, avisos, perigos
- **Navigation:** Rotas, direções
- **Phone:** Emergência, contato
- **Camera:** Upload de foto
- **Home:** Abrigos

### Mapa

O mapa usa um background gradiente azul claro (`from-blue-50 via-blue-100 to-blue-200`) para simular a visualização cartográfica. Marcadores coloridos usam o sistema de severidade (verde/amarelo/vermelho).

## Acessibilidade

### Contraste

- Texto principal sobre background claro: 4.5:1 (AA)
- Botões e elementos interativos: mínimo 3:1
- Alertas críticos: alto contraste para visibilidade imediata

### Touch Targets

- Mínimo de 44px de altura para botões e elementos interativos
- Espaçamento adequado entre elementos clicáveis
- Estados de hover e focus claramente definidos

### Feedback Visual

- Estados de loading, hover e active em todos os botões
- Animações sutis (pulse em alertas, fade-in em overlays)
- Ring de foco em elementos interativos

## Telas Principais

1. **Mapa:** Visualização em tempo real das zonas de risco
2. **Alerta Crítico:** Overlay de emergência com orientações
3. **Reportar:** Formulário de reporte colaborativo
4. **Rotas:** Cálculo de trajeto seguro
5. **Abrigos:** Lista de locais oficiais de evacuação

## Comportamento e Interação

- **Mobile first:** Otimizado para iOS e Android
- **Funcional:** Sem animações decorativas, foco na usabilidade
- **Modo offline:** Dados críticos (abrigos, zonas de risco) disponíveis sem internet
- **Tempo real:** Atualizações automáticas de condições de chuva e alertas

## Inspirações

- **Waze:** Interface de mapa colaborativo, marcadores de alerta
- **Google Maps:** Navegação clara, rotas calculadas
- **Apps governamentais:** Seriedade, confiabilidade, acessibilidade
- **Bloomberg Terminal:** Densidade de informação funcional

## Princípios de Design

1. **Clareza acima de estética:** Em situações de emergência, legibilidade é prioritária
2. **Alto contraste:** Cores de alerta devem ser imediatamente reconhecíveis
3. **Feedback constante:** Usuário sempre sabe o estado atual do sistema
4. **Dados reais:** Conteúdo contextual e realista (nunca lorem ipsum)
5. **Acessível por padrão:** AA compliance em todos os elementos
