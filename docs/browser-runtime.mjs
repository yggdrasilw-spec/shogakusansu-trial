/* Pure static-preview runtime. Personal practice records, not trusted v2 events. */
const clone = value => structuredClone(value);
const fail = code => { throw Error(code); };
export const MAX_HISTORY_EVENTS = 10000;
// Pools are hash-checked by the loader and immutable for the page lifetime.
// Keep collisions in authored order, exactly as the former linear search did.
const candidateIndexes = new WeakMap();
export function findCandidate(pack, item) {
  const rows = pack.topics[item.topic]?.rows;
  if (!rows) {
    const error = Error('browser_topic_required'); error.topic = item.topic; throw error;
  }
  let index = candidateIndexes.get(rows);
  if (!index) {
    index = new Map();
    for (const row of rows) {
      const matches = index.get(row.semantic_fingerprint) || [];
      matches.push(row); index.set(row.semantic_fingerprint, matches);
    }
    candidateIndexes.set(rows, index);
  }
  return index.get(item.semantic_fingerprint)?.find(row =>
    JSON.stringify(row.parameters) === JSON.stringify(item.parameters));
}
// Canonical JSON sorts object keys; route priority needs its own authored order.
const topicOrder = pack => (pack.topic_order || Object.keys(pack.topics)).filter(t => pack.topics[t]);
export function mulberry32(seed) {
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) fail('invalid_seed');
  const s = (seed + 0x6d2b79f5) >>> 0;
  let t = Math.imul(s ^ s >>> 15, 1 | s);
  t ^= t + Math.imul(t ^ t >>> 7, 61 | t);
  return ((t ^ t >>> 14) >>> 0) / 4294967296;
}
export function generate(pack, topic, seed, exclude = []) {
  const spec = pack.topics[topic];
  if (!spec) fail('unknown_topic');
  if (!Array.isArray(exclude) || exclude.some(x => !/^[a-f0-9]{64}$/.test(x))) fail('invalid_exclusions');
  if (exclude.length > spec.budget.max_exclusions) fail('exclusion_budget_exceeded');
  if (!spec.rows) {
    const error = Error('browser_topic_required'); error.topic = topic; throw error;
  }
  const rows = spec.rows, start = Math.floor(mulberry32(seed) * rows.length), excluded = new Set(exclude);
  for (let offset = 0; offset < rows.length; offset++) {
    const row = rows[(start + offset) % rows.length];
    if (!excluded.has(row.semantic_fingerprint)) return {
      ...clone(row), topic, seed, response_type: spec.response_type,
      // Explicit browser identity version; no claim to reproduce Python item hashes.
      item_id: `browser-item/1:${topic}:${seed}:${row.semantic_fingerprint}`,
      cue_contract: clone(spec.cue_contract), form_policy: clone(spec.form_policy)
    };
  }
  fail('no_new_item_available');
}
// JSON retains raw safe-integer fields; only arithmetic uses BigInt, never floats.
const gcd = (a,b) => { a = a < 0n ? -a : a; while (b) [a,b] = [b,a%b]; return a; };
function rational(value, type) {
  if (type === 'integer') return Number.isSafeInteger(value) ? {n:BigInt(value),d:1n,raw:null} : null;
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      !Object.values(value).every(Number.isSafeInteger) || value.d <= 0) return null;
  const keys = Object.keys(value).sort().join(',');
  if (keys === 'd,n') return {n:BigInt(value.n),d:BigInt(value.d),raw:value};
  if (keys === 'd,n,whole' && value.whole >= 0 && value.n >= 0 && value.n < value.d)
    return {n:BigInt(value.whole)*BigInt(value.d)+BigInt(value.n),d:BigInt(value.d),raw:null};
  return null;
}
const sameValue = (a,b) => !!a && !!b && a.n*b.d === b.n*a.d;
export function grade(item, response, uiFailure = false) {
  const unknown = status => ({status, value_correct: null, form_correct: null,
    observation_codes: [], candidate_cause: 'not_inferred'});
  if (uiFailure || response === null) return unknown(uiFailure ? 'ui_failure' : 'no_response');
  const type = item.response_type || 'integer', actual = rational(response,type);
  if (!actual) return unknown('invalid_response');
  const correct = sameValue(actual,rational(item.answer,type));
  let form = correct;
  if (correct && item.form_policy?.kind === 'reduced_fraction')
    form = !!actual.raw && gcd(actual.n,actual.d) === 1n;
  if (correct && item.form_policy?.kind === 'required_denominator')
    form = !!actual.raw && actual.raw.d === item.required_denominator;
  const codes = [correct ? 'value_correct' : 'value_incorrect'];
  if (correct && form) codes.push('form_correct');
  if (!correct && sameValue(actual,rational(item.wrong,type))) codes.push('error_pattern_match');
  return {status: correct ? form ? 'correct' : 'form_unmet' : 'incorrect', value_correct: correct,
    form_correct: form, observation_codes: codes, candidate_cause: 'not_inferred'};
}
export function newState(pack) {
  return {version: 'browser-state/1', contract: pack.contract, revision: 0,
    events: [], items: {}, reviews: {}, session: null, pending: null, feedback: null,
    plan: null, unavailable_topics: []};
}
export function validateState(state, pack) {
  if (state?.version !== 'browser-state/1' || state.contract !== pack.contract) fail('browser_version_stale');
  if (!Number.isSafeInteger(state.revision) || state.revision < 0 || !Array.isArray(state.events) ||
      state.events.length > MAX_HISTORY_EVENTS || !state.items || !state.reviews || !Array.isArray(state.unavailable_topics)) fail('browser_record_corrupt');
  for (const [id, item] of Object.entries(state.items)) {
    mulberry32(item.seed); // Preserve seed bounds without cloning an unrelated row.
    const spec = pack.topics[item.topic], row = findCandidate(pack, item);
    if (!row || id !== `browser-item/1:${item.topic}:${item.seed}:${row.semantic_fingerprint}` ||
        JSON.stringify(item) !== JSON.stringify({...row, topic: item.topic, seed: item.seed,
          response_type: spec.response_type, item_id: id,
          cue_contract: spec.cue_contract, form_policy: spec.form_policy})) fail('browser_record_corrupt');
  }
  const seen = new Set();
  for (const event of state.events) {
    const item = state.items[event.item_id];
    if (!item || event.semantic_fingerprint !== item.semantic_fingerprint ||
        event.response_status !== grade(item, event.response).status || typeof event.hint_used !== 'boolean' ||
        typeof event.answer_exposed !== 'boolean') fail('browser_record_corrupt');
    const independent = !seen.has(item.semantic_fingerprint) && !event.hint_used && !event.answer_exposed &&
      !item.cue_contract.strategy_cued && ['correct', 'incorrect', 'form_unmet'].includes(event.response_status);
    if (event.independent !== independent) fail('browser_record_corrupt');
    seen.add(item.semantic_fingerprint);
  }
  if (state.pending && (!state.items[state.pending.item_id] || !state.session ||
      !pack.topics[state.pending.topic] || typeof state.pending.hint_used !== 'boolean')) fail('browser_record_corrupt');
  if (state.feedback && !state.items[state.feedback.item_id]) fail('browser_record_corrupt');
  for (const [topic, review] of Object.entries(state.reviews)) {
    if (!pack.topics[topic] || !state.items[review.anchor_item_id] || !Number.isInteger(review.stage) ||
        review.stage < 0 || review.stage > 2 || !Number.isFinite(Date.parse(review.due_at))) fail('browser_record_corrupt');
  }
  return state;
}
const due = (state, now) => Object.keys(state.reviews).sort((a,b) =>
  state.reviews[a].due_at.localeCompare(state.reviews[b].due_at)).filter(t => Date.parse(state.reviews[t].due_at) <= Date.parse(now));
