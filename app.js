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

  const S = { items: [], practice: [], codebook: '', user: null, label: '', codes: {}, submitted: false, tab: 'guide', set: 'practice',
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
    const who = await sb.from('coders').select('label').maybeSingle();
    if (who.error || !who.data) {
      const email = session.user.email;
      await sb.auth.signOut();
      show('login');
      msg($('lgMsg'), who.error ? 'เข้าสู่ระบบได้ แต่ตรวจรายชื่อผู้ลงรหัสไม่ได้ ตรวจอินเทอร์เน็ตแล้วลองอีกครั้ง'
        : `เข้าสู่ระบบได้ แต่ ${email} ยังไม่อยู่ในรายชื่อผู้ลงรหัส ติดต่อ Percy`, 'warn');
      return;
    }
    S.label = who.data.label;
    $('acctName').textContent = S.label;
    $('acct').hidden = false; $('tabs').hidden = false;
    const [codes, sub] = await Promise.all([sb.from('codes').select('*'), sb.from('submissions').select('user_id')]);
    S.codes = {};
    (codes.data || []).forEach((r) => { S.codes[r.contactno] = r; });
    S.submitted = !!(sub.data && sub.data.length);
    S.idx.practice = clampIdx(recall('idx-practice'), S.practice.length);
    S.idx.main = clampIdx(recall('idx-main'), S.items.length);
    $('navbox').open = WIDE.matches;
    syncHead();
    renderGuide();
    if (codes.error) { go('guide'); guideWarn('โหลดคำตอบที่บันทึกไว้ไม่ได้ ตรวจอินเทอร์เน็ตแล้วเปิดหน้านี้ใหม่'); return; }
    go(!codedIn(S.practice) && !codedIn(S.items) ? 'guide' : (practiceDone() ? 'main' : 'practice'));
  }
  const clampIdx = (v, n) => (Number.isInteger(v) && v >= 0 && v < n ? v : 0);

  // ---------- steps ----------
  function show(id) {
    ['login', 'guide', 'coding'].forEach((s) => { $(s).hidden = s !== id; });
    $('mobilebar').hidden = id !== 'coding';
  }
  function go(tab) {
    if (tab === 'main' && !practiceDone()) { toast('ชุดจริงยังล็อก ทำแบบฝึกให้ครบ 5 ข้อก่อน'); return; }
    S.tab = tab;
    renderTabs();
    window.scrollTo(0, 0);
    if (tab === 'guide') { renderPeers(); show('guide'); return; }
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
  }

  // ---------- guide ----------
  function guideWarn(text) { const g = $('guideBody'); const p = document.createElement('p'); p.className = 'status warn'; p.textContent = text; g.prepend(p); }
  function renderGuide() {
    const fieldCards = FIELDS.map((f, i) => `<div class="card"><h3>${i + 1}. ${esc(f.label)}</h3><ul>${f.def.map((d) => `<li>${esc(d)}</li>`).join('')}</ul></div>`).join('');
    $('guideBody').innerHTML = `
      <section><h1>คู่มือก่อนเริ่ม</h1>
        <p>สวัสดี${esc(S.label ? ' ' + S.label : '')} งานนี้คือการอ่านโครงการวิจัยที่ สวรส. ให้ทุน แล้วลงรหัส 7 หัวข้อต่อโครงการ อ่านคู่มือราว 10 นาที ทำแบบฝึก 5 ข้อ แล้วจึงลงชุดจริง ${S.items.length} โครงการ ข้อละราว 2–3 นาที รวมราว 4–6 ชั่วโมง บันทึกทีละข้อ หยุดแล้วกลับมาทำต่อจากเครื่องไหนก็ได้</p>
        <div class="peerbox" id="peerbox"></div></section>
      <section class="rule"><h2>กติกาการปกปิดคำตอบ (blinding)</h2><ul>
        <li>คำตอบของคุณอ่านได้เฉพาะบัญชีของคุณ ผู้ลงรหัสอีกคนเห็นแค่ว่าคุณลงไปแล้วกี่ข้อ</li>
        <li>ระบบนี้ไม่มีคำตอบของ AI หรือของการสำรวจก่อนหน้า อย่าเปิดผลการสำรวจเดิมระหว่างลงรหัส</li>
        <li>คุยกับผู้ลงรหัสอีกคนได้เฉพาะเรื่องแบบฝึก 5 ข้อ ชุดจริงห้ามคุยรายข้อจนกว่าทั้งสองคนกดส่งงาน</li>
        <li>ลงรหัสจากข้อความโครงการที่หน้าจอแสดง (ชื่อเรื่อง คำสำคัญ บทคัดย่อ) ซึ่งเป็นข้อความชุดเดียวกับที่ใช้ในการสำรวจ ลิงก์ไปหน้าโครงการอยู่ท้ายบทคัดย่อ ใช้เมื่อบทคัดย่อไม่พอ ถ้าเปิดอ่านรายงานฉบับเต็ม ให้ติ๊ก "เปิดอ่านรายงานฉบับเต็มประกอบข้อนี้"</li>
        <li>ลำดับโครงการสุ่มไว้แล้ว ไม่ได้เรียงตามปีหรือหัวข้อ</li>
      </ul></section>
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
      <section><h2>ขั้นตอน</h2><ol>
        <li>แบบฝึก 5 ข้อ ทำแล้วนัดคุยกับผู้ลงรหัสอีกคนเรื่องข้อที่ตอบต่างกัน แบบฝึกไม่นับในผล</li>
        <li>ชุดจริง ${S.items.length} ข้อ ข้อที่ยังไม่ลง กดเลขข้อในแถบ "ข้อทั้งหมด" เพื่อกลับไป</li>
        <li>ครบแล้วกด "ส่งงาน" เพื่อบอก Percy ว่าคุณลงเสร็จ หลังส่งยังแก้ได้ ระบบเก็บทุกครั้งที่แก้</li>
      </ol></section>
      <section><h2>ทางลัดแป้นพิมพ์</h2><ul>
        <li>Ctrl+Enter (Mac: ⌘+Enter) บันทึก แล้วไปข้อต่อไป</li>
        <li>Alt+← และ Alt+→ (Mac: Option) ข้อก่อนหน้าและข้อถัดไป เมื่อไม่ได้พิมพ์ในช่องข้อความ</li>
        <li>คำตอบที่ยังไม่บันทึกเก็บเป็นร่างในเครื่องนี้ กลับมาที่ข้อเดิมจะเห็นร่างนั้น</li>
      </ul></section>
      <div class="start"><button class="btn btn--primary" type="button" id="startBtn">${practiceDone() ? 'ไปที่ชุดจริง' : 'เริ่มแบบฝึก'}</button><span class="small muted">มีคำถาม ถาม Percy</span></div>
      <details><summary>Codebook ฉบับเต็ม (ภาษาไทย)</summary>
        <p class="cbnote">ฉบับเดียวกับที่ใช้ในการสำรวจเดิม อ่านส่วน "การตัดสินของ Percy 12 พ.ย. 2569" ท้ายเอกสารก่อน ส่วนนั้นแทนข้อความก่อนหน้าที่ขัดกัน เช่น principal–agent ลงไม่ใช่ (ไม่ใช่ก้ำกึ่ง) และรูปแบบบริการใน รพ.รัฐ รพ.สต. หรือเครือข่ายอำเภอลงใช่ตามกฎ 1.1 ช่อง named_theory, contactno และ coder ในตารางไม่ใช้ในชุดนี้</p>
        <div class="cb-scroll"><div class="cb" id="cbFull"></div></div></details>`;
    $('startBtn').addEventListener('click', () => go(practiceDone() ? 'main' : 'practice'));
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
  async function renderPeers() {
    const data = await peers(), box = $('peerbox');
    if (!box || !data) return;
    box.innerHTML = data.map((p) => `<span><b>${esc(p.is_me ? p.label + ' (คุณ)' : p.label)}</b> ชุดจริง ${p.coded}/${S.items.length} แบบฝึก ${Math.min(p.practice_coded, PRACTICE_N)}/${PRACTICE_N}${p.submitted ? ' ส่งงานแล้ว' : ''}</span>`).join('');
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
    const wantsEv = ['yes', 'borderline'].includes(v.critical) || ['yes', 'borderline'].includes(v.rights);
    msg($('evNote'), wantsEv && !v.evidence ? 'หัวข้อ 4 หรือ 5 เป็นใช่หรือก้ำกึ่ง ใส่วลีหลักฐานด้วย' : '', wantsEv && !v.evidence ? 'warn' : '');
    $('ruleBtns').hidden = v.state !== 'yes';
    $('save').textContent = S.noEvidenceOk[cur() && cur().id] === 'ask' ? 'บันทึกโดยไม่มีหลักฐาน' : 'บันทึก แล้วไปข้อต่อไป';
  }
  $('form').addEventListener('input', onEdit);
  $('form').addEventListener('change', onEdit);
  function onEdit(e) {
    const fs = e.target.closest && e.target.closest('fieldset');
    if (fs && fs.classList.contains('missing') && document.querySelector(`input[name="${fs.id.slice(3)}"]:checked`)) {
      fs.classList.remove('missing'); fs.querySelectorAll('input').forEach((r) => r.removeAttribute('aria-invalid'));
      updateMissingTop();
    }
    const it = cur(); if (!it) return;
    if (S.noEvidenceOk[it.id] === 'ask') delete S.noEvidenceOk[it.id];
    if (dirty()) {
      setDraft(it.id, readForm());
      msg($('saved'), S.submitted && S.set === 'main' ? 'แก้หลังส่งงาน ยังไม่บันทึก (ระบบเก็บทุกครั้งที่แก้)' : 'แก้แล้ว ยังไม่บันทึก ร่างเก็บไว้ในเครื่องนี้', 'warn');
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
    $('formTitle').textContent = S.set === 'practice' ? 'คำตอบแบบฝึก (ไม่นับในผล)' : 'คำตอบของคุณ';
    const draft = getDraft(it.id), stored = S.codes[it.id];
    const useDraft = draft && !same(draft, stored);
    fillForm(useDraft ? draft : stored);
    if (draft && !useDraft) setDraft(it.id, null);
    if (S.flash) { msg($('saved'), S.flash, 'ok'); S.flash = ''; }
    else if (useDraft) msg($('saved'), 'คืนร่างที่ยังไม่บันทึกจากครั้งก่อน กดบันทึกเพื่อเก็บ', 'warn');
    else msg($('saved'), isCoded(stored) ? 'บันทึกแล้ว' : '', 'ok');
    setDefsAll(!!recall('defs-all'), false);
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
  $('toRead').addEventListener('click', () => {
    if (S.readY != null && Math.abs(window.scrollY - S.readY) > 4) window.scrollTo(0, S.readY);
    else $('reader').scrollIntoView({ block: 'start' });
  });
  $('toForm').addEventListener('click', () => { const f = $('form').getBoundingClientRect().top; if (f > 120) S.readY = window.scrollY; $('form').scrollIntoView({ block: 'start' }); });
  window.addEventListener('beforeunload', (e) => { if (dirty()) { e.preventDefault(); e.returnValue = ''; } });
  document.addEventListener('keydown', (e) => {
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
    S.saving = true; $('save').disabled = true; msg($('saved'), 'กำลังบันทึก…');
    const row = { user_id: S.user.id, contactno: it.id, practice: S.set === 'practice', position: i + 1, ...v };
    const { error } = await sb.from('codes').upsert(row, { onConflict: 'user_id,contactno' });
    S.saving = false; $('save').disabled = false;
    if (error) {
      const auth = error.status === 401 || error.code === 'PGRST301' || /jwt|token|auth/i.test(error.message || '');
      if (auth) { $('relogin').hidden = false; $('relogin').scrollIntoView({ block: 'center' }); $('rlPass').focus(); msg($('saved'), 'หมดเวลาเข้าสู่ระบบ เข้าสู่ระบบอีกครั้งด้านล่าง คำตอบยังอยู่', 'warn'); }
      else msg($('saved'), 'บันทึกไม่สำเร็จ ตรวจอินเทอร์เน็ตแล้วกดบันทึกอีกครั้ง คำตอบในฟอร์มยังอยู่', 'warn');
      return;
    }
    S.codes[it.id] = row;
    delete S.noEvidenceOk[it.id];
    setDraft(it.id, null);
    after(i, true);
  });
  function after(i, saved) {
    const j = nextTodoIndex(i), arr = list();
    const head = saved ? `บันทึก${S.set === 'practice' ? 'แบบฝึก' : 'ข้อ'} ${i + 1} แล้ว` : `ข้อ ${i + 1} ไม่มีการแก้`;
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
    if (S.set === 'practice') {
      status(practiceDone()
        ? 'แบบฝึกครบแล้ว ก่อนเริ่มชุดจริง นัดคุยกับผู้ลงรหัสอีกคนเรื่องข้อที่ตอบต่างกัน'
        : 'แบบฝึก 5 ข้อ ไม่นับในผล ลงครบแล้วชุดจริงจะเปิด');
    } else {
      status(S.submitted ? 'คุณส่งงานแล้ว ยังแก้ได้ ระบบเก็บทุกครั้งที่แก้แยกไว้' : 'ชุดจริง คำตอบของคุณอ่านได้เฉพาะบัญชีของคุณ อย่าคุยรายข้อกับผู้ลงรหัสอีกคนจนกว่าทั้งสองคนส่งงาน');
    }
  }
  async function renderPanel() {
    const box = $('donePanel');
    if (S.set === 'practice') {
      if (!practiceDone()) { box.hidden = true; return; }
      const rows = S.practice.map((it, i) => { const c = S.codes[it.id] || {}; return `<tr><td>${i + 1}</td><td class="mono">${esc(it.id)}</td>${FIELDS.map((f) => `<td>${esc(LABEL[f.key + ':' + c[f.key]] || '')}</td>`).join('')}<td>${esc(c.evidence || '')}</td><td>${esc(c.note || '')}</td></tr>`; }).join('');
      const firstView = !recall('practice-panel-seen');
      box.innerHTML = `<h2>แบบฝึกครบ 5 ข้อแล้ว</h2>
        <details${firstView ? ' open' : ''}><summary class="small">ตารางคำตอบแบบฝึกของคุณ ใช้คุยกับผู้ลงรหัสอีกคนเรื่องข้อที่ตอบต่างกัน</summary>
        <div class="scroll"><table><tr><th>ข้อ</th><th>สัญญา</th>${FIELDS.map((f, n) => `<th>${n + 1}. ${esc(f.label)}</th>`).join('')}<th>หลักฐาน</th><th>หมายเหตุ</th></tr>${rows}</table></div></details>
        <div class="row"><label class="check" for="talked"><input type="checkbox" id="talked"${recall('talked') ? ' checked' : ''}> คุยเรื่องแบบฝึกกับผู้ลงรหัสอีกคนแล้ว</label>
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
      ${data ? `<div class="peerbox">${data.map((p) => `<span><b>${esc(p.is_me ? p.label + ' (คุณ)' : p.label)}</b> ${p.coded}/${S.items.length}${p.submitted ? ' ส่งงานแล้ว' : ''}</span>`).join('')}</div>` : ''}
      ${border.length ? `<p class="small">ข้อที่คุณเขียนว่า "เส้นแบ่ง"${S.submitted ? '' : ' ดูอีกครั้งก่อนส่งได้'}: ${border.map(([, i]) => `<button class="btn btn--ghost btn--sm" type="button" data-i="${i}">${i + 1}</button>`).join(' ')}</p>` : ''}
      ${S.submitted ? '<p class="msg ok" id="submittedMsg" tabindex="-1">ส่งงานแล้ว ยังแก้ได้ ระบบเก็บทุกครั้งที่แก้แยกไว้</p>'
        : (S.confirmSubmit ? '<div class="row"><span>ส่งงานแล้วจะบอก Percy ว่าคุณลงเสร็จ ยืนยันไหม</span><button class="btn btn--primary" type="button" id="submitYes">ยืนยันส่งงาน</button><button class="btn btn--ghost" type="button" id="submitNo">ยกเลิก</button></div>'
          : '<div class="row"><button class="btn btn--primary" type="button" id="submitBtn">ส่งงาน</button></div>')}
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
    S.submitted = true; S.confirmSubmit = false; await renderPanel(); renderSetStatus(); if ($('submittedMsg')) $('submittedMsg').focus();
  }

  // ---------- boot ----------
  setDefsAll(false, false);
  loadData().then(start).catch(() => { show('login'); msg($('lgMsg'), 'โหลดข้อมูลโครงการไม่ได้ เปิดหน้านี้ใหม่อีกครั้ง', 'warn'); });
})();
