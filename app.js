/* SBX-LITE order form page. Data: GET {apiUrl}?cart=ID -> {lines, catalog, form_config}; POST text/plain JSON -> {ok, submission_id, preview_total}. */
(function () {
  'use strict';
  var Q = window.SbxQuote, V = window.SbxValidate, CFG = window.SBX_CONFIG || {};
  var $ = function (id) { return document.getElementById(id); };
  var state = { cartId: '', catalog: [], qty: {}, fc: null, mode: '', pay: '', idem: V.newIdemKey(), sending: false };
  var PAY_LABEL = { prepaid: 'Prepaid (GCash/bank)', cod: 'COD (cash on delivery)' }, MODE_LABEL = { delivery: 'Delivery', pickup: 'Pickup' };
  function peso(n) { return n == null ? '—' : '₱' + Number(n).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function setStatus(t, isErr) { var s = $('status'); s.textContent = t || ''; s.className = 'status' + (isErr ? ' error' : ''); }
  function el(tag, attrs, kids) { var e = document.createElement(tag); Object.keys(attrs || {}).forEach(function (k) { if (k === 'text') e.textContent = attrs[k]; else e.setAttribute(k, attrs[k]); }); (kids || []).forEach(function (c) { e.appendChild(c); }); return e; }
  function isOut(r) { return String(r.stock_status || '').trim().toLowerCase() === 'out'; }
  function label(r) { return [r.name, r.variant].filter(Boolean).join(' · '); }
  function items() { return Object.keys(state.qty).filter(function (k) { return state.qty[k] > 0; }).map(function (k) { return { sku: k, qty: state.qty[k] }; }); }

  function cartIdFromUrl() { var p = new URLSearchParams(location.search); return p.get('cart') || p.get('c') || ''; }
  function configured() { return CFG.apiUrl && CFG.apiUrl.indexOf('__') !== 0 && CFG.formKey && CFG.formKey.indexOf('__') !== 0; }

  function renderCatalog() {
    var ul = $('catalog'); ul.innerHTML = '';
    state.catalog.filter(function (r) { return !isOut(r) && r.price != null; }).forEach(function (r) {   // OOS hidden
      var inp = el('input', { type: 'number', inputmode: 'numeric', min: '0', max: '999', value: String(state.qty[r.sku] || 0), 'aria-label': 'Dami ' + label(r) });
      var minus = el('button', { type: 'button', 'aria-label': 'Bawasan', text: '−' }), plus = el('button', { type: 'button', 'aria-label': 'Dagdagan', text: '+' });
      function set(n) { n = Math.max(0, Math.min(999, Math.floor(Number(n) || 0))); state.qty[r.sku] = n; inp.value = String(n); update(); }
      minus.onclick = function () { set((state.qty[r.sku] || 0) - 1); }; plus.onclick = function () { set((state.qty[r.sku] || 0) + 1); };
      inp.onchange = function () { set(inp.value); };
      ul.appendChild(el('li', {}, [el('span', { class: 'item', text: label(r) }, [el('small', { text: (r.unit ? r.unit + ' · ' : '') + peso(r.price) })]), el('span', { class: 'step' }, [minus, inp, plus])]));
    });
  }
  function radios(boxId, name, values, labels, current, onPick) {
    var box = $(boxId); box.innerHTML = '';
    values.forEach(function (v) {
      var i = el('input', { type: 'radio', name: name, value: v }); i.checked = v === current;
      i.onchange = function () { onPick(v); };
      box.appendChild(el('label', { 'data-value': v }, [i, document.createTextNode(labels[v] || v)]));
    });
  }
  function update() {
    var fc = state.fc, area = $('area').value, delivOk = Q.deliveryAllowed(fc, area);
    var pickupOnly = !!area && !delivOk;   // "Wala sa listahan" or area outside the table -> pickup only
    if (pickupOnly && state.mode === 'delivery') state.mode = 'pickup';
    $('pickupOnly').hidden = !pickupOnly; $('pickupOnly').textContent = fc.pickup_only_text || Q.PICKUP_ONLY_TEXT;
    radios('modes', 'mode', fc.modes || ['delivery', 'pickup'], MODE_LABEL, state.mode, function (v) { state.mode = v; update(); });
    var dl = document.querySelector('#modes [data-value=delivery]');
    if (dl) { dl.classList.toggle('disabled', pickupOnly); dl.querySelector('input').disabled = pickupOnly; }
    $('addressWrap').hidden = state.mode !== 'delivery'; $('address').required = state.mode === 'delivery';
    var pays = fc.pay_modes || ['prepaid'];   // COD shown only when the backend allows it
    if (pays.indexOf(state.pay) < 0) state.pay = pays.length === 1 ? pays[0] : '';
    radios('pays', 'pay_mode', pays, PAY_LABEL, state.pay, function (v) { state.pay = v; update(); });

    var ul = $('cart'); ul.innerHTML = ''; var byS = {}; state.catalog.forEach(function (r) { byS[r.sku] = r; });
    var its = items();
    if (!its.length) ul.appendChild(el('li', { text: 'Wala pang laman ang cart.' }));
    its.forEach(function (it) { var r = byS[it.sku]; ul.appendChild(el('li', {}, [el('span', { class: 'item', text: it.qty + ' × ' + label(r) }), el('span', { class: 'price', text: peso(Math.round(r.price * it.qty * 100) / 100) })])); });
    var q = Q.pageQuote(its, state.catalog, fc, state.mode || 'pickup', area, state.pay || 'prepaid');
    $('subtotal').textContent = peso(q.subtotal);
    $('fee').textContent = state.mode === 'delivery' ? (q.ok ? (q.free_delivery ? 'Libre' : peso(q.fee)) : '—') : peso(0);
    $('total').textContent = q.ok ? peso(q.total) : peso(q.subtotal);
    $('free').hidden = !(q.ok && q.free_delivery); $('free').textContent = q.preview_text || fc.free_text || Q.FREE_TEXT;
  }
  function showErrors(errs) {
    document.querySelectorAll('.err[data-for]').forEach(function (p) { var c = errs[p.getAttribute('data-for')]; p.textContent = c ? (V.MSG[c] || c) : ''; });
  }
  function form() { return { cart_id: state.cartId, items: items(), name: $('name').value, mobile: $('mobile').value, mode: state.mode, area: $('area').value, address: $('address').value, pay_mode: state.pay, idempotency_key: state.idem }; }

  function submit(ev) {
    ev.preventDefault(); if (state.sending) return;
    var f = form(), v = V.validateForm(f, state.fc.pay_modes || ['prepaid'], function (a) { return Q.deliveryAllowed(state.fc, a); });
    showErrors(v.errors); if (!v.ok) { setStatus('May kulang o mali sa form. Pakicheck sa taas.', true); return; }
    state.sending = true; $('submit').disabled = true; setStatus('Sine-send ang order…');
    fetch(CFG.apiUrl, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(V.buildPayload(f, CFG)) })   // text/plain = no CORS preflight
      .then(function (r) { return r.json(); })
      .then(function (res) {
        if (!res.ok) throw { code: res.error };
        $('order').hidden = true; $('done').hidden = false; setStatus('');
        $('ref').textContent = String(res.submission_id || '').slice(0, 8); $('doneTotal').textContent = peso(res.preview_total) + (res.free_delivery ? ' (' + (res.preview_text || Q.FREE_TEXT) + ')' : '');
      })
      .catch(function (e) { setStatus(V.serverMessage(e && e.code), true); if (e && e.code === 'area_not_in_table') { state.mode = 'pickup'; update(); } })
      .then(function () { state.sending = false; $('submit').disabled = false; });   // same idempotency key on retry -> same submission
  }

  function load() {
    state.cartId = cartIdFromUrl();
    if (!configured()) return setStatus('Hindi pa naka-configure ang order form (config.js).', true);
    if (!state.cartId) return setStatus('Kulang ang link. Mag-message sa page para sa order link mo.', true);
    fetch(CFG.apiUrl + '?cart=' + encodeURIComponent(state.cartId))
      .then(function (r) { return r.json(); })
      .then(function (res) {
        if (!res.ok) throw { code: res.error };
        state.catalog = res.catalog || []; state.fc = res.form_config || {};
        (res.lines || []).forEach(function (l) { var r = state.catalog.filter(function (c) { return c.sku === l.sku; })[0]; if (r && !isOut(r)) state.qty[l.sku] = l.qty; });
        var sel = $('area'); (state.fc.area_options || []).forEach(function (a) { sel.appendChild(el('option', { value: a, text: a })); });
        sel.onchange = update;
        renderCatalog(); update(); setStatus(''); $('order').hidden = false;
      })
      .catch(function (e) { setStatus(V.serverMessage(e && e.code), true); });
  }
  $('order').addEventListener('submit', submit);
  load();
}());
