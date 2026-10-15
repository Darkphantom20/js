/* ============================================================
 * app.js — entry point: render router, events, boot.
 * ============================================================ */

function render() {
  const app = document.getElementById('app');

  if (state.view === 'loading') { app.innerHTML = loadingScreen(); return; }
  if (state.view === 'setup')   { app.innerHTML = setupScreen(state.setupError); return; }

  if (state.view === 'admin') {
    app.innerHTML = state.authed ? adminShell() : loginShell();
  } else {
    app.innerHTML = shopShell();
    renderShopGrid();
  }
  renderModal();
  attachImageFallbacks(document);
}

/* ------------------------------- CLICKS --------------------------------- */
document.addEventListener('click', async e => {
  const t = e.target.closest('[data-act]');
  if (!t) return;
  const act = t.dataset.act;

  if (act === 'overlay' && e.target === t) { state.modal = null; renderModal(); return; }

  switch (act) {

    case 'copy-sql':
      navigator.clipboard.writeText(SQL_SCHEMA).then(
        () => { t.textContent = '✓ Copied'; setTimeout(() => t.textContent = 'Copy SQL', 1500); },
        () => toast('Copy failed — select manually', 'err'));
      return;

    case 'test-conn': {
      const url = document.getElementById('cfgUrl').value.trim();
      const key = document.getElementById('cfgKey').value.trim();
      const status = document.getElementById('setupStatus');
      if (!url || !key) {
        status.className = 'setup-status err';
        status.textContent = 'Enter both the URL and the anon key.';
        return;
      }
      status.className = 'setup-status info';
      status.textContent = 'Testing…';
      try {
        const testClient = window.supabase.createClient(url, key);
        const { error } = await testClient.from('products').select('id').limit(1);
        if (error) throw error;
        status.className = 'setup-status ok';
        status.textContent = '✓ Connection OK — tables found. You can connect now.';
      } catch (err) {
        status.className = 'setup-status err';
        status.textContent = 'Connection failed: ' + (err.message || err) + '  →  Make sure you ran the SQL.';
      }
      return;
    }

    case 'home':
      state.view = 'shop';
      render();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;

    case 'scroll': {
      const el = document.querySelector(t.dataset.target);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    case 'buy':
      state.modal = { type: 'buy', id: t.dataset.id };
      renderModal();
      return;

    case 'qty': {
      const input = document.getElementById('buyQty');
      if (input) { input.value = t.dataset.q; updateBuySummary(); }
      document.querySelectorAll('.qty-chip').forEach(c => c.classList.remove('on'));
      t.classList.add('on');
      return;
    }

    case 'modal-close':
      state.modal = null;
      renderModal();
      return;

    case 'modal-close-scroll':
      state.modal = null;
      renderModal();
      document.getElementById('riceSection')?.scrollIntoView({ behavior: 'smooth' });
      return;

    case 'pick-photo': {
      const input = document.getElementById('pf_image_url');
      input.value = t.dataset.url;
      document.querySelectorAll('#photoGallery button').forEach(b => b.classList.remove('on'));
      t.classList.add('on');
      updateProductPreview();
      return;
    }

    case 'admin-open':
      state.view = 'admin';
      state.adminTab = 'overview';
      render();
      window.scrollTo(0, 0);
      return;

    case 'admin-back':
      state.view = 'shop';
      render();
      window.scrollTo(0, 0);
      return;

    case 'admin-home':
      state.adminTab = 'overview';
      render();
      return;

    case 'logout':
      sessionStorage.removeItem(AUTH_KEY);
      state.authed = false;
      state.view = 'shop';
      render();
      toast('Logged out of the dashboard');
      return;

    case 'tab':
      state.adminTab = t.dataset.tab;
      render();
      window.scrollTo(0, 0);
      return;

    case 'product-new':
      state.modal = { type: 'product', id: null };
      renderModal();
      return;

    case 'product-edit':
      state.modal = { type: 'product', id: t.dataset.id };
      renderModal();
      return;

    case 'product-toggle': {
      const p = state.products.find(x => x.id === t.dataset.id);
      try {
        await API.saveProduct({ ...p, posted: !p.posted });
        await reloadProducts();
        render();
        toast(p.posted ? `“${p.name}” unposted` : `“${p.name}” is now live in the shop`);
      } catch (err) { toast(err.message || 'Update failed', 'err'); }
      return;
    }

    case 'product-delete': {
      const p = state.products.find(x => x.id === t.dataset.id);
      if (!confirm(`Delete “${p.name}” permanently? This cannot be undone.`)) return;
      try {
        await API.deleteProduct(p.id);
        await reloadProducts();
        render();
        toast(`Deleted “${p.name}”`);
      } catch (err) { toast(err.message || 'Delete failed', 'err'); }
      return;
    }

    case 'order-view':
      state.modal = { type: 'orderView', id: t.dataset.id };
      renderModal();
      return;

    case 'order-status': {
      const o = state.orders.find(x => x.id === t.dataset.id);
      const s = t.dataset.status;
      if (s === 'Cancelled' && !confirm(`Cancel order ${o.order_no}? Stock will be returned.`)) return;
      try {
        await API.setOrderStatus(o.id, s);
        await Promise.all([reloadOrders(), reloadProducts()]);
        render();
        toast(`Order ${o.order_no} → ${s}`);
      } catch (err) { toast(err.message || 'Update failed', 'err'); }
      return;
    }

    case 'reconnect':
      clearCreds();
      location.reload();
      return;

    case 'clear-conn':
      if (!confirm('Disconnect from Supabase and clear the saved credentials?')) return;
      clearCreds();
      sessionStorage.removeItem(AUTH_KEY);
      location.reload();
      return;
  }
});

/* ------------------------------- INPUT / CHANGE ------------------------- */
document.addEventListener('input', e => {
  if (e.target.id === 'shopSearch')    { state.filter.q = e.target.value; renderShopGrid(); }
  if (e.target.id === 'pf_image_url')  updateProductPreview();
  if (e.target.closest('#buyForm'))    updateBuySummary();
});

document.addEventListener('change', async e => {
  if (e.target.id === 'shopVariety') { state.filter.variety = e.target.value; renderShopGrid(); }
  if (e.target.id === 'shopSort')    { state.filter.sort    = e.target.value; renderShopGrid(); }

  /* --- photo upload from device --- */
  if (e.target.id === 'pf_image_url_file') {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const urlInput = document.getElementById('pf_image_url');
    const box      = document.getElementById('imgPreview');

    box.classList.add('uploading');
    box.innerHTML = 'Uploading photo…';

    try {
      const publicUrl = await API.uploadPhoto(file);
      urlInput.value = publicUrl;
      box.classList.remove('uploading');
      updateProductPreview();
      document.querySelectorAll('#photoGallery button').forEach(b => b.classList.remove('on'));
      toast('Photo uploaded!');
    } catch (err) {
      box.classList.remove('uploading');
      updateProductPreview();
      toast(err.message || 'Upload failed', 'err');
    }
    e.target.value = '';
  }
});

/* ------------------------------- SUBMITS -------------------------------- */
document.addEventListener('submit', async e => {
  e.preventDefault();
  const form = e.target.closest('form');
  if (!form) return;

  /* --- Connect --- */
  if (form.id === 'connectForm') {
    const url = document.getElementById('cfgUrl').value.trim();
    const key = document.getElementById('cfgKey').value.trim();
    const status = document.getElementById('setupStatus');
    status.className = 'setup-status info';
    status.textContent = 'Connecting…';
    saveCreds(url, key);
    if (!initSupabase()) {
      status.className = 'setup-status err';
      status.textContent = 'Could not initialize the Supabase client.';
      return;
    }
    try {
      await API.testConnection();
      status.className = 'setup-status ok';
      status.textContent = '✓ Connected! Loading your shop…';
      await loadAll();
      state.view = 'shop';
      render();
      toast('Shop is live!');
    } catch (err) {
      status.className = 'setup-status err';
      status.textContent = 'Connection failed: ' + (err.message || err) +
                           '  →  Double-check that you ran the setup SQL in Supabase.';
      supa = null;
    }
    return;
  }

  /* --- Admin login --- */
  if (form.dataset.form === 'login') {
    const pass = document.getElementById('adminPass').value;
    if (pass === CFG.shop.adminPassword) {
      sessionStorage.setItem(AUTH_KEY, '1');
      state.authed = true;
      state.adminTab = 'overview';
      render();
      toast('Welcome back, admin!');
    } else {
      toast('Wrong password. Try again.', 'err');
      document.getElementById('adminPass').value = '';
    }
    return;
  }

  /* --- Place customer order --- */
  if (form.dataset.form === 'buy') {
    const p = state.products.find(x => x.id === form.dataset.id);
    if (!p) return toast('This rice is no longer available. Please refresh the shop.', 'err');
    const qty     = num(document.getElementById('buyQty').value);
    const name    = document.getElementById('buyName').value.trim();
    const phone   = document.getElementById('buyPhone').value.trim();
    const method  = document.getElementById('buyDelivery').value;
    const address = document.getElementById('buyAddress').value.trim();
    const notes   = document.getElementById('buyNotes').value.trim();

    if (!Number.isFinite(qty) || qty < 0.001)
      return toast('Please enter a valid quantity of at least 0.001 kg.', 'err');
    if (qty > num(p.stock_kg)) return toast(`Only ${num(p.stock_kg)} kg of ${p.name} is available.`, 'err');
    if (!name)                 return toast('Please enter your name.', 'err');
    if (!phone)                return toast('Please enter your phone number.', 'err');
    if (method === 'delivery' && !address)
      return toast('Please enter your delivery address.', 'err');

    const subtotal = roundCurrency(qty * num(p.price_per_kg));
    const fee = deliveryFeeFor(subtotal, method);
    const submitButton = form.querySelector('button[type="submit"]');

    try {
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = 'Placing order…';
      }
      const order = await API.placeOrder({
        customer_name: name, customer_phone: phone,
        customer_address: method === 'delivery' ? address : shopAddress(),
        delivery_method: method,
        items: [{ productId: p.id, qty }],
        subtotal, delivery_fee: fee, total: roundCurrency(subtotal + fee),
        notes
      });

      state.modal = { type: 'success', order };
      await Promise.all([reloadProducts(), reloadOrders()]);
      renderModal();
      renderShopGrid();
      toast('Order placed successfully!');
    } catch (err) {
      toast(err.message || 'Could not place the order.', 'err');
    } finally {
      if (submitButton && submitButton.isConnected) {
        submitButton.disabled = false;
        submitButton.textContent = 'Place order →';
      }
    }
    return;
  }

  /* --- Save product --- */
  if (form.dataset.form === 'product') {
    const id = form.dataset.id;
    const isNew = !id;
    const rec = isNew ? {} : { ...state.products.find(x => x.id === id) };

    let missing = [];
    CFG.productFields.forEach(f => {
      const el = document.getElementById('pf_' + f.name);
      if (!el) return;
      if (f.type === 'toggle') { rec[f.name] = el.checked; return; }
      let v = el.value;
      if (f.type === 'number' || f.type === 'currency') v = v === '' ? 0 : Number(v);
      if (f.required && (v === '' || v === null || v === undefined)) missing.push(f.label);
      rec[f.name] = v;
    });

    if (missing.length) return toast('Please fill in: ' + missing.join(', '), 'err');
    if (num(rec.price_per_kg) <= 0) return toast('Selling price must be greater than 0.', 'err');

    try {
      await API.saveProduct(rec);
      await reloadProducts();
      state.modal = null;
      render();
      toast(isNew
        ? (rec.posted ? `“${rec.name}” posted to your shop!` : `“${rec.name}” saved as a draft.`)
        : `“${rec.name}” updated.`);
    } catch (err) {
      toast(err.message || 'Could not save the product.', 'err');
    }
    return;
  }

  /* --- Save settings --- */
  if (form.dataset.form === 'settings') {
    try {
      await API.saveSettings({
        shop_name: document.getElementById('setName').value.trim() || 'Golden Grain',
        tagline:   document.getElementById('setTagline').value.trim(),
        phone:     document.getElementById('setPhone').value.trim(),
        address:   document.getElementById('setAddress').value.trim(),
        delivery_fee:       num(document.getElementById('setFee').value),
        free_delivery_over: num(document.getElementById('setFree').value)
      });
      state.settings = await API.getSettings();
      render();
      toast('Settings saved.');
    } catch (err) { toast(err.message || 'Save failed', 'err'); }
    return;
  }
});

