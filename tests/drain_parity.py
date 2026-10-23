"""Helper for tests/drain.test.js: runs the box drain pricing (v2 catalog.cart_quote + b3 fee.quote_total) on JSON cases from stdin."""
import json, sys
sys.path.insert(0, "/workspace/bot-fbm-lite/v2"); sys.path.insert(0, "/workspace/bot-staff/b3")
import catalog as CAT, fee as F
out = []
for c in json.load(sys.stdin):
    rows = [dict(r, sku=k, name=k, unit="pc", aliases=[], price_updated="2026-10-22", stock_updated="2026-10-22") for k, r in c["cat"].items()]
    settings = dict({"discount_ask_action": "fixed_price_reply"}, **c["s"], **c.get("fee_settings", {}))
    q = CAT.cart_quote(rows, settings, [(i["sku"], i["qty"]) for i in c["items"]])
    t = q.get("total") if isinstance(q, dict) else None
    fq = F.quote_total(t, settings, c["mode"], c["area"], c["pay"]) if t is not None else None
    out.append({"subtotal": t, "total": fq["total"] if fq and fq["ok"] else None, "fee": fq["fee"] if fq and fq["ok"] else None})
print(json.dumps(out))
