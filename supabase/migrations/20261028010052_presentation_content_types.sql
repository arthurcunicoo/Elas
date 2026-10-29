-- Presentation-only content. Existing real tables, permissions and metrics are unchanged.
alter table public.conteudos_demonstracao drop constraint conteudos_demonstracao_tipo_check;
alter table public.conteudos_demonstracao add constraint conteudos_demonstracao_tipo_check check(tipo in ('evento','impacto','avaliacao','enquete','relato'));
alter table public.conteudos_demonstracao add column dados jsonb not null default '{}'::jsonb
 check(jsonb_typeof(dados)='object' and octet_length(dados::text)<=20000);
alter table public.conteudos_demonstracao add constraint demonstracao_enquete_dados check(
 tipo<>'enquete' or (inicia_em is not null and jsonb_typeof(dados->'opcoes') is not distinct from 'array' and jsonb_array_length(dados->'opcoes') between 2 and 6));
notify pgrst,'reload schema';
