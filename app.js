/**
 * ═══════════════════════════════════════════════════════════
 * SOUSS-PHYTO — app.js
 * Mini ERP Agricole Professionnel
 * Créé par INASTECH +212661777702
 * ═══════════════════════════════════════════════════════════
 */

'use strict';

/* ══════════════════════════════════════════════════════════
   1. STORAGE ENGINE (IndexedDB + LocalStorage fallback)
═════════════════════════════════════════════════════════════ */
const DB = {
  _data: {},

  /** Load all data from localStorage */
  load() {
    const raw = localStorage.getItem('gestrm_data');
    this._data = raw ? JSON.parse(raw) : {};
  },

  /** Persist all data to localStorage */
  save() {
    localStorage.setItem('gestrm_data', JSON.stringify(this._data));
  },

  /** Get a table (array) */
  table(name) {
    if (!this._data[name]) this._data[name] = [];
    return this._data[name];
  },

  /** Set entire table */
  setTable(name, arr) {
    this._data[name] = arr;
    this.save();
  },

  /** Insert a record */
  insert(table, record) {
    record.id = record.id || uid();
    record.createdAt = record.createdAt || now();
    this._data[table] = this._data[table] || [];
    this._data[table].push(record);
    this.save();
    return record;
  },

  /** Update record by id */
  update(table, id, patch) {
    const t = this.table(table);
    const idx = t.findIndex(r => r.id === id);
    if (idx !== -1) {
      t[idx] = { ...t[idx], ...patch, updatedAt: now() };
      this.save();
      return t[idx];
    }
    return null;
  },

  /** Delete record by id */
  delete(table, id) {
    this._data[table] = (this._data[table] || []).filter(r => r.id !== id);
    this.save();
  },

  /** Find by id */
  find(table, id) {
    return (this._data[table] || []).find(r => r.id === id) || null;
  },

  /** Export full data object */
  export() { return JSON.parse(JSON.stringify(this._data)); },

  /** Import data (merge or replace) */
  import(data) { this._data = data; this.save(); }
};

/* ══════════════════════════════════════════════════════════
   2. UTILITY FUNCTIONS
═════════════════════════════════════════════════════════════ */
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const now = () => new Date().toISOString();
const fmtDate = d => d ? new Date(d).toLocaleDateString('fr-MA') : '—';
const fmtDT   = d => d ? new Date(d).toLocaleString('fr-MA') : '—';
const fmtNum  = n => Number(n || 0).toLocaleString('fr-MA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const MAD     = n => `${fmtNum(n)} MAD`;

const $ = id => document.getElementById(id);
const q = sel => document.querySelector(sel);

function esc(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function el(tag, attrs = {}, ...children) {
  const e = document.createElement(tag);
  for (const [k,v] of Object.entries(attrs)) {
    if (k === 'class') e.className = v;
    else if (k.startsWith('on')) e[k] = v;
    else e.setAttribute(k, v);
  }
  children.forEach(c => {
    if (typeof c === 'string') e.insertAdjacentHTML('beforeend', c);
    else if (c) e.appendChild(c);
  });
  return e;
}

/* ══════════════════════════════════════════════════════════
   3. TOAST SYSTEM
═════════════════════════════════════════════════════════════ */
const TOAST_ICONS = { success: 'fa-check-circle', error: 'fa-circle-xmark', warning: 'fa-triangle-exclamation', info: 'fa-circle-info' };

function showToast(msg, type = 'success', duration = 3500) {
  const wrap = $('toastContainer');
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = `<i class="fa-solid ${TOAST_ICONS[type] || TOAST_ICONS.info}"></i><span class="toast-msg">${esc(msg)}</span>`;
  wrap.appendChild(t);
  setTimeout(() => {
    t.style.animation = 'toastOut .3s ease forwards';
    setTimeout(() => t.remove(), 300);
  }, duration);
}

/* ══════════════════════════════════════════════════════════
   4. AUTH SYSTEM
═════════════════════════════════════════════════════════════ */
let currentUser = null;

const DEFAULT_ADMIN = {
  id: 'admin',
  username: 'Admin',
  name: 'Administrateur',
  password: 'mot$p@s',
  role: 'Administrateur',
  phone: '+212661777702',
  email: 'admin@gestrm.ma',
  permissions: { all: true },
  createdAt: now()
};

function initAuth() {
  // Ensure admin exists
  const users = DB.table('users');
  if (!users.find(u => u.id === 'admin')) {
    DB.insert('users', DEFAULT_ADMIN);
  }

  // Check session
  const session = sessionStorage.getItem('gestrm_session');
  if (session) {
    try {
      currentUser = JSON.parse(session);
      showApp();
    } catch { showLogin(); }
  } else {
    showLogin();
  }
}

function showLogin() { $('loginScreen').classList.remove('hidden'); $('appShell').classList.add('hidden'); }
function showApp()   { $('loginScreen').classList.add('hidden'); $('appShell').classList.remove('hidden'); initApp(); }

function doLogin() {
  const username = $('loginUsername').value.trim();
  const password = $('loginPassword').value;
  const users = DB.table('users');
  const user = users.find(u => u.username === username && u.password === password);
  if (user) {
    currentUser = user;
    sessionStorage.setItem('gestrm_session', JSON.stringify(user));
    logAction('Authentification', 'Connexion', `Utilisateur ${user.name} connecté`);
    $('loginError').classList.add('hidden');
    showApp();
  } else {
    $('loginError').textContent = 'Identifiants incorrects. Veuillez réessayer.';
    $('loginError').classList.remove('hidden');
  }
}

function doLogout() {
  logAction('Authentification', 'Déconnexion', `Utilisateur ${currentUser?.name} déconnecté`);
  currentUser = null;
  sessionStorage.removeItem('gestrm_session');
  showLogin();
  $('loginUsername').value = ''; $('loginPassword').value = '';
}

function togglePass() {
  const inp = $('loginPassword');
  const icon = $('eyeIcon');
  if (inp.type === 'password') { inp.type = 'text'; icon.className = 'fa-solid fa-eye-slash'; }
  else { inp.type = 'password'; icon.className = 'fa-solid fa-eye'; }
}

function hasPermission(perm) {
  if (!currentUser) return false;
  if (currentUser.permissions?.all || currentUser.role === 'Administrateur') return true;
  return !!currentUser.permissions?.[perm];
}

/* ══════════════════════════════════════════════════════════
   5. NAVIGATION
═════════════════════════════════════════════════════════════ */
const PAGE_TITLES = {
  dashboard: 'Dashboard', products: 'Produits & Stock',
  scanner: 'Scanner Code Barre', 'stock-movements': 'Mouvements de Stock',
  clients: 'Clients', quotes: 'Devis',
  'delivery-notes': 'Bons de Livraison',
  invoices: 'Factures', payments: 'Règlements',
  returns: 'Retours Produits', users: 'Utilisateurs',
  history: 'Historique & Traçabilité', backup: 'Sauvegarde & Données'
};

let currentPage = 'dashboard';

function navigateTo(page) {
  // Hide all pages
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  // Deactivate nav items
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  const pg = $(`page-${page}`);
  if (!pg) return;
  pg.classList.add('active');

  const navItem = document.querySelector(`[data-page="${page}"]`);
  if (navItem) navItem.classList.add('active');

  $('pageTitle').textContent = PAGE_TITLES[page] || page;
  currentPage = page;

  // On mobile, close sidebar
  if (window.innerWidth <= 768) closeMobileSidebar();

  // Refresh page content
  const renderers = {
    dashboard: renderDashboard,
    products: renderProducts,
    'stock-movements': renderMovements,
    clients: renderClients,
    quotes: renderQuotes,
    'delivery-notes': renderDeliveryNotes,
    invoices: renderInvoices,
    payments: renderPayments,
    returns: renderReturns,
    users: renderUsers,
    history: renderHistory,
    backup: renderBackup
  };
  if (renderers[page]) renderers[page]();

  // Close notification panel
  $('notifPanel').classList.add('hidden');
}

function toggleSidebar() {
  const sb = $('sidebar');
  if (window.innerWidth <= 768) sb.classList.toggle('mobile-open');
  else sb.classList.toggle('collapsed');
}
function closeMobileSidebar() { $('sidebar').classList.remove('mobile-open'); }

/* ══════════════════════════════════════════════════════════
   6. APP INITIALISATION
═════════════════════════════════════════════════════════════ */
function initApp() {
  renderSidebarUser();
  renderTopbarAvatar();
  navigateTo('dashboard');
  checkAlerts();
  initKeyboardShortcuts();
  // Auto-save reminder every 5 min
  setInterval(() => { DB.save(); }, 5 * 60 * 1000);
  // Masquer la section Administration entière pour les non-admins
  if (currentUser && currentUser.role !== 'Administrateur') {
    // Cacher bouton ajout utilisateur
    var wrapU = $('addUserBtnWrap');
    if (wrapU) wrapU.style.display = 'none';
    // Cacher TOUS les items nav de la section Administration
    ['users','history','backup'].forEach(function(pg) {
      var el = document.querySelector('[data-page="'+pg+'"]');
      if (el) el.style.display = 'none';
    });
    // Cacher le label "Administration" dans la sidebar
    var navSections = document.querySelectorAll('.nav-label');
    navSections.forEach(function(lbl) {
      if (lbl.textContent.trim() === 'Administration') {
        lbl.style.display = 'none';
      }
    });
  }
}

function renderSidebarUser() {
  const u = currentUser;
  if (!u) return;
  $('sidebarUser').innerHTML = `
    <div class="sidebar-user-inner">
      <div class="avatar">${u.name?.charAt(0).toUpperCase() || 'U'}</div>
      <div class="user-info">
        <div class="user-name">${esc(u.name)}</div>
        <div class="user-role">${esc(u.role)}</div>
      </div>
    </div>`;
}

function renderTopbarAvatar() {
  const u = currentUser;
  if (!u) return;
  $('topbarAvatar').textContent = u.name?.charAt(0).toUpperCase() || 'U';
  $('topbarAvatar').title = u.name;
}

/* ══════════════════════════════════════════════════════════
   7. NOTIFICATIONS & ALERTS
═════════════════════════════════════════════════════════════ */
const notifications = [];

function addNotification(msg, type = 'info') {
  notifications.unshift({ msg, type, time: now() });
  if (notifications.length > 50) notifications.pop();
  updateNotifBadge();
}

function updateNotifBadge() {
  $('notifBadge').textContent = Math.min(notifications.length, 99);
  $('notifBadge').style.display = notifications.length ? 'flex' : 'none';
}

function toggleNotifications() {
  const panel = $('notifPanel');
  panel.classList.toggle('hidden');
  if (!panel.classList.contains('hidden')) renderNotifications();
}

function renderNotifications() {
  const list = $('notifList');
  if (!notifications.length) { list.innerHTML = '<div style="padding:1rem;text-align:center;color:var(--text-3)">Aucune notification</div>'; return; }
  list.innerHTML = notifications.slice(0,20).map(n => `
    <div class="notif-item ${n.type}">
      <div class="notif-msg">${esc(n.msg)}</div>
      <div class="notif-time">${fmtDT(n.time)}</div>
    </div>`).join('');
}

function clearNotifications() { notifications.length = 0; updateNotifBadge(); $('notifPanel').classList.add('hidden'); }

function checkAlerts() {
  const products = DB.table('products');
  const today = new Date();
  const in30 = new Date(); in30.setDate(today.getDate() + 30);

  products.forEach(p => {
    if (p.stock <= (p.stockMin || 5)) addNotification(`Stock faible: ${p.name} (${p.stock} ${p.unit || 'u'})`, 'warning');
    if (p.expiration && new Date(p.expiration) <= in30 && new Date(p.expiration) >= today)
      addNotification(`Expiration proche: ${p.name} le ${fmtDate(p.expiration)}`, 'warning');
    if (p.expiration && new Date(p.expiration) < today)
      addNotification(`Produit expiré: ${p.name}`, 'danger');
  });
}

/* ══════════════════════════════════════════════════════════
   8. GLOBAL SEARCH
═════════════════════════════════════════════════════════════ */
function globalSearchFn(query) {
  const box = $('searchResults');
  if (!box) return;
  if (!query || query.length < 2) { box.innerHTML = ''; box.classList.add('hidden'); return; }
  box.classList.remove('hidden');
  const q = query.toLowerCase();
  const results = [];

  DB.table('products').filter(p => p.name?.toLowerCase().includes(q) || p.barcode?.includes(q))
    .slice(0,4).forEach(p => results.push({ label: p.name, sub: `Stock: ${p.stock} | ${p.category || ''}`, page: 'products' }));
  DB.table('clients').filter(c => c.company?.toLowerCase().includes(q) || c.manager?.toLowerCase().includes(q))
    .slice(0,3).forEach(c => results.push({ label: c.company, sub: c.phone || '', page: 'clients' }));
  DB.table('invoices').filter(i => i.number?.toLowerCase().includes(q))
    .slice(0,3).forEach(i => results.push({ label: `Facture ${i.number}`, sub: MAD(i.total), page: 'invoices' }));

  if (!results.length) { box.innerHTML = '<div class="search-result-item" style="color:var(--text-3)">Aucun résultat</div>'; return; }
  box.innerHTML = results.map(r => `
    <div class="search-result-item" onclick="navigateTo('${r.page}');this.parentElement.innerHTML='';this.parentElement.classList.add('hidden')">
      <div class="sr-label">${esc(r.label)}</div>
      <div class="sr-sub">${esc(r.sub)}</div>
    </div>`).join('');
}

/* ══════════════════════════════════════════════════════════
   9. DASHBOARD
═════════════════════════════════════════════════════════════ */
let chartSales = null, chartStock = null;

function renderDashboard() {
  const invoices  = DB.table('invoices');
  const products  = DB.table('products');
  const clients   = DB.table('clients');
  const payments  = DB.table('payments');

  const todayStr = new Date().toDateString();
  const thisMonth = new Date().getMonth();
  const thisYear  = new Date().getFullYear();

  const todaySales = invoices
    .filter(i => new Date(i.createdAt).toDateString() === todayStr)
    .reduce((s, i) => s + (i.total || 0), 0);
  const monthSales = invoices
    .filter(i => { const d = new Date(i.createdAt); return d.getMonth() === thisMonth && d.getFullYear() === thisYear; })
    .reduce((s, i) => s + (i.total || 0), 0);
  const totalCA = invoices.reduce((s, i) => s + (i.total || 0), 0);
  const totalProfit = invoices.reduce((s, i) => s + (i.profit || 0), 0);
  const lowStock = products.filter(p => p.stock <= (p.stockMin || 5)).length;
  const expired  = products.filter(p => p.expiration && new Date(p.expiration) < new Date()).length;
  const unpaid   = invoices.reduce((s, i) => s + (i.remaining || 0), 0);

  const stats = [
    { icon: 'fa-chart-line',   color: 'green',  label: "Chiffre d'Affaires Total", value: MAD(totalCA) },
    { icon: 'fa-calendar-day', color: 'blue',   label: "Ventes du Jour",            value: MAD(todaySales) },
    { icon: 'fa-calendar',     color: 'teal',   label: "Ventes du Mois",            value: MAD(monthSales) },
    { icon: 'fa-coins',        color: 'orange', label: "Bénéfice Estimé",           value: MAD(totalProfit) },
    { icon: 'fa-boxes-stacked',color: 'purple', label: "Total Produits",            value: products.length },
    { icon: 'fa-triangle-exclamation', color: 'red', label: "Stock Faible",         value: lowStock },
    { icon: 'fa-users',        color: 'blue',   label: "Clients",                   value: clients.length },
    { icon: 'fa-clock',        color: 'red',    label: "Impayés",                   value: MAD(unpaid) }
  ];

  $('statsGrid').innerHTML = stats.map(s => `
    <div class="stat-card">
      <div class="stat-icon ${s.color}"><i class="fa-solid ${s.icon}"></i></div>
      <div class="stat-body">
        <div class="stat-value">${esc(String(s.value))}</div>
        <div class="stat-label">${esc(s.label)}</div>
      </div>
    </div>`).join('');

  renderSalesChart(invoices);
  renderStockChart(products);
  renderTopClients(invoices, clients);
  renderTopProducts(invoices, products);
  renderAlerts(products);
}

function renderSalesChart(invoices) {
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(); d.setMonth(d.getMonth() - 5 + i);
    return { label: d.toLocaleDateString('fr-MA', { month: 'short' }), month: d.getMonth(), year: d.getFullYear() };
  });
  const data = months.map(m => invoices
    .filter(i => { const d = new Date(i.createdAt); return d.getMonth() === m.month && d.getFullYear() === m.year; })
    .reduce((s, i) => s + (i.total || 0), 0));

  const ctx = $('chartSales').getContext('2d');
  if (chartSales) chartSales.destroy();
  chartSales = new Chart(ctx, {
    type: 'bar',
    data: { labels: months.map(m => m.label), datasets: [{ label: 'Ventes (MAD)', data, backgroundColor: 'rgba(22,163,74,.7)', borderRadius: 6 }] },
    options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,.05)' } } } }
  });
}

