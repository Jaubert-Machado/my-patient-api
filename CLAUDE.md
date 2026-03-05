# my-patient-api

Backend REST com SSE para streaming de agentes de IA.

## Stack

- **Runtime:** Node.js 20
- **Framework:** Fastify 5
- **ORM:** Prisma 6.19 + PostgreSQL
- **Auth:** JWT via `@fastify/jwt` (cookie `auth_token`)
- **IA:** Anthropic SDK (`@anthropic-ai/sdk`)

## Scripts

```bash
npm run dev          # desenvolvimento com tsx watch
npm run build        # compila TypeScript
npm run start        # inicia build de produção
npm run db:migrate   # cria e aplica migration (dev)
npm run migrate      # aplica migrations (produção)
npm run db:studio    # abre Prisma Studio
```

## Estrutura

```
src/
  app.ts               # monta o Fastify e registra plugins/rotas
  index.ts             # entrypoint
  plugins/             # cors, cookie, jwt
  routes/
    auth/              # POST /auth/login, POST /auth/register
    agents/            # POST /agents/patient/init, /patient, /lab, /evaluate
    health.ts          # GET /health
  agents/              # lógica dos agentes Anthropic (patient, lab, evaluator)
  lib/
    prisma.ts          # instância do PrismaClient com adapter PrismaPg
    anthropic.ts       # instância do cliente Anthropic
prisma/
  schema.prisma
  migrations/
prisma.config.ts       # config do Prisma 6 (adapter pg para migrate)
```

## Banco de dados

- Provider: PostgreSQL
- Credenciais locais: `mypatient / mypatient`, banco `mypatient`, porta `5432`
- Para rodar localmente: `docker compose up postgres -d`
- Para aprovar usuário: `UPDATE users SET approved = true WHERE email = '...'`

## Ambiente local

Copie `.env.example` para `.env` e preencha `ANTHROPIC_API_KEY`.

## Agentes (SSE)

Todos os endpoints de agentes usam Server-Sent Events. O padrão de evento é:
- `{ type: 'text', text: '...' }` — chunk de texto
- `{ type: 'done' }` — fim do stream
- `{ type: 'error', message: '...' }` — erro

Todos os endpoints de agentes exigem autenticação JWT + `approved = true`.
