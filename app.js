/* Smart Stationery – single-page app: hash router, cart, wishlist, filters, simulated auth/checkout. */
const $ = s => document.querySelector(s);
const ls = {
  get:(k,d)=>{try{return JSON.parse(localStorage.getItem(k))??d}catch{return d}},
  set:(k,v)=>localStorage.setItem(k,JSON.stringify(v))
};
const money = n => '₹' + n.toLocaleString('en-IN');
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const P = id => PRODUCTS.find(p => p.id == id);

// Product pictures: tries a real photo first (assets/images/photos/p<ID>.jpg|png|webp),
// then the drawn picture (p.img), then the emoji. Just drop photos in that folder.
const PHOTO_EXT = ['jpg', 'png', 'webp'];
window.imgFail = function (el) {
  const p = P(el.dataset.id), i = +el.dataset.i + 1;
  if (i < PHOTO_EXT.length) { el.dataset.i = i; el.src = `assets/images/photos/p${p.id}.${PHOTO_EXT[i]}`; }
  else if (el.dataset.i !== 's') { el.dataset.i = 's'; el.src = p.img; }
  else el.replaceWith(document.createTextNode(p.e));
};
const pic = (p, alt) => `<img src="assets/images/photos/p${p.id}.jpg" data-id="${p.id}" data-i="0" alt="${alt}" onerror="imgFail(this)">`;
const PAL = ['#cfe6fb','#fff3c4','#dff3e4','#fde0e6'];
const stars = r => '★'.repeat(Math.round(r)) + '☆'.repeat(5 - Math.round(r));
const emailOK = e => /^\S+@\S+\.\S+$/.test(e);

// ---- State (only non-sensitive demo data is stored; passwords are never stored) ----
let cart = ls.get('ss_cart', {}), wish = ls.get('ss_wish', []), recent = ls.get('ss_recent', []);
let coupon = ls.get('ss_coupon', false);
let user = ls.get('ss_user', null) || JSON.parse(sessionStorage.getItem('ss_user') || 'null');
let F = {}, token = ls.get('ss_token', null);
const save = () => { ls.set('ss_cart', cart); ls.set('ss_wish', wish); ls.set('ss_recent', recent); ls.set('ss_coupon', coupon); };
function toast(m){ const t = $('#toast'); t.textContent = m; t.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 2200); }
function badges(){
  $('#cc').textContent = Object.values(cart).reduce((a, b) => a + b, 0);
  $('#wc').textContent = wish.length;
  $('#auth').innerHTML = user
    ? `<span class="lbl">Hi, ${esc(user.name)}</span> <button class="btn sm ghost" data-act="logout">Logout</button>`
    : `<a href="#/login">👤<span class="lbl"> Login</span></a><span class="lbl"> / </span><a class="lbl" href="#/register">Signup</a>`;
}
function totals(){
  let mrp = 0, sub = 0;
  for (const id in cart){ const p = P(id); mrp += (p.o || p.p) * cart[id]; sub += p.p * cart[id]; }
  const cp = coupon ? Math.round(sub * 0.1) : 0;
  const ship = (!sub || sub - cp >= 499) ? 0 : 49;
  return {mrp, sub, disc: mrp - sub, cp, ship, total: sub - cp + ship};
}

// ---- Reusable pieces ----
const BADGE = {1:['Best Seller','g'],2:['Hot Deal','r'],3:['New','b'],12:['Hot Deal','r'],18:['Best Seller','g'],21:['New','b']};
function card(p){
  const off = p.o ? Math.round((1 - p.p / p.o) * 100) : 0, bd = BADGE[p.id];
  const thumb = pic(p, p.n);
  return `<article class="card">${bd ? `<span class="bdg ${bd[1]}">${bd[0]}</span>` : ''}<button class="heart ${wish.includes(p.id) ? 'on' : ''}" data-act="wish" data-id="${p.id}" aria-label="Toggle wishlist">♥</button>
  <a href="#/product/${p.id}" class="thumb" style="background:${PAL[p.id % 4]}">${thumb}</a>
  <div class="cb"><h3>${p.n}</h3><p class="sub">${p.d}</p><div class="stars">${stars(p.r)} <span>(${p.r})</span></div>
  <div class="price"><b>${money(p.p)}</b>${p.o ? `<s>${money(p.o)}</s><em>${off}% OFF</em>` : ''}</div>
  <div class="btns"><button class="btn sm" data-act="add" data-id="${p.id}">Add to Cart</button></div>
  <div class="ml"><button class="lk" data-act="buy" data-id="${p.id}">Buy Now</button><a href="#/product/${p.id}">Details →</a></div></div></article>`;
}
const grid = list => `<div class="grid">${list.map(card).join('')}</div>`;
const emptyBox = (icon, msg, link = '<a class="btn" href="#/shop">Continue Shopping</a>') => `<div class="empty"><span>${icon}</span><p>${msg}</p><br>${link}</div>`;
const view = h => { $('#app').innerHTML = h; };