function renderStockChart(products) {
  const cats = {};
  products.forEach(p => { cats[p.category || 'Autre'] = (cats[p.category || 'Autre'] || 0) + 1; });
  const labels = Object.keys(cats), data = Object.values(cats);
  const colors = ['#16a34a','#3b82f6','#f59e0b','#8b5cf6','#ef4444','#0d9488','#ec4899'];

  const ctx = $('chartStock').getContext('2d');
  if (chartStock) chartStock.destroy();
  chartStock = new Chart(ctx, {
    type: 'doughnut',
    data: { labels, datasets: [{ data, backgroundColor: colors }] },
    options: { responsive: true, plugins: { legend: { position: 'bottom', labels: { font: { size: 11 } } } } }
  });
}

function renderTopClients(invoices, clients) {
  const totals = {};
  invoices.forEach(i => { totals[i.clientId] = (totals[i.clientId] || 0) + (i.total || 0); });
  const sorted = Object.entries(totals).sort((a,b) => b[1]-a[1]).slice(0,5);
  $('topClientsList').innerHTML = sorted.length ? sorted.map(([id, val]) => {
    const c = clients.find(c => c.id === id);
    return `<div class="rank-item"><span class="rank-name">${esc(c?.company || id)}</span><span class="rank-val">${MAD(val)}</span></div>`;
  }).join('') : '<div class="empty-state" style="padding:1rem"><i class="fa-solid fa-users"></i><p>Aucune donnée</p></div>';
}

function renderTopProducts(invoices, products) {
  const qtys = {};
  invoices.forEach(i => (i.lines || []).forEach(l => { qtys[l.productId] = (qtys[l.productId] || 0) + (l.qty || 0); }));
  const sorted = Object.entries(qtys).sort((a,b) => b[1]-a[1]).slice(0,5);
  $('topProductsList').innerHTML = sorted.length ? sorted.map(([id, qty]) => {
    const p = products.find(p => p.id === id);
    return `<div class="rank-item"><span class="rank-name">${esc(p?.name || id)}</span><span class="rank-val">${qty} u.</span></div>`;
  }).join('') : '<div class="empty-state" style="padding:1rem"><i class="fa-solid fa-box"></i><p>Aucune donnée</p></div>';
}

function renderAlerts(products) {
  const today = new Date(); const in30 = new Date(); in30.setDate(today.getDate() + 30);
  const alerts = [];
  products.forEach(p => {
    if (p.stock === 0) alerts.push({ type:'danger', icon:'fa-ban', msg:`Rupture: ${p.name}` });
    else if (p.stock <= (p.stockMin || 5)) alerts.push({ type:'warning', icon:'fa-triangle-exclamation', msg:`Stock faible: ${p.name} (${p.stock})` });
    if (p.expiration && new Date(p.expiration) < today) alerts.push({ type:'danger', icon:'fa-skull-crossbones', msg:`Expiré: ${p.name}` });
    else if (p.expiration && new Date(p.expiration) <= in30) alerts.push({ type:'warning', icon:'fa-clock', msg:`Expire bientôt: ${p.name}` });
  });
  $('alertsList').innerHTML = alerts.length
    ? alerts.slice(0,8).map(a => `<div class="alert-item ${a.type}"><i class="fa-solid ${a.icon}"></i><span>${esc(a.msg)}</span></div>`).join('')
    : '<div class="empty-state" style="padding:1rem"><i class="fa-solid fa-check-circle" style="color:var(--green-500)"></i><p>Aucune alerte</p></div>';
}

/* ══════════════════════════════════════════════════════════
   10. PRODUCTS MODULE
═════════════════════════════════════════════════════════════ */
const TYPOLOGIES = ['Phytosanitaire','Engrais','Irrigation','Plastique serre','Ficelle','Goutteurs','Accessoires agricoles'];
const UNITS = ['kg','g','L','ml','T','Pièce','Rouleau','Sac','Boîte','Carton'];

let productPage = 1; const PROD_PER_PAGE = 15;

function getFilteredProducts() {
  const search = $('productSearch')?.value.toLowerCase() || '';
  const cat    = $('productCatFilter')?.value || '';
  const stk    = $('productStockFilter')?.value || '';
  const today  = new Date(); const in30 = new Date(); in30.setDate(today.getDate()+30);

  return DB.table('products').filter(p => {
    if (search && !p.name?.toLowerCase().includes(search) && !p.barcode?.includes(search)) return false;
    if (cat && p.category !== cat) return false;
    if (stk === 'low' && p.stock > (p.stockMin || 5)) return false;
    if (stk === 'out' && p.stock > 0) return false;
    if (stk === 'expire' && (!p.expiration || new Date(p.expiration) > in30)) return false;
    return true;
  });
}

function filterProducts() { productPage = 1; renderProducts(); }

function renderProducts() {
  const filtered = getFilteredProducts();
  const total = filtered.length;
  const pages = Math.max(1, Math.ceil(total / PROD_PER_PAGE));
  if (productPage > pages) productPage = pages;
  const slice = filtered.slice((productPage-1)*PROD_PER_PAGE, productPage*PROD_PER_PAGE);

  const tbody = $('productsBody');
  if (!slice.length) {
    tbody.innerHTML = `<tr><td colspan="9"><div class="empty-state"><i class="fa-solid fa-boxes-stacked"></i><p>Aucun produit trouvé</p></div></td></tr>`;
  } else {
    const today = new Date(); const in30 = new Date(); in30.setDate(today.getDate()+30);
    tbody.innerHTML = slice.map(p => {
      const pct = p.stockMax ? Math.min(100, (p.stock/(p.stockMax||100))*100) : null;
      const barClass = p.stock === 0 ? 'critical' : p.stock <= (p.stockMin||5) ? 'low' : '';
      const expBadge = !p.expiration ? '' : new Date(p.expiration) < today
        ? `<span class="badge badge-red">Expiré</span>`
        : new Date(p.expiration) <= in30 ? `<span class="badge badge-yellow">Bientôt</span>` : '';
      return `<tr>
        <td><div class="prod-thumb" style="background:var(--bg3)">${p.photo ? `<img src="${p.photo}" style="width:36px;height:36px;border-radius:8px;object-fit:cover">` : '<i class="fa-solid fa-seedling"></i>'}</div></td>
        <td><code style="font-size:.78rem;background:var(--bg3);padding:.2rem .4rem;border-radius:4px">${esc(p.barcode||p.id.slice(-6))}</code></td>
        <td><strong>${esc(p.name)}</strong>${p.brand ? `<br><span style="font-size:.75rem;color:var(--text-3)">${esc(p.brand)}</span>` : ''}</td>
        <td><span class="badge badge-green">${esc(p.category||'—')}</span></td>
        <td>
          <div style="display:flex;align-items:center;gap:.5rem">
            <strong>${p.stock}</strong><span style="font-size:.75rem;color:var(--text-3)">${esc(p.unit||'')}</span>
            ${pct!==null ? `<div class="stock-bar-wrap"><div class="stock-bar ${barClass}" style="width:${pct}%"></div></div>` : ''}
          </div>
        </td>
        <td><strong>${MAD(p.salePrice)}</strong></td>
        <td>${esc(p.lot||'—')}</td>
        <td>${expBadge || fmtDate(p.expiration)}</td>
        <td>
          <div class="actions">
            <button class="btn-icon edit" title="Modifier" onclick="openProductModal('${p.id}')"><i class="fa-solid fa-pen"></i></button>
            <button class="btn-icon" title="Entrée stock" onclick="openStockMvtModal('in','${p.id}')"><i class="fa-solid fa-arrow-down" style="color:var(--green-500)"></i></button>
            <button class="btn-icon" title="Sortie stock" onclick="openStockMvtModal('out','${p.id}')"><i class="fa-solid fa-arrow-up" style="color:var(--warning)"></i></button>
            <button class="btn-icon" title="Fiche PDF" onclick="printProductPDF('${p.id}')"><i class="fa-solid fa-print"></i></button>
            <button class="btn-icon delete" title="Supprimer" onclick="deleteProduct('${p.id}')"><i class="fa-solid fa-trash"></i></button>
          </div>
        </td>
      </tr>`;
    }).join('');
  }
  renderPagination('productsPagination', productPage, pages, pg => { productPage = pg; renderProducts(); });
}

function openProductModal(id) {
  id = id || null;
  var p = id ? DB.find('products', id) : null;
  openModal(id ? 'Modifier Produit' : 'Nouveau Produit', buildProductForm(p || {}), [
    { label: 'Annuler', class: 'btn-secondary', onclick: 'closeModalById("modalOverlay")' },
    { label: id ? 'Enregistrer' : 'Créer', class: 'btn-primary', onclick: 'saveProduct("' + (id||'') + '")' }
  ]);
  if (p && p.photo) {
    var prev = $('prodPhotoPreview');
    if (prev) { prev.src = p.photo; prev.style.display = 'block'; }
  }
}

function buildProductForm(p = {}) {
  return `
  <div class="form-grid">
    <div class="form-group-modal full"><div class="section-divider">Informations Générales</div></div>
    <div class="form-group-modal">
      <label>Nom du produit *</label>
      <input id="fName" value="${esc(p.name||'')}" placeholder="Ex: Herbicide Total">
    </div>
    <div class="form-group-modal">
      <label>Code barre</label>
      <input id="fBarcode" value="${esc(p.barcode||'')}" placeholder="Scan ou saisie manuelle">
    </div>
    <div class="form-group-modal">
      <label>Catégorie / Typologie</label>
      <select id="fCategory">${TYPOLOGIES.map(t=>`<option ${p.category===t?'selected':''}>${t}</option>`).join('')}</select>
    </div>
    <div class="form-group-modal">
      <label>Marque</label>
      <input id="fBrand" value="${esc(p.brand||'')}" placeholder="Ex: Bayer">
    </div>
    <div class="form-group-modal">
      <label>Fournisseur</label>
      <input id="fSupplier" value="${esc(p.supplier||'')}" placeholder="Nom du fournisseur">
    </div>
    <div class="form-group-modal">
      <label>Unité</label>
      <select id="fUnit">${UNITS.map(u=>`<option ${p.unit===u?'selected':''}>${u}</option>`).join('')}</select>
    </div>

    <div class="form-group-modal full"><div class="section-divider">Lot & Expiration</div></div>
    <div class="form-group-modal">
      <label>Numéro de lot</label>
      <input id="fLot" value="${esc(p.lot||'')}" placeholder="Ex: LOT-2024-001">
    </div>
    <div class="form-group-modal">
      <label>Date expiration</label>
      <input id="fExpiration" type="date" value="${p.expiration?p.expiration.slice(0,10):''}">
    </div>

    <div class="form-group-modal full"><div class="section-divider">Prix</div></div>
    <div class="form-group-modal">
      <label>Prix d'achat (MAD)</label>
      <input id="fCostPrice" type="number" step="0.01" value="${p.costPrice||''}" placeholder="0.00">
    </div>
    <div class="form-group-modal">
      <label>Prix de vente (MAD) *</label>
      <input id="fSalePrice" type="number" step="0.01" value="${p.salePrice||''}" placeholder="0.00">
    </div>
    <div class="form-group-modal">
      <label>TVA (%)</label>
      <select id="fTva"><option value="0" ${p.tva==0?'selected':''}>0%</option><option value="7" ${p.tva==7?'selected':''}>7%</option><option value="10" ${p.tva==10?'selected':''}>10%</option><option value="14" ${p.tva==14?'selected':''}>14%</option><option value="20" ${p.tva==20?'selected':''}>20%</option></select>
    </div>

    <div class="form-group-modal full"><div class="section-divider">Stock</div></div>
    <div class="form-group-modal">
      <label>Stock actuel</label>
      <input id="fStock" type="number" value="${p.stock||0}" placeholder="0">
    </div>
    <div class="form-group-modal">
      <label>Stock minimum (alerte)</label>
      <input id="fStockMin" type="number" value="${p.stockMin||5}" placeholder="5">
    </div>
    <div class="form-group-modal">
      <label>Stock maximum</label>
      <input id="fStockMax" type="number" value="${p.stockMax||''}" placeholder="Optionnel">
    </div>

    <div class="form-group-modal full"><div class="section-divider">Description</div></div>
    <div class="form-group-modal full">
      <label>Description</label>
      <textarea id="fDesc" rows="2">${esc(p.description||'')}</textarea>
    </div>
    <div class="form-group-modal full">
      <label>Photo produit (URL ou base64)</label>
      <input id="fPhoto" type="text" value="${esc(p.photo||'')}" placeholder="URL de l'image" oninput="previewPhoto(this.value)">
      <img id="prodPhotoPreview" src="" style="display:none;max-height:80px;margin-top:.5rem;border-radius:6px;">
    </div>
  </div>`;
}

function previewPhoto(url) {
  const img = $('prodPhotoPreview');
  if (url) { img.src = url; img.style.display = 'block'; } else img.style.display = 'none';
}

function saveProduct(id) {
  const name = $('fName')?.value.trim();
  if (!name) return showToast('Nom du produit requis', 'error');
  const salePrice = parseFloat($('fSalePrice')?.value||0);
  if (!salePrice) return showToast('Prix de vente requis', 'error');

  const data = {
    name, barcode: $('fBarcode')?.value.trim(),
    category: $('fCategory')?.value, brand: $('fBrand')?.value.trim(),
    supplier: $('fSupplier')?.value.trim(), unit: $('fUnit')?.value,
    lot: $('fLot')?.value.trim(), expiration: $('fExpiration')?.value || null,
    costPrice: parseFloat($('fCostPrice')?.value||0), salePrice,
    tva: parseFloat($('fTva')?.value||0),
    stock: parseInt($('fStock')?.value||0), stockMin: parseInt($('fStockMin')?.value||5),
    stockMax: parseInt($('fStockMax')?.value||0) || null,
    description: $('fDesc')?.value.trim(), photo: $('fPhoto')?.value.trim()
  };

  if (id) {
    DB.update('products', id, data);
    logAction('Produits', 'Modification', `Produit "${name}" modifié`);
    showToast(`Produit "${name}" mis à jour`);
  } else {
    DB.insert('products', data);
    logAction('Produits', 'Création', `Produit "${name}" créé`);
    showToast(`Produit "${name}" créé avec succès`);
  }
  closeModalById('modalOverlay');
  renderProducts();
}

function deleteProduct(id) {
  const p = DB.find('products', id);
  if (!p) return;
  confirm2(`Supprimer le produit "${p.name}" ?`, () => {
    DB.delete('products', id);
    logAction('Produits', 'Suppression', `Produit "${p.name}" supprimé`);
    showToast(`Produit supprimé`, 'warning');
    renderProducts();
  });
}

function exportProductsExcel() {
  const rows = DB.table('products').map(p => ({
    Nom: p.name, Catégorie: p.category, Marque: p.brand, Fournisseur: p.supplier,
    Lot: p.lot, Expiration: fmtDate(p.expiration), 'Stock actuel': p.stock,
    Unité: p.unit, 'Prix achat': p.costPrice, 'Prix vente': p.salePrice, TVA: `${p.tva}%`
  }));
  exportToExcel(rows, 'Produits_SOUSS-PHYTO');
}

/* ══════════════════════════════════════════════════════════
   11. STOCK MOVEMENTS
═════════════════════════════════════════════════════════════ */
let mvtPage = 1; const MVT_PER_PAGE = 20;

