import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root,'docs/manifest.json')));
const digest = raw => crypto.createHash('sha256').update(raw).digest('hex');
for (const [name, descriptor] of Object.entries(manifest.verification)) {
  const bytes = fs.readFileSync(path.join(root,name));
  assert.equal(digest(bytes),descriptor.sha256);
  const report = JSON.parse(bytes);
  assert.equal(report.status,'pass');assert.equal(report.artifact_sha256,manifest.artifact_sha256);
}
const browser = JSON.parse(fs.readFileSync(path.join(root,'verification.json')));
assert.equal(browser.topics.length,281);assert.equal(new Set(browser.topics.map(t=>t.topic)).size,281);
assert.ok(browser.topics.every(t=>t.question&&t.support&&t.correct&&t.result&&t.supported&&t.fits));
assert.equal(browser.errors.length,0);assert.equal(browser.external_requests.length,0);
const understanding=JSON.parse(fs.readFileSync(path.join(root,'understanding-verification.json')));
assert.equal(understanding.status,'pass');assert.ok(understanding.checks.length>=47);assert.equal(understanding.errors.length,0);
assert.ok(browser.checks.filter(c=>c.startsWith('written reasoning connects ')).length===281);
const python = process.env.QA_PYTHON || (process.platform === 'win32' ? 'python' : 'python3');
const result = spawnSync(python,['scripts/verify_curriculum_trial.py','--root','docs','--spec','scripts/numeric-spec.json'],{cwd:root,encoding:'utf8'});
if(result.error)throw result.error;
assert.equal(result.status,0,result.stderr || result.stdout);
console.log(result.stdout.trim());
