-- Optional MVP seed. Approximate coordinates: verify before public release.
-- Does not create accounts, reviews or safety classifications.
insert into public.lugares(id,nome,endereco,latitude,longitude,categoria) values
('nereu','Praça Nereu Ramos','Centro - Criciúma - SC',-28.6773,-49.3692,'park'),
('congresso','Praça do Congresso','Centro - Criciúma - SC',-28.6738,-49.3705,'park')
on conflict (id) do nothing;
