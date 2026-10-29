-- Finalization locates an active lease without scanning 30 days of delivery history.
create unique index push_fila_lease_idx on private.push_fila(lease) where lease is not null;
