// New arithmetic-only implementation. No database or resource adapter imports.
export const VERSION = 'arithmetic-trial/1';
export const MODES = Object.freeze({add: 'たし算', sub: 'ひき算', mul: 'かけ算', div: 'わり算'});
const SYMBOLS = {add: '＋', sub: '−', mul: '×', div: '÷'};
export function domain(mode) {
  const rows = [];
  if (mode === 'add' || mode === 'sub') {
    for (let a = 0; a <= 20; a++) for (let b = 0; b <= 20; b++) {
      if (mode === 'add' && a + b <= 20) rows.push({mode, a, b, answer: a + b});
      if (mode === 'sub' && b <= a) rows.push({mode, a, b, answer: a - b});
    }
  } else if (mode === 'mul') {
    for (let a = 0; a <= 9; a++) for (let b = 0; b <= 9; b++) rows.push({mode, a, b, answer: a * b});
  } else if (mode === 'div') {
    for (let b = 1; b <= 9; b++) for (let answer = 0; answer <= 9; answer++) rows.push({mode, a: b * answer, b, answer});
  } else throw new Error('unknown mode');
  return rows;
}
export function expression(row) { return `${row.a} ${SYMBOLS[row.mode]} ${row.b}`; }
export function explanation(row) {
  if (row.mode === 'add') return `${row.a} と ${row.b} を合わせると ${row.answer} です。`;
  if (row.mode === 'sub') return `${row.a} から ${row.b} を引くと ${row.answer} です。${row.b} ＋ ${row.answer} ＝ ${row.a} で確かめられます。`;
  if (row.mode === 'mul') return `${row.a} が ${row.b} こ分で ${row.answer} です。${row.b === 0 ? '0 こ分なので 0 です。' : Array(row.b).fill(row.a).join(' ＋ ') + ' ＝ ' + row.answer}`;
  if (row.mode === 'div') return `${row.b} × ${row.answer} ＝ ${row.a} なので、${row.a} ÷ ${row.b} ＝ ${row.answer} です。`;
  throw new Error('unknown mode');
}
export function parseAnswer(raw) {
  if (typeof raw !== 'string') return null;
  const value = raw.trim().replace(/[０-９]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0xfee0));
  return /^(0|[1-9][0-9]?)$/.test(value) ? Number(value) : null;
}
export function nextIndex(size, previous = -1, random = Math.random) {
  // Uniform selection from the other rows; never immediately repeat a problem.
  const span = previous >= 0 ? size - 1 : size;
  const value = random();
  if (!Number.isFinite(value) || value < 0 || value >= 1 || size < 2) throw new Error('invalid random');
  const index = Math.floor(value * span);
  return previous >= 0 && index >= previous ? index + 1 : index;
}
export function validateSession(value) {
  if (!value || Object.keys(value).sort().join() !== 'answered,correct,index,mode,response,version' || value.version !== VERSION || !Object.hasOwn(MODES, value.mode)) throw new Error('incompatible record');
  const rows = domain(value.mode);
  if (!Number.isInteger(value.index) || value.index < 0 || value.index >= rows.length || !Number.isInteger(value.answered) || value.answered < 0 || value.answered > 10000 || !Number.isInteger(value.correct) || value.correct < 0 || value.correct > value.answered || !(value.response === null || (Number.isInteger(value.response) && value.response >= 0 && value.response <= 99))) throw new Error('invalid record');
  if (value.response !== null && (value.answered === 0 || (value.response === rows[value.index].answer && value.correct === 0))) throw new Error('invalid result');
  return {...value};
}
