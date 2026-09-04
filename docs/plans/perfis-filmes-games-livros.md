# Perfis: Filmes e Séries / Games / Livros

## Contexto

Hoje o Viuê tem uma única vertical de conteúdo (filmes e séries): uma Home, um Descobrir, uma Minha Lista e uma Comunidade por conta. A visão de produto sempre incluiu Games e Livros como categorias futuras, mas os documentos atuais (`docs/design-system.md`, `docs/product/README.md`) descreviam isso como "não deve aparecer como recurso disponível no MVP" e imaginavam Games/Livros como sub-abas dentro de uma única Minha Lista — não como experiências paralelas completas.

O pedido agora é maior e mais explícito: cada conta passa a ter **3 perfis fixos** — "Filmes e Séries" (o que já existe), "Games" e "Livros" — entre os quais o usuário troca livremente. Cada perfil tem sua própria Home, Descobrir e Minha Lista, estruturalmente idênticas às de hoje. Exigência central: dados não podem se misturar entre perfis (um item de lista de um perfil não pode aparecer em outro).

**Ajuste registrado nesta revisão**: a Comunidade (amigos e salas) é inteiramente da conta, não do perfil — sem sub-divisão nenhuma entre Filmes e Séries, Games ou Livros. Não é só o caso de amigos (que já era a exceção combinada desde o início); agora as próprias salas também ficam fora do conceito de perfil, junto com a Comunidade inteira. Na prática, Comunidade passa a se comportar como `/conta`: uma área única da conta, alcançável a partir de qualquer perfil, sem variar conforme qual perfil está ativo.

Investigação no código confirmou 2 coisas importantes que moldam este plano:

1. **Não existe fonte de dados para Games/Livros** (o catálogo de filmes/séries vem do TMDB; games/livros exigiriam outra integração inteira, ex. IGDB/Open Library). Por decisão já validada, esta fase constrói só a arquitetura de troca de perfil — Games/Livros ficam visíveis no seletor como "Em breve", travados; só Filmes e Séries continua funcional.
2. **Amigos (`tb_friendship`) e salas (`tb_room`) já são conceitos de conta** no banco — nenhuma das duas tabelas tem qualquer coluna de conteúdo ou de perfil. Como agora a Comunidade inteira fica fora do conceito de perfil, isso significa **nenhuma mudança de schema é necessária** para este recurso: não precisamos adicionar coluna nem enum novo em `tb_room`.

Decisões já validadas com o dono do produto:

- **Escopo**: só arquitetura agora; Games/Livros ficam "Em breve".
- **Rotas**: URLs por perfil para Home/Descobrir/Minha Lista (`/filmes-series/descobrir`, `/games/minha-lista`, etc.); Comunidade fica fora disso, como rota única de conta (`/comunidade`, igual a `/conta`).
- **Troca de perfil**: menu suspenso sempre visível, no mesmo espírito do menu de conta (`UserMenu`) que já existe.

## Abordagem

### 1. Slugs de perfil como constante da aplicação (não uma tabela, não um schema novo)

Novo arquivo `src/lib/profile/profiles.ts` — só 3 perfis fixos, não há motivo para persistir isso no banco:

```ts
export const PROFILE_SLUGS = ['filmes-series', 'games', 'livros'] as const;
export type ProfileSlug = (typeof PROFILE_SLUGS)[number];
export const DEFAULT_PROFILE_SLUG: ProfileSlug = 'filmes-series';

export const PROFILE_CONFIG: Record<ProfileSlug, { label: string; icon: LucideIcon; available: boolean }> = {
  'filmes-series': { label: 'Filmes e Séries', icon: Film, available: true },
  games:           { label: 'Games',           icon: Gamepad2, available: false },
  livros:          { label: 'Livros',          icon: BookOpen, available: false },
};

export function isProfileSlug(value: string): value is ProfileSlug { ... }
```

Sem mapeamento para nenhum enum do Prisma — como a Comunidade não é mais escopada por perfil, e Minha Lista já se resolve sozinha por `tb_content.type` (hoje só `MOVIE`/`SERIES`), este recurso não toca o banco de dados em nenhum momento.

