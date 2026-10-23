/* Fee/total logic. EXACT port of Code.gs v3lite-p0-0.3.4-b3 preview_() + quoteTotal_() (and helpers).
 * Do not change the math here without changing Code.gs; tests/quote.test.js checks parity against Code.gs. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(); else root.SbxQuote = factory();
}(this, function () {
  'use strict';
  var B3_FREE_TEXT = 'Libre ang delivery', B3_NOT_LISTED = 'Wala sa listahan';
  var B3_PICKUP_ONLY_TEXT = 'Hindi available ang delivery sa area na ito. Pick up lang.';
  var B3_MODES = ['pickup', 'delivery'], B3_PAY = ['prepaid', 'cod'], B3_FEE_MODES = ['none', 'flat', 'per_area'];

  // ---- preview_ (cart subtotal after bulk/discount rules) ----
  function num_(v) { var s = String(v == null ? '' : v).replace(/[₱,%\s]/g, ''); if (!s) return null; var n = Number(s); return isNaN(n) ? null : n; }
  function r2_(x) { return Math.round(x * 100) / 100; }
  function preview_(items, cat, s) {
    var rule = String(s.bulk_rule || 'none').toLowerCase(), sub = 0, qtyTot = 0, qtyMet = false, n = 0;
    for (var i = 0; i < items.length; i++) {
      var r = cat[items[i].sku], q = items[i].qty, p = num_(r.price);
      if (p === null) return null;
      if (String(r.stock_status || '').trim().toLowerCase() === 'out') continue;
      n++; var reg = r2_(p * q); sub += reg;
      var mn = num_(r.bulk_min_qty), bp = num_(r.bulk_price), dp = num_(r.discount_pct), lt = reg;
      if ((bp !== null || dp !== null) && !(mn !== null && q < mn)) { lt = bp !== null ? r2_(bp * q) : r2_(r2_(p * (1 - dp / 100)) * q); qtyMet = true; }
      qtyTot += lt;
    }
    if (!n) return null;
    sub = r2_(sub); var c = [];
    if ((rule === 'qty' || rule === 'both') && qtyMet) c.push(r2_(qtyTot));
    var mv = num_(s.order_min_value), obp = num_(s.order_bulk_price), odp = num_(s.order_discount_pct) || 0;
    if ((rule === 'value' || rule === 'both') && mv !== null && sub >= mv) c.push(r2_(Math.min(obp !== null ? obp : sub * (1 - odp / 100), sub)));
    return c.length ? Math.min.apply(null, c) : sub;
  }

  // ---- quoteTotal_ (delivery fee + pay mode) ----
  function b3num_(v) {
    if (v === null || v === undefined || typeof v === 'boolean') return null;
    var t = String(v).replace(/,/g, '').replace(/₱/g, '').trim(); if (t === '') return null;
    var n = Number(t); return isNaN(n) ? null : n;
  }
  function b3areas_(s) { return String((s || {}).delivery_areas || '').replace(/\n/g, ',').split(',').map(function (a) { return a.trim(); }).filter(Boolean); }
  function b3areaOptions_(s) { return b3areas_(s).concat([B3_NOT_LISTED]); }
  function b3codAllowed_(s) { var v = (s || {}).cod_allowed; return ['yes', 'true', '1', 'oo'].indexOf(String(v === undefined || v === null ? '' : v).trim().toLowerCase()) >= 0; }
  function b3r2_(x) { return Math.round((Number(x) + 1e-9) * 100) / 100; }
  function quoteTotal_(subtotalAfterDiscount, s, mode, area, payMode) {
    s = s || {}; area = area || ''; payMode = payMode === undefined ? 'prepaid' : payMode;
    var base = b3num_(subtotalAfterDiscount);
    var out = { ok: false, reason: null, fee: 0, free_delivery: false, total: null, preview_text: '', mode: mode,
                area: mode === 'delivery' ? String(area).trim() : '', pay_mode: payMode };
    function bad(r) { out.reason = r; return out; }
    if (base === null || base < 0) return bad('bad_amount');
    if (B3_MODES.indexOf(mode) < 0) return bad('bad_mode');
    if (B3_PAY.indexOf(payMode) < 0) return bad('bad_pay_mode');
    if (payMode === 'cod' && !b3codAllowed_(s)) return bad('cod_not_allowed');
    var fee = 0;
    if (mode === 'delivery') {
      var a = out.area;
      if (b3areas_(s).indexOf(a) < 0) return bad('area_not_in_table');
      var fm = String(s.delivery_fee_mode || 'none').trim().toLowerCase();
      if (B3_FEE_MODES.indexOf(fm) < 0) return bad('bad_fee_mode');
      if (fm === 'flat') fee = b3num_(s.delivery_fee_flat); else if (fm === 'per_area') fee = b3num_(s['delivery_fee_area:' + a]);
      if (fee === null || fee < 0) return bad('fee_missing');
      var thr = b3num_(s.free_delivery_min);
      if (thr !== null && base >= thr - 1e-9 && fee > 0) { fee = 0; out.free_delivery = true; out.preview_text = B3_FREE_TEXT; }
    }
    out.ok = true; out.fee = b3r2_(fee); out.total = b3r2_(base + out.fee);
    return out;
  }

  // ---- page adapter: GET form_config -> the Settings subset quoteTotal_ reads ----
  // formConfig_() in Code.gs exposes per-area fees (flat mode = same fee for every area), the threshold and pay modes.
  function settingsFromFormConfig(fc) {
    fc = fc || {};
    var notListed = fc.not_listed || B3_NOT_LISTED, fees = fc.delivery_fee_by_area || {};
    var areas = (fc.area_options || []).filter(function (a) { return a !== notListed; });
    var s = { delivery_fee_mode: fc.delivery_fee_mode || 'none', delivery_areas: areas.join(','),
              free_delivery_min: fc.free_delivery_min == null ? '' : String(fc.free_delivery_min),
              cod_allowed: (fc.pay_modes || []).indexOf('cod') >= 0 ? 'yes' : 'no' };
    areas.forEach(function (a) { s['delivery_fee_area:' + a] = fees[a] == null ? '' : String(fees[a]); });
    if (areas.length) s.delivery_fee_flat = fees[areas[0]] == null ? '' : String(fees[areas[0]]);
    return s;
  }
  /** Area the customer picked can be delivered to? ("Wala sa listahan" or not in the table -> pickup only). */
  function deliveryAllowed(fc, area) {
    var s = settingsFromFormConfig(fc); return !!area && b3areas_(s).indexOf(String(area).trim()) >= 0;
  }
  /** Full page quote: cart lines -> subtotal (preview_) -> fee/total (quoteTotal_). */
  function pageQuote(items, catalogList, fc, mode, area, payMode) {
    var cat = {}; (catalogList || []).forEach(function (r) { cat[r.sku] = r; });
    var lines = (items || []).filter(function (it) { return it.qty > 0 && cat[it.sku]; });
    var sub = lines.length ? preview_(lines, cat, {}) : null;
    if (sub === null) return { ok: false, reason: 'empty_cart', subtotal: null, fee: 0, total: null, free_delivery: false, preview_text: '' };
    var q = quoteTotal_(sub, settingsFromFormConfig(fc), mode, area, payMode);
    q.subtotal = sub; return q;
  }
  return { preview_: preview_, quoteTotal_: quoteTotal_, b3areaOptions_: b3areaOptions_, b3codAllowed_: b3codAllowed_,
           settingsFromFormConfig: settingsFromFormConfig, deliveryAllowed: deliveryAllowed, pageQuote: pageQuote,
           FREE_TEXT: B3_FREE_TEXT, NOT_LISTED: B3_NOT_LISTED, PICKUP_ONLY_TEXT: B3_PICKUP_ONLY_TEXT };
}));
