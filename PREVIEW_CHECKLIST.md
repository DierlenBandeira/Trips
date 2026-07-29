# Checklist do Preview

## Antes do deploy

- [ ] confirmar que a migration Supabase está aplicada;
- [ ] configurar `NEXT_PUBLIC_SUPABASE_URL`;
- [ ] configurar `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`;
- [ ] configurar `SUPABASE_URL`;
- [ ] configurar `SUPABASE_SECRET_KEY` como segredo de servidor;
- [ ] configurar `NEXT_PUBLIC_APP_URL` com a URL final do Preview;
- [ ] revisar ou configurar `GEOCODING_BASE_URL` e `ROUTING_BASE_URL`;
- [ ] executar `npm ci`;
- [ ] executar `npm run audit:prod` e confirmar zero alertas de produção;
- [ ] executar `npm run check`;
- [ ] executar `npm run test:e2e`.

## Smoke test após o deploy

- [ ] `GET /api/health` responde `200`;
- [ ] a página inicial e o mapa carregam sem erro de CSP;
- [ ] **Explorar demonstração** cria os nove destinos;
- [ ] adicionar, editar, reordenar e excluir uma parada funciona;
- [ ] recarregar a página recupera o estado salvo;
- [ ] **Compartilhar** exibe feedback e gera a URL pública;
- [ ] a URL pública abre em janela anônima e não oferece controles de edição;
- [ ] layout e navegação por teclado funcionam em desktop e mobile;
- [ ] logs da Vercel não exibem tokens ou payloads sensíveis.

## Configuração do projeto Vercel

- framework: Next.js;
- diretório raiz: raiz do repositório;
- comando de instalação: `npm ci`;
- comando de build: `npm run build`;
- diretório de saída: padrão do Next.js.

O health check não consulta o banco e serve apenas para verificar que o runtime
do deploy está disponível. O smoke test da demonstração valida a integração
real com o Supabase.