**Nota de simplificação deliberada** (mantida da versão anterior): como só um perfil é selecionável nesta fase, não vamos criar cookie nem coluna de "último perfil usado". Qualquer lugar que precise de um perfil padrão para fins de navegação (redirect de `/`, de `/entrar`, e agora também o `AppNavigation` usado dentro de `/conta` e `/comunidade`, que ficam fora do segmento `[profile]/`) usa `DEFAULT_PROFILE_SLUG` diretamente. Isso evita mexer em `src/proxy.ts` (hoje só faz renovação silenciosa de sessão, com contrato explícito de "nunca bloquear a requisição") e evita inventar um mecanismo de preferência para uma escolha que, hoje, só pode ter um valor possível.

### 2. Rotas por perfil — mover para `src/app/[profile]/`

| Hoje                                         | Depois                                                 |
| -------------------------------------------- | ------------------------------------------------------ |
| `src/app/page.tsx`                           | `src/app/[profile]/page.tsx`                           |
| `src/app/descobrir/page.tsx`                 | `src/app/[profile]/descobrir/page.tsx`                 |
| `src/app/minha-lista/page.tsx`               | `src/app/[profile]/minha-lista/page.tsx`               |
| `src/app/titulo/[id]/page.tsx`               | `src/app/[profile]/titulo/[id]/page.tsx`               |
| `src/app/filmes/melhores-avaliados/page.tsx` | `src/app/[profile]/filmes/melhores-avaliados/page.tsx` |
| `src/app/series/melhores-avaliadas/page.tsx` | `src/app/[profile]/series/melhores-avaliadas/page.tsx` |

Ficam **fora** de `[profile]/`, sem mudar de lugar — mesmo grupo de hoje, agora incluindo Comunidade: `conta/page.tsx`, `entrar/page.tsx`, `renovar-sessao/page.tsx`, `convite/[code]/page.tsx`, **`comunidade/page.tsx`, `comunidade/salas/[id]/page.tsx`**. Isso é o ajuste desta revisão: Comunidade não faz mais parte da reestruturação de rotas por perfil.

Os dois grupos de rota vazios `(auth)` e `(dashboard)` (só `.gitkeep`) continuam sem uso para isso — grupo de rota não adiciona segmento na URL, e precisamos de `/filmes-series/...` de verdade só para Home/Descobrir/Minha Lista/Título. Removê-los como limpeza no mesmo PR.

`src/app/page.tsx` (raiz, `/`) vira um redirect puro: `redirect(`/${DEFAULT_PROFILE_SLUG}`)`. `entrar/page.tsx` e `renovar-sessao/page.tsx` trocam seus redirects para `/` por `` `/${DEFAULT_PROFILE_SLUG}` `` diretamente (evita um salto a mais).

Em `next.config.ts` (hoje só tem a config de imagens do TMDB), adicionar `redirects()` para links antigos continuarem funcionando — note que `/comunidade` e `/comunidade/salas/:id` **não entram aqui**, já que essas rotas não mudam de lugar:

```ts
async redirects() {
  return [
    { source: '/descobrir', destination: '/filmes-series/descobrir', permanent: true },
    { source: '/minha-lista', destination: '/filmes-series/minha-lista', permanent: true },
    { source: '/titulo/:id', destination: '/filmes-series/titulo/:id', permanent: true },
    { source: '/filmes/melhores-avaliados', destination: '/filmes-series/filmes/melhores-avaliados', permanent: true },
    { source: '/series/melhores-avaliadas', destination: '/filmes-series/series/melhores-avaliadas', permanent: true },
  ];
}
```

`src/proxy.ts` não precisa de nenhuma mudança — seu matcher (`/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)`) já é um wildcard sem suposição sobre quantidade de segmentos.

### 3. Validação do perfil e telas "Em breve"

Cada `page.tsx` sob `[profile]/` (Home, Descobrir, Minha Lista, Título, os dois "melhores avaliados") faz, nesta ordem, antes de qualquer busca de dado:

1. `if (!isProfileSlug(profile)) notFound();`
2. `const user = await getAuthenticatedUser().catch(() => null); if (!user) redirect('/renovar-sessao');` (padrão já existente, sem mudança)
3. `if (!PROFILE_CONFIG[profile].available) return <ComingSoonScreen profile={profile} />;`