function getFilteredMovements() {
  const search = $('mvtSearch')?.value.toLowerCase() || '';
  const type   = $('mvtTypeFilter')?.value || '';
  const date   = $('mvtDateFilter')?.value || '';
  return DB.table('stockMovements').filter(m => {
    if (type && m.type !== type) return false;
    if (date && !m.date?.startsWith(date)) return false;
    if (search) {
      const p = DB.find('products', m.productId);
      if (!p?.name?.toLowerCase().includes(search)) return false;
    }
    return true;
  }).sort((a,b) => new Date(b.date) - new Date(a.date));
}

function filterMovements() { mvtPage = 1; renderMovements(); }

function renderMovements() {
  const filtered = getFilteredMovements();
  const pages = Math.max(1, Math.ceil(filtered.length / MVT_PER_PAGE));
  const slice = filtered.slice((mvtPage-1)*MVT_PER_PAGE, mvtPage*MVT_PER_PAGE);
  const tbody = $('movementsBody');

  if (!slice.length) { tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><i class="fa-solid fa-arrow-right-arrow-left"></i><p>Aucun mouvement</p></div></td></tr>`; }
  else {
    tbody.innerHTML = slice.map(m => {
      const p = DB.find('products', m.productId);
      const typeBadge = m.type === 'in'
        ? '<span class="badge badge-green"><i class="fa-solid fa-arrow-down"></i> Entrée</span>'
        : m.type === 'return'
          ? '<span class="badge badge-blue"><i class="fa-solid fa-rotate-left"></i> Retour</span>'
          : '<span class="badge badge-red"><i class="fa-solid fa-arrow-up"></i> Sortie</span>';
      return `<tr>
        <td>${fmtDT(m.date)}</td>
        <td>${typeBadge}</td>
        <td><strong>${esc(p?.name||m.productId)}</strong></td>
        <td><strong>${m.type==='out'?'-':'+'} ${m.qty}</strong></td>
        <td>${esc(m.lot||'—')}</td>
        <td>${esc(m.user||'—')}</td>
        <td>${esc(m.reason||'—')}</td>
      </tr>`;
    }).join('');
  }
  renderPagination('movementsPagination', mvtPage, pages, pg => { mvtPage = pg; renderMovements(); });
}

function openStockMvtModal(type, productId = '') {
  const products = DB.table('products');
  const title = type === 'in' ? 'Entrée Stock' : 'Sortie Stock';
  const body = `
  <div class="form-grid">
    <div class="form-group-modal full">
      <label>Produit *</label>
      <select id="mvtProduct">
        <option value="">-- Sélectionner --</option>
        ${products.map(p => `<option value="${p.id}" ${p.id===productId?'selected':''}>${esc(p.name)} (stock: ${p.stock})</option>`).join('')}
      </select>
    </div>
    <div class="form-group-modal">
      <label>Quantité *</label>
      <input id="mvtQty" type="number" min="1" value="1">
    </div>
    <div class="form-group-modal">
      <label>Numéro de lot</label>
      <input id="mvtLot" placeholder="Optionnel">
    </div>
    <div class="form-group-modal full">
      <label>Motif / Remarque</label>
      <input id="mvtReason" placeholder="${type==='in'?'Achat, réception...':'Vente, perte...'}" >
    </div>
  </div>`;
  openModal(title, body, [
    { label: 'Annuler', class: 'btn-secondary', onclick: 'closeModalById("modalOverlay")' },
    { label: type === 'in' ? 'Entrée' : 'Sortie', class: type === 'in' ? 'btn-primary' : 'btn-danger', onclick: `saveStockMvt('${type}')` }
  ]);
}

function saveStockMvt(type) {
  const productId = $('mvtProduct')?.value;
  const qty = parseInt($('mvtQty')?.value || 0);
  if (!productId) return showToast('Sélectionnez un produit', 'error');
  if (!qty || qty <= 0) return showToast('Quantité invalide', 'error');

  const p = DB.find('products', productId);
  if (!p) return;
  if (type === 'out' && p.stock < qty) return showToast('Stock insuffisant', 'error');

  const newStock = type === 'in' ? p.stock + qty : p.stock - qty;
  DB.update('products', productId, { stock: newStock });

  DB.insert('stockMovements', {
    type, productId, qty, lot: $('mvtLot')?.value.trim(),
    reason: $('mvtReason')?.value.trim(),
    date: now(), user: currentUser?.name
  });

  logAction('Stock', type === 'in' ? 'Entrée' : 'Sortie', `${p.name}: ${type==='in'?'+':'-'}${qty} → stock ${newStock}`);
  showToast(`${type==='in'?'Entrée':'Sortie'} enregistrée. Nouveau stock: ${newStock}`);
  closeModalById('modalOverlay');
  if (currentPage === 'stock-movements') renderMovements();
  if (currentPage === 'products') renderProducts();
}

/* ══════════════════════════════════════════════════════════
   12. SCANNER
═════════════════════════════════════════════════════════════ */
function searchByScan() {
  const query = $('scanInput')?.value.trim();
  if (!query) return showToast('Entrez un code ou ID', 'warning');

  const products = DB.table('products');
  const p = products.find(pr => pr.id === query || pr.barcode === query || pr.name?.toLowerCase() === query.toLowerCase());

  const result = $('scanResult');
  if (!p) {
    result.className = 'scan-result';
    result.innerHTML = `<div style="text-align:center;padding:1rem;color:var(--danger)"><i class="fa-solid fa-circle-xmark" style="font-size:2rem"></i><p style="margin-top:.5rem">Produit non trouvé</p></div>`;
    result.classList.remove('hidden');
    return;
  }

  const today = new Date();
  const expStatus = !p.expiration ? 'N/A' : new Date(p.expiration) < today ? '⚠️ Expiré' : fmtDate(p.expiration);
  const stockStatus = p.stock === 0 ? '🔴 Rupture' : p.stock <= (p.stockMin||5) ? '🟡 Faible' : '🟢 Disponible';

  result.className = 'scan-result';
  result.innerHTML = `
    <h3 style="font-size:1.1rem;margin-bottom:1rem">${esc(p.name)}</h3>
    <div class="scan-product-grid">
      <div class="scan-field"><label>Catégorie</label><span>${esc(p.category||'—')}</span></div>
      <div class="scan-field"><label>Marque</label><span>${esc(p.brand||'—')}</span></div>
      <div class="scan-field"><label>Stock</label><span>${p.stock} ${esc(p.unit||'')}</span></div>
      <div class="scan-field"><label>Statut</label><span>${stockStatus}</span></div>
      <div class="scan-field"><label>Prix vente</label><span>${MAD(p.salePrice)}</span></div>
      <div class="scan-field"><label>TVA</label><span>${p.tva}%</span></div>
      <div class="scan-field"><label>Lot</label><span>${esc(p.lot||'—')}</span></div>
      <div class="scan-field"><label>Expiration</label><span>${expStatus}</span></div>
      <div class="scan-field"><label>Fournisseur</label><span>${esc(p.supplier||'—')}</span></div>
      <div class="scan-field"><label>Description</label><span>${esc(p.description||'—')}</span></div>
    </div>
    <div style="margin-top:1rem;display:flex;gap:.6rem">
      <button class="btn-primary" onclick="openStockMvtModal('in','${p.id}')"><i class="fa-solid fa-arrow-down"></i> Entrée</button>
      <button class="btn-danger" onclick="openStockMvtModal('out','${p.id}')"><i class="fa-solid fa-arrow-up"></i> Sortie</button>
      <button class="btn-secondary" onclick="printProductPDF('${p.id}')"><i class="fa-solid fa-print"></i> Fiche</button>
    </div>`;
  result.classList.remove('hidden');
}

/* ══════════════════════════════════════════════════════════
   13. CLIENTS MODULE
═════════════════════════════════════════════════════════════ */
let clientPage = 1; const CLI_PER_PAGE = 15;

function getFilteredClients() {
  const search = $('clientSearch')?.value.toLowerCase() || '';
  return DB.table('clients').filter(c =>
    !search || c.company?.toLowerCase().includes(search) || c.manager?.toLowerCase().includes(search) || c.phone?.includes(search)
  );
}

function filterClients() { clientPage = 1; renderClients(); }

function renderClients() {
  const filtered = getFilteredClients();
  const pages = Math.max(1, Math.ceil(filtered.length / CLI_PER_PAGE));
  const slice = filtered.slice((clientPage-1)*CLI_PER_PAGE, clientPage*CLI_PER_PAGE);
  const tbody = $('clientsBody');

  if (!slice.length) { tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><i class="fa-solid fa-users"></i><p>Aucun client</p></div></td></tr>`; }
  else {
    tbody.innerHTML = slice.map(c => {
      const invoices = DB.table('invoices').filter(i => i.clientId === c.id);
      const totalCA = invoices.reduce((s,i)=>s+(i.total||0),0);
      const totalPaid = DB.table('payments').filter(p=>p.clientId===c.id).reduce((s,p)=>s+(p.amount||0),0);
      const balance = totalCA - totalPaid;
      return `<tr>
        <td><strong>${esc(c.company)}</strong></td>
        <td>${esc(c.manager||'—')}</td>
        <td>${esc(c.phone||'—')}</td>
        <td>${esc(c.city||'—')}</td>
        <td><code style="font-size:.78rem">${esc(c.ice||'—')}</code></td>
        <td>
          <span style="color:${balance>0?'var(--danger)':'var(--green-600)'};font-weight:700">${MAD(balance)}</span>
        </td>
        <td>
          <div class="actions">
            <button class="btn-icon edit" onclick="openClientModal('${c.id}')"><i class="fa-solid fa-pen"></i></button>
            <button class="btn-icon" onclick="viewClientHistory('${c.id}')" title="Historique"><i class="fa-solid fa-clock-rotate-left"></i></button>
            <button class="btn-icon delete" onclick="deleteClient('${c.id}')"><i class="fa-solid fa-trash"></i></button>
          </div>
        </td>
      </tr>`;
    }).join('');
  }
  renderPagination('clientsPagination', clientPage, pages, pg => { clientPage = pg; renderClients(); });
}

function openClientModal(id = null) {
  const c = id ? DB.find('clients', id) : null;
  const body = `
  <div class="form-grid">
    <div class="form-group-modal">
      <label>Société / Nom *</label>
      <input id="cCompany" value="${esc(c?.company||'')}" placeholder="Raison sociale">
    </div>
    <div class="form-group-modal">
      <label>Responsable</label>
      <input id="cManager" value="${esc(c?.manager||'')}" placeholder="Nom du responsable">
    </div>
    <div class="form-group-modal">
      <label>Téléphone</label>
      <input id="cPhone" value="${esc(c?.phone||'')}" placeholder="+212...">
    </div>
    <div class="form-group-modal">
      <label>Email</label>
      <input id="cEmail" type="email" value="${esc(c?.email||'')}" placeholder="email@example.com">
    </div>
    <div class="form-group-modal full">
      <label>Adresse</label>
      <input id="cAddress" value="${esc(c?.address||'')}" placeholder="Adresse complète">
    </div>
    <div class="form-group-modal">
      <label>Ville</label>
      <input id="cCity" value="${esc(c?.city||'')}" placeholder="Ville">
    </div>
    <div class="form-group-modal">
      <label>ICE</label>
      <input id="cIce" value="${esc(c?.ice||'')}" placeholder="ICE">
    </div>
    <div class="form-group-modal">
      <label>IF</label>
      <input id="cIf" value="${esc(c?.if_||'')}" placeholder="Identifiant Fiscal">
    </div>
    <div class="form-group-modal">
      <label>RC</label>
      <input id="cRc" value="${esc(c?.rc||'')}" placeholder="Registre de Commerce">
    </div>
    <div class="form-group-modal">
      <label>RIB / IBAN Bancaire</label>
      <input id="cRib" value="${esc(c?.rib||'')}" placeholder="Ex: 007 780 0001234567890001 26">
    </div>
    <div class="form-group-modal">
      <label>Banque</label>
      <input id="cBank" value="${esc(c?.bank||'')}" placeholder="Ex: Attijariwafa, CIH, BMCE...">
    </div>
    <div class="form-group-modal">
      <label>Remise par défaut (%)</label>
      <input id="cDiscount" type="number" value="${c?.discount||0}" min="0" max="100">
    </div>
  </div>`;
  openModal(id ? 'Modifier Client' : 'Nouveau Client', body, [
    { label: 'Annuler', class: 'btn-secondary', onclick: 'closeModalById("modalOverlay")' },
    { label: id ? 'Enregistrer' : 'Créer', class: 'btn-primary', onclick: `saveClient('${id||''}')` }
  ]);
}

function saveClient(id) {
  const company = $('cCompany')?.value.trim();
  if (!company) return showToast('Nom société requis', 'error');
  const data = {
    company, manager: $('cManager')?.value.trim(), phone: $('cPhone')?.value.trim(),
    email: $('cEmail')?.value.trim(), address: $('cAddress')?.value.trim(),
    city: $('cCity')?.value.trim(), ice: $('cIce')?.value.trim(),
    if_: $('cIf')?.value.trim(), rc: $('cRc')?.value.trim(),
    rib: $('cRib')?.value.trim(), bank: $('cBank')?.value.trim(),
    discount: parseFloat($('cDiscount')?.value||0)
  };
  if (id) { DB.update('clients', id, data); showToast('Client mis à jour'); }
  else { DB.insert('clients', data); showToast('Client créé'); }
  logAction('Clients', id ? 'Modification':'Création', `Client "${company}"`);
  closeModalById('modalOverlay');
  renderClients();
}

function deleteClient(id) {
  const c = DB.find('clients', id);
  confirm2(`Supprimer le client "${c?.company}" ?`, () => {
    DB.delete('clients', id);
    logAction('Clients', 'Suppression', `Client "${c?.company}"`);
    showToast('Client supprimé', 'warning');
    renderClients();
  });
}

function viewClientHistory(clientId) {
  const c = DB.find('clients', clientId);
  const invoices = DB.table('invoices').filter(i => i.clientId === clientId);
  const payments = DB.table('payments').filter(p => p.clientId === clientId);
  const totalCA = invoices.reduce((s,i)=>s+(i.total||0),0);
  const totalPaid = payments.reduce((s,p)=>s+(p.amount||0),0);
  const body = `
    <div style="display:flex;gap:1rem;margin-bottom:1rem">
      <div style="flex:1;background:var(--bg3);border-radius:8px;padding:.8rem;text-align:center">
        <div style="font-size:1.3rem;font-weight:800;color:var(--primary)">${MAD(totalCA)}</div>
        <div style="font-size:.78rem;color:var(--text-3)">Chiffre d'Affaires</div>
      </div>
      <div style="flex:1;background:var(--bg3);border-radius:8px;padding:.8rem;text-align:center">
        <div style="font-size:1.3rem;font-weight:800;color:var(--green-600)">${MAD(totalPaid)}</div>
        <div style="font-size:.78rem;color:var(--text-3)">Total Payé</div>
      </div>
      <div style="flex:1;background:var(--bg3);border-radius:8px;padding:.8rem;text-align:center">
        <div style="font-size:1.3rem;font-weight:800;color:var(--danger)">${MAD(totalCA-totalPaid)}</div>
        <div style="font-size:.78rem;color:var(--text-3)">Solde Dû</div>
      </div>
    </div>
    <h4 style="margin-bottom:.5rem">Factures (${invoices.length})</h4>
    <div style="max-height:200px;overflow-y:auto">
      ${invoices.map(i=>`<div style="display:flex;justify-content:space-between;padding:.4rem 0;border-bottom:1px solid var(--border);font-size:.84rem">
        <span>${i.number} — ${fmtDate(i.createdAt)}</span>
        <span style="font-weight:700">${MAD(i.total)}</span>
      </div>`).join('')||'<p style="color:var(--text-3);font-size:.84rem">Aucune facture</p>'}
    </div>`;
  openModal(`Historique — ${c?.company}`, body, [{ label:'Fermer', class:'btn-secondary', onclick:'closeModalById("modalOverlay")' }]);
}

function exportClientsExcel() {
  const rows = DB.table('clients').map(c => ({
    Société: c.company, Responsable: c.manager, Téléphone: c.phone,
    Email: c.email, Adresse: c.address, Ville: c.city,
    ICE: c.ice, IF: c.if_, RC: c.rc
  }));
  exportToExcel(rows, 'Clients_SOUSS-PHYTO');
}

