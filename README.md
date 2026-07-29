# Trip Planner

Planejador visual de viagens para organizar destinos, custos, noites e
compartilhar um roteiro. A área de edição combina painel ordenável, mapa
interativo e KPIs calculados em tempo real.

## Tecnologias

- Next.js 16 com App Router, React 19 e TypeScript;
- MapLibre GL JS com tiles OpenStreetMap;
- dnd-kit para reordenação por mouse, toque ou teclado;
- React Hook Form e Zod;
- Supabase PostgreSQL com RLS;
- Lucide Icons, Vitest, Playwright e axe-core.

O navegador não acessa as tabelas diretamente. Operações passam por Route
Handlers com validação, rate limiting e autenticação de edição por cookie
HttpOnly. A chave administrativa fica em um módulo `server-only`.

## Requisitos

- Node.js 20 ou superior;
- acesso ao projeto Supabase `gkwoevplwngfjcgiqgwv`;
- npm.

## Instalação

```sh
npm install
```

Copie `.env.example` para `.env.local` e preencha as variáveis pelo painel
Connect/API Keys do Supabase:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_URL=
SUPABASE_SECRET_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000
GEOCODING_BASE_URL=https://photon.komoot.io
ROUTING_BASE_URL=https://router.project-osrm.org
```

Nunca versione `.env.local` ou chaves privadas.

## Supabase

A migration inicial está em `supabase/migrations` e já cobre viagens, paradas,
cache de rotas, constraints, triggers e RLS.

```sh
npm run supabase:link
npm run supabase:migrations
npm run supabase:push:dry
npm run supabase:push
npm run supabase:types
```

O dry-run deve ser revisado antes de qualquer push remoto.

## Execução

```sh
npm run dev
```

Abra `http://localhost:3000`. Crie uma viagem e use o painel ou clique no mapa
para adicionar pontos. O editor é recuperável no mesmo navegador enquanto o
cookie HttpOnly estiver válido.

Para conhecer o produto sem preencher o roteiro manualmente, use
**Explorar demonstração**. O botão cria uma viagem editável com nove destinos,
custos e observações usando as mesmas APIs do fluxo normal.

Metadados e paradas possuem autosave com debounce. O estado visual informa
alterações pendentes, salvamento, sucesso ou erro. O botão Salvar força o flush
de todas as alterações pendentes.

O botão Compartilhar cria uma viagem não listada e copia uma URL no formato
`/trip/[slug]?share=[token-publico]`. Esse token concede somente leitura. Uma
viagem com visibilidade `public` pode ser aberta em `/trip/[slug]` sem token.

## Qualidade

```sh
npm run lint
npm run test
npm run test:e2e
npm run audit:prod
npm run build
```

`npm run check` reúne lint, testes unitários e build. O teste E2E sobe o build
de produção localmente, simula apenas as integrações externas e cobre criação,
geocodificação, edição, reordenação por teclado, autosave, compartilhamento,
rota pública e auditoria axe em desktop e mobile.

## Preview na Vercel

Cadastre na Vercel as sete variáveis listadas em `.env.example`, ajustando
`NEXT_PUBLIC_APP_URL` para a URL do Preview. As quatro variáveis Supabase são
obrigatórias; `GEOCODING_BASE_URL` e `ROUTING_BASE_URL` já possuem valores
padrão, mas deixá-las explícitas facilita trocar os provedores.

Antes de publicar:

```sh
npm ci
npm run audit:prod
npm run check
npm run test:e2e
```

Depois do deploy, confirme `GET /api/health`, crie uma viagem de demonstração e
abra o link compartilhado em uma janela anônima. O passo a passo completo está
em [PREVIEW_CHECKLIST.md](./PREVIEW_CHECKLIST.md).

## API

- `POST /api/trips`
- `GET|PATCH|DELETE /api/trips/:tripId`
- `POST /api/trips/:tripId/stops`
- `PATCH|DELETE /api/trips/:tripId/stops/:stopId`
- `PUT /api/trips/:tripId/stops/reorder`
- `GET /api/public/trips/:shareToken`
- `GET /api/public/trips/by-slug/:slug`
- `GET /api/geocoding/search?q=:query`
- `GET /api/geocoding/reverse?lat=:latitude&lon=:longitude`
- `POST /api/routing`
- `GET /api/health`

As rotas privadas exigem o cookie de edição. A rota pública retorna apenas os
campos permitidos e nunca concede escrita.

Links legados em `/share/[shareToken]` permanecem disponíveis, mas novos links
usam `/trip/[slug]`.

## Limitações atuais

- as instâncias públicas Photon e OSRM são usadas como demonstração, não
  oferecem SLA e podem limitar tráfego; as URLs são configuráveis para permitir
  instâncias próprias;
- a rota suporta 50 paradas dividindo solicitações em blocos de 25; pequenas
  diferenças podem ocorrer na junção dos segmentos;
- tiles públicos OpenStreetMap não oferecem SLA para produção;
- rate limiting em memória não é compartilhado entre instâncias serverless;
- o cache de rota no Supabase cresce por combinação de coordenadas/ordem e
  ainda não possui rotina automática de expiração.

Consulte [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) para arquitetura,
riscos e fases implementadas. A revisão de segurança está documentada em
[SECURITY_REVIEW.md](./SECURITY_REVIEW.md).
