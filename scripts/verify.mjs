import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {domain, expression, explanation, parseAnswer, nextIndex, validateSession, VERSION} from '../docs/math.mjs';
const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
function numericCheck() {
  const counts = {}, hashes = {};
  // An independent integer oracle enumerates bounded operands and filters results.
  // Division rows are constructed by divisibility, rather than quotient generation.
  for (const mode of ['add', 'sub', 'mul', 'div']) {
    const expected = new Set();
    for (let a = 0; a <= (mode === 'div' || mode === 'mul' ? 81 : 20); a++) {
      for (let b = 0; b <= (mode === 'div' || mode === 'mul' ? 9 : 20); b++) {
        let answer;
        const x = BigInt(a), y = BigInt(b);
        if (mode === 'add' && x + y <= 20n) answer = x + y;
        if (mode === 'sub' && x >= y) answer = x - y;
        if (mode === 'mul' && a <= 9) answer = x * y;
        if (mode === 'div' && b !== 0 && x % y === 0n && x / y <= 9n) answer = x / y;
        if (answer !== undefined) expected.add(`${a},${b},${answer}`);
      }
    }
    const rows = domain(mode), actual = new Set(rows.map(r => `${r.a},${r.b},${r.answer}`));
    assert.equal(rows.length, actual.size, 'duplicate row');
    assert.deepEqual(actual, expected, mode);
    for (const row of rows) {
      assert.equal(parseAnswer(String(row.answer)), row.answer);
      assert.ok(expression(row).includes(String(row.a)));
      assert.ok(explanation(row).includes(String(row.answer)));
    }
    counts[mode] = rows.length; hashes[mode] = digest(JSON.stringify(rows));
  }
  for (const invalid of ['', ' ', '-1', '+1', '1.0', '1e1', '0x10', 'NaN', '100', '<script>', '1 2', '01']) assert.equal(parseAnswer(invalid), null);
  assert.equal(parseAnswer(' １２ '), 12);
  for (const mode of Object.keys(counts)) {
    const size = counts[mode];
    for (let previous = 0; previous < size; previous++) {
      for (const random of [0, 0.5, 0.999999999]) assert.notEqual(nextIndex(size, previous, () => random), previous);
    }
  }
  const record = {version: VERSION, mode: 'add', index: 0, response: null, answered: 0, correct: 0};
  assert.deepEqual(validateSession(record), record);
  for (const corrupt of [{...record, index: -1}, {...record, version: 'old'}, {...record, answered: Infinity}, {...record, correct: 1}, {...record, extra: true}]) assert.throws(() => validateSession(corrupt));
  return {status: 'pass', method: 'exhaustive BigInt operand oracle; no DB imports', counts, row_sha256: hashes, total: Object.values(counts).reduce((a, b) => a + b), teacher_review: 'not_performed'};
}
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'docs', 'manifest.json')));
assert.deepEqual(numericCheck(), manifest.numeric_verification);
assert.deepEqual(fs.readdirSync(path.join(root, 'docs')).sort(), ['.nojekyll','NOTICE.txt','client.mjs','index.html','manifest.json','math.mjs','style.css'].sort());
for (const [name, descriptor] of Object.entries(manifest.files)) {
  assert.ok(['NOTICE.txt','client.mjs','index.html','math.mjs','style.css'].includes(name));
  const file = path.join(root, 'docs', name);
  assert.equal(fs.lstatSync(file).isSymbolicLink(), false);
  const bytes = fs.readFileSync(file);
  assert.equal(bytes.length, descriptor.bytes); assert.equal(digest(bytes), descriptor.sha256);
}
assert.equal(digest(JSON.stringify(manifest.files)), manifest.artifact_sha256);
const browserBytes = fs.readFileSync(path.join(root, 'verification.json'));
assert.equal(digest(browserBytes), manifest.browser_verification.report_sha256);
const report = JSON.parse(browserBytes);
assert.equal(report.artifact_sha256, manifest.artifact_sha256); assert.equal(report.status, 'pass');
assert.equal(report.checks.length, 55); assert.equal(report.errors.length, 0); assert.equal(report.external_requests.length, 0);
assert.equal(manifest.teacher_review, 'not_performed'); assert.equal(manifest.private_sources_included, false);
console.log(JSON.stringify({status: 'pass', numeric_rows: manifest.numeric_verification.total, files: Object.keys(manifest.files).length, artifact_sha256: manifest.artifact_sha256, teacher_review: manifest.teacher_review}));
