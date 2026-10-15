/* ============================================================
 * store.js — in-memory app state, populated from Supabase.
 * ============================================================ */

const state = {
  view: 'loading',
  setupError: '',
  authed: false,
  adminTab: 'overview',
  modal: null,
  filter: { q: '', variety: 'all', sort: 'featured' },

  products: [],
  orders: [],
  settings: {
    shop_name: 'Golden Grain', tagline: '', phone: '', address: '',
    delivery_fee: CFG.shop.defaultDeliveryFee,
    free_delivery_over: CFG.shop.defaultFreeDeliveryOver
  }
};

async function loadAll() {
  const [products, orders, settings] = await Promise.all([
    API.getProducts(), API.getOrders(), API.getSettings()
  ]);
  state.products = products;
  state.orders = orders;
  state.settings = settings;
}

async function reloadProducts() { state.products = await API.getProducts(); }
async function reloadOrders()   { state.orders   = await API.getOrders(); }