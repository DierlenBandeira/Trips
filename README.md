# Trip Planner

Planejador visual de viagens para organizar destinos, custos, noites e
compartilhar um roteiro. A área de edição combina painel ordenável, mapa
interativo e KPIs calculados em tempo real.

## Recursos

- até 50 destinos com busca Photon/OpenStreetMap;
- rota rodoviária OSRM com cache persistido e fallback linear;
- reordenação por mouse, toque ou teclado;
- custos, noites, distância e duração calculados em tempo real;
- autosave com debounce e recuperação completa do estado;
- viagens públicas ou não listadas com mapa somente leitura;
- roteiro demonstrativo com nove destinos;
- layout responsivo e acessibilidade verificada com axe-core.

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

Use a raiz do repositório, o preset Next.js, `npm ci` para instalação e
`npm run build` para build. Cadastre as sete variáveis de `.env.example` e
ajuste `NEXT_PUBLIC_APP_URL` para a URL do Preview. As quatro variáveis do
Supabase são obrigatórias. Nunca use o prefixo `NEXT_PUBLIC_` na chave
administrativa.

Antes de publicar:

```sh
npm ci
npm run audit:prod
npm run check
npm run test:e2e
```

Depois do deploy:

- confirme que `GET /api/health` responde `200`;
- verifique o carregamento da página e do mapa sem erros de CSP;
- crie o roteiro em **Explorar demonstração**;
- edite e reordene uma parada, recarregue a página e confirme o autosave;
- gere um link e abra-o em janela anônima, sem controles de edição;
- confira desktop, mobile, navegação por teclado e logs da Vercel.

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

## Segurança

- acesso ao Supabase ocorre somente no servidor e o RLS permanece habilitado;
- o token de edição é armazenado como hash e enviado em cookie HttpOnly;
- payloads são validados com Zod e as APIs possuem rate limiting;
- a resposta pública exclui credenciais, hashes e metadados internos;
- CSP e headers defensivos bloqueiam framing, MIME sniffing e permissões
  desnecessárias;
- o bundle cliente não contém a chave administrativa;
- `npm run audit:prod` passa com zero vulnerabilidades conhecidas.

O audit completo ainda aponta nove alertas altos na cadeia de desenvolvimento
do ESLint (`minimatch`/`brace-expansion`). Essas dependências processam somente
globs locais durante o lint e não integram o runtime. A correção forçada foi
descartada porque quebra o ESLint; aguarde uma atualização compatível do
`eslint-config-next` e não execute `npm audit fix --force`.

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
