-- Supabase unified logs / ClickHouse, not the application PostgreSQL database.
-- Set the query tool's time window explicitly for incidents (maximum 24 hours).
SELECT
 JSONExtractString(event_message,'service') AS service,
 JSONExtractString(event_message,'release') AS release,
 JSONExtractUInt(event_message,'status') AS status,
 count(*) AS requests,
 quantile(0.95)(JSONExtractUInt(event_message,'duration_ms')) AS p95_ms
FROM logs
WHERE source='function_logs' AND startsWith(event_message,'{"event":"edge_request"')
GROUP BY service,release,status
ORDER BY requests DESC;

-- Correlate one response x-elas-request-id without exposing headers or bodies:
-- SELECT timestamp,event_message FROM logs
-- WHERE source='function_logs'
-- AND JSONExtractString(event_message,'request_id')='REQUEST_ID_FROM_RESPONSE';