O passo 3 fica **em cada página**, não só no layout — a documentação do Next 16 sobre `layout.tsx` não garante que um layout deixar de renderizar `{children}` impeça a página filha de rodar sua busca de dados. Para não arriscar uma consulta ao banco disparando à toa para um perfil travado, o corte fica explícito em cada página.

**Comunidade não passa por nenhum desses três checks** — como não está mais sob `[profile]/`, ela simplesmente não tem noção de perfil travado; está sempre disponível, igual a `/conta`.

Novo componente `src/components/profile/coming-soon-screen.tsx` — tela simples reaproveitando o layout/nav já visível, avisando que aquele perfil ainda não está disponível.

### 4. Layout compartilhado + `ProfileSwitcher`

Hoje **8 componentes de tela** duplicam `<div className="home-app"><AppNavigation />...`. Com o ajuste desta revisão, eles se dividem em dois grupos:

- **Sob o novo layout `[profile]/`** (perdem seu próprio `<AppNavigation />`, passam a receber a navegação do layout compartilhado): `home-screen.tsx`, `discover-screen.tsx`, `library-screen.tsx`, `movie-listing-screen.tsx`, `series-listing-screen.tsx`.
- **Continuam de pé sozinhas, com seu próprio `<AppNavigation profile={DEFAULT_PROFILE_SLUG} />`**, exatamente como `account-screen.tsx` já faz hoje: `account-screen.tsx` (sem mudança de comportamento, só passa a receber `profile` explicitamente), **`community-screen.tsx` e `room-screen.tsx`** (ajuste desta revisão — antes de entrar sob o layout de perfil, agora ficam no mesmo grupo de `/conta`).

Novo `src/app/[profile]/layout.tsx` centraliza a navegação só para o primeiro grupo:

```tsx
export default async function ProfileLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ profile: string }>;
}) {
  const { profile } = await params;
  return (
    <div className="home-app">
      <AppNavigation profile={isProfileSlug(profile) ? profile : DEFAULT_PROFILE_SLUG} />
      {children}
    </div>
  );
}
```

Confirmado em `globals.css`: `.home-app` só vira grid de 2 colunas (`220px minmax(0,1fr)`) a partir de 1000px; `.home-sidebar` é o único filho de `AppNavigation` que participa do fluxo do grid (`.home-bottom-nav` é `position: fixed`, fora do fluxo). Mover `<AppNavigation />` para um nível acima funciona exatamente como hoje, desde que `{children}` continue tendo `.home-workspace` como elemento raiz.

`src/components/layout/app-navigation.tsx` passa a receber `profile: ProfileSlug` e prefixar os links de Início/Descobrir/Minha Lista (`/${profile}`, `/${profile}/descobrir`, `/${profile}/minha-lista`) e o link da logo — **o link de Comunidade fica fixo em `/comunidade`, sem prefixo**, já que essa página é única e igual para os três perfis. Novo `src/components/profile/profile-switcher.tsx`, modelado na mesma interação de `src/components/account/user-menu.tsx` (mesmo padrão de `useState` + fechar no `onBlur` + `role="menu"`), listando os 3 perfis — os disponíveis como link, os travados como item desabilitado com badge "Em breve" (reutilizando `Badge` de `@/components/ui`). Fica dentro de `AppNavigation`, junto do brand/logo.

### 5. Comunidade — sem mudanças de escopo

`src/services/community/community.service.ts` **não muda em nada**: `createRoom`, `getCommunityOverview`, `getRoomDetail`, `joinRoomByInviteCode`, `inviteFriendToRoom` continuam exatamente como hoje, sem parâmetro de perfil, sem filtro por tipo de conteúdo nas queries de match. Isso vale também para `src/app/api/community/**` (sem novo parâmetro `profile`) e para `src/services/notifications/notification.service.ts` — os `actionUrl` de convite de sala (`` `/comunidade/salas/${roomId}` ``) e de pedido de amizade (`'/comunidade'`) continuam exatamente como estão, já que esse caminho não muda de lugar. Só o `actionUrl` de avaliação de amigo (`` `/titulo/${contentId}` ``) ganha o prefixo de perfil, porque `/titulo/[id]` continua indo para dentro de `[profile]/`.

