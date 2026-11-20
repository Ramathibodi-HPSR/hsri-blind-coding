// Offline stand-in for supabase-js, used only by preview.local.html for design review: one signed-in coder,
// answers kept in memory, a second coder's progress made up. Never loaded by index.html.
window.supabase = { createClient: () => {
  const me = { id: 'demo-user', email: 'percy@hsricode.test' };
  const codes = [];
  const subs = [];
  let signedIn = /signedin/.test(location.search);
  const table = (name) => {
    const st = { name, one: false };
    const api = {
      select: () => api,
      maybeSingle: () => { st.one = true; return api; },
      upsert: (row) => { const i = codes.findIndex((c) => c.contactno === row.contactno); if (i >= 0) codes[i] = row; else codes.push(row); st.write = true; return api; },
      insert: (row) => { subs.push(row); st.write = true; return api; },
      then: (res, rej) => {
        let data = null;
        if (st.write) data = null;
        else if (name === 'coders') data = st.one ? { label: 'Percy' } : [{ label: 'Percy' }];
        else if (name === 'codes') data = codes.slice();
        else if (name === 'submissions') data = subs.slice();
        return Promise.resolve({ data, error: null }).then(res, rej);
      },
    };
    return api;
  };
  return {
    from: table,
    rpc: async () => ({ data: [
      { label: 'Percy', is_me: true, coded: codes.filter((c) => !c.practice && c.rules).length, practice_coded: codes.filter((c) => c.practice).length, submitted: subs.length > 0 },
      { label: 'ผู้ลงรหัสคนที่ 2', is_me: false, coded: 37, practice_coded: 5, submitted: false },
    ], error: null }),
    auth: {
      getSession: async () => ({ data: { session: signedIn ? { user: me } : null } }),
      signInWithPassword: async () => { signedIn = true; return { error: null }; },
      signOut: async () => { signedIn = false; return {}; },
    },
  };
} };
