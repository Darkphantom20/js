/* ============================================================
 * config.js — static configuration that is NOT stored in the database.
 * ============================================================ */

const CFG = {
  shop: {
    currency: '₱',
    adminPassword: 'admin123',           // prototype-only gate; replace with Supabase Auth later
    defaultDeliveryFee: 100,
    defaultFreeDeliveryOver: 1500,
    photoBucket: 'rice-photos'           // Supabase Storage bucket for uploaded rice photos
  },

  varieties: ['Jasmine','Basmati','Sinandomeng','Dinorado','Brown','Glutinous','Black Rice','Red Rice'],
  grades:    ['Premium','Grade A','Grade B'],
  statuses:  ['Pending','Confirmed','Out for delivery','Delivered','Cancelled'],

  orderStatusColor: {
    'Pending':'amber',
    'Confirmed':'blue',
    'Out for delivery':'blue',
    'Delivered':'green',
    'Cancelled':'red'
  },

  /* Product form is generated from this list. Add a field → form updates. */
  productFields: [
    { name:'name',         label:'Rice name',              type:'text',     required:true, wide:true, placeholder:'e.g. Jasmine Rice' },
    { name:'variety',      label:'Variety',                type:'select',   options:'varieties', required:true },
    { name:'grade',        label:'Grade',                  type:'select',   options:'grades' },
    { name:'price_per_kg', label:'Selling price / kg',     type:'currency', required:true, placeholder:'0.00' },
    { name:'cost_per_kg',  label:'Cost / kg',              type:'currency', placeholder:'0.00' },
    { name:'stock_kg',     label:'Stock on hand (kg)',     type:'number',   required:true, placeholder:'0' },
    { name:'reorder_kg',   label:'Low-stock alert at (kg)',type:'number',   placeholder:'100' },
    { name:'origin',       label:'Origin / farm',          type:'text',     placeholder:'e.g. Nueva Ecija' },
    { name:'image_url',    label:'Photo',                  type:'image',    wide:true },
    { name:'posted',       label:'Post this rice in the shop', type:'toggle', wide:true },
    { name:'description',  label:'Description',            type:'textarea', wide:true, placeholder:'What customers will read on the shop page…' }
  ]
};

/* Preset rice photos — real Unsplash images. Click in the admin form to fill image_url. */
const RICE_PHOTOS = [
  { label:'Jasmine',   url:'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=800&q=80' },
  { label:'Rice Bowl', url:'https://images.unsplash.com/photo-1536304993881-ff6e9eefa2a6?auto=format&fit=crop&w=800&q=80' },
  { label:'Grains',    url:'https://images.unsplash.com/photo-1596797038530-2c107229654b?auto=format&fit=crop&w=800&q=80' },
  { label:'Brown',     url:'https://images.unsplash.com/photo-1604329760661-e71dc83f8f26?auto=format&fit=crop&w=800&q=80' },
  { label:'Sack',      url:'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&w=800&q=80' },
  { label:'Basmati',   url:'https://images.unsplash.com/photo-1626200419199-391ae4be7a41?auto=format&fit=crop&w=800&q=80' },
  { label:'Sticky',    url:'https://images.unsplash.com/photo-1614961233913-a5113a4a34ed?auto=format&fit=crop&w=800&q=80' },
  { label:'Paddy',     url:'https://images.unsplash.com/photo-1508061253366-f7da158b6d46?auto=format&fit=crop&w=800&q=80' }
];