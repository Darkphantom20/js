/* ============================================================
 * ui-shop.js — customer-facing shop.
 * ============================================================ */

function shopShell() {
  const all = postedProducts();
  const totalKg = all.reduce((s, p) => s + num(p.stock_kg), 0);
  const varieties = new Set(all.map(p => p.variety)).size;

  return `
  <header class="topbar">
    <div class="wrap">
      <a class="logo" data-act="home">
        <span class="mark">🌾</span>
        <span>${esc(shopName())}<small>Rice Shop</small></span>
      </a>
      <nav class="topnav">
        <a class="on" data-act="home">Shop</a>
        <a data-act="scroll" data-target="#riceSection">Our Rice</a>
        <a data-act="scroll" data-target="#whySection">Why Us</a>
      </nav>
      <div class="spacer"></div>
      <div class="tel">📞 ${esc(shopPhone())}</div>
      <button class="btn ghost sm" data-act="admin-open">🔐 Admin Dashboard</button>
    </div>
  </header>

  <section class="hero">
    <div class="wrap">
      <div>
        <h1>Quality rice,<br>sold by the kilo.</h1>
        <p>${esc(shopTagline())} Order online and pick it up at the shop, or have it delivered right to your door.</p>
        <div class="hero-cta">
          <button class="btn gold" data-act="scroll" data-target="#riceSection">🛒 Browse our rice</button>
          <button class="btn ghost" data-act="scroll" data-target="#whySection">Learn more</button>
        </div>
        <div class="hero-stats">
          <div><strong>${all.length}</strong><span>Rice varieties</span></div>
          <div><strong>${varieties}</strong><span>Types in stock</span></div>
          <div><strong>${totalKg.toLocaleString()} kg</strong><span>Ready to ship</span></div>
        </div>
      </div>
      <div class="hero-card">
        <h4>Why customers choose us</h4>
        <ul>
          <li><span>🌾</span><span>Freshly milled every week — never old stock</span></li>
          <li><span>⚖️</span><span>Honest weighing, guaranteed exact kilos</span></li>
          <li><span>🚚</span><span>Free delivery on orders over ${money(state.settings.free_delivery_over)}</span></li>
          <li><span>💬</span><span>Order online, we'll confirm by phone</span></li>
        </ul>
      </div>
    </div>
  </section>

  <section class="section" id="riceSection">
    <div class="wrap">
      <div class="section-head">
        <div>
          <h2>Our rice</h2>
          <p class="muted">Every variety currently posted by the shop owner.</p>
        </div>
        <div class="tools">
          <input class="input search" id="shopSearch" placeholder="Search rice…" value="${esc(state.filter.q)}">
          <select class="input" id="shopVariety">
            <option value="all">All varieties</option>
            ${CFG.varieties.map(v => `<option ${state.filter.variety === v ? 'selected' : ''}>${esc(v)}</option>`).join('')}
          </select>
          <select class="input" id="shopSort">
            <option value="featured"   ${state.filter.sort === 'featured' ? 'selected' : ''}>Featured</option>
            <option value="price-asc"  ${state.filter.sort === 'price-asc' ? 'selected' : ''}>Price: low → high</option>
            <option value="price-desc" ${state.filter.sort === 'price-desc' ? 'selected' : ''}>Price: high → low</option>
            <option value="name"       ${state.filter.sort === 'name' ? 'selected' : ''}>Name A → Z</option>
          </select>
        </div>
      </div>
      <div class="cards" id="shopGrid"></div>
    </div>
  </section>

  <section class="section" id="whySection" style="padding-top:0">
    <div class="wrap">
      <div class="panel" style="padding:30px">
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:26px">
          <div>
            <div style="font-size:28px">📦</div>
            <h4 style="margin:8px 0 4px">How ordering works</h4>
            <p class="muted" style="margin:0;font-size:13.5px">Pick your rice, enter the kilos you need, and place the order. The shop confirms it by phone.</p>
          </div>
          <div>
            <div style="font-size:28px">🏪</div>
            <h4 style="margin:8px 0 4px">Pickup or delivery</h4>
            <p class="muted" style="margin:0;font-size:13.5px">Choose pickup at ${esc(shopAddress())}, or delivery for a flat ${money(state.settings.delivery_fee)}.</p>
          </div>
          <div>
            <div style="font-size:28px">💵</div>
            <h4 style="margin:8px 0 4px">Pay on claim</h4>
            <p class="muted" style="margin:0;font-size:13.5px">Cash on pickup or delivery. No online payment needed for this prototype.</p>
          </div>
        </div>
      </div>
    </div>
  </section>

  <footer class="footer">
    <div class="wrap">
      <div>
        <strong>${esc(shopName())} Rice Shop</strong>
        ${esc(shopAddress())} · ${esc(shopPhone())}
      </div>
      <div>© ${new Date().getFullYear()} ${esc(shopName())}. Prototype website.</div>
    </div>
  </footer>`;
}

function renderShopGrid() {
  const grid = document.getElementById('shopGrid');
  if (!grid) return;

  let list = postedProducts();
  const q = state.filter.q.trim().toLowerCase();
  if (q) list = list.filter(p =>
    (p.name + ' ' + p.variety + ' ' + (p.grade || '') + ' ' + (p.description || ''))
      .toLowerCase().includes(q));
  if (state.filter.variety !== 'all') list = list.filter(p => p.variety === state.filter.variety);

  const sort = state.filter.sort;
  list.sort((a, b) => {
    if (sort === 'price-asc')  return num(a.price_per_kg) - num(b.price_per_kg);
    if (sort === 'price-desc') return num(b.price_per_kg) - num(a.price_per_kg);
    return String(a.name).localeCompare(String(b.name));
  });

  if (!list.length) {
    grid.innerHTML = `<div class="empty-state">
      <span class="big">🌾</span>
      <strong>No rice found</strong><br>
      <span class="muted">Try a different search or variety.</span>
    </div>`;
    return;
  }

  grid.innerHTML = list.map(p => {
    const st = stockInfo(p);
    return `
    <article class="pcard">
      <div class="thumb" data-thumb>
        ${p.image_url ? `<img src="${esc(p.image_url)}" alt="${esc(p.name)}" loading="lazy" data-img>` : ''}
        <span class="fallback">${esc(p.name)}</span>
        <span class="tag">${esc(p.grade || 'Rice')}</span>
      </div>
      <div class="pbody">
        <h3>${esc(p.name)}</h3>
        <div class="pmeta">
          <span class="badge green">${esc(p.variety)}</span>
          ${p.origin ? `<span class="badge">${esc(p.origin)}</span>` : ''}
        </div>
        <p class="pdesc">${esc(p.description || 'Freshly milled rice sold by the kilo.')}</p>
        <div class="prow">
          <div>
            <div class="price">${money(p.price_per_kg)}<small> /kg</small></div>
            <div class="stock ${st.cls}">${esc(st.label)}</div>
          </div>
          <button class="btn sm" data-act="buy" data-id="${p.id}" ${st.canBuy ? '' : 'disabled'}>
            ${st.canBuy ? '🛒 Buy' : 'Sold out'}
          </button>
        </div>
      </div>
    </article>`;
  }).join('');

  attachImageFallbacks(grid);
}