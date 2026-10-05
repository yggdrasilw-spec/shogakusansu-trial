/* Load static assets relative to this page; no Python API requests. */
const browserReady = (async () => {
  const [{newState,validateState,transition,view}, {BrowserStore}, {createPackLoader}, response] = await Promise.all([
    import('./browser-runtime.mjs'), import('./browser-store.mjs'), import('./browser-pack-loader.mjs'), fetch('./browser-pack.json')]);
  if (!response.ok) throw Error('browser_pack_unavailable');
  const pack = await response.json();
  const loader = createPackLoader(pack);
  // A path-specific database keeps independent previews separate.
  const store = new BrowserStore('sansuu-step:' + location.pathname.replace(/index\.html$/, ''),
    () => newState(pack), state => loader.validate(state, validateState));
  const options = {seed: () => crypto.getRandomValues(new Uint32Array(1))[0], uuid: () => crypto.randomUUID()};
  return {store, pack, loader, newState, transition, view, options};
})();
window.learningTransport = {
  async state() {
    const {store,pack,view} = await browserReady;
    return view(await store.read(), pack, new Date().toISOString());
  },
  async action(action,data) {
    const {store,pack,loader,transition,view,options} = await browserReady;
    const now = new Date().toISOString(), input = await store.read();
    const result = await loader.run(input,transition,action,data,now,options);
    // Commit support before exposing it; commit answers before showing feedback.
    await store.write(result.state,input.revision);
    return {...view(result.state,pack,now), ...(result.support ? {support:result.support} : {})};
  }
};
window.addEventListener('DOMContentLoaded', () => {
  document.getElementById('record-menu')?.addEventListener('click', () => {
    document.getElementById('settings-drawer').close();
    document.getElementById('about-dialog').showModal();
  });
  const downloadRecord = record => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(record ?? {},null,2)],{type:'application/json'}));
    const link = document.createElement('a'); link.href = url; link.download = 'sansuu-step-record.json'; link.click();
    setTimeout(() => URL.revokeObjectURL(url),1000);
  };
  let prepared = null, captured;
  const status = document.getElementById('restore-status'), apply = document.getElementById('confirm-restore');
  const errorText = error => ({browser_record_corrupt:'記録を確認できませんでした。元の記録は変えていません。',
    browser_record_incompatible:'この記録は今の教材と一致しません。元の記録は変えていません。',
    browser_version_stale:'この版の記録には対応していません。元の記録は変えていません。',
    browser_record_too_large:'記録ファイルは32MBまで読み込めます。',
    browser_pack_unavailable:'教材を読み込めませんでした。通信を確認して、もう一度ファイルを選んでください。',
    relearning_revision_stale:'別のタブで記録が変わりました。もう一度ファイルを選んで確認してください。',
    browser_storage_full:'保存場所がいっぱいです。元の記録は変えていません。'}[error.message] || '復元できませんでした。元の記録は変えていません。');
  document.getElementById('import-record')?.addEventListener('change', async event => {
    prepared = null; apply.disabled = true; status.textContent = '記録を確認しています…';
    const file = event.target.files[0];
    if (!file) { status.textContent = ''; return; }
    event.target.disabled = true;
    try {
      const {prepareRecord,MAX_RECORD_BYTES} = await import('./browser-record.mjs');
      if (file.size > MAX_RECORD_BYTES) throw Error('browser_record_too_large');
      const {store,pack,loader} = await browserReady;
      captured = await store.raw();
      prepared = await prepareRecord(await file.text(),pack,loader);
      const s = prepared.summary;
      status.textContent = `${prepared.migrated ? '以前の版の記録を照合しました。' : ''}回答${s.answers}件、問題${s.questions}件、おさらい${s.reviews}件。${s.pending ? '途中の問題があります。' : ''}${s.feedback ? '回答後の画面があります。' : ''}復元すると今の記録を置き換えます。`;
      apply.disabled = false;
    } catch (error) { prepared = null; status.textContent = errorText(error); }
    finally { event.target.disabled = false; }
  });
  apply?.addEventListener('click', async () => {
    if (!prepared || !confirm('確認したファイルで学習記録を置き換えます。今の記録は復元前の控えとして保存します。復元しますか？')) return;
    apply.disabled = true;
    try {
      const {store} = await browserReady;
      prepared.state.revision = (captured?.state?.revision ?? 0) + 1;
      await store.restore(prepared.state,captured); location.reload();
    } catch (error) { prepared = null; status.textContent = errorText(error); }
  });
  document.getElementById('export-recovery')?.addEventListener('click', async () => {
    try {
      const {store} = await browserReady, record = await store.recovery();
      if (!record) { status.textContent = '復元前の控えはまだありません。'; return; }
      downloadRecord(record);
    } catch (error) { status.textContent = errorText(error); }
  });
  document.getElementById('export-record')?.addEventListener('click', async () => {
    try {
      const {store} = await browserReady, record = await store.raw();
      downloadRecord(record);
    } catch { alert('記録を書き出せませんでした。ページを開き直して試してください。'); }
  });
  document.getElementById('erase-record')?.addEventListener('click', async () => {
    if (!confirm('このブラウザーの学習記録を消します。必要なら先に書き出してください。消してよいですか？')) return;
    try {
      const {store,pack,newState} = await browserReady, current = await store.raw();
      // Explicit deletion also allows recovery of old/corrupt records; retain a revision tombstone.
      const revision = current?.state?.revision ?? 0;
      const fresh = newState(pack); fresh.revision = revision + 1;
      await store.write(fresh,revision,true); location.reload();
    } catch { alert('記録を消せませんでした。別のタブを閉じて、ページを開き直してください。'); }
  });
});
