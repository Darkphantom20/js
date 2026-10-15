/* ============================================================
 * ui-modals.js — every modal in the app.
 * ============================================================ */

function renderModal() {
  const root = document.getElementById('modalRoot');
  if (!state.modal) { root.innerHTML = ''; return; }

  const m = state.modal;
  let html = '';
  if (m.type === 'buy')       html = buyModalHtml(m.id);
  if (m.type === 'success')   html = successModalHtml(m.order);
  if (m.type === 'product')   html = productModalHtml(m.id);
  if (m.type === 'orderView') html = orderViewModalHtml(m.id);

  root.innerHTML = html ? `<div class="overlay" data-act="overlay">${html}</div>` : '';
  if (m.type === 'buy')     { attachImageFallbacks(root); updateBuySummary(); }
  if (m.type === 'product') { attachImageFallbacks(root); updateProductPreview(); }
}

/* ---------------------------- BUY / CHECKOUT ------------------------------ */
function buyModalHtml(id) {
  const p = state.products.find(x => x.id === id);
  if (!p) return '';
  const st = stockInfo(p);
  const defaultQty = Math.min(5, num(p.stock_kg));

  return `
  <div class="modal" onclick="event.stopPropagation()">
    <div class="modal-head">
      <div class="thumb-sm" data-thumb style="width:52px;height:52px">
        ${p.image_url ? `<img src="${esc(p.image_url)}" alt="" data-img>` : ''}
        <span class="fallback">${esc(p.name)}</span>
      </div>
      <div>
        <h3>${esc(p.name)}</h3>
        <div class="sub">${esc(p.variety)} · ${money(p.price_per_kg)} per kg · ${esc(st.label)}</div>
      </div>
      <button class="x" type="button" data-act="modal-close" aria-label="Close checkout">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>
      </button>
    </div>

    <form id="buyForm" data-form="buy" data-id="${p.id}">
      <div class="modal-body">
        <div class="field">
          <span>How many kilos? <b>*</b></span>
          <input type="number" id="buyQty" min="0.001" max="${num(p.stock_kg)}" step="any" value="${defaultQty}" required>
          <div class="qty-row">
            ${[5,10,25,50].filter(q => q <= num(p.stock_kg)).map(q =>
              `<button type="button" class="qty-chip" data-act="qty" data-q="${q}">${q} kg</button>`).join('')}
            <button type="button" class="qty-chip" data-act="qty" data-q="${num(p.stock_kg)}">Max (${num(p.stock_kg)} kg)</button>
          </div>
        </div>

        <div class="fields" style="margin-top:18px">
          <label class="field">
            <span>Your name <b>*</b></span>
            <input type="text" id="buyName" placeholder="Juan Dela Cruz" required>
          </label>
          <label class="field">
            <span>Phone number <b>*</b></span>
            <input type="text" id="buyPhone" placeholder="0917 000 0000" required>
          </label>

          <div class="field wide">
            <span>How would you like to receive it? <b>*</b></span>
            <select id="buyDelivery">
              <option value="pickup">🏪 Pickup at the shop — free</option>
              <option value="delivery">🚚 Deliver to my address — ${money(state.settings.delivery_fee)}</option>
            </select>
          </div>

          <label class="field wide" id="addressWrap" style="display:none">
            <span>Delivery address <b>*</b></span>
            <textarea id="buyAddress" rows="2" placeholder="House no., street, barangay, city"></textarea>
          </label>

          <label class="field wide">
            <span>Notes for the shop (optional)</span>
            <input type="text" id="buyNotes" placeholder="e.g. Deliver after 3pm">
          </label>
        </div>

        <div class="summary" id="buySummary"></div>
      </div>

      <div class="modal-foot">
        <button type="button" class="btn ghost cancel-btn" data-act="modal-close">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>
          Cancel
        </button>
        <button type="submit" class="btn">Place order →</button>
      </div>
    </form>
  </div>`;
}

