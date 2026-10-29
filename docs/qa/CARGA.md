# Carga de leituras

`qa/load/read-flows.js` usa k6 e cobre busca, lugares no viewport, resumos compactos de até 500 lugares, clusters de relatos, eventos, impactos e a Edge Function **de leitura** `lugares-osm`. Não dispara o job de enriquecimento/Overpass em massa.

O projeto real conhecido é bloqueado. Usar staging separado, com as mesmas migrações/extensões/índices e volume representativo de lugares, avaliações aprovadas e relatos. Uma cópia vazia não responde à pergunta de escala. Não usar o teste como prova de 500 usuários reais em produção.

Preparar contas QA distintas. As credenciais e sessões ficam fora do repositório:

```sh
node scripts/qa/load-sessions.mjs /CAMINHO-PRIVADO/accounts.json /CAMINHO-PRIVADO/tokens.json
```

Configurar `QA_SUPABASE_URL`, `QA_PUBLISHABLE_KEY`, `QA_TOKENS_FILE` e `QA_ALLOW_LOAD=staging-only`. A preparação autentica de forma sequencial e não cria contas. Usa pausa padrão de 2,1 s entre logins (cerca de 17,5 minutos para 500 contas); `QA_AUTH_DELAY_MS` permite ajustar o ritmo aos limites do staging. O arquivo final contém `user_id`, `access_token`, `expires_at`; não publicar em relatórios nem salvar no ZIP. Exige pelo menos vinte minutos restantes de validade.

```sh
QA_LOAD_PROFILE=smoke K6_NO_USAGE_REPORT=true k6 run --summary-export smoke-summary.json qa/load/read-flows.js
QA_LOAD_PROFILE=scale K6_NO_USAGE_REPORT=true k6 run --summary-export scale-summary.json qa/load/read-flows.js
```

`smoke`: cinco usuários virtuais por trinta segundos, com cinco contas. `scale`: rampa de 10 → 50 → 100 → 250 → 500, sustentando 500 por dois minutos e reduzindo no final; exige 500 contas distintas. Cada iteração faz uma leitura e espera 1–2 segundos. É um perfil de carga definido, não a reprodução de todo comportamento de 500 pessoas.

Metas iniciais: falhas abaixo de 2%, checks acima de 99%, p95 abaixo de 1.500 ms por operação. O teste aborta diante da taxa de falhas configurada. Ajustar metas com a equipe e comparar banco/cache frio e aquecido, região e tamanho da instância. Medir CPU, conexões, I/O, queries lentas e limites da conta junto aos resultados; não basta p95 do cliente.

Neste ambiente foi executado **k6 v2.3.0 real contra um servidor HTTP local isolado**, cinco VUs, cobrindo os sete contratos. Isso valida o script e os checks; não mede PostgreSQL/Supabase nem prova capacidade de 500 usuários. O relatório do teste contra staging continua pendente.
