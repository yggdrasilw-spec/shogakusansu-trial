"""Standalone exact numeric regeneration from declarative specs; stdlib only.

Does not import the production generator, copy candidate answers, or assess prose.
The authored specification is shared, so this is not independent teacher approval.
"""
import argparse
from fractions import Fraction
import hashlib
import itertools
import json
import math
from pathlib import Path

SAFE = 9007199254740991


def encode(value):
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(',', ':'), allow_nan=False)+'\n').encode()


def digest(raw):
    return hashlib.sha256(raw).hexdigest()


def load(raw):
    def unique(pairs):
        result = {}
        for key, value in pairs:
            if key in result: raise ValueError('duplicate_json_key')
            result[key] = value
        return result
    return json.loads(raw, object_pairs_hook=unique,
        parse_constant=lambda _: (_ for _ in ()).throw(ValueError('nonfinite_json')))


def unpack(value):
    if type(value) is int and abs(value) <= SAFE: return value
    if isinstance(value, dict) and set(value) == {'n', 'd'} and all(type(x) is int for x in value.values()) and 0 < value['d'] <= SAFE and abs(value['n']) <= SAFE:
        return Fraction(value['n'], value['d'])
    raise ValueError('numeric_type_or_range')


def pack(value):
    if isinstance(value, Fraction): return {'n': value.numerator, 'd': value.denominator}
    return value


def checked(value):
    if isinstance(value, Fraction) and max(abs(value.numerator), value.denominator) > SAFE:
        raise ValueError('numeric_overflow')
    if type(value) is int and abs(value) > SAFE: raise ValueError('numeric_overflow')
    return value


def calculate(node, environment, depth=0, work=None):
    work = [0] if work is None else work
    work[0] += 1
    if depth > 32 or work[0] > 512 or not isinstance(node, dict): raise ValueError('invalid_expression')
    if set(node) == {'literal'}:
        value = node['literal']
        if type(value) is bool: return value
        if isinstance(value, list): return [unpack(x) for x in value]
        return unpack(value)
    if set(node) == {'var'}:
        return environment[node['var']]
    if set(node) != {'op', 'args'} or not isinstance(node['args'], list):
        raise ValueError('invalid_expression')
    operation = node['op'];args = node['args']
    arity = {'if': 3, 'not': 1, 'is_integer': 1, 'and': None, 'or': None,
        **{name: 2 for name in ('add', 'sub', 'mul', 'div_exact', 'floor_div', 'mod',
           'gcd', 'lcm', 'rational', 'eq', 'rational_eq', 'lt', 'lte', 'in')}}
    if operation not in arity or (arity[operation] is None and not args) or (arity[operation] is not None and len(args) != arity[operation]):
        raise ValueError('unknown_operator_or_arity')
    if operation == 'if':
        condition = calculate(args[0], environment, depth+1, work)
        if type(condition) is not bool: raise ValueError('boolean_required')
        return calculate(args[1 if condition else 2], environment, depth+1, work)
    values = [calculate(arg, environment, depth+1, work) for arg in args]
    if operation in ('and', 'or', 'not'):
        if any(type(x) is not bool for x in values): raise ValueError('boolean_required')
        return all(values) if operation == 'and' else any(values) if operation == 'or' else not values[0]
    if operation == 'is_integer':
        return type(values[0]) is int or isinstance(values[0], Fraction) and values[0].denominator == 1
    if operation == 'eq': return type(values[0]) is type(values[1]) and values[0] == values[1]
    if operation == 'in':
        if not isinstance(values[1], list): raise ValueError('list_required')
        return values[0] in values[1]
    if any(type(x) is not int and not isinstance(x, Fraction) for x in values):
        raise ValueError('numeric_required')
    left, right = values
    if operation in ('floor_div', 'mod', 'gcd', 'lcm', 'rational') and any(type(x) is not int for x in values):
        raise ValueError('integer_required')
    if operation in ('div_exact', 'floor_div', 'mod', 'rational') and right == 0:
        raise ValueError('zero_division')
    if operation == 'rational' and right < 0: raise ValueError('positive_denominator_required')
    if operation == 'add': result = left + right
    elif operation == 'sub': result = left - right
    elif operation == 'mul': result = left * right
    elif operation == 'floor_div': result = left // right
    elif operation == 'mod': result = left % right
    elif operation == 'gcd': result = math.gcd(left, right)
    elif operation == 'lcm': result = 0 if not left or not right else abs(left*right)//math.gcd(left, right)
    elif operation == 'rational': result = Fraction(left, right)
    elif operation == 'div_exact':
        quotient = Fraction(left)/Fraction(right)
        if quotient.denominator != 1: raise ValueError('nonexact_division')
        result = quotient.numerator
    elif operation == 'rational_eq': result = left == right
    elif operation == 'lt': result = left < right
    elif operation == 'lte': result = left <= right
    return checked(result)


def domain_values(domain):
    if set(domain) == {'values'}:
        if not 0 < len(domain['values']) <= 10001: raise ValueError('domain_budget')
        return [unpack(x) for x in domain['values']]
    if set(domain) == {'min', 'max'}:
        lo, hi = unpack(domain['min']), unpack(domain['max'])
        if type(lo) is not int or type(hi) is not int or not 0 <= hi-lo <= 10000:
            raise ValueError('domain_budget')
        return list(range(lo, hi+1))
    if set(domain) == {'numerator', 'denominator'}:
        ns, ds = domain_values(domain['numerator']), domain_values(domain['denominator'])
        if len(ns)*len(ds) > 10000: raise ValueError('domain_budget')
        return list(dict.fromkeys(Fraction(n, d) for n in ns for d in ds if d > 0))
    raise ValueError('unknown_domain')