/* ══════════════════════════════════════════════════════════
   14. COMMERCIAL DOCUMENTS (QUOTES & INVOICES)
═════════════════════════════════════════════════════════════ */
let quotePage = 1, invoicePage = 1; const DOC_PER_PAGE = 15;
let docLines = [];

function getDocNumber(type) {
  var prefix = type === 'quote' ? 'DEV' : type === 'delivery-note' ? 'BL' : 'FAC';
  var tableName = type === 'quote' ? 'quotes' : type === 'delivery-note' ? 'deliveryNotes' : 'invoices';
  var count = DB.table(tableName).length + 1;
  return prefix + '-' + new Date().getFullYear() + '-' + String(count).padStart(4,'0');
}

function filterQuotes() { quotePage = 1; renderQuotes(); }
function filterInvoices() { invoicePage = 1; renderInvoices(); }

function renderQuotes() {
  const search = $('quoteSearch')?.value.toLowerCase()||'';
  const status = $('quoteStatusFilter')?.value||'';
  const clients = DB.table('clients');
  const filtered = DB.table('quotes').filter(q => {
    const c = clients.find(c=>c.id===q.clientId);
    if (search && !q.number?.toLowerCase().includes(search) && !c?.company?.toLowerCase().includes(search)) return false;
    if (status && q.status !== status) return false;
    return true;
  }).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));

  const pages = Math.max(1, Math.ceil(filtered.length/DOC_PER_PAGE));
  const slice = filtered.slice((quotePage-1)*DOC_PER_PAGE, quotePage*DOC_PER_PAGE);
  const tbody = $('quotesBody');

  if (!slice.length) { tbody.innerHTML=`<tr><td colspan="8"><div class="empty-state"><i class="fa-solid fa-file-lines"></i><p>Aucun devis</p></div></td></tr>`; }
  else {
    tbody.innerHTML = slice.map(q => {
      const c = clients.find(c=>c.id===q.clientId);
      const statusBadge = { draft:'<span class="badge badge-gray">Brouillon</span>', validated:'<span class="badge badge-blue">Validé</span>', invoiced:'<span class="badge badge-green">Facturé</span>' }[q.status] || '';
      return `<tr>
        <td><strong>${esc(q.number)}</strong></td>
        <td>${fmtDate(q.createdAt)}</td>
        <td>${esc(c?.company||'—')}</td>
        <td>${MAD(q.subtotal)}</td>
        <td>${MAD(q.taxAmount)}</td>
        <td><strong>${MAD(q.total)}</strong></td>
        <td>${statusBadge}</td>
        <td>
          <div class="actions">
            <button class="btn-icon edit" onclick="openDocModal('quote','${q.id}')"><i class="fa-solid fa-pen"></i></button>
            ${q.status==='draft'?`<button class="btn-icon" title="Valider" onclick="validateQuote('${q.id}')"><i class="fa-solid fa-check" style="color:var(--green-500)"></i></button>`:''}
            ${q.status==='validated'?`<button class="btn-icon" title="Convertir en facture" onclick="convertToInvoice('${q.id}')"><i class="fa-solid fa-file-invoice" style="color:var(--info)"></i></button>`:''}
            <button class="btn-icon" onclick="generateDocPDF('quote','${q.id}')"><i class="fa-solid fa-print"></i></button>
            <button class="btn-icon delete" onclick="deleteDoc('quote','${q.id}')"><i class="fa-solid fa-trash"></i></button>
          </div>
        </td>
      </tr>`;
    }).join('');
  }
  renderPagination('quotesPagination', quotePage, pages, pg=>{quotePage=pg;renderQuotes();});
}

function renderInvoices() {
  const search = $('invoiceSearch')?.value.toLowerCase()||'';
  const status = $('invoiceStatusFilter')?.value||'';
  const clients = DB.table('clients');
  const filtered = DB.table('invoices').filter(i => {
    const c = clients.find(c=>c.id===i.clientId);
    if (search && !i.number?.toLowerCase().includes(search) && !c?.company?.toLowerCase().includes(search)) return false;
    if (status && i.payStatus !== status) return false;
    return true;
  }).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));

  const pages = Math.max(1,Math.ceil(filtered.length/DOC_PER_PAGE));
  const slice = filtered.slice((invoicePage-1)*DOC_PER_PAGE, invoicePage*DOC_PER_PAGE);
  const tbody = $('invoicesBody');

  if (!slice.length) { tbody.innerHTML=`<tr><td colspan="8"><div class="empty-state"><i class="fa-solid fa-file-invoice"></i><p>Aucune facture</p></div></td></tr>`; }
  else {
    tbody.innerHTML = slice.map(i => {
      const c = clients.find(c=>c.id===i.clientId);
      const paid = DB.table('payments').filter(p=>p.invoiceId===i.id).reduce((s,p)=>s+(p.amount||0),0);
      const remaining = (i.total||0) - paid;
      const statusBadge = remaining <= 0
        ? '<span class="badge badge-green">Payé</span>'
        : paid > 0 ? '<span class="badge badge-yellow">Partiel</span>'
        : '<span class="badge badge-red">En attente</span>';
      return `<tr>
        <td><strong>${esc(i.number)}</strong></td>
        <td>${fmtDate(i.createdAt)}</td>
        <td>${esc(c?.company||'—')}</td>
        <td><strong>${MAD(i.total)}</strong></td>
        <td>${MAD(paid)}</td>
        <td style="color:${remaining>0?'var(--danger)':'var(--green-600)'}"><strong>${MAD(remaining)}</strong></td>
        <td>${statusBadge}</td>
        <td>
          <div class="actions">
            <button class="btn-icon edit" onclick="openDocModal('invoice','${i.id}')"><i class="fa-solid fa-pen"></i></button>
            <button class="btn-icon" onclick="openPaymentModal('${i.id}')" title="Ajouter règlement"><i class="fa-solid fa-money-bill" style="color:var(--green-500)"></i></button>
            <button class="btn-icon" onclick="generateDocPDF('invoice','${i.id}')"><i class="fa-solid fa-print"></i></button>
            <button class="btn-icon delete" onclick="deleteDoc('invoice','${i.id}')"><i class="fa-solid fa-trash"></i></button>
          </div>
        </td>
      </tr>`;
    }).join('');
  }
  renderPagination('invoicesPagination', invoicePage, pages, pg=>{invoicePage=pg;renderInvoices();});
}

function openDocModal(type, id = null) {
  const doc = id ? DB.find(type==='quote'?'quotes':'invoices', id) : null;
  docLines = doc?.lines ? JSON.parse(JSON.stringify(doc.lines)) : [];
  if (!docLines.length) docLines.push(newLine());

  const clients = DB.table('clients');
  const title = type==='quote' ? (id?'Modifier Devis':'Nouveau Devis') : (id?'Modifier Facture':'Nouvelle Facture');

  const body = `
  <div class="form-grid" style="margin-bottom:1rem">
    <div class="form-group-modal">
      <label>Client *</label>
      <select id="docClient" onchange="applyClientDiscount()">
        <option value="">-- Sélectionner --</option>
        ${clients.map(c=>`<option value="${c.id}" ${doc?.clientId===c.id?'selected':''}>${esc(c.company)}</option>`).join('')}
      </select>
    </div>
    <div class="form-group-modal">
      <label>Date</label>
      <input id="docDate" type="date" value="${doc?.date||new Date().toISOString().slice(0,10)}">
    </div>
    <div class="form-group-modal">
      <label>Remise globale (%)</label>
      <input id="docDiscount" type="number" value="${doc?.discount||0}" min="0" max="100" oninput="recalcDoc()">
    </div>
    <div class="form-group-modal">
      <label>Frais livraison (MAD)</label>
      <input id="docDelivery" type="number" value="${doc?.delivery||0}" min="0" oninput="recalcDoc()">
    </div>
    <div class="form-group-modal full">
      <label>Notes / Observations</label>
      <input id="docNotes" value="${esc(doc?.notes||'')}">
    </div>
  </div>

  <h4 style="margin-bottom:.5rem">Lignes produits</h4>
  <div style="overflow-x:auto">
    <table class="line-items-table" id="linesTable">
      <thead><tr><th>Produit</th><th>Qté</th><th>Prix U.</th><th>Remise%</th><th>TVA%</th><th>Total HT</th><th></th></tr></thead>
      <tbody id="linesBody"></tbody>
    </table>
  </div>
  <button class="btn-secondary" style="margin-top:.5rem" onclick="addDocLine()"><i class="fa-solid fa-plus"></i> Ajouter ligne</button>

  <div class="totals-box" style="margin-top:1rem" id="docTotals"></div>`;

  openModal(title, body, [
    { label:'Annuler', class:'btn-secondary', onclick:'closeModalById("modalOverlay")' },
    { label: id?'Enregistrer':'Créer', class:'btn-primary', onclick:`saveDoc('${type}','${id||''}')` }
  ]);
  renderDocLines();
}

function newLine() { return { productId:'', qty:1, price:0, discount:0, tva:20, total:0 }; }

function addDocLine() { docLines.push(newLine()); renderDocLines(); }

function removeDocLine(idx) { if(docLines.length>1){docLines.splice(idx,1);renderDocLines();} }

function updateDocLine(idx, field, val) {
  docLines[idx][field] = field==='productId' ? val : parseFloat(val)||0;
  if (field==='productId') {
    const p = DB.find('products', val);
    if (p) { docLines[idx].price = p.salePrice; docLines[idx].tva = p.tva||20; }
  }
  recalcDocLine(idx);
}

function recalcDocLine(idx) {
  const l = docLines[idx];
  l.total = l.qty * l.price * (1 - l.discount/100);
  renderDocLines();
}

function renderDocLines() {
  const products = DB.table('products');
  const tbody = $('linesBody');
  tbody.innerHTML = docLines.map((l,i) => `<tr>
    <td>
      <select style="min-width:140px" onchange="updateDocLine(${i},'productId',this.value)">
        <option value="">-- Produit --</option>
        ${products.map(p=>`<option value="${p.id}" ${l.productId===p.id?'selected':''}>${esc(p.name)}</option>`).join('')}
      </select>
    </td>
    <td><input type="number" min="1" value="${l.qty}" style="width:60px" onchange="updateDocLine(${i},'qty',this.value)"></td>
    <td><input type="number" step="0.01" value="${l.price}" style="width:80px" onchange="updateDocLine(${i},'price',this.value)"></td>
    <td><input type="number" min="0" max="100" value="${l.discount}" style="width:55px" onchange="updateDocLine(${i},'discount',this.value)"></td>
    <td><select style="width:65px" onchange="updateDocLine(${i},'tva',this.value)">
      ${[0,7,10,14,20].map(t=>`<option value="${t}" ${l.tva==t?'selected':''}>${t}%</option>`).join('')}
    </select></td>
    <td style="font-weight:700;white-space:nowrap">${MAD(l.total)}</td>
    <td><button class="btn-icon delete" onclick="removeDocLine(${i})"><i class="fa-solid fa-xmark"></i></button></td>
  </tr>`).join('');
  recalcDoc();
}

function recalcDoc() {
  const discount = parseFloat($('docDiscount')?.value||0)/100;
  const delivery = parseFloat($('docDelivery')?.value||0);
  const subtotal = docLines.reduce((s,l)=>s+l.total,0);
  const afterDiscount = subtotal * (1-discount);
  const taxAmount = docLines.reduce((s,l)=>s + l.total*(1-discount)*l.tva/100, 0);
  const total = afterDiscount + taxAmount + delivery;
  const costTotal = docLines.reduce((l_,l) => {
    const p = DB.find('products', l.productId);
    return l_ + (p?.costPrice||0)*l.qty;
  }, 0);
  const profit = total - costTotal - delivery;

  $('docTotals').innerHTML = `
    <div class="total-row"><span class="total-label">Sous-total HT</span><span class="total-val">${MAD(subtotal)}</span></div>
    ${discount>0?`<div class="total-row"><span class="total-label">Remise (${Math.round(discount*100)}%)</span><span class="total-val" style="color:var(--danger)">-${MAD(subtotal*discount)}</span></div>`:''}
    <div class="total-row"><span class="total-label">TVA</span><span class="total-val">${MAD(taxAmount)}</span></div>
    ${delivery>0?`<div class="total-row"><span class="total-label">Livraison</span><span class="total-val">${MAD(delivery)}</span></div>`:''}
    <div class="total-row grand"><span class="total-label">Total TTC</span><span class="total-val">${MAD(total)}</span></div>`;
}

function applyClientDiscount() {
  const clientId = $('docClient')?.value;
  const c = DB.find('clients', clientId);
  if (c?.discount) { $('docDiscount').value = c.discount; recalcDoc(); }
}

function saveDoc(type, id) {
  const clientId = $('docClient')?.value;
  if (!clientId) return showToast('Sélectionnez un client', 'error');
  if (!docLines.some(l=>l.productId)) return showToast('Ajoutez au moins un produit', 'error');

  const discount = parseFloat($('docDiscount')?.value||0)/100;
  const delivery = parseFloat($('docDelivery')?.value||0);
  const subtotal = docLines.reduce((s,l)=>s+l.total,0);
  const afterDiscount = subtotal*(1-discount);
  const taxAmount = docLines.reduce((s,l)=>s+l.total*(1-discount)*l.tva/100, 0);
  const total = afterDiscount + taxAmount + delivery;
  const costTotal = docLines.reduce((acc,l)=>{const p=DB.find('products',l.productId);return acc+(p?.costPrice||0)*l.qty;},0);

  const table = type==='quote'?'quotes':'invoices';
  const data = {
    clientId, date: $('docDate')?.value, lines: docLines,
    discount: parseFloat($('docDiscount')?.value||0),
    delivery, notes: $('docNotes')?.value.trim(),
    subtotal, taxAmount, total, profit: total-costTotal,
    status: 'draft', payStatus: 'pending', remaining: total
  };

  if (id) { DB.update(table, id, data); showToast(`${type==='quote'?'Devis':'Facture'} mis à jour`); }
  else {
    data.number = getDocNumber(type);
    DB.insert(table, data);
    logAction(type==='quote'?'Devis':'Factures','Création',`${data.number} — ${MAD(total)}`);
    showToast(`${data.number} créé`);
  }
  closeModalById('modalOverlay');
  type==='quote' ? renderQuotes() : renderInvoices();
}

function validateQuote(id) {
  DB.update('quotes', id, { status: 'validated' });
  logAction('Devis','Validation',`Devis ${DB.find('quotes',id)?.number} validé`);
  showToast('Devis validé');
  renderQuotes();
}

function convertToInvoice(quoteId) {
  const q = DB.find('quotes', quoteId);
  if (!q) return;
  const inv = {
    ...q, number: getDocNumber('invoice'),
    status: 'confirmed', payStatus: 'pending', remaining: q.total
  };
  delete inv.id; delete inv.createdAt;
  DB.insert('invoices', inv);
  DB.update('quotes', quoteId, { status: 'invoiced' });
  logAction('Devis','Conversion',`Devis converti en facture`);
  showToast('Facture créée depuis le devis');
  renderQuotes(); renderInvoices();
}

/* ══════════════════════════════════════════════════════════
   14b. BON DE LIVRAISON MODULE
═════════════════════════════════════════════════════════════ */
var blPage = 1; var BL_PER_PAGE = 15;

function filterDeliveryNotes() { blPage = 1; renderDeliveryNotes(); }

