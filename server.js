// Smart Stationery server (Node 18+, no npm packages). Serves the website + API:
// real accounts (hashed passwords), Google/Yahoo sign-in, orders, UPI QR payments, Razorpay cards, order tracking.
const http = require('http'), fs = require('fs'), path = require('path'), crypto = require('crypto'), vm = require('vm');
const ROOT = __dirname, DATA = path.join(__dirname, 'data'); fs.mkdirSync(DATA, { recursive: true });
try { fs.readFileSync(path.join(ROOT, '.env'), 'utf8').split(/\r?\n/).forEach(l => { const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/); if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, ''); }); } catch {}
const E = process.env, PORT = +E.PORT || 3000, BASE = E.BASE_URL || `http://localhost:${PORT}`;
const SECRET = E.TOKEN_SECRET || (console.warn('! Set TOKEN_SECRET in .env (otherwise logins reset on restart)'), crypto.randomBytes(32).toString('hex'));
const db = {get: n => { try { return JSON.parse(fs.readFileSync(path.join(DATA, n + '.json'))); } catch { return []; } }, set: (n, v) => fs.writeFileSync(path.join(DATA, n + '.json'), JSON.stringify(v, null, 1))};
const PRODUCTS = vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'products.js'), 'utf8') + ';PRODUCTS');// prices come from the server, never the browser
const eq = (a, b) => a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
const mac = s => crypto.createHmac('sha256', SECRET).update(s).digest('base64url');
const sign = p => { const b = Buffer.from(JSON.stringify({...p, exp: Date.now() + 6048e5})).toString('base64url'); return b + '.' + mac(b); };
const verify = t => { try { const [b, s] = String(t).split('.'); if (!eq(s, mac(b))) return; const p = JSON.parse(Buffer.from(b, 'base64url')); return p.exp > Date.now() ? p : undefined; } catch {} };
const hash = (pw, salt = crypto.randomBytes(16).toString('hex')) => salt + ':' + crypto.scryptSync(pw, salt, 64).toString('hex');
const same = (pw, h) => eq(hash(pw, h.split(':')[0]), h);
const hits = {}, limited = ip => { const n = Date.now(), a = hits[ip] = (hits[ip] || []).filter(t => n - t < 6e4); a.push(n); return a.length > 15; };
const send = (res, c, o) => { res.writeHead(c, {'Content-Type': 'application/json'}); res.end(JSON.stringify(o)); };
const body = req => new Promise((ok, no) => { let d = ''; req.on('data', c => { d += c; if (d.length > 1e5) { no(Error('Too large')); req.destroy(); } }); req.on('end', () => { try { ok(d ? JSON.parse(d) : {}); } catch { no(Error('Bad JSON')); } }); });
const auth = req => { const h = req.headers.authorization || ''; return h.startsWith('Bearer ') ? verify(h.slice(7)) : undefined; };
const emailOK = e => /^\S+@\S+\.\S+$/.test(e || '');
function upsert(email, name, provider, pw) {
  const us = db.get('users'); let u = us.find(x => x.email === email.toLowerCase());
  if (!u) { u = {id: crypto.randomUUID(), name, email: email.toLowerCase(), provider, pw}; us.push(u); db.set('users', us); }
  return {token: sign({uid: u.id, name: u.name, email: u.email}), user: {name: u.name, email: u.email}, u};
}
// Demo card payments (test card only, nothing stored) are ON unless DEMO_PAYMENTS=0, the site is https (live), or Razorpay keys are set.
const demoPay = () => !(E.RAZORPAY_KEY_ID && E.RAZORPAY_KEY_SECRET) && (E.DEMO_PAYMENTS === '1' || (E.DEMO_PAYMENTS !== '0' && !/^https:/.test(BASE)));
const demoUtr = () => E.DEMO_PAYMENTS === '1' || (E.DEMO_PAYMENTS !== '0' && !/^https:/.test(BASE)); // demo: any 12-digit UTR confirms the order
// ---- Automatic order tracking (demo timeline). Set AUTO_TRACKING=0 in .env to move orders by hand with the admin call instead.
// COD orders are confirmed 2 min after placing; paid (UPI/card) orders are confirmed at once. After confirmation:
// packed +5 min, shipped +2 min, out for delivery +2 min, delivered +5-10 min (random per order).
const STEPS = 6, MIN = 6e4, auto = () => E.AUTO_TRACKING !== '0';
const OFF = o => [0, 0, 5, 7, 9, 9 + (o.deliverMin || 7)]; // minutes after confirmation at which each step starts
const cAt = o => o.confirmAt || (['cod', 'paid'].includes(o.pay.status) ? o.created + 2 * MIN : null);
const autoStep = o => { const c = cAt(o); if (!c || Date.now() < c) return 0; const m = (Date.now() - c) / MIN, f = OFF(o); let st = 1; for (let k = 2; k < 6; k++) if (m >= f[k]) st = k; return st; };
const step = o => auto() ? autoStep(o) : o.history[o.history.length - 1].s;
const hist = o => { if (!auto()) return o.history; const c = cAt(o), f = OFF(o), h = [{s: 0, t: o.created}]; for (let k = 1; k <= step(o); k++) h.push({s: k, t: c + f[k] * MIN}); return h; };
const pub = o => ({id: o.id, step: step(o), history: hist(o), items: o.items, total: o.total, pay: {method: o.pay.method, status: o.pay.status}});
const find = id => db.get('orders').find(o => o.id === id);
const upd = o => { const a = db.get('orders'); a[a.findIndex(x => x.id === o.id)] = o; db.set('orders', a); };
const mine = (o, req, contact) => { const u = auth(req); return (u && o.userId === u.uid) || (contact && [o.customer.phone, o.customer.email].some(x => x && x.toLowerCase() === String(contact).trim().toLowerCase())); };
function price(items, coupon) {
  if (!Array.isArray(items) || !items.length) throw Error('Your cart is empty');
  let sub = 0; const out = items.map(i => { const p = PRODUCTS.find(x => x.id === +i.id), q = Math.min(99, Math.max(1, +i.q | 0)); if (!p) throw Error('Unknown product'); sub += p.p * q; return {id: p.id, n: p.n, p: p.p, q}; });
  const cp = coupon ? Math.round(sub * .1) : 0; return {items: out, total: sub - cp + (sub - cp >= 499 ? 0 : 49)};
}
async function api(req, res, u, p, ip) {
  const m = req.method, B = m === 'POST' || m === 'PATCH' ? await body(req) : {}, nf = () => send(res, 404, {error: 'Order not found. Check the order ID and your phone/email.'});
  if (p === '/api/config') return send(res, 200, {googleClientId: E.GOOGLE_CLIENT_ID || '', yahoo: !!(E.YAHOO_CLIENT_ID && E.YAHOO_CLIENT_SECRET), razorpayKeyId: E.RAZORPAY_KEY_ID || '', upiId: E.UPI_ID || 'deepamathi95@okhdfcbank', demoPayments: demoPay(), demoUtr: demoUtr(), upiName: E.UPI_NAME || 'Smart Stationery'});
  if (p === '/api/register' || p === '/api/login') {
    if (limited(ip)) return send(res, 429, {error: 'Too many attempts. Try again in a minute.'});
    if (!emailOK(B.email) || String(B.password || '').length < 6) return send(res, 400, {error: 'Enter a valid email and a password of 6+ characters.'});
    if (p === '/api/register') {
      if (String(B.name || '').trim().length < 2 || !/\d/.test(B.password)) return send(res, 400, {error: 'Enter your name and a password with a number.'});
      if (db.get('users').some(x => x.email === B.email.toLowerCase())) return send(res, 409, {error: 'An account with this email already exists.'});
      const r = upsert(B.email, B.name.trim().slice(0, 60), 'password', hash(B.password)); return send(res, 200, {token: r.token, user: r.user});
    }
    const u2 = db.get('users').find(x => x.email === B.email.toLowerCase());
    if (!u2 || !u2.pw || !same(B.password, u2.pw)) return send(res, 401, {error: 'Wrong email or password.'});
    const r = upsert(u2.email, u2.name, 'password'); return send(res, 200, {token: r.token, user: r.user});
  }
  if (p === '/api/auth/google') { // verifies the Google ID token with Google, and checks it was issued for OUR client id
    const g = await (await fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(B.credential || ''))).json();
    if (!E.GOOGLE_CLIENT_ID || g.aud !== E.GOOGLE_CLIENT_ID || g.email_verified !== 'true') return send(res, 401, {error: 'Google sign-in failed.'});
    const r = upsert(g.email, g.name || g.email.split('@')[0], 'google'); return send(res, 200, {token: r.token, user: r.user});
  }
  if (p === '/api/auth/yahoo') {
    if (!E.YAHOO_CLIENT_ID) return send(res, 400, {error: 'Yahoo is not configured'});
    res.writeHead(302, {Location: 'https://api.login.yahoo.com/oauth2/request_auth?' + new URLSearchParams({client_id: E.YAHOO_CLIENT_ID, redirect_uri: BASE + '/api/auth/yahoo/callback', response_type: 'code', scope: 'openid email profile', state: sign({n: crypto.randomUUID()})})}); return res.end();
  }
  if (p === '/api/auth/yahoo/callback') {
    const back = q => { res.writeHead(302, {Location: '/#/auth?' + q}); res.end(); };
    try {
      if (!verify(u.searchParams.get('state'))) throw Error('Invalid sign-in state');
      const t = await (await fetch('https://api.login.yahoo.com/oauth2/get_token', {method: 'POST', headers: {Authorization: 'Basic ' + Buffer.from(E.YAHOO_CLIENT_ID + ':' + E.YAHOO_CLIENT_SECRET).toString('base64'), 'Content-Type': 'application/x-www-form-urlencoded'}, body: new URLSearchParams({grant_type: 'authorization_code', code: u.searchParams.get('code') || '', redirect_uri: BASE + '/api/auth/yahoo/callback'})})).json();
      const y = await (await fetch('https://api.login.yahoo.com/openid/v1/userinfo', {headers: {Authorization: 'Bearer ' + t.access_token}})).json();
      if (!y.email) throw Error('Yahoo did not return an email'); return back('token=' + upsert(y.email, y.name || y.email.split('@')[0], 'yahoo').token);
    } catch (e) { return back('error=' + encodeURIComponent(e.message)); }
  }
  if (p === '/api/orders' && m === 'POST') {
    const c = B.customer || {};
    if (!c.name || !emailOK(c.email) || !/^\d{10}$/.test(c.phone || '') || !c.address || !/^\d{6}$/.test(c.pin || '')) return send(res, 400, {error: 'Please complete the delivery details.'});
    if (!['UPI', 'Google Pay', 'PhonePe', 'Credit / Debit Card', 'Cash on Delivery'].includes(B.method)) return send(res, 400, {error: 'Invalid payment method.'});
    const pr = price(B.items, B.coupon), a = auth(req), id = 'SS-' + new Date().toISOString().slice(2, 10).replace(/-/g, '') + '-' + crypto.randomBytes(3).toString('hex').toUpperCase();
    const o = {id, userId: a && a.uid, items: pr.items, total: pr.total, customer: {name: String(c.name).slice(0, 80), email: c.email, phone: c.phone, address: String(c.address).slice(0, 300), city: String(c.city || '').slice(0, 60), state: String(c.state || '').slice(0, 60), pin: c.pin}, pay: {method: B.method, status: B.method === 'Cash on Delivery' ? 'cod' : 'pending'}, history: [{s: 0, t: Date.now()}], created: Date.now(), deliverMin: 5 + crypto.randomInt(6), confirmAt: B.method === 'Cash on Delivery' ? Date.now() + 2 * MIN : null};
    const all = db.get('orders'); all.push(o); db.set('orders', all); return send(res, 200, {id, method: o.pay.method, total: o.total});
  }
  if (p === '/api/track') { const o = find(u.searchParams.get('id')); return o && mine(o, req, u.searchParams.get('contact')) ? send(res, 200, pub(o)) : nf(); }
  if (p === '/api/orders/mine') { const a = auth(req); return a ? send(res, 200, {orders: db.get('orders').filter(o => o.userId === a.uid).reverse().map(pub)}) : send(res, 401, {error: 'Login required'}); }
  let mm;
  if ((mm = p.match(/^\/api\/orders\/([\w-]+)\/utr$/))) { // customer reports a UPI payment; staff verify it in their UPI app and mark it paid
    const o = find(mm[1]); if (!o || !mine(o, req, B.contact)) return nf();
    if (o.pay.status !== 'pending') return send(res, 400, {error: 'This order is not awaiting payment.'});
    if (!/^\d{12}$/.test(B.utr || '')) return send(res, 400, {error: 'Enter the 12-digit UPI reference number (UTR) from your payment app.'});
    o.pay.utr = B.utr;
    if (demoUtr()) { o.pay.status = 'paid'; o.confirmAt = Date.now(); } else o.pay.status = 'verifying'; // live site: staff verify the UTR first
    upd(o); return send(res, 200, {ok: true, confirmed: demoUtr()});
  }
  if (p === '/api/pay/razorpay') {
    const o = find(B.orderId); if (!o || !mine(o, req, B.contact)) return nf();
    if (!E.RAZORPAY_KEY_ID || !E.RAZORPAY_KEY_SECRET) return send(res, 400, {error: 'Card payments need RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env (use test keys).'});
    const r = await fetch('https://api.razorpay.com/v1/orders', {method: 'POST', headers: {Authorization: 'Basic ' + Buffer.from(E.RAZORPAY_KEY_ID + ':' + E.RAZORPAY_KEY_SECRET).toString('base64'), 'Content-Type': 'application/json'}, body: JSON.stringify({amount: o.total * 100, currency: 'INR', receipt: o.id})});
    const d = await r.json(); if (!r.ok) return send(res, 502, {error: (d.error && d.error.description) || 'Razorpay error'});
    o.pay.rzp = d.id; upd(o); return send(res, 200, {rzpOrderId: d.id, amount: d.amount, keyId: E.RAZORPAY_KEY_ID});
  }
  if (p === '/api/pay/razorpay/verify') {
    const o = find(B.orderId); if (!o || !mine(o, req, B.contact)) return nf();
    const sig = crypto.createHmac('sha256', E.RAZORPAY_KEY_SECRET || '').update(B.razorpay_order_id + '|' + B.razorpay_payment_id).digest('hex');
    if (o.pay.rzp !== B.razorpay_order_id || !eq(sig, String(B.razorpay_signature || ''))) return send(res, 400, {error: 'Payment could not be verified.'});
    o.pay.status = 'paid'; o.pay.ref = B.razorpay_payment_id; o.confirmAt = Date.now(); upd(o); return send(res, 200, {ok: true});
  }
  if ((mm = p.match(/^\/api\/orders\/([\w-]+)\/demo-pay$/))) {
    if (!demoPay()) return send(res, 403, {error: 'Demo card payments are switched off.'});
    const o = find(mm[1]); if (!o || !mine(o, req, B.contact)) return nf();
    if (o.pay.status !== 'pending') return send(res, 400, {error: 'This order is not awaiting payment.'});
    o.pay.status = 'paid'; o.pay.ref = 'DEMO-' + crypto.randomBytes(4).toString('hex'); o.confirmAt = Date.now(); upd(o); return send(res, 200, {ok: true});
  }
  if ((mm = p.match(/^\/api\/orders\/([\w-]+)\/(cancel|method)$/))) { // only UNPAID orders can be deleted or switched to QR payment
    const o = find(mm[1]); if (!o || !mine(o, req, B.contact)) return nf();
    if (o.pay.status !== 'pending') return send(res, 400, {error: 'Only unpaid orders can be changed. Orders that are paid or being verified are handled by the shop.'});
    if (mm[2] === 'cancel') { db.set('orders', db.get('orders').filter(x => x.id !== o.id)); return send(res, 200, {ok: true}); }
    if (!['UPI', 'Google Pay', 'PhonePe'].includes(B.method)) return send(res, 400, {error: 'Invalid payment method.'});
    o.pay.method = B.method; upd(o); return send(res, 200, {ok: true});
  }
  if ((mm = p.match(/^\/api\/orders\/([\w-]+)\/status$/)) && m === 'PATCH') { // admin: header x-admin-key, body {step:0-5, paid:true}
    if (!E.ADMIN_KEY || req.headers['x-admin-key'] !== E.ADMIN_KEY) return send(res, 403, {error: 'Forbidden'});
    const o = find(mm[1]); if (!o) return nf();
    for (let s = o.history[o.history.length - 1].s + 1; s <= Math.min(+B.step, STEPS - 1); s++) o.history.push({s, t: Date.now()});
    if (B.paid) { o.pay.status = 'paid'; o.confirmAt = o.confirmAt || Date.now(); } upd(o); return send(res, 200, pub(o));
  }
  send(res, 404, {error: 'Not found'});
}
const MIME = {'.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.ico': 'image/x-icon'};
http.createServer(async (req, res) => {
  const u = new URL(req.url, BASE), p = u.pathname;
  try {
    if (p.startsWith('/api/')) return await api(req, res, u, p, req.socket.remoteAddress);
    const f = path.join(ROOT, p === '/' ? 'index.html' : decodeURIComponent(p)), rel = path.relative(ROOT, f);
    if (rel.startsWith('..') || /^(server|node_modules)([\\/]|$)/.test(rel) || path.basename(f).startsWith('.')) { res.writeHead(404); return res.end('Not found'); }
    fs.readFile(f, (e, d) => { if (e) { console.warn('404 missing file:', rel); res.writeHead(404); return res.end('Not found'); } res.writeHead(200, {'Content-Type': MIME[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store'}); res.end(d); });
  } catch (e) { send(res, 400, {error: e.message}); }
}).listen(PORT, () => {
  const ph = path.join(ROOT, 'assets', 'images', 'photos'), n = fs.existsSync(ph) ? fs.readdirSync(ph).filter(x => /\.(jpe?g|png|webp)$/i.test(x)).length : 0;
  console.log(`Smart Stationery running at ${BASE}\nServing files from: ${ROOT}\nProduct photos found: ${n}${n ? '' : '  <-- none! copy the assets/images/photos folder next to index.html'}\nUPI ID for QR payments: ${E.UPI_ID || 'deepamathi95@okhdfcbank'}\nCard payments: ${E.RAZORPAY_KEY_ID && E.RAZORPAY_KEY_SECRET ? 'Razorpay' : demoPay() ? 'demo form (test card 4111 1111 1111 1111)' : 'OFF (set DEMO_PAYMENTS=1 in .env for the demo form)'}`);
});
