import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export const normalizeName = text => String(text ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
const text = (value, max) => typeof value === 'string' ? value.trim().slice(0, max) : '';
const usefulAddress = value => !!value && !/^(criciuma|centrocriciuma)(sc)?$/.test(normalizeName(value));
const distance = (a, b) => {
  const rad = Math.PI / 180, dLat = (a.latitude - b.latitude) * rad, dLon = (a.longitude - b.longitude) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.latitude * rad) * Math.cos(b.latitude * rad) * Math.sin(dLon / 2) ** 2;
  return 12_742_000 * Math.atan2(Math.sqrt(h), Math.sqrt(Math.max(0, 1 - h)));
};
export function overtureCategory(primary, hierarchy = []) {
  const tags = new Set([primary, ...hierarchy].filter(Boolean));
  if (['pharmacy', 'drugstore'].some(x => tags.has(x))) return 'health';
  if (['park', 'public_plaza', 'playground', 'botanical_garden', 'garden'].some(x => tags.has(x))) return 'parks';
  if (['coffee_shop', 'cafe', 'bar', 'pub', 'beer_bar', 'cocktail_bar', 'tea_house'].some(x => tags.has(x))) return 'cafes';
  if (tags.has('food_and_drink')) return 'restaurants';
  if (['grocery_store', 'supermarket', 'convenience_store', 'market', 'farmers_market'].some(x => tags.has(x))) return 'markets';
  if (tags.has('shopping')) return 'shops';
  if (tags.has('health_care')) return 'health';
  if (tags.has('education')) return 'education';
  if (tags.has('sports_and_recreation')) return 'sports';
  if (['services_and_business', 'lifestyle_services', 'travel_and_transportation'].some(x => tags.has(x))) return 'services';
  return 'other';
}
const legacyCategory = row => row.categoria_app || ({ park: 'parks', restaurant: 'restaurants', fast_food: 'restaurants', cafe: 'cafes', bar: 'cafes', pub: 'cafes', supermarket: 'markets', convenience: 'markets', pharmacy: 'health', hospital: 'health', clinic: 'health', doctors: 'health', dentist: 'health', university: 'education', college: 'education', school: 'education', fitness_centre: 'sports', sports_centre: 'sports', mall: 'shops' }[row.categoria] ?? 'other');
const residential = /\b(condom[ií]nio|residencial|apartamento|moradia|resid[eê]ncia)\b/i;
const generic = /^(restaurante|bar|cafe|parque|farmacia|dentista|banco|loja|canteiroavenida|canteiro)$/;
const safeWebsites = values => (Array.isArray(values) ? values : []).filter(v => typeof v === 'string' && /^https?:\/\//i.test(v) && v.length <= 500).slice(0,3);
const compatible = (a,b) => a === b || a === 'other' || b === 'other';

export function prepareCatalog(snapshot, existing, manualLinks = {}) {
  if (!snapshot || snapshot.type !== 'FeatureCollection' || !Array.isArray(snapshot.features) || snapshot.features.length > 20000 || !/^\d{4}-\d{2}-\d{2}\.\d+$/.test(snapshot.release ?? '')) throw new Error('Invalid or unversioned snapshot.');
  const known = existing.filter(row => !row.duplicado_de && !row.oculto_catalogo).map(row => ({ ...row, appCategory: legacyCategory(row) }));
  const records = [], review = [], rejected = {}, seen = new Set();
  const reject = reason => { rejected[reason] = (rejected[reason] ?? 0) + 1; };
  for (const feature of [...snapshot.features].sort((a,b) => (b.properties?.confidence ?? 0) - (a.properties?.confidence ?? 0) || String(a.properties?.id).localeCompare(String(b.properties?.id)))) {
    const p = feature?.properties ?? {}, [longitude, latitude] = feature?.geometry?.coordinates ?? [];
    const name = text(p.names?.primary,150), id = text(p.id,80);
    if (feature?.geometry?.type !== 'Point' || !/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(id) || !name || !Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < -28.85 || latitude > -28.55 || longitude < -49.55 || longitude > -49.2) { reject('invalid'); continue; }
    if (seen.has(id)) { reject('same_gers'); continue; } seen.add(id);
    if (residential.test(name) || generic.test(normalizeName(name))) { reject('not_public_destination'); continue; }
    if (!Number.isFinite(p.confidence) || p.confidence < .9) { reject('low_confidence'); continue; }
    if (['closed', 'permanently_closed'].includes(p.operating_status)) { reject('closed'); continue; }
    const address = (p.addresses ?? []).find(a => a?.country === 'BR' && normalizeName(a.locality) === 'criciuma');
    if (!address) { reject('city_not_confirmed'); continue; }
    const primary = text(p.taxonomy?.primary ?? p.basic_category ?? p.categories?.primary,80);
    const category = overtureCategory(primary, p.taxonomy?.hierarchy);
    if (category === 'other') { reject('category_needs_review'); continue; }
    const street = text(address.freeform,220);
    // A useful address is required for new imports. Missing metadata is never invented.
    const displayAddress = [street, 'Criciúma', 'SC'].filter(Boolean).join(' · ');
    const incoming = { latitude, longitude, nome: name, endereco: displayAddress, appCategory: category };
    const near = known.filter(row => distance(row,incoming) <= 100 && compatible(row.appCategory, category));
    const exact = near.filter(row => normalizeName(row.nome) === normalizeName(name) && distance(row,incoming) <= 50);
    let target = manualLinks[id] ? known.find(r => r.id === manualLinks[id]) : exact.length === 1 ? exact[0] : null;
    if (manualLinks[id] && !target) { reject('manual_link_missing'); continue; }
    if (!target) {
      const uncertain = near.filter(row => { const a=normalizeName(row.nome),b=normalizeName(name); return Math.min(a.length,b.length)>=5 && (a.includes(b) || b.includes(a)); });
      if (exact.length > 1 || uncertain.length) { review.push({ gers: id, name, category, coordinates:[longitude,latitude], address:displayAddress, candidate_ids:[...new Set([...exact,...uncertain].map(r=>r.id))], reason:'Possible overlap; requires verification before importing.' }); continue; }
      if (!street) { reject('missing_street'); continue; }
    }
    if (target && usefulAddress(target.endereco) && street) {
      const oldNumber = target.endereco.match(/,\s*(\d+)\b/)?.[1], newNumber = street.match(/,\s*(\d+)\b/)?.[1];
      if (oldNumber && newNumber && oldNumber !== newNumber && !manualLinks[id]) { review.push({gers:id,name,candidate_ids:[target.id],reason:'Conflicting street numbers; preserved existing address.'}); continue; }
    }
    records.push({ gers:id, target_id:target?.id ?? null, nome:name, endereco:displayAddress, latitude, longitude, categoria:primary, categoria_app:category, confianca:p.confidence, fontes:(p.sources ?? []).map(s=>({dataset:s.dataset,license:s.license,update_time:s.update_time})), websites:safeWebsites(p.websites), telefones:(Array.isArray(p.phones)?p.phones:[]).filter(x=>typeof x==='string' && x.length<=40).slice(0,3), human_link:!!manualLinks[id] });
    if (!target) known.push({ ...incoming, id:`overture:${id}` });
  }
  return { release:snapshot.release, bbox:snapshot.bbox, records, review, stats:{downloaded:snapshot.features.length,accepted:records.length,matched:records.filter(r=>r.target_id).length,new:records.filter(r=>!r.target_id).length,review:review.length,rejected} };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [snapshotPath, existingPath, outputPath, manualPath] = process.argv.slice(2);
  if (!outputPath) throw new Error('Usage: node scripts/overture_catalog.mjs SNAPSHOT EXISTING OUTPUT [MANUAL_LINKS]');
  const data = prepareCatalog(JSON.parse(readFileSync(snapshotPath,'utf8')), JSON.parse(readFileSync(existingPath,'utf8')), manualPath ? JSON.parse(readFileSync(manualPath,'utf8')) : {});
  writeFileSync(outputPath,JSON.stringify(data,null,2)+'\n'); console.log(JSON.stringify(data.stats));
}
