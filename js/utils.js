/* ============================================================
 * utils.js — small helpers used everywhere.
 * ============================================================ */

const uid   = () => Math.random().toString(36).slice(2, 9);
const today = () => new Date().toISOString().slice(0, 10);

const esc = s => String(s ?? '').replace(/[&<>"']/g, c =>
  ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

const num   = n => Number(n) || 0;
const roundCurrency = n => Math.round((num(n) + Number.EPSILON) * 100) / 100;

const money = n => CFG.shop.currency + num(n)
  .toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const clone = o => JSON.parse(JSON.stringify(o));

function toast(msg, kind = 'ok') {
  const el = document.createElement('div');
  el.className = 'toast ' + kind;
  el.textContent = (kind === 'err' ? '⚠️  ' : '✅  ') + msg;
  document.getElementById('toastRoot').appendChild(el);
  setTimeout(() => { el.style.transition = '.3s'; el.style.opacity = '0'; }, 2200);
  setTimeout(() => el.remove(), 2600);
}