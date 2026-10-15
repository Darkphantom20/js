/* ============================================================
 * api.js — every read/write against the database + Storage.
 * ============================================================ */

const API = {

  /* ------- PRODUCTS ------- */
  async getProducts() {
    const { data, error } = await supa.from('products')
      .select('*').order('created_at', { ascending: true });
    if (error) throw error;
    return (data || []).map(normalizeProduct);
  },

  async saveProduct(p) {
    const row = {
      name: p.name, variety: p.variety, grade: p.grade,
      price_per_kg: num(p.price_per_kg), cost_per_kg: num(p.cost_per_kg),
      stock_kg: num(p.stock_kg), reorder_kg: num(p.reorder_kg),
      image_url: p.image_url || null, origin: p.origin || null,
      description: p.description || null, posted: !!p.posted,
      updated_at: new Date().toISOString()
    };
    if (p.id) {
      const { data, error } = await supa.from('products')
        .update(row).eq('id', p.id).select().single();
      if (error) throw error;
      return normalizeProduct(data);
    } else {
      const { data, error } = await supa.from('products')
        .insert(row).select().single();
      if (error) throw error;
      return normalizeProduct(data);
    }
  },

  async deleteProduct(id) {
    const { error } = await supa.from('products').delete().eq('id', id);
    if (error) throw error;
  },

  /* ------- PHOTO UPLOAD ------- */
  async uploadPhoto(file) {
    if (!file) throw new Error('No file selected.');
    if (!file.type.startsWith('image/')) throw new Error('Please choose an image file.');
    if (file.size > 5 * 1024 * 1024) throw new Error('Image must be under 5 MB.');

    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const { error } = await supa.storage
      .from(CFG.shop.photoBucket)
      .upload(path, file, { cacheControl: '3600', upsert: false });
    if (error) throw error;

    const { data } = supa.storage.from(CFG.shop.photoBucket).getPublicUrl(path);
    return data.publicUrl;
  },

  /* ------- ORDERS ------- */
  async getOrders() {
    const { data, error } = await supa.from('orders')
      .select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(normalizeOrder);
  },

  async placeOrder(order) {
    const { data, error } = await supa.rpc('place_order', {
      p_customer_name:    order.customer_name,
      p_customer_phone:   order.customer_phone,
      p_customer_address: order.customer_address || null,
      p_delivery_method:  order.delivery_method,
      p_items:            order.items,
      p_subtotal:         num(order.subtotal),
      p_delivery_fee:     num(order.delivery_fee),
      p_total:            num(order.total),
      p_notes:            order.notes || null
    });
    if (error) throw error;
    return normalizeOrder(data);
  },

  async setOrderStatus(id, status) {
    if (status === 'Cancelled') {
      const { error } = await supa.rpc('cancel_order', { p_order_id: id });
      if (error) throw error;
      return;
    }
    const { error } = await supa.from('orders').update({ status }).eq('id', id);
    if (error) throw error;
  },

  /* ------- SETTINGS ------- */
  async getSettings() {
    const { data, error } = await supa.from('settings')
      .select('*').eq('id', 1).maybeSingle();
    if (error) throw error;
    return data || {
      shop_name: 'Golden Grain', tagline: '', phone: '', address: '',
      delivery_fee: CFG.shop.defaultDeliveryFee,
      free_delivery_over: CFG.shop.defaultFreeDeliveryOver
    };
  },

  async saveSettings(s) {
    const row = {
      id: 1,
      shop_name: s.shop_name || 'Golden Grain',
      tagline:   s.tagline || '',
      phone:     s.phone || '',
      address:   s.address || '',
      delivery_fee: num(s.delivery_fee),
      free_delivery_over: num(s.free_delivery_over),
      updated_at: new Date().toISOString()
    };
    const { error } = await supa.from('settings').upsert(row, { onConflict: 'id' });
    if (error) throw error;
  },

  /* ------- CONNECTION TEST ------- */
  async testConnection() {
    const { error } = await supa.from('products').select('id').limit(1);
    if (error) throw error;
    return true;
  }
};

/* --- Row normalizers --- */
function normalizeProduct(r) {
  return {
    id: r.id,
    name: r.name,
    variety: r.variety,
    grade: r.grade || 'Grade A',
    price_per_kg: num(r.price_per_kg),
    cost_per_kg:  num(r.cost_per_kg),
    stock_kg:     num(r.stock_kg),
    reorder_kg:   num(r.reorder_kg),
    image_url:    r.image_url || '',
    origin:       r.origin || '',
    description:  r.description || '',
    posted:       !!r.posted,
    created_at:   r.created_at
  };
}

function normalizeOrder(r) {
  return {
    id: r.id,
    order_no: r.order_no,
    date: (r.created_at || '').slice(0, 10),
    created_at: r.created_at,
    customer: {
      name: r.customer_name,
      phone: r.customer_phone,
      address: r.customer_address || ''
    },
    delivery_method: r.delivery_method,
    items: Array.isArray(r.items) ? r.items : [],
    subtotal:     num(r.subtotal),
    delivery_fee: num(r.delivery_fee),
    total:        num(r.total),
    notes:  r.notes || '',
    status: r.status
  };
}
