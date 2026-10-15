/* ============================================================
 * ui-admin.js — login + admin dashboard shell + four tabs.
 * ============================================================ */

function loginShell() {
  return `
  <div class="login-wrap">
    <div class="login-card">
      <div class="mark">🔐</div>
      <h2>Admin login</h2>
      <p>Sign in to manage your rice, stock and orders.</p>

      <form data-form="login">
        <label class="field" style="margin-bottom:16px">
          <span>Password</span>
          <input type="password" id="adminPass" placeholder="Enter admin password" autofocus required>
        </label>
        <button class="btn block" type="submit">Sign in to dashboard</button>
      </form>

      <button class="btn ghost block" style="margin-top:12px" data-act="admin-back">← Back to shop</button>
    </div>
  </div>`;
}

function adminShell() {
  const tabs = [
    ['overview','📊 Overview'],
    ['products','🌾 Rice Products'],
    ['orders','🧾 Orders'],
    ['settings','⚙️ Settings']
  ];
  return `
  <header class="adminbar">
    <div class="wrap">
      <a class="logo" data-act="admin-home">
        <span class="mark">🌾</span>
        <span>${esc(shopName())}<small>Admin Dashboard</small></span>
      </a>
      <nav class="admin-tabs">
        ${tabs.map(([k, l]) =>
          `<button class="${state.adminTab === k ? 'on' : ''}" data-act="tab" data-tab="${k}">${l}</button>`
        ).join('')}
      </nav>
      <div class="spacer"></div>
      <button class="btn ghost sm" data-act="admin-back">🛍️ View shop</button>
      <button class="btn danger sm" data-act="logout">Log out</button>
    </div>
  </header>
  <main class="admin-main">
    <div class="wrap">${adminTabHtml()}</div>
  </main>`;
}

function adminTabHtml() {
  if (state.adminTab === 'products') return adminProductsHtml();
  if (state.adminTab === 'orders')   return adminOrdersHtml();
  if (state.adminTab === 'settings') return adminSettingsHtml();
  return adminOverviewHtml();
}

/* ------------------------------- OVERVIEW --------------------------------- */
function adminOverviewHtml() {
  const live       = state.orders.filter(o => o.status !== 'Cancelled');
  const sales      = live.reduce((s, o) => s + num(o.total), 0);
  const pending    = state.orders.filter(o => o.status === 'Pending').length;
  const low        = state.products.filter(p => num(p.stock_kg) <= (num(p.reorder_kg) || 0));
  const stockValue = state.products.reduce((s, p) => s + num(p.stock_kg) * num(p.cost_per_kg), 0);
  const postedCount= state.products.filter(p => p.posted).length;

  return `
  <div class="page-head">
    <div>
      <h1>Overview</h1>
      <p class="muted">Everything happening in your rice shop today.</p>
    </div>
    <div style="display:flex;gap:9px">
      <button class="btn ghost" data-act="tab" data-tab="orders">View orders</button>
      <button class="btn" data-act="product-new">+ Post new rice</button>
    </div>
  </div>

  <div class="kpis">
    <div class="kpi"><div class="lab">Total sales</div><div class="val">${money(sales)}</div>
      <div class="sub">${live.length} order${live.length === 1 ? '' : 's'}</div></div>
    <div class="kpi ${pending ? 'amber' : ''}"><div class="lab">Pending orders</div><div class="val">${pending}</div>
      <div class="sub">Waiting for confirmation</div></div>
    <div class="kpi blue"><div class="lab">Rice posted</div><div class="val">${postedCount} / ${state.products.length}</div>
      <div class="sub">Visible in the shop</div></div>
    <div class="kpi ${low.length ? 'red' : ''}"><div class="lab">Low stock</div><div class="val">${low.length}</div>
      <div class="sub">At or below alert level</div></div>
    <div class="kpi"><div class="lab">Inventory value</div><div class="val">${money(stockValue)}</div>
      <div class="sub">At cost price</div></div>
  </div>

  <div class="panel">
    <div class="panel-head">
      <h3>Recent orders</h3>
      <div class="spacer"></div>
      <button class="btn ghost xs" data-act="tab" data-tab="orders">See all →</button>
    </div>
    ${state.orders.length ? `
      <table class="grid">
        <thead><tr><th>Order</th><th>Customer</th><th>Items</th><th class="right">Total</th><th>Status</th><th class="right">Action</th></tr></thead>
        <tbody>
          ${state.orders.slice(0, 6).map(o => `<tr>
            <td><strong>${esc(o.order_no)}</strong><br><small class="muted">${esc(o.date)}</small></td>
            <td>${esc(o.customer.name)}<br><small class="muted">${esc(o.customer.phone)}</small></td>
            <td>${o.items.length} item${o.items.length === 1 ? '' : 's'}</td>
            <td class="right"><strong>${money(o.total)}</strong></td>
            <td>${badgeFor(o.status)}</td>
            <td class="right"><button class="btn ghost xs" data-act="order-view" data-id="${o.id}">View</button></td>
          </tr>`).join('')}
        </tbody>
      </table>` : `<div class="empty-state" style="border:0;border-radius:0"><span class="big">🧾</span>No orders yet.</div>`}
  </div>

  ${low.length ? `
  <div class="panel">
    <div class="panel-head"><h3>⚠️ Restock soon</h3></div>
    <table class="grid">
      <thead><tr><th>Rice</th><th class="right">Stock</th><th class="right">Alert at</th><th class="right">Action</th></tr></thead>
      <tbody>${low.map(p => `<tr>
        <td><div class="cell-prod">
          ${thumbSmallHtml(p)}
          <div><strong>${esc(p.name)}</strong><small>${esc(p.variety)}</small></div>
        </div></td>
        <td class="right"><strong style="color:var(--danger)">${num(p.stock_kg)} kg</strong></td>
        <td class="right muted">${num(p.reorder_kg)} kg</td>
        <td class="right"><button class="btn ghost xs" data-act="product-edit" data-id="${p.id}">Restock</button></td>
      </tr>`).join('')}</tbody>
    </table>
  </div>` : ''}`;
}

