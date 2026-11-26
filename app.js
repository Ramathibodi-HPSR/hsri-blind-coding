// HSRI blind coding: two human coders classify sampled HSRI-funded projects, blind to the model codes and to each other.
// Project texts come from data/ (public abstracts). Answers go to Supabase; row-level security keeps each coder's rows
// private to that coder. Unsaved answers are kept as drafts in this browser until saved.
(() => {
  'use strict';
  const CFG = window.HSRI_CODING_CONFIG;
  const sb = window.supabase.createClient(CFG.url, CFG.anonKey, { auth: { persistSession: true, autoRefreshToken: true, storageKey: 'hsri-coding-auth' } });
  const $ = (id) => document.getElementById(id);
  const PRACTICE_N = 5;
  const WIDE = window.matchMedia('(min-width: 960px)');

  // Fields 1–5 use the codebook the AI coders used; 6–7 are the two four-cell axes (humans only).
  const FIELDS = [
    { key: 'domain', label: 'ประเภทงาน', col: 'research_domain', opts: [['health_systems_public_health', 'ระบบสุขภาพและสาธารณสุข'], ['biomedical', 'ชีวการแพทย์'], ['unclear', 'ไม่ชัด']],
      def: ['ระบบสุขภาพและสาธารณสุข: นโยบาย ระบบ การจัดบริการ การเงินการคลัง กำลังคน อภิบาล ระบบข้อมูล การประเมินเทคโนโลยีและความคุ้มค่า ระบาดวิทยาและการสำรวจสุขภาพประชากร พฤติกรรม สังคม และชุมชน',
        'ชีวการแพทย์: ห้องปฏิบัติการ พันธุศาสตร์หรือจีโนม การพัฒนายา วัคซีน ชุดตรวจ หรืออุปกรณ์ การทดลองทางคลินิกเพื่อดูประสิทธิผลของการรักษา หรือกลไกทางชีววิทยาของโรค',
        'กรณีผสม ดูคำถามหลัก: ความคุ้มค่า ความเป็นไปได้ หรือการจัดบริการ ลงระบบสุขภาพ ความแม่นของการตรวจหรือกลไกทางชีววิทยา ลงชีวการแพทย์'] },
    { key: 'approach', label: 'แนวทางวิจัย', col: 'approach', opts: [['qual/mixed', 'คุณภาพหรือผสม'], ['quant', 'ปริมาณ'], ['cost', 'ต้นทุน'], ['review', 'ทบทวน'], ['unclear', 'ไม่ชัด']],
      def: ['ลำดับก่อนหลัง: ทบทวน > ต้นทุน > คุณภาพหรือผสม > ปริมาณ',
        'คุณภาพหรือผสม: มีวิธีเชิงคุณภาพ รวม PAR และ action research',
        'ต้นทุน: ต้นทุนหรือความคุ้มค่า รวม SROI, willingness to pay และ benefit–cost',
        'ทบทวน: ทบทวนวรรณกรรมหรือเอกสารอย่างเดียว',
        'งานห้องปฏิบัติการและการทดลองทางคลินิกลงปริมาณ งานพัฒนาซอฟต์แวร์หรือฐานข้อมูลที่ไม่มีการวิเคราะห์ข้อมูลลงไม่ชัด แล้วเขียน "พัฒนาเทคโนโลยี" ในหมายเหตุ'] },
    { key: 'state', label: 'ประเมินหรือพัฒนาโครงการรัฐ', col: 'evaluates_or_develops_state_programme', opts: [['yes', 'ใช่'], ['no', 'ไม่ใช่']],
      def: ['ใช่: หัวข้อหลักคือการประเมิน การนำไปปฏิบัติ หรือการพัฒนารูปแบบของนโยบาย กฎหมาย กองทุน อัตราจ่าย โครงการ หรือบริการสาธารณะของรัฐที่ระบุได้ รวมการศึกษาที่เขียนเพื่อออกแบบนโยบายหรือชุดสิทธิประโยชน์',
        'กฎ 1.1: รูปแบบบริการที่พัฒนาหรือทดลองใน รพ.รัฐ รพ.สต. หรือเครือข่ายอำเภอ ลงใช่',
        'กฎ 1.2: งานที่ป้อนนโยบายระดับประเทศแต่ไม่ได้ประเมินโครงการใดโครงการหนึ่ง (ภาพรวมระบบ ฉากทัศน์ ทบทวนหลักฐานเพื่อออกแบบนโยบาย ผลของมาตรการรัฐ เครื่องมือให้หน่วยกำกับ) ลงใช่',
        'ความคุ้มค่าเพื่อพิจารณาชุดสิทธิประโยชน์ บัญชียาหลัก หรือการตัดสินใจของกองทุนรัฐ ลงใช่',
        'ไม่ใช่: งานห้องปฏิบัติการ การทดลองทางคลินิกที่ไม่ผูกกับบริการของรัฐ และงานพรรณนาโรคหรือพฤติกรรมที่ไม่ได้ป้อนนโยบายหรือบริการที่ระบุได้'] },
    { key: 'critical', label: 'ทฤษฎีวิพากษ์เป็นกรอบ', col: 'critical_theory', opts: [['yes', 'ใช่'], ['borderline', 'ก้ำกึ่ง'], ['no', 'ไม่ใช่']],
      def: ['ใช่: ใช้ทฤษฎีสังคมเชิงวิพากษ์หรือเศรษฐศาสตร์การเมืองเป็นกรอบ เช่น Marxist political economy, Gramsci, Foucault, Bourdieu, feminist หรือ postcolonial theory, Polanyi, decommodification, critical discourse analysis',
        'ก้ำกึ่ง: กรอบว่าด้วยอำนาจหรือผลประโยชน์แต่เป็นทฤษฎีกระแสหลัก (corporate political activity, commercial determinants of health) หรือเอ่ยเศรษฐศาสตร์การเมืองเป็นเลนส์ตีความโดยไม่ใช้เป็นกรอบ หรือใช้วิธีที่มีรากวิพากษ์ (emancipatory action research) โดยไม่วิเคราะห์อำนาจหรือโครงสร้างสังคม',
        'principal–agent theory ลงไม่ใช่'] },
    { key: 'rights', label: 'กรอบสิทธิหรือความไม่เป็นธรรมเชิงโครงสร้าง', col: 'rights_or_structural_inequity', opts: [['yes', 'ใช่'], ['borderline', 'ก้ำกึ่ง'], ['no', 'ไม่ใช่']],
      def: ['ใช่: ตั้งคำถามหรือวางกรอบว่าสุขภาพหรือบริการเป็นสิทธิที่ผู้คนพึงได้ (สิทธิมนุษยชน สิทธิตามรัฐธรรมนูญ การถูกกีดกันจากสิทธิ เช่น คนไร้สถานะ) หรือใช้ความเหลื่อมล้ำที่เกิดจากโครงสร้างสังคม เศรษฐกิจ การเมือง หรือสถาบันเป็นกรอบอธิบาย',
        'ก้ำกึ่ง: กรอบสิทธิหรือเชิงโครงสร้างอยู่แค่ในพื้นหลังหรือข้อสรุป แต่ตัวการวิเคราะห์เป็นการพรรณนาช่องว่าง',
        'ไม่ใช่: รายงานช่องว่างระหว่างกลุ่มเฉย ๆ หรือใช้คำว่าสิทธิในความหมายทางบริหารของกองทุน (สิทธิบัตรทอง ชุดสิทธิประโยชน์ ผู้มีสิทธิ)',
        'ตัวอย่างที่ตัดสินแล้ว: ตั้งกรอบด้วยสิทธิตามรัฐธรรมนูญแล้ววิเคราะห์ความเหลื่อมล้ำระหว่างกองทุน ลงใช่',
        'รายงานผลต่างระหว่างกองทุนแล้วเอ่ยว่าระบบแยกส่วนทำให้เหลื่อมล้ำ ลงไม่ใช่',
        'สิทธิคนพิการอยู่แค่ในพื้นหลังหรือข้อเสนอ ลงก้ำกึ่ง'] },
    { key: 'purpose', label: 'น้ำหนักหลักของงาน', col: 'กรอบสี่ช่อง แกนที่ 1', opts: [['diagnosis', 'วิเคราะห์ปัญหา'], ['prescription', 'สังเคราะห์ข้อเสนอ'], ['unclear', 'ไม่ชัด']],
      def: ['วิเคราะห์ปัญหา: อธิบายว่าเกิดอะไรขึ้นและเพราะอะไร รวมการประเมินผล การสำรวจสถานการณ์ และการวิเคราะห์สาเหตุ',
        'สังเคราะห์ข้อเสนอ: เสนอว่าควรทำอะไรและด้วยเครื่องมือใด รวมการพัฒนารูปแบบบริการ ระบบ เครื่องมือ มาตรการ หรือข้อเสนอเชิงนโยบายที่เป็นผลหลักของงาน',
        'มีทั้งสองส่วน ให้เลือกส่วนที่เป็นวัตถุประสงค์หลักหรือผลหลัก งานประเมินที่ปิดด้วยข้อเสนอแนะทั่วไปลงวิเคราะห์ปัญหา'] },
    { key: 'rules', label: 'กติกาของระบบ', col: 'กรอบสี่ช่อง แกนที่ 2', opts: [['within', 'ภายในกติกาเดิม'], ['structural', 'เปลี่ยนแปลงโครงสร้าง'], ['unclear', 'ไม่ชัด']],
      def: ['ภายในกติกาเดิม: รับกติกาและการจัดการที่มีอยู่เป็นเงื่อนไข เช่น วิธีจ่ายเงินของกองทุน กรอบตำแหน่งและระบบการจ้าง การแบ่งความรับผิดชอบระหว่างหน่วยงาน โครงสร้างอภิบาล แล้วศึกษาหรือปรับปรุงงานภายใต้เงื่อนไขนั้น',
        'เปลี่ยนแปลงโครงสร้าง (radical ในความหมายว่าถึงราก): ถามว่าสิ่งที่งานอื่นรับไว้เป็นเงื่อนไขเกิดจากกติกาใด ใครได้ใครเสีย และเปลี่ยนได้อย่างไร หรือเสนอให้เปลี่ยนกติกาเหล่านั้นเอง เช่น แก้กฎหมาย เปลี่ยนวิธีจ่ายเงินหรือระบบการจ้าง เปลี่ยนโครงสร้างอำนาจในการตัดสินใจ',
        'ไม่จำเป็นต้องใช้ทฤษฎีวิพากษ์ และการเอ่ยคำว่าโครงสร้างหรือความเหลื่อมล้ำอย่างเดียวยังไม่พอ ต้องเห็นว่ากติกาเป็นสิ่งที่งานศึกษาหรือเสนอให้เปลี่ยน'] },
  ];
  const KEYS = FIELDS.map((f) => f.key);
  const LABEL = Object.fromEntries(FIELDS.flatMap((f) => f.opts.map(([v, l]) => [f.key + ':' + v, l])));

  const S = { items: [], practice: [], codebook: '', user: null, label: '', role: 'coder', codes: {}, submitted: false, tab: 'guide', set: 'practice',
    idx: { practice: 0, main: 0 }, saving: false, noEvidenceOk: {}, confirmSubmit: false, lastSel: null, readY: null, allDoneShown: {} };
  const list = () => (S.set === 'practice' ? S.practice : S.items);
  const cur = () => list()[S.idx[S.set]];
  const isCoded = (c) => !!c && KEYS.every((k) => c[k]);
  const codedIn = (arr) => arr.filter((it) => isCoded(S.codes[it.id])).length;
  const practiceDone = () => codedIn(S.practice) >= PRACTICE_N;

  function esc(s) { return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
  function msg(el, text, kind) { el.textContent = text || ''; el.className = 'msg' + (kind ? ' ' + kind : '') + (el.classList.contains('small') ? ' small' : ''); }
  const ukey = (k) => `hsri-coding-${S.user ? S.user.id : 'anon'}-${k}`;
  function store(k, v) { try { if (v === undefined) localStorage.removeItem(ukey(k)); else localStorage.setItem(ukey(k), JSON.stringify(v)); } catch (e) { /* private window */ } }
  function recall(k) { try { return JSON.parse(localStorage.getItem(ukey(k))); } catch (e) { return null; } }
  // Drafts carry a timestamp and expire after 14 days.
  const DRAFT_DAYS = 14;
  function getDraft(id) { const d = recall('draft-' + id); if (!d || !d.v) return null; if (Date.now() - (d.t || 0) > DRAFT_DAYS * 864e5) { store('draft-' + id, undefined); return null; } return d.v; }
  function setDraft(id, v) { store('draft-' + id, v ? { v, t: Date.now() } : undefined); }
  function draftIds() { const out = []; try { const pre = ukey('draft-'); for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.startsWith(pre)) out.push(k.slice(pre.length)); } } catch (e) { /* ignore */ } return out; }
  // A short notice on whatever screen is showing.
  function toast(text) { const t = $('toast'); t.textContent = text; t.hidden = false; clearTimeout(toast.h); toast.h = setTimeout(() => { t.hidden = true; }, 5000); }

  // ---------- theme (per browser) ----------
  const THEMES = ['auto', 'light', 'dark'], THEME_TH = { auto: 'อัตโนมัติ', light: 'สว่าง', dark: 'มืด' };
  function theme() { try { return JSON.parse(localStorage.getItem('hsri-coding-theme')) || 'auto'; } catch (e) { return 'auto'; } }
  function setTheme(t) {
    try { localStorage.setItem('hsri-coding-theme', JSON.stringify(t)); } catch (e) { /* ignore */ }
    if (t === 'auto') delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = t;
    $('themeBtn').textContent = 'ธีม: ' + THEME_TH[t];
  }
  $('themeBtn').addEventListener('click', () => setTheme(THEMES[(THEMES.indexOf(theme()) + 1) % 3]));
  $('themeBtn').textContent = 'ธีม: ' + THEME_TH[theme()];

  // ---------- header height (scroll offsets) ----------
  function syncHead() { document.documentElement.style.setProperty('--head', $('topbar').offsetHeight + 'px'); }
  window.addEventListener('resize', syncHead);

  // ---------- data ----------
  async function loadData() {
    const [items, practice, codebook] = await Promise.all([
      fetch('data/items.json').then((r) => r.json()),
      fetch('data/practice.json').then((r) => r.json()),
      fetch('data/codebook.md').then((r) => r.text()),
    ]);
    S.items = items; S.practice = practice; S.codebook = codebook;
  }

  // ---------- sign-in ----------
  $('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const user = $('lgUser').value.trim().toLowerCase(), pass = $('lgPass').value;
    if (!user || !pass) { msg($('lgMsg'), 'กรอกชื่อผู้ใช้และรหัสผ่าน', 'warn'); return; }
    $('lgBtn').disabled = true; msg($('lgMsg'), 'กำลังเข้าสู่ระบบ…');
    const email = user.includes('@') ? user : `${user}@${CFG.loginDomain}`;
    const { error } = await sb.auth.signInWithPassword({ email, password: pass });
    $('lgBtn').disabled = false;
    if (error) {
      const code = error.code || '', text = error.message || '';
      const why = code === 'email_not_confirmed' || /not confirmed/i.test(text) ? 'บัญชีนี้ยังไม่ได้ยืนยันอีเมล ขอให้ Percy กดยืนยันบัญชีใน Supabase'
        : code === 'invalid_credentials' || /invalid login/i.test(text) ? `ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง (ระบบลองเข้าด้วย ${email}) ลองอีกครั้ง หรือขอรหัสใหม่จาก Percy`
        : 'เข้าสู่ระบบไม่ได้ ตรวจอินเทอร์เน็ตแล้วลองอีกครั้ง';
      msg($('lgMsg'), why, 'warn');
      return;
    }
    $('lgPass').value = '';
    await start();
  });
  $('logoutBtn').addEventListener('click', async () => {
    if (dirty()) setDraft(cur().id, readForm());
    const ids = draftIds();
    if (ids.length && window.confirm(`มีร่างที่ยังไม่บันทึก ${ids.length} ข้อในเครื่องนี้ ล้างร่างก่อนออกจากระบบไหม (แนะนำถ้าใช้เครื่องร่วมกับคนอื่น)\n\nตกลง = ล้างร่าง  ยกเลิก = เก็บร่างไว้`)) ids.forEach((id) => setDraft(id, null));
    await sb.auth.signOut(); location.reload();
  });
  $('reloginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const { error } = await sb.auth.signInWithPassword({ email: S.user.email, password: $('rlPass').value });
    if (error) { msg($('rlMsg'), 'รหัสผ่านไม่ถูกต้อง', 'warn'); return; }
    $('rlPass').value = ''; $('relogin').hidden = true;
    msg($('saved'), 'เข้าสู่ระบบแล้ว กดบันทึกอีกครั้ง', 'ok');
  });

  async function start() {
    const { data } = await sb.auth.getSession();
    const session = data && data.session;
    if (!session) { show('login'); return; }
    S.user = session.user;
    const who = await sb.from('coders').select('label, role').maybeSingle();
    if (who.error || !who.data) {
      const email = session.user.email;
      await sb.auth.signOut();
      show('login');
      msg($('lgMsg'), who.error ? 'เข้าสู่ระบบได้ แต่ตรวจรายชื่อผู้ลงรหัสไม่ได้ ตรวจอินเทอร์เน็ตแล้วลองอีกครั้ง'
        : `เข้าสู่ระบบได้ แต่ ${email} ยังไม่อยู่ในรายชื่อผู้ลงรหัส ติดต่อ Percy`, 'warn');
      return;
    }
    S.label = who.data.label;
    S.role = who.data.role === 'lead' ? 'lead' : 'coder';
    $('acctName').textContent = S.label + (S.role === 'lead' ? ' (ผู้ตัดสิน)' : '');
    $('tab-main').hidden = S.role === 'lead';
    $('tab-adjud').hidden = S.role !== 'lead';
    $('tab-practice').firstChild.textContent = S.role === 'lead' ? '2. เฉลยแบบฝึก ' : '2. แบบฝึก ';
    $('acct').hidden = false; $('tabs').hidden = false;
    const [codes, sub] = await Promise.all([sb.from('codes').select('*'), sb.from('submissions').select('user_id')]);
    S.codes = {};
    (codes.data || []).forEach((r) => { S.codes[r.contactno] = r; });
    S.submitted = !!(sub.data && sub.data.length);
    if (S.role === 'lead') { const ks = await sb.rpc('key_seen'); S.keySeen = !!(ks && ks.data); }
    S.idx.practice = clampIdx(recall('idx-practice'), S.practice.length);
    S.idx.main = clampIdx(recall('idx-main'), S.items.length);
    $('navbox').open = WIDE.matches;
    syncHead();
    renderGuide();
    if (codes.error) { go('guide'); guideWarn('โหลดคำตอบที่บันทึกไว้ไม่ได้ ตรวจอินเทอร์เน็ตแล้วเปิดหน้านี้ใหม่'); return; }
    if (S.role === 'lead') { go(practiceDone() ? 'adjud' : 'guide'); return; }
    go(!codedIn(S.practice) && !codedIn(S.items) ? 'guide' : (practiceDone() ? 'main' : 'practice'));
  }
  const clampIdx = (v, n) => (Number.isInteger(v) && v >= 0 && v < n ? v : 0);

  // ---------- steps ----------
  function show(id) {
    ['login', 'guide', 'coding', 'adjud'].forEach((s) => { $(s).hidden = s !== id; });
    $('mobilebar').hidden = id !== 'coding';
  }
  function go(tab) {
    if (tab === 'main' && S.role === 'lead') tab = 'adjud';
    if (tab === 'adjud' && S.role !== 'lead') tab = 'main';
    if (tab === 'main' && !practiceDone()) { toast('ชุดจริงยังล็อก ทำแบบฝึกให้ครบ 5 ข้อก่อน'); return; }
    S.tab = tab;
    renderTabs();
    window.scrollTo(0, 0);
    if (tab === 'guide') { renderPeers(); show('guide'); return; }
    if (tab === 'adjud') { renderAdjudScreen(); return; }
    S.set = tab;
    S.confirmSubmit = false;
    show('coding');
    renderItem(); renderNav(true); renderSetStatus(); renderPanel();
    $('form').scrollTop = 0;
    requestAnimationFrame(() => $('reader').scrollIntoView({ block: 'start' }));
  }
  document.querySelectorAll('.tab').forEach((b) => b.addEventListener('click', () => go(b.dataset.tab)));
  function renderTabs() {
    const locked = !practiceDone();
    document.querySelectorAll('.tab').forEach((b) => { if (b.dataset.tab === S.tab) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current'); });
    $('tab-main').setAttribute('aria-disabled', String(locked));
    $('tabPracticeN').textContent = `${codedIn(S.practice)}/${S.practice.length}`;
    $('tabMainN').textContent = locked ? '(ล็อก)' : `${codedIn(S.items)}/${S.items.length}`;
    $('tabAdjN').textContent = S.role !== 'lead' ? '' : (A.ready ? `${A.items.filter(adjDone).length}/${A.items.length}` : '(รอ)');
  }

  // ---------- guide ----------
  function guideWarn(text) { const g = $('guideBody'); const p = document.createElement('p'); p.className = 'status warn'; p.textContent = text; g.prepend(p); }
  function renderGuide() {
    const fieldCards = FIELDS.map((f, i) => `<div class="card"><h3>${i + 1}. ${esc(f.label)}</h3><ul>${f.def.map((d) => `<li>${esc(d)}</li>`).join('')}</ul></div>`).join('');
    $('guideBody').innerHTML = `
      ${S.role === 'lead' ? `<section><h1>คู่มือผู้ตัดสิน</h1>
        <p>Percy ไม่ลงรหัสชุดจริง หน้าที่มีสองอย่าง: ทำเฉลยแบบฝึก และตัดสินหัวข้อที่ผู้ลงรหัสสองคนตอบไม่ตรงกัน</p>
        <div class="peerbox" id="peerbox"></div></section>
      <section class="rule"><h2>ขั้นตอนของผู้ตัดสิน</h2><ol>
        <li><b>เฉลยแบบฝึก 5 ข้อ</b> ในแท็บ "2. เฉลยแบบฝึก" ให้เสร็จก่อนผู้ลงรหัสทำแบบฝึกเสร็จ ใส่เหตุผลในหมายเหตุ ระบุเลขหัวข้อ เช่น "3: ..." ผู้ลงรหัสจะอ่าน เฉลยล็อกเมื่อผู้ลงรหัสคนแรกทำแบบฝึกครบ เพื่อให้ทั้งสองคนเห็นเฉลยชุดเดียวกัน</li>
        <li><b>รอทั้งสองคนส่งงาน</b> คำตอบของผู้ลงรหัสล็อกเมื่อส่ง จึงตัดสินจากคำตอบชุดที่ส่งจริง</li>
        <li><b>ตัดสิน</b> ในแท็บ "3. ตัดสิน" ระบบแสดงเฉพาะหัวข้อที่ไม่ตรงกัน ผู้ลงรหัสแสดงเป็น A และ B ซึ่งสลับกันรายข้อ A ในข้อหนึ่งไม่ใช่คนเดียวกับ A ในอีกข้อ</li>
        <li>เลือกค่าใดก็ได้ ไม่จำเป็นต้องเป็นค่าของ A หรือ B ตัดสินจากข้อความโครงการและ codebook ระหว่างนี้ไม่เปิดผลการสำรวจเดิมหรือคำตอบของ AI เหตุผลมีหนึ่งช่องต่อข้อ ระบุเลขหัวข้อ</li>
        <li>ตัดสินครบแล้ว ตรวจตารางการตัดสินท้ายหน้า แล้วบอก Athena เพื่อดึงผลไปวิเคราะห์</li>
      </ol></section>` : `<section><h1>คู่มือก่อนเริ่ม</h1>
        <p>สวัสดี${esc(S.label ? ' ' + S.label : '')} งานนี้คือการอ่านโครงการวิจัยที่ สวรส. ให้ทุน แล้วลงรหัส 7 หัวข้อต่อโครงการ อ่านคู่มือราว 10 นาที ทำแบบฝึก 5 ข้อ แล้วจึงลงชุดจริง ${S.items.length} โครงการ ข้อละราว 2–3 นาที รวมราว 4–6 ชั่วโมง บันทึกทีละข้อ หยุดแล้วกลับมาทำต่อจากเครื่องไหนก็ได้</p>
        <div class="peerbox" id="peerbox"></div></section>
      <section class="rule"><h2>กติกาการปกปิดคำตอบ (blinding)</h2><ul>
        <li>คำตอบของคุณอ่านได้เฉพาะบัญชีของคุณ ผู้ลงรหัสอีกคนเห็นแค่ว่าคุณส่งงานแล้วหรือยัง ไม่เห็นว่าลงไปกี่ข้อ</li>
        <li>ระบบนี้ไม่มีคำตอบของ AI หรือของการสำรวจก่อนหน้า อย่าเปิดผลการสำรวจเดิมระหว่างลงรหัส</li>
        <li>คุยกับผู้ลงรหัสอีกคนได้เฉพาะเรื่องแบบฝึก 5 ข้อ ชุดจริงห้ามคุยรายข้อจนกว่าทั้งสองคนกดส่งงาน</li>
        <li>ลงรหัสจากข้อความโครงการที่หน้าจอแสดง (ชื่อเรื่อง คำสำคัญ บทคัดย่อ) ซึ่งเป็นข้อความชุดเดียวกับที่ใช้ในการสำรวจ ลิงก์ไปหน้าโครงการอยู่ท้ายบทคัดย่อ ใช้เมื่อบทคัดย่อไม่พอ ถ้าเปิดอ่านรายงานฉบับเต็ม ให้ติ๊ก "เปิดอ่านรายงานฉบับเต็มประกอบข้อนี้"</li>
        <li>ลำดับโครงการสุ่มไว้แล้ว ไม่ได้เรียงตามปีหรือหัวข้อ</li>
        <li>Percy ไม่ได้ลงรหัส ทำหน้าที่ทำเฉลยแบบฝึก และตัดสินหัวข้อที่สองคนตอบไม่ตรงกันหลังทั้งสองคนส่งงาน โดยไม่เห็นคำตอบของ AI</li>
      </ul></section>`}
      <section><h2>โครงการที่มีหลายรายงาน (ชุดโครงการ)</h2><ul>
        <li>ลงรหัสทั้งชุดเป็นข้อเดียว หน้าจอแบ่งรายงานเป็นช่วง มีปุ่มกระโดดไปแต่ละรายงานด้านบน</li>
        <li>หัวข้อ 4 และ 5: ใช้ค่าที่สูงสุดในบรรดารายงาน (ใช่ > ก้ำกึ่ง > ไม่ใช่) และบอกในหลักฐานว่ามาจากรายงานที่เท่าไร</li>
        <li>หัวข้อ 2: ใช้แนวทางของรายงานส่วนใหญ่ ถ้าเสมอกันใช้ลำดับ ทบทวน > ต้นทุน > คุณภาพหรือผสม > ปริมาณ</li>
        <li>หัวข้อ 3: ใช่ ถ้ารายงานใดรายงานหนึ่งเป็นใช่</li>
      </ul></section>
      <section><h2>7 หัวข้อที่ต้องลง</h2><p class="small muted">ระหว่างลงรหัส กด "นิยาม" ใต้แต่ละหัวข้อ หรือ "แสดงนิยามทั้งหมด" ด้านบนฟอร์ม เพื่อเปิดข้อความเดียวกันนี้ หัวข้อ 1–5 ใช้ codebook ชุดเดียวกับการสำรวจเดิม หัวข้อ 6–7 เป็นสองแกนของกรอบสี่ช่อง</p>${fieldCards}
        <div class="cb-scroll"><table class="quad"><caption class="small muted">หัวข้อ 6 × หัวข้อ 7 = กรอบสี่ช่อง</caption>
          <tr><th></th><th>ภายในกติกาเดิม</th><th>เปลี่ยนแปลงโครงสร้าง</th></tr>
          <tr><th>วิเคราะห์ปัญหา</th><td>ช่องที่ 1</td><td>ช่องที่ 2</td></tr>
          <tr><th>สังเคราะห์ข้อเสนอ</th><td>ช่องที่ 3</td><td>ช่องที่ 4</td></tr></table></div></section>
      <section><h2>หลักฐานและหมายเหตุ</h2><ul>
        <li>หลักฐาน: วลีไม่เกิน 15 คำจากบทคัดย่อ (ภาษาเดิม) ที่ทำให้คุณลงใช่หรือก้ำกึ่งในหัวข้อ 4 หรือ 5 เลือกข้อความในบทคัดย่อแล้วกด "ใช้ข้อความที่เลือกในบทคัดย่อ" ได้</li>
        <li>หมายเหตุ: กรณีก้ำกึ่งเขียน "เส้นแบ่ง" แล้วเหตุผลสั้น ๆ ถ้าลงหัวข้อ 3 เป็นใช่เพราะกฎ 1.1 หรือ 1.2 กดปุ่มเลขกฎใต้หมายเหตุ</li>
      </ul></section>
      ${S.role === 'lead' ? '' : `<section><h2>ขั้นตอน</h2><ol>
        <li>แบบฝึก 5 ข้อ ทำครบแล้วเห็นเฉลยของ Percy เทียบกับคำตอบของคุณ แล้วนัดคุยกับผู้ลงรหัสอีกคนและ Percy เรื่องข้อที่ต่างกัน แบบฝึกไม่นับในผล</li>
        <li>ชุดจริง ${S.items.length} ข้อ ข้อที่ยังไม่ลง กดเลขข้อในแถบ "ข้อทั้งหมด" เพื่อกลับไป</li>
        <li>ครบแล้วกด "ส่งงาน" เพื่อบอก Percy ว่าคุณลงเสร็จ หลังส่งแก้คำตอบไม่ได้ ดูข้อที่เขียนว่า "เส้นแบ่ง" อีกครั้งก่อนส่ง</li>
      </ol></section>`}
      <section><h2>ทางลัดแป้นพิมพ์</h2><ul>
        <li>Ctrl+Enter (Mac: ⌘+Enter) บันทึก แล้วไปข้อต่อไป (ใช้ได้ทั้งหน้าลงรหัสและหน้าตัดสิน)</li>
        <li>Alt+← และ Alt+→ (Mac: Option) ข้อก่อนหน้าและข้อถัดไป เมื่อไม่ได้พิมพ์ในช่องข้อความ</li>
        <li>คำตอบที่ยังไม่บันทึกเก็บเป็นร่างในเครื่องนี้ กลับมาที่ข้อเดิมจะเห็นร่างนั้น</li>
      </ul></section>
      <div class="start"><button class="btn btn--primary" type="button" id="startBtn">${S.role === 'lead' ? (practiceDone() ? 'ไปที่หน้าตัดสิน' : 'ทำเฉลยแบบฝึก') : (practiceDone() ? 'ไปที่ชุดจริง' : 'เริ่มแบบฝึก')}</button>${S.role === 'lead' ? '' : '<span class="small muted">มีคำถาม ถาม Percy</span>'}</div>
      <details><summary>Codebook ฉบับเต็ม (ภาษาไทย)</summary>
        <p class="cbnote">ฉบับเดียวกับที่ใช้ในการสำรวจเดิม อ่านส่วน "การตัดสินของ Percy 12 พ.ย. 2569" ท้ายเอกสารก่อน ส่วนนั้นแทนข้อความก่อนหน้าที่ขัดกัน เช่น principal–agent ลงไม่ใช่ (ไม่ใช่ก้ำกึ่ง) และรูปแบบบริการใน รพ.รัฐ รพ.สต. หรือเครือข่ายอำเภอลงใช่ตามกฎ 1.1 ช่อง named_theory, contactno และ coder ในตารางไม่ใช้ในชุดนี้</p>
        <div class="cb-scroll"><div class="cb" id="cbFull"></div></div></details>`;
    $('startBtn').addEventListener('click', () => go(practiceDone() ? (S.role === 'lead' ? 'adjud' : 'main') : 'practice'));
    $('cbFull').innerHTML = renderMarkdown(S.codebook);
  }
  function inline(s) { return esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/`([^`]+)`/g, '<code>$1</code>').replace(/&lt;br&gt;/g, '<br>'); }
  function renderMarkdown(md) {
    const out = []; let depth = 0, table = false;
    const close = (d) => { while (depth > d) { out.push('</ul>'); depth--; } };
    for (const raw of md.split('\n')) {
      if (/^\|/.test(raw)) {
        close(0);
        if (/^\|[-\s|]+\|$/.test(raw)) continue;
        if (!table) { out.push('<table>'); table = true; }
        out.push('<tr>' + raw.slice(1, -1).split('|').map((c) => '<td>' + inline(c.trim()) + '</td>').join('') + '</tr>');
        continue;
      }
      if (table) { out.push('</table>'); table = false; }
      const li = raw.match(/^(\s*)- (.*)$/);
      if (li) { const d = Math.floor(li[1].length / 4) + 1; while (depth < d) { out.push('<ul>'); depth++; } close(d); out.push('<li>' + inline(li[2]) + '</li>'); continue; }
      close(0);
      if (/^#{1,3} /.test(raw)) out.push('<h3>' + inline(raw.replace(/^#+ /, '')) + '</h3>');
      else if (raw.trim()) out.push('<p>' + inline(raw) + '</p>');
    }
    close(0); if (table) out.push('</table>');
    return out.join('');
  }
  async function peers() { const { data, error } = await sb.rpc('coding_progress'); return error ? null : data; }
  // A coder sees only whether the other coder has submitted, never their counts, so nobody paces against anyone; the lead sees counts.
  const peerLine = (p) => (p.is_me || S.role === 'lead'
    ? `<span><b>${esc(p.is_me ? p.label + ' (คุณ)' : p.label)}</b> ชุดจริง ${p.coded}/${S.items.length} แบบฝึก ${Math.min(p.practice_coded, PRACTICE_N)}/${PRACTICE_N}${p.submitted ? ' ส่งงานแล้ว' : ''}</span>`
    : `<span><b>ผู้ลงรหัสอีกคน</b> ${p.submitted ? 'ส่งงานแล้ว' : 'ยังไม่ส่งงาน'}</span>`);
  async function renderPeers() {
    const data = await peers(), box = $('peerbox');
    if (!box || !data) return;
    box.innerHTML = (S.role === 'lead' ? '<span class="muted">ความคืบหน้าของผู้ลงรหัส:</span>' : '') + data.map(peerLine).join('');
  }

  // ---------- form ----------
  $('fields').innerHTML = FIELDS.map((f, n) => `
    <fieldset id="fs-${f.key}" aria-describedby="def-${f.key}">
      <legend><span class="num">${n + 1}.</span>${esc(f.label)}<span class="need">ยังไม่เลือก</span></legend>
      <div class="opts">${f.opts.map(([v, l]) => { const id = `o-${f.key}-${v.replace(/[^a-z]/g, '')}`; return `<label class="opt" for="${id}"><input type="radio" name="${f.key}" id="${id}" value="${v}"><span>${esc(l)}</span></label>`; }).join('')}</div>
      <details class="def" id="def-${f.key}"><summary>นิยาม: ${esc(f.label)}</summary><ul>${f.def.map((d) => `<li>${esc(d)}</li>`).join('')}</ul></details>
    </fieldset>`).join('');

  function readForm() {
    const o = {};
    KEYS.forEach((k) => { const r = document.querySelector(`input[name="${k}"]:checked`); o[k] = r ? r.value : null; });
    o.evidence = $('evidence').value.trim() || null;
    o.note = $('note').value.trim() || null;
    o.opened_fulltext = $('opened').checked;
    return o;
  }
  const norm = (c) => { const o = {}; KEYS.forEach((k) => { o[k] = (c && c[k]) || null; }); o.evidence = (c && c.evidence) || null; o.note = (c && c.note) || null; o.opened_fulltext = !!(c && c.opened_fulltext); return o; };
  const same = (a, b) => JSON.stringify(norm(a)) === JSON.stringify(norm(b));
  const dirty = () => !$('coding').hidden && !!cur() && !same(readForm(), S.codes[cur().id]);
  function fillForm(c) {
    KEYS.forEach((k) => document.querySelectorAll(`input[name="${k}"]`).forEach((r) => { r.checked = !!c && c[k] === r.value; r.removeAttribute('aria-invalid'); }));
    $('evidence').value = (c && c.evidence) || '';
    $('note').value = (c && c.note) || '';
    $('opened').checked = !!(c && c.opened_fulltext);
    document.querySelectorAll('fieldset.missing').forEach((f) => f.classList.remove('missing'));
    $('missingTop').hidden = true;
    formAids();
  }
  // Count, evidence reminder, rule buttons and the mobile counter follow the form as it changes.
  function formAids() {
    const v = readForm(), n = KEYS.filter((k) => v[k]).length;
    $('count').textContent = `${n}/7 หัวข้อ`;
    $('mbCount').textContent = `(${n}/7)`;
    $('shBar').style.width = (100 * n / 7) + '%';
    const wantsEv = ['yes', 'borderline'].includes(v.critical) || ['yes', 'borderline'].includes(v.rights);
    msg($('evNote'), wantsEv && !v.evidence ? 'หัวข้อ 4 หรือ 5 เป็นใช่หรือก้ำกึ่ง ใส่วลีหลักฐานด้วย' : '', wantsEv && !v.evidence ? 'warn' : '');
    $('ruleBtns').hidden = v.state !== 'yes';
    $('save').textContent = S.noEvidenceOk[cur() && cur().id] === 'ask' ? 'บันทึกโดยไม่มีหลักฐาน' : 'บันทึก แล้วไปข้อต่อไป';
  }
  $('form').addEventListener('input', onEdit);
  $('form').addEventListener('change', onEdit);
  function onEdit(e) {
    if (e.type === 'change' && e.target.type === 'radio' && document.body.classList.contains('sheet-open')) {
      const fss = [...document.querySelectorAll('#fields fieldset')], k = fss.indexOf(e.target.closest('fieldset'));
      const nx = fss.slice(k + 1).find((f) => !f.querySelector('input:checked')) || $('opened').closest('label');
      setTimeout(() => nx.scrollIntoView({ block: 'start', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }), 120);
    }
    const fs = e.target.closest && e.target.closest('fieldset');
    if (fs && fs.classList.contains('missing') && document.querySelector(`input[name="${fs.id.slice(3)}"]:checked`)) {
      fs.classList.remove('missing'); fs.querySelectorAll('input').forEach((r) => r.removeAttribute('aria-invalid'));
      updateMissingTop();
    }
    const it = cur(); if (!it) return;
    if (S.noEvidenceOk[it.id] === 'ask') delete S.noEvidenceOk[it.id];
    if (dirty()) {
      setDraft(it.id, readForm());
      msg($('saved'), 'ยังไม่บันทึก ร่างเก็บในเครื่องนี้แล้ว');
    } else { setDraft(it.id, null); msg($('saved'), isCoded(S.codes[it.id]) ? 'บันทึกแล้ว' : '', 'ok'); }
    formAids(); renderNav(false);
  }
  function updateMissingTop() {
    const miss = FIELDS.filter((f) => $('fs-' + f.key).classList.contains('missing'));
    $('missingTop').hidden = !miss.length;
    $('missingTop').textContent = miss.length ? `ยังไม่ได้เลือก ${miss.length} หัวข้อ: ${miss.map((f) => f.label).join(', ')}` : '';
  }
  document.querySelectorAll('#ruleBtns [data-rule]').forEach((b) => b.addEventListener('click', () => {
    const tag = 'กฎ ' + b.dataset.rule, note = $('note');
    if (!note.value.includes(tag)) note.value = (note.value.trim() ? note.value.trim() + ' ' : '') + tag;
    note.dispatchEvent(new Event('input', { bubbles: true }));
  }));
  // Evidence from the abstract: remember the last selection made inside the project text.
  document.addEventListener('selectionchange', () => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.anchorNode) return;
    const node = sel.anchorNode.nodeType === 1 ? sel.anchorNode : sel.anchorNode.parentElement;
    if (!node || !$('reports').contains(node)) return;
    S.lastSel = selInfo(sel, node);
  });
  function selInfo(sel, node) {
    const rep = node.closest('.report');
    return { id: cur() && cur().id, text: sel.toString().replace(/\s+/g, ' ').trim(), report: rep ? rep.dataset.no : null, multi: $('reports').children.length > 1 };
  }
  $('useSel').addEventListener('click', () => {
    const sel = window.getSelection();
    let info = null;
    if (sel && !sel.isCollapsed && sel.anchorNode) { const node = sel.anchorNode.nodeType === 1 ? sel.anchorNode : sel.anchorNode.parentElement; if (node && $('reports').contains(node)) info = selInfo(sel, node); }
    if (!info && S.lastSel && S.lastSel.id === (cur() && cur().id)) info = S.lastSel;
    if (!info || !info.text) { msg($('evNote'), 'ลากเลือกข้อความในบทคัดย่อของข้อนี้ก่อน แล้วกดปุ่มนี้', 'warn'); return; }
    const t = (info.multi && info.report ? `รายงาน ${info.report}: ` : '') + info.text, ev = $('evidence');
    ev.value = ev.value.trim() ? ev.value.trim() + ' / ' + t : t; S.lastSel = null;
    ev.dispatchEvent(new Event('input', { bubbles: true }));
  });
  $('defsAll').addEventListener('click', () => setDefsAll(!recall('defs-all'), true));
  function setDefsAll(on, persist) {
    if (persist) store('defs-all', on ? true : undefined);
    $('defsAll').setAttribute('aria-pressed', String(!!on));
    $('defsAll').textContent = on ? 'ซ่อนนิยามทั้งหมด' : 'แสดงนิยามทั้งหมด';
    document.querySelectorAll('.def').forEach((d) => { d.open = !!on; });
  }

  // ---------- reader ----------
  function parseItem(text) {
    const o = { th: '', en: '', kw: '', n: 1, reports: [] };
    let rep = null, part = null;
    for (const line of text.split('\n')) {
      const top = line.match(/^- ([^:]{1,40}): ?(.*)$/), sub = line.match(/^\s+- ([^:]{1,40}): ?(.*)$/);
      if (top) {
        const [, lab, val] = top;
        if (lab === 'ชื่อเรื่อง (TH)') o.th = val;
        else if (lab === 'Title (EN)') o.en = val;
        else if (lab === 'คำสำคัญ') o.kw = val;
        else if (lab === 'รายงานฉบับสมบูรณ์ในคลัง') o.n = parseInt(val, 10) || 1;
        else if (/^รายงาน \d+$/.test(lab)) { rep = { no: lab.split(' ')[1], title: val, parts: [] }; o.reports.push(rep); part = null; }
        continue;
      }
      if (sub) {
        if (!rep) { rep = { no: '1', title: null, parts: [] }; o.reports.push(rep); }
        part = { label: sub[1], text: sub[2], en: /\(EN\)/.test(sub[1]) };
        rep.parts.push(part);
        continue;
      }
      if (line.trim() && part) part.text += '\n' + line.trim();
    }
    return o;
  }
  // Mark the report on screen in the row of report links.
  let repObserver = null;
  function watchReports(multi) {
    if (repObserver) { repObserver.disconnect(); repObserver = null; }
    if (!multi || !('IntersectionObserver' in window)) return;
    const links = Object.fromEntries([...$('toc').querySelectorAll('a')].map((a) => [a.getAttribute('href').slice(1), a]));
    const seen = new Map();
    repObserver = new IntersectionObserver((entries) => {
      entries.forEach((e) => seen.set(e.target.id, e.isIntersecting ? e.boundingClientRect.top : null));
      let best = null, bestTop = Infinity;
      seen.forEach((top, id) => { if (top != null && Math.abs(top) < bestTop) { best = id; bestTop = Math.abs(top); } });
      Object.entries(links).forEach(([id, a]) => { if (id === best) { a.setAttribute('aria-current', 'location'); a.scrollIntoView({ block: 'nearest', inline: 'nearest' }); } else a.removeAttribute('aria-current'); });
    }, { rootMargin: `-${$('topbar').offsetHeight + 40}px 0px -55% 0px` });
    $('reports').querySelectorAll('.report').forEach((r) => repObserver.observe(r));
  }
  const absHtml = (t) => esc(t).replace(/\[…ตัดที่ (\d+) ตัวอักษร\]/g, '<span class="trunc">ตัดที่ $1 ตัวอักษร</span>').replace(/\n/g, '<br>');
  function renderItem() {
    const arr = list(), i = S.idx[S.set], it = arr[i];
    if (!it) return;
    const p = parseItem(it.text), multi = p.reports.length > 1;
    S.lastSel = null; S.readY = null;
    $('pos').textContent = `${S.set === 'practice' ? 'แบบฝึก' : 'ข้อ'} ${i + 1} จาก ${arr.length}`;
    $('cid').textContent = `สัญญา ${it.id}`;
    $('shTitle').textContent = $('pos').textContent;
    $('shSub').textContent = p.th || p.en;
    $('mbPos').textContent = $('pos').textContent;
    $('title').textContent = p.th || p.en;
    $('titleEn').textContent = p.th ? p.en : '';
    $('kw').textContent = p.kw ? 'คำสำคัญ: ' + p.kw : '';
    $('toc').hidden = !multi;
    $('toc').innerHTML = multi ? `<span class="muted">ชุดโครงการ ${p.reports.length} รายงาน:</span>` + p.reports.map((r) => `<a href="#r-${esc(r.no)}">รายงาน ${esc(r.no)}</a>`).join('') : '';
    $('reports').innerHTML = p.reports.map((r) => `<section class="report" id="r-${esc(r.no)}" data-no="${esc(r.no)}">
      ${multi ? `<p class="report__h">รายงาน ${esc(r.no)} จาก ${p.reports.length}</p>` : ''}${multi && r.title ? `<p class="report__t">${esc(r.title)}</p>` : ''}
      ${r.parts.map((pt) => `<div class="abs"${pt.en ? ' lang="en"' : ''}><span class="abs__lbl">${pt.en ? 'Abstract (EN)' : 'บทคัดย่อ (TH)'}</span>${absHtml(pt.text)}</div>`).join('')}
    </section>`).join('') || '<p class="muted">ไม่มีบทคัดย่อในคลัง</p>';
    $('toc').querySelectorAll('a').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); const t = document.getElementById(a.getAttribute('href').slice(1)); if (t) t.scrollIntoView({ block: 'start' }); }));
    watchReports(multi);
    $('srcLink').href = it.url;
    $('multiRule').hidden = !multi;
    $('multiRule').innerHTML = multi ? 'ชุดโครงการ: ลงทั้งชุดเป็นข้อเดียว<ul><li>หัวข้อ 4 และ 5 ใช้ค่าสูงสุดในบรรดารายงาน และบอกเลขรายงานในหลักฐาน</li><li>หัวข้อ 2 ใช้แนวทางของรายงานส่วนใหญ่</li><li>หัวข้อ 3 ใช่ ถ้ารายงานใดเป็นใช่</li></ul>' : '';
    $('formTitle').textContent = S.set === 'practice' ? (S.role === 'lead' ? 'เฉลยแบบฝึก (ผู้ลงรหัสเห็นหลังทำแบบฝึกของตัวเองครบ)' : 'คำตอบแบบฝึก (ไม่นับในผล)') : 'คำตอบของคุณ';
    const draft = getDraft(it.id), stored = S.codes[it.id];
    const useDraft = draft && !same(draft, stored);
    fillForm(useDraft ? draft : stored);
    if (draft && !useDraft) setDraft(it.id, null);
    if (S.flash) { msg($('saved'), S.flash, 'ok'); S.flash = ''; }
    else if (useDraft) msg($('saved'), 'คืนร่างที่ยังไม่บันทึกจากครั้งก่อน กดบันทึกเพื่อเก็บ', 'warn');
    else msg($('saved'), isCoded(stored) ? 'บันทึกแล้ว' : '', 'ok');
    setDefsAll(!!recall('defs-all'), false);
    const leadKey = S.role === 'lead' && S.set === 'practice';
    document.querySelector('label[for="note"] small').textContent = leadKey ? 'เหตุผลของเฉลย ผู้ลงรหัสจะอ่าน ระบุเลขหัวข้อ เช่น "3: ..."' : 'กรณีก้ำกึ่งเขียน "เส้นแบ่ง" แล้วเหตุผลสั้น ๆ';
    const locked = (S.set === 'main' && S.submitted) || (leadKey && S.keySeen);
    $('form').querySelectorAll('input, textarea, #useSel, #ruleBtns button, #save').forEach((el) => { el.disabled = locked; });
    if (locked) msg($('saved'), leadKey ? 'ผู้ลงรหัสเริ่มเห็นเฉลยแล้ว เฉลยล็อก แก้ไม่ได้' : 'ส่งงานแล้ว คำตอบล็อก แก้ไม่ได้', 'ok');
    $('prev').disabled = i === 0; $('next').disabled = i === arr.length - 1;
    store('idx-' + S.set, i);
    $('form').scrollTop = 0;
  }
  function renderNav(rebuild) {
    const arr = list(), nav = $('nav');
    if (rebuild || nav.children.length !== arr.length) {
      nav.innerHTML = '';
      arr.forEach((it, i) => {
        const b = document.createElement('button');
        b.type = 'button'; b.textContent = i + 1;
        b.addEventListener('click', () => jump(i));
        nav.appendChild(b);
      });
    }
    const cid = cur() && cur().id;
    arr.forEach((it, i) => {
      const b = nav.children[i], done = isCoded(S.codes[it.id]), draft = !!getDraft(it.id) || (it.id === cid && dirty());
      b.classList.toggle('done', done); b.classList.toggle('draft', draft); b.classList.toggle('cur', i === S.idx[S.set]);
      b.setAttribute('aria-label', `ข้อ ${i + 1} ${done ? 'ลงแล้ว' : 'ยังไม่ลง'}${draft ? ' มีร่างที่ยังไม่บันทึก' : ''}`);
      if (i === S.idx[S.set]) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current');
    });
    const done = codedIn(arr), left = arr.filter((it) => !isCoded(S.codes[it.id]));
    $('bar').style.width = (100 * done / arr.length) + '%';
    $('navSum').textContent = `ข้อทั้งหมด: ข้อ ${S.idx[S.set] + 1} จาก ${arr.length} (ลงแล้ว ${done} เหลือ ${left.length})`;
    const lb = $('leftList');
    lb.innerHTML = S.set === 'main' && left.length && left.length <= 10 ? 'เหลือ: ' + left.map((it) => `<button class="btn btn--ghost btn--sm" type="button" data-i="${arr.indexOf(it)}">${arr.indexOf(it) + 1}</button>`).join(' ') : '';
    lb.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => jump(+b.dataset.i)));
    $('nextTodo').disabled = !left.length;
    renderTabs();
    renderHub();
  }
  // Move to item i; the project title gets focus so screen readers announce the new item.
  function jump(i) {
    const arr = list();
    S.idx[S.set] = Math.max(0, Math.min(arr.length - 1, i));
    S.confirmSubmit = false;
    renderItem(); renderNav(false); renderPanel();
    $('reader').scrollIntoView({ block: 'start' });
    $('title').focus({ preventScroll: true });
  }
  function nextTodoIndex(from) {
    const arr = list();
    for (let k = 1; k <= arr.length; k++) { const j = (from + k) % arr.length; if (!isCoded(S.codes[arr[j].id])) return j; }
    return -1;
  }
  $('prev').addEventListener('click', () => jump(S.idx[S.set] - 1));
  $('next').addEventListener('click', () => jump(S.idx[S.set] + 1));
  $('nextTodo').addEventListener('click', () => { const j = nextTodoIndex(S.idx[S.set]); if (j >= 0) jump(j); });
  // Phones and tablets: the answer form opens as a sheet over the text and closes back to the reading place.
  const behindSheet = () => [$('topbar'), $('hub'), $('navbox'), $('reader'), $('mobilebar')];
  function openSheet() {
    S.readY = window.scrollY;
    document.body.classList.add('sheet-open');
    behindSheet().forEach((el) => { el.inert = true; });
    $('form').scrollTop = 0;
    const first = [...document.querySelectorAll('#fields fieldset')].find((fs) => !fs.querySelector('input:checked'));
    if (first) { first.scrollIntoView({ block: 'start' }); first.querySelector('input').focus({ preventScroll: true }); } else $('save').focus({ preventScroll: true });
  }
  function closeSheet(restore) {
    if (!document.body.classList.contains('sheet-open')) return;
    document.body.classList.remove('sheet-open');
    behindSheet().forEach((el) => { el.inert = false; });
    if (restore && S.readY != null) window.scrollTo(0, S.readY);
  }
  $('toForm').addEventListener('click', openSheet);
  $('shClose').addEventListener('click', () => closeSheet(true));
  window.addEventListener('beforeunload', (e) => { if (dirty()) { e.preventDefault(); e.returnValue = ''; } });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && document.body.classList.contains('sheet-open')) { closeSheet(true); return; }
    if (!$('adjud').hidden && !$('adjWork').hidden) {
      const typingA = /^(TEXTAREA|INPUT)$/.test(document.activeElement.tagName) && document.activeElement.type !== 'radio';
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); $('adjForm').requestSubmit(); return; }
      if (e.altKey && !typingA && e.key === 'ArrowLeft') { e.preventDefault(); if (A.idx > 0) adjJump(A.idx - 1); }
      if (e.altKey && !typingA && e.key === 'ArrowRight') { e.preventDefault(); if (A.idx < A.items.length - 1) adjJump(A.idx + 1); }
      return;
    }
    if ($('coding').hidden) return;
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); $('form').requestSubmit(); return; }
    const typing = /^(TEXTAREA|INPUT)$/.test(document.activeElement.tagName) && document.activeElement.type !== 'radio' && document.activeElement.type !== 'checkbox';
    if (e.altKey && !typing && e.key === 'ArrowLeft') { e.preventDefault(); if (S.idx[S.set] > 0) jump(S.idx[S.set] - 1); }
    if (e.altKey && !typing && e.key === 'ArrowRight') { e.preventDefault(); if (S.idx[S.set] < list().length - 1) jump(S.idx[S.set] + 1); }
  });

  // ---------- save ----------
  $('form').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (S.saving) return;
    const arr = list(), i = S.idx[S.set], it = arr[i], v = readForm();
    const missing = FIELDS.filter((f) => !v[f.key]);
    FIELDS.forEach((f) => {
      const miss = missing.includes(f);
      $('fs-' + f.key).classList.toggle('missing', miss);
      $('fs-' + f.key).querySelectorAll('input').forEach((r) => { if (miss) r.setAttribute('aria-invalid', 'true'); else r.removeAttribute('aria-invalid'); });
    });
    updateMissingTop();
    if (missing.length) {
      msg($('saved'), `ยังไม่ได้เลือก ${missing.length} หัวข้อ`, 'warn');
      $('form').scrollTop = 0;
      $('fs-' + missing[0].key).querySelector('input').focus({ preventScroll: true });
      return;
    }
    const wantsEv = ['yes', 'borderline'].includes(v.critical) || ['yes', 'borderline'].includes(v.rights);
    if (wantsEv && !v.evidence && S.noEvidenceOk[it.id] !== 'ask') {
      S.noEvidenceOk[it.id] = 'ask'; formAids();
      msg($('saved'), 'ยังไม่มีหลักฐาน กดบันทึกอีกครั้งเพื่อบันทึกโดยไม่มีหลักฐาน', 'warn');
      $('evidence').focus();
      return;
    }
    if (same(v, S.codes[it.id])) { after(i, false); return; }
    const before = snapshot();
    S.saving = true; $('save').disabled = true; msg($('saved'), 'กำลังบันทึก…');
    const row = { user_id: S.user.id, contactno: it.id, practice: S.set === 'practice', position: i + 1, ...v };
    const { error } = await sb.from('codes').upsert(row, { onConflict: 'user_id,contactno' });
    S.saving = false; $('save').disabled = false;
    if (error) {
      const auth = error.status === 401 || error.code === 'PGRST301' || /jwt|token|auth/i.test(error.message || '');
      if (auth) { closeSheet(false); $('relogin').hidden = false; $('relogin').scrollIntoView({ block: 'center' }); $('rlPass').focus(); msg($('saved'), 'หมดเวลาเข้าสู่ระบบ เข้าสู่ระบบอีกครั้งด้านล่าง คำตอบยังอยู่', 'warn'); }
      else msg($('saved'), 'บันทึกไม่สำเร็จ ตรวจอินเทอร์เน็ตแล้วกดบันทึกอีกครั้ง คำตอบในฟอร์มยังอยู่', 'warn');
      return;
    }
    row.saved_at = new Date().toISOString();
    S.codes[it.id] = row;
    delete S.noEvidenceOk[it.id];
    setDraft(it.id, null);
    after(i, true);
    celebrate(before);
  });
  function after(i, saved) {
    closeSheet(false);
    const j = nextTodoIndex(i), arr = list();
    const head = saved ? `บันทึก${S.set === 'practice' ? (S.role === 'lead' ? 'เฉลยข้อ' : 'แบบฝึก') : 'ข้อ'} ${i + 1} แล้ว` : `ข้อ ${i + 1} ไม่มีการแก้`;
    if (j < 0) {
      const wasFirstTime = saved && codedIn(arr) === arr.length && !S.allDoneShown[S.set];
      if (wasFirstTime || i === arr.length - 1) {
        S.allDoneShown[S.set] = true;
        renderNav(false); renderItem(); renderSetStatus(); renderPanel();
        msg($('saved'), head + (S.set === 'practice' ? ' แบบฝึกครบ 5 ข้อแล้ว' : ' ลงครบทุกข้อแล้ว'), 'ok');
        window.scrollTo(0, 0);
        return;
      }
      S.flash = `${head} ไปข้อ ${i + 2}`;
      jump(i + 1); renderSetStatus();
      return;
    }
    S.flash = `${head} ไปข้อ ${j + 1} (ข้อแรกที่ยังไม่ลง)`;
    jump(j);
    renderSetStatus();
  }

  // ---------- status, completion panels, submission ----------
  function status(text, warn) { $('setStatus').textContent = text; $('setStatus').className = 'status' + (warn ? ' warn' : ''); }
  function renderSetStatus() {
    if (S.set === 'practice' && S.role === 'lead') {
      status(S.keySeen ? 'ผู้ลงรหัสเริ่มเห็นเฉลยแล้ว เฉลยล็อก แก้ไม่ได้' : (practiceDone() ? 'เฉลยครบ 5 ข้อแล้ว แก้ได้จนกว่าผู้ลงรหัสคนแรกจะทำแบบฝึกครบ หลังจากนั้นเฉลยล็อก' : 'เฉลยแบบฝึก 5 ข้อ ลงแบบเดียวกับผู้ลงรหัส ใส่เหตุผลในหมายเหตุ ระบุเลขหัวข้อ ผู้ลงรหัสจะอ่าน'));
    } else if (S.set === 'practice') {
      status(practiceDone()
        ? 'แบบฝึกครบแล้ว ดูเฉลยของ Percy ด้านบน แล้วนัดคุยเรื่องข้อที่ตอบต่างกันก่อนเริ่มชุดจริง'
        : 'แบบฝึก 5 ข้อ ไม่นับในผล ลงครบแล้วจะเห็นเฉลยของ Percy และชุดจริงจะเปิด');
    } else {
      status(S.submitted ? 'คุณส่งงานแล้ว คำตอบล็อก แก้ไม่ได้ ขอบคุณครับ' : 'ชุดจริง คำตอบของคุณอ่านได้เฉพาะบัญชีของคุณ อย่าคุยรายข้อกับผู้ลงรหัสอีกคนจนกว่าทั้งสองคนส่งงาน');
    }
  }
  async function renderPanel() {
    const box = $('donePanel');
    if (S.set === 'practice') {
      if (!practiceDone()) { box.hidden = true; return; }
      const cells = (c, ref) => FIELDS.map((f) => { const v = (c || {})[f.key], d = ref && v !== (ref || {})[f.key]; return `<td${d ? ' class="diff"' : ''}>${esc(LABEL[f.key + ':' + v] || '')}</td>`; }).join('');
      const fieldHead = FIELDS.map((f, n) => `<th>${n + 1}. ${esc(f.label)}</th>`).join('');
      if (S.role === 'lead') {
        const rows = S.practice.map((it, i) => { const c = S.codes[it.id] || {}; return `<tr><td>${i + 1}</td><td class="mono">${esc(it.id)}</td>${cells(c)}<td>${esc(c.evidence || '')}</td><td>${esc(c.note || '')}</td></tr>`; }).join('');
        box.innerHTML = `<h2>เฉลยครบ 5 ข้อแล้ว</h2><p class="small">${S.keySeen ? 'ผู้ลงรหัสเริ่มเห็นเฉลยแล้ว เฉลยล็อก แก้ไม่ได้' : 'ผู้ลงรหัสจะเห็นตารางนี้หลังทำแบบฝึกของตัวเองครบ แก้ได้จนกว่าผู้ลงรหัสคนแรกจะทำแบบฝึกครบ หลังจากนั้นเฉลยล็อก'}</p>
          <div class="scroll"><table><tr><th>ข้อ</th><th>สัญญา</th>${fieldHead}<th>หลักฐาน</th><th>หมายเหตุ</th></tr>${rows}</table></div>
          <div class="row"><button class="btn btn--primary" type="button" id="toAdj">ไปที่หน้าตัดสิน</button></div>`;
        box.hidden = false;
        $('toAdj').addEventListener('click', () => go('adjud'));
        return;
      }
      const kres = await sb.rpc('practice_key');
      const key = Object.fromEntries(((kres && kres.data) || []).map((r) => [r.contactno, r]));
      const hasKey = Object.keys(key).length > 0;
      const nDiff = hasKey ? S.practice.reduce((n, it) => n + (key[it.id] ? FIELDS.filter((f) => (S.codes[it.id] || {})[f.key] !== key[it.id][f.key]).length : 0), 0) : 0;
      let body;
      if (window.matchMedia('(min-width: 600px)').matches) {
        const rows = S.practice.map((it, i) => {
          const c = S.codes[it.id] || {}, k = key[it.id];
          return `<tr><td rowspan="${k ? 2 : 1}">${i + 1}</td><td class="mono" rowspan="${k ? 2 : 1}">${esc(it.id)}</td><td>คุณ</td>${cells(c, k)}<td>${esc(c.evidence || '')}</td><td>${esc(c.note || '')}</td></tr>`
            + (k ? `<tr class="ref"><td>เฉลย</td>${cells(k, c)}<td>${esc(k.evidence || '')}</td><td>${esc(k.note || '')}</td></tr>` : '');
        }).join('');
        body = `<div class="scroll"><table><tr><th>ข้อ</th><th>สัญญา</th><th>ใคร</th>${fieldHead}<th>หลักฐาน</th><th>หมายเหตุ</th></tr>${rows}</table></div>`;
      } else {
        body = '<div class="pcards">' + S.practice.map((it, i) => {
          const c = S.codes[it.id] || {}, k = key[it.id];
          const diffs = k ? FIELDS.filter((f) => c[f.key] !== k[f.key]) : [];
          return `<div class="pcard"><b>แบบฝึก ${i + 1} <span class="mono muted">${esc(it.id)}</span></b>${k ? (diffs.length ? diffs.map((f) => `<span class="d">${FIELDS.indexOf(f) + 1}. ${esc(f.label)}: คุณ ${esc(LABEL[f.key + ':' + c[f.key]] || '-')} / เฉลย ${esc(LABEL[f.key + ':' + k[f.key]] || '-')}</span>`).join('') : '<span>ตรงกับเฉลยทุกหัวข้อ</span>') + (k.note ? `<span class="muted">เหตุผลของเฉลย: ${esc(k.note)}</span>` : '') : '<span class="muted">ยังไม่มีเฉลย</span>'}</div>`;
        }).join('') + '</div>';
      }
      const firstView = !recall('practice-panel-seen');
      box.innerHTML = `<h2>แบบฝึกครบ 5 ข้อแล้ว</h2>
        <p class="small">${hasKey ? `เทียบกับเฉลยของ Percy: ต่างกัน ${nDiff} หัวข้อ (สีส้ม) อ่านเหตุผลในหมายเหตุของเฉลย แล้วนัดคุยกันเรื่องข้อที่ต่างก่อนเริ่มชุดจริง` : 'Percy ยังไม่ได้ทำเฉลย ตารางเฉลยจะขึ้นที่นี่เมื่อพร้อม รอเฉลยและคุยกันก่อนเริ่มชุดจริง'}</p>
        <details${firstView ? ' open' : ''}><summary class="small">${hasKey ? 'คำตอบของคุณเทียบกับเฉลย' : 'คำตอบแบบฝึกของคุณ'}</summary>${body}</details>
        <div class="row"><label class="check" for="talked"><input type="checkbox" id="talked"${recall('talked') ? ' checked' : ''}> คุยเรื่องแบบฝึกแล้ว</label>
        <button class="btn btn--primary" type="button" id="toMain">เริ่มชุดจริง ${S.items.length} ข้อ</button></div>`;
      box.hidden = false;
      store('practice-panel-seen', true);
      $('talked').addEventListener('change', (e) => store('talked', e.target.checked || undefined));
      $('toMain').addEventListener('click', () => go('main'));
      return;
    }
    const left = S.items.length - codedIn(S.items);
    if (left) { box.hidden = true; return; }
    const border = S.items.map((it, i) => [it, i]).filter(([it]) => /เส้นแบ่ง/.test((S.codes[it.id] || {}).note || ''));
    const data = await peers();
    box.innerHTML = `<h2>ลงครบ ${S.items.length} ข้อแล้ว</h2>
      ${data ? `<div class="peerbox">${data.map(peerLine).join('')}</div>` : ''}
      ${border.length ? `<p class="small">ข้อที่คุณเขียนว่า "เส้นแบ่ง"${S.submitted ? '' : ' ดูอีกครั้งก่อนส่ง'}: ${border.map(([, i]) => `<button class="btn btn--ghost btn--sm" type="button" data-i="${i}">${i + 1}</button>`).join(' ')}</p>` : ''}
      ${S.submitted ? '<p class="msg ok" id="submittedMsg" tabindex="-1">ส่งงานแล้ว คำตอบล็อกแล้ว ขอบคุณครับ</p>'
        : (S.confirmSubmit ? '<div class="row"><span>หลังส่งงาน แก้คำตอบไม่ได้อีก ยืนยันไหม</span><button class="btn btn--primary" type="button" id="submitYes">ยืนยันส่งงาน</button><button class="btn btn--ghost" type="button" id="submitNo">ยกเลิก</button></div>'
          : '<div class="row"><button class="btn btn--primary" type="button" id="submitBtn">ส่งงาน</button><span class="small muted">หลังส่ง แก้คำตอบไม่ได้</span></div>')}
      <p class="msg" id="finishMsg" role="status"></p>`;
    box.hidden = false;
    box.querySelectorAll('[data-i]').forEach((b) => b.addEventListener('click', () => jump(+b.dataset.i)));
    if ($('submitBtn')) $('submitBtn').addEventListener('click', async () => { S.confirmSubmit = true; await renderPanel(); $('submitYes').focus(); });
    if ($('submitNo')) $('submitNo').addEventListener('click', async () => { S.confirmSubmit = false; await renderPanel(); if ($('submitBtn')) $('submitBtn').focus(); });
    if ($('submitYes')) $('submitYes').addEventListener('click', submit);
  }
  async function submit() {
    const { error } = await sb.from('submissions').insert({ user_id: S.user.id });
    if (error) { msg($('finishMsg'), 'ส่งไม่สำเร็จ ลองอีกครั้ง', 'warn'); return; }
    S.submitted = true; S.confirmSubmit = false; await renderPanel(); renderSetStatus(); renderItem(); if ($('submittedMsg')) $('submittedMsg').focus();
  }


  // ---------- progress hub: gentle gamification that rewards progress and rest, never speed, particular answers or comparison ----------
  const MILESTONES = [10, 25, 50, 75, 100];
  const dayKey = (d) => new Date(d).toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });
  const mainRows = () => S.items.map((it) => S.codes[it.id]).filter((c) => isCoded(c) && c.saved_at);
  const daysWorked = () => new Set(mainRows().map((c) => dayKey(c.saved_at))).size;
  const today = () => { const t = dayKey(new Date()); return mainRows().filter((c) => dayKey(c.saved_at) === t).length; };
  // The daily goal is a ceiling ("enough for today"), small by default, so nobody rushes the last items of a long day.
  const GOALS = [5, 10, 15];
  const goal = () => { const g = recall('goal'); return GOALS.includes(g) ? g : 10; };
  // Stops on the path depend only on how far the coder has got, so none can be lost and none depends on an answer.
  const STOPS = [
    { label: 'แบบฝึก', tip: 'ทำแบบฝึกครบ 5 ข้อ', on: () => practiceDone() },
    { label: '25%', tip: 'ลงชุดจริงครบหนึ่งในสี่', on: () => codedIn(S.items) * 4 >= S.items.length },
    { label: '50%', tip: 'ลงชุดจริงครบครึ่ง', on: () => codedIn(S.items) * 2 >= S.items.length },
    { label: '75%', tip: 'ลงชุดจริงครบสามในสี่', on: () => codedIn(S.items) * 4 >= S.items.length * 3 },
    { label: 'ครบ', tip: 'ลงชุดจริงครบทุกข้อ', on: () => codedIn(S.items) === S.items.length },
    { label: 'ส่งงาน', tip: 'กดส่งงาน', on: () => S.submitted },
  ];
  function ringHtml(done, total) {
    const C = 2 * Math.PI * 40, pct = Math.round(100 * done / total);
    return `<div class="ring" role="img" aria-label="ลงแล้ว ${done} จาก ${total} ข้อ (${pct}%)"><svg viewBox="0 0 92 92" aria-hidden="true"><defs><linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6d4fe8"/><stop offset="1" stop-color="#3a7fe0"/></linearGradient></defs><circle class="ring__track" cx="46" cy="46" r="40"/><circle class="ring__fill" cx="46" cy="46" r="40" stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${(C * (1 - done / total)).toFixed(1)}"/></svg><div class="ring__txt" aria-hidden="true"><div><b>${pct}%</b><span>${done}/${total}</span></div></div></div>`;
  }
  function stepsHtml() {
    const on = STOPS.map((x) => x.on()), next = on.indexOf(false);
    return `<ol class="steps" aria-label="เส้นทางของงาน">${STOPS.map((x, k) => `<li class="${on[k] ? 'is-done' : k === next ? 'is-next' : ''}"><i aria-hidden="true">${on[k] ? '✓' : ''}</i><span aria-hidden="true">${esc(x.label)}</span><span class="sr">${esc(x.tip)}${on[k] ? ' ผ่านแล้ว' : ' ยังไม่ถึง'}</span></li>`).join('')}</ol>`;
  }
  function renderHub() {
    const hub = $('hub');
    if (S.role === 'lead' || $('coding').hidden) { hub.hidden = true; return; }
    const arr = list(), done = codedIn(arr);
    if (S.set === 'practice') {
      hub.innerHTML = ringHtml(done, arr.length) + `<div class="hub__main"><p class="hub__title">แบบฝึก ${done} จาก ${arr.length} ข้อ</p><p class="small muted">${done >= arr.length ? 'ครบแล้ว ชุดจริงเปิดแล้ว ดูเฉลยของ Percy ในกล่องด้านบนก่อนเริ่ม' : 'ทำครบ 5 ข้อแล้วชุดจริงจะเปิด และจะเห็นเฉลยของ Percy'}</p></div>` + stepsHtml();
      hub.hidden = false; return;
    }
    const pct = Math.round(100 * done / arr.length), next = MILESTONES.find((m) => pct < m), g = goal(), t = today(), dw = daysWorked();
    const title = S.submitted ? 'ส่งงานแล้ว ขอบคุณครับ' : next ? `อีก ${Math.max(1, Math.ceil(next * arr.length / 100) - done)} ข้อ ถึง ${next}%` : 'ลงครบทุกข้อแล้ว เหลือกดส่งงาน';
    hub.innerHTML = ringHtml(done, arr.length) + `<div class="hub__main">
      <p class="hub__title">${title}</p>
      ${S.submitted ? '' : `<div class="hub__row">${t >= g ? '<span class="goal goal--met">ครบเป้าวันนี้แล้ว ✓ พอแล้วสำหรับวันนี้</span>' : `<span class="goal">วันนี้ ${t}/${g} ข้อ <span class="bar" aria-hidden="true"><i style="width:${100 * t / g}%"></i></span></span>`}
        <span class="goalpick" role="group" aria-label="เป้าต่อวัน"><span class="muted">เป้าต่อวัน</span>${GOALS.map((n) => `<button type="button" data-goal="${n}" aria-pressed="${n === g}">${n}</button>`).join('')}</span>
        ${dw >= 2 ? `<span class="chip">ลงรหัสมาแล้ว ${dw} วัน</span>` : ''}</div>`}</div>` + stepsHtml();
    hub.querySelectorAll('[data-goal]').forEach((b) => b.addEventListener('click', () => { store('goal', +b.dataset.goal); renderHub(); }));
    hub.hidden = false;
  }
  const snapshot = () => ({ pct: Math.round(100 * codedIn(S.items) / S.items.length), today: today(), practice: practiceDone() });
  function win(text) { const t = $('toast'); t.classList.add('toast--win'); toast(text); clearTimeout(win.h); win.h = setTimeout(() => t.classList.remove('toast--win'), 5000); }
  // One message per save at most; a 45-minute break reminder, never a speed prompt.
  function celebrate(before) {
    const now = Date.now();
    if (!S.sessionStart || now - (S.lastSave || 0) > 10 * 60000) S.sessionStart = now;
    S.lastSave = now;
    if (S.set === 'main') {
      const pct = Math.round(100 * codedIn(S.items) / S.items.length), m = MILESTONES.find((x) => before.pct < x && pct >= x);
      if (m) { win(m === 100 ? 'ลงครบทุกข้อแล้ว ดูข้อที่เขียนว่า "เส้นแบ่ง" แล้วกดส่งงาน' : `ผ่าน ${m}% ของชุดจริงแล้ว`); return; }
      const g = goal(); if (before.today < g && today() >= g) { win(`ครบเป้าวันนี้ ${g} ข้อแล้ว พอแล้วสำหรับวันนี้`); return; }
    } else if (practiceDone() && !before.practice) { win('แบบฝึกครบแล้ว ชุดจริงเปิดแล้ว'); return; }
    if (now - S.sessionStart > 45 * 60000 && now - (S.lastBreak || 0) > 45 * 60000) { S.lastBreak = now; toast('ลงมา 45 นาทีแล้ว พักสายตาสักครู่ แล้วค่อยลงต่อ'); }
  }

  // ---------- adjudication (study lead only) ----------
  // A and B are assigned per item by the database, so the same letter is not the same person across items.
  const A = { rows: [], items: [], idx: 0, ready: false, both: false };
  const adjDone = (g) => g.rows.every((r) => r.decided);
  const adjDraft = (id) => recall('adjdraft-' + id);
  async function loadDisputes() {
    const prog = await peers();
    const both = !!prog && prog.length >= 2 && prog.every((p) => p.submitted);
    A.ready = false; A.both = both; A.rows = []; A.items = [];
    if (!both) return { both, prog };
    const { data, error } = await sb.rpc('disagreements');
    if (error) throw error;
    A.rows = data || []; A.ready = true;
    const by = new Map();
    A.rows.forEach((r) => { if (!by.has(r.contactno)) by.set(r.contactno, { id: r.contactno, pos: r.position, rows: [] }); by.get(r.contactno).rows.push(r); });
    A.items = [...by.values()].sort((x, y) => x.pos - y.pos);
    return { both, prog };
  }
  function adjStatus(t, warn) { $('adjStatus').textContent = t; $('adjStatus').className = 'status' + (warn ? ' warn' : ''); }
  async function renderAdjudScreen() {
    show('adjud');
    $('adjWork').hidden = true; $('adjNavbox').hidden = true; $('adjInfo').hidden = true;
    adjStatus('กำลังโหลด…');
    let st;
    try { st = await loadDisputes(); } catch (e) { adjStatus('โหลดข้อที่ไม่ตรงกันไม่ได้ ตรวจอินเทอร์เน็ตแล้วลองอีกครั้ง', true); return; }
    renderTabs();
    if (!st.both) {
      const p = st.prog || [], keyN = codedIn(S.practice);
      adjStatus('หน้าตัดสินเปิดเมื่อผู้ลงรหัสทั้งสองคนส่งงาน');
      $('adjInfo').innerHTML = `<h2>ระหว่างรอ</h2>
        <p>เฉลยแบบฝึก ${keyN}/${PRACTICE_N} ข้อ${keyN < PRACTICE_N ? ' ทำให้ครบก่อนผู้ลงรหัสทำแบบฝึกเสร็จ ไม่อย่างนั้นผู้ลงรหัสจะไม่เห็นเฉลย' : (S.keySeen ? ' (ผู้ลงรหัสเห็นแล้ว ล็อก)' : ' (ครบแล้ว)')}</p>
        ${keyN < PRACTICE_N ? '<div class="row"><button class="btn btn--primary" type="button" id="toKey">ทำเฉลยแบบฝึก</button></div>' : ''}
        <div class="peerbox">${p.map((x) => `<span><b>${esc(x.label)}</b> แบบฝึก ${Math.min(x.practice_coded, PRACTICE_N)}/${PRACTICE_N} ชุดจริง ${x.coded}/${S.items.length}${x.submitted ? ' ส่งงานแล้ว' : ''}</span>`).join('') || '<span class="muted">ยังไม่มีผู้ลงรหัสเข้าระบบ</span>'}</div>`;
      $('adjInfo').hidden = false;
      if ($('toKey')) $('toKey').addEventListener('click', () => go('practice'));
      return;
    }
    if (!A.items.length) { adjStatus('ผู้ลงรหัสสองคนตอบตรงกันทุกหัวข้อ ไม่มีข้อต้องตัดสิน'); return; }
    $('adjWork').hidden = false; $('adjNavbox').hidden = false;
    const firstOpen = A.items.findIndex((g) => !adjDone(g));
    A.idx = clampIdx(recall('idx-adj'), A.items.length);
    if (adjDone(A.items[A.idx]) && firstOpen >= 0) A.idx = firstOpen;
    renderAdjNav(true); renderAdjItem(); renderAdjDone();
  }
  function renderAdjDone() {
    const box = $('adjInfo');
    if (!A.items.length || A.items.some((g) => !adjDone(g))) { box.hidden = true; return; }
    const rows = A.items.flatMap((g) => g.rows.map((r) => { const f = FIELDS.find((x) => x.key === r.field); return `<tr><td>${g.pos}</td><td class="mono">${esc(g.id)}</td><td>${FIELDS.indexOf(f) + 1}. ${esc(f.label)}</td><td>${esc(LABEL[r.field + ':' + r.decided] || '')}</td><td>${esc(r.decided_note || '')}</td></tr>`; })).join('');
    box.innerHTML = `<h2>ตัดสินครบทุกข้อแล้ว</h2><p class="small">ตรวจรายการด้านล่าง แล้วบอก Athena เพื่อดึงผลไปวิเคราะห์ ยังแก้การตัดสินได้โดยกดเลขข้อ</p>
      <details><summary class="small">การตัดสินทั้งหมด ${A.rows.length} หัวข้อ</summary><div class="scroll"><table class="adjtable"><tr><th>ข้อ</th><th>สัญญา</th><th>หัวข้อ</th><th>ตัดสิน</th><th>เหตุผล</th></tr>${rows}</table></div></details>`;
    box.hidden = false;
  }
  function renderAdjNav(rebuild) {
    const nav = $('adjNav');
    if (rebuild || nav.children.length !== A.items.length) {
      nav.innerHTML = '';
      A.items.forEach((g, i) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = g.pos; b.addEventListener('click', () => adjJump(i)); nav.appendChild(b); });
    }
    A.items.forEach((g, i) => {
      const b = nav.children[i], done = adjDone(g), draft = !!adjDraft(g.id);
      b.classList.toggle('done', done); b.classList.toggle('draft', draft); b.classList.toggle('cur', i === A.idx);
      b.setAttribute('aria-label', `ข้อ ${g.pos} ไม่ตรง ${g.rows.length} หัวข้อ ${done ? 'ตัดสินแล้ว' : 'ยังไม่ตัดสิน'}${draft ? ' มีร่างที่ยังไม่บันทึก' : ''}`);
      if (i === A.idx) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current');
    });
    const done = A.items.filter(adjDone).length;
    $('adjSum').textContent = `ข้อที่ไม่ตรงกัน ${A.items.length} ข้อ (${A.rows.length} หัวข้อ): ตัดสินแล้ว ${done} เหลือ ${A.items.length - done}`;
    adjStatus(done === A.items.length ? 'ตัดสินครบทุกข้อแล้ว' : 'A และ B สลับกันรายข้อ ตัดสินจากข้อความโครงการและ codebook ระหว่างนี้ไม่เปิดผลการสำรวจเดิมหรือคำตอบของ AI');
    renderTabs();
  }
  function readAdj(g) {
    const picks = {}; g.rows.forEach((r) => { const c = document.querySelector(`input[name="adj-${r.field}"]:checked`); picks[r.field] = c ? c.value : null; });
    return { picks, note: $('adjNote').value };
  }
  function renderAdjItem() {
    const g = A.items[A.idx], it = S.items.find((x) => x.id === g.id);
    const p = parseItem(it ? it.text : ''), multi = p.reports.length > 1;
    $('adjReader').innerHTML = `<div class="reader__meta"><span>ข้อ ${g.pos} ในชุดจริง</span><span class="cid">สัญญา ${esc(g.id)}</span></div>
      <h2 class="title" id="adjItemTitle" tabindex="-1">${esc(p.th || p.en)}</h2>${p.th && p.en ? `<p class="title-en" lang="en">${esc(p.en)}</p>` : ''}
      ${p.kw ? `<p class="kw">คำสำคัญ: ${esc(p.kw)}</p>` : ''}
      <div class="reports">${p.reports.map((r) => `<section class="report">${multi ? `<p class="report__h">รายงาน ${esc(r.no)} จาก ${p.reports.length}</p>${r.title ? `<p class="report__t">${esc(r.title)}</p>` : ''}` : ''}${r.parts.map((pt) => `<div class="abs"${pt.en ? ' lang="en"' : ''}><span class="abs__lbl">${pt.en ? 'Abstract (EN)' : 'บทคัดย่อ (TH)'}</span>${absHtml(pt.text)}</div>`).join('')}</section>`).join('')}</div>
      ${it ? `<p class="srcline small"><a href="${esc(it.url)}" target="_blank" rel="noopener">หน้าโครงการในคลัง สวรส. ↗</a></p>` : ''}`;
    const draft = adjDraft(g.id);
    $('adjFields').innerHTML = g.rows.map((r) => {
      const f = FIELDS.find((x) => x.key === r.field), n = FIELDS.indexOf(f) + 1;
      const chosen = draft && draft.picks ? draft.picks[r.field] : r.decided;
      return `<fieldset id="afs-${f.key}"><legend><span class="num">${n}.</span>${esc(f.label)}<span class="need">ยังไม่เลือก</span></legend>
        <div class="opts">${f.opts.map(([v, l]) => { const id = `a-${f.key}-${v.replace(/[^a-z]/g, '')}`; const tags = (v === r.a ? '<span class="tag">A</span>' : '') + (v === r.b ? '<span class="tag">B</span>' : ''); return `<label class="opt" for="${id}"><input type="radio" name="adj-${f.key}" id="${id}" value="${v}"${chosen === v ? ' checked' : ''}><span>${esc(l)}${tags}</span></label>`; }).join('')}</div>
        <details class="def"><summary>นิยาม: ${esc(f.label)}</summary><ul>${f.def.map((d) => `<li>${esc(d)}</li>`).join('')}</ul></details>
      </fieldset>`;
    }).join('');
    const r0 = g.rows[0];
    $('adjAB').innerHTML = `<div><b>ผู้ลงรหัส A</b><span>หลักฐาน: ${esc(r0.a_evidence || '-')}</span><span>หมายเหตุ: ${esc(r0.a_note || '-')}</span></div>
      <div><b>ผู้ลงรหัส B</b><span>หลักฐาน: ${esc(r0.b_evidence || '-')}</span><span>หมายเหตุ: ${esc(r0.b_note || '-')}</span></div>`;
    const template = g.rows.length > 1 ? g.rows.map((r) => `${FIELDS.findIndex((x) => x.key === r.field) + 1}: `).join(' / ') : '';
    $('adjNote').value = draft ? draft.note : (r0.decided_note || template);
    $('adjMissing').hidden = true;
    msg($('adjMsg'), draft ? 'คืนร่างที่ยังไม่บันทึก กดบันทึกเพื่อเก็บ' : (adjDone(g) ? 'ตัดสินแล้ว' : ''), draft ? 'warn' : 'ok');
    $('adjPrev').disabled = A.idx === 0; $('adjNext').disabled = A.idx === A.items.length - 1;
    store('idx-adj', A.idx);
  }
  $('adjForm').addEventListener('change', onAdjEdit);
  $('adjForm').addEventListener('input', onAdjEdit);
  function onAdjEdit(e) {
    const g = A.items[A.idx]; if (!g) return;
    const fs = e.target.closest && e.target.closest('fieldset');
    if (fs && fs.classList.contains('missing')) { fs.classList.remove('missing'); const left = [...$('adjFields').querySelectorAll('fieldset.missing')]; $('adjMissing').hidden = !left.length; }
    store('adjdraft-' + g.id, readAdj(g));
    msg($('adjMsg'), 'ยังไม่บันทึก ร่างเก็บไว้ในเครื่องนี้', 'warn');
    renderAdjNav(false);
  }
  function adjJump(i) {
    A.idx = Math.max(0, Math.min(A.items.length - 1, i));
    renderAdjItem(); renderAdjNav(false);
    $(WIDE.matches ? 'adjReader' : 'adjForm').scrollIntoView({ block: 'start' });
    const t = $('adjItemTitle'); if (t) t.focus({ preventScroll: true });
  }
  $('adjPrev').addEventListener('click', () => adjJump(A.idx - 1));
  $('adjNext').addEventListener('click', () => adjJump(A.idx + 1));
  $('adjForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const g = A.items[A.idx], { picks, note: rawNote } = readAdj(g), note = rawNote.trim() || null;
    const rows = g.rows.map((r) => ({ contactno: g.id, field: r.field, value: picks[r.field], note }));
    const missing = rows.filter((r) => !r.value);
    g.rows.forEach((r) => $('afs-' + r.field).classList.toggle('missing', !picks[r.field]));
    if (missing.length) {
      $('adjMissing').hidden = false;
      $('adjMissing').textContent = `ยังไม่ได้เลือก ${missing.length} หัวข้อ: ` + missing.map((r) => FIELDS.find((f) => f.key === r.field).label).join(', ');
      msg($('adjMsg'), `ยังไม่ได้เลือก ${missing.length} หัวข้อ`, 'warn');
      return;
    }
    $('adjSave').disabled = true; msg($('adjMsg'), 'กำลังบันทึก…');
    const { error } = await sb.from('adjudications').upsert(rows, { onConflict: 'contactno,field' });
    $('adjSave').disabled = false;
    if (error) { msg($('adjMsg'), 'บันทึกไม่สำเร็จ ตรวจอินเทอร์เน็ตแล้วลองอีกครั้ง ร่างยังอยู่', 'warn'); return; }
    rows.forEach((p) => { const r = g.rows.find((x) => x.field === p.field); r.decided = p.value; r.decided_note = note; });
    store('adjdraft-' + g.id, undefined);
    const next = A.items.findIndex((x, i) => i > A.idx && !adjDone(x));
    const wrap = next >= 0 ? next : A.items.findIndex((x) => !adjDone(x));
    renderAdjNav(false);
    if (wrap >= 0) { adjJump(wrap); msg($('adjMsg'), `บันทึกข้อ ${g.pos} แล้ว ไปข้อ ${A.items[wrap].pos}`, 'ok'); }
    else { renderAdjItem(); renderAdjDone(); msg($('adjMsg'), 'บันทึกแล้ว ตัดสินครบทุกข้อ', 'ok'); window.scrollTo(0, 0); }
  });

  // ---------- boot ----------
  setDefsAll(false, false);
  loadData().then(start).catch(() => { show('login'); msg($('lgMsg'), 'โหลดข้อมูลโครงการไม่ได้ เปิดหน้านี้ใหม่อีกครั้ง', 'warn'); });
})();
