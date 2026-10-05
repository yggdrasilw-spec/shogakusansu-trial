"""Portable verification of the selected public tree and every numeric row."""
import argparse
import hashlib
import json
from pathlib import Path
from browser_numeric_oracle import regenerate, encode


def verify(root, spec_path):
    root = Path(root); manifest = json.loads((root / 'manifest.json').read_bytes())
    files = manifest['files']
    assert manifest['format'] == 'curriculum-experimental-publication/2'
    assert manifest['publication'] == 'experimental_trial'
    assert manifest['teacher_review'] == 'not_performed'
    assert not manifest['private_sources_included']
    assert {p.relative_to(root).as_posix() for p in root.rglob('*') if p.is_file()} == {*files, 'manifest.json'}
    sha = lambda raw: hashlib.sha256(raw).hexdigest()
    assert sha(encode(files)) == manifest['artifact_sha256']
    for name, descriptor in files.items():
        file = root / name
        assert not file.is_symlink() and file.resolve().is_relative_to(root.resolve())
        raw = file.read_bytes()
        assert len(raw) == descriptor['bytes'] and sha(raw) == descriptor['sha256'], name
    pack = json.loads((root / 'browser-pack.json').read_bytes())
    bound = dict(pack); bound.pop('contract')
    assert pack['contract'] == manifest['browser_contract'] == sha(encode(bound))
    assert len(set(pack['topic_order'])) == len(pack['topic_order']) == len(pack['topics']) == 281
    spec = json.loads(Path(spec_path).read_bytes())
    assert spec['format'] == 'browser-numeric-spec/1' and set(spec['topics']) == set(pack['topics'])
    total = 0; results = {}
    for topic, numeric_spec in spec['topics'].items():
        descriptor = pack['topics'][topic]['pool']
        assert descriptor['sha256'] == numeric_spec['pool_sha256']
        raw = (root / descriptor['url']).read_bytes()
        assert sha(raw) == descriptor['sha256'] and len(raw) == descriptor['bytes']
        rows = json.loads(raw)['rows']; expected = regenerate(numeric_spec)
        assert encode([{key: row[key] for key in expected[0]} for row in rows]) == encode(expected), topic
        assert len(rows) == descriptor['rows'] and all(row['prompt'] and row['worked_steps'] for row in rows), topic
        assert all(p in pack['topics'] for p in pack['topics'][topic]['prerequisites']), topic
        total += len(rows); results[topic] = {'rows':len(rows),'numeric_sha256':sha(encode(expected))}
    assert total == manifest['candidate_rows'] == 82154
    return {'status':'pass','topics':281,'rows':total,'artifact_sha256':manifest['artifact_sha256'],
            'method':'standalone integer/Fraction oracle; full set comparison; file hashes; authored explanations present',
            'teacher_review':'not_performed','numeric_topics':results}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(); parser.add_argument('--root',required=True); parser.add_argument('--spec',required=True); parser.add_argument('--report')
    args = parser.parse_args(); result = verify(args.root,args.spec)
    if args.report: Path(args.report).write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({k:v for k,v in result.items() if k != 'numeric_topics'}))
