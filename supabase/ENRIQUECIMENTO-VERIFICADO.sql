-- Reversible display enrichment from identified public sources. No place row is removed.
begin;
select id from public.lugares where id in ('congresso','osm:way:241033487','osm:node:13119695657','osm:way:1427146541') for update;
update public.lugares set latitude=-28.6751955,longitude=-49.3685816,endereco='Rua Lauro Müller · Centro · Criciúma · SC',
 fonte_dados='https://viva.criciuma.sc.gov.br/pontoturistico/7',dados_verificados_em=now(),
 foto_url='https://upload.wikimedia.org/wikipedia/commons/7/7d/Pra%C3%A7a_do_Congresso.jpg',
 foto_autor='Secretaria de Turismo de Criciúma / Ruy Luiz Machado',foto_licenca='CC BY-SA 4.0',
 foto_fonte='https://commons.wikimedia.org/wiki/File:Pra%C3%A7a_do_Congresso.jpg',foto_data='2013',
 cadastro_revisao=cadastro_revisao+1,atualizado_em=now() where id='congresso';
update public.lugares set duplicado_de='congresso' where id='osm:way:241033487';
update public.lugares set duplicado_de='osm:node:13119695657' where id='osm:way:1427146541';
update public.lugares set oculto_catalogo=true where origem='osm' and lower(nome) in ('canteiro avenida','canteiro');
update public.lugares set endereco='Avenida Getúlio Vargas · Centro · Criciúma · SC',
 fonte_dados='https://viva.criciuma.sc.gov.br/pontoturistico/6',dados_verificados_em=now(),
 foto_url='https://upload.wikimedia.org/wikipedia/commons/9/93/Pra%C3%A7a_Nereu_Ramos1.JPG',
 foto_autor='Latinov',foto_licenca='CC BY-SA 3.0',foto_fonte='https://commons.wikimedia.org/wiki/File:Pra%C3%A7a_Nereu_Ramos1.JPG',foto_data='2010',
 cadastro_revisao=cadastro_revisao+1,atualizado_em=now() where id='nereu';
update public.lugares set endereco='Avenida Gabriel Zanette · Próspera · Criciúma · SC',
 fonte_dados='https://viva.criciuma.sc.gov.br/pontoturistico/23',dados_verificados_em=now(),
 foto_url='https://upload.wikimedia.org/wikipedia/commons/d/d8/Parque_das_Na%C3%A7%C3%B5es_Crici%C3%BAma.jpg',
 foto_autor='Secretaria de Turismo de Criciúma',foto_licenca='CC BY-SA 4.0',foto_fonte='https://commons.wikimedia.org/wiki/File:Parque_das_Na%C3%A7%C3%B5es_Crici%C3%BAma.jpg',foto_data='2023',
 cadastro_revisao=cadastro_revisao+1,atualizado_em=now() where id='osm:way:453621835';
-- Official site identifies this as the pedestrian access; the other Overture address is parking.
update public.lugares set endereco='Praça Nereu Ramos, 364 · Centro · Criciúma · SC (acesso de pedestres)',
 fonte_dados='https://www.shoppingdella.com.br/',dados_verificados_em=now(),cadastro_revisao=cadastro_revisao+1,atualizado_em=now()
 where id='osm:node:9478440538';
update public.lugares set endereco='Avenida Getúlio Vargas, 211 · Centro · Criciúma · SC',
 fonte_dados='https://www.bb.com.br/site/pro-seu-negocio/agencias-empresa/',dados_verificados_em=now(),cadastro_revisao=cadastro_revisao+1,atualizado_em=now()
 where id='osm:node:5564808595';
-- Review evidence for the legacy Congresso ID, including the low-confidence GERS record.
insert into public.lugares_fontes(provedor,referencia,lugar_id,versao,confianca,propriedades) values
 ('osm','way/241033487','congresso',null,null,'{"verification":"Same Praça do Congresso; manual demonstration coordinate corrected using the OSM polygon and official municipal address."}'),
 ('overture','3b62ac24-d72e-4bff-8259-55ae95df0e75','congresso','2026-09-23.1',0.6633779406547546,'{"human_verified":true,"source":"https://viva.criciuma.sc.gov.br/pontoturistico/7","reason":"Low confidence record linked only after checking the official named plaza; not used to import an unverified place."}'),
 ('osm','way/1427146541','osm:node:13119695657',null,null,'{"verification":"The OSM Pomar node is inside the same-name restaurant building polygon, about 9 metres from its centroid."}')
 on conflict(provedor,referencia) do nothing;
-- Specific pharmacy categories override the provider's broader retail parent.
update public.lugares l set categoria_app='health' where origem='overture' and categoria in ('pharmacy','drugstore') and categoria_app='shops'
 and not exists(select 1 from public.historico_status h where h.tipo='lugar' and h.registro_id=l.id);
update public.lugares_fontes set propriedades=jsonb_set(propriedades,'{categoria_app}','"health"'::jsonb) where provedor='overture' and propriedades->>'categoria' in ('pharmacy','drugstore');
-- Confirmed same-name pharmacy, about 2.7m between source points; the other Raia branches remain separate.
update public.lugares set duplicado_de='osm:way:165640972' where id='overture:7697a2a3-50a7-49db-88e8-ee89d52c94cb';
update public.lugares_fontes set lugar_id='osm:way:165640972' where provedor='overture' and referencia='7697a2a3-50a7-49db-88e8-ee89d52c94cb';
-- Official O Gral site confirms street, number and room; the provider point is 12m from the OSM point.
update public.lugares set nome='O Gral Farmácia de Manipulação',endereco='Rua Coronel Pedro Benedet, 350, sala 05 · Centro · Criciúma · SC',
 fonte_dados='https://www.ogral.com.br/',dados_verificados_em=now(),cadastro_revisao=cadastro_revisao+1,atualizado_em=now() where id='osm:node:5672318593';
update public.lugares set duplicado_de='osm:node:5672318593' where id='overture:1fe62d36-a91b-4d44-8ffe-0931085aff58';
insert into public.lugares_fontes(provedor,referencia,lugar_id,versao,confianca,propriedades)
 values('overture','1fe62d36-a91b-4d44-8ffe-0931085aff58','osm:node:5672318593','2026-09-23.1',0.9571979641914368,'{"human_verified":true,"source":"https://www.ogral.com.br/","reason":"Same pharmacy, street number and room, and source positions about 12m apart."}')
 on conflict(provedor,referencia) do update set lugar_id=excluded.lugar_id;
commit;
