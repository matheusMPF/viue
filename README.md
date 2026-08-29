# Viuê

Aplicação full-stack em Next.js, TypeScript, PostgreSQL e Prisma.

## Desenvolvimento

Instale as dependências e inicie frontend e API no mesmo processo:

```bash
pnpm install
pnpm dev
```

Abra [http://localhost:3000](http://localhost:3000). Os Route Handlers ficam sob `/api`.

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
| -------------------------------- | --------------------------- | ----------------------------------------- |
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

### Variáveis de ambiente

Mantenha `DATABASE_URL` conforme a configuração atual e coloque os segredos abaixo em `.env.local`, que não é versionado:

```env
DATABASE_URL=postgresql://...
JWT_SECRET=uma-chave-aleatoria-com-pelo-menos-32-caracteres
BREVO_API_KEY=
BREVO_SENDER_EMAIL=
BREVO_SENDER_NAME=Viuê
```

Gere um segredo JWT local com:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

O rate limiter padrão usa memória e serve apenas ao desenvolvimento local. Em produção, injete uma implementação compartilhada de `RateLimiter` com Redis ou Upstash por meio de `setRateLimiter`.

O banco existente usa a coluna física `tb_otp.code`; o Prisma a mapeia como `code_hash`. A ampliação necessária da coluna está em `prisma/manual-migrations/20260827_auth_otp_hash.sql`.

### Verificação

```bash
pnpm test
pnpm lint
pnpm typecheck
pnpm build
```
