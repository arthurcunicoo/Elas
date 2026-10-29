# Implantação do backend 12

Estado desta entrega: código e migrations testados localmente; staging remoto indisponível no conector; nenhuma mudança de produção executada. Aplique as etapas na ordem, com evidência do destino correto.

1. Disponibilizar branch/projeto de staging separado. A criação pelo conector falhou duas vezes com solicitação inválida/expirada. Não copiar dados reais para fazer testes. Não tratar PostgreSQL/PGlite local como homologação de Auth, Storage ou Edge Functions.
2. Confirmar três contas dedicadas: usuárias A e B e administrador. Bootstrap do primeiro admin deve ser feito pela operação confiável usando o UUID confirmado da conta no staging; não criar autopromoção acessível ao público. Configurar variáveis protegidas para o runner.
3. Aplicar as cinco migrations pendentes no staging respeitando suas versões canônicas. Os arquivos foram gerados pelo CLI; usar o histórico real para evitar reaplicar DDL já executado. O script ATUALIZACAO.sql é alternativa transacional para instalações compatíveis, não uma segunda etapa após db push.
4. Publicar em staging catalog-refresh e account-erasure com seus arquivos relativos e configuração de autenticação. catalog-refresh exige segredo próprio; account-erasure valida JWT e senha atual no handler. Conferir schema/RPCs antes de habilitar exclusão no cliente.
5. Rodar `npm run qa:staging-permissions`, exclusão de uma conta QA dedicada, recuperação por e-mail/deep link e concorrência em conexões distintas. Conferir fonte do catálogo autorizada e uma importação real completa. Dados injetados em testes não comprovam disponibilidade do Overpass.
6. Usar os scripts de carga e backup/restauração existentes em staging; registrar resultado real. Manter destino descartável e produção bloqueada. O teste local de restauração já existe, mas não valida snapshots gerenciados/SMTP/Storage remotos.
7. Confirmar backup recuperável e janela de manutenção antes do cutover. Pausar o cron de catálogo e drenar execuções antigas. Expirar leases sozinho não garante que workers antigos pararam.
8. Aplicar as migrations em produção, publicar o novo worker atômico e verificar permissão de execução, negação de raw upsert, sucesso/rollback/recibo e preservação dos lugares existentes. Só então reativar o cron.
9. Implantar e validar account-erasure com a proteção do último admin já ativa. Somente depois habilitar `EXPO_PUBLIC_ACCOUNT_ERASURE_ENABLED=true` na build apropriada. Nunca excluir contas reais como teste.
10. Configurar Sentry e alertas operacionais com credenciais fora do repositório. Não enviar tokens, corpos de relatos ou dados de sessão nos logs.
11. Configurar o projeto EAS e as credenciais FCM/APNs correspondentes à build. Configurar o segredo da entrega apenas no backend/Vault, conforme PUSH.md. Habilitar push de forma controlada e comprovar cadastro, consentimento, ticket, recibo, recebimento físico em Android/iPhone e opt-out antes da liberação ampla.

## Configuração protegida

O comando `npm run qa:backend-readiness` informa presença de configuração, sem validar credenciais ou executar alterações. O runner real de permissões usa:

- `QA_SUPABASE_URL`, `QA_PUBLISHABLE_KEY`.
- `QA_EMAIL_A`, `QA_PASSWORD_A`, `QA_EMAIL_B`, `QA_PASSWORD_B`.
- `QA_EMAIL_ADMIN`, `QA_PASSWORD_ADMIN`.
- `QA_EVIDENCE_FILE`, opcional, para resultado sem senhas/tokens.

Para os demais procedimentos: caixa QA e SMTP funcionais; `EXPO_PUBLIC_SENTRY_DSN`/configuração Sentry; `EAS_PROJECT_ID` e credenciais Expo/FCM/APNs; `BACKUP_DB_URL`, cópia dos objetos Storage e configuração; `RESTORE_DB_URL`, `RESTORE_PROJECT_REF` e confirmação do destino descartável. Não colar senhas ou chaves de serviço em mensagens nem colocá-las em EXPO_PUBLIC_.

## Retorno seguro

As telas comuns mantêm compatibilidade com backend 11. Uma versão anterior do app pode continuar lendo o backend 12. Ao reverter o worker, manter a importação pausada; não restaurar upsert direto nem remover a proteção do último admin apenas para fazer o worker antigo voltar. `supabase/rollback/atomic_catalog_ingestion.sql` remove a API/recibos, preserva lugares importados e mantém escrita direta revogada. Dados excluídos não são recuperados por rollback de código.

O histórico de papéis deve ser preservado. Desativar a UI nova é preferível a apagar tabelas de auditoria. Restauração de dados de produção exige procedimento operacional específico e pode perder escritas posteriores; o script automático bloqueia esse destino.
