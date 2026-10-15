/* ============================================================
 * ui-shared.js — helpers used by shop and admin UI.
 * ============================================================ */

const postedProducts = () => state.products.filter(p => p.posted);

function stockInfo(p) {
  const s = num(p.stock_kg), r = num(p.reorder_kg) || 0;
  if (s <= 0) return { cls: 'out', label: 'Out of stock',            canBuy: false };
  if (s <= r) return { cls: 'low', label: `Low stock · ${s} kg left`, canBuy: true };
  return { cls: 'ok', label: `In stock · ${s} kg left`, canBuy: true };
}

function deliveryFeeFor(subtotal, method) {
  if (method !== 'delivery') return 0;
  const deliveryFee = state.settings.delivery_fee;
  const fee = deliveryFee == null || deliveryFee === ''
    ? CFG.shop.defaultDeliveryFee : num(deliveryFee);
  return subtotal >= freeDeliveryOver() ? 0 : fee;
}

function freeDeliveryOver() {
  const threshold = state.settings.free_delivery_over;
  return threshold == null || threshold === ''
    ? CFG.shop.defaultFreeDeliveryOver : num(threshold);
}

function badgeFor(status) {
  const color = CFG.orderStatusColor[status] || 'gray';
  return `<span class="badge ${color}">${esc(status)}</span>`;
}

const shopName    = () => state.settings.shop_name || 'Golden Grain';
const shopTagline = () => state.settings.tagline
  || 'Freshly milled rice, straight from the farm to your table.';
const shopPhone   = () => state.settings.phone || '—';
const shopAddress = () => state.settings.address || '—';

function thumbSmallHtml(p) {
  return `<div class="thumb-sm" data-thumb>
    ${p.image_url ? `<img src="${esc(p.image_url)}" alt="" data-img>` : ''}
    <span class="fallback">${esc(p.name)}</span>
  </div>`;
}

function attachImageFallbacks(scope) {
  scope.querySelectorAll('[data-thumb]').forEach(thumb => {
    const img = thumb.querySelector('[data-img]');
    if (!img) { thumb.classList.add('no-img'); return; }
    if (img.complete && img.naturalWidth === 0) { thumb.classList.add('no-img'); return; }
    img.addEventListener('error', () => thumb.classList.add('no-img'), { once: true });
  });
}