// ---- Views ----
function viewHome(){
  const byPop = [...PRODUCTS].sort((a, b) => b.pop - a.pop), byNew = [...PRODUCTS].sort((a, b) => b.id - a.id);
  view(`<div class="hero"><div><span class="pill">Premium Stationery Collection</span><h1>Make Every Day<br><em>Creative!</em></h1>
    <p>Everything you need to write, learn, draw, and create.</p><a class="btn alt" href="#/shop">Shop Now →</a><a class="btn out" href="#/categories">Explore Categories</a></div>
    <div class="scene"><img class="hp" src="assets/images/hero.png" alt="" onerror="this.remove()"><div class="art"><div class="note">Small Steps<br>Big Dreams 💙</div><span class="a1">🪴</span><span class="a2">🖍️</span><span class="a3">📚</span><span class="a4">📓</span><span class="a5">✏️</span></div></div></div>
  <section class="cwrap">${catGrid()}</section>
  <section class="two"><div><div class="sh"><h2 class="t">Featured Products</h2><a href="#/shop">View All →</a></div>${grid([1, 2, 3, 5].map(P))}</div>
    <div><div class="offer"><h3>Special Offer</h3><div class="big2">Up to 50% OFF</div><p>On Selected Stationery Items</p><a class="btn sm" href="#/shop?offers=1">Shop Now →</a><div class="emo">🎒</div></div>
    <div class="tiles"><div class="tile"><span>🚚</span><b>Free Shipping</b>On orders above ₹499</div><div class="tile"><span>🛡️</span><b>Secure Payment</b>100% secure checkout</div><div class="tile"><span>🔄</span><b>Easy Returns</b>7 days return policy</div><div class="tile"><span>🎧</span><b>24/7 Support</b>We're here to help</div></div></div></section>
  <section><div class="sh"><h2 class="t">Best Sellers</h2><a href="#/shop">View All →</a></div>${grid(byPop.slice(0, 4))}</section>
  <section><div class="sh"><h2 class="t">New Arrivals</h2><a href="#/shop">View All →</a></div>${grid(byNew.slice(0, 4))}</section>
  <section><h2 class="t">What Customers Say</h2><div class="tg">
    ${[['Priya S.','The geometry box and notebooks were perfect for my daughter. Fast delivery!'],['Rahul M.','Great quality pens and paper at fair prices. My office reorders every month.'],['Ananya K.','Loved the watercolor kit and planner. Packaging was so cute!']].map(t => `<div class="testi"><div class="stars">★★★★★</div><p>“${t[1]}”</p><b>${t[0]}</b></div>`).join('')}</div></section>
  <section>${newsletter()}</section>`);
}
const catGrid = () => `<div class="cats">${CATS.map(c => `<a class="cat" href="#/shop?cat=${encodeURIComponent(c[0])}"><span>${c[1]}</span>${c[0]}</a>`).join('')}</div>`;
const newsletter = () => `<div class="news"><h2>Join our newsletter</h2><p>Get offers and new arrivals in your inbox.</p>
  <form class="inline" data-form="news"><label class="sr" for="ne">Email</label><input id="ne" name="email" type="email" placeholder="you@example.com" required><button class="btn">Subscribe</button></form></div>`;

