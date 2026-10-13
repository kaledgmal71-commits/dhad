// فحص ذاتي شامل للسحابة: إنشاء حساب جهاز، دخول، إنشاء مشروع، كتابة وقراءة ملف، مشاركة، ثم عزل الحسابات. يُستدعى يدويًا فقط.
module.exports = async (req, res) => {
  const url = "https://pacucdvobiwcigcuyvbr.supabase.co", key = "sb_publishable_VBFe3Sfh3Q7NS1muHs-Uog_67Tn3eo2";
  const steps = []; const ok = (n, v) => steps.push({ n, ok: !!v });
  const call = async (path, o = {}, tok) => {
    const r = await fetch(url + path, { ...o, headers: { apikey: key, "Content-Type": "application/json", ...(tok ? { Authorization: "Bearer " + tok } : {}), ...(o.headers || {}) } });
    const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch (e) {} return { s: r.status, j, t };
  };
  try {
    const mk = async () => { const d = await call("/functions/v1/device-signup", { method: "POST", body: "{}" }); const l = await call("/auth/v1/token?grant_type=password", { method: "POST", body: JSON.stringify({ email: d.j && d.j.email, password: d.j && d.j.password }) }); return { d, l, tok: l.j && l.j.access_token, uid: l.j && l.j.user && l.j.user.id }; };
    const A = await mk(); ok("إنشاء حساب جهاز", A.d.s === 200); ok("دخول بكلمة المرور", !!A.tok);
    const p = await call("/rest/v1/projects", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify({ owner_id: A.uid, name: "selftest" }) }, A.tok); ok("إنشاء مشروع", p.s === 201);
    const pid = p.j && p.j[0] && p.j[0].id;
    const f = await call("/rest/v1/files?on_conflict=project_id,path", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify([{ project_id: pid, owner_id: A.uid, path: "t.ضاد", content: "v1" }]) }, A.tok); ok("رفع ملف", f.s === 201 || f.s === 204);
    const f2 = await call("/rest/v1/files?on_conflict=project_id,path", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify([{ project_id: pid, owner_id: A.uid, path: "t.ضاد", content: "v2" }]) }, A.tok); ok("تحديث الملف (upsert)", f2.s === 201 || f2.s === 204);
    const g = await call("/rest/v1/files?select=content,version&project_id=eq." + pid, {}, A.tok); ok("قراءة الملف بنسخته الجديدة", g.j && g.j[0] && g.j[0].content === "v2" && g.j[0].version === 2);
    const sh = await call("/rest/v1/shares", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify({ project_id: pid, owner_id: A.uid }) }, A.tok); ok("إنشاء رابط مشاركة", sh.s === 201);
    const slug = sh.j && sh.j[0] && sh.j[0].slug;
    const pub = await call("/rest/v1/rpc/get_shared_project", { method: "POST", body: JSON.stringify({ p_slug: slug }) }); ok("فتح الرابط بلا حساب", pub.j && pub.j.files && pub.j.files[0].content === "v2");
    const B = await mk(); ok("حساب ثانٍ", !!B.tok);
    const iso = await call("/rest/v1/files?select=id&project_id=eq." + pid, {}, B.tok); ok("عزل: الحساب الثاني لا يرى ملفات الأول", Array.isArray(iso.j) && iso.j.length === 0);
    const hack = await call("/rest/v1/files", { method: "POST", body: JSON.stringify({ project_id: pid, owner_id: B.uid, path: "x", content: "x" }) }, B.tok); ok("عزل: منع الكتابة في مشروع غيرك", hack.s >= 400);
    const rev = await call("/rest/v1/shares?project_id=eq." + pid, { method: "PATCH", body: JSON.stringify({ is_active: false }) }, A.tok);
    const pub2 = await call("/rest/v1/rpc/get_shared_project", { method: "POST", body: JSON.stringify({ p_slug: slug }) }); ok("إلغاء الرابط يعمل", pub2.t === "null" || pub2.j === null);
    await call("/rest/v1/projects?id=eq." + pid, { method: "DELETE" }, A.tok);
  } catch (e) { steps.push({ n: "خطأ", ok: false, detail: String(e && e.message || e) }); }
  res.status(steps.every((x) => x.ok) ? 200 : 500).json({ allOk: steps.every((x) => x.ok), steps });
};
