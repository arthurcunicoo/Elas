# Backup e restauração operacional

## Escopo e situação

Existe agora um exercício **local** reproduzível, `npm run test:restore`. Ele cria a base com todas as migrações, grava dados de teste e bytes de imagem separados, fecha a origem, restaura um novo banco a partir do snapshot, compara contagens/hashes e verifica RLS após a restauração. Corrupção de bytes é rejeitada. Auth/Storage são shims locais; isso não é uma restauração validada de backup gerenciado do Supabase.

Para validar a recuperação real ainda são necessários conexão administrativa, acesso ao backup/Storage, configuração externa e destino Supabase descartável. Não houve extração de dados privados de produção nem restauração em produção nesta etapa.

## Rotina proposta

Antes de um release/migração, confirmar backup do provedor e janela de retenção. Registrar responsável, horário UTC, origem, versão do app/schema, última escrita considerada e objetivos aprovados de perda de dados e prazo de recuperação. A frequência deve atender a esses objetivos; a simples existência de um dump não garante isso.

Congelar alterações de schema durante os dumps. Para consistência de Storage, coordenar uma janela sem uploads/remoções ou reconciliar os objetos referenciados pelo snapshot. Manter backups fora do repositório, em armazenamento criptografado, com controle de acesso e cópia independente. Nunca publicar dumps, senhas, JWTs ou chaves no ZIP do aplicativo.

As ferramentas seguem o fluxo oficial de dumps separados de roles/schema/data do CLI Supabase, que aplica filtros próprios para os schemas internos. O CLI e o mecanismo exigido pela versão instalada (Docker/ambiente suportado) precisam estar funcionais; confirmar com `supabase db dump --help` e a documentação atual.

1. Em ambiente protegido, definir `STORAGE_ADMIN_URL` e `STORAGE_ADMIN_KEY` da origem. A chave é administrativa do servidor; não usar no app.
2. Copiar os bytes e configurações de buckets:

```sh
node scripts/operations/storage-copy.mjs backup /CAMINHO-PRIVADO/storage-snapshot
```

3. Preparar `project-config.json`: configuração de Auth/SMTP e URLs de redirecionamento, buckets, Edge Functions/versões, áreas atendidas, extensões, cron e referência ao cofre de segredos. Credenciais e chaves criptográficas exigem cópia própria protegida. O script não consegue inferir configurações externas do banco.
4. Definir `BACKUP_DB_URL`, `BACKUP_STORAGE_DIR` e `BACKUP_CONFIG_FILE`, então:

```sh
node scripts/operations/backups.mjs backup /CAMINHO-PRIVADO/backup-NOVO
node scripts/operations/backups.mjs verify /CAMINHO-PRIVADO/backup-NOVO
```

O diretório precisa ser novo e estar fora do repositório. São gerados `roles.sql`, `schema.sql`, `data.sql`, `history_schema.sql` e `history_data.sql`, cópia separada de Storage/configuração, customizações de schemas gerenciados e manifesto SHA-256/tamanhos. O histórico de migrações exige dumps separados; o dump comum não basta. O verificador detecta arquivos ausentes, alterados e caminhos inválidos; não comprova sozinho que o SQL restaura corretamente.

## Ensaio real em staging

Usar um projeto descartável, vazio e com versão PostgreSQL/extensões compatíveis — atualmente a origem usa PostgreSQL 17, PostGIS e pg_trgm. Conferir a documentação de migração do Supabase para as versões de Auth/Storage utilizadas.

Definir `RESTORE_PROJECT_REF`, `RESTORE_DB_URL` do **destino** e `RESTORE_CONFIRM=disposable-staging`. O script recusa o projeto real conhecido e exige que host/usuário da conexão correspondam ao projeto declarado.

```sh
node scripts/operations/backups.mjs restore /CAMINHO-PRIVADO/backup-NOVO
```

O restore inclui o histórico de migrações e reaplica as quatro políticas de avatar em `storage.objects` a partir de `supabase/RESTORE-CUSTOMIZACOES.sql`. O dump comum exclui customizações de schemas gerenciados; compare esse arquivo com a configuração real sempre que novas políticas forem adicionadas.

O restore SQL é atômico com `ON_ERROR_STOP`, replica triggers durante a importação e restaura o modo normal no final. Jobs de cron no destino são desativados. Nunca deixar uma cópia restaurada acionar endpoints/segredos da produção.

Em seguida, usar as credenciais administrativas **do destino** para copiar os bytes:

```sh
node scripts/operations/storage-copy.mjs restore /CAMINHO-PRIVADO/backup-NOVO/storage
```

O script verifica todos os hashes antes de enviar. Preserva a visibilidade do bucket e permite restaurar os bytes sobre metadados já importados pelo SQL; não altera o projeto real. Conferir também proprietário, tamanho, MIME e políticas com um login real no destino. Após qualquer falha, investigar o estado parcial do Storage; a transação SQL não inclui uploads HTTP.

Restaurar configurações de Auth/SMTP/redirects, secrets das Edge Functions, chaves do app, fontes de tiles e assinaturas. Segredos do Vault podem depender das chaves da origem: não assumir que copiar suas linhas basta para decriptá-los no projeto novo. Regenerar o segredo do job de catálogo, configurar endpoint de staging e só então reativar jobs aprovados. Reimplantar funções a partir do código versionado.

## Critérios de aceitação

Comparar contagens por tabela e amostras aprovadas, schema 11 / 20 migrações, constraints/índices/extensões, resumos comunitários, escopos pessoais/públicos e RLS. Conferir leitura/escrita de avatar por titular, bloqueio de outro usuário, login, recuperação por e-mail, eventos e mapa em build QA apontando ao destino.

Medir tempo do backup, transferência e recuperação. Registrar o ponto recuperado, perda real de dados, problemas e correções; repetir o ensaio depois de corrigir falhas. Só então preencher `backup-restore` em `qa/release-evidence.json`. Um teste local bem-sucedido não deve preencher esse requisito remoto.

Referências oficiais: [Backup e restore com CLI](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore), [backups gerenciados](https://supabase.com/docs/guides/platform/backups), [Storage via S3](https://supabase.com/docs/guides/storage/s3/compatibility).

Após restore em staging, `RESTORE-CUSTOMIZACOES.sql` também desativa push, limpa endpoint/hash/projeto e cancela fila pendente. Reconfigurar somente para o destino aprovado. Isso não altera o projeto de origem.
