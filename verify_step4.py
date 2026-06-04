#!/usr/bin/env python3
import re, sys, os

def ff(*c):
    for p in c:
        if os.path.exists(p): return p
    return c[0]

prof = ff("src/lib/profiles.js", "lib/profiles.js", "profiles.js")
app  = ff("src/App.jsx", "App.jsx")

res = []
def chk(n, c): res.append((n, bool(c)))

p = open(prof, encoding="utf-8").read()
a = open(app, encoding="utf-8").read()

chk("profiles.js: tool_links in selects (>=3)", p.count("hire_url, tool_links, created_at") >= 3)
chk("profiles.js: upsert row sets tool_links", re.search(r"tool_links:\s*profile\.tool_links", p))
chk("profiles.js: tool_links assigned >=2 (row+default)", len(re.findall(r"tool_links:", p)) >= 2)

chk("App.jsx: parseToolLinks defined", "function parseToolLinks" in a)
chk("App.jsx: toolLinksToText defined", "function toolLinksToText" in a)
chk("App.jsx: form seeds tool_links_text (init+reset)", len(re.findall(r"toolLinksToText\(profile", a)) >= 2)
chk("App.jsx: handleSave parses tool links", "parseToolLinks(form.tool_links_text)" in a)
chk("App.jsx: save payload has tool_links", re.search(r"tool_links:\s*toolsParsed\.list", a))
chk("App.jsx: Settings tool field", "Affiliate Tool Links" in a)
chk("App.jsx: ProfilePage builds tools list", "Array.isArray(profileData.tool_links)" in a)
chk("App.jsx: ProfilePage Tools I Use section", "Tools I Use" in a)
chk("App.jsx: DetailPage builds toolMap", "const [toolMap, setToolMap]" in a)
chk("App.jsx: DetailPage fetches creator profile", "fetchProfileByUsername(uname)" in a)
chk("App.jsx: affiliate clicks tracked", "affiliate_link_clicked" in a)

ok = True
for n, passed in res:
    print(("PASS " if passed else "FAIL ") + n)
    ok = ok and passed
print("\n" + ("ALL CHECKS PASSED" if ok else "SOME CHECKS FAILED"))
sys.exit(0 if ok else 1)