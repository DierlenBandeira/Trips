# Revisão de segurança

Revisão concluída em 28 de julho de 2026 para a preparação do Preview.

## Controles verificados

- nenhuma chave ou arquivo `.env` é versionado;
- `SUPABASE_SECRET_KEY` é importada apenas por código marcado `server-only`;
- o navegador não acessa as tabelas diretamente e o RLS permanece habilitado
  sem policies permissivas;
- o token de edição é armazenado como hash SHA-256 e entregue somente em cookie
  HttpOnly, `SameSite=Lax` e limitado às rotas da viagem;
- rotas privadas verificam o token, validam payloads com Zod e aplicam limites
  de tamanho, quantidade e frequência;
- a API pública usa um DTO explícito e não retorna IDs internos da viagem,
  timestamps, hashes ou credenciais de edição;
- viagens privadas não podem ser abertas publicamente; viagens não listadas
  exigem o token de leitura;
- respostas recebem CSP, proteção contra framing e MIME sniffing, política de
  referência, política de permissões e isolamento de opener;
- o build cliente foi inspecionado para impedir a presença de segredos;
- o fluxo crítico possui teste E2E e auditoria automática de acessibilidade.

## Riscos aceitos para o Preview

- o rate limiting em memória atua por instância serverless, não globalmente;
- o token de leitura de viagens não listadas aparece na URL e pode ser
  registrado no histórico do navegador;
- Photon, OSRM e tiles OpenStreetMap públicos não possuem SLA e exigem uso
  responsável;
- o cache persistido de rotas ainda não possui expiração automática no banco;
- a CSP mantém `unsafe-inline` para scripts/estilos exigidos pelo runtime e
  pelo mapa. `unsafe-eval` é permitido somente em desenvolvimento.

Esses itens são aceitáveis para um Preview controlado. Antes de tráfego público
relevante, recomenda-se rate limiting distribuído, provedores cartográficos
com SLA, política de retenção do cache e monitoramento de erros.

## Auditoria de dependências

O relatório inicial apontou 12 alertas de severidade alta. As transitivas de
runtime `postcss` e `sharp` foram fixadas em versões corrigidas por `overrides`,
sem rebaixar o Next.js. `npm audit --omit=dev` passou com zero vulnerabilidades
conhecidas.

Permanecem nove alertas apenas na cadeia de desenvolvimento do ESLint, causados
por versões legadas de `minimatch`/`brace-expansion`. Elas processam somente os
globs estáticos do repositório durante o lint e não integram o bundle nem a
instalação de produção. Forçar `brace-expansion` 5 foi testado e descartado
porque sua mudança de API quebra o ESLint; a correção deve ser feita quando a
cadeia oficial do `eslint-config-next` oferecer versões compatíveis. Não deve
ser usado `npm audit fix --force`, pois a sugestão atual rebaixa o Next.js.

## Resultado

Os controles da aplicação e as dependências de produção não apresentaram
bloqueadores conhecidos para o Preview. A chave administrativa deve ser
cadastrada somente como variável de servidor na Vercel e nunca possuir o
prefixo `NEXT_PUBLIC_`.