/* ------------------------------- PRODUCTS --------------------------------- */
function adminProductsHtml() {
  const list = state.products;
  return `
  <div class="page-head">
    <div>
      <h1>Rice Products</h1>
      <p class="muted">${list.length} rice${list.length === 1 ? '' : 's'} · ${list.filter(p => p.posted).length} posted in shop</p>
    </div>
    <button class="btn" data-act="product-new">+ Post new rice</button>
  </div>

  <div class="panel">
    ${list.length ? `
    <table class="grid">
      <thead>
        <tr>
          <th>Rice</th><th>Variety</th><th class="right">Price/kg</th>
          <th class="right">Stock</th><th>Shop status</th><th class="right">Actions</th>
        </tr>
      </thead>
      <tbody>
        ${list.map(p => {
          const st = stockInfo(p);
          return `<tr>
            <td><div class="cell-prod">
              ${thumbSmallHtml(p)}
              <div><strong>${esc(p.name)}</strong><small>${esc(p.grade || '')}${p.origin ? ' · ' + esc(p.origin) : ''}</small></div>
            </div></td>
            <td><span class="badge green">${esc(p.variety)}</span></td>
            <td class="right"><strong>${money(p.price_per_kg)}</strong></td>
            <td class="right">
              <strong style="color:${st.cls === 'out' ? 'var(--danger)' : st.cls === 'low' ? 'var(--amber)' : 'var(--ink)'}">${num(p.stock_kg)} kg</strong>
              <br><small class="muted">alert at ${num(p.reorder_kg)} kg</small>
            </td>
            <td>${p.posted
              ? '<span class="badge green">● Posted</span>'
              : '<span class="badge gray">○ Draft</span>'}</td>
            <td class="right nowrap">
              <button class="btn ghost xs" data-act="product-toggle" data-id="${p.id}">
                ${p.posted ? 'Unpost' : 'Post'}
              </button>
              <button class="btn ghost xs" data-act="product-edit" data-id="${p.id}">Edit</button>
              <button class="btn danger xs" data-act="product-delete" data-id="${p.id}">Delete</button>
            </td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>` : `<div class="empty-state" style="border:0"><span class="big">🌾</span>
        <strong>No rice posted yet</strong><br>
        <span class="muted">Click “Post new rice” to add your first product.</span></div>`}
  </div>`;
}

/* -------------------------------- ORDERS ---------------------------------- */
function adminOrdersHtml() {
  const list = state.orders;
  const pending = list.filter(o => o.status === 'Pending').length;

  return `
  <div class="page-head">
    <div>
      <h1>Orders</h1>
      <p class="muted">${list.length} order${list.length === 1 ? '' : 's'}${pending ? ` · ${pending} waiting for confirmation` : ''}</p>
    </div>
  </div>

  <div class="panel">
    ${list.length ? `
    <table class="grid">
      <thead>
        <tr><th>Order</th><th>Customer</th><th>Items</th><th>Type</th>
        <th class="right">Total</th><th>Status</th><th class="right">Actions</th></tr>
      </thead>
      <tbody>
        ${list.map(o => `<tr>
          <td><strong>${esc(o.order_no)}</strong><br><small class="muted">${esc(o.date)}</small></td>
          <td>${esc(o.customer.name)}<br><small class="muted">${esc(o.customer.phone)}</small></td>
          <td>${o.items.map(i => `${esc(i.name)} ×${i.qty}kg`).join('<br>')}</td>
          <td><span class="badge ${o.delivery_method === 'delivery' ? 'blue' : 'gray'}">${o.delivery_method === 'delivery' ? '🚚 Delivery' : '🏪 Pickup'}</span></td>
          <td class="right"><strong>${money(o.total)}</strong></td>
          <td>${badgeFor(o.status)}</td>
          <td class="right nowrap">
            <button class="btn ghost xs" data-act="order-view" data-id="${o.id}">View</button>
            ${o.status === 'Pending' ? `<button class="btn xs" data-act="order-status" data-id="${o.id}" data-status="Confirmed">Confirm</button>` : ''}
            ${o.status === 'Confirmed' ? `<button class="btn xs" data-act="order-status" data-id="${o.id}" data-status="Out for delivery">Ship</button>` : ''}
            ${o.status === 'Out for delivery' ? `<button class="btn xs" data-act="order-status" data-id="${o.id}" data-status="Delivered">Delivered</button>` : ''}
            ${o.status !== 'Cancelled' && o.status !== 'Delivered'
              ? `<button class="btn danger xs" data-act="order-status" data-id="${o.id}" data-status="Cancelled">Cancel</button>` : ''}
          </td>
        </tr>`).join('')}
      </tbody>
    </table>` : `<div class="empty-state" style="border:0"><span class="big">🧾</span>
        <strong>No orders yet</strong><br>
        <span class="muted">Orders placed in your shop will appear here.</span></div>`}
  </div>`;
}

/* ------------------------------- SETTINGS --------------------------------- */
function adminSettingsHtml() {
  const s = state.settings;
  const creds = getCreds() || {};
  return `
  <div class="page-head">
    <div><h1>Settings</h1><p class="muted">Shop information shown to your customers.</p></div>
  </div>

  <div class="panel" style="padding:22px;max-width:680px">
    <form data-form="settings">
      <div class="fields">
        <label class="field"><span>Shop name</span>
          <input type="text" id="setName" value="${esc(s.shop_name || '')}"></label>
        <label class="field"><span>Phone</span>
          <input type="text" id="setPhone" value="${esc(s.phone || '')}"></label>
        <label class="field wide"><span>Tagline</span>
          <input type="text" id="setTagline" value="${esc(s.tagline || '')}"></label>
        <label class="field wide"><span>Address</span>
          <input type="text" id="setAddress" value="${esc(s.address || '')}"></label>
        <label class="field"><span>Delivery fee (${esc(CFG.shop.currency)})</span>
          <input type="number" step="0.01" id="setFee" value="${num(s.delivery_fee)}"></label>
        <label class="field"><span>Free delivery over (${esc(CFG.shop.currency)})</span>
          <input type="number" step="0.01" id="setFree" value="${num(s.free_delivery_over)}"></label>
      </div>
      <div class="form-actions" style="margin-top:20px">
        <button class="btn" type="submit">Save settings</button>
      </div>
    </form>
  </div>

  <div class="panel" style="padding:22px;max-width:680px">
    <h3 style="margin:0 0 6px;font-size:15px">Database connection</h3>
    <p class="muted" style="font-size:13px;margin:0 0 14px">
      Connected to <code>${esc((creds.url || '').replace(/^https?:\/\//, ''))}</code>
    </p>
    <div style="display:flex;gap:9px;flex-wrap:wrap">
      <button class="btn ghost" data-act="reconnect">Reconnect / change project</button>
      <button class="btn danger" data-act="clear-conn">Disconnect &amp; clear</button>
    </div>
  </div>
  `;
}