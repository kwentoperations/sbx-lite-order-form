# sbx-lite-order-form

Customer order form page for the Bot Staff TEST client **SBX-LITE** (spec v0.6 §4 / §4b).
Static HTML/CSS/JS. Backend: BOT-FBM V3-lite Apps Script web app (Code.gs v0.3.4-b3).

## Files
- `index.html`, `style.css`, `app.js`: the page (mobile-first, no framework).
- `lib/quote.js`: exact port of Code.gs `preview_()` + `quoteTotal_()`; `settingsFromFormConfig()` maps GET `form_config` to the Settings fields `quoteTotal_` reads.
- `lib/validate.js`: client validation (mirrors Code.gs `validate_()` / `normMobile_()`) and the POST payload builder.
- `config.js`: **placeholder only**. `scripts/make-config.js` generates the real one at build time.
- `tests/`: `node --test` (fee parity vs Code.gs, form validation, config placeholder guard).

## Customer link
`<page>/?c=CART_ID` (or `?cart=CART_ID`). The page calls `GET <apiUrl>?cart=CART_ID` (Google's /exec rejects `?c=`).

## Backend contract (Code.gs v3lite-p0-0.3.4-b3)
- GET `?cart=ID` -> `{ok, lines, catalog, preview_total, form_config:{modes, area_options, not_listed, pickup_only_text, pay_modes, delivery_fee_mode, delivery_fee_by_area, free_delivery_min, free_text}}`. OOS (`stock_status=out`) items are hidden.
- POST, `Content-Type: text/plain` JSON (no CORS preflight), keys exactly: `origin, form_key, cart_id, items[{sku,qty}], name, mobile, mode, address, area, pay_mode, source, idempotency_key`. `address`/`area` are sent only for delivery. Any other key -> `extra_field`.
- `form_key` + `origin` are a **soft, non-secret spam filter** (Code.gs N6): the key ships in the public page and must match Script Property `FORM_KEY`; `origin` must equal `FORM_ORIGIN` (`https://kwentoperations.github.io`) or POST returns `bad_key`.

## Configuring URL + key (never commit them)
```
FORM_API_URL='https://script.google.com/macros/s/<DEPLOYMENT_ID>/exec' \
FORM_KEY='fk-<from rotateFormKey log>' \
node scripts/make-config.js            # overwrites ./config.js (or pass an output path, e.g. dist/config.js)
```
The script validates the shapes and never prints the values. Don't commit the generated file (`git checkout config.js` after a local test).
On every Apps Script redeploy run `rotateFormKey` (N6) and regenerate `config.js`.
If the page is hosted anywhere other than `https://kwentoperations.github.io`, set `FORM_ORIGIN` **and** change `FORM_ORIGIN` in Code.gs, otherwise every POST is `bad_key`.

## Tests
`npm test` (Node >= 18). Parity: `tests/fixtures/expected.json` is generated from Code.gs by `npm run fixtures`; when Code.gs is on disk (`CODE_GS`, default the box path) the tests also run it live.

## Hosting
Not decided (see PR). Nothing deployed.
