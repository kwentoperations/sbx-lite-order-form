// preview_() cases (subtotal after bulk/discount). Catalog rows use the Sheet's display-string shapes.
const CAT = { A: { price: '100', stock_status: 'in' }, B: { price: '₱1,250.50', bulk_min_qty: '3', bulk_price: '1100' },
  C: { price: '80', discount_pct: '10%', bulk_min_qty: '5' }, D: { price: '50', stock_status: 'OUT' }, E: { price: '' } };
const S = [{}, { bulk_rule: 'qty' }, { bulk_rule: 'value', order_min_value: '2000', order_discount_pct: '5' },
  { bulk_rule: 'both', order_min_value: '2000', order_discount_pct: '5', order_bulk_price: '' }, { bulk_rule: 'value', order_min_value: '500', order_bulk_price: '450' }];
const ITEMS = [[{ sku: 'A', qty: 2 }], [{ sku: 'B', qty: 3 }], [{ sku: 'B', qty: 2 }, { sku: 'A', qty: 1 }], [{ sku: 'C', qty: 5 }], [{ sku: 'C', qty: 4 }],
  [{ sku: 'D', qty: 3 }], [{ sku: 'D', qty: 1 }, { sku: 'A', qty: 7 }], [{ sku: 'E', qty: 1 }], [{ sku: 'A', qty: 30 }, { sku: 'C', qty: 6 }]];
const out = []; ITEMS.forEach(items => S.forEach(s => out.push({ items, cat: CAT, s })));
module.exports = out;
