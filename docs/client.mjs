import {VERSION, MODES, domain, expression, explanation, parseAnswer, nextIndex, validateSession} from './math.mjs';
const KEY = 'shogakusansu-arithmetic-trial-v1';
const $ = id => document.getElementById(id);
const RANGES = {add: '答えが 0〜20 のたし算', sub: '0〜20 の数のひき算（答えは 0 以上）', mul: '0〜9 の数のかけ算', div: '1〜9 で割る、あまりのないわり算（答えは 0〜9）'};
let session, preserved = false;
function fresh(mode) { return {version: VERSION, mode, index: nextIndex(domain(mode).length), response: null, answered: 0, correct: 0}; }
function load() {
  try {
    const saved = localStorage.getItem(KEY);
    return saved === null ? fresh('add') : validateSession(JSON.parse(saved));
  } catch {
    preserved = true;
    $('storage-message').textContent = '保存記録を読み込めませんでした。元の記録は変更せず、この画面で練習できます。';
    return fresh('add');
  }
}
function save() {
  if (preserved) return;
  try { localStorage.setItem(KEY, JSON.stringify(session)); }
  catch { $('storage-message').textContent = '記録を保存できませんでした。この画面では練習を続けられます。'; }
}
function render(focus = false) {
  const row = domain(session.mode)[session.index], done = session.response !== null;
  for (const button of document.querySelectorAll('[data-mode]')) button.setAttribute('aria-pressed', String(button.dataset.mode === session.mode));
  $('range').textContent = RANGES[session.mode];
  $('count').textContent = `この練習：${session.answered} 回回答・${session.correct} 回正解`;
  $('question').textContent = expression(row) + ' ＝ ？';
  $('answer').value = done ? session.response : '';
  $('answer').disabled = done; $('submit').disabled = done;
  $('result').hidden = !done;
  $('input-message').textContent = '';
  if (done) {
    $('verdict').textContent = session.response === row.answer ? '正解です' : '答えを見てみよう';
    $('solution').textContent = expression(row) + ' ＝ ' + row.answer;
    $('explanation').textContent = explanation(row);
  }
  if (focus) (done ? $('next') : $('answer')).focus();
}
session = load(); render();
$('answer-form').addEventListener('submit', event => {
  event.preventDefault();
  if (session.response !== null) return;
  const response = parseAnswer($('answer').value);
  if (response === null) { $('input-message').textContent = '0〜99 の整数を数字で入力してください。'; $('answer').focus(); return; }
  if (session.answered >= 10000) { $('input-message').textContent = '記録が上限に達しました。種類を選び直すと新しい練習を始められます。'; return; }
  session.response = response; session.answered++;
  if (response === domain(session.mode)[session.index].answer) session.correct++;
  save(); render(true);
});
$('next').addEventListener('click', () => { session.index = nextIndex(domain(session.mode).length, session.index); session.response = null; save(); render(true); });
$('modes').addEventListener('click', event => {
  const mode = event.target.dataset.mode;
  if (!Object.hasOwn(MODES, mode)) return;
  session = fresh(mode); save(); render(true);
});
$('clear').addEventListener('click', () => {
  if (!confirm('この試験版の回答回数と再開記録を消しますか？')) return;
  try { localStorage.removeItem(KEY); preserved = false; session = fresh('add'); $('storage-message').textContent = '記録を消しました。'; render(); }
  catch { $('storage-message').textContent = '記録を消せませんでした。ブラウザーの設定を確認してください。'; }
});
$('report').addEventListener('click', () => {
  const row = domain(session.mode)[session.index];
  const text = `shogakusansuDB 計算試験版 ${VERSION}\n問題: ${expression(row)}\n日時: ${new Date().toISOString()}\n困ったこと（追記してください）:\n\n※このメモに回答履歴や個人情報は含まれていません。自動送信もされません。\n`;
  const url = URL.createObjectURL(new Blob([text], {type: 'text/plain;charset=utf-8'}));
  const link = document.createElement('a'); link.href = url; link.download = 'arithmetic-trial-report.txt'; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  $('report-message').textContent = '報告メモを保存しました。困ったことを書き足し、必要なら表示された報告先へ送ってください。';
});