def regenerate(spec):
    definitions = spec['parameters'];names = [p['name'] for p in definitions]
    if len(names) != len(set(names)): raise ValueError('duplicate_parameter')
    independent = [p for p in definitions if p['role'] != 'derived']
    chosen = []
    if set(spec['ranges']) - set(names): raise ValueError('unknown_range')
    for parameter in independent:
        base = domain_values(parameter['domain'])
        values = domain_values(spec['ranges'].get(parameter['name'], parameter['domain']))
        if not set(values) <= set(base): raise ValueError('range_widens_domain')
        if parameter['type'] == 'integer' and any(type(v) is not int for v in values):
            raise ValueError('integer_parameter_required')
        chosen.append(values)
    if math.prod(len(v) for v in chosen) > 100000: raise ValueError('candidate_budget')
    rows = []
    for combination in itertools.product(*chosen):
        environment = dict(zip([p['name'] for p in independent], combination))
        for parameter in definitions:
            if parameter['role'] == 'derived':
                value = calculate(parameter['derive'], environment)
                if 'domain' in parameter and value not in domain_values(parameter['domain']):
                    raise ValueError('derived_domain_mismatch')
                environment[parameter['name']] = value
        checks = [calculate(expr, environment) for expr in spec['conditions']]
        forbidden = [calculate(expr, environment) for expr in spec['forbidden']]
        if any(type(x) is not bool for x in checks+forbidden): raise ValueError('boolean_constraint_required')
        if not all(checks) or any(forbidden): continue
        row = {'parameters': {k: pack(v) for k, v in environment.items()},
            'answer': pack(calculate(spec['answer'], environment)),
            'wrong': pack(calculate(spec['wrong'], environment))}
        if spec['denominator'] is not None:
            row['required_denominator'] = calculate(spec['denominator'], environment)
        rows.append(row)
        if len(rows) > 10000: raise ValueError('pool_budget')
    if not rows: raise ValueError('empty_pool')
    return rows


def verify(specification, site, expected_artifact):
    raw = Path(specification).read_bytes();document = load(raw)
    if document['format'] != 'browser-numeric-spec/1' or document['artifact_sha256'] != expected_artifact:
        raise ValueError('spec_artifact_mismatch')
    site = Path(site).absolute();files = {}
    for parent in (site, *site.parents):
        if parent.is_symlink() or (hasattr(parent, 'is_junction') and parent.is_junction()): raise ValueError('linked_site')
    for path in site.rglob('*'):
        if path.is_symlink() or (hasattr(path, 'is_junction') and path.is_junction()): raise ValueError('linked_site')
        if path.is_file(): files[path.relative_to(site).as_posix()] = path.read_bytes()
    if digest(encode({n: digest(v) for n, v in sorted(files.items())})) != expected_artifact:
        raise ValueError('site_artifact_mismatch')
    pack_document = load(files['browser-pack.json'])
    if set(document['topics']) != set(pack_document['topics']): raise ValueError('topic_inventory_mismatch')
    results = {};total = 0
    for topic, spec in document['topics'].items():
        pool = pack_document['topics'][topic]['pool'];candidate = load(files[pool['url']])
        if digest(files[pool['url']]) != spec['pool_sha256'] or spec['pool_sha256'] != pool['sha256']:
            raise ValueError('pool_binding_mismatch')
        rows = regenerate(spec)
        numeric = [{k: row[k] for k in rows[0]} for row in candidate['rows']]
        if encode(numeric) != encode(rows): raise ValueError('numeric_pool_mismatch:'+topic)
        results[topic] = {'status': 'pass', 'rows': len(rows), 'pool_sha256': spec['pool_sha256'],
            'numeric_sha256': digest(encode(rows)),
            'answer_pattern_collisions': sum(unpack(row['answer']) == unpack(row['wrong']) for row in rows)}
        total += len(rows)
    return {'format': 'browser-numeric-regeneration/1', 'status': 'pass',
        'artifact_sha256': expected_artifact, 'spec_sha256': digest(raw),
        'oracle_sha256': digest(Path(__file__).read_bytes()), 'topics': results, 'rows': total,
        'answer_pattern_collisions': sum(row['answer_pattern_collisions'] for row in results.values()),
        'scope': 'shared_declarative_spec_separate_numeric_implementation',
        'prompt_diagram_storyboard_review': 'not_run', 'os_isolation': 'not_run',
        'independent_teacher_review': 'pending', 'publication': 'HOLD', 'publishable': False}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--spec', type=Path, required=True)
    parser.add_argument('--site', type=Path, required=True)
    parser.add_argument('--expected-artifact', required=True)
    parser.add_argument('--report', type=Path, required=True)
    args = parser.parse_args()
    try:
        if args.report.exists(): raise ValueError('report_exists')
        result = verify(args.spec, args.site, args.expected_artifact)
        args.report.parent.mkdir(parents=True, exist_ok=True)
        with args.report.open('xb') as stream: stream.write(encode(result))
        print(json.dumps({'status': result['status'], 'topics': len(result['topics']), 'rows': result['rows'], 'publishable': False}))
    except (ValueError, KeyError, TypeError, OSError) as error:
        parser.exit(1, type(error).__name__+': '+str(error)+'\n')