function viewShop(q){
  F = {q: q.get('q') || '', cat: q.get('cat') || '', min: '', max: '', rating: 0, sort: 'pop', offers: q.get('offers') || ''};
  view(`<div class="wrap"><h2 class="t" id="stitle">Shop All Products</h2><button class="btn ghost sm fbtn" data-act="filters">🔎 Filters</button><div class="shop"><aside class="side"><h3 class="fh">🔎 Filters</h3>
    <div><label for="f-q">Search</label><input id="f-q" data-f="q" value="${esc(F.q)}" placeholder="Product name"></div>
    <div><label for="f-cat">Category</label><select id="f-cat" data-f="cat"><option value="">All</option>${CATS.map(c => `<option ${c[0] === F.cat ? 'selected' : ''}>${c[0]}</option>`).join('')}</select></div>
    <div><label>Price (₹)</label><div class="two"><input data-f="min" type="number" min="0" placeholder="Min" aria-label="Minimum price"><span>–</span><input data-f="max" type="number" min="0" placeholder="Max" aria-label="Maximum price"></div></div>
    <div><label for="f-r">Minimum rating</label><select id="f-r" data-f="rating"><option value="0">Any</option><option value="4">4★ &amp; up</option><option value="4.5">4.5★ &amp; up</option></select></div>
    <div><label for="f-s">Sort by</label><select id="f-s" data-f="sort"><option value="pop">Popularity</option><option value="new">Newest</option><option value="low">Price: Low to High</option><option value="high">Price: High to Low</option></select></div>
    <button class="btn ghost" data-act="clearf">Clear all filters</button></aside>
    <div><p id="cnt" style="margin-bottom:10px"></p><div id="plist"></div></div></div></div>`);
  list();
}
function list(){
  let r = PRODUCTS.filter(p => (!F.q || (p.n + ' ' + p.c).toLowerCase().includes(F.q.toLowerCase())) && (!F.cat || p.c === F.cat)
    && (!F.min || p.p >= +F.min) && (!F.max || p.p <= +F.max) && p.r >= +F.rating && (!F.offers || p.o));
  const s = {pop:(a, b) => b.pop - a.pop, new:(a, b) => b.id - a.id, low:(a, b) => a.p - b.p, high:(a, b) => b.p - a.p}[F.sort];
  r.sort(s);
  $('#stitle').textContent = F.cat || 'Shop All Products';
  $('#cnt').textContent = r.length + ' product(s) found';
  $('#plist').innerHTML = r.length ? grid(r) : emptyBox('🔍', 'No products match your filters.', '<button class="btn" data-act="clearf">Clear all filters</button>');
}
function viewProduct(id){
  const p = P(id); if (!p) return view(`<div class="wrap">${emptyBox('😕', 'Product not found.')}</div>`);
  const seen = recent.filter(x => x !== p.id).slice(0, 4);
  recent = [p.id, ...recent.filter(x => x !== p.id)].slice(0, 8); save();
  const off = p.o ? Math.round((1 - p.p / p.o) * 100) : 0;
  view(`<div class="wrap"><div class="detail"><div class="thumb" style="background:${PAL[p.id % 4]}">${pic(p, p.n)}</div><div>
    <small>${p.c}</small><h1>${p.n}</h1><div class="stars">${stars(p.r)} <span>${p.r}</span></div>
    <div class="price" style="font-size:1.3rem"><b>${money(p.p)}</b>${p.o ? `<s>${money(p.o)}</s><em>${off}% off</em>` : ''}</div>
    <p style="margin:12px 0">${p.d}</p>
    <div class="qty"><button data-act="pq" data-d="-1" aria-label="Decrease">−</button><input id="pq" type="number" min="1" value="1" aria-label="Quantity"><button data-act="pq" data-d="1" aria-label="Increase">+</button></div><br><br>
    <div class="btns"><button class="btn" data-act="addq" data-id="${p.id}">Add to Cart</button><button class="btn alt" data-act="buy" data-id="${p.id}">Buy Now</button>
    <button class="btn ghost" data-act="wish" data-id="${p.id}">${wish.includes(p.id) ? '♥ In Wishlist' : '♡ Wishlist'}</button></div></div></div>
    <h2 class="t" style="margin-top:34px">Related Products</h2>${grid(PRODUCTS.filter(x => x.c === p.c && x.id !== p.id).concat(PRODUCTS.filter(x => x.c !== p.c)).slice(0, 4))}
    ${seen.length ? `<h2 class="t" style="margin-top:34px">Recently Viewed</h2>${grid(seen.map(P))}` : ''}</div>`);
}
function viewCart(){
  const ids = Object.keys(cart);
  if (!ids.length) return view(`<div class="wrap"><h2 class="t">Shopping Cart</h2>${emptyBox('🛒', 'Your cart is empty.')}</div>`);
  const t = totals();
  view(`<div class="wrap"><h2 class="t">Shopping Cart</h2><div class="cartwrap"><div>${ids.map(id => { const p = P(id); return `<div class="row">
    <div class="mini" style="background:${PAL[p.id % 4]}">${pic(p, '')}</div><div class="info"><b>${p.n}</b><br>${money(p.p)}</div>
    <div class="qty"><button data-act="qty" data-id="${id}" data-d="-1" aria-label="Decrease">−</button><b>${cart[id]}</b><button data-act="qty" data-id="${id}" data-d="1" aria-label="Increase">+</button></div>
    <b>${money(p.p * cart[id])}</b><button class="btn sm ghost" data-act="rm" data-id="${id}">Remove</button></div>`; }).join('')}
    <a class="btn ghost" href="#/shop">← Continue Shopping</a></div>
    <div class="sum"><h3>Order Summary</h3>${summary(t)}
    <form class="inline" data-form="coupon"><label class="sr" for="cp">Coupon</label><input id="cp" name="code" placeholder="Coupon (try SMART10)"><button class="btn sm">Apply</button></form><p class="msg"></p>
    <a class="btn" style="display:block;text-align:center" href="#/checkout">Proceed to Checkout</a></div></div></div>`);
}
const summary = t => `<p><span>MRP total</span><span>${money(t.mrp)}</span></p><p><span>Discount</span><span>−${money(t.disc)}</span></p>
  ${t.cp ? `<p><span>Coupon SMART10</span><span>−${money(t.cp)}</span></p>` : ''}<p><span>Shipping</span><span>${t.ship ? money(t.ship) : 'FREE'}</span></p><p class="tot"><span>Total</span><span>${money(t.total)}</span></p>`;
