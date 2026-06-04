#!/usr/bin/env python3
import re, sys, os

def ff(*c):
    for p in c:
        if os.path.exists(p): return p
    return c[0]

prof = ff("src/lib/profiles.js", "lib/profiles.js", "profiles.js")
db   = ff("src/lib/db.js", "lib/db.js", "db.js")
app  = ff("src/App.jsx", "App.jsx")

res = []
def chk(n, c): res.append((n, bool(c)))

p = open(prof, encoding="utf-8").read()
d = open(db, encoding="utf-8").read()
a = open(app, encoding="utf-8").read()

chk("profiles.js: hire_url in selects (>=3)", p.count("tip_url, hire_url, created_at") >= 3)
chk("profiles.js: upsert row sets hire_url", re.search(r"hire_url:\s*profile\.hire_url", p))
chk("profiles.js: hire_url assigned >=2 (row+default)", len(re.findall(r"hire_url:", p)) >= 2)

chk("db.js: read surfaces license_url", re.search(r"license_url:\s*row\.license_url", d))
chk("db.js: insert persists license_url", re.search(r"license_url:\s*creation\.license_url", d))

chk("App.jsx: normalizeContactUrl defined", "function normalizeContactUrl" in a)
chk("App.jsx: form seeds hire_url (init+reset)", len(re.findall(r"hire_url:\s*profile\??\.hire_url", a)) >= 2)
chk("App.jsx: handleSave validates hire", "normalizeContactUrl(form.hire_url)" in a)
chk("App.jsx: save payload has hire_url", re.search(r"hire_url:\s*hire\.url", a))
chk("App.jsx: Settings Hire field", "Hire Me Link" in a)
chk("App.jsx: ProfilePage computes hireUrl", "const hireUrl" in a)
chk("App.jsx: ProfilePage Hire button", "hire_link_clicked" in a)
chk("App.jsx: Submit seeds licenseUrl", 'licenseUrl: ""' in a)
chk("App.jsx: Submit License field", "License This Link" in a)
chk("App.jsx: Submit validates license", "normalizeContactUrl(form.licenseUrl)" in a)
chk("App.jsx: newCreation has license_url", re.search(r"license_url:\s*license\.url", a))
chk("App.jsx: DetailPage computes licenseUrl", "const licenseUrl" in a)
chk("App.jsx: DetailPage License button", "license_link_clicked" in a)

ok = True
for n, passed in res:
    print(("PASS " if passed else "FAIL ") + n)
    ok = ok and passed
print("\n" + ("ALL CHECKS PASSED" if ok else "SOME CHECKS FAILED"))
sys.exit(0 if ok else 1)