function renderDeliveryNotes() {
  var search = ($('blSearch') || {value:''}).value.toLowerCase();
  var status = ($('blStatusFilter') || {value:''}).value;
  var clients = DB.table('clients');
  var filtered = DB.table('deliveryNotes').filter(function(b) {
    var c = clients.find(function(c){return c.id===b.clientId;});
    if (search && !b.number.toLowerCase().includes(search) && !(c && c.company && c.company.toLowerCase().includes(search))) return false;
    if (status && b.status !== status) return false;
    return true;
  }).sort(function(a,b){return new Date(b.createdAt)-new Date(a.createdAt);});

  var pages = Math.max(1, Math.ceil(filtered.length/BL_PER_PAGE));
  var slice = filtered.slice((blPage-1)*BL_PER_PAGE, blPage*BL_PER_PAGE);
  var tbody = $('blBody');
  if (!tbody) return;

  if (!slice.length) {
    tbody.innerHTML = '<tr><td colspan="8"><div class="empty-state"><i class="fa-solid fa-truck"></i><p>Aucun bon de livraison</p></div></td></tr>';
  } else {
    tbody.innerHTML = slice.map(function(b) {
      var c = clients.find(function(c){return c.id===b.clientId;});
      var q = b.quoteId ? DB.find('quotes', b.quoteId) : null;
      var statusBadge = {
        'pending': '<span class="badge badge-yellow">En attente</span>',
        'delivered': '<span class="badge badge-green">Livré</span>',
        'partial': '<span class="badge badge-blue">Partiel</span>',
        'invoiced': '<span class="badge badge-gray">Facturé</span>'
      }[b.status] || '<span class="badge badge-gray">—</span>';
      return '<tr>' +
        '<td><strong>' + esc(b.number) + '</strong></td>' +
        '<td>' + fmtDate(b.date || b.createdAt) + '</td>' +
        '<td>' + esc(c ? c.company : '—') + '</td>' +
        '<td>' + esc(q ? q.number : '—') + '</td>' +
        '<td>' + MAD(b.total) + '</td>' +
        '<td>' + esc(b.deliveryAddress || '—') + '</td>' +
        '<td>' + statusBadge + '</td>' +
        '<td>' +
          '<div class="actions">' +
            '<button class="btn-icon edit" onclick="openBLModal(\'' + b.id + '\')" title="Modifier"><i class="fa-solid fa-pen"></i></button>' +
            (b.status === 'delivered' ? '<button class="btn-icon" onclick="convertBLToInvoice(\'' + b.id + '\')" title="Convertir en facture"><i class="fa-solid fa-file-invoice" style="color:var(--info)"></i></button>' : '') +
            '<button class="btn-icon" onclick="generateBLPDF(\'' + b.id + '\')" title="Imprimer"><i class="fa-solid fa-print"></i></button>' +
            '<button class="btn-icon delete" onclick="deleteBL(\'' + b.id + '\')" title="Supprimer"><i class="fa-solid fa-trash"></i></button>' +
          '</div>' +
        '</td>' +
      '</tr>';
    }).join('');
  }
  renderPagination('blPagination', blPage, pages, function(pg){blPage=pg;renderDeliveryNotes();});
}

// ID courant du BL en cours d'édition (null = création)
var _currentBLId = null;

function openBLModal(id) {
  _currentBLId = id || null;
  var b = _currentBLId ? DB.find('deliveryNotes', _currentBLId) : null;
  docLines = (b && b.lines && b.lines.length) ? JSON.parse(JSON.stringify(b.lines)) : [newLine()];
  var clients = DB.table('clients');
  var quotes  = DB.table('quotes').filter(function(q){return q.status==='validated';});
  var todayVal = new Date().toISOString().slice(0,10);

  var clientOpts = '<option value="">-- Sélectionner un client --</option>' +
    clients.map(function(c){
      return '<option value="'+c.id+'"'+(b&&b.clientId===c.id?' selected':'')+'>'+esc(c.company)+'</option>';
    }).join('');

  var quoteOpts = '<option value="">— Aucun devis source —</option>' +
    quotes.map(function(q){
      return '<option value="'+q.id+'"'+(b&&b.quoteId===q.id?' selected':'')+'>'+esc(q.number)+'</option>';
    }).join('');

  var body = '<div class="form-grid" style="margin-bottom:1rem">' +
    '<div class="form-group-modal"><label>Client *</label>' +
      '<select id="blClient">'+clientOpts+'</select></div>' +
    '<div class="form-group-modal"><label>Devis source (optionnel)</label>' +
      '<select id="blQuote" onchange="fillBLFromQuote(this.value)">'+quoteOpts+'</select></div>' +
    '<div class="form-group-modal"><label>Date livraison</label>' +
      '<input id="blDate" type="date" value="'+(b&&b.date?b.date.slice(0,10):todayVal)+'"></div>' +
    '<div class="form-group-modal"><label>Statut</label><select id="blStatus">' +
      '<option value="pending"'+((!b||b.status==='pending')?' selected':'')+'>En attente</option>' +
      '<option value="partial"'+(b&&b.status==='partial'?' selected':'')+'>Partiel</option>' +
      '<option value="delivered"'+(b&&b.status==='delivered'?' selected':'')+'>Livré</option>' +
    '</select></div>' +
    '<div class="form-group-modal full"><label>Adresse de livraison</label>' +
      '<input id="blAddress" value="'+(b?esc(b.deliveryAddress||''):'')+'" placeholder="Adresse complète de livraison"></div>' +
    '<div class="form-group-modal full"><label>Notes / Instructions livreur</label>' +
      '<input id="blNotes" value="'+(b?esc(b.notes||''):'')+'" placeholder="Remarques, instructions..."></div>' +
  '</div>' +
  '<h4 style="margin-bottom:.5rem">Produits à livrer</h4>' +
  '<div style="overflow-x:auto"><table class="line-items-table">' +
    '<thead><tr><th>Produit</th><th>Qté</th><th>Prix U.</th><th>Remise%</th><th>TVA%</th><th>Total HT</th><th></th></tr></thead>' +
    '<tbody id="linesBody"></tbody></table></div>' +
  '<button class="btn-secondary" style="margin-top:.5rem" onclick="addDocLine()"><i class="fa-solid fa-plus"></i> Ajouter ligne</button>' +
  '<div class="totals-box" style="margin-top:1rem" id="docTotals"></div>';

  openModal(_currentBLId ? 'Modifier Bon de Livraison' : 'Nouveau Bon de Livraison', body, [
    { label:'Annuler', class:'btn-secondary', onclick:'closeModalById("modalOverlay")' },
    { label: _currentBLId ? 'Enregistrer' : 'Créer', class:'btn-primary', onclick:'saveBL()' }
  ]);
  renderDocLines();
}

function fillBLFromQuote(quoteId) {
  var q = quoteId ? DB.find('quotes', quoteId) : null;
  if (!q) return;
  docLines = q.lines ? JSON.parse(JSON.stringify(q.lines)) : [newLine()];
  var cSel = $('blClient');
  if (cSel && q.clientId) cSel.value = q.clientId;
  renderDocLines();
}

function saveBL() {
  var clientEl = $('blClient');
  var clientId = clientEl ? clientEl.value : '';
  if (!clientId) return showToast('Sélectionnez un client', 'error');
  if (!docLines.some(function(l){return l.productId;})) return showToast('Ajoutez au moins un produit', 'error');

  var subtotal = docLines.reduce(function(s,l){return s+(l.total||0);},0);
  var taxAmount = docLines.reduce(function(s,l){return s+(l.total||0)*((l.tva||0)/100);},0);
  var total = subtotal + taxAmount;

  var blQuoteEl = $('blQuote');
  var blDateEl  = $('blDate');
  var blStatusEl= $('blStatus');
  var blAddrEl  = $('blAddress');
  var blNotesEl = $('blNotes');

  var data = {
    clientId: clientId,
    quoteId: (blQuoteEl && blQuoteEl.value) ? blQuoteEl.value : null,
    date: blDateEl ? blDateEl.value : new Date().toISOString().slice(0,10),
    status: blStatusEl ? (blStatusEl.value || 'pending') : 'pending',
    deliveryAddress: blAddrEl ? blAddrEl.value.trim() : '',
    notes: blNotesEl ? blNotesEl.value.trim() : '',
    lines: JSON.parse(JSON.stringify(docLines)),
    subtotal: subtotal, taxAmount: taxAmount, total: total
  };

  if (_currentBLId) {
    DB.update('deliveryNotes', _currentBLId, data);
    logAction('Bons de Livraison','Modification', _currentBLId);
    showToast('Bon de livraison mis à jour');
  } else {
    data.number = getDocNumber('delivery-note');
    DB.insert('deliveryNotes', data);
    logAction('Bons de Livraison','Création', data.number + ' — ' + MAD(total));
    showToast(data.number + ' créé avec succès');
  }
  _currentBLId = null;
  closeModalById('modalOverlay');
  renderDeliveryNotes();
}

function convertBLToInvoice(blId) {
  var b = DB.find('deliveryNotes', blId);
  if (!b) return;
  var inv = Object.assign({}, b, {
    number: getDocNumber('invoice'),
    status: 'confirmed', payStatus: 'pending', remaining: b.total
  });
  delete inv.id; delete inv.createdAt;
  DB.insert('invoices', inv);
  DB.update('deliveryNotes', blId, { status: 'invoiced' });
  logAction('BL','Conversion','BL converti en facture');
  showToast('Facture créée depuis le bon de livraison');
  renderDeliveryNotes();
}

function deleteBL(id) {
  var b = DB.find('deliveryNotes', id);
  confirm2('Supprimer ' + (b ? b.number : 'ce bon') + ' ?', function() {
    DB.delete('deliveryNotes', id);
    showToast('Bon de livraison supprimé', 'warning');
    renderDeliveryNotes();
  });
}

function generateBLPDF(id) {
  var b = DB.find('deliveryNotes', id);
  if (!b) return;
  var client = DB.find('clients', b.clientId);
  if (typeof window === 'undefined' || !window.jspdf) { showToast('PDF non disponible','error'); return; }
  var jsPDF = window.jspdf.jsPDF;
  var pdf = new jsPDF();
  pdfHeader(pdf, 'BON DE LIVRAISON', b.number);
  pdf.setFontSize(8);
  pdf.text('Client: ' + (client ? client.company : '—'), 14, 44);
  if (client && client.address) pdf.text('Adresse: ' + client.address, 14, 50);
  if (b.deliveryAddress) pdf.text('Livraison: ' + b.deliveryAddress, 14, 56);
  pdf.text('Date: ' + fmtDate(b.date), 14, 62);
  pdf.text('Statut: ' + (b.status === 'delivered' ? 'Livré' : b.status === 'partial' ? 'Partiel' : 'En attente'), 14, 68);
  var headers = [['Produit','Qté','Prix U.','Total HT']];
  var rows = (b.lines||[]).map(function(l) {
    var p = DB.find('products', l.productId);
    return [p ? p.name : '—', l.qty, MAD(l.price), MAD(l.total)];
  });
  pdf.autoTable({ startY:74, head:headers, body:rows, headStyles:{fillColor:[22,163,74],textColor:255,fontSize:8}, bodyStyles:{fontSize:8} });
  var y = pdf.lastAutoTable.finalY + 6;
  pdf.setFont(undefined,'bold');
  pdf.text('Total TTC: ' + MAD(b.total), 196, y+8, {align:'right'});
  pdf.setFontSize(8); pdf.setFont(undefined,'normal');
  pdf.text('Signature livreur:', 30, y+30);
  pdf.text('Signature client:', 130, y+30);
  pdf.setFont(undefined,'normal'); pdf.setFontSize(7); pdf.setTextColor(150,150,150);
  pdf.text('Créé par INASTECH +212661777702 | SOUSS-PHYTO', 105, 287, {align:'center'});
  pdf.save(b.number + '.pdf');
  logAction('PDF','Génération BL', b.number);
}

function deleteDoc(type, id) {
  const table = type==='quote'?'quotes':'invoices';
  const doc = DB.find(table, id);
  confirm2(`Supprimer ${doc?.number} ?`, () => {
    DB.delete(table, id);
    showToast('Document supprimé', 'warning');
    type==='quote' ? renderQuotes() : renderInvoices();
  });
}

/* ══════════════════════════════════════════════════════════
   15. PAYMENTS MODULE
═════════════════════════════════════════════════════════════ */
let payPage = 1; const PAY_PER_PAGE = 20;

function filterPayments() { payPage = 1; renderPayments(); }

function renderPayments() {
  const search = $('paySearch')?.value.toLowerCase()||'';
  const date   = $('payDateFilter')?.value||'';
  const clients = DB.table('clients');
  const filtered = DB.table('payments').filter(p => {
    const c = clients.find(c=>c.id===p.clientId);
    if (date && !p.date?.startsWith(date)) return false;
    if (search && !c?.company?.toLowerCase().includes(search) && !p.reference?.toLowerCase().includes(search)) return false;
    return true;
  }).sort((a,b)=>new Date(b.date)-new Date(a.date));

  const pages = Math.max(1,Math.ceil(filtered.length/PAY_PER_PAGE));
  const slice = filtered.slice((payPage-1)*PAY_PER_PAGE, payPage*PAY_PER_PAGE);
  const tbody = $('paymentsBody');

  if (!slice.length) { tbody.innerHTML=`<tr><td colspan="6"><div class="empty-state"><i class="fa-solid fa-money-bill-wave"></i><p>Aucun règlement</p></div></td></tr>`; }
  else {
    tbody.innerHTML = slice.map(p => {
      const c = clients.find(c=>c.id===p.clientId);
      const inv = DB.find('invoices', p.invoiceId);
      return `<tr>
        <td>${fmtDate(p.date)}</td>
        <td>${esc(c?.company||'—')}</td>
        <td>${esc(inv?.number||'—')}</td>
        <td><strong style="color:var(--green-600)">${MAD(p.amount)}</strong></td>
        <td><span class="badge badge-blue">${esc(p.mode||'—')}</span></td>
        <td>${esc(p.reference||'—')}</td>
        <td>
          <div class="actions">
            <button class="btn-icon" onclick="generatePaymentPDF('${p.id}')"><i class="fa-solid fa-print"></i></button>
            <button class="btn-icon delete" onclick="deletePayment('${p.id}')"><i class="fa-solid fa-trash"></i></button>
          </div>
        </td>
      </tr>`;
    }).join('');
  }
  renderPagination('paymentsPagination', payPage, pages, pg=>{payPage=pg;renderPayments();});
}

function openPaymentModal(invoiceId = '') {
  const invoices = DB.table('invoices');
  const clients  = DB.table('clients');
  const inv = invoiceId ? DB.find('invoices', invoiceId) : null;
  const client = inv ? DB.find('clients', inv.clientId) : null;
  const paid = invoiceId ? DB.table('payments').filter(p=>p.invoiceId===invoiceId).reduce((s,p)=>s+(p.amount||0),0) : 0;
  const remaining = inv ? (inv.total||0) - paid : 0;

  const body = `
  <div class="form-grid">
    <div class="form-group-modal">
      <label>Client *</label>
      <select id="payClient" onchange="filterInvoicesForClient(this.value)">
        <option value="">-- Sélectionner --</option>
        ${clients.map(c=>`<option value="${c.id}" ${client?.id===c.id?'selected':''}>${esc(c.company)}</option>`).join('')}
      </select>
    </div>
    <div class="form-group-modal">
      <label>Facture *</label>
      <select id="payInvoice" onchange="fillRemainingPay(this.value)">
        <option value="">-- Sélectionner --</option>
        ${invoiceId ? `<option value="${invoiceId}" selected>${inv?.number} — ${MAD(inv?.total)}</option>` : invoices.map(i=>`<option value="${i.id}">${i.number} — ${MAD(i.total)}</option>`).join('')}
      </select>
    </div>
    <div class="form-group-modal">
      <label>Montant (MAD) *</label>
      <input id="payAmount" type="number" step="0.01" value="${remaining||''}" placeholder="0.00">
    </div>
    <div class="form-group-modal">
      <label>Mode de paiement</label>
      <select id="payMode">
        <option>Espèces</option><option>Chèque</option><option>Virement</option><option>Effet</option>
      </select>
    </div>
    <div class="form-group-modal">
      <label>Date</label>
      <input id="payDate" type="date" value="${new Date().toISOString().slice(0,10)}">
    </div>
    <div class="form-group-modal">
      <label>Référence</label>
      <input id="payRef" placeholder="N° chèque, virement...">
    </div>
    <div class="form-group-modal full">
      <label>Notes</label>
      <input id="payNotes" placeholder="Observations...">
    </div>
    ${remaining>0?`<div class="form-group-modal full"><div style="background:var(--bg3);border-radius:8px;padding:.7rem;font-size:.88rem"><strong>Reste à payer: ${MAD(remaining)}</strong></div></div>`:''}
  </div>`;

  openModal('Nouveau Règlement', body, [
    { label:'Annuler', class:'btn-secondary', onclick:'closeModalById("modalOverlay")' },
    { label:'Enregistrer', class:'btn-primary', onclick:'savePayment()' }
  ]);
}

function filterInvoicesForClient(clientId) {
  const sel = $('payInvoice');
  const invoices = DB.table('invoices').filter(i=>i.clientId===clientId);
  sel.innerHTML = `<option value="">-- Sélectionner --</option>${invoices.map(i=>`<option value="${i.id}">${i.number} — ${MAD(i.total)}</option>`).join('')}`;
}

