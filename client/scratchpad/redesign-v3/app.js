/* Clipbord storefront prototype: shared data, chrome (header, menu, search, bag, footer,
   log in) and the per-page setup. Bag, bookmarks, the signed-in user and the light/dark
   choice live in localStorage so they carry across pages (prototype only: the real site
   keeps these on the server). Every page sets <body data-page="..."> and includes this. */
(() => {
  const QS = new URLSearchParams(location.search);
  const STATIC = QS.has('static');
  if (STATIC && QS.get('vh')) document.documentElement.style.setProperty('--svh', (+QS.get('vh') / 100) + 'px');
  const REDUCE = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const PAGE = document.body.dataset.page;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const inr = (n) => '₹' + n.toLocaleString('en-IN');
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const store = {
    get(k, d) { try { const v = localStorage.getItem('cb3-' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('cb3-' + k, JSON.stringify(v)); } catch (e) {} },
  };

  /* ---------- Data ---------- */
  const IMG = '/scratchpad/redesign/img/';
  const CL = 'https://res.cloudinary.com/dmxf5exhr/image/upload/';
  const card = (v, file) => `${CL}f_auto,q_auto,w_800/${v}/clipBoard/product-images/${file}`;
  const JOG = 'v1790688386/clipBoard/product-images/uzjktcl7hptklik5u6v2.png';
  const CATS = {
    tshirts: { label: 'T-shirts', word: 'Tees', tone: 1, img: IMG + 'tee-back.jpg', pos: '50% 38%' },
    sweatshirts: { label: 'Sweatshirts', word: 'Hoods', tone: 2, img: IMG + 'hoodie-back.jpg', pos: '50% 34%' },
    joggers: { label: 'Joggers', word: 'Jogs', tone: 3, img: `${CL}c_crop,h_0.82,g_north/c_fill,ar_4:5,g_center,w_900,f_auto,q_auto/${JOG}`, pos: '50% 50%' },
  };
  const PRODUCTS = [
    { id: 'queue-the-cause-hoodie', name: 'Queue the Cause Hoodie', price: 2599, cat: 'sweatshirts', colour: 'Cream', order: 1,
      front: IMG + 'hoodie-back.jpg', back: IMG + 'hoodie-front.jpg', big: [IMG + 'hoodie-back.jpg', IMG + 'hoodie-front.jpg'],
      desc: 'Queue the Cause in red copperplate script down the back of a cream hoodie, with a pool cue running beneath it. The ADHD pool balls sit on the chest.',
      details: 'Cream pullover hoodie with a kangaroo pocket and ribbed cuffs and hem. Back: Queue the Cause script with cue. Front: ADHD pool-ball print.' },
    { id: 'adhd-pool-ball-hoodie', name: 'ADHD Pool Ball Hoodie', price: 2499, cat: 'sweatshirts', colour: 'Cream', order: 2,
      front: card('v1791045517', 'kz9ekm5nrf5lau34y4yr.jpg'), back: card('v1791045518', 'hmuakitbn63bhv949tqi.jpg'), big: [IMG + 'hoodie-front.jpg', IMG + 'hoodie-back.jpg'],
      desc: 'Four pool balls spell ADHD across the chest in green, red, orange and blue. On the back, Queue the Cause in red script with a pool cue.',
      details: 'Cream pullover hoodie with a kangaroo pocket and ribbed cuffs and hem. Clipbord script at the front hem.' },
    { id: 'adhd-pool-ball-tee', name: 'ADHD Pool Ball Tee', price: 999, cat: 'tshirts', colour: 'Black', order: 3,
      front: card('v1791045515', 'wogrqv5ymxq67izpxoy9.jpg'), back: card('v1791045516', 'uvlkk8bxe9o595jkv8lo.jpg'), big: [IMG + 'tee-front.jpg', IMG + 'tee-back.jpg'],
      desc: 'An all-black tee with A, D, H and D racked up in pool balls across the chest. Cue the Chaos runs down the back.',
      details: 'Black crew-neck tee with dropped shoulders. Front: ADHD pool-ball print. Back: Cue the Chaos script with a pool cue.' },
    { id: 'cue-the-chaos-tee', name: 'Cue the Chaos Tee', price: 1099, cat: 'tshirts', colour: 'Black', order: 4,
      front: card('v1791045516', 'uvlkk8bxe9o595jkv8lo.jpg'), back: card('v1791045515', 'wogrqv5ymxq67izpxoy9.jpg'), big: [IMG + 'tee-back.jpg', IMG + 'tee-front.jpg'],
      desc: 'Cue the Chaos in red copperplate script across the back of a black tee, finished with a pool cue. The ADHD balls sit on the front.',
      details: 'Black crew-neck tee with dropped shoulders. Back: Cue the Chaos script with a pool cue. Front: ADHD pool-ball print.' },
    { id: 'night-run-joggers', name: 'Night Run Joggers', price: 1399, cat: 'joggers', colour: 'Black', order: 5,
      front: `${CL}c_crop,h_0.82,g_north/c_fill,ar_4:5,g_center,w_800,f_auto,q_auto/${JOG}`, back: null,
      big: [`${CL}c_crop,h_0.82,g_north/c_fill,ar_1140:1800,g_center,w_1200,f_auto,q_auto/${JOG}`],
      desc: 'Black joggers with a red stripe down each leg, an elastic waist with drawcord and cuffed ankles.',
      details: 'Black joggers with red side stripes, drawcord waist and cuffed hems.' },
  ];
  const byId = (id) => PRODUCTS.find((p) => p.id === id);
  const inCat = (c) => PRODUCTS.filter((p) => p.cat === c);
  const styles = (n) => `${n} ${n === 1 ? 'style' : 'styles'}`;
  const pieces = (n) => `${n} ${n === 1 ? 'piece' : 'pieces'}`;
  const thumb = (p) => (p.front.includes('w_800') ? p.front.replace('w_800', 'w_240') : p.front);

  /* ---------- Icons (Phosphor regular) ---------- */
  const ICONS = {
    search: 'M229.66,218.34l-50.07-50.06a88.11,88.11,0,1,0-11.31,11.31l50.06,50.07a8,8,0,0,0,11.32-11.32ZM40,112a72,72,0,1,1,72,72A72.08,72.08,0,0,1,40,112Z',
    bookmark: 'M184,32H72A16,16,0,0,0,56,48V224a8,8,0,0,0,12.24,6.78L128,193.43l59.77,37.35A8,8,0,0,0,200,224V48A16,16,0,0,0,184,32Zm0,177.57-51.77-32.35a8,8,0,0,0-8.48,0L72,209.57V48H184Z',
    'bookmark-fill': 'M200,48V224a8,8,0,0,1-12.24,6.78L128,193.43,68.23,230.78A8,8,0,0,1,56,224V48A16,16,0,0,1,72,32H184A16,16,0,0,1,200,48Z',
    list: 'M224,128a8,8,0,0,1-8,8H40a8,8,0,0,1,0-16H216A8,8,0,0,1,224,128ZM40,72H216a8,8,0,0,0,0-16H40a8,8,0,0,0,0,16ZM216,184H40a8,8,0,0,0,0,16H216a8,8,0,0,0,0-16Z',
    x: 'M205.66,194.34a8,8,0,0,1-11.32,11.32L128,139.31,61.66,205.66a8,8,0,0,1-11.32-11.32L116.69,128,50.34,61.66A8,8,0,0,1,61.66,50.34L128,116.69l66.34-66.35a8,8,0,0,1,11.32,11.32L139.31,128Z',
    plus: 'M224,128a8,8,0,0,1-8,8H136v80a8,8,0,0,1-16,0V136H40a8,8,0,0,1,0-16h80V40a8,8,0,0,1,16,0v80h80A8,8,0,0,1,224,128Z',
    minus: 'M224,128a8,8,0,0,1-8,8H40a8,8,0,0,1,0-16H216A8,8,0,0,1,224,128Z',
    arrow: 'M221.66,133.66l-72,72a8,8,0,0,1-11.32-11.32L196.69,136H40a8,8,0,0,1,0-16H196.69L138.34,61.66a8,8,0,0,1,11.32-11.32l72,72A8,8,0,0,1,221.66,133.66Z',
    user: 'M230.92,212c-15.23-26.33-38.7-45.21-66.09-54.16a72,72,0,1,0-73.66,0C63.78,166.78,40.31,185.66,25.08,212a8,8,0,1,0,13.85,8c18.84-32.56,52.14-52,89.07-52s70.23,19.44,89.07,52a8,8,0,1,0,13.85-8ZM72,96a56,56,0,1,1,56,56A56.06,56.06,0,0,1,72,96Z',
    logout: 'M120,216a8,8,0,0,1-8,8H48a8,8,0,0,1-8-8V40a8,8,0,0,1,8-8h64a8,8,0,0,1,0,16H56V208h56A8,8,0,0,1,120,216Zm109.66-93.66-40-40a8,8,0,0,0-11.32,11.32L204.69,120H112a8,8,0,0,0,0,16h92.69l-26.35,26.34a8,8,0,0,0,11.32,11.32l40-40A8,8,0,0,0,229.66,122.34Z',
    caret: 'M213.66,101.66l-80,80a8,8,0,0,1-11.32,0l-80-80A8,8,0,0,1,53.66,90.34L128,164.69l74.34-74.35a8,8,0,0,1,11.32,11.32Z',
    bag: 'M216,40H40A16,16,0,0,0,24,56V200a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V56A16,16,0,0,0,216,40Zm0,160H40V56H216V200ZM176,88a48,48,0,0,1-96,0,8,8,0,0,1,16,0,32,32,0,0,0,64,0,8,8,0,0,1,16,0Z',
    moon: 'M233.54,142.23a8,8,0,0,0-8-2,88.08,88.08,0,0,1-109.8-109.8,8,8,0,0,0-10-10,104.84,104.84,0,0,0-52.91,37A104,104,0,0,0,136,224a103.09,103.09,0,0,0,62.52-20.88,104.84,104.84,0,0,0,37-52.91A8,8,0,0,0,233.54,142.23ZM188.9,190.34A88,88,0,0,1,65.66,67.11a89,89,0,0,1,31.4-26A106,106,0,0,0,96,56,104.11,104.11,0,0,0,200,160a106,106,0,0,0,14.92-1.06A89,89,0,0,1,188.9,190.34Z',
    sun: 'M120,40V16a8,8,0,0,1,16,0V40a8,8,0,0,1-16,0Zm72,88a64,64,0,1,1-64-64A64.07,64.07,0,0,1,192,128Zm-16,0a48,48,0,1,0-48,48A48.05,48.05,0,0,0,176,128ZM58.34,69.66A8,8,0,0,0,69.66,58.34l-16-16A8,8,0,0,0,42.34,53.66Zm0,116.68-16,16a8,8,0,0,0,11.32,11.32l16-16a8,8,0,0,0-11.32-11.32ZM192,72a8,8,0,0,0,5.66-2.34l16-16a8,8,0,0,0-11.32-11.32l-16,16A8,8,0,0,0,192,72Zm5.66,114.34a8,8,0,0,0-11.32,11.32l16,16a8,8,0,0,0,11.32-11.32ZM48,128a8,8,0,0,0-8-8H16a8,8,0,0,0,0,16H40A8,8,0,0,0,48,128Zm80,80a8,8,0,0,0-8,8v24a8,8,0,0,0,16,0V216A8,8,0,0,0,128,208Zm112-88H216a8,8,0,0,0,0,16h24a8,8,0,0,0,0-16Z',
  };
  const ic = (name, cls = '') => `<svg class="i ${cls}" aria-hidden="true"><use href="#i-${name}"/></svg>`;
  document.body.insertAdjacentHTML('afterbegin', `<svg width="0" height="0" style="position:absolute" aria-hidden="true">${Object.entries(ICONS).map(([k, d]) => `<symbol id="i-${k}" viewBox="0 0 256 256"><path d="${d}"/></symbol>`).join('')}</svg>`);

  /* ---------- Light and dark ---------- */
  function setMode(theme, save = true) {
    document.documentElement.dataset.theme = theme;
    if (save) store.set('mode', theme);
    $$('.mode-btn').forEach((b) => {
      const dark = theme === 'oxblood';
      b.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
      b.setAttribute('aria-pressed', dark);
    });
    window.dispatchEvent(new CustomEvent('cb:theme', { detail: theme }));
  }
  const toggleMode = () => setMode(document.documentElement.dataset.theme === 'oxblood' ? 'paper' : 'oxblood');

  /* ---------- Chrome ---------- */
  const NAV = [
    { href: 'index.html#new', label: 'New drop', key: 'new' },
    { href: 'category.html?c=tshirts', label: 'T-shirts', key: 'tshirts' },
    { href: 'category.html?c=sweatshirts', label: 'Sweatshirts', key: 'sweatshirts' },
    { href: 'category.html?c=joggers', label: 'Joggers', key: 'joggers' },
  ];
  const here = PAGE === 'category' ? QS.get('c') : PAGE === 'product' ? (byId(QS.get('id')) || {}).cat : null;
  const logoSvg = (id) => `<svg ${id ? `id="${id}"` : ''} viewBox="0 0 1000 642.7" aria-hidden="true"><path class="logo-path" fill="currentColor" fill-rule="evenodd" d=""/></svg>`;

  $('#chrome-header').outerHTML = `
    <a class="skip" href="#main">Skip to content</a>
    <header class="site-header" id="siteHeader">
      <div class="hdr-left">
        <button class="icon-btn menu-btn" id="menuBtn" aria-label="Open menu" aria-controls="sheet" aria-expanded="false">${ic('list')}</button>
        <nav class="hdr-nav" aria-label="Primary"><ul>${NAV.map((n) => `<li><a href="${n.href}" ${n.key === here ? 'aria-current="page"' : ''}>${n.label}</a></li>`).join('')}</ul></nav>
      </div>
      <a class="hdr-logo" href="index.html" aria-label="Clipbord home">${logoSvg('navLogo')}</a>
      <div class="hdr-right">
        <button class="icon-btn hdr-search" id="searchBtn" type="button" aria-label="Search" aria-controls="search" aria-expanded="false">${ic('search')}</button>
        <button class="icon-btn hdr-mode mode-btn" type="button" aria-pressed="false">${ic('moon', 'moon')}${ic('sun', 'sun')}</button>
        <a class="icon-btn hdr-saved" href="bookmarks.html" id="savedLink" aria-label="Bookmarks, 0 items">${ic('bookmark')}<span class="count" id="savedCount"></span></a>
        <div class="account" id="account"></div>
        <button class="bag-btn" id="bagBtn" type="button" aria-label="Bag, 0 items" aria-controls="bag" aria-expanded="false"><span class="lbl">Bag</span><span class="bag-num" id="bagNum">0</span></button>
      </div>
    </header>
    <div class="search" id="search" role="search" hidden>
      <div class="search-row">
        <label class="sr-only" for="q">Search the shop</label>
        <input id="q" type="search" placeholder="Search tees, sweatshirts and joggers" autocomplete="off">
        <button class="icon-btn" id="searchClose" type="button" aria-label="Close search">${ic('x')}</button>
      </div>
      <div class="results" id="results" aria-live="polite"></div>
    </div>
    <div class="sheet" id="sheet" role="dialog" aria-modal="true" aria-label="Menu">
      <div class="sheet-top">
        <button class="icon-btn" id="sheetClose" aria-label="Close menu">${ic('x')}</button>
        <div><button class="icon-btn" type="button" data-open-search aria-label="Search">${ic('search')}</button><button class="icon-btn mode-btn" type="button" aria-pressed="false">${ic('moon', 'moon')}${ic('sun', 'sun')}</button></div>
      </div>
      <ul class="display">
        ${NAV.map((n) => `<li><a href="${n.href}">${n.label}</a></li>`).join('')}
        <li><a href="#footer">About</a></li>
      </ul>
      <div class="sheet-util"><a class="btn btn-line" href="bookmarks.html">${ic('bookmark')} Bookmarks</a><span id="sheetAccount"></span></div>
      <p class="sheet-foot">clipbord.in@gmail.com</p>
    </div>`;

  $('#chrome-footer').outerHTML = `
    <footer class="site-footer" id="footer">
      <p class="foot-lead">Sizing, an order or a collab idea? Write to us.</p>
      <a class="foot-mail display" href="mailto:clipbord.in@gmail.com">clipbord.in@gmail.com</a>
      <div class="foot-grid">
        <a class="foot-logo" href="index.html" aria-label="Clipbord home">${logoSvg()}</a>
        <div><h3>Shop</h3><ul>${NAV.map((n) => `<li><a href="${n.href}">${n.label}</a></li>`).join('')}</ul></div>
        <div><h3>Help</h3><ul><li><a href="#footer">Shipping</a></li><li><a href="#footer">Returns</a></li><li><a href="#footer">Size guide</a></li><li><a href="mailto:clipbord.in@gmail.com">Contact</a></li></ul></div>
        <div><h3>Clipbord</h3><ul><li><a href="#footer">About</a></li><li><a href="https://instagram.com/clipbord_in" rel="noopener">Instagram @clipbord_in</a></li></ul></div>
      </div>
      <div class="foot-base"><p>© 2026 Clipbord</p><p>Prices in ₹, incl. of all taxes</p></div>
    </footer>
    <div class="scrim" id="scrim"></div>
    <aside class="bag" id="bag" role="dialog" aria-modal="true" aria-labelledby="bagTitle">
      <div class="bag-head"><h2 id="bagTitle">Bag</h2><button class="icon-btn" id="bagClose" aria-label="Close bag">${ic('x')}</button></div>
      <div class="bag-items" id="bagItems"></div>
      <div class="bag-foot">
        <div class="bag-total"><span>Subtotal</span><span id="bagSubtotal">₹0</span></div>
        <p class="bag-tax">Incl. of all taxes</p>
        <button class="btn btn-accent" id="checkoutBtn" type="button">Checkout <span class="nub">${ic('arrow')}</span></button>
      </div>
    </aside>
    <div id="modalRoot"></div>`;

  // One fetch of the logo path fills the nav, the footer and (on home) the hero.
  const logoReady = fetch('/src/assets/clipbord-logo-black.svg').then((r) => r.text()).then((t) => {
    const d = t.match(/ d="([^"]+)"/)[1];
    $$('.logo-path').forEach((p) => p.setAttribute('d', d));
    return d;
  });

  /* ---------- Toast ---------- */
  let toastT = 0;
  function toast(msg) {
    $('.toast')?.remove();
    document.body.insertAdjacentHTML('beforeend', `<div class="toast" role="status">${esc(msg)}</div>`);
    clearTimeout(toastT);
    toastT = setTimeout(() => $('.toast')?.remove(), 2600);
  }

  /* ---------- Overlays ---------- */
  let lastFocus = null;
  const lock = (on) => { document.documentElement.style.overflow = on ? 'hidden' : ''; };
  const bag = $('#bag'), scrim = $('#scrim'), sheet = $('#sheet'), search = $('#search');
  function openBag() { lastFocus = document.activeElement; closeSheet(false); bag.classList.add('is-open'); scrim.classList.add('is-open'); $('#bagBtn').setAttribute('aria-expanded', 'true'); lock(true); setTimeout(() => $('#bagClose').focus(), 80); }
  function closeBag() { if (!bag.classList.contains('is-open')) return; bag.classList.remove('is-open'); scrim.classList.remove('is-open'); $('#bagBtn').setAttribute('aria-expanded', 'false'); lock(false); lastFocus?.focus(); }
  function openSheet() { lastFocus = document.activeElement; sheet.classList.add('is-open'); $('#menuBtn').setAttribute('aria-expanded', 'true'); lock(true); setTimeout(() => $('#sheetClose').focus(), 80); }
  function closeSheet(refocus = true) { if (!sheet.classList.contains('is-open')) return; sheet.classList.remove('is-open'); $('#menuBtn').setAttribute('aria-expanded', 'false'); lock(false); if (refocus) lastFocus?.focus(); }
  function toggleSearch(open = search.hidden) {
    search.hidden = !open;
    $('#searchBtn').setAttribute('aria-expanded', open);
    if (open) { closeSheet(false); renderResults(''); setTimeout(() => $('#q').focus(), 30); }
    else { $('#q').value = ''; }
  }
  function renderResults(q) {
    const term = q.trim().toLowerCase();
    const hits = term ? PRODUCTS.filter((p) => `${p.name} ${CATS[p.cat].label} ${p.colour}`.toLowerCase().includes(term)) : PRODUCTS;
    $('#results').innerHTML = hits.length
      ? hits.map((p) => `<a href="product.html?id=${p.id}"><img src="${thumb(p)}" alt=""><span>${p.name}<small>${CATS[p.cat].label}</small></span><span>${inr(p.price)}</span></a>`).join('')
      : `<p>Nothing matches “${esc(q)}”. Try tee, hoodie or joggers.</p>`;
  }
  $('#q').addEventListener('input', (e) => renderResults(e.target.value));
  $('#searchBtn').addEventListener('click', () => toggleSearch());
  $('#searchClose').addEventListener('click', () => { toggleSearch(false); $('#searchBtn').focus(); });
  $('#bagBtn').addEventListener('click', openBag);
  $('#bagClose').addEventListener('click', closeBag);
  scrim.addEventListener('click', closeBag);
  $('#menuBtn').addEventListener('click', openSheet);
  $('#sheetClose').addEventListener('click', () => closeSheet());
  $$('.sheet ul a').forEach((a) => a.addEventListener('click', () => closeSheet(false)));
  $$('.mode-btn').forEach((b) => b.addEventListener('click', toggleMode));
  function trap(e, root) {
    const f = $$('button:not([disabled]), a[href], input', root).filter((el) => el.offsetParent !== null);
    if (!f.length) return;
    if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
    else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
  }
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if ($('.modal')) return closeLogin();
      if ($('#acctMenu')) return closeAcct(true);
      closeBag(); closeSheet();
      if (!search.hidden) { toggleSearch(false); $('#searchBtn').focus(); }
    }
    if (e.key === 'Tab') {
      if ($('.modal')) trap(e, $('.modal'));
      else if (bag.classList.contains('is-open')) trap(e, bag);
      else if (sheet.classList.contains('is-open')) trap(e, sheet);
    }
  });

  /* ---------- Bookmarks ---------- */
  const saved = new Set(store.get('saved', []));
  function syncSaved() {
    $$('.save[data-id]').forEach((b) => {
      const on = saved.has(b.dataset.id);
      const p = byId(b.dataset.id);
      b.setAttribute('aria-pressed', on);
      b.setAttribute('aria-label', `${on ? 'Remove' : 'Bookmark'} ${p.name}${on ? ' from bookmarks' : ''}`);
    });
    $('#savedCount').textContent = saved.size || '';
    $('#savedLink').setAttribute('aria-label', `Bookmarks, ${saved.size} ${saved.size === 1 ? 'item' : 'items'}`);
  }
  function toggleSave(id) {
    const on = !saved.has(id);
    on ? saved.add(id) : saved.delete(id);
    store.set('saved', [...saved]);
    syncSaved();
    toast(on ? `Bookmarked ${byId(id).name}` : `Removed ${byId(id).name} from bookmarks`);
    if (PAGE === 'bookmarks') renderBookmarks();
  }

  /* ---------- Bag ---------- */
  const items = store.get('bag', []).filter((i) => byId(i.id));
  function addToBag(id, size) {
    const hit = items.find((i) => i.id === id && i.size === size);
    if (hit) hit.qty = Math.min(10, hit.qty + 1); else items.push({ id, size, qty: 1 });
    renderBag(); openBag();
  }
  function renderBag() {
    store.set('bag', items);
    const count = items.reduce((n, i) => n + i.qty, 0);
    const total = items.reduce((n, i) => n + i.qty * byId(i.id).price, 0);
    $('#bagNum').textContent = count;
    $('#bagBtn').setAttribute('aria-label', `Bag, ${count} ${count === 1 ? 'item' : 'items'}`);
    $('#bagTitle').textContent = count ? `Bag (${count})` : 'Bag';
    $('#bagSubtotal').textContent = inr(total);
    $('#checkoutBtn').disabled = !count;
    const box = $('#bagItems');
    if (!items.length) { box.innerHTML = '<div class="bag-empty"><p>Your bag is empty.</p><p><a href="index.html#new" data-close-bag>Shop the new drop</a></p></div>'; return; }
    box.innerHTML = items.map((it, i) => { const p = byId(it.id); return `
      <div class="line">
        <img src="${thumb(p)}" alt="">
        <div>
          <div class="line-top"><a href="product.html?id=${p.id}">${p.name}</a><span>${inr(p.price * it.qty)}</span></div>
          <p class="line-meta">Size ${it.size}, ${inr(p.price)} each</p>
          <div class="line-ctrl">
            <div class="stepper" role="group" aria-label="Quantity of ${p.name}, size ${it.size}">
              <button type="button" data-step="-1" data-i="${i}" aria-label="Decrease quantity" ${it.qty <= 1 ? 'disabled' : ''}>${ic('minus')}</button>
              <output aria-live="polite">${it.qty}</output>
              <button type="button" data-step="1" data-i="${i}" aria-label="Increase quantity" ${it.qty >= 10 ? 'disabled' : ''}>${ic('plus')}</button>
            </div>
            <button type="button" class="remove" data-remove="${i}">Remove</button>
          </div>
        </div>
      </div>`; }).join('');
  }
  $('#bagItems').addEventListener('click', (e) => {
    const s = e.target.closest('[data-step]'), r = e.target.closest('[data-remove]');
    if (e.target.closest('[data-close-bag]')) { closeBag(); return; }
    if (s) { const i = +s.dataset.i; items[i].qty = Math.min(10, Math.max(1, items[i].qty + +s.dataset.step)); renderBag(); const again = $(`#bagItems [data-step="${s.dataset.step}"][data-i="${i}"]`); (again && !again.disabled ? again : $('#bagClose')).focus(); }
    if (r) { items.splice(+r.dataset.remove, 1); renderBag(); $('#bagClose').focus(); }
  });
  $('#checkoutBtn').addEventListener('click', () => { if (!user) { closeBag(); openLogin('Log in to check out'); } else toast('Checkout is not part of this prototype'); });

  /* ---------- Account: log in, avatar, log out ---------- */
  let user = store.get('user', null);
  const initials = (name) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('') || 'CB';
  function renderAccount() {
    const box = $('#account');
    if (!user) {
      box.innerHTML = `<button class="login-btn" type="button" data-login aria-label="Log in">${ic('user')}<span class="lbl">Log in</span></button>`;
      $('#sheetAccount').innerHTML = '<button class="btn btn-line" type="button" data-login>Log in</button>';
      return;
    }
    box.innerHTML = `<button class="avatar-btn" id="avatarBtn" type="button" aria-haspopup="menu" aria-expanded="false" aria-label="Account: ${esc(user.name)}"><span class="avatar">${esc(initials(user.name))}</span>${ic('caret', 'caret')}</button>`;
    $('#sheetAccount').innerHTML = `<button class="btn btn-line" type="button" data-logout>${ic('logout')} Log out</button>`;
  }
  function openAcct() {
    closeAcct();
    $('#account').insertAdjacentHTML('beforeend', `
      <div class="acct-menu" id="acctMenu" role="menu" aria-label="Account">
        <div class="acct-who"><span class="avatar">${esc(initials(user.name))}</span><div><strong>${esc(user.name)}</strong><span>${esc(user.email)}</span></div></div>
        <a role="menuitem" href="bookmarks.html">${ic('bookmark')} Bookmarks</a>
        <button role="menuitem" type="button" data-open-bag>${ic('bag')} Bag</button>
        <button role="menuitem" type="button" class="logout" data-logout>${ic('logout')} Log out</button>
      </div>`);
    $('#avatarBtn').setAttribute('aria-expanded', 'true');
    $('#acctMenu [role="menuitem"]').focus();
  }
  function closeAcct(refocus) {
    const m = $('#acctMenu'); if (!m) return;
    m.remove(); $('#avatarBtn')?.setAttribute('aria-expanded', 'false');
    if (refocus) $('#avatarBtn')?.focus();
  }
  $('#account').addEventListener('keydown', (e) => {
    const menu = $('#acctMenu'); if (!menu || !['ArrowDown', 'ArrowUp'].includes(e.key)) return;
    const its = $$('[role="menuitem"]', menu); const i = its.indexOf(document.activeElement);
    its[(i + (e.key === 'ArrowDown' ? 1 : -1) + its.length) % its.length].focus(); e.preventDefault();
  });

  function openLogin(reason) {
    closeAcct(); closeSheet(false);
    lastFocus = document.activeElement;
    let mode = 'login';
    const root = $('#modalRoot');
    const draw = () => {
      root.innerHTML = `
        <div class="modal" role="dialog" aria-modal="true" aria-labelledby="loginTitle">
          <div class="scrim" data-close-login></div>
          <div class="modal-card"><form class="modal-inner" id="loginForm" novalidate>
            <div class="modal-top"><h2 class="display" id="loginTitle">${mode === 'login' ? 'Log in' : 'Create account'}</h2><button class="icon-btn" type="button" data-close-login aria-label="Close">${ic('x')}</button></div>
            <p>${esc(reason || (mode === 'login' ? 'Your bag and bookmarks follow you to any device.' : 'Save bookmarks and check out faster.'))}</p>
            ${mode === 'signup' ? '<div class="field"><label for="fName">Name</label><input id="fName" autocomplete="name" required></div>' : ''}
            <div class="field"><label for="fEmail">Email</label><input id="fEmail" type="email" autocomplete="email" required><span class="err" id="eEmail" hidden></span></div>
            <div class="field"><label for="fPass">Password</label><input id="fPass" type="password" autocomplete="${mode === 'login' ? 'current-password' : 'new-password'}" required minlength="6"><span class="err" id="ePass" hidden></span></div>
            <button class="btn btn-accent" type="submit">${mode === 'login' ? 'Log in' : 'Create account'} <span class="nub">${ic('arrow')}</span></button>
            <button class="switch-mode" type="button" id="switchMode">${mode === 'login' ? 'New here? <b>Create an account</b>' : 'Already have an account? <b>Log in</b>'}</button>
          </form></div>
        </div>`;
      lock(true);
      setTimeout(() => $(mode === 'signup' ? '#fName' : '#fEmail').focus(), 60);
      $('#switchMode').addEventListener('click', () => { mode = mode === 'login' ? 'signup' : 'login'; draw(); });
      $('#loginForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const email = $('#fEmail').value.trim(), pass = $('#fPass').value;
        const okEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email), okPass = pass.length >= 6;
        $('#eEmail').hidden = okEmail; $('#eEmail').textContent = 'Enter an email like name@example.com.';
        $('#ePass').hidden = okPass; $('#ePass').textContent = 'Passwords are at least 6 characters.';
        $('#fEmail').setAttribute('aria-invalid', !okEmail); $('#fPass').setAttribute('aria-invalid', !okPass);
        if (!okEmail || !okPass) { (okEmail ? $('#fPass') : $('#fEmail')).focus(); return; }
        const typed = mode === 'signup' ? $('#fName').value.trim() : '';
        const name = typed || email.split('@')[0].replace(/[._-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
        user = { name, email }; store.set('user', user);
        closeLogin(); renderAccount();
        toast(`Logged in as ${name}`);
        $('#avatarBtn')?.focus();
      });
    };
    draw();
  }
  function closeLogin() { if (!$('.modal')) return; $('#modalRoot').innerHTML = ''; lock(false); lastFocus?.focus(); }
  function logout() { user = null; store.set('user', null); closeAcct(); renderAccount(); closeSheet(false); toast('Logged out'); }

  /* ---------- Card ---------- */
  const cardHtml = (p, feature = false) => `
    <article class="card${feature ? ' card--feature' : ''}">
      <div class="card-media">
        <img class="front" src="${p.front}" alt="${p.name}" loading="lazy">
        ${p.back ? `<img class="back" src="${p.back}" alt="" loading="lazy">` : ''}
      </div>
      <button class="chip save" type="button" data-id="${p.id}" aria-pressed="false" aria-label="Bookmark ${p.name}">${ic('bookmark', 'off')}${ic('bookmark-fill', 'on')}</button>
      <div class="card-info">
        <div><h3 class="card-name"><a href="product.html?id=${p.id}">${p.name}</a></h3><p class="card-cat">${CATS[p.cat].label}</p></div>
        <p class="card-price">${inr(p.price)}</p>
      </div>
    </article>`;
  const tileHtml = (key) => { const c = CATS[key]; const n = inCat(key).length; return `
    <a class="tile" data-tone="${c.tone}" href="category.html?c=${key}">
      <div class="tile-photo"><img src="${c.img}" alt="" loading="lazy" style="object-position:${c.pos}"></div>
      <div class="tile-body"><div class="tile-top"><div><p class="tile-name">${c.label}</p><p class="tile-meta">${styles(n)}</p></div><span class="tile-arrow">${ic('arrow')}</span></div><span class="tile-word display" aria-hidden="true">${c.word}</span></div>
    </a>`; };

  /* ---------- One click handler ---------- */
  document.addEventListener('click', (e) => {
    const t = e.target;
    const s = t.closest('.save[data-id]'); if (s) { toggleSave(s.dataset.id); return; }
    if (t.closest('[data-login]')) { openLogin(); return; }
    if (t.closest('[data-logout]')) { logout(); return; }
    if (t.closest('[data-close-login]')) { closeLogin(); return; }
    if (t.closest('[data-open-bag]')) { closeAcct(); openBag(); return; }
    if (t.closest('[data-open-search]')) { toggleSearch(true); return; }
    if (t.closest('#avatarBtn')) { $('#acctMenu') ? closeAcct(true) : openAcct(); return; }
    if ($('#acctMenu') && !t.closest('#acctMenu')) closeAcct();
    if (!search.hidden && !t.closest('#search') && !t.closest('#searchBtn')) toggleSearch(false);
  });

  /* ---------- Pages ---------- */
  function initHome() {
    $('#grid').innerHTML = PRODUCTS.map((p, i) => cardHtml(p, i === 0)).join('');
    $('#tiles').innerHTML = Object.keys(CATS).map(tileHtml).join('');
  }

  function initCategory() {
    const key = CATS[QS.get('c')] ? QS.get('c') : null;
    const label = key ? CATS[key].label : 'Shop all';
    document.title = `${label}, Clipbord`;
    $('#catCrumb').innerHTML = `<a href="index.html">Shop</a><span aria-hidden="true">/</span><span>${label}</span>`;
    $('#catPills').innerHTML = [['', 'All'], ...Object.entries(CATS).map(([k, c]) => [k, c.label])]
      .map(([k, l]) => `<a href="category.html${k ? `?c=${k}` : ''}" ${k === (key || '') ? 'aria-current="page"' : ''}>${l}</a>`).join('');
    const list = key ? inCat(key) : PRODUCTS;
    $('#catTitle').innerHTML = `${label}<sup>${pieces(list.length)}</sup>`;
    const draw = () => {
      const by = $('#sort').value;
      const sorted = [...list].sort((a, b) => (by === 'low' ? a.price - b.price : by === 'high' ? b.price - a.price : a.order - b.order));
      $('#catGrid').innerHTML = sorted.map((p) => cardHtml(p)).join('');
      syncSaved();
    };
    $('#sort').addEventListener('change', draw);
    draw();
    const others = Object.keys(CATS).filter((k) => k !== key);
    $('#moreTitle').textContent = key ? 'More to shop' : 'Shop by category';
    $('#moreTiles').classList.toggle('tiles--two', others.length === 2);
    $('#moreTiles').innerHTML = others.map(tileHtml).join('');
  }

  function initProduct() {
    const p = byId(QS.get('id'));
    if (!p) {
      $('#main').innerHTML = `<div class="page-head"><p class="crumb"><a href="index.html">Shop</a></p></div><div class="empty"><h2 class="display">This piece isn't in the shop.</h2><p>It may have sold out or the link is wrong. The new drop is a good place to start.</p><a class="btn btn-accent" href="index.html#new">Shop the new drop <span class="nub">${ic('arrow')}</span></a></div>`;
      return;
    }
    const c = CATS[p.cat];
    document.title = `${p.name}, Clipbord`;
    $('#pdpCrumb').innerHTML = `<a href="index.html">Shop</a><span aria-hidden="true">/</span><a href="category.html?c=${p.cat}">${c.label}</a><span aria-hidden="true">/</span><span>${p.name}</span>`;
    $('#pdpGallery').innerHTML = p.big.map((src, i) => `<figure><img src="${src}" alt="${p.name}, ${p.big.length > 1 ? (i ? 'back' : 'front') : 'product photo'}"${i ? ' loading="lazy"' : ''}></figure>`).join('');
    $('.view-toggle').hidden = p.big.length < 2;
    $('#pdpCat').innerHTML = `<a href="category.html?c=${p.cat}">${c.label}</a>`;
    $('#pdpName').textContent = p.name;
    $('#pdpPrice').textContent = inr(p.price);
    $('#pdpColour').textContent = p.colour;
    $('#pdpDesc').textContent = p.desc;
    $('#pdpDetails').textContent = p.details;
    $('#pdpSave').dataset.id = p.id;
    $('#addBtn').addEventListener('click', () => addToBag(p.id, $('input[name="size"]:checked').value));
    $('#sizeGuide').addEventListener('click', () => { $('#sizefit').open = true; });
    const gal = $('#pdpGallery');
    const setView = (i) => $$('.view-toggle button').forEach((b) => b.setAttribute('aria-pressed', +b.dataset.view === i));
    gal.addEventListener('scroll', () => setView(Math.round(gal.scrollLeft / Math.max(1, gal.clientWidth))), { passive: true });
    $('.view-toggle').addEventListener('click', (e) => { const b = e.target.closest('[data-view]'); if (!b) return; gal.scrollTo({ left: +b.dataset.view * gal.clientWidth, behavior: REDUCE ? 'auto' : 'smooth' }); setView(+b.dataset.view); });
    const more = [...inCat(p.cat), ...PRODUCTS.filter((x) => x.cat !== p.cat)].filter((x) => x.id !== p.id).slice(0, 4);
    $('#moreGrid').innerHTML = more.map((x) => cardHtml(x)).join('');
  }

  function renderBookmarks() {
    const list = PRODUCTS.filter((p) => saved.has(p.id));
    $('#bmTitle').innerHTML = `Bookmarks<sup>${pieces(list.length)}</sup>`;
    $('#bmGrid').innerHTML = list.map((p) => cardHtml(p)).join('');
    $('#bmEmpty').hidden = !!list.length;
    $('#bmGrid').hidden = !list.length;
    syncSaved();
  }

  ({ home: initHome, category: initCategory, product: initProduct, bookmarks: renderBookmarks })[PAGE]?.();
  setMode(document.documentElement.dataset.theme, false);
  renderAccount(); renderBag(); syncSaved();
  if (QS.has('bag') && items.length === 0) addToBag('adhd-pool-ball-hoodie', 'M');
  if (QS.has('login')) openLogin();

  /* ---------- Motion ---------- */
  const gsap = window.gsap, ScrollTrigger = window.ScrollTrigger;
  if (gsap && ScrollTrigger) gsap.registerPlugin(ScrollTrigger);
  if (gsap && !REDUCE && !STATIC) {
    gsap.set('.card, .tile', { y: 48, opacity: 0 });
    ScrollTrigger.batch('.card, .tile', { start: 'top 90%', once: true, onEnter: (els) => gsap.to(els, { y: 0, opacity: 1, duration: 1, ease: 'expo.out', stagger: 0.08, overwrite: true }) });
    $$('.tile-word').forEach((w) => gsap.fromTo(w, { xPercent: 4 }, { xPercent: -6, ease: 'none', scrollTrigger: { trigger: w.closest('.tile'), start: 'top bottom', end: 'bottom top', scrub: true } }));
    $$('.page-title, .pdp-name').forEach((h) => gsap.from(h, { yPercent: 30, opacity: 0, duration: 1.1, ease: 'expo.out', delay: 0.1 }));
  }

  /* ---------- Home hero: logo sketch, fill and dock (from Hero.jsx) ---------- */
  if (PAGE === 'home') {
    const SKETCH = 0.62, REVEAL = 3.9, NS = 'http://www.w3.org/2000/svg';
    const slot = $('#heroSlot'), target = $('#navLogo'), header = $('#siteHeader');
    target.style.visibility = 'hidden';
    logoReady.then((d) => {
      $('.hero-fill').setAttribute('d', d);
      d.split(/(?=M)/).forEach((sd) => {
        const path = document.createElementNS(NS, 'path');
        path.setAttribute('class', 'hero-stroke'); path.setAttribute('d', sd); path.setAttribute('pathLength', '1');
        path.setAttribute('stroke-dasharray', '1'); path.setAttribute('stroke-dashoffset', '1');
        $('#heroStrokes').appendChild(path);
      });
      const strokes = $$('.hero-stroke'), fill = $('.hero-fill'), glow = $('#heroGlow');
      const dock = () => {
        const from = slot.getBoundingClientRect(), to = target.getBoundingClientRect();
        const scale = gsap.getProperty(slot, 'scale');
        return { x: to.left - (from.left - gsap.getProperty(slot, 'x')), y: to.top - (from.top - gsap.getProperty(slot, 'y')), scale: to.width / (from.width / scale) };
      };
      target.style.visibility = '';
      const tl = gsap.timeline({ paused: true, defaults: { ease: 'none' } });
      tl.fromTo(strokes, { attr: { 'stroke-dashoffset': SKETCH } }, { attr: { 'stroke-dashoffset': 0 }, duration: 1.2, ease: 'power1.inOut', stagger: 0.07 }, 0)
        .fromTo(glow, { autoAlpha: 0.5, scale: 0.8 }, { autoAlpha: 1, scale: 1.1, duration: 3, ease: 'power2.out' }, 0)
        .fromTo(fill, { fillOpacity: 0 }, { fillOpacity: 1, duration: 1.1, ease: 'power2.in' }, 2.2)
        .fromTo(strokes, { opacity: 1 }, { opacity: 0, duration: 0.8 }, 3)
        .fromTo(glow, { autoAlpha: 1, scale: 1.1 }, { autoAlpha: 0, scale: 1.6, duration: 1.4, ease: 'power2.in', immediateRender: false }, 3.6)
        .fromTo('.hero-backdrop', { autoAlpha: 1 }, { autoAlpha: 0, duration: 1, ease: 'power1.inOut' }, REVEAL)
        .fromTo(slot, { x: 0, y: 0, scale: 1 }, { x: () => dock().x, y: () => dock().y, scale: () => dock().scale, duration: 2.2, ease: 'power3.inOut' }, 3.9)
        .fromTo(slot, { autoAlpha: 1 }, { autoAlpha: 0, duration: 0.01, immediateRender: false }, 6.1)
        .fromTo(target, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.01 }, 6.1)
        .to({}, { duration: 0.4 });
      if (REDUCE || STATIC) { tl.progress(1); return; }
      ScrollTrigger.create({ trigger: '#heroPin', start: () => `top ${header.offsetHeight}px`, end: '+=200%', pin: true, scrub: 1, animation: tl, invalidateOnRefresh: true, refreshPriority: 10 });
      if (window.scrollY < 10) gsap.fromTo(strokes, { attr: { 'stroke-dashoffset': 1 } }, { attr: { 'stroke-dashoffset': SKETCH }, duration: 1.4, ease: 'power2.out', stagger: 0.03, delay: 0.2 });
      // The hero pin is created after the logo loads, later than the rack's: sort so they refresh in page order.
      ScrollTrigger.sort(); ScrollTrigger.refresh();
    }).catch(() => { target.style.visibility = ''; });
  }

  window.CB = { STATIC, REDUCE, theme: () => document.documentElement.dataset.theme };
})();
