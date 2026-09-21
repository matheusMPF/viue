# Deploy do Viuê em uma VPS

Este guia publica o Viuê em uma VPS sem interferir em outro projeto que já use o mesmo servidor. A aplicação fica disponível somente em `127.0.0.1:3001`; o Nginx existente recebe o domínio nas portas 80/443 e encaminha as requisições. O PostgreSQL não publica porta na internet.

## Arquitetura

```text
Internet
   |
   v
dominio (DNS na Hostinger)
   |
   v
Nginx + HTTPS na VPS :443
   |
   v
Viuê em Docker 127.0.0.1:3001
   |
   v
PostgreSQL em rede Docker privada
```

Para uma primeira produção, aplicação e banco podem compartilhar a VPS. Isso exige backup externo, porque a VPS continua sendo um ponto único de falha. Antes de começar, confira se há capacidade disponível:

```bash
free -h
df -h
docker stats --no-stream
```

Com outro projeto no mesmo servidor, use como referência pelo menos 2 vCPUs e 4 GB de RAM total, ajustando conforme o consumo mostrado pelos comandos acima.

## 1. Pré-requisitos da VPS

O roteiro assume Ubuntu 22.04, 24.04 ou 26.04 de 64 bits, acesso SSH com `sudo`, Docker Engine, o plugin `docker compose`, Git e Nginx. Antes de instalar qualquer coisa, verifique o que já existe:

```bash
cat /etc/os-release
docker --version
docker compose version
nginx -v
sudo ss -lntp
```

Se Docker ou Compose não estiver instalado, use o repositório oficial do Docker para a versão exata do Ubuntu. Não execute scripts de instalação aleatórios encontrados em blogs.

No firewall, mantenha públicas apenas as portas necessárias:

- `22/tcp` para SSH;
- `80/tcp` para HTTP e emissão do certificado;
- `443/tcp` para HTTPS.

Não abra as portas `3001` ou `5432`.

## 2. Código e segredos na VPS

Clone o repositório em uma pasta própria. Troque `<URL-DO-REPOSITORIO>` pela URL real:

```bash
sudo mkdir -p /opt/viue
sudo chown "$USER":"$USER" /opt/viue
git clone <URL-DO-REPOSITORIO> /opt/viue/app
cd /opt/viue/app
```

Crie o arquivo de produção a partir do modelo:

```bash
cp deploy/production.env.example deploy/production.env
chmod 600 deploy/production.env
openssl rand -hex 24
openssl rand -hex 32
nano deploy/production.env
```

Use o primeiro valor como `POSTGRES_PASSWORD` e o segundo como `JWT_SECRET`. Não reutilize o `JWT_SECRET` de desenvolvimento e nunca envie `deploy/production.env` ao Git.

Também preencha:

- `BREVO_API_KEY`, `BREVO_SENDER_EMAIL` e `BREVO_SENDER_NAME`;
- `TMDB_READ_ACCESS_TOKEN`;
- `TMDB_API_KEY`, apenas se necessário para sua conta do TMDB;
- `APP_PORT`, mantendo `3001` se ela estiver livre.

O remetente precisa estar verificado na Brevo. Configure no DNS os registros de autenticação pedidos pela Brevo antes de testar cadastro, OTP e recuperação de senha.

## 3. Primeiro banco de produção

O histórico atual contém apenas migrations incrementais e não cria um banco vazio desde o zero. Para o primeiro deploy, faça um dump do PostgreSQL local e restaure-o na VPS. O dump também preserva `_prisma_migrations`, permitindo usar `prisma migrate deploy` nas próximas versões.

### Criar o dump no Windows

Feche operações de escrita importantes e execute no PowerShell, na raiz do projeto. Ajuste o caminho do PostgreSQL se sua versão não for a 18:

```powershell
$line = Get-Content '.env' | Where-Object { $_ -match '^DATABASE_URL=' } | Select-Object -First 1
$databaseUrl = $line.Substring($line.IndexOf('=') + 1).Trim().Split('?')[0]
& 'C:\Program Files\PostgreSQL\18\bin\pg_dump.exe' --format=custom --no-owner --no-privileges --file "$env:TEMP\viue-production.dump" --dbname=$databaseUrl
```

O arquivo pode conter contas, hashes de senha, tokens e conteúdo do ambiente local. Trate-o como segredo. Envie-o para a VPS:

```powershell
scp "$env:TEMP\viue-production.dump" usuario@IP_DA_VPS:/tmp/viue-production.dump
```

### Iniciar e restaurar o PostgreSQL

Na VPS:

```bash
cd /opt/viue/app
docker compose --env-file deploy/production.env -f compose.prod.yaml up -d database
docker compose --env-file deploy/production.env -f compose.prod.yaml cp /tmp/viue-production.dump database:/tmp/viue-production.dump
```

Para começar sem usuários e conteúdos de desenvolvimento, restaure o schema e somente o controle de migrations:

```bash
docker compose --env-file deploy/production.env -f compose.prod.yaml exec -T database sh -c 'pg_restore --exit-on-error --no-owner --schema-only --username="$POSTGRES_USER" --dbname="$POSTGRES_DB" /tmp/viue-production.dump'
docker compose --env-file deploy/production.env -f compose.prod.yaml exec -T database sh -c 'pg_restore --exit-on-error --no-owner --data-only --table=public._prisma_migrations --username="$POSTGRES_USER" --dbname="$POSTGRES_DB" /tmp/viue-production.dump'
```

