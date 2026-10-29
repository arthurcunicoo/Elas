#!/usr/bin/env python3
"""Download a bounded Places snapshot through STAC, preserving the host HTTPS proxy.

pip install -r scripts/overture-requirements.txt
python scripts/overture_download.py --bbox=-49.39,-28.72,-49.34,-28.66 --output=places.geojson
"""
import argparse
import io
import json
import math
import re
import urllib.request
from pathlib import Path

import pyarrow.compute as pc
import pyarrow.dataset as ds
import pyarrow.fs as fs
import pyarrow.parquet as pq
from shapely import from_wkb


def get_bytes(url, maximum=30_000_000):
    with urllib.request.urlopen(url, timeout=30) as response:
        data = response.read(maximum + 1)
    if len(data) > maximum:
        raise ValueError('The STAC response exceeds the supported size.')
    return data


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--bbox', required=True, help='west,south,east,north')
    parser.add_argument('--release')
    parser.add_argument('--output', required=True, type=Path)
    args = parser.parse_args()
    box = [float(x) for x in args.bbox.split(',')]
    if len(box) != 4 or not all(math.isfinite(x) for x in box):
        parser.error('Provide four finite coordinates.')
    west, south, east, north = box
    if not (-49.55 <= west < east <= -49.2 and -28.85 <= south < north <= -28.55):
        parser.error('This importer is scoped to the Criciúma pilot.')
    if east - west > .08 or north - south > .08:
        parser.error('Use a recorte de até 0.08 grau por eixo.')
    catalog = json.loads(get_bytes('https://stac.overturemaps.org/catalog.json'))
    release = args.release or catalog.get('latest')
    if not release:
        latest = next((x for x in catalog['links'] if x.get('latest')), None)
        release = latest['href'].rstrip('/').split('/')[-2] if latest else None
    if not release or not re.fullmatch(r'\d{4}-\d{2}-\d{2}\.\d+', release):
        raise ValueError('A valid Overture release could not be resolved.')
    index = pq.read_table(io.BytesIO(get_bytes(f'https://stac.overturemaps.org/{release}/collections.parquet')))
    intersects = ((pc.field('collection') == 'place') & (pc.field('type') == 'Feature')
                  & (pc.field('bbox', 'xmin') < east) & (pc.field('bbox', 'xmax') > west)
                  & (pc.field('bbox', 'ymin') < north) & (pc.field('bbox', 'ymax') > south))
    files = [x['aws']['alternate']['s3']['href'].removeprefix('s3://')
             for x in index.filter(intersects).column('assets').to_pylist()]
    prefix = f'overturemaps-us-west-2/release/{release}/theme=places/type=place/'
    if not files or any(not x.startswith(prefix) for x in files):
        raise ValueError('No valid Places assets intersect this area.')
    # PyArrow S3 does not inherit urllib's proxy configuration automatically.
    proxy = urllib.request.getproxies().get('https')
    filesystem = fs.S3FileSystem(anonymous=True, region='us-west-2',
                                connect_timeout=15, request_timeout=45,
                                **({'proxy_options': proxy} if proxy else {}))
    dataset = ds.dataset(files, filesystem=filesystem, format='parquet')
    columns = [x for x in ['id', 'names', 'confidence', 'basic_category', 'taxonomy',
                           'categories', 'addresses', 'operating_status', 'sources',
                           'websites', 'phones', 'geometry'] if x in dataset.schema.names]
    area = ((pc.field('bbox', 'xmin') >= west) & (pc.field('bbox', 'xmin') <= east)
            & (pc.field('bbox', 'ymin') >= south) & (pc.field('bbox', 'ymin') <= north))
    features = []
    for batch in dataset.to_batches(columns=columns, filter=area, batch_size=256,
                                     batch_readahead=1, fragment_readahead=1, use_threads=False):
        for row in batch.to_pylist():
            point = from_wkb(row.pop('geometry'))
            if point.geom_type != 'Point' or not (west <= point.x <= east and south <= point.y <= north):
                continue
            features.append({'type': 'Feature', 'geometry': {'type': 'Point', 'coordinates': [point.x, point.y]}, 'properties': row})
            if len(features) > 20000:
                raise ValueError('Too many places; split the requested area.')
    payload = {'type': 'FeatureCollection', 'release': release, 'bbox': box,
               'source': 'Overture Maps Places', 'features': features}
    args.output.parent.mkdir(parents=True, exist_ok=True)
    temporary = args.output.with_suffix(args.output.suffix + '.tmp')
    temporary.write_text(json.dumps(payload, ensure_ascii=False, default=str), encoding='utf-8')
    temporary.replace(args.output)
    print(json.dumps({'release': release, 'bbox': box, 'features': len(features), 'output': str(args.output)}))


if __name__ == '__main__':
    main()
