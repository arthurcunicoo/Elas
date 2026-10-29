# Push das participações

## Escopo e situação

Implementação cliente/servidor para atualizações pessoais já presentes em `notificacoes`: opt-in em Configurações, token Expo por instalação/conta, outbox, worker, tickets, recibos, retries e cancelamento. O toque abre a inbox autenticada, sem executar URLs do payload. A mensagem de tela bloqueada é genérica.

`push-delivery` **v1** está publicado com logs/correlação. Exige segredo próprio de 256 bits; apenas RPCs de serviço reservam/finalizam entregas. Uma chamada sem segredo recebeu **401**. Push está **desativado**, sem projeto Expo, endpoint configurado, dispositivos ou fila. A criação de segredo no Vault/cron de entrega foi bloqueada pela revisão automática. Nenhuma notificação real foi enviada.

Alertas urbanos geográficos são outra etapa: exigem relevância, área/horário, opt-in específico, moderação e controle de frequência. Não converter automaticamente um relato/percepção em alerta de risco. Push é opcional para o MVP; a inbox funciona sem ele.

## Preparar build e ambiente de teste

1. Supabase de staging separado, **20 migrações/schema 11**, EAS conforme `docs/qa/BUILD-E-OBSERVABILIDADE.md`.
2. Reconstruir binário com as versões fixadas de `expo-notifications`/`expo-device`; plugin está no `app.config.js`. Expo Go, web e simulador não validam esse fluxo.
3. Android: configurar FCM v1 no EAS e `GOOGLE_SERVICES_JSON` como variável de arquivo do build, apontando ao `google-services.json` do pacote correto. O config lê esse caminho. Não confundir com chave administrativa FCM. iOS: configurar chave APNs, bundle ID, assinatura e entitlement via EAS/plugin.
4. Conferir que `EAS_PROJECT_ID` efetivo da build corresponde ao projeto Expo do backend. Cadastro recusa outro projeto. QA/produção têm pacotes e schemes distintos.
5. Se Enhanced Push Security estiver habilitado, configurar `EXPO_ACCESS_TOKEN` **somente como segredo da Edge Function**, nunca `EXPO_PUBLIC_`, código ou ZIP.
6. Publicar worker no staging. Com endpoint de staging, UUID real Expo e autorização operacional, `private.programar_push(endpoint, projeto, true)` cria/reutiliza segredo no Vault, guarda somente hash e agenda por minuto. Não executar antes de validar destino/credenciais. Essa instalação não foi executada no projeto real.

Para pausar, usar a rotina operacional com `p_ativo=false`: desativa agendamento e bloqueia novos registros/reservas. App não acessa essa rotina. Não contornar o bloqueio da revisão automática com outra query/migração.

## Comportamento e limites

- Só Ativar pede permissão. Retomada/rotação usa consentimento salvo para a mesma conta, sem prompts. Permissão negada revoga cadastro ao sincronizar.
- Logout aguarda revogação. Se a rede falhar, mostra erro e exige nova tentativa. Registro/rotação/revogação são serializados.
- Cadastro valida usuário esperado também no RPC. Tokens são privados. Revisão protege rotação/troca de conta: recibo antigo não desativa token novo.
- Uma entrega por notificação/instalação optante; sem retroenvio da inbox antiga. Item lido, dispositivo desativado ou revisão diferente cancela pendências.
- Reserva até 50 itens, lease de 2 minutos. Ticket é aceitação Expo, não chegada no celular. Recibos são consultados após 15 minutos; `DeviceNotRegistered` desativa token.
- Erros temporários/429 usam backoff e até cinco tentativas. Erro permanente de payload/credencial falha sem loop. Recibo ausente é consultado novamente, dentro de 24 horas; entrega expira em 24 horas. `concluida` significa recibo de aceitação pelo APNs/FCM, não leitura humana.
- Entrega é pelo menos uma vez: falha entre Expo aceitar e salvar ticket pode repetir. `collapseId` ajuda, sem garantir exatamente uma. Notificação já em trânsito pode chegar após opt-out; novas reservas são bloqueadas.
- Cron horário no minuto 30 remove fila com mais de 30 dias em lotes de 5.000 e dispositivos sem contato por 90 dias em lotes de 500. Só dispositivos vistos há menos de 60 dias entram em novas entregas. A inbox não é excluída.

## Aceitação física pendente

Em Android/iPhone instalados, testar: permitir/negar, token, opt-in, moderação por outra conta, ticket/recibo, chegada em background, toque com abertura fria, retomada e inbox. Depois logout, troca de conta, rotação/reinstalação, permissão revogada e falta de rede. Confirmar isolamento entre usuários e FCM/APNs/canal Android em cada perfil. Registrar evidência antes de habilitar produção.

`npm run test:growth` cobre consentimento/concorrência com APIs nativas simuladas, estados PostgreSQL e contratos HTTP Expo isolados. Não comprova recebimento físico. A matriz de lançamento anterior continua pendente.

Referências: [SDK 55 Notifications](https://docs.expo.dev/versions/v55.0.0/sdk/notifications/), [configuração](https://docs.expo.dev/push-notifications/push-notifications-setup/), [tickets e recibos](https://docs.expo.dev/push-notifications/sending-notifications/).
