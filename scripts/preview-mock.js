// Offline stand-in for supabase-js, used only by preview.local.html for design review: one signed-in person,
// answers kept in memory, the other coders' progress made up. Never loaded by index.html.
// Query flags: ?signedin=1 starts signed in; &role=lead signs in as the study lead; &both=1 makes both coders submitted
// (the lead's adjudication screen then shows three made-up disagreements); &key=1 gives the coder a practice key.
window.supabase = { createClient: () => {
  const q = new URLSearchParams(location.search);
  const lead = q.get('role') === 'lead', both = q.has('both');
  const me = { id: 'demo-user', email: lead ? 'lead@example.test' : 'coder1@hsricode.test' };
  const codes = [];
  const subs = [];
  const adj = {};
  let signedIn = q.has('signedin');
  const keyRows = () => ((window.__practice || []).map((it, i) => ({ contactno: it.id, domain: 'health_systems_public_health', approach: i % 2 ? 'qual/mixed' : 'quant',
    state: 'yes', critical: 'no', rights: i === 2 ? 'borderline' : 'no', purpose: 'diagnosis', rules: 'within', evidence: i === 2 ? 'ตัวอย่างวลีหลักฐาน' : null, note: 'เหตุผลของเฉลย (ตัวอย่าง)' })));
  fetch('data/practice.json').then((r) => r.json()).then((d) => { window.__practice = d; });
  const fakeDisputes = () => {
    const items = window.__items || [];
    const rows = [];
    [[0, 'state', 'yes', 'no'], [0, 'rights', 'no', 'borderline'], [3, 'purpose', 'diagnosis', 'prescription'], [9, 'approach', 'quant', 'qual/mixed']].forEach(([i, field, a, b]) => {
      const it = items[i]; if (!it) return;
      rows.push({ contactno: it.id, position: i + 1, field, a, b, a_evidence: null, a_note: 'หมายเหตุของ A (ตัวอย่าง)', b_evidence: 'วลีหลักฐานของ B', b_note: 'เส้นแบ่ง ตัวอย่าง',
        decided: (adj[it.id + ':' + field] || {}).value || null, decided_note: (adj[it.id + ':' + field] || {}).note || null });
    });
    return rows;
  };
  fetch('data/items.json').then((r) => r.json()).then((d) => { window.__items = d; });
  const table = (name) => {
    const st = { name, one: false };
    const api = {
      select: () => api,
      maybeSingle: () => { st.one = true; return api; },
      upsert: (row) => {
        if (name === 'adjudications') [].concat(row).forEach((r) => { adj[r.contactno + ':' + r.field] = r; });
        else { const i = codes.findIndex((c) => c.contactno === row.contactno); if (i >= 0) codes[i] = row; else codes.push(row); }
        st.write = true; return api;
      },
      insert: (row) => { subs.push(row); st.write = true; return api; },
      then: (res, rej) => {
        let data = null;
        if (st.write) data = null;
        else if (name === 'coders') data = st.one ? { label: lead ? 'Percy' : 'ผู้ลงรหัสคนที่ 1', role: lead ? 'lead' : 'coder' } : [];
        else if (name === 'codes') data = codes.slice();
        else if (name === 'submissions') data = subs.slice();
        return Promise.resolve({ data, error: null }).then(res, rej);
      },
    };
    return api;
  };
  return {
    from: table,
    rpc: async (fn) => {
      if (fn === 'practice_key') return { data: (lead || q.has('key')) && codes.filter((c) => c.practice).length >= 5 ? keyRows() : [], error: null };
      if (fn === 'key_seen') return { data: q.has('keyseen'), error: null };
      if (fn === 'disagreements') return { data: lead && both ? fakeDisputes() : [], error: null };
      return { data: [
        { label: 'ผู้ลงรหัสคนที่ 1', is_me: !lead, coded: lead ? (both ? 131 : 64) : codes.filter((c) => !c.practice && c.rules).length, practice_coded: lead ? 5 : codes.filter((c) => c.practice).length, submitted: lead ? both : subs.length > 0 },
        { label: 'ผู้ลงรหัสคนที่ 2', is_me: false, coded: lead ? (both ? 131 : 37) : null, practice_coded: lead ? 5 : null, submitted: both },
      ], error: null };
    },
    auth: {
      getSession: async () => ({ data: { session: signedIn ? { user: me } : null } }),
      signInWithPassword: async () => { signedIn = true; return { error: null }; },
      signOut: async () => { signedIn = false; return {}; },
    },
  };
} };