function progress(state, pack, now) {
  const result = Object.fromEntries(topicOrder(pack).map(t => [t, 'new'])), trails = {};
  for (const e of state.events) {
    const t = state.items[e.item_id].topic;
    (trails[t] ||= []);
    if (e.phase !== 'retention' || e.response_status !== 'correct' || e.hint_used)
      trails[t].push(e.phase !== 'retention' && e.independent && e.response_status === 'correct');
    result[t] = 'trying';
  }
  for (const [t, answers] of Object.entries(trails)) if (answers.length >= 2 && answers.slice(-2).every(Boolean)) result[t] = 'checked';
  for (const t of due(state, now)) result[t] = 'review';
  return result;
}
function recommendations(state, pack, now, selectedGrade = null) {
  const p = progress(state, pack, now), selected = topicOrder(pack).filter(t =>
    (selectedGrade === null || pack.topics[t].grade === selectedGrade) && !state.unavailable_topics.includes(t));
  const weak = state.plan?.remaining || [], failed = new Set(weak);
  return [...new Set([...due(state, now), ...weak.slice().reverse().filter(t =>
    !pack.topics[t].prerequisites.some(q => failed.has(q))),
    ...selected.filter(t => p[t] === 'new' && pack.topics[t].prerequisites.length && pack.topics[t].prerequisites.every(q => p[q] === 'checked')),
    ...selected.filter(t => p[t] === 'new' && !pack.topics[t].prerequisites.length),
    ...selected.filter(t => p[t] === 'trying')])].filter(t => selected.includes(t));
}
function offer(state, pack, topic, mode, seed, existing = null) {
  let item;
  try { item = existing || generate(pack, topic, seed(), [...new Set(state.events.map(e => e.semantic_fingerprint))]); }
  catch (error) {
    if (error.message !== 'no_new_item_available') throw error;
    if (!state.unavailable_topics.includes(topic)) state.unavailable_topics.push(topic);
    state.session.stop = 'fresh_items_exhausted'; state.pending = null; return;
  }
  state.items[item.item_id] = item;
  state.pending = {item_id: item.item_id, topic, mode, hint_used: false, answer_exposed: false};
}
function schedule(state, topic, itemId, now, previous = null) {
  const stage = previous === null ? 0 : Math.min(previous + 1, 2);
  state.reviews[topic] = {stage, due_at: new Date(Date.parse(now) + [2,7,21][stage] * 86400000).toISOString(),
    anchor_item_id: itemId, last_confirmed_at: now};
}
function start(state, pack, topic, mode, now, seed, uuid) {
  if (!pack.topics[topic] || !['diagnostic','practice','review'].includes(mode)) fail('relearning_start_invalid');
  if (state.pending) fail('relearning_attempt_pending');
  if (mode === 'review' && !due(state, now).includes(topic)) fail('relearning_review_not_due');
  state.session = {id: uuid(), root: topic, mode, count: 0, queue: [topic], seen: [topic], trace: [], scores: {}, stop: null, started_at: now};
  state.feedback = null;
  offer(state, pack, topic, mode === 'review' ? 'recall' : mode, seed,
    mode === 'review' ? state.items[state.reviews[topic].anchor_item_id] : null);
}
function submit(state, pack, itemId, response, now, seed, uuid) {
  const p = state.pending, s = state.session;
  if (!p || p.item_id !== itemId) fail('relearning_submission_stale');
  if (response !== null && !rational(response,state.items[itemId].response_type)) fail('v2_event_invalid');
  if (state.events.length >= MAX_HISTORY_EVENTS) fail('v2_event_budget_exceeded');
  const item = state.items[itemId], result = grade(item, response), correct = result.status === 'correct';
  const independent = !state.events.some(e => e.semantic_fingerprint === item.semantic_fingerprint) &&
    !p.hint_used && !p.answer_exposed && !item.cue_contract.strategy_cued && ['correct','incorrect','form_unmet'].includes(result.status);
  state.events.push({event_id: uuid(), item_id: itemId, session_id: s.id, occurred_at: now,
    semantic_fingerprint: item.semantic_fingerprint, response: clone(response), response_status: result.status,
    observation_codes: result.observation_codes, hint_used: p.hint_used, answer_exposed: p.answer_exposed,
    independent, phase: s.mode === 'review' ? 'retention' : p.mode === 'practice' ? 'confirm' : 'initial'});
  s.count++; state.pending = null;
  state.feedback = {status: result.status, independent, topic: p.topic, recall: p.mode === 'recall', supported: p.hint_used, item_id: itemId, response: clone(response)};
  const topic = p.topic;
  if (p.mode === 'recall') {
    s.recall_passed = correct && !p.hint_used;
    if (s.recall_passed) offer(state, pack, topic, 'practice', seed);
    else {
      state.reviews[topic].stage = 0;
      state.reviews[topic].due_at = new Date(Date.parse(now) + 2 * 86400000).toISOString();
      s.stop = 'review_needs_practice';
      if (s.automatic) { s.mode = 'practice'; s.stop = null; offer(state, pack, topic, 'practice', seed); }
    }
    return;
  }
  const scores = s.scores[topic] ||= [];
  scores.push(independent ? correct : null);
  const confirmed = scores.length >= 2 && scores.slice(-2).every(x => x === true);
  const ended = confirmed || scores.filter(x => x === false).length >= 2 || scores.length >= 3;
  if (p.mode === 'diagnostic' && ended) {
    s.trace.push({topic, status: confirmed ? 'answer_confirmed' : scores.includes(null) ? 'needs_check' : 'needs_practice'});
    state.plan = {goal: s.root, remaining: s.trace.filter(r => r.status === 'needs_practice').map(r => r.topic)};
    s.queue = s.queue.filter(t => t !== topic);
    if (confirmed) schedule(state, topic, itemId, now);
    else for (const prerequisite of pack.topics[topic].prerequisites) if (!s.seen.includes(prerequisite)) {
      s.seen.push(prerequisite); s.queue.unshift(prerequisite);
    }
  } else if (p.mode === 'practice' && ended) {
    if (confirmed) {
      schedule(state, topic, itemId, now, s.mode === 'review' && s.recall_passed ? state.reviews[topic]?.stage ?? null : null);
      if (state.plan) state.plan.remaining = state.plan.remaining.filter(t => t !== topic);
      s.stop = 'local_confirmation';
    } else {
      s.stop = 'practice_needs_support';
      if (s.mode === 'review') { state.reviews[topic].stage = 0; state.reviews[topic].due_at = new Date(Date.parse(now) + 2 * 86400000).toISOString(); }
    }
  }
  if (s.automatic && ended) {
    s.trace.push({topic, status: confirmed ? 'answer_confirmed' : 'needs_check'});
    s.stop = s.count >= 6 ? 'automatic_complete' : null;
    if (!s.stop) for (const next of recommendations(state, pack, now, s.grade).filter(t => !s.seen.includes(t))) {
      s.seen.push(next); s.recall_passed = false; s.mode = 'practice'; offer(state, pack, next, 'practice', seed);
      if (state.pending) break;
    }
    if (!state.pending) s.stop = 'automatic_complete';
    return;
  }
  if (s.stop) return;
  if (s.count >= (s.automatic ? 6 : 12)) { s.stop = s.automatic ? 'automatic_complete' : 'question_budget'; return; }
  if (p.mode === 'diagnostic' && !s.queue.length) s.stop = 'diagnostic_complete';
  else offer(state, pack, p.mode === 'diagnostic' ? s.queue[0] : topic, p.mode, seed);
}
export function transition(input, pack, action, data, now, {seed, uuid}) {
  validateState(input, pack);
  if (!Number.isFinite(Date.parse(now))) fail('relearning_time_invalid');
  if (data.revision !== input.revision) fail('relearning_revision_stale');
  const state = clone(input); let support = null;
  if (action === 'start') start(state, pack, data.topic, data.mode || 'diagnostic', now, seed, uuid);
  else if (action === 'recommended') {
    const g = data.grade ?? null;
    if (g !== null && (!Number.isInteger(g) || g < 1 || g > 6)) fail('relearning_start_invalid');
    const targets = recommendations(state, pack, now, g);
    if (!targets.length) fail('relearning_no_recommendation');
    for (const t of targets) { start(state, pack, t, due(state, now).includes(t) ? 'review' : 'practice', now, seed, uuid); if (state.pending) break; }
    state.session.automatic = true; state.session.grade = g;
  } else if (action === 'submit') submit(state, pack, data.item_id, data.response, now, seed, uuid);
  else if (action === 'continue') state.feedback = null;
  else if (action === 'pause') {
    if (state.pending) {
      if (state.feedback?.item_id && !state.pending.hint_used) state.pending = null;
      else submit(state, pack, state.pending.item_id, null, now, seed, uuid);
    }
    state.pending = null; if (state.session) state.session.stop = 'paused';
  } else if (action === 'support') {
    let item;
    if (data.completed) {
      if (!state.feedback || data.kind !== 'answer') fail('relearning_support_invalid');
      item = state.items[state.feedback.item_id]; state.feedback.reviewed_answer = true;
    } else {
      if (!state.pending || !['hint','answer'].includes(data.kind)) fail('relearning_support_invalid');
      state.pending.hint_used = true;
      if (data.kind === 'answer') state.pending.answer_exposed = true;
      item = state.items[state.pending.item_id];
    }
    support = {guidance: pack.topics[item.topic].guidance, answer: data.kind === 'answer' ? item.answer : null,
      worked_steps: data.kind === 'answer' ? clone(item.worked_steps) : [],
      storyboard: data.kind === 'answer' ? clone(item.storyboard || null) : null};
  } else fail('relearning_action_invalid');
  state.revision++;
  return {state, support};
}
const publicItem = item => ({item_id: item.item_id, prompt: item.prompt, response_type: item.response_type,
  cue_contract: clone(item.cue_contract), task_identity_version: 'math-task/2', mastery: 'not_promoted'});
