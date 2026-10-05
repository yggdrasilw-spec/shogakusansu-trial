/* On-demand immutable pools. A failed fetch never changes the learning record. */
export function createPackLoader(pack, fetchPool = url => fetch(url)) {
  const pending = new Map();
  async function ensure(topic) {
    const spec = pack.topics[topic];
    if (!spec) throw Error('browser_record_corrupt');
    if (spec.rows) return;
    if (pending.has(topic)) return pending.get(topic);
    const task = (async () => {
      const descriptor = spec.pool;
      if (!descriptor || !/^topics\/[a-z0-9-]+\.[a-f0-9]{64}\.json$/.test(descriptor.url))
        throw Error('browser_pack_invalid');
      let response;
      try { response = await fetchPool('./' + descriptor.url); }
      catch { throw Error('browser_pack_unavailable'); }
      if (!response.ok) throw Error('browser_pack_unavailable');
      let bytes;
      try { bytes = await response.arrayBuffer(); }
      catch { throw Error('browser_pack_unavailable'); }
      const hash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))]
        .map(x => x.toString(16).padStart(2,'0')).join('');
      if (bytes.byteLength !== descriptor.bytes || hash !== descriptor.sha256)
        throw Error('browser_pack_invalid');
      let pool;
      try { pool = JSON.parse(new TextDecoder().decode(bytes)); }
      catch { throw Error('browser_pack_invalid'); }
      if (pool.topic !== topic || !Array.isArray(pool.rows) || pool.rows.length !== descriptor.rows)
        throw Error('browser_pack_invalid');
      spec.rows = pool.rows;
    })();
    pending.set(topic, task);
    try { await task; } finally { pending.delete(topic); }
  }
  async function validate(state, validateState) {
    // Block old records before any pool fetch. Keep all original bytes for export.
    if (state?.version !== 'browser-state/1' || state.contract !== pack.contract)
      throw Error('browser_version_stale');
    if (!state.items || typeof state.items !== 'object' || Array.isArray(state.items))
      throw Error('browser_record_corrupt');
    await Promise.all([...new Set(Object.values(state.items).map(item => item?.topic))].map(ensure));
    try { return validateState(state, pack); }
    catch { throw Error('browser_record_corrupt'); }
  }
  async function run(input, transition, action, data, now, options) {
    // Replaying a pure transition after loading must reuse every seed and UUID.
    const seeds = [], ids = [];
    for (let retry = 0; retry <= Object.keys(pack.topics).length; retry++) {
      let s = 0, i = 0;
      const replay = {
        seed: () => { if (s === seeds.length) seeds.push(options.seed()); return seeds[s++]; },
        uuid: () => { if (i === ids.length) ids.push(options.uuid()); return ids[i++]; }
      };
      try { return transition(input, pack, action, data, now, replay); }
      catch (error) {
        if (error.message !== 'browser_topic_required') throw error;
        await ensure(error.topic);
      }
    }
    throw Error('browser_pack_invalid');
  }
  return {ensure, validate, run};
}