/* ------------------------------- DRAG & DROP (optional) ----------------- */
document.addEventListener('dragover', e => {
  const row = e.target.closest('.upload-row');
  if (row) { e.preventDefault(); row.style.borderColor = 'var(--green)'; row.style.background = '#e8f5ec'; }
});
document.addEventListener('dragleave', e => {
  const row = e.target.closest('.upload-row');
  if (row) { row.style.borderColor = ''; row.style.background = ''; }
});
document.addEventListener('drop', async e => {
  const row = e.target.closest('.upload-row');
  if (!row) return;
  e.preventDefault();
  row.style.borderColor = ''; row.style.background = '';
  const file = e.dataTransfer.files[0];
  if (!file) return;

  const urlInput = document.getElementById('pf_image_url');
  const box = document.getElementById('imgPreview');
  box.classList.add('uploading');
  box.innerHTML = 'Uploading photo…';
  try {
    const url = await API.uploadPhoto(file);
    urlInput.value = url;
    box.classList.remove('uploading');
    updateProductPreview();
    document.querySelectorAll('#photoGallery button').forEach(b => b.classList.remove('on'));
    toast('Photo uploaded!');
  } catch (err) {
    box.classList.remove('uploading');
    updateProductPreview();
    toast(err.message || 'Upload failed', 'err');
  }
});

/* ============================================================================
 * BOOT
 * ============================================================================ */
(async function boot() {
  state.view = 'loading';
  render();

  const creds = getCreds();
  if (!creds || !creds.url || !creds.key) {
    state.view = 'setup';
    render();
    return;
  }

  if (!initSupabase()) {
    state.view = 'setup';
    state.setupError = 'Supabase client could not be initialized. Please re-enter your credentials.';
    render();
    return;
  }

  try {
    await loadAll();
    state.view = 'shop';
    state.authed = sessionStorage.getItem(AUTH_KEY) === '1';
    render();
  } catch (err) {
    console.error('Boot error:', err);
    state.view = 'setup';
    state.setupError = 'Connected, but could not read your tables: ' + (err.message || err) +
                       ' — make sure you ran the setup SQL.';
    render();
  }
})();