function updateBuySummary() {
  const box  = document.getElementById('buySummary');
  const form = document.getElementById('buyForm');
  if (!box || !form) return;

  const p = state.products.find(x => x.id === form.dataset.id);
  if (!p) return;
  const qty = Math.max(0, num(document.getElementById('buyQty').value));
  const subtotal = roundCurrency(qty * num(p.price_per_kg));
  const method = document.getElementById('buyDelivery').value;
  const fee = deliveryFeeFor(subtotal, method);
  const free = freeDeliveryOver();
  const qtyText = qty.toLocaleString(undefined, { maximumFractionDigits: 3 });

  box.innerHTML = `
    <div class="row"><span>${esc(p.name)} · ${qtyText} kg × ${money(p.price_per_kg)}</span><span>${money(subtotal)}</span></div>
    <div class="row"><span>${method === 'delivery' ? 'Delivery fee' : 'Pickup at shop'}</span>
      <span>${fee ? money(fee) : '<strong style="color:var(--green-2)">FREE</strong>'}</span></div>
    ${method === 'delivery' && subtotal < free
      ? `<div class="row muted" style="font-size:12px"><span>Add ${money(free - subtotal)} more for free delivery</span><span></span></div>` : ''}
    <div class="row total"><span>Total</span><span>${money(roundCurrency(subtotal + fee))}</span></div>`;

  document.getElementById('addressWrap').style.display = method === 'delivery' ? '' : 'none';
  document.querySelectorAll('.qty-chip').forEach(chip => {
    chip.classList.toggle('on', Number(chip.dataset.q) === qty);
  });
}

function successModalHtml(order) {
  return `
  <div class="modal" onclick="event.stopPropagation()">
    <div class="modal-head">
      <div class="thumb-sm" style="background:#e2f5ea;display:grid;place-items:center;font-size:22px">✅</div>
      <div>
        <h3>Order placed!</h3>
        <div class="sub">Order ${esc(order.order_no)} · ${esc(order.date)}</div>
      </div>
    </div>
    <div class="modal-body">
      <p style="margin-top:0">Thank you, <strong>${esc(order.customer.name)}</strong>! The shop will call you at
        <strong>${esc(order.customer.phone)}</strong> to confirm your order.</p>

      <div class="summary">
        ${order.items.map(it => `
          <div class="row"><span>${esc(it.name)} · ${it.qty} kg × ${money(it.price)}</span>
            <span>${money(it.qty * it.price)}</span></div>`).join('')}
        <div class="row"><span>${order.delivery_method === 'delivery' ? 'Delivery fee' : 'Pickup'}</span>
          <span>${order.delivery_fee ? money(order.delivery_fee) : 'FREE'}</span></div>
        <div class="row total"><span>Total to pay</span><span>${money(order.total)}</span></div>
      </div>

      ${order.delivery_method === 'delivery'
        ? `<p class="muted" style="font-size:13px;margin-bottom:0">🚚 Delivering to: ${esc(order.customer.address)}</p>`
        : `<p class="muted" style="font-size:13px;margin-bottom:0">🏪 Pick up at: ${esc(shopAddress())}</p>`}
    </div>
    <div class="modal-foot">
      <button class="btn ghost" data-act="modal-close">Close</button>
      <button class="btn" data-act="modal-close-scroll">Continue shopping</button>
    </div>
  </div>`;
}

