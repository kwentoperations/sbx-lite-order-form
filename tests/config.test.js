'use strict';
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('fs'), path = require('path');
// Since the config PR (Alwin OK 2026-10-23 23:04 PHT) config.js holds the real TEST backend URL + form key.
// The key only permits order submits (see README); check the shape so a bad paste fails CI.
test('config.js is well-formed (placeholders or real TEST values)', () => {
  const s = fs.readFileSync(path.join(__dirname, '..', 'config.js'), 'utf8');
  const ph = /__FORM_API_URL__/.test(s) && /__FORM_KEY__/.test(s);
  const real = /https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]{20,}\/exec/.test(s) && /fk-[A-Za-z0-9_-]{8,}/.test(s);
  assert.ok(ph || real, 'config.js must hold both placeholders or both real values');
});