function fillRemainingPay(invoiceId) {
  const inv = DB.find('invoices', invoiceId);
  if (!inv) return;
  const paid = DB.table('payments').filter(p=>p.invoiceId===invoiceId).reduce((s,p)=>s+(p.amount||0),0);
  $('payAmount').value = Math.max(0, (inv.total||0)-paid).toFixed(2);
}

function savePayment() {
  const clientId = $('payClient')?.value;
  const invoiceId = $('payInvoice')?.value;
  const amount = parseFloat($('payAmount')?.value||0);
  if (!clientId || !invoiceId || !amount) return showToast('Remplissez tous les champs requis', 'error');

  DB.insert('payments', {
    clientId, invoiceId, amount, mode: $('payMode')?.value,
    date: $('payDate')?.value, reference: $('payRef')?.value.trim(),
    notes: $('payNotes')?.value.trim(), user: currentUser?.name
  });

  // Update invoice remaining
  const inv = DB.find('invoices', invoiceId);
  if (inv) {
    const totalPaid = DB.table('payments').filter(p=>p.invoiceId===invoiceId).reduce((s,p)=>s+(p.amount||0),0);
    const remaining = Math.max(0, (inv.total||0) - totalPaid);
    DB.update('invoices', invoiceId, { remaining, payStatus: remaining<=0?'paid':totalPaid>0?'partial':'pending' });
  }

  logAction('Règlements','Enregistrement',`${MAD(amount)} pour facture ${inv?.number}`);
  showToast(`Règlement de ${MAD(amount)} enregistré`);
  closeModalById('modalOverlay');
  renderPayments();
}

function deletePayment(id) {
  confirm2('Supprimer ce règlement ?', () => {
    const p = DB.find('payments', id);
    DB.delete('payments', id);
    if (p?.invoiceId) {
      const inv = DB.find('invoices', p.invoiceId);
      if (inv) {
        const totalPaid = DB.table('payments').filter(py=>py.invoiceId===p.invoiceId).reduce((s,py)=>s+(py.amount||0),0);
        const remaining = Math.max(0,(inv.total||0)-totalPaid);
        DB.update('invoices',p.invoiceId,{remaining,payStatus:remaining<=0?'paid':totalPaid>0?'partial':'pending'});
      }
    }
    showToast('Règlement supprimé','warning');
    renderPayments();
  });
}

/* ══════════════════════════════════════════════════════════
   16. RETURNS MODULE
═════════════════════════════════════════════════════════════ */
function filterReturns() { renderReturns(); }

function renderReturns() {
  const search = $('returnSearch')?.value.toLowerCase()||'';
  const type   = $('returnTypeFilter')?.value||'';
  const clients = DB.table('clients');
  const filtered = DB.table('returns').filter(r => {
    if (type && r.type !== type) return false;
    const c = clients.find(c=>c.id===r.clientId);
    if (search && !c?.company?.toLowerCase().includes(search)) return false;
    return true;
  }).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));

  const tbody = $('returnsBody');
  if (!filtered.length) { tbody.innerHTML=`<tr><td colspan="8"><div class="empty-state"><i class="fa-solid fa-rotate-left"></i><p>Aucun retour</p></div></td></tr>`; return; }

  tbody.innerHTML = filtered.map(r => {
    const c = clients.find(c=>c.id===r.clientId);
    const p = DB.find('products', r.productId);
    const typeBadge = {refund:'<span class="badge badge-red">Remboursement</span>',exchange:'<span class="badge badge-blue">Échange</span>',credit:'<span class="badge badge-yellow">Avoir</span>'}[r.type]||'';
    return `<tr>
      <td>${fmtDate(r.createdAt)}</td>
      <td>${esc(c?.company||'—')}</td>
      <td>${esc(p?.name||'—')}</td>
      <td>${r.qty}</td>
      <td>${typeBadge}</td>
      <td>${esc(r.reason||'—')}</td>
      <td><strong style="color:var(--danger)">${MAD(r.amount)}</strong></td>
      <td>
        <div class="actions">
          <button class="btn-icon" onclick="generateReturnPDF('${r.id}')"><i class="fa-solid fa-print"></i></button>
          <button class="btn-icon delete" onclick="deleteReturn('${r.id}')"><i class="fa-solid fa-trash"></i></button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

function openReturnModal() {
  const clients = DB.table('clients');
  const products = DB.table('products');
  const body = `
  <div class="form-grid">
    <div class="form-group-modal">
      <label>Client *</label>
      <select id="retClient"><option value="">-- Sélectionner --</option>${clients.map(c=>`<option value="${c.id}">${esc(c.company)}</option>`).join('')}</select>
    </div>
    <div class="form-group-modal">
      <label>Produit *</label>
      <select id="retProduct" onchange="fillReturnPrice()"><option value="">-- Sélectionner --</option>${products.map(p=>`<option value="${p.id}">${esc(p.name)}</option>`).join('')}</select>
    </div>
    <div class="form-group-modal">
      <label>Quantité *</label>
      <input id="retQty" type="number" min="1" value="1" oninput="fillReturnPrice()">
    </div>
    <div class="form-group-modal">
      <label>Type de retour *</label>
      <select id="retType">
        <option value="refund">Remboursement</option>
        <option value="exchange">Échange produit</option>
        <option value="credit">Avoir</option>
      </select>
    </div>
    <div class="form-group-modal">
      <label>Montant retourné (MAD)</label>
      <input id="retAmount" type="number" step="0.01" placeholder="0.00">
    </div>
    <div class="form-group-modal full">
      <label>Justification obligatoire *</label>
      <textarea id="retReason" rows="3" placeholder="Expliquez la raison du retour..."></textarea>
    </div>
  </div>`;
  openModal('Nouveau Retour Produit', body, [
    { label:'Annuler', class:'btn-secondary', onclick:'closeModalById("modalOverlay")' },
    { label:'Enregistrer', class:'btn-primary', onclick:'saveReturn()' }
  ]);
}

function fillReturnPrice() {
  const p = DB.find('products', $('retProduct')?.value);
  if (p) $('retAmount').value = ((p.salePrice||0) * (parseInt($('retQty')?.value)||1)).toFixed(2);
}

function saveReturn() {
  const clientId = $('retClient')?.value;
  const productId = $('retProduct')?.value;
  const qty = parseInt($('retQty')?.value||0);
  const reason = $('retReason')?.value.trim();
  if (!clientId||!productId||!qty||!reason) return showToast('Remplissez tous les champs requis', 'error');

  const r = DB.insert('returns', {
    clientId, productId, qty, type: $('retType')?.value,
    amount: parseFloat($('retAmount')?.value||0), reason, user: currentUser?.name
  });

  // Restore stock
  const p = DB.find('products', productId);
  if (p) {
    DB.update('products', productId, { stock: p.stock + qty });
    DB.insert('stockMovements', { type:'return', productId, qty, reason, date:now(), user:currentUser?.name });
  }

  logAction('Retours','Création',`Retour ${$('retType')?.value} — ${p?.name}`);
  showToast('Retour enregistré, stock remis à jour');
  closeModalById('modalOverlay');
  renderReturns();
}

function deleteReturn(id) {
  confirm2('Supprimer ce retour ?', () => {
    const r = DB.find('returns', id);
    if (r) {
      const p = DB.find('products', r.productId);
      if (p) DB.update('products', r.productId, { stock: Math.max(0, p.stock - r.qty) });
    }
    DB.delete('returns', id);
    showToast('Retour supprimé', 'warning');
    renderReturns();
  });
}

/* ══════════════════════════════════════════════════════════
   17. USERS MODULE
═════════════════════════════════════════════════════════════ */
const ALL_PERMISSIONS = [
  { key:'voir_stock', label:'Voir Stock' }, { key:'modifier_stock', label:'Modifier Stock' },
  { key:'entree_stock', label:'Entrée Stock' }, { key:'sortie_stock', label:'Sortie Stock' },
  { key:'creer_devis', label:'Créer Devis' }, { key:'valider_devis', label:'Valider Devis' },
  { key:'facturation', label:'Facturation' }, { key:'voir_clients', label:'Voir Clients' },
  { key:'modifier_clients', label:'Modifier Clients' }, { key:'gestion_reglements', label:'Règlements' },
  { key:'voir_dashboard', label:'Dashboard' }, { key:'gestion_utilisateurs', label:'Utilisateurs' },
  { key:'impression_pdf', label:'Impression PDF' }, { key:'retour_produits', label:'Retours' },
  { key:'voir_historique', label:'Historique' }
];

function filterUsers() { renderUsers(); }

function renderUsers() {
  const search = $('userSearch')?.value.toLowerCase()||'';
  const users = DB.table('users').filter(u =>
    !search || u.name?.toLowerCase().includes(search) || u.username?.toLowerCase().includes(search)
  );
  const isAdmin = currentUser?.role==='Administrateur' || currentUser?.id==='admin';
  const grid = $('usersGrid');
  if (!users.length) { grid.innerHTML=`<div class="empty-state" style="grid-column:1/-1"><i class="fa-solid fa-users-gear"></i><p>Aucun utilisateur</p></div>`; return; }

  grid.innerHTML = users.map(u => `
    <div class="user-card">
      <div class="user-card-header">
        <div class="user-card-avatar">${u.name?.charAt(0).toUpperCase()||'U'}</div>
        <div class="user-card-info">
          <div class="uc-name">${esc(u.name)}</div>
          <div class="uc-role"><span class="badge ${u.role==='Administrateur'?'badge-green':'badge-blue'}">${esc(u.role)}</span></div>
        </div>
      </div>
      <div class="user-card-details">
        <span><i class="fa-solid fa-user"></i>${esc(u.username)}</span>
        <span><i class="fa-solid fa-phone"></i>${esc(u.phone||'—')}</span>
        <span><i class="fa-solid fa-envelope"></i>${esc(u.email||'—')}</span>
        <span><i class="fa-solid fa-calendar"></i>${fmtDate(u.createdAt)}</span>
      </div>
      ${u.permissions?.all ? '<div class="perms-grid" style="margin-top:.5rem"><span class="perm-badge">Toutes permissions</span></div>' : `
      <div class="perms-grid" style="margin-top:.5rem">
        ${ALL_PERMISSIONS.filter(p=>u.permissions?.[p.key]).map(p=>`<span class="perm-badge">${p.label}</span>`).join('')}
      </div>`}
      ${isAdmin ? `<div class="user-card-actions">
        <button class="btn-icon edit" onclick="openUserModal('${u.id}')"><i class="fa-solid fa-pen"></i></button>
        ${u.id!=='admin'?`<button class="btn-icon delete" onclick="deleteUser('${u.id}')"><i class="fa-solid fa-trash"></i></button>`:''}
      </div>` : ''}
    </div>`).join('');
}

function openUserModal(id = null) {
  if (!hasPermission('gestion_utilisateurs')) return showToast('Permission insuffisante', 'error');
  const u = id ? DB.find('users', id) : null;
  const body = `
  <div class="form-grid">
    <div class="form-group-modal"><label>Nom complet *</label><input id="uName" value="${esc(u?.name||'')}"></div>
    <div class="form-group-modal"><label>Nom d'utilisateur *</label><input id="uUsername" value="${esc(u?.username||'')}"></div>
    <div class="form-group-modal"><label>Téléphone</label><input id="uPhone" value="${esc(u?.phone||'')}"></div>
    <div class="form-group-modal"><label>Email</label><input id="uEmail" type="email" value="${esc(u?.email||'')}"></div>
    <div class="form-group-modal"><label>Rôle</label>
      <select id="uRole">
        <option ${u?.role==='Administrateur'?'selected':''}>Administrateur</option>
        <option ${u?.role==='Commercial'?'selected':''}>Commercial</option>
        <option ${u?.role==='Magasinier'?'selected':''}>Magasinier</option>
        <option ${u?.role==='Comptable'?'selected':''}>Comptable</option>
        <option ${u?.role==='Consultant'?'selected':''}>Consultant</option>
      </select>
    </div>
    <div class="form-group-modal"><label>${id?'Nouveau mot de passe (vide = inchangé)':'Mot de passe *'}</label><input id="uPassword" type="password"></div>
    <div class="form-group-modal full"><div class="section-divider">Permissions</div></div>
    <div class="form-group-modal full">
      <div class="perms-grid-modal">
        ${ALL_PERMISSIONS.map(p=>`
          <label class="perm-check">
            <input type="checkbox" id="perm_${p.key}" ${u?.permissions?.[p.key]||u?.permissions?.all?'checked':''}>
            ${p.label}
          </label>`).join('')}
      </div>
    </div>
  </div>`;
  openModal(id?'Modifier Utilisateur':'Nouvel Utilisateur', body, [
    { label:'Annuler', class:'btn-secondary', onclick:'closeModalById("modalOverlay")' },
    { label:id?'Enregistrer':'Créer', class:'btn-primary', onclick:`saveUser('${id||''}')` }
  ]);
}

function saveUser(id) {
  const name = $('uName')?.value.trim();
  const username = $('uUsername')?.value.trim();
  const password = $('uPassword')?.value;
  if (!name || !username) return showToast('Nom et identifiant requis', 'error');
  if (!id && !password) return showToast('Mot de passe requis', 'error');

  // Check username uniqueness
  const existing = DB.table('users').find(u => u.username === username && u.id !== id);
  if (existing) return showToast('Ce nom d\'utilisateur existe déjà', 'error');

  const perms = {};
  ALL_PERMISSIONS.forEach(p => { perms[p.key] = !!$(`perm_${p.key}`)?.checked; });

  const data = {
    name, username, phone: $('uPhone')?.value.trim(),
    email: $('uEmail')?.value.trim(), role: $('uRole')?.value,
    permissions: perms
  };
  if (password) data.password = password;

  if (id) { DB.update('users', id, data); logAction('Utilisateurs','Modification',`${name}`); showToast('Utilisateur mis à jour'); }
  else { DB.insert('users', data); logAction('Utilisateurs','Création',`${name}`); showToast('Utilisateur créé'); }
  closeModalById('modalOverlay');
  renderUsers();
}

function deleteUser(id) {
  if (id === 'admin') return showToast('Impossible de supprimer l\'administrateur', 'error');
  const u = DB.find('users', id);
  confirm2(`Supprimer l'utilisateur "${u?.name}" ?`, () => {
    DB.delete('users', id);
    showToast('Utilisateur supprimé', 'warning');
    renderUsers();
  });
}

/* ══════════════════════════════════════════════════════════
   18. HISTORY MODULE
═════════════════════════════════════════════════════════════ */
let histPage = 1; const HIST_PER_PAGE = 25;

function logAction(module, action, details = '') {
  DB.insert('history', {
    module, action, details,
    user: currentUser?.name || '—',
    date: now()
  });
}

function filterHistory() { histPage = 1; renderHistory(); }

function renderHistory() {
  const search = $('histSearch')?.value.toLowerCase()||'';
  const module = $('histModuleFilter')?.value||'';
  const date   = $('histDateFilter')?.value||'';

  const filtered = DB.table('history').filter(h => {
    if (module && h.module !== module) return false;
    if (date && !h.date?.startsWith(date)) return false;
    if (search && !h.action?.toLowerCase().includes(search) && !h.details?.toLowerCase().includes(search) && !h.user?.toLowerCase().includes(search)) return false;
    return true;
  }).sort((a,b)=>new Date(b.date)-new Date(a.date));

  const pages = Math.max(1,Math.ceil(filtered.length/HIST_PER_PAGE));
  const slice = filtered.slice((histPage-1)*HIST_PER_PAGE, histPage*HIST_PER_PAGE);
  const tbody = $('historyBody');

  if (!slice.length) { tbody.innerHTML=`<tr><td colspan="5"><div class="empty-state"><i class="fa-solid fa-clock-rotate-left"></i><p>Aucun historique</p></div></td></tr>`; }
  else {
    tbody.innerHTML = slice.map(h => `<tr>
      <td style="font-size:.78rem;white-space:nowrap">${fmtDT(h.date)}</td>
      <td><span class="badge badge-blue">${esc(h.user)}</span></td>
      <td><span class="badge badge-gray">${esc(h.module)}</span></td>
      <td><strong>${esc(h.action)}</strong></td>
      <td style="font-size:.82rem;color:var(--text-2)">${esc(h.details)}</td>
    </tr>`).join('');
  }
  renderPagination('historyPagination', histPage, pages, pg=>{histPage=pg;renderHistory();});
}

