# Trip Planner

Aplicação Next.js para criar, organizar e compartilhar roteiros. O navegador
nunca acessa as tabelas diretamente: as operações passam por Route Handlers,
com RLS ativo e autenticação de edição por cookie HttpOnly.

## Configuração local

1. Copie `.env.example` para `.env.local` e preencha as chaves pelo painel do
   Supabase. Nunca versione esse arquivo.
2. Execute `npm install`.
3. Execute `npm run dev`.

O projeto Supabase autorizado é exclusivamente
`gkwoevplwngfjcgiqgwv`.

## Banco

A migration inicial está em `supabase/migrations`. Antes de aplicar:

```sh
npm run supabase:link
npm run supabase:migrations
npm run supabase:push:dry
```

Somente após revisar o dry-run:

```sh
npm run supabase:push
npm run supabase:types
```

## API

- `POST /api/trips`
- `GET|PATCH|DELETE /api/trips/:tripId`
- `POST /api/trips/:tripId/stops`
- `PATCH|DELETE /api/trips/:tripId/stops/:stopId`
- `PUT /api/trips/:tripId/stops/reorder`
- `GET /api/public/trips/:shareToken`

Todos os corpos de entrada são validados com Zod. As rotas privadas exigem o
cookie de edição emitido na criação; o link público nunca concede escrita.
