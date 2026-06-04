#!/usr/bin/env python3
import os, sys

def ff(*c):
    for p in c:
        if os.path.exists(p): return p
    return c[0]

api = ff("api/notify-follow.js", "notify-follow.js")
app = ff("src/App.jsx", "App.jsx")

res = []
def chk(n, c): res.append((n, bool(c)))

api_ok = os.path.exists(api)
chk("api/notify-follow.js exists", api_ok)
if api_ok:
    s = open(api, encoding="utf-8").read()
    chk("notify-follow: sends via Resend", "resend.emails.send" in s)
    chk("notify-follow: looks up creator by id", "getUserById" in s)
    chk("notify-follow: skips self-follow", 'skipped: "self"' in s or "skipped" in s)

a = open(app, encoding="utf-8").read()
chk("App.jsx: Follow button calls /api/notify-follow", "/api/notify-follow" in a)

ok = True
for n, passed in res:
    print(("PASS " if passed else "FAIL ") + n)
    ok = ok and passed
print("\n" + ("ALL CHECKS PASSED" if ok else "SOME CHECKS FAILED"))
sys.exit(0 if ok else 1)