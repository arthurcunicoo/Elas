-- Pause and drain importers first. Remove the API/receipts; preserve imported data.
-- Direct service-role writes stay revoked: do not reactivate the unsafe old writer.
begin;
drop function public.confirmar_catalogo_ingestao(uuid,jsonb);
drop function private.confirmar_catalogo_ingestao(uuid,jsonb);
drop table private.catalog_ingest_receipts;
notify pgrst,'reload schema';
commit;