/* ══════════════════════════════════════════════════════════
   19. BACKUP MODULE
═════════════════════════════════════════════════════════════ */
function renderBackup() {
  // Afficher/masquer import Excel selon rôle
  var xlsxAdminZone = $('xlsxAdminZone');
  if (xlsxAdminZone) {
    xlsxAdminZone.style.display = (currentUser && currentUser.role === 'Administrateur') ? 'block' : 'none';
  }

  const data = DB.export();
  const tables = Object.keys(data);
  const info = {
    'Produits': DB.table('products').length,
    'Clients': DB.table('clients').length,
    'Devis': DB.table('quotes').length,
    'Factures': DB.table('invoices').length,
    'Règlements': DB.table('payments').length,
    'Utilisateurs': DB.table('users').length,
    'Mouvements Stock': DB.table('stockMovements').length,
    'Historique': DB.table('history').length,
    'Taille données': `${(JSON.stringify(data).length / 1024).toFixed(1)} Ko`,
    'Dernière mise à jour': fmtDT(now())
  };
  $('sysInfo').innerHTML = Object.entries(info).map(([k,v])=>
    `<span><span>${k}</span><strong>${v}</strong></span>`
  ).join('');
}

function exportBackup() {
  const data = DB.export();
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = `SOUSS-PHYTO_Backup_${new Date().toISOString().slice(0,10)}.json`;
  a.click(); URL.revokeObjectURL(url);
  showToast('Sauvegarde exportée avec succès');
  logAction('Sauvegarde', 'Export', 'Export JSON complet');
}

function importBackup(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);
      confirm2('Importer ces données ? (Les données actuelles seront remplacées)', () => {
        DB.import(data);
        showToast('Données importées avec succès');
        logAction('Sauvegarde','Import','Import JSON complet');
        renderBackup();
        checkAlerts();
      });
    } catch { showToast('Fichier JSON invalide', 'error'); }
  };
  reader.readAsText(file);
  event.target.value = '';
}

function confirmReset() {
  confirm2('⚠️ ATTENTION: Toutes les données seront effacées définitivement. Continuer ?', () => {
    localStorage.removeItem('gestrm_data');
    DB.load();
    initAuth();
    showToast('Base de données réinitialisée', 'warning');
  });
}

/* ══════════════════════════════════════════════════════════
   20. PDF GENERATION
═════════════════════════════════════════════════════════════ */
const COMPANY = { name:'Votre Société', address:'Adresse, Ville, Maroc', phone:'+212661777702', email:'contact@gestrm.ma', ice:'ICE_NUMERO', if_:'IF_NUMERO', rc:'RC_NUMERO' };

function pdfHeader(doc, title, number) {
  // Background header
  doc.setFillColor(22,163,74);
  doc.rect(0,0,210,35,'F');
  doc.setTextColor(255,255,255);
  doc.setFontSize(20); doc.setFont(undefined,'bold');
  doc.text('SOUSS-PHYTO', 14, 14);
  doc.setFontSize(9); doc.setFont(undefined,'normal');
  doc.text(COMPANY.address, 14, 21);
  doc.text(`Tél: ${COMPANY.phone}  |  ${COMPANY.email}`, 14, 27);

  doc.setFontSize(16); doc.setFont(undefined,'bold');
  doc.text(title, 196, 12, { align:'right' });
  doc.setFontSize(10); doc.setFont(undefined,'normal');
  doc.text(number, 196, 20, { align:'right' });
  doc.text(`Date: ${fmtDate(now())}`, 196, 27, { align:'right' });
  doc.setTextColor(0,0,0);
}

function generateDocPDF(type, id) {
  const table = type==='quote'?'quotes':'invoices';
  const doc_  = DB.find(table, id);
  if (!doc_) return;
  const client = DB.find('clients', doc_.clientId);

  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF();

  pdfHeader(pdf, type==='quote'?'DEVIS':'FACTURE', doc_.number);

  // Client block
  pdf.setFillColor(248,250,252);
  pdf.rect(14,40,80,28,'F');
  pdf.setFontSize(8); pdf.setFont(undefined,'bold');
  pdf.text('CLIENT', 16, 46);
  pdf.setFont(undefined,'normal');
  pdf.text(client?.company||'—', 16, 52);
  pdf.text(client?.address||'', 16, 57);
  pdf.text(`ICE: ${client?.ice||'—'}  |  Tél: ${client?.phone||'—'}`, 16, 62);

  // Line items
  const headers = [['Produit','Qté','Prix U.','Remise','TVA','Total HT']];
  const rows = (doc_.lines||[]).map(l => {
    const p = DB.find('products', l.productId);
    return [p?.name||'—', l.qty, MAD(l.price), `${l.discount||0}%`, `${l.tva||0}%`, MAD(l.total)];
  });
  pdf.autoTable({ startY:74, head:headers, body:rows, headStyles:{fillColor:[22,163,74],textColor:255,fontSize:8}, bodyStyles:{fontSize:8}, alternateRowStyles:{fillColor:[248,250,252]} });

  // Totals
  const y = pdf.lastAutoTable.finalY + 6;
  pdf.setFontSize(9);
  pdf.text(`Sous-total HT: ${MAD(doc_.subtotal)}`, 196, y, {align:'right'});
  pdf.text(`TVA: ${MAD(doc_.taxAmount)}`, 196, y+6, {align:'right'});
  if (doc_.delivery) pdf.text(`Livraison: ${MAD(doc_.delivery)}`, 196, y+12, {align:'right'});
  pdf.setFont(undefined,'bold'); pdf.setFontSize(11);
  pdf.text(`TOTAL TTC: ${MAD(doc_.total)}`, 196, y+20, {align:'right'});

  // Footer
  pdf.setFont(undefined,'normal'); pdf.setFontSize(7); pdf.setTextColor(150,150,150);
  pdf.text('Créé par INASTECH +212661777702 | SOUSS-PHYTO — Gestion Agricole Professionnelle', 105, 287, {align:'center'});

  pdf.save(`${doc_.number}.pdf`);
  logAction('PDF','Génération',`${doc_.number}`);
}

function printProductPDF(id) {
  const p = DB.find('products', id);
  if (!p) return;
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF();
  pdfHeader(pdf, 'FICHE PRODUIT', p.barcode || p.id.slice(-8).toUpperCase());

  pdf.setFontSize(14); pdf.setFont(undefined,'bold');
  pdf.text(p.name, 14, 46);
  pdf.setFont(undefined,'normal'); pdf.setFontSize(9);

  const fields = [
    ['Catégorie', p.category], ['Marque', p.brand], ['Fournisseur', p.supplier],
    ['Unité', p.unit], ['Lot', p.lot], ['Expiration', fmtDate(p.expiration)],
    ['Stock actuel', `${p.stock} ${p.unit||''}`], ['Stock minimum', `${p.stockMin||5}`],
    ['Prix achat', MAD(p.costPrice)], ['Prix vente', MAD(p.salePrice)], ['TVA', `${p.tva}%`],
  ];
  pdf.autoTable({ startY:52, body:fields, columnStyles:{0:{fontStyle:'bold',cellWidth:50}}, bodyStyles:{fontSize:9} });
  if (p.description) {
    const y = pdf.lastAutoTable.finalY + 5;
    pdf.setFontSize(8); pdf.text('Description:', 14, y);
    pdf.text(p.description, 14, y+5, { maxWidth:180 });
  }
  pdf.setFont(undefined,'normal'); pdf.setFontSize(7); pdf.setTextColor(150,150,150);
  pdf.text('Créé par INASTECH +212661777702 | SOUSS-PHYTO', 105, 287, {align:'center'});
  pdf.save(`Fiche_${p.name}.pdf`);
}

function generatePaymentPDF(id) {
  const pay = DB.find('payments', id);
  if (!pay) return;
  const c = DB.find('clients', pay.clientId);
  const inv = DB.find('invoices', pay.invoiceId);
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF();
  pdfHeader(pdf, 'REÇU DE PAIEMENT', `REG-${id.slice(-6).toUpperCase()}`);

  pdf.setFontSize(9);
  pdf.text(`Client: ${c?.company||'—'}`, 14, 45);
  pdf.text(`Facture: ${inv?.number||'—'}`, 14, 52);
  pdf.text(`Date: ${fmtDate(pay.date)}`, 14, 59);
  pdf.text(`Mode: ${pay.mode||'—'}`, 14, 66);
  if (pay.reference) pdf.text(`Référence: ${pay.reference}`, 14, 73);
  pdf.setFont(undefined,'bold'); pdf.setFontSize(16);
  pdf.setTextColor(22,163,74);
  pdf.text(`Montant: ${MAD(pay.amount)}`, 105, 90, {align:'center'});
  pdf.setTextColor(0,0,0); pdf.setFont(undefined,'normal'); pdf.setFontSize(7);
  pdf.text('Créé par INASTECH +212661777702 | SOUSS-PHYTO', 105, 287, {align:'center'});
  pdf.save(`Reglement_${id.slice(-6)}.pdf`);
}

function generateReturnPDF(id) {
  const r = DB.find('returns', id);
  if (!r) return;
  const c = DB.find('clients', r.clientId);
  const p = DB.find('products', r.productId);
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF();
  pdfHeader(pdf, 'BON DE RETOUR', `RET-${id.slice(-6).toUpperCase()}`);
  pdf.setFontSize(9);
  pdf.text(`Client: ${c?.company||'—'}`, 14, 45);
  pdf.text(`Produit: ${p?.name||'—'}`, 14, 52);
  pdf.text(`Quantité: ${r.qty}`, 14, 59);
  pdf.text(`Type: ${r.type}`, 14, 66);
  pdf.text(`Motif: ${r.reason}`, 14, 73, {maxWidth:180});
  pdf.setFont(undefined,'bold'); pdf.setFontSize(13);
  pdf.setTextColor(239,68,68);
  pdf.text(`Montant retourné: ${MAD(r.amount)}`, 105, 90, {align:'center'});
  pdf.setTextColor(0,0,0); pdf.setFont(undefined,'normal'); pdf.setFontSize(7);
  pdf.text('Créé par INASTECH +212661777702 | SOUSS-PHYTO', 105, 287, {align:'center'});
  pdf.save(`Retour_${id.slice(-6)}.pdf`);
}

/* ══════════════════════════════════════════════════════════
   21. EXCEL EXPORT
═════════════════════════════════════════════════════════════ */
function exportToExcel(rows, filename) {
  if (!rows?.length) return showToast('Aucune donnée à exporter', 'warning');
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Data');
  XLSX.writeFile(wb, `${filename}_${new Date().toISOString().slice(0,10)}.xlsx`);
  showToast('Export Excel réussi');
}

/* ══════════════════════════════════════════════════════════
   22. MODAL SYSTEM
═════════════════════════════════════════════════════════════ */
function openModal(title, bodyHtml, buttons = []) {
  $('modalTitle').textContent = title;
  $('modalBody').innerHTML = bodyHtml;
  $('modalFooter').innerHTML = buttons.map(b =>
    `<button class="${b.class}" onclick="${b.onclick}">${b.label}</button>`
  ).join('');
  $('modalOverlay').classList.remove('hidden');
}

function closeModalById(id) { $(id)?.classList.add('hidden'); }

function closeModal(e) {
  if (e.target === $('modalOverlay')) closeModalById('modalOverlay');
}

function confirm2(message, onConfirm) {
  $('confirmMessage').innerHTML = `<p style="font-size:.9rem;color:var(--text-2)">${esc(message)}</p>`;
  const btn = $('confirmBtn');
  btn.onclick = () => { closeModalById('confirmOverlay'); onConfirm(); };
  $('confirmOverlay').classList.remove('hidden');
}

/* ══════════════════════════════════════════════════════════
   23. PAGINATION HELPER
═════════════════════════════════════════════════════════════ */
function renderPagination(containerId, current, total, onPage) {
  const wrap = $(containerId);
  if (!wrap) return;
  if (total <= 1) { wrap.innerHTML = ''; return; }

  let html = `<button class="page-btn" ${current===1?'disabled':''} onclick="(${onPage})(${current-1})"><i class="fa-solid fa-chevron-left"></i></button>`;
  for (let i=1;i<=total;i++) {
    if (total<=7||i===1||i===total||Math.abs(i-current)<=1) {
      html += `<button class="page-btn${i===current?' active':''}" onclick="(${onPage})(${i})">${i}</button>`;
    } else if (Math.abs(i-current)===2) { html += `<span class="page-btn" style="border:none">…</span>`; }
  }
  html += `<button class="page-btn" ${current===total?'disabled':''} onclick="(${onPage})(${current+1})"><i class="fa-solid fa-chevron-right"></i></button>`;
  wrap.innerHTML = html;
}

/* ══════════════════════════════════════════════════════════
   24. THEME TOGGLE
═════════════════════════════════════════════════════════════ */
function toggleTheme() {
  const html = document.documentElement;
  const isDark = html.getAttribute('data-theme') === 'dark';
  html.setAttribute('data-theme', isDark ? 'light' : 'dark');
  $('themeIcon').className = isDark ? 'fa-solid fa-moon' : 'fa-solid fa-sun';
  localStorage.setItem('gestrm_theme', isDark ? 'light' : 'dark');
}

function loadTheme() {
  const saved = localStorage.getItem('gestrm_theme');
  if (saved === 'dark') {
    document.documentElement.setAttribute('data-theme','dark');
    $('themeIcon').className = 'fa-solid fa-sun';
  }
}

/* ══════════════════════════════════════════════════════════
   25. KEYBOARD SHORTCUTS
═════════════════════════════════════════════════════════════ */
function initKeyboardShortcuts() {
  document.addEventListener('keydown', e => {
    if (e.ctrlKey || e.metaKey) {
      switch(e.key.toLowerCase()) {
        case 'd': e.preventDefault(); navigateTo('dashboard'); break;
        case 'p': e.preventDefault(); navigateTo('products'); break;
        case 'c': e.preventDefault(); navigateTo('clients'); break;
        case 'f': e.preventDefault(); navigateTo('invoices'); break;
        case 'q': e.preventDefault(); navigateTo('quotes'); break;
        case '/': e.preventDefault(); $('globalSearch')?.focus(); break;
      }
    }
    if (e.key === 'Escape') {
      closeModalById('modalOverlay');
      closeModalById('confirmOverlay');
      $('notifPanel')?.classList.add('hidden');
      $('searchResults').innerHTML='';
    }
    if (e.key === '?') {
      $('shortcutHint')?.classList.toggle('hidden');
      setTimeout(()=>$('shortcutHint')?.classList.add('hidden'), 4000);
    }
  });
}

