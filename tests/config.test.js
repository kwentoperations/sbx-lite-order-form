'use strict';
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('fs'), path = require('path');
test('committed config.js holds placeholders only', () => {
  const s = fs.readFileSync(path.join(__dirname, '..', 'config.js'), 'utf8');
  assert.match(s, /__FORM_API_URL__/); assert.match(s, /__FORM_KEY__/);
  assert.doesNotMatch(s, /script\.google\.com\/macros\/s\/[A-Za-z0-9_-]{20,}/); assert.doesNotMatch(s, /fk-[A-Za-z0-9]{8,}/);
});
