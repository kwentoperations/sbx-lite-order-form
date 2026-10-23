'use strict';
// Page preview == box drain total (v2 cart_quote after bulk + b3 quote_total fee). Needs python3 + the box sources; skipped elsewhere.
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('fs'), path = require('path'), { spawnSync } = require('child_process');
const Q = require('../lib/quote.js');
const have = fs.existsSync('/workspace/bot-fbm-lite/v2/catalog.py') && fs.existsSync('/workspace/bot-staff/b3/fee.py');
const CAT = { SOAP: { price: '38', stock_status: 'meron pa', bulk_min_qty: '12', bulk_price: '35' }, TIS: { price: '18', stock_status: 'meron pa', bulk_min_qty: '24', bulk_price: '16' },
  OIL: { price: '₱1,250.50', bulk_min_qty: '3', discount_pct: '10' }, RICE: { price: '980' } };
const FEE = { delivery_fee_mode: 'flat', delivery_fee_flat: '80', delivery_areas: 'QC, MKT', free_delivery_min: '1500', cod_allowed: 'yes' };
const BULKS = [{ bulk_rule: 'none' }, { bulk_rule: 'qty' }, { bulk_rule: 'value', order_min_value: '2000', order_discount_pct: '5' },
  { bulk_rule: 'both', order_min_value: '2000', order_discount_pct: '5', order_bulk_price: '' }, { bulk_rule: 'value', order_min_value: '1000', order_bulk_price: '950' }];
const CARTS = [[['SOAP', 2]], [['SOAP', 12]], [['SOAP', 60], ['TIS', 30]], [['OIL', 2]], [['OIL', 3], ['RICE', 1]], [['RICE', 2]], [['TIS', 23], ['SOAP', 11]]];
const cases = [];
for (const s of BULKS) for (const c of CARTS) for (const [mode, area] of [['delivery', 'QC'], ['pickup', '']])
  cases.push({ cat: CAT, s, fee_settings: FEE, items: c.map(([sku, qty]) => ({ sku, qty })), mode, area, pay: 'prepaid' });
test('page total == drain total (' + cases.length + ' cases)', { skip: !have && 'box sources not present' }, () => {
  const r = spawnSync('python3', [path.join(__dirname, 'drain_parity.py')], { input: JSON.stringify(cases), encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr); const drain = JSON.parse(r.stdout);
  // the page sees what Code.gs >= 0.3.5 sends: catalog rows with bulk cells, form_config with fees + bulk
  const fcBase = { modes: ['delivery', 'pickup'], area_options: ['QC', 'MKT', 'Wala sa listahan'], not_listed: 'Wala sa listahan', pay_modes: ['prepaid', 'cod'],
    delivery_fee_mode: 'flat', delivery_fee_by_area: { QC: 80, MKT: 80 }, free_delivery_min: 1500 };
  let differ = 0;
  cases.forEach((c, i) => {
    const catalog = Object.keys(c.cat).map(k => Object.assign({ sku: k }, c.cat[k], { price: Number(String(c.cat[k].price).replace(/[₱,]/g, '')) }));
    const q = Q.pageQuote(c.items, catalog, Object.assign({ bulk: c.s }, fcBase), c.mode, c.area, c.pay);
    assert.equal(q.subtotal, drain[i].subtotal, 'subtotal ' + JSON.stringify(c.items) + JSON.stringify(c.s));
    assert.equal(q.total, drain[i].total, 'total ' + JSON.stringify(c.items) + JSON.stringify(c.s) + c.mode);
    const noBulk = Q.pageQuote(c.items, catalog, fcBase, c.mode, c.area, c.pay); if (noBulk.subtotal !== q.subtotal) differ++;
  });
  assert.ok(differ > 0, 'cases must exercise bulk discounts');
});
