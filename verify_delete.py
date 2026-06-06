#!/usr/bin/env python3
import os, sys

def ff(*c):
    for p in c:
        if os.path.exists(p): return p
    return c[0]

api = ff("api/delete-creation.js", "delete-creation.js")
app = ff("src/App.jsx", "App.jsx")

res = []
def chk(n, c): res.append((n, bool(c)))

# --- api/delete-creation.js ---
api_ok = os.path.exists(api)
chk("api/delete-creation.js exists", api_ok)
if api_ok:
    s = open(api, encoding="utf-8").read()
    chk("delete-creation: imports DeleteObjectCommand (R2)", "DeleteObjectCommand" in s)
    chk("delete-creation: imports Mux SDK", "@mux/mux-node" in s)
    chk("delete-creation: ownership check present", "You can only delete your own creations" in s)
    chk("delete-creation: premium-with-sales guard", '.from("purchases")' in s and "has_sales" in s)
    chk("delete-creation: counts sales (count exact)", 'count: "exact"' in s)
    chk("delete-creation: deletes the creations row", '.from("creations")' in s and ".delete()" in s)
    chk("delete-creation: deletes the Mux asset", "video.assets.delete" in s)
    chk("delete-creation: deletes R2 objects", "new DeleteObjectCommand" in s)
    chk("delete-creation: uses R2 bucket + public url env", "R2_BUCKET_NAME" in s and "R2_PUBLIC_URL" in s)
    chk("delete-creation: uses service role key", "SUPABASE_SERVICE_ROLE_KEY" in s)

# --- src/App.jsx ---
app_ok = os.path.exists(app)
chk("src/App.jsx exists", app_ok)
if app_ok:
    a = open(app, encoding="utf-8").read()
    chk("App.jsx: setCreations in DetailPage signature",
        "function DetailPage({ id, creations, setCreations," in a)
    chk("App.jsx: setCreations passed at DetailPage render",
        "creations={creations} setCreations={setCreations}" in a)
    chk("App.jsx: deleting state added",
        "const [deleting, setDeleting] = useState(false)" in a)
    chk("App.jsx: canDelete computed (owner or admin)",
        "const canDelete =" in a and "isAdmin(user)" in a)
    chk("App.jsx: handleDelete calls the API",
        "async function handleDelete" in a and "/api/delete-creation" in a)
    chk("App.jsx: removes deleted item from state",
        "setCreations((prev) => prev.filter" in a)
    chk("App.jsx: Delete button wired up",
        "onClick={handleDelete}" in a and "Delete creation" in a)

ok = True
for n, passed in res:
    print(("PASS " if passed else "FAIL ") + n)
    ok = ok and passed
print("\n" + ("ALL CHECKS PASSED" if ok else "SOME CHECKS FAILED"))
sys.exit(0 if ok else 1)