export function view(state, pack, now) {
  const p = progress(state, pack, now), s = state.session;
  const events = state.events.filter(e => e.session_id === s?.id);
  return {policy_version: 'browser-preview/1', revision: state.revision,
    topics: topicOrder(pack).map(t => pack.topics[t]).map(({id,label,prerequisites,owner,grade}) => ({id,label,prerequisites,owner,grade,progress:p[id]})),
    entries: topicOrder(pack), due: due(state,now), reviews: clone(state.reviews), session: clone(s),
    feedback: state.feedback ? {...clone(state.feedback), item: publicItem(state.items[state.feedback.item_id])} : null,
    pending: state.pending ? {...clone(state.pending), item: publicItem(state.items[state.pending.item_id])} : null,
    recommended: state.plan?.remaining || [], next_topics: recommendations(state, pack, now), connections: [],
    plan: clone(state.plan), max_questions: 12, mastery: 'not_promoted', cause_support: 'not_established',
    session_summary: [...new Set(events.map(e => state.items[e.item_id].topic))].map(topic => {
      const rows = events.filter(e => state.items[e.item_id].topic === topic);
      return {topic, attempts: rows.length, supported: rows.filter(e => e.hint_used).length,
        independent_correct: rows.filter(e => e.independent && e.response_status === 'correct').length,
        confirmed: rows.some((e,i) => i > 0 && e.independent && e.response_status === 'correct' && rows[i-1].independent && rows[i-1].response_status === 'correct')};
    })};
}