function viewWish(){
  view(`<div class="wrap"><h2 class="t">My Wishlist</h2>${wish.length ? `<div class="grid">${wish.map(id => card(P(id)).replace('<div class="btns">', `<div class="btns"><button class="btn sm" data-act="move" data-id="${id}">Move to Cart</button>`).replace(/<button class="btn sm" data-act="add"[^>]*>Add to Cart<\/button>/, '')).join('')}</div>` : emptyBox('♡', 'Your wishlist is empty.')}</div>`);
}
function viewAuth(mode){
  const reg = mode === 'register';
  view(`<div class="wrap"><form class="formbox" data-form="${mode}" novalidate><h2>${reg ? 'Create account' : 'Welcome back'}</h2>
    ${reg ? '<div><label for="an">Name</label><input id="an" name="name" autocomplete="name"></div>' : ''}
    <div><label for="ae">Email</label><input id="ae" name="email" type="email" autocomplete="email"></div>
    <div><label for="ap">Password</label><div class="pw"><input id="ap" name="password" type="password" autocomplete="${reg ? 'new-password' : 'current-password'}"><button type="button" data-act="showpw" aria-label="Show or hide password">👁</button></div></div>
    <p class="msg" aria-live="polite"></p><button class="btn">${reg ? 'Sign up' : 'Login'}</button>
    <div class="or"><span>or continue with</span></div><div id="gbtn"></div><a class="btn ghost" id="ybtn" href="/api/auth/yahoo" hidden style="text-align:center">Continue with Yahoo</a><p class="msg" id="smsg"></p>
    ${reg ? '' : '<a class="link" href="#" data-act="forgot">Forgot password?</a>'}
    <p>${reg ? 'Already have an account? <a class="link" style="display:inline" href="#/login">Login</a>' : 'New here? <a class="link" style="display:inline" href="#/register">Create an account</a>'}</p></form></div>`);
  ready.then(initSocial);
}
async function initSocial(){
  const g = $('#gbtn'); if (!g) return;
  if (!CFG) return $('#smsg').textContent = 'Server not running – start it to sign in (see SETUP.md).';
  if (CFG.yahoo) $('#ybtn').hidden = false;
  if (!CFG.googleClientId) { g.innerHTML = '<p class="note">Google sign-in is off: add GOOGLE_CLIENT_ID to .env</p>'; return; }
  try {
    await addScript('https://accounts.google.com/gsi/client');
    google.accounts.id.initialize({client_id: CFG.googleClientId, callback: async r => {
      try { const d = await api('/api/auth/google', {method: 'POST', body: {credential: r.credential}}); setSession(d.token, d.user); toast('Welcome, ' + d.user.name + '!'); location.hash = '#/'; }
      catch (e) { $('#smsg').textContent = e.message; } }});
    google.accounts.id.renderButton(g, {theme: 'outline', size: 'large', width: 320});
  } catch (e) { $('#smsg').textContent = e.message; }
}
function viewAuthDone(q){
  const t = q.get('token');
  if (!t) return view(`<div class="wrap">${emptyBox('⚠️', esc(q.get('error') || 'Sign-in failed.'), '<a class="btn" href="#/login">Back to login</a>')}</div>`);
  try { const p = JSON.parse(decodeURIComponent(escape(atob(t.split('.')[0].replace(/-/g, '+').replace(/_/g, '/'))))); setSession(t, {name: p.name, email: p.email}); toast('Welcome, ' + p.name + '!'); } catch {}
  location.hash = '#/';
}
function viewCheckout(){
  if (!Object.keys(cart).length) return view(`<div class="wrap"><h2 class="t">Checkout</h2>${emptyBox('🛒', 'Your cart is empty.')}</div>`);
  const t = totals();
  view(`<div class="wrap"><h2 class="t">Checkout</h2><div class="cartwrap"><form class="sum" data-form="checkout" novalidate><h3>Delivery details</h3><br><div class="fl">
    <div><label for="cn">Full name</label><input id="cn" name="name" value="${user ? esc(user.name) : ''}"></div>
    <div><label for="cph">Phone</label><input id="cph" name="phone" inputmode="numeric" placeholder="10-digit mobile"></div>
    <div class="full"><label for="ce">Email</label><input id="ce" name="email" type="email" value="${user ? esc(user.email) : ''}"></div>
    <div class="full"><label for="ca">Address</label><textarea id="ca" name="address" rows="2"></textarea></div>
    <div><label for="cc2">City</label><input id="cc2" name="city"></div><div><label for="cs">State</label><input id="cs" name="state"></div>
    <div><label for="cpin">PIN code</label><input id="cpin" name="pin" inputmode="numeric" maxlength="6"></div></div><br>
    <h3>Payment method</h3><p class="note">UPI, Google Pay and PhonePe: scan the QR code on the next page. Card: you enter the card details on the next page.</p><br>
    <div class="pay">${['UPI', 'Google Pay', 'PhonePe', 'Credit / Debit Card', 'Cash on Delivery'].map((m, i) => `<label><input type="radio" name="pay" value="${m}" ${i == 4 ? 'checked' : ''}>${m}</label>`).join('')}</div>
    <p class="msg err"></p><button class="btn">Place Order (${money(t.total)})</button></form>
    <div class="sum"><h3>Order Summary</h3>${Object.keys(cart).map(id => `<p><span>${P(id).n} × ${cart[id]}</span><span>${money(P(id).p * cart[id])}</span></p>`).join('')}<hr>${summary(t)}</div></div></div>`);
}
async function viewSuccess(){
  const l = ls.get('ss_last'); if (!l) return view(`<div class="wrap">${emptyBox('📦', 'No recent order found.')}</div>`);
  try {
    const o = await api(trackUrl(l)), due = o.pay.status === 'pending' && o.pay.method !== 'Cash on Delivery';
    view(`<div class="wrap"><div class="ok-box"><div style="font-size:4rem">🎉</div><h2>Thank you, ${esc(l.name)}!</h2><p>Your order ID is <b>${esc(o.id)}</b>. Keep it to track your order.</p><br>${orderBox(o)}<br>
      ${pendingBtns(o)}<a class="btn" href="#/track/${o.id}">Track Order</a> <a class="btn ghost" href="#/shop">Continue Shopping</a></div></div>`);
    startPoll(viewSuccess); // live: the timeline updates by itself
  } catch (e) { view(`<div class="wrap">${emptyBox('⚠️', esc(e.message))}</div>`); }
}
async function viewPay(id){
  const l = ls.get('ss_last'); payCtx = {id, contact: l && l.id === id ? l.contact : ''};
  try {
    await ready; const o = await api(trackUrl(payCtx)); payOrder = o;
    if (o.pay.status !== 'pending') return go('#/track/' + id);
    const card = /Card/.test(o.pay.method), qrBtn = `<button class="btn ghost" data-act="qrpay" data-oid="${o.id}" data-card="${card ? 1 : 0}">📱 Pay with QR instead</button>`;
    const cardBox = CFG.razorpayKeyId
      ? `<p class="note">You will enter your card details on Razorpay’s secure page.</p><button class="btn" data-act="card" data-oid="${o.id}">Enter card details &amp; pay</button>`
      : CFG.demoPayments ? cardForm(o) : '<p class="note">Card payments are off. To try the card form, add DEMO_PAYMENTS=1 to .env and restart the server; for real cards add Razorpay keys. Or pay with the UPI QR.</p>';
    const upiBox = CFG.upiId ? `<p>Scan with Google Pay, PhonePe, Paytm or any UPI app</p>
      <div class="qr"><img id="upiqr" src="assets/images/upi-qr.png" alt="UPI QR code" style="max-width:250px;width:100%" onerror="makeQR()"></div>
      <p class="note">Pay exactly <b>${money(o.total)}</b> and write <b>${esc(o.id)}</b> in the payment note.</p>
      <a class="btn alt" href="${upiLink(o)}">Open UPI app (on mobile)</a>
      <p class="note">${CFG.demoUtr ? 'Demo: after scanning, type any 12-digit reference number (UTR) and your order is confirmed instantly.' : 'After paying, enter the 12-digit reference number (UTR) shown in your app. We verify it before dispatch.'}</p>
      <form data-form="utr" class="inline"><input id="utr" name="utr" inputmode="numeric" maxlength="12" placeholder="12-digit UTR / reference no." required><button class="btn sm">I’ve paid</button></form><p class="msg"></p>`
      : '<p class="note">QR payments are off: add UPI_ID to .env.</p>';
    view(`<div class="wrap"><div class="formbox" style="text-align:center"><h2>Pay ${money(o.total)}</h2><p>Order <b>${esc(o.id)}</b> · ${esc(o.pay.method)}</p>${card ? cardBox + qrBtn : upiBox}</div></div>`);
  } catch (e) { view(`<div class="wrap">${emptyBox('⚠️', esc(e.message))}</div>`); }
}
function viewTrack(id){
  const l = ls.get('ss_last') || {};
  view(`<div class="wrap"><h2 class="t">Track Your Order</h2><form class="formbox" data-form="track" style="max-width:520px;margin:0 0 20px" novalidate>
    <div><label for="ti">Order ID</label><input id="ti" name="id" value="${esc(id || l.id || '')}" placeholder="e.g. SS-261022-4F7A1B"></div>
    <div><label for="tc">Phone or email used at checkout</label><input id="tc" name="contact" value="${esc(l.contact || '')}"></div><p class="msg"></p><button class="btn">Track</button></form>
    <div id="tres"></div><div id="mine"></div></div>`);
  if (id && (token || l.id === id)) $('[data-form="track"]').requestSubmit();
  if (token) api('/api/orders/mine').then(d => { if (d.orders.length) $('#mine').innerHTML = '<h3 style="margin:18px 0 8px">My orders</h3>' + d.orders.map(o => `<div class="row"><a class="info" href="#/track/${o.id}"><b>${esc(o.id)}</b><br>${STEPS[o.step]} · ${payLabel(o.pay.status)}</a><b>${money(o.total)}</b>${pendingBtns(o)}</div>`).join(''); }).catch(() => {});
}
function viewAbout(){
  view(`<div class="wrap"><h2 class="t">About Us</h2><div class="sum"><p style="display:block">Smart Stationery is your friendly neighbourhood stationery shop, now online. We stock quality pens, notebooks, art supplies, office essentials and gifts at honest prices, so students, artists and professionals can write, learn, draw, and create every day.</p><br>
    <p style="display:block">✔ Genuine products &nbsp; ✔ Free shipping over ₹499 &nbsp; ✔ Easy returns</p></div></div>`);
}
function viewContact(){
  view(`<div class="wrap"><h2 class="t">Contact Us</h2><div class="cartwrap"><form class="sum" data-form="contact" novalidate><div class="fl">
    <div><label for="kn">Name</label><input id="kn" name="name"></div><div><label for="ke">Email</label><input id="ke" name="email" type="email"></div>
    <div class="full"><label for="km">Message</label><textarea id="km" name="msg" rows="4"></textarea></div></div><p class="msg" aria-live="polite"></p><button class="btn">Send Message</button></form>
    <div class="sum"><h3>Visit or call</h3><p style="display:block">📍 12 Raja Street, Padi, Chennai, India</p><p style="display:block">📞 +91 9876543201</p><p style="display:block">✉️ contactus@smartstationery.com</p></div></div></div>`);
}

