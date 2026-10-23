/* Client-side form validation + payload builder. Mirrors Code.gs validate_() so the customer sees errors before POST. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(); else root.SbxValidate = factory();
}(this, function () {
  'use strict';
  var CAPS = { name: 60, mobile: 20, address: 200, area: 40, items: 30 };
  var MSG = {
    empty_cart: 'Pumili muna ng kahit isang item.',
    bad_name: 'Pakilagay ang pangalan mo (hanggang 60 characters).',
    bad_mobile: 'Pakilagay ang tamang mobile number (hal. 09171234567).',
    bad_mode: 'Pumili kung Delivery o Pickup.',
    missing_area: 'Pumili ng area para sa delivery.',
    missing_address: 'Kailangan ang address para sa delivery.',
    bad_address: 'Pakikumpleto ang address (at least 8 characters).',
    pickup_only: 'Hindi available ang delivery sa area na ito. Pick up lang.',
    bad_pay_mode: 'Pumili ng paraan ng bayad.',
    cod_not_allowed: 'Hindi available ang COD. Pumili ng ibang paraan ng bayad.',
    bad_qty: 'Mali ang dami ng item (1 hanggang 999).'
  };
  function clean(v) { return typeof v === 'string' ? v.replace(/\s+/g, ' ').trim() : ''; }
  function normMobile(v) {   // same rule as Code.gs normMobile_()
    if (typeof v !== 'string' || v.length > CAPS.mobile) return null;
    var m = v.replace(/[\s\-().]/g, '').match(/^(?:\+?63|0)(9\d{9})$/);
    return m ? '0' + m[1] : null;
  }
  /** f = {items:[{sku,qty}], name, mobile, mode, area, address, pay_mode}; payModes = form_config.pay_modes;
   *  deliveryAllowed(area) -> bool. Returns {ok, errors:{field: code}}. */
  function validateForm(f, payModes, deliveryAllowed) {
    var e = {}, items = (f.items || []).filter(function (i) { return i.qty > 0; });
    if (!items.length || items.length > CAPS.items) e.items = 'empty_cart';
    items.forEach(function (i) { if (Math.floor(i.qty) !== i.qty || i.qty > 999) e.items = 'bad_qty'; });
    var name = clean(f.name); if (!name || name.length > CAPS.name) e.name = 'bad_name';
    if (!normMobile(f.mobile || '')) e.mobile = 'bad_mobile';
    if (f.mode !== 'delivery' && f.mode !== 'pickup') e.mode = 'bad_mode';
    if (f.mode === 'delivery') {
      var area = clean(f.area);
      if (!area) e.area = 'missing_area'; else if (!deliveryAllowed(area)) e.area = 'pickup_only';
      var addr = clean(f.address);
      if (!addr) e.address = 'missing_address'; else if (addr.length < 8 || addr.length > CAPS.address) e.address = 'bad_address';
    }
    if ((payModes || []).indexOf(f.pay_mode) < 0) e.pay_mode = f.pay_mode === 'cod' ? 'cod_not_allowed' : 'bad_pay_mode';
    return { ok: Object.keys(e).length === 0, errors: e };
  }
  /** Exact POST body Code.gs doPost() expects (ALLOWED keys only; no price fields). */
  function buildPayload(f, cfg) {
    var p = { origin: cfg.origin, form_key: cfg.formKey, cart_id: f.cart_id,
              items: (f.items || []).filter(function (i) { return i.qty > 0; }).map(function (i) { return { sku: i.sku, qty: i.qty }; }),
              name: clean(f.name), mobile: clean(f.mobile), mode: f.mode, pay_mode: f.pay_mode, source: 'form',
              idempotency_key: f.idempotency_key };
    if (f.mode === 'delivery') { p.area = clean(f.area); p.address = clean(f.address); }
    return p;
  }
  function newIdemKey() {
    var c = (typeof crypto !== 'undefined' && crypto.getRandomValues) ? crypto : null, a = '', chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (var i = 0; i < 24; i++) a += chars[c ? c.getRandomValues(new Uint8Array(1))[0] % 62 : Math.floor(Math.random() * 62)];
    return a;
  }
  var SERVER_MSG = {
    expired: 'Expired na ang link na ito. Mag-message ulit sa page para sa bagong link.',
    used: 'Nagamit na ang link na ito. Mag-message sa page kung may babaguhin.',
    rate_limited: 'Masyadong maraming subok. Subukan ulit after ilang minuto.',
    busy: 'Busy ang system. Subukan ulit.', area_not_in_table: MSG.pickup_only, cod_not_allowed: MSG.cod_not_allowed,
    missing_address: MSG.missing_address, bad_address: MSG.bad_address, missing_area: MSG.missing_area,
    bad_name: MSG.bad_name, bad_mobile: MSG.bad_mobile, bad_key: 'Hindi ma-submit ang form (config). Mag-message sa page.',
    not_configured: 'Hindi pa ready ang order form. Mag-message sa page.', cap_reached: 'Hindi pa ready ang order form. Mag-message sa page.'
  };
  function serverMessage(code) { return SERVER_MSG[code] || ('May error (' + String(code || 'network') + '). Subukan ulit o mag-message sa page.'); }
  return { validateForm: validateForm, buildPayload: buildPayload, normMobile: normMobile, newIdemKey: newIdemKey, MSG: MSG, serverMessage: serverMessage };
}));
