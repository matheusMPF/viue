# Viuê Design System

## Direção

A Viuê combina entretenimento, memória e comunidade. A interface deve parecer contemporânea, humana e editorial, sem perder clareza de produto. O roxo elétrico da marca conduz ações e foco; preto, branco, ciano e pequenos acentos quentes evitam uma experiência monocromática.

Filmes e séries compõem o MVP. Games e livros fazem parte da visão de longo prazo e devem ser considerados na linguagem e na arquitetura visual, sem serem apresentados como funcionalidades já disponíveis.

## Princípios

- **Entretenimento presente:** usar imagens reais, enquadramentos editoriais e referências sutis a filmes, séries, games e livros de acordo com o contexto da tela.
- **Comunidade visível:** pessoas, avatares, conversas, listas e atividade coletiva devem aparecer como parte da experiência, não como decoração.
- **Produto primeiro:** fluxos claros, controles previsíveis, densidade confortável e hierarquia objetiva.
- **Marca com intenção:** reservar o violeta para ações, estados selecionados e momentos importantes.
- **Acessibilidade:** contraste AA, foco visível, alvos de pelo menos 44 px e conteúdo completo por teclado.

## Cores

| Papel      | Token          | Uso                                          |
| ---------- | -------------- | -------------------------------------------- |
| Fundo      | `--background` | base quase preta com subtom ameixa           |
| Superfície | `--surface`    | painéis e áreas de leitura                   |
| Elevada    | `--elevated`   | menus, estados ativos e sobreposições        |
| Primária   | `--primary`    | CTA, seleção e foco da marca                 |
| Secundária | `--secondary`  | comunidade, informação e links auxiliares    |
| Acento     | `--accent`     | destaques raros ligados a estreia e projeção |

## Tipografia

- `Bricolage Grotesque`: títulos de página e momentos editoriais.
- `Manrope`: formulários, navegação, dados e textos corridos.
- Não reduzir espaçamento entre letras. Títulos internos devem permanecer compactos e proporcionais ao contexto.

## Componentes

- Raios de borda de até `8px` para painéis, campos e botões.
- Botões primários sólidos; ícones Lucide para ações reconhecíveis.
- Campos com rótulo sempre visível, foco violeta e mensagem de erro próxima.
- Abas para alternar vistas; checkbox para preferências binárias.
- Cards apenas para itens repetidos ou conteúdo realmente delimitado. Não aninhar cards.

## Imagem e movimento

- Preferir pessoas reais vivendo entretenimento, obras e estados concretos do produto.
- Evitar imagens genéricas, excesso de blur, fundos em gradiente, esferas decorativas e visual neon futurista.
- Movimento deve indicar mudança de estado, nunca competir com o conteúdo. Respeitar `prefers-reduced-motion`.