Se os dados locais já forem os dados reais que devem ir para produção, substitua os dois comandos acima por um restore completo:

```bash
docker compose --env-file deploy/production.env -f compose.prod.yaml exec -T database sh -c 'pg_restore --exit-on-error --no-owner --username="$POSTGRES_USER" --dbname="$POSTGRES_DB" /tmp/viue-production.dump'
```

Use apenas uma das duas opções. Os comandos são destinados a um banco novo e vazio. Depois de confirmar a restauração, apague as cópias temporárias do dump:

```bash
docker compose --env-file deploy/production.env -f compose.prod.yaml exec -T database rm /tmp/viue-production.dump
rm /tmp/viue-production.dump
```

## 4. Build e inicialização da aplicação

Ainda em `/opt/viue/app`:

```bash
docker compose --env-file deploy/production.env -f compose.prod.yaml build app migrate
docker compose --env-file deploy/production.env -f compose.prod.yaml --profile tools run --rm migrate
docker compose --env-file deploy/production.env -f compose.prod.yaml up -d app
docker compose --env-file deploy/production.env -f compose.prod.yaml ps
curl --fail http://127.0.0.1:3001/api/health
```

A resposta esperada é `{"status":"ok"}`. Se houver erro:

```bash
docker compose --env-file deploy/production.env -f compose.prod.yaml logs --tail=200 app database
```

## 5. Domínio na Hostinger

No hPanel, abra **Domínios → Portfólio de domínios → Gerenciar → DNS / Nameservers**. Aponte para o IPv4 público da VPS:

| Tipo | Nome  | Destino     |
| ---- | ----- | ----------- |
| A    | `@`   | `IP_DA_VPS` |
| A    | `www` | `IP_DA_VPS` |

Remova somente registros A, AAAA ou CNAME conflitantes de `@` e `www`. Não apague MX/TXT usados por e-mail, Brevo, SPF, DKIM ou DMARC. A propagação pode levar até 24 horas.

Verifique sem depender do navegador:

```bash
dig +short seu-dominio.com.br A
dig +short www.seu-dominio.com.br A
```

## 6. Nginx e HTTPS

O arquivo `deploy/nginx.viue.conf.example` é um bloco independente e pode coexistir com o outro site. Troque `seu-dominio.com.br` pelo domínio real e confirme que a porta é a mesma de `APP_PORT`.

```bash
sudo cp deploy/nginx.viue.conf.example /etc/nginx/sites-available/viue
sudo nano /etc/nginx/sites-available/viue
sudo ln -s /etc/nginx/sites-available/viue /etc/nginx/sites-enabled/viue
sudo nginx -t
sudo systemctl reload nginx
```

Só prossiga se `nginx -t` terminar com sucesso. Depois que o DNS apontar para a VPS, emita o certificado pelo método recomendado para a distribuição e para o Nginx:

```bash
sudo certbot --nginx -d seu-dominio.com.br -d www.seu-dominio.com.br
sudo certbot renew --dry-run
```

Valide o caminho completo:

```bash
curl --fail https://seu-dominio.com.br/api/health
```

Depois, teste no navegador: abrir o site, criar conta, receber OTP, entrar, buscar um título no TMDB, sair e entrar novamente.

## 7. Atualizações futuras

Antes de uma migration, gere um backup. Depois:

```bash
cd /opt/viue/app
git pull --ff-only
docker compose --env-file deploy/production.env -f compose.prod.yaml build app migrate
docker compose --env-file deploy/production.env -f compose.prod.yaml --profile tools run --rm migrate
docker compose --env-file deploy/production.env -f compose.prod.yaml up -d app
docker compose --env-file deploy/production.env -f compose.prod.yaml ps
curl --fail https://seu-dominio.com.br/api/health
```

O container antigo só é substituído no último comando. O `stop_grace_period` permite até 30 segundos para o Next.js concluir requisições em andamento.

## 8. Backup e operação

Faça ao menos um dump diário e copie-o para fora da VPS. Um arquivo no mesmo disco não protege contra falha ou perda da própria VPS. Exemplo de backup manual:

```bash
mkdir -p /opt/viue/backups
cd /opt/viue/app
docker compose --env-file deploy/production.env -f compose.prod.yaml exec -T database sh -c 'pg_dump --format=custom --no-owner --username="$POSTGRES_USER" "$POSTGRES_DB"' > "/opt/viue/backups/viue-$(date +%F-%H%M).dump"
```

Também acompanhe espaço em disco, memória, reinícios e logs:

```bash
df -h
free -h
docker compose --env-file deploy/production.env -f compose.prod.yaml ps
docker compose --env-file deploy/production.env -f compose.prod.yaml logs --tail=200 app database
```

O limitador de tentativas atual é mantido em memória. Ele é suficiente para uma única instância inicial, mas reinicia junto com o container; antes de escalar para várias instâncias, substitua-o por Redis ou outro armazenamento compartilhado.
