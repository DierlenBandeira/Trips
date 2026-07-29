# Plano de implementação — Trip Planner

## Estado atual e stack

O repositório parte de uma aplicação executável em Next.js 16 com App Router,
React 19, TypeScript estrito, Supabase, Zod, Vitest e ESLint. Já existem:

- migration aplicada com `trips`, `trip_stops` e `trip_route_cache`;
- Route Handlers para criar/editar/excluir viagens e paradas;
- RLS sem acesso direto do navegador;
- edição protegida por token em cookie HttpOnly;
- link público somente leitura;
- uma interface básica de criação e edição.

## Arquitetura

O MVP usa Server Components apenas como pontos de entrada e Client Components
para a experiência interativa do planejador.

```text
Browser
  ├─ Trip workspace (estado local + autosave futuro)
  ├─ MapLibre (mapa e interação espacial)
  └─ API client
       └─ Next.js Route Handlers
            ├─ validação Zod e rate limiting
            ├─ verificação do cookie de edição
            └─ Supabase administrativo server-only
```

As integrações cartográficas ficam atrás de interfaces próprias:

- `MapView`: renderização e interação do mapa;
- `GeocodingProvider`: busca de locais;
- `RouteProvider`: cálculo de rota;
- `RouteCache`: cache por hash de coordenadas e ordem.

Na Fase 1 o mapa desenha uma linha geográfica local entre os pontos. A Fase 2
substitui essa linha por geometria rodoviária sem alterar os componentes de
viagem.

## Fases de desenvolvimento

### Fase 1 — workspace visual

- layout desktop com painel lateral, cabeçalho, mapa e KPIs flutuantes;
- drawer inferior responsivo no mobile;
- mapa MapLibre/OpenStreetMap;
- adicionar parada pelo formulário e pelo clique no mapa;
- edição, remoção, seleção e reordenação com dnd-kit;
- estado local previsível com reducer;
- cálculos centralizados e testados.

### Fase 2 — geocodificação e rota

- provider de geocodificação OSM com debounce e cache;
- provider OSRM com segmentação para pelo menos 50 pontos;
- rota rodoviária, fallback linear e feedback de carregamento;
- hash e cache de rota.

Status: implementada. O geocoder adotado é Photon, que suporta
`search-as-you-type` sobre dados OpenStreetMap. O Nominatim público não foi
usado porque sua política proíbe autocomplete. As chamadas externas passam por
Route Handlers com validação, cache TTL e rate limiting.

### Fase 3 — persistência completa

- conectar o estado modular às APIs existentes;
- autosave com debounce e estados de salvamento;
- persistir alterações de metadados e paradas;
- cache remoto de rotas.

Status: implementada. Metadados usam debounce de 1,1 segundo e campos de
paradas usam 900 ms, com flush no `blur`, no botão Salvar e ao sair da página.
Respostas antigas não sobrescrevem edições mais novas. Rotas OSRM bem-sucedidas
são armazenadas em `trip_route_cache`; fallbacks não são persistidos para
permitir nova tentativa do provider.

### Fase 4 — compartilhamento

- consolidar URL pública por slug/token;
- mapa e KPIs somente leitura;
- feedback acessível ao copiar o link.

Status: implementada. O link canônico usa `/trip/[slug]`; viagens públicas
abrem apenas pelo slug e viagens não listadas exigem `?share=<public-token>`.
Links antigos em `/share/[token]` continuam funcionando. A API pública remove
IDs de viagem, timestamps, hashes e tokens da resposta.

### Fase 5 — acabamento

- acessibilidade, responsividade e estados de erro;
- teste do fluxo principal;
- dados de demonstração;
- revisão de segurança e documentação final.

Status: implementada. O app possui navegação por teclado, link para pular ao
conteúdo, regiões e mensagens de estado rotuladas e contraste revisado. O fluxo
principal é exercitado em build de produção pelo Playwright, com axe-core em
desktop e mobile. A demonstração cria nove destinos pelas APIs reais. Headers
de segurança, health check, revisão de exposição de segredos e checklist de
Preview completam a preparação para deploy.

## Estrutura de pastas

```text
src/
  app/                      rotas, páginas e Route Handlers
  components/
    map/                    MapLibre e elementos cartográficos
    trip/                   workspace, painel, parada e KPIs
    ui/                     componentes visuais pequenos
  features/
    trips/                  estado, reducer e tipos da viagem
    routing/                providers, hash e cache de rota
    geocoding/              providers, busca e cache
  hooks/                    hooks de interação e persistência
  lib/
    api/                    contratos HTTP e segurança
    supabase/               clientes browser/server
  utils/                    cálculos puros
  validations/              schemas compartilhados
  types/                    tipos gerados e contratos globais
```

## Modelo de dados

O modelo já está migrado no Supabase:

- `trips`: metadados, moeda, viajantes, visibilidade e hashes/tokens;
- `trip_stops`: ordem, endereço, coordenadas, noites, custo e observações;
- `trip_route_cache`: hash das paradas, GeoJSON, distância e provider.

UUIDs, limites geográficos, valores não negativos, unicidade de posição e
triggers de `updated_at` são garantidos pelo banco. RLS permanece ativo.

## Riscos técnicos

- tiles públicos do OpenStreetMap exigem atribuição, uso responsável e não
  oferecem SLA; produção poderá usar outro provedor compatível;
- as instâncias públicas Photon e OSRM são adequadas apenas para demonstração e
  uso razoável, sem SLA; produção deve usar instância própria ou provedor;
- rotas longas precisam ser segmentadas e unidas sem duplicar coordenadas;
- autosave e reorder precisam evitar conflitos de posição;
- gravações concorrentes precisam preservar revisões locais mais novas;
- rate limiting em memória não é global entre instâncias serverless;
- MapLibre precisa ser carregado apenas no navegador.

## Decisões tomadas

- manter App Router, Supabase e APIs existentes;
- usar reducer local, sem Redux;
- usar MapLibre GL JS com tiles OpenStreetMap;
- usar Photon para autocomplete e reverse geocoding, mantendo a URL
  configurável;
- dividir solicitações OSRM em blocos de até 25 paradas, sobrepondo o último
  ponto de cada bloco para preservar continuidade;
- manter cache de geocodificação por 24 horas, reverse por 7 dias e rotas por
  6 horas no servidor, além de cache em memória no navegador;
- persistir rotas por `trip_id + stops_hash`, consultando o Supabase antes do
  provider;
- usar `keepalive` e flush no evento `pagehide` para reduzir perda de alterações
  durante navegação/fechamento;
- separar acesso público por visibilidade: `private` nunca abre, `unlisted`
  exige token público e `public` permite acesso por slug;
- preservar links legados sem expor controles ou credenciais de edição;
- usar dnd-kit para teclado, ponteiro e toque;
- usar React Hook Form apenas nos formulários com validação;
- usar Lucide para ícones, evitando um sistema visual adicional;
- centralizar cálculos em funções puras;
- preservar o token de edição exclusivamente no cookie HttpOnly;
- aplicar CSP e headers defensivos globalmente, sem expor a assinatura do
  framework;
- validar o fluxo crítico em um servidor de produção local antes de cada
  Preview;
- não criar novas migrations na Fase 1, pois o modelo já cobre o MVP.