/* ══════════════════════════════════════════════════════════
   26. SEED DATA (first run)
═════════════════════════════════════════════════════════════ */
function seedDemoData() {
  if (DB.table('products').length > 0) return; // Already seeded

  const products = [
    { name:'Herbicide Total XL', barcode:'HRB001', category:'Phytosanitaire', brand:'Bayer', supplier:'AgroMaroc', lot:'LOT-2024-001', expiration:'2025-12-31', costPrice:85, salePrice:120, tva:7, stock:150, stockMin:20, unit:'L', description:'Herbicide systémique à large spectre' },
    { name:'NPK 15-15-15 Premium', barcode:'ENG001', category:'Engrais', brand:'Haifa', supplier:'FertiMaroc', lot:'LOT-2024-002', expiration:'2026-06-30', costPrice:45, salePrice:68, tva:0, stock:800, stockMin:100, unit:'kg', description:'Engrais équilibré granulé' },
    { name:'Fongicide Mancozèbe 80%', barcode:'FON001', category:'Phytosanitaire', brand:'Syngenta', supplier:'PhytoSud', lot:'LOT-2024-003', expiration:'2025-03-15', costPrice:120, salePrice:180, tva:7, stock:8, stockMin:15, unit:'kg', description:'Fongicide préventif et curatif' },
    { name:'Goutteur AutoRégulant 4L/h', barcode:'GOU001', category:'Goutteurs', brand:'Netafim', supplier:'IrriTech', lot:'LOT-2024-004', costPrice:2.5, salePrice:4, tva:20, stock:5000, stockMin:500, unit:'Pièce' },
    { name:'Plastique Serre 200µ UV', barcode:'PLS001', category:'Plastique serre', brand:'Ginegar', supplier:'PlastAgro', lot:'LOT-2024-005', costPrice:280, salePrice:420, tva:20, stock:25, stockMin:5, unit:'Rouleau' },
    { name:'Ficelle Polypropylène 5kg', barcode:'FIC001', category:'Ficelle', brand:'Cordexagri', supplier:'TextileAgri', lot:'LOT-2024-006', costPrice:35, salePrice:55, tva:20, stock:120, stockMin:30, unit:'Kg' },
    { name:'Insecticide Spinosad', barcode:'INS001', category:'Phytosanitaire', brand:'Dow', supplier:'PhytoSud', lot:'LOT-2024-007', expiration:'2024-11-30', costPrice:95, salePrice:150, tva:7, stock:0, stockMin:10, unit:'L' }
  ];
  products.forEach(p => DB.insert('products', p));

  const clients = [
    { company:'Coopérative Atlas Fruits', manager:'Mohammed Alami', phone:'0661234567', email:'atlas@fruits.ma', address:'Route de Fès, Meknès', city:'Meknès', ice:'001234567890001', discount:5 },
    { company:'Ferme Moderne Souss', manager:'Fatima Benali', phone:'0669876543', email:'souss@ferme.ma', address:'Km 12 Route d\'Agadir', city:'Taroudant', ice:'002345678900002', discount:10 },
    { company:'SARL AgriPlus', manager:'Hassan Tazi', phone:'0662345678', city:'Casablanca', ice:'003456789000003', discount:3 }
  ];
  clients.forEach(c => DB.insert('clients', c));

  showToast('Données de démonstration chargées', 'info');
}

/* ══════════════════════════════════════════════════════════
   27. BOOTSTRAP — appelé depuis index.html après chargement des libs
═════════════════════════════════════════════════════════════ */
/* ══════════════════════════════════════════════════════════
   IMPORT EXCEL — Admin uniquement
═════════════════════════════════════════════════════════════ */
function importExcelProducts(event) {
  var file = event.target.files[0];
  if (!file) return;
  if (!window.XLSX) return showToast('Librairie Excel non chargée', 'error');
  var reader = new FileReader();
  reader.onload = function(e) {
    try {
      var wb = XLSX.read(e.target.result, {type:'binary'});
      var ws = wb.Sheets[wb.SheetNames[0]];
      var rows = XLSX.utils.sheet_to_json(ws);
      var count = 0;
      rows.forEach(function(row) {
        var name = (row['Nom'] || row['name'] || row['Produit'] || '').toString().trim();
        if (!name) return;
        DB.insert('products', {
          name: name,
          barcode: (row['Code barre'] || row['barcode'] || '').toString().trim(),
          category: (row['Catégorie'] || row['category'] || 'Phytosanitaire').toString().trim(),
          brand: (row['Marque'] || row['brand'] || '').toString().trim(),
          supplier: (row['Fournisseur'] || row['supplier'] || '').toString().trim(),
          unit: (row['Unité'] || row['unit'] || 'kg').toString().trim(),
          lot: (row['Lot'] || row['lot'] || '').toString().trim(),
          expiration: (row['Expiration'] || row['expiration'] || null),
          costPrice: parseFloat(row['Prix achat'] || row['costPrice'] || 0),
          salePrice: parseFloat(row['Prix vente'] || row['salePrice'] || 0),
          tva: parseFloat(row['TVA'] || row['tva'] || 20),
          stock: parseInt(row['Stock'] || row['stock'] || 0),
          stockMin: parseInt(row['Stock min'] || row['stockMin'] || 5),
          description: (row['Description'] || row['description'] || '').toString().trim()
        });
        count++;
      });
      logAction('Import Excel','Produits', count + ' produits importés');
      showToast(count + ' produits importés avec succès');
      renderBackup();
    } catch(err) {
      showToast('Erreur fichier Excel: ' + err.message, 'error');
    }
  };
  reader.readAsBinaryString(file);
  event.target.value = '';
}

function importExcelClients(event) {
  var file = event.target.files[0];
  if (!file) return;
  if (!window.XLSX) return showToast('Librairie Excel non chargée', 'error');
  var reader = new FileReader();
  reader.onload = function(e) {
    try {
      var wb = XLSX.read(e.target.result, {type:'binary'});
      var ws = wb.Sheets[wb.SheetNames[0]];
      var rows = XLSX.utils.sheet_to_json(ws);
      var count = 0;
      rows.forEach(function(row) {
        var company = (row['Société'] || row['company'] || row['Nom'] || '').toString().trim();
        if (!company) return;
        DB.insert('clients', {
          company: company,
          manager: (row['Responsable'] || row['manager'] || '').toString().trim(),
          phone: (row['Téléphone'] || row['phone'] || '').toString().trim(),
          email: (row['Email'] || row['email'] || '').toString().trim(),
          address: (row['Adresse'] || row['address'] || '').toString().trim(),
          city: (row['Ville'] || row['city'] || '').toString().trim(),
          ice: (row['ICE'] || row['ice'] || '').toString().trim(),
          if_: (row['IF'] || '').toString().trim(),
          rc: (row['RC'] || '').toString().trim(),
          rib: (row['RIB'] || row['rib'] || '').toString().trim(),
          bank: (row['Banque'] || row['bank'] || '').toString().trim(),
          discount: parseFloat(row['Remise'] || row['discount'] || 0)
        });
        count++;
      });
      logAction('Import Excel','Clients', count + ' clients importés');
      showToast(count + ' clients importés avec succès');
      renderBackup();
    } catch(err) {
      showToast('Erreur fichier Excel: ' + err.message, 'error');
    }
  };
  reader.readAsBinaryString(file);
  event.target.value = '';
}

function downloadExcelTemplate(type) {
  var headers, filename;
  if (type === 'products') {
    headers = [['Nom','Code barre','Catégorie','Marque','Fournisseur','Unité','Lot','Expiration','Prix achat','Prix vente','TVA','Stock','Stock min','Description']];
    filename = 'Template_Produits_SOUSS-PHYTO.xlsx';
  } else {
    headers = [['Société','Responsable','Téléphone','Email','Adresse','Ville','ICE','IF','RC','RIB','Banque','Remise']];
    filename = 'Template_Clients_SOUSS-PHYTO.xlsx';
  }
  var ws = XLSX.utils.aoa_to_sheet(headers);
  var wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Data');
  XLSX.writeFile(wb, filename);
  showToast('Template téléchargé');
}

/* ══════════════════════════════════════════════════════════
   IMPRESSION ÉTIQUETTES PRODUITS (QR / Barcode)
═════════════════════════════════════════════════════════════ */
function openLabelModal() {
  var products = DB.table('products');
  var body = '<div style="margin-bottom:1rem">' +
    '<div class="form-group-modal" style="margin-bottom:.8rem">' +
      '<label>Sélectionner un ou plusieurs produits</label>' +
      '<select id="labelProduct" multiple style="height:160px;width:100%">' +
        products.map(function(p){
          return '<option value="'+p.id+'">'+esc(p.name)+' ('+esc(p.barcode||p.id.slice(-6))+')</option>';
        }).join('') +
      '</select>' +
      '<span style="font-size:.75rem;color:var(--text-3)">Maintenez Ctrl pour sélection multiple</span>' +
    '</div>' +
    '<div class="form-grid">' +
      '<div class="form-group-modal"><label>Nb étiquettes par produit</label>' +
        '<input id="labelQty" type="number" value="1" min="1" max="100"></div>' +
      '<div class="form-group-modal"><label>Taille étiquette</label>' +
        '<select id="labelSize">' +
          '<option value="small">Petite (6×4 cm)</option>' +
          '<option value="medium" selected>Moyenne (9×6 cm)</option>' +
          '<option value="large">Grande (10×7 cm)</option>' +
        '</select></div>' +
    '</div>' +
  '</div>' +
  '<div id="labelPreviewZone" style="margin-top:.5rem"></div>';

  openModal('Impression Étiquettes Produits', body, [
    { label:'Annuler', class:'btn-secondary', onclick:'closeModalById("modalOverlay")' },
    { label:'Aperçu étiquettes', class:'btn-secondary', onclick:'previewLabels()' },
    { label:'Imprimer', class:'btn-primary', onclick:'printLabels()' }
  ]);
}

function getSelectedLabelProducts() {
  var sel = $('labelProduct');
  if (!sel) return [];
  var ids = Array.from(sel.selectedOptions).map(function(o){return o.value;});
  return ids.map(function(id){return DB.find('products',id);}).filter(Boolean);
}

function previewLabels() {
  var products = getSelectedLabelProducts();
  if (!products.length) return showToast('Sélectionnez au moins un produit','warning');
  var qty = parseInt(($('labelQty')||{value:1}).value)||1;
  var size = ($('labelSize')||{value:'medium'}).value;
  var dims = {small:{w:'150px',h:'100px',fs:'10px'}, medium:{w:'220px',h:'150px',fs:'12px'}, large:{w:'260px',h:'185px',fs:'13px'}};
  var d = dims[size]||dims.medium;
  var zone = $('labelPreviewZone');
  if (!zone) return;
  var labels = [];
  products.forEach(function(p) {
    for (var i=0;i<Math.min(qty,3);i++) {
      labels.push(
        '<div class="label-card" style="'+
          'display:inline-flex;flex-direction:column;align-items:center;justify-content:space-between;'+
          'width:'+d.w+';height:'+d.h+';border:2px solid #16a34a;border-radius:8px;padding:8px;'+
          'margin:6px;background:#fff;box-shadow:0 2px 8px rgba(0,0,0,.15);vertical-align:top;'+
          'font-family:monospace;font-size:'+d.fs+';">' +
          '<div style="font-weight:800;font-size:calc('+d.fs+' + 1px);color:#166534;text-align:center;line-height:1.2">'+esc(p.name)+'</div>' +
          '<div id="qr_'+p.id+'_'+i+'" style="margin:4px 0"></div>' +
          '<div style="font-size:calc('+d.fs+' - 1px);color:#475569;text-align:center">' +
            'Code: <strong>'+esc(p.barcode||p.id.slice(-8).toUpperCase())+'</strong>' +
          '</div>' +
          '<div style="font-size:calc('+d.fs+' - 1px);color:#475569;text-align:center">' +
            'Prix: <strong style="color:#16a34a">'+MAD(p.salePrice)+'</strong>' +
            (p.lot?' | Lot: '+esc(p.lot):'') +
          '</div>' +
          '<div style="font-size:.65rem;color:#94a3b8;font-style:italic">SOUSS-PHYTO</div>' +
        '</div>'
      );
    }
  });
  zone.innerHTML = '<div style="background:var(--bg3);border-radius:8px;padding:1rem;max-height:300px;overflow-y:auto">'+labels.join('')+'</div>';
  // Generate QR codes
  setTimeout(function() {
    products.forEach(function(p) {
      for (var i=0;i<Math.min(qty,3);i++) {
        var el = $('qr_'+p.id+'_'+i);
        if (el && window.QRCode) {
          el.innerHTML = '';
          try { new QRCode(el, {text: p.barcode||p.id, width:60, height:60, colorDark:'#166534'}); } catch(e){}
        }
      }
    });
  }, 100);
}

function printLabels() {
  var products = getSelectedLabelProducts();
  if (!products.length) return showToast('Sélectionnez au moins un produit','warning');
  var qty = parseInt(($('labelQty')||{value:1}).value)||1;
  var size = ($('labelSize')||{value:'medium'}).value;
  var dims = {small:{w:'150px',h:'100px'}, medium:{w:'220px',h:'150px'}, large:{w:'260px',h:'185px'}};
  var d = dims[size]||dims.medium;

  var win = window.open('','_blank','width=900,height=700');
  if (!win) return showToast('Autorisez les popups pour imprimer','warning');
  var labels = '';
  var qrScripts = '';
  products.forEach(function(p) {
    for (var i=0;i<qty;i++) {
      var code = p.barcode || p.id.slice(-8).toUpperCase();
      labels +=
        '<div class="label" id="lbl_'+p.id+'_'+i+'">' +
          '<div class="lbl-name">'+escHTML(p.name)+'</div>' +
          '<div id="qrc_'+p.id+'_'+i+'" class="lbl-qr"></div>' +
          '<div class="lbl-code">'+escHTML(code)+'</div>' +
          '<div class="lbl-price">'+MAD(p.salePrice)+(p.lot?' | Lot: '+escHTML(p.lot):'')+'</div>' +
          '<div class="lbl-brand">SOUSS-PHYTO'+(p.category?' — '+escHTML(p.category):'')+'</div>' +
        '</div>';
      qrScripts += 'try{new QRCode(document.getElementById("qrc_'+p.id+'_'+i+'"),{text:"'+code+'",width:70,height:70,colorDark:"#166534"});}catch(e){}\n';
    }
  });

  function escHTML(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}

  win.document.write('<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Étiquettes SOUSS-PHYTO</title>'+
    '<script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"><\/script>'+
    '<style>'+
      '*{box-sizing:border-box;margin:0;padding:0;}'+
      'body{font-family:Arial,sans-serif;background:#f8f8f8;padding:10px;}'+
      '.labels-wrap{display:flex;flex-wrap:wrap;gap:8px;}'+
      '.label{width:'+d.w+';height:'+d.h+';border:2px solid #16a34a;border-radius:8px;'+
        'padding:8px 6px;background:#fff;display:flex;flex-direction:column;'+
        'align-items:center;justify-content:space-between;page-break-inside:avoid;}'+
      '.lbl-name{font-weight:800;font-size:11px;color:#166534;text-align:center;line-height:1.2;max-width:100%}'+
      '.lbl-qr{display:flex;justify-content:center;align-items:center;}'+
      '.lbl-qr img,.lbl-qr canvas{max-width:70px!important;max-height:70px!important;}'+
      '.lbl-code{font-family:monospace;font-size:9px;color:#334155;text-align:center;}'+
      '.lbl-price{font-size:9px;color:#475569;text-align:center;font-weight:600;}'+
      '.lbl-brand{font-size:8px;color:#94a3b8;font-style:italic;}'+
      '@media print{body{padding:0;background:#fff}.labels-wrap{gap:4px;}}'+
    '</style></head><body>'+
    '<div style="text-align:center;margin-bottom:10px;font-size:12px;color:#666">'+
      'SOUSS-PHYTO — '+products.length+' produit(s) × '+qty+' étiquette(s)'+
      '<button onclick="window.print()" style="margin-left:12px;padding:4px 12px;background:#16a34a;color:#fff;border:none;border-radius:4px;cursor:pointer">🖨 Imprimer</button>'+
    '</div>'+
    '<div class="labels-wrap">'+labels+'</div>'+
    '<script>window.onload=function(){'+qrScripts+'setTimeout(function(){},500);};<\/script>'+
    '</body></html>');
  win.document.close();
  logAction('Étiquettes','Impression', products.length + ' produit(s)');
}

function gestrmInit() {
  try {
    loadTheme();
    DB.load();
    seedDemoData();
    initAuth();

    // Fermer résultats de recherche au clic extérieur
    document.addEventListener('click', function(e) {
      if (!e.target.closest('.search-global')) {
        var sr = $('searchResults');
        if (sr) { sr.innerHTML = ''; sr.classList.add('hidden'); }
      }
      if (!e.target.closest('.notif-btn') && !e.target.closest('#notifPanel')) {
        var np = $('notifPanel');
        if (np) np.classList.add('hidden');
      }
    });

    // Touche Entrée sur le login
    var lp = $('loginPassword');
    var lu = $('loginUsername');
    if (lp) lp.addEventListener('keydown', function(e){ if(e.key==='Enter') doLogin(); });
    if (lu) lu.addEventListener('keydown', function(e){ if(e.key==='Enter') { var lp2=$('loginPassword'); if(lp2) lp2.focus(); } });

    // Touche Echap ferme les modals
    document.addEventListener('keydown', function(e){
      if(e.key==='Escape'){
        closeModalById('modalOverlay');
        closeModalById('confirmOverlay');
        var np=$('notifPanel'); if(np) np.classList.add('hidden');
      }
    });

  } catch(err) {
    console.error('Erreur initialisation SOUSS-PHYTO:', err);
  }
}
