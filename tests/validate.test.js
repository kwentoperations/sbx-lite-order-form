'use strict';
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('fs'), vm = require('vm');
const V = require('../lib/validate.js');
const CODE = process.env.CODE_GS || '/workspace/bot-fbm-lite/v3lite/apps_script/Code.gs';
const allowed = a => ['QC', 'MKT'].includes(a);
const good = o => Object.assign({ cart_id: 'TESTCART', items: [{ sku: 'SOAP-BAR-135', qty: 2 }], name: 'Juan Dela Cruz', mobile: '0917 123 4567',
  mode: 'delivery', area: 'QC', address: '12 Mabini St, Quezon City', pay_mode: 'prepaid', idempotency_key: 'abcDEF123456' }, o);
const v = (o, pays) => V.validateForm(good(o), pays || ['prepaid', 'cod'], allowed);

test('valid delivery and pickup', () => { assert.ok(v({}).ok); assert.ok(v({ mode: 'pickup', area: '', address: '' }).ok); });
test('address required only for delivery', () => {
  assert.equal(v({ address: '' }).errors.address, 'missing_address'); assert.equal(v({ address: 'short' }).errors.address, 'bad_address');
  assert.ok(v({ mode: 'pickup', address: '' }).ok);
});
test('area: missing, Wala sa listahan, outside table -> pickup only', () => {
  assert.equal(v({ area: '' }).errors.area, 'missing_area');
  assert.equal(v({ area: 'Wala sa listahan' }).errors.area, 'pickup_only'); assert.equal(v({ area: 'PSG' }).errors.area, 'pickup_only');
  assert.ok(v({ mode: 'pickup', area: 'Wala sa listahan' }).ok);
});
test('pay mode: COD only if allowed', () => {
  assert.ok(v({ pay_mode: 'cod' }).ok); assert.equal(v({ pay_mode: 'cod' }, ['prepaid']).errors.pay_mode, 'cod_not_allowed');
  assert.equal(v({ pay_mode: '' }).errors.pay_mode, 'bad_pay_mode');
});
test('name, mobile, mode, items', () => {
  assert.equal(v({ name: '  ' }).errors.name, 'bad_name'); assert.equal(v({ name: 'x'.repeat(61) }).errors.name, 'bad_name');
  for (const m of ['09171234567', '+639171234567', '639171234567', '(0917) 123-4567']) assert.ok(v({ mobile: m }).ok, m);
  for (const m of ['0817123456', '12345', '']) assert.equal(v({ mobile: m }).errors.mobile, 'bad_mobile', m);
  assert.equal(V.normMobile('+63 917 123 4567'), '09171234567');
  assert.equal(v({ mode: 'ship' }).errors.mode, 'bad_mode');
  assert.equal(v({ items: [] }).errors.items, 'empty_cart'); assert.equal(v({ items: [{ sku: 'A', qty: 0 }] }).errors.items, 'empty_cart');
  assert.equal(v({ items: [{ sku: 'A', qty: 1000 }] }).errors.items, 'bad_qty');
});
test('payload has only Code.gs ALLOWED keys and passes backend validate_()', { skip: !fs.existsSync(CODE) && 'Code.gs not on this machine' }, () => {
  const ctx = {}; vm.createContext(ctx); vm.runInContext(fs.readFileSync(CODE, 'utf8'), ctx);
  const allowedKeys = vm.runInContext('Object.keys(ALLOWED)', ctx);
  const cfg = { origin: 'https://kwentoperations.github.io', formKey: 'fk-placeholder00000000' };
  for (const f of [good({}), good({ mode: 'pickup', area: 'Wala sa listahan', address: 'x' }), good({ pay_mode: 'cod' })]) {
    const p = V.buildPayload(f, cfg);
    Object.keys(p).forEach(k => assert.ok(allowedKeys.includes(k), k));
    const r = ctx.validate_(JSON.parse(JSON.stringify(p))); assert.equal(r.error, undefined, JSON.stringify(r));
    if (f.mode === 'pickup') { assert.equal('address' in p, false); assert.equal('area' in p, false); }
  }
});
test('payload field names', () => {
  const p = V.buildPayload(good({}), { origin: 'o', formKey: 'k' });
  assert.deepEqual(Object.keys(p).sort(), ['address', 'area', 'cart_id', 'form_key', 'idempotency_key', 'items', 'mobile', 'mode', 'name', 'origin', 'pay_mode', 'source'].sort());
  assert.match(V.newIdemKey(), /^[A-Za-z0-9_-]{8,64}$/);
});
test('server error copy', () => { assert.match(V.serverMessage('expired'), /Expired/); assert.match(V.serverMessage('zzz'), /zzz/); });
