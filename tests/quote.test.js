'use strict';
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('fs'), vm = require('vm'), path = require('path');
const Q = require('../lib/quote.js');
const fx = require('./fixtures/cases.json'), exp = require('./fixtures/expected.json'), PREV = require('./fixtures/preview_cases.js');
const CODE = process.env.CODE_GS || '/workspace/bot-fbm-lite/v3lite/apps_script/Code.gs';

test('fixture snapshot is from Code.gs v0.3.4-b3', () => assert.equal(exp.code_gs_version, 'v3lite-p0-0.3.4-b3'));
test('quoteTotal_ parity with backend snapshot (' + fx.cases.length + ' cases)', () => {
  fx.cases.forEach((c, i) => assert.deepEqual(Q.quoteTotal_(c[0], c[1], c[2], c[3], c[4]), exp.quote[i], JSON.stringify(c)));
});
test('preview_ parity with backend snapshot (' + PREV.length + ' cases)', () => {
  PREV.forEach((p, i) => assert.deepEqual(Q.preview_(p.items, p.cat, p.s), exp.preview[i], JSON.stringify(p)));
});
test('form_config adapter: quote from form_config == quote from raw Settings', () => {
  fx.settings.forEach((s, si) => {
    const fc = exp.form_config[si], s2 = Q.settingsFromFormConfig(fc);
    for (const amt of [0, 76, 500, 1499.99, 1500, 2400]) for (const m of ['delivery', 'pickup'])
      for (const a of fc.area_options.concat(['PSG', ''])) for (const p of ['prepaid', 'cod'])
        assert.deepEqual(Q.quoteTotal_(amt, s2, m, a, p), Q.quoteTotal_(amt, s, m, a, p), JSON.stringify([si, amt, m, a, p]));
  });
});
test('spec examples', () => {
  const FLAT = fx.settings[0];
  assert.equal(Q.quoteTotal_(500, FLAT, 'delivery', 'QC').total, 580);
  const f = Q.quoteTotal_(1500, FLAT, 'delivery', 'QC'); assert.deepEqual([f.fee, f.free_delivery, f.preview_text], [0, true, 'Libre ang delivery']);
  assert.equal(Q.quoteTotal_(1499.99, FLAT, 'delivery', 'QC').total, 1579.99);
  assert.equal(Q.quoteTotal_(9999, FLAT, 'delivery', 'Wala sa listahan').reason, 'area_not_in_table');
  assert.equal(Q.quoteTotal_(500, fx.settings[1], 'delivery', 'QC', 'cod').reason, 'cod_not_allowed');
});
test('deliveryAllowed + pageQuote (OOS excluded)', () => {
  const fc = exp.form_config[2];
  assert.deepEqual(fc.area_options, ['QC', 'MKT', 'Wala sa listahan']);
  assert.equal(Q.deliveryAllowed(fc, 'QC'), true); assert.equal(Q.deliveryAllowed(fc, 'Wala sa listahan'), false); assert.equal(Q.deliveryAllowed(fc, ''), false);
  const cat = [{ sku: 'A', price: 750 }, { sku: 'X', price: 10, stock_status: 'out' }];
  const q = Q.pageQuote([{ sku: 'A', qty: 2 }, { sku: 'X', qty: 5 }], cat, fc, 'delivery', 'QC', 'cod');
  assert.deepEqual([q.subtotal, q.fee, q.total, q.preview_text], [1500, 0, 1500, 'Libre ang delivery']);
  assert.equal(Q.pageQuote([], cat, fc, 'pickup', '', 'prepaid').reason, 'empty_cart');
});
test('live parity against Code.gs on disk (skipped if absent)', { skip: !fs.existsSync(CODE) && 'Code.gs not on this machine' }, () => {
  const ctx = {}; vm.createContext(ctx); vm.runInContext(fs.readFileSync(CODE, 'utf8'), ctx);
  assert.equal(ctx.VERSION, exp.code_gs_version, 'Code.gs changed version: rerun scripts/gen-fixtures.js and re-check the port');
  fx.cases.forEach(c => assert.deepEqual(Q.quoteTotal_(c[0], c[1], c[2], c[3], c[4]), JSON.parse(JSON.stringify(ctx.quoteTotal_(c[0], c[1], c[2], c[3], c[4])))));
  PREV.forEach(p => assert.deepEqual(Q.preview_(p.items, p.cat, p.s), ctx.preview_(p.items, p.cat, p.s)));
  fx.settings.forEach(s => assert.deepEqual(Q.b3areaOptions_(s), JSON.parse(JSON.stringify(ctx.b3areaOptions_(s)))));
});
