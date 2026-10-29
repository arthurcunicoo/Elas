# Operação da moderação

A entrada **Administração** e as cinco rotas administrativas do app atual exigem sessão autenticada, backend configurado e papel exatamente `admin`. Usuários comuns, demonstração e moderadores não recebem essa entrada. O app aguarda a primeira leitura de permissões em um link administrativo, nega papéis desconhecidos e reconsulta o perfil ao voltar do background. O banco continua sendo a autoridade; ocultar o menu não concede nem revoga permissões.

As permissões limitadas de moderação já existentes no backend foram preservadas para compatibilidade: um moderador pode atuar em relatos/melhorias pelos RPCs autorizados, mas não ganha acesso ao painel atual, aos perfis, ao catálogo ou à publicação. Uma futura interface de moderação deve ter nome/rota próprios. Esta revisão não promoveu nem rebaixou contas.

O painel abre relatos pendentes; cada área seleciona seu filtro inicial de análise. Busca com debounce, filtros e cursor continuam no servidor. A lista mostra registros carregados, ordem dos mais recentes, carregamento incremental, botão de próxima página e tentativa após erro. O número carregado não é apresentado como total da cidade.

`fila_moderacao` reaproveita a paginação e acrescenta a revisão de cada item. `moderar_revisao` trava a linha e compara uma revisão inteira antes de usar a regra de moderação. Edição do autor ou mudança A → B → A invalida decisão antiga. Conflito não cria histórico/notificação: a tela fecha o editor, recarrega e pede nova leitura. Na classificação de lugares, o snapshot é o timestamp emitido pelo banco, sem conversão por `Date`.

Regras preservadas: usuário comum não acessa fila; moderador atua em relatos/melhorias; avaliações e catálogo exigem administrador; ninguém aprova conteúdo próprio. Decisão aceita registra motivo/histórico. APIs antigas continuam para instalações anteriores; clientes novos usam revisão. Um cliente antigo continua checando status/categoria, sem a nova proteção por revisão.

## Rotina mínima

1. Revisar filtros, contexto, histórico e lugar vinculado antes de decidir.
2. Informar motivo claro. Após conflito, conferir conteúdo atualizado antes de escolher novamente.
3. Em dúvida de permissão, interromper a decisão. O badge do frontend não autoriza ações.
4. Registrar erros, idade da fila e necessidade de escalonamento. `qa/operations-queries.sql` permite monitorar agregados.

## Papéis

`private.papeis` continua sem acesso direto pelos clientes. A tela Equipe e permissões usa RPCs exclusivos de admin, com motivo e comparação do papel anterior. `user_metadata` não concede papéis. Cadastros não promove usuários. Antes de uma mudança, identificar a conta pelo UUID/identidade, registrar papel anterior/novo, motivo, responsável e chamado. Conferir que permanece pelo menos um administrador ativo; aplicar/verificar a transição em transação e validar com a conta destinatária. Uma sessão aberta não substitui a autorização atual consultada por RPC.

Editor de papéis, histórico e proteção automática do último administrador foram implementados no backend 12. A proteção também cobre exclusão pelo Auth e início de exclusão de conta. Esta entrega ainda depende de implantação em staging/produção; veja ROLLOUT-BACKEND.md.

## Próximos incrementos

- Atribuição/reserva de revisão e métricas de idade/tempo de fila.
- Lotes pequenos, revisão individual, resultado por item e proteção contra retry.
- Painel operacional separado quando equipe/fila justificarem.

Os testes validam permissões e conflitos por snapshots/revisões em PostgreSQL local. Não substituem dois moderadores em aparelhos reais simultaneamente.