// ---- Router ----
function route(){
  const [path, qs] = (location.hash.slice(1) || '/').split('?'), q = new URLSearchParams(qs || ''), seg = path.split('/').filter(Boolean);
  const views = {shop:() => viewShop(q), product:() => viewProduct(seg[1]), cart:viewCart, wishlist:viewWish, login:() => viewAuth('login'), auth:() => viewAuthDone(q), pay:() => viewPay(seg[1]), track:() => viewTrack(seg[1]), register:() => viewAuth('register'),
    checkout:viewCheckout, success:viewSuccess, about:viewAbout, contact:viewContact, categories:() => view(`<div class="wrap"><h2 class="t">All Categories</h2>${catGrid()}</div>`)};
  (views[seg[0]] || viewHome)();
  clearInterval(poll); scrollTo(0, 0); $('#nav').classList.remove('open'); badges();
  const h = location.hash || '#/'; document.querySelectorAll('#nav a').forEach(l => l.classList.toggle('on', l.getAttribute('href') === h));
}
addEventListener('hashchange', route);

// ---- Actions ----
function addCart(id, n = 1){ cart[id] = (cart[id] || 0) + n; save(); badges(); toast(P(id).n + ' added to cart 🛒'); }
const rerender = () => { if (/^#\/(cart|wishlist)/.test(location.hash)) route(); };
document.addEventListener('click', e => {
  const b = e.target.closest('[data-act]'); if (!b) return;
  const a = b.dataset.act, id = +b.dataset.id, d = +b.dataset.d;
  if (a === 'add') { addCart(id); rerender(); }
  else if (a === 'addq') addCart(id, Math.max(1, +$('#pq').value || 1));
  else if (a === 'buy') { addCart(id); location.hash = '#/checkout'; }
  else if (a === 'wish') {
    wish = wish.includes(id) ? wish.filter(x => x !== id) : [...wish, id]; save(); badges();
    toast(wish.includes(id) ? 'Added to wishlist ♥' : 'Removed from wishlist');
    if (/^#\/(wishlist|product)/.test(location.hash)) route(); else b.classList.toggle('on');
  }
  else if (a === 'move') { wish = wish.filter(x => x !== id); addCart(id); route(); }
  else if (a === 'qty') { cart[id] += d; if (cart[id] < 1) delete cart[id]; save(); route(); }
  else if (a === 'rm') { delete cart[id]; save(); route(); }
  else if (a === 'pq') { const i = $('#pq'); i.value = Math.max(1, (+i.value || 1) + d); }
  else if (a === 'clearf') { location.hash === '#/shop' ? viewShop(new URLSearchParams()) : (location.hash = '#/shop'); }
  else if (a === 'logout') { user = null; token = null; ls.set('ss_token', null); ls.set('ss_user', null); sessionStorage.removeItem('ss_user'); badges(); toast('Logged out'); }
  else if (a === 'forgot') { e.preventDefault(); toast('Demo: a reset link would be emailed here'); }
  else if (a === 'showpw') { const i = $('#ap'); i.type = i.type === 'password' ? 'text' : 'password'; }
  else if (a === 'filters') $('.side').classList.toggle('open');
  else if (a === 'card') startCard(b.dataset.oid);
  else if (a === 'delorder') delOrder(b.dataset.oid);
  else if (a === 'qrpay') qrPay(b.dataset.oid, b.dataset.card === '1');
  else if (a === 'menu') $('#nav').classList.toggle('open');
  else if (a === 'top') scrollTo({top: 0, behavior: 'smooth'});
});
document.addEventListener('input', e => { const k = e.target.dataset.f; if (k) { F[k] = e.target.value; list(); } });
addEventListener('scroll', () => { $('#top').style.display = scrollY > 400 ? 'block' : 'none'; });

// ---- Server connection, orders, payments ----
let CFG = null, poll;
const startPoll = fn => { clearInterval(poll); poll = setInterval(() => { fn().catch(() => {}); }, 15000); }; // keeps the tracking page up to date
const ready = fetch('/api/config').then(r => r.json()).then(c => CFG = c).catch(() => CFG = null);
const api = async (url, o = {}) => {
  let r;
  try { r = await fetch(url, {method: o.method || 'GET', headers: {'Content-Type': 'application/json', ...(token ? {Authorization: 'Bearer ' + token} : {})}, body: o.body ? JSON.stringify(o.body) : undefined}); }
  catch { throw new Error('Cannot reach the server. Run "node server/server.js" and open http://localhost:3000'); }
  const d = await r.json().catch(() => ({})); if (!r.ok) throw new Error(d.error || 'Something went wrong'); return d;
};
const addScript = src => new Promise((ok, no) => { const el = document.createElement('script'); el.src = src; el.onload = ok; el.onerror = () => no(new Error('Could not load ' + src)); document.head.appendChild(el); });
const setSession = (t, u) => { token = t; user = u; ls.set('ss_token', t); ls.set('ss_user', u); badges(); };
const go = h => location.hash === h ? route() : (location.hash = h);
const STEPS = ['Order placed', 'Confirmed', 'Packed', 'Shipped', 'Out for delivery', 'Delivered'];
const payLabel = x => ({paid: 'Paid ✔', cod: 'Pay on delivery', verifying: 'Verifying your payment', pending: 'Awaiting payment'}[x] || x);
let payCtx = {}, payOrder = null;
const luhn = n => [...n].reverse().reduce((t, c, i) => { let x = +c; if (i % 2) { x *= 2; if (x > 9) x -= 9; } return t + x; }, 0) % 10 === 0;
// Fallback: if the uploaded QR image is missing, draw a QR from the UPI ID instead
window.makeQR = async () => { const el = $('.qr'); if (!el || !payOrder) return; el.innerHTML = ''; await addScript('https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js'); new QRCode(el, {text: upiLink(payOrder), width: 220, height: 220}); };
const cardForm = o => `<form data-form="demo-card" class="fl" style="text-align:left" novalidate>
  <p class="note full">🧪 Demo payment: no real money is charged and nothing is saved or sent. Use the test card <b>4111 1111 1111 1111</b>, any future expiry and any 3-digit CVV. Please do not type a real card number.</p>
  <div class="full"><label for="cd1">Name on card</label><input id="cd1" name="holder" autocomplete="cc-name"></div>
  <div class="full"><label for="cn2">Card number</label><input id="cn2" name="number" inputmode="numeric" autocomplete="cc-number" maxlength="19" placeholder="4111 1111 1111 1111"></div>
  <div><label for="cn3">Expiry (MM/YY)</label><input id="cn3" name="exp" placeholder="MM/YY" maxlength="5" autocomplete="cc-exp"></div>
  <div><label for="cd4">CVV</label><input id="cd4" name="cvv" type="password" inputmode="numeric" maxlength="4" autocomplete="cc-csc"></div>
  <p class="msg full"></p><button class="btn full">Pay ${money(o.total)}</button></form>`;
const pendingBtns = o => (o.pay.status === 'pending' && o.pay.method !== 'Cash on Delivery')
  ? `<button class="btn alt" data-act="qrpay" data-oid="${o.id}" data-card="${/Card/.test(o.pay.method) ? 1 : 0}">📱 Pay with QR</button> <button class="btn ghost" data-act="delorder" data-oid="${o.id}">🗑 Delete order</button> ` : '';
const trackUrl = l => `/api/track?id=${encodeURIComponent(l.id)}&contact=${encodeURIComponent(l.contact)}`;
const upiLink = o => `upi://pay?pa=${encodeURIComponent(CFG.upiId)}&pn=${encodeURIComponent(CFG.upiName)}&am=${o.total}&cu=INR&tn=${encodeURIComponent('Order ' + o.id)}`;
function orderBox(o){
  const when = {}; o.history.forEach(h => when[h.s] = h.t);
  return `<div class="tl">${STEPS.map((x, i) => `<div class="st ${i <= o.step ? 'done' : ''}"><i>${i <= o.step ? '✓' : i + 1}</i><b>${x}</b><small>${when[i] ? new Date(when[i]).toLocaleString('en-IN') : ''}</small></div>`).join('')}</div>
  <div class="sum" style="box-shadow:none;text-align:left"><p><span>Order ID</span><b>${esc(o.id)}</b></p><p><span>Payment</span><span>${esc(o.pay.method)} – ${payLabel(o.pay.status)}</span></p>
  ${o.items.map(i => `<p><span>${esc(i.n)} × ${i.q}</span><span>${money(i.p * i.q)}</span></p>`).join('')}<p class="tot"><span>Total</span><span>${money(o.total)}</span></p></div>`;
}
async function startCard(id){
  const l = ls.get('ss_last') || {};
  try {
    const r = await api('/api/pay/razorpay', {method: 'POST', body: {orderId: id, contact: payCtx.contact}}); await addScript('https://checkout.razorpay.com/v1/checkout.js');
    new Razorpay({key: r.keyId, amount: r.amount, currency: 'INR', order_id: r.rzpOrderId, name: 'Smart Stationery', description: 'Order ' + id, prefill: {name: l.name, email: l.email, contact: l.phone},
      handler: async x => { try { await api('/api/pay/razorpay/verify', {method: 'POST', body: {orderId: id, contact: payCtx.contact, ...x}}); go('#/track/' + id); } catch (e) { toast(e.message); } }}).open();
  } catch (e) { toast(e.message); }
}

async function delOrder(id){
  if (!confirm('Delete this unpaid order? This cannot be undone.')) return;
  const l = ls.get('ss_last');
  try { await api(`/api/orders/${id}/cancel`, {method: 'POST', body: {contact: l && l.id === id ? l.contact : ''}}); if (l && l.id === id) ls.set('ss_last', null); toast('Order deleted'); go('#/track'); }
  catch (e) { toast(e.message); }
}
async function qrPay(id, card){
  const l = ls.get('ss_last');
  try { if (card) await api(`/api/orders/${id}/method`, {method: 'POST', body: {method: 'UPI', contact: l && l.id === id ? l.contact : ''}}); go('#/pay/' + id); }
  catch (e) { toast(e.message); }
}

// ---- Forms ----
const say = (f, m, ok) => { const el = f.querySelector('.msg') || f.parentNode.querySelector('.msg'); if (el) { el.textContent = m; el.className = 'msg ' + (ok ? 'ok' : 'err'); } };
document.addEventListener('submit', async e => {
  e.preventDefault();
  const f = e.target, k = f.dataset.form, d = Object.fromEntries(new FormData(f));
  try {
    if (k === 'search') { location.hash = '#/shop?q=' + encodeURIComponent(d.q); f.reset(); }
    else if (k === 'news') { toast('Thanks for subscribing! 💌'); f.reset(); }
    else if (k === 'coupon') { if (d.code.trim().toUpperCase() === 'SMART10') { coupon = true; save(); route(); toast('Coupon applied: 10% off'); } else say(f, 'Invalid coupon code.'); }
    else if (k === 'login' || k === 'register') {
      if (k === 'register' && d.name.trim().length < 2) return say(f, 'Please enter your name.');
      if (!emailOK(d.email)) return say(f, 'Enter a valid email address.');
      if (d.password.length < 6 || (k === 'register' && !/\d/.test(d.password))) return say(f, 'Password needs 6+ characters' + (k === 'register' ? ' and a number.' : '.'));
      const r = await api('/api/' + k, {method: 'POST', body: d}); setSession(r.token, r.user); say(f, 'Success! Redirecting…', true); toast('Welcome, ' + r.user.name + '!'); setTimeout(() => location.hash = '#/', 600);
    }
    else if (k === 'contact') {
      if (!d.name.trim() || !emailOK(d.email) || d.msg.trim().length < 10) return say(f, 'Please fill all fields (message min 10 characters) with a valid email.');
      say(f, 'Thanks! Your message was received (demo – no email is sent).', true); f.reset();
    }
    else if (k === 'checkout') {
      if (!d.name.trim() || !emailOK(d.email) || !/^\d{10}$/.test(d.phone) || !d.address.trim() || !d.city.trim() || !d.state.trim() || !/^\d{6}$/.test(d.pin)) return say(f, 'Please complete all fields: valid email, 10-digit phone and 6-digit PIN.');
      const o = await api('/api/orders', {method: 'POST', body: {items: Object.keys(cart).map(id => ({id: +id, q: cart[id]})), coupon, method: d.pay, customer: {name: d.name, email: d.email, phone: d.phone, address: d.address, city: d.city, state: d.state, pin: d.pin}}});
      ls.set('ss_last', {id: o.id, contact: d.phone, name: d.name, email: d.email, phone: d.phone}); cart = {}; coupon = false; save(); badges();
      go(o.method === 'Cash on Delivery' ? '#/success' : '#/pay/' + o.id);
    }
    else if (k === 'demo-card') {
      const n = d.number.replace(/\s/g, ''), [mm, yy] = d.exp.split('/').map(Number);
      if (d.holder.trim().length < 2) return say(f, 'Enter the name on the card.');
      if (!/^\d{16}$/.test(n) || !luhn(n)) return say(f, 'Enter a valid 16-digit card number.');
      if (!(mm >= 1 && mm <= 12) || !yy || new Date(2000 + yy, mm) <= new Date()) return say(f, 'Enter a valid future expiry date (MM/YY).');
      if (!/^\d{3,4}$/.test(d.cvv)) return say(f, 'Enter the 3-digit CVV.');
      if (n !== '4111111111111111') return say(f, 'Demo mode accepts only the test card 4111 1111 1111 1111. Please use the UPI QR for a real payment.');
      await api(`/api/orders/${payCtx.id}/demo-pay`, {method: 'POST', body: {contact: payCtx.contact}}); toast('Payment successful (demo) ✔'); go('#/track/' + payCtx.id);
    }
    else if (k === 'utr') { if (!/^\d{12}$/.test(d.utr.trim())) return say(f, 'Enter the 12-digit UTR (reference number) from your payment app.');
      const u = await api(`/api/orders/${payCtx.id}/utr`, {method: 'POST', body: {utr: d.utr.trim(), contact: payCtx.contact}});
      toast(u.confirmed ? 'Payment received – order confirmed! ✔' : 'Thanks! We will verify your payment shortly.'); go('#/track/' + payCtx.id); }
    else if (k === 'track') { const url = `/api/track?id=${encodeURIComponent(d.id.trim())}&contact=${encodeURIComponent((d.contact || '').trim())}`;
      const draw = x => { const el = $('#tres'); if (el) el.innerHTML = `<div class="sum">${orderBox(x)}</div><div style="margin-top:12px">${pendingBtns(x)}</div>`; };
      draw(await api(url)); say(f, '', true); startPoll(() => api(url).then(draw)); }
  } catch (err) { say(f, err.message); }
});
document.addEventListener('input', e => { // tidy card number / expiry as the customer types
  const t = e.target;
  if (t.id === 'utr') t.value = t.value.replace(/\D/g, '').slice(0, 12);
  else if (t.id === 'cn2') t.value = t.value.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
  else if (t.id === 'cn3') { const v = t.value.replace(/\D/g, '').slice(0, 4); t.value = v.length > 2 ? v.slice(0, 2) + '/' + v.slice(2) : v; }
});
route();
