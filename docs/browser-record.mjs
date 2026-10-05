/* Explicit, lossless restore preparation. No persistent writes before confirmation. */
import {checksum} from './browser-store.mjs';
import {validateState, view, generate, findCandidate} from './browser-runtime.mjs';
const fail = code => { throw Error(code); };
const ordered = value => Array.isArray(value) ? value.map(ordered) : value && typeof value === 'object' ?
  Object.fromEntries(Object.keys(value).sort().map(key => [key,ordered(value[key])])) : value;
export const MAX_RECORD_BYTES = 32 * 1024 * 1024;
export async function prepareRecord(text, pack, loader) {
  if (new TextEncoder().encode(text).length > MAX_RECORD_BYTES) fail('browser_record_too_large');
  let envelope;
  try { envelope = JSON.parse(text); } catch { fail('browser_record_corrupt'); }
  const original = envelope?.state;
  if (!original || envelope.checksum !== await checksum(original)) fail('browser_record_corrupt');
  if (original.version !== 'browser-state/1' || !/^[a-f0-9]{64}$/.test(original.contract)) fail('browser_version_stale');
  const state = structuredClone(original), migrated = state.contract !== pack.contract;
  const topic = t => typeof t === 'string' && Object.hasOwn(pack.topics,t);
  const topics = list => Array.isArray(list) && list.every(topic);
  const object = value => value && typeof value === 'object' && !Array.isArray(value);
  if (!object(state.items) || !object(state.reviews) || !topics(state.unavailable_topics) ||
      (state.plan !== null && (!object(state.plan) || !topic(state.plan.goal) || !topics(state.plan.remaining)))) fail('browser_record_corrupt');
  if (state.session !== null) {
    const s = state.session;
    if (!object(s) || typeof s.id !== 'string' || !topic(s.root) ||
        !['diagnostic','practice','review'].includes(s.mode) || !Number.isSafeInteger(s.count) || s.count < 0 || s.count > 12 ||
        !topics(s.queue) || !topics(s.seen) || !Array.isArray(s.trace) ||
        !s.trace.every(r => object(r) && topic(r.topic) && ['answer_confirmed','needs_check','needs_practice'].includes(r.status)) ||
        !object(s.scores) || !Object.entries(s.scores).every(([t,rows]) => topic(t) && Array.isArray(rows) && rows.every(x => x === null || typeof x === 'boolean')) ||
        !(s.stop === null || typeof s.stop === 'string') || !Number.isFinite(Date.parse(s.started_at)) ||
        (s.automatic !== undefined && typeof s.automatic !== 'boolean') ||
        (s.grade !== undefined && s.grade !== null && (!Number.isInteger(s.grade) || s.grade < 1 || s.grade > 6))) fail('browser_record_corrupt');
  }
  if (state.pending !== null && (!object(state.pending) || !topic(state.pending.topic) ||
      state.items[state.pending.item_id]?.topic !== state.pending.topic || typeof state.pending.answer_exposed !== 'boolean' ||
      !['practice','diagnostic','recall'].includes(state.pending.mode))) fail('browser_record_corrupt');
  if (state.feedback !== null && (!object(state.feedback) || !topic(state.feedback.topic) ||
      state.items[state.feedback.item_id]?.topic !== state.feedback.topic)) fail('browser_record_corrupt');
  if (migrated) {
    if (!state.items || Array.isArray(state.items)) fail('browser_record_corrupt');
    for (const [id,item] of Object.entries(state.items)) {
      await loader.ensure(item?.topic);
      const row = findCandidate(pack, item);
      // Older arithmetic records predate storyboard metadata; all other fields
      // must still match the current finite pool in validateState below.
      if (!row) fail('browser_record_incompatible');
      const expected = {...generate(pack,item.topic,item.seed),...structuredClone(row),item_id:id};
      const comparable = structuredClone(expected);
      if (!Object.hasOwn(item,'storyboard')) delete comparable.storyboard;
      if (JSON.stringify(ordered(item)) !== JSON.stringify(ordered(comparable))) fail('browser_record_incompatible');
      state.items[id] = expected;
    }
    state.contract = pack.contract;
  }
  try {
    await loader.validate(state,validateState);
    view(state,pack,new Date().toISOString());
  } catch (e) {
    if (['browser_pack_unavailable','browser_pack_invalid'].includes(e.message)) throw e;
    fail(migrated ? 'browser_record_incompatible' : 'browser_record_corrupt');
  }
  return {state, migrated, summary: {answers:state.events.length, questions:Object.keys(state.items).length,
    reviews:Object.keys(state.reviews).length, pending:!!state.pending, feedback:!!state.feedback}};
}