### 6. Links fixos para atualizar

Grep por `href="/"`, ``href={`/titulo/...`}``, `router.push('/...')`, `router.replace('/')` dentro de `src/components/`. Cada tela sob `[profile]/` recebe `profile` como prop (vindo do seu `page.tsx`) e usa para montar esses links; `community-screen.tsx` e `room-screen.tsx` usam `DEFAULT_PROFILE_SLUG` (só precisam de um perfil para montar o link de `/titulo/[id]`, não para nada mais). Lugares confirmados:

- `account-screen.tsx`: link de "voltar" (`profile` explícito).
- `movie-listing-screen.tsx`, `series-listing-screen.tsx`, `discover-screen.tsx`: link de "voltar".
- `library-screen.tsx`: link de "voltar" e link de item (`/titulo/[id]`).
- `movie-poster-card.tsx`: link de título — ganha prop `profile`, repassada pelos lugares que o usam.
- `room-screen.tsx`: link de match (`/titulo/${match.id}`, via `DEFAULT_PROFILE_SLUG`) — o link de "voltar" para `/comunidade` **não muda**.
- `content-detail-screen.tsx`: fallback do botão voltar.
- `home-screen.tsx`: links para "melhores avaliados" ganham prefixo de perfil; `router.push('/comunidade')` **não muda**.

### 7. Testes e verificação

Novo `src/lib/profile/profiles.test.ts`: `isProfileSlug` e guarda de regressão de `PROFILE_CONFIG[...].available` (só `filmes-series` é `true`).

Verificação manual, nessa ordem:

1. `npm run dev`; `/` deve cair em `/filmes-series`.
2. Ir para `/games` pelo `ProfileSwitcher`; confirmar que mostra "Em breve" e que **nenhuma** chamada de API de catálogo acontece (aba Network do navegador).
3. Ir para `/comunidade` a partir do perfil Filmes e Séries, criar uma sala; voltar para Início, trocar para o perfil Games (travado) e confirmar que o link de Comunidade da navegação ainda leva para a mesma `/comunidade`, mostrando a mesma sala — prova de que não há mais divisão por perfil aqui.
4. Acessar um link antigo salvo (`/descobrir`); confirmar redirect 308 para `/filmes-series/descobrir`. Acessar `/comunidade` diretamente e confirmar que carrega normalmente, sem redirect (rota não mudou de lugar).
5. Disparar uma notificação de pedido de amizade e uma de convite de sala; clicar em cada uma pelo sino e confirmar que abrem `/comunidade` / `/comunidade/salas/{id}` sem problema.
6. Repetir os passos 2 e 3 em largura mobile, pelo `home-bottom-nav`, para pegar qualquer regressão de CSS da reestruturação do `home-app`/`home-workspace`.

Rodar `npx tsc --noEmit`, `npx eslint .` e `npx vitest run` ao final de cada etapa grande (rotas, nav/layout, links), não só no fim.

## Ordem de implementação sugerida

1. `src/lib/profile/profiles.ts` + `ComingSoonScreen` (código novo, sem dependência de nada ainda).
2. Mover as 6 rotas de perfil (`page.tsx`, `descobrir`, `minha-lista`, `titulo/[id]`, os dois "melhores avaliados") para `src/app/[profile]/`, com os 3 checks (404/auth/travado) e os redirects no `next.config.ts`. **Comunidade fica onde está.** A árvore fica sem compilar até o passo 3.
3. `AppNavigation` + `src/app/[profile]/layout.tsx` + `ProfileSwitcher` — volta a fazer as páginas do passo 2 compilarem, e passa `profile={DEFAULT_PROFILE_SLUG}` para `account-screen.tsx`/`community-screen.tsx`/`room-screen.tsx`.
4. Resto dos links/props (`MoviePosterCard`, `content-detail-screen.tsx`, `library-screen.tsx`, `room-screen.tsx`, `home-screen.tsx`) — mecânico, usar a lista da seção 6 como checklist.
5. `notification.service.ts`: só o `actionUrl` de avaliação de amigo precisa do prefixo de perfil.
6. Testes novos (seção 7) e a passagem manual de verificação.
7. Remover os `.gitkeep` de `(auth)`/`(dashboard)` como limpeza final.
