# Retenção dos envios

`private.envios` mantém o pedido original para reconhecer retries, independentemente de edições posteriores. A retenção configurável começa em **30 dias**, em `private.retencao_envios.dias` (7–365). O cron `elas-idempotency-retention` roda a cada hora no minuto 20, em lotes de até 5.000, com `FOR UPDATE SKIP LOCKED`. Monitorar backlog: 30 dias é a idade de elegibilidade, não promessa de remoção naquele segundo.

Um hold de auditoria exige `reter_ate` finito e `motivo_retencao` com 5–500 caracteres. O operador do banco pode atribuir/renovar a data de um envio identificado, registrando responsável, justificativa e chamado. O lote preserva o pedido enquanto a data estiver no futuro. Quando o prazo vence, volta a ser elegível. Não foi criado arquivamento automático nem política jurídica de descarte; conteúdo e histórico não são excluídos por essa limpeza.

O fingerprint SHA-256 do pedido original fica no próprio relato/solicitação, sem uma segunda tabela de chaves eternas. O backfill usa os envios existentes. Após a limpeza, repetir o mesmo pedido reconhece o registro preservado, mesmo que seu texto tenha sido corrigido; outro payload com a mesma chave é recusado. O cliente não pode editar o fingerprint.

A garantia após a janela depende de o registro original continuar existindo. Exclusão física administrativa do conteúdo e do pedido elimina a memória daquela chave. Clientes não devem reutilizar UUIDs nem manter tentativas offline indefinidamente. A retirada pelo autor preserva o registro e a proteção.

Operação: revisar `qa/operations-queries.sql`, acompanhar falhas do cron e quantidade/idade dos elegíveis, justificar holds longos e ajustar frequência/lote conforme volume. Reduzir `dias` torna dados antigos elegíveis na próxima execução; avaliar antes de alterar. Não conceder tabelas privadas nem execução da limpeza aos clientes.

Aplicado no projeto conectado. A tabela estava vazia na conferência por leitura. A limpeza manual imediata foi bloqueada pela revisão automática; os testes de exclusão, lote, holds e replay ocorreram somente em banco local isolado.

Referências: [Supabase Cron](https://supabase.com/docs/guides/cron/quickstart), [exclusão em lotes](https://supabase.com/docs/guides/database/postgres/data-deletion).
