/* Search and navigation for the experimental all-curriculum edition. */
(() => {
  const normalize = value => String(value).normalize('NFKC').toLowerCase().replace(/\s+/g, '');
  let page = 0, signature = '', selected = null;
  const size = 12;
  window.renderTrialCatalog = () => {
    const host = document.getElementById('trial-catalog');
    if (!host || !state) return;
    const query = normalize(document.getElementById('trial-search').value);
    const grade = document.getElementById('trial-grade').value;
    const area = document.getElementById('trial-area').value;
    const progress = document.getElementById('trial-progress').value;
    const nextSignature = [query, grade, area, progress].join('|');
    if (signature !== nextSignature) page = 0;
    signature = nextSignature;
    const rows = state.topics.filter(t => (!grade || String(t.grade) === grade) &&
      (!area || String(family(t)) === area) && (!progress || t.progress === progress) &&
      (!query || normalize(t.label + label(t.id) + t.id).includes(query)));
    const pages = Math.max(1, Math.ceil(rows.length / size));
    page = Math.min(page, pages - 1);
    document.getElementById('trial-count').textContent = `${state.topics.length}内容のうち ${rows.length}内容・${page + 1} / ${pages}ページ`;
    host.replaceChildren();
    for (const t of rows.slice(page * size, (page + 1) * size)) {
      const card = document.createElement('article'); card.className = 'trial-topic';
      const meta = element('p', `小${t.grade}のめやす · ${domains[family(t)]}`, 'format');
      const title = element('h3', label(t.id));
      const note = element('p', names[t.progress], 'format');
      const launch = button('ここを練習する →', () => {
        selected = t.id;
        const url = new URL(location.href); url.searchParams.set('topic', t.id);
        history.replaceState(null, '', url);
        start(t.id, state.due.includes(t.id) ? 'review' : 'diagnostic');
      });
      launch.dataset.trialTopic = t.id;
      const related = button('前後のつながり', () => openNode(t.id), 'quiet');
      card.append(meta, title, note, launch, related); host.append(card);
      if(window.meaningMotion?.topics.includes(t.id))title.append(element('small',' · 動かしてわかる','format'));
    }
    if (!rows.length) host.append(element('p', '見つかりませんでした。別のことばや学年で探してみよう。'));
    document.getElementById('trial-prev').disabled = page === 0;
    document.getElementById('trial-next').disabled = page + 1 >= pages;
    document.getElementById('trial-page').textContent = `${page + 1} / ${pages}`;
  };
  window.addEventListener('DOMContentLoaded', () => {
    for (const id of ['trial-search', 'trial-grade', 'trial-area', 'trial-progress'])
      document.getElementById(id).addEventListener(id === 'trial-search' ? 'input' : 'change', renderTrialCatalog);
    for (const [id, offset] of [['trial-prev', -1], ['trial-next', 1]])
      document.getElementById(id).addEventListener('click', () => {
        page += offset; renderTrialCatalog(); document.getElementById('trial-count').focus();
      });
    document.getElementById('trial-reset').addEventListener('click', () => {
      for (const id of ['trial-search', 'trial-grade', 'trial-area', 'trial-progress']) document.getElementById(id).value = '';
      renderTrialCatalog(); document.getElementById('trial-search').focus();
    });
    document.getElementById('trial-report').addEventListener('click', () => {
      const topic = state?.pending?.topic || state?.feedback?.topic || selected;
      const memo = `さんすうステップ trial 2\n内容: ${topic || 'ホーム'}\n画面: ${location.href}\n日時: ${new Date().toISOString()}\n困ったこと（追記してください）:\n\n回答履歴や個人情報は含めません。自動送信されません。\n`;
      const url = URL.createObjectURL(new Blob([memo], {type: 'text/plain;charset=utf-8'}));
      const link = document.createElement('a'); link.href = url; link.download = 'sansuu-trial-report.txt'; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      document.getElementById('trial-report-status').textContent = '報告メモを保存しました。必要なら困ったことを書き足して、表示された報告先へ送ってください。';
    });
  });
})();
