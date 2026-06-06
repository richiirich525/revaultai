#!/usr/bin/env python3
import os, sys

def ff(*c):
    for p in c:
        if os.path.exists(p): return p
    return c[0]

app = ff("src/App.jsx", "App.jsx")
prof = ff("src/lib/profiles.js", "profiles.js")

res = []
def chk(n, c): res.append((n, bool(c)))

# --- src/lib/profiles.js (Step 1) ---
prof_ok = os.path.exists(prof)
chk("profiles.js exists", prof_ok)
if prof_ok:
    p = open(prof, encoding="utf-8").read()
    chk("profiles.js: pinned_creation_ids in read selects",
        "social_links, pinned_creation_ids, created_at" in p)
    chk("profiles.js: pinned_creation_ids in upsert row",
        "pinned_creation_ids: profile.pinned_creation_ids" in p)
    chk("profiles.js: pinned_creation_ids in defaultProfile",
        "pinned_creation_ids: []" in p)

# --- src/App.jsx ---
app_ok = os.path.exists(app)
chk("src/App.jsx exists", app_ok)
if app_ok:
    a = open(app, encoding="utf-8").read()

    # Step 2 - pin button on DetailPage
    chk("App.jsx: profile/setProfile in DetailPage signature",
        "setCreations, user, profile, setProfile," in a)
    chk("App.jsx: profile/setProfile passed at DetailPage render",
        "user={user} profile={profile} setProfile={setProfile}" in a)
    chk("App.jsx: pinning state added",
        "const [pinning, setPinning] = useState(false)" in a)
    chk("App.jsx: canPin computed (owner only)",
        "const canPin = !!user && creation.user_id === user.id" in a)
    chk("App.jsx: handlePin defined",
        "async function handlePin" in a)
    chk("App.jsx: handlePin saves pinned_creation_ids",
        "pinned_creation_ids: next" in a)
    chk("App.jsx: Pin button wired up",
        "onClick={handlePin}" in a and "Pin to profile" in a)

    # Step 3 - Featured Work on ProfilePage
    chk("App.jsx: pinnedCreations computed",
        "const pinnedCreations =" in a)
    chk("App.jsx: gridCreations computed (de-duped)",
        "const gridCreations =" in a)
    chk("App.jsx: Featured Work section present",
        "Featured Work" in a)
    chk("App.jsx: grid now renders gridCreations",
        "gridCreations.map(" in a)

ok = True
for n, passed in res:
    print(("PASS " if passed else "FAIL ") + n)
    ok = ok and passed
print("\n" + ("ALL CHECKS PASSED" if ok else "SOME CHECKS FAILED"))
sys.exit(0 if ok else 1)