/* ------------------------- ADMIN: PRODUCT MODAL --------------------------- */
function productModalHtml(id) {
  const isNew = !id;
  const p = id
    ? state.products.find(x => x.id === id)
    : { posted: true, grade: 'Grade A', image_url: '', stock_kg: 0, reorder_kg: 100, cost_per_kg: 0 };

  const optsOf = f => (CFG[f.options] || []);

  const fields = CFG.productFields.map(f => {
    const v = p[f.name] ?? (f.name === 'posted' ? true : '');
    const fid = 'pf_' + f.name;

    if (f.type === 'toggle') {
      return `<label class="field wide switch">
        <input type="checkbox" id="${fid}" ${v ? 'checked' : ''}>
        <div>${esc(f.label)}<small>Uncheck to keep it hidden as a draft.</small></div>
      </label>`;
    }

    if (f.type === 'image') {
      return `<div class="field wide">
        <span>${esc(f.label)}${f.required ? ' <b>*</b>' : ''}</span>

        <div class="upload-row">
          <label class="btn ghost" for="${fid}_file" style="cursor:pointer">
            📷 Upload photo from your device
          </label>
          <input type="file" id="${fid}_file" accept="image/*" hidden>
          <span class="upload-hint">JPG, PNG, or WEBP — up to 5 MB</span>
        </div>

        <div class="divider"><span>or paste an image URL</span></div>

        <input type="text" id="${fid}" value="${esc(v)}" placeholder="https://…">

        <div class="hint">Or pick one of these preset rice photos:</div>
        <div class="gallery" id="photoGallery">
          ${RICE_PHOTOS.map(ph => `
            <button type="button" data-act="pick-photo" data-url="${esc(ph.url)}" title="${esc(ph.label)}"
                    class="${v === ph.url ? 'on' : ''}">
              <img src="${esc(ph.url)}" alt="${esc(ph.label)}" loading="lazy">
            </button>`).join('')}
        </div>

        <div class="img-preview" id="imgPreview"></div>
      </div>`;
    }

    let input;
    if (f.type === 'select') {
      input = `<select id="${fid}">${optsOf(f).map(o =>
        `<option ${o === v ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>`;
    } else if (f.type === 'textarea') {
      input = `<textarea id="${fid}" rows="3" placeholder="${esc(f.placeholder || '')}">${esc(v)}</textarea>`;
    } else {
      const t = (f.type === 'currency' || f.type === 'number') ? 'number' : 'text';
      const step = f.type === 'currency' ? '0.01' : (f.type === 'number' ? 'any' : '');
      input = `<input id="${fid}" type="${t}" ${step ? `step="${step}"` : ''} value="${esc(v)}"
                placeholder="${esc(f.placeholder || '')}">`;
    }
    return `<label class="field ${f.wide ? 'wide' : ''}">
      <span>${esc(f.label)}${f.required ? ' <b>*</b>' : ''}</span>
      ${input}
    </label>`;
  }).join('');

  return `
  <div class="modal wide" onclick="event.stopPropagation()">
    <div class="modal-head">
      <div>
        <h3>${isNew ? '🌾 Post a new rice' : '✏️ Edit rice'}</h3>
        <div class="sub">${isNew ? 'Fill in the details and post it to your shop.' : esc(p.name)}</div>
      </div>
      <button class="x" data-act="modal-close">✕</button>
    </div>

    <form data-form="product" data-id="${id || ''}">
      <div class="modal-body">
        <div class="fields">${fields}</div>
      </div>
      <div class="modal-foot">
        <button type="button" class="btn ghost" data-act="modal-close">Cancel</button>
        <button type="submit" class="btn">${isNew ? '🌾 Post rice to shop' : 'Save changes'}</button>
      </div>
    </form>
  </div>`;
}

function updateProductPreview() {
  const input = document.getElementById('pf_image_url');
  const box   = document.getElementById('imgPreview');
  if (!input || !box) return;
  const url = input.value.trim();
  if (!url) {
    box.innerHTML = `<div class="empty">No image selected — the shop will show a coloured placeholder.</div>`;
    return;
  }
  box.innerHTML = `<img src="${esc(url)}" alt="preview" data-img>
                   <span class="fallback" style="display:none">Preview unavailable</span>`;
  attachImageFallbacks(box);
}

/* -------------------------- ADMIN: ORDER VIEW ----------------------------- */
function orderViewModalHtml(id) {
  const o = state.orders.find(x => x.id === id);
  if (!o) return '';
  return `
  <div class="modal" onclick="event.stopPropagation()">
    <div class="modal-head">
      <div>
        <h3>Order ${esc(o.order_no)}</h3>
        <div class="sub">${esc(o.date)} · ${esc(o.customer.name)}</div>
      </div>
      <button class="x" data-act="modal-close">✕</button>
    </div>
    <div class="modal-body">
      <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap">
        ${badgeFor(o.status)}
        <span class="badge">${o.delivery_method === 'delivery' ? '🚚 Delivery' : '🏪 Pickup'}</span>
      </div>

      <table class="grid" style="margin:0 -24px;width:calc(100% + 48px)">
        <thead><tr><th>Item</th><th class="right">Qty</th><th class="right">Price</th><th class="right">Amount</th></tr></thead>
        <tbody>
          ${o.items.map(it => `<tr>
            <td>${esc(it.name)}</td>
            <td class="right">${it.qty} kg</td>
            <td class="right">${money(it.price)}</td>
            <td class="right">${money(it.qty * it.price)}</td>
          </tr>`).join('')}
        </tbody>
      </table>

      <div class="summary">
        <div class="row"><span>Subtotal</span><span>${money(o.subtotal)}</span></div>
        <div class="row"><span>Delivery fee</span><span>${o.delivery_fee ? money(o.delivery_fee) : 'FREE'}</span></div>
        <div class="row total"><span>Total</span><span>${money(o.total)}</span></div>
      </div>

      <div style="margin-top:18px;font-size:13.5px;line-height:1.9">
        <div><strong>Customer:</strong> ${esc(o.customer.name)}</div>
        <div><strong>Phone:</strong> ${esc(o.customer.phone)}</div>
        ${o.customer.address ? `<div><strong>Address:</strong> ${esc(o.customer.address)}</div>` : ''}
        ${o.notes ? `<div><strong>Notes:</strong> ${esc(o.notes)}</div>` : ''}
      </div>
    </div>
    <div class="modal-foot">
      <button class="btn ghost" data-act="modal-close">Close</button>
    </div>
  </div>`;
}