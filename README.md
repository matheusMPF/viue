# Viuê

Aplicação full-stack em Next.js, TypeScript, PostgreSQL e Prisma.

## Pré-requisitos

- Node.js >= 20.9.0
- pnpm 10.22.0 (via `corepack enable` ou `npm i -g pnpm@10.22.0`)
- Acesso a um banco PostgreSQL com o schema já criado — veja [Banco de dados](#banco-de-dados)

## Como rodar o projeto

### 1. Instale as dependências

```bash
pnpm install
```

### 2. Configure as variáveis de ambiente

Copie `.env.example` para `.env.local` (arquivo local, não versionado) e preencha os valores:

```env
DATABASE_URL=postgresql://usuario:senha@host:porta/banco
JWT_SECRET=uma-chave-aleatoria-com-pelo-menos-32-caracteres
BREVO_API_KEY=
BREVO_SENDER_EMAIL=contato@viue.com.br
BREVO_SENDER_NAME=Viuê
TMDB_READ_ACCESS_TOKEN=
TMDB_API_KEY=
TMDB_LANGUAGE=pt-BR
TMDB_REGION=BR
```

Gere um segredo JWT local com:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

`BREVO_*` controla o envio de e-mails (OTP); `TMDB_*` autentica as chamadas à API do TMDB usadas para importar/buscar conteúdo.

### 3. Gere o Prisma Client

```bash
pnpm db:generate
```

Esse passo é obrigatório antes do primeiro `pnpm dev`: o client é gerado em `src/generated/prisma` (ver `prisma/schema.prisma`), essa pasta é ignorada pelo git e **não** é criada automaticamente por `pnpm dev`. Pulá-lo é a causa do erro abaixo — veja [Solução de problemas](#solução-de-problemas).

### 4. Inicie a aplicação

```bash
pnpm dev
```

Abra [http://localhost:3000](http://localhost:3000). Os Route Handlers ficam sob `/api`.

## Banco de dados

O repositório não versiona migrations do Prisma (`prisma/schema.prisma` foi gerado por introspecção de um banco existente). `DATABASE_URL` deve apontar para um banco PostgreSQL que já contenha as tabelas do schema — `pnpm dev`/`pnpm db:generate` não criam o schema no banco.

Antes de usar o fluxo de autenticação, aplique a migration manual em `prisma/manual-migrations/20260827_auth_otp_hash.sql` (amplia a coluna `tb_otp.code` para `VARCHAR(255)`), caso ainda não tenha sido aplicada no banco de destino.

Para inspecionar os dados visualmente:

```bash
pnpm db:studio
```

## Solução de problemas

**`Module not found: Can't resolve './src/generated/prisma/client'`**

O Prisma Client ainda não foi gerado nesta máquina. Rode:

```bash
pnpm db:generate
```

e reinicie `pnpm dev`. Isso é necessário sempre que `prisma/schema.prisma` mudar ou após um `pnpm install` em um checkout novo.

## Storybook

Inicie o catálogo de componentes em [http://localhost:6006](http://localhost:6006):

```bash
pnpm storybook
```

Valide a geração estática antes de publicar mudanças no design system:

```bash
pnpm build-storybook
```

## Autenticação

O módulo usa senha com Argon2id, OTP de seis dígitos, access token JWT de 15 minutos e refresh token rotativo de 30 dias. Access e refresh tokens são enviados somente em cookies HttpOnly; o banco armazena apenas hashes de OTPs e refresh tokens.

Endpoints públicos:

| Endpoint                         | Corpo JSON                  | Resultado                                 |
| --------------------------------- | ---------------------------- | ------------------------------------------- |
| `POST /api/auth/register`        | `name`, `email`, `password` | Cria conta `PENDING` e envia OTP          |
| `POST /api/auth/verify-otp`      | `email`, `code`, `purpose`  | Ativa a conta ou emite reset token        |
| `POST /api/auth/resend-otp`      | `email`, `purpose`          | Invalida e reenvia o OTP do mesmo fluxo   |
| `POST /api/auth/login`           | `email`, `password`         | Cria cookies de autenticação              |
| `POST /api/auth/refresh`         | sem corpo                   | Rotaciona o refresh token pelos cookies   |
| `POST /api/auth/logout`          | sem corpo                   | Revoga refresh token e limpa cookies      |
| `POST /api/auth/forgot-password` | `email`                     | Envia OTP sem revelar se a conta existe   |
| `POST /api/auth/reset-password`  | `resetToken`, `password`    | Troca a senha e revoga sessões existentes |

`purpose` aceita `EMAIL_VERIFICATION` ou `PASSWORD_RESET`. Cada OTP expira em 10 minutos, permite cinco tentativas e só funciona no fluxo para o qual foi criado. A validação de `PASSWORD_RESET` retorna um reset token curto e de uso único; ela nunca autentica o usuário.

Todas as respostas seguem `{ "success": true, "data": ... }` ou `{ "success": false, "code": "...", "message": "..." }`.

O rate limiter padrão usa memória e serve apenas ao desenvolvimento local. Em produção, injete uma implementação compartilhada de `RateLimiter` com Redis ou Upstash por meio de `setRateLimiter`.

O banco existente usa a coluna física `tb_otp.code`; o Prisma a mapeia como `code_hash`. A ampliação necessária da coluna está em `prisma/manual-migrations/20260827_auth_otp_hash.sql` (ver [Banco de dados](#banco-de-dados)).

## Verificação

```bash
pnpm test
pnpm lint
pnpm typecheck
pnpm build
```
