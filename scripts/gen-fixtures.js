#!/usr/bin/env node
// Regenerates tests/fixtures/expected.json by running the backend's own quoteTotal_/preview_ from Code.gs (vm sandbox).
// CODE_GS defaults to the box path of Code.gs v0.3.4-b3.
'use strict';
const fs = require('fs'), vm = require('vm'), path = require('path');
const CODE = process.env.CODE_GS || '/workspace/bot-fbm-lite/v3lite/apps_script/Code.gs';
const fx = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'tests/fixtures/cases.json'), 'utf8'));
const ctx = {}; vm.createContext(ctx); vm.runInContext(fs.readFileSync(CODE, 'utf8'), ctx);
const preview = require('../tests/fixtures/preview_cases.js');
const out = { code_gs_version: ctx.VERSION, quote: fx.cases.map(c => ctx.quoteTotal_(c[0], c[1], c[2], c[3], c[4])),
  form_config: fx.settings.map(s => ctx.formConfig_(s)),
  preview: preview.map(p => ctx.preview_(p.items, p.cat, p.s)) };
fs.writeFileSync(path.join(__dirname, '..', 'tests/fixtures/expected.json'), JSON.stringify(out, null, 0) + '\n');
console.log('expected.json from ' + ctx.VERSION + ': ' + out.quote.length + ' quote, ' + out.preview.length + ' preview cases');
