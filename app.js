// HSRI blind coding: two human coders classify sampled HSRI-funded projects, blind to the model codes and to each other.
// Project texts come from data/ (public abstracts). Answers go to Supabase; row-level security keeps each coder's rows
// private to that coder. The page shows other coders' progress as counts only.
(() => {
  'use strict';
  const CFG = window.HSRI_CODING_CONFIG;
  const sb = window.supabase.createClient(CFG.url, CFG.anonKey, { auth: { persistSession: true, autoRefreshToken: true, storageKey: 'hsri-coding-auth' } });
  const $ = (id) => document.getElementById(id);
  const PRACTICE_N = 5;

  // The five model variables (same codebook as the AI coders) and the two four-cell axes (humans only).
  const FIELDS = [
    { key: 'domain', label: 'ประเภทงาน', code: 'research_domain', opts: [['health_systems_public_health', 'ระบบสุขภาพและสาธารณสุข'], ['biomedical', 'ชีวการแพทย์'], ['unclear', 'ไม่ชัด']],
      def: ['ระบบสุขภาพและสาธารณสุข: นโยบาย ระบบ การจัดบริการ การเงินการคลัง กำลังคน อภิบาล ระบบข้อมูล การประเมินเทคโนโลยีและความคุ้มค่า ระบาดวิทยาและการสำรวจสุขภาพประชากร พฤติกรรม สังคม และชุมชน',
        'ชีวการแพทย์: ห้องปฏิบัติการ พันธุศาสตร์หรือจีโนม การพัฒนายา วัคซีน ชุดตรวจ หรืออุปกรณ์ การทดลองทางคลินิกเพื่อดูประสิทธิผลของการรักษา หรือกลไกทางชีววิทยาของโรค',
        'กรณีผสม ดูคำถามหลัก: ความคุ้มค่า ความเป็นไปได้ หรือการจัดบริการ ลงระบบสุขภาพ ความแม่นของการตรวจหรือกลไกทางชีววิทยา ลงชีวการแพทย์'] },
    { key: 'approach', label: 'แนวทางวิจัย', code: 'approach', opts: [['qual/mixed', 'คุณภาพหรือผสม'], ['quant', 'ปริมาณ'], ['cost', 'ต้นทุน'], ['review', 'ทบทวน'], ['unclear', 'ไม่ชัด']],
      def: ['ลำดับก่อนหลัง: ทบทวน > ต้นทุน > คุณภาพหรือผสม > ปริมาณ',
        'คุณภาพหรือผสม: มีวิธีเชิงคุณภาพ รวม PAR และ action research',
        'ต้นทุน: ต้นทุนหรือความคุ้มค่า รวม SROI, willingness to pay และ benefit–cost',
        'ทบทวน: ทบทวนวรรณกรรมหรือเอกสารอย่างเดียว',
        'งานห้องปฏิบัติการและการทดลองทางคลินิกลงปริมาณ งานพัฒนาซอฟต์แวร์หรือฐานข้อมูลที่ไม่มีการวิเคราะห์ข้อมูลลงไม่ชัด แล้วเขียน "พัฒนาเทคโนโลยี" ในหมายเหตุ'] },
    { key: 'state', label: 'ประเมินหรือพัฒนาโครงการรัฐ', code: 'evaluates_or_develops_state_programme', opts: [['yes', 'ใช่'], ['no', 'ไม่ใช่']],
      def: ['ใช่: หัวข้อหลักคือการประเมิน การนำไปปฏิบัติ หรือการพัฒนารูปแบบของนโยบาย กฎหมาย กองทุน อัตราจ่าย โครงการ หรือบริการสาธารณะของรัฐที่ระบุได้ รวมการศึกษาที่เขียนเพื่อออกแบบนโยบายหรือชุดสิทธิประโยชน์',
        'กฎ 1.1: รูปแบบบริการที่พัฒนาหรือทดลองใน รพ.รัฐ รพ.สต. หรือเครือข่ายอำเภอ ลงใช่',
        'กฎ 1.2: งานที่ป้อนนโยบายระดับประเทศแต่ไม่ได้ประเมินโครงการใดโครงการหนึ่ง (ภาพรวมระบบ ฉากทัศน์ ทบทวนหลักฐานเพื่อออกแบบนโยบาย ผลของมาตรการรัฐ เครื่องมือให้หน่วยกำกับ) ลงใช่',
        'ความคุ้มค่าเพื่อพิจารณาชุดสิทธิประโยชน์ บัญชียาหลัก หรือการตัดสินใจของกองทุนรัฐ ลงใช่',
        'ไม่ใช่: งานห้องปฏิบัติการ การทดลองทางคลินิกที่ไม่ผูกกับบริการของรัฐ และงานพรรณนาโรคหรือพฤติกรรมที่ไม่ได้ป้อนนโยบายหรือบริการที่ระบุได้'] },
    { key: 'critical', label: 'ทฤษฎีวิพากษ์เป็นกรอบ', code: 'critical_theory', opts: [['yes', 'ใช่'], ['borderline', 'ก้ำกึ่ง'], ['no', 'ไม่ใช่']],
      def: ['ใช่: ใช้ทฤษฎีสังคมเชิงวิพากษ์หรือเศรษฐศาสตร์การเมืองเป็นกรอบ เช่น Marxist political economy, Gramsci, Foucault, Bourdieu, feminist หรือ postcolonial theory, Polanyi, decommodification, critical discourse analysis',
        'ก้ำกึ่ง: กรอบว่าด้วยอำนาจหรือผลประโยชน์แต่เป็นทฤษฎีกระแสหลัก (corporate political activity, commercial determinants of health) หรือเอ่ยเศรษฐศาสตร์การเมืองเป็นเลนส์ตีความโดยไม่ใช้เป็นกรอบ หรือใช้วิธีที่มีรากวิพากษ์ (emancipatory action research) โดยไม่วิเคราะห์อำนาจหรือโครงสร้างสังคม',
        'principal–agent theory ลงไม่ใช่'] },
    { key: 'rights', label: 'กรอบสิทธิหรือความไม่เป็นธรรมเชิงโครงสร้าง', code: 'rights_or_structural_inequity', opts: [['yes', 'ใช่'], ['borderline', 'ก้ำกึ่ง'], ['no', 'ไม่ใช่']],
      def: ['ใช่: ตั้งคำถามหรือวางกรอบว่าสุขภาพหรือบริการเป็นสิทธิที่ผู้คนพึงได้ (สิทธิมนุษยชน สิทธิตามรัฐธรรมนูญ การถูกกีดกันจากสิทธิ เช่น คนไร้สถานะ) หรือใช้ความเหลื่อมล้ำที่เกิดจากโครงสร้างสังคม เศรษฐกิจ การเมือง หรือสถาบันเป็นกรอบอธิบาย',
        'ก้ำกึ่ง: กรอบสิทธิหรือเชิงโครงสร้างอยู่แค่ในพื้นหลังหรือข้อสรุป แต่ตัวการวิเคราะห์เป็นการพรรณนาช่องว่าง',
        'ไม่ใช่: รายงานช่องว่างระหว่างกลุ่มเฉย ๆ หรือใช้คำว่าสิทธิในความหมายทางบริหารของกองทุน (สิทธิบัตรทอง ชุดสิทธิประโยชน์ ผู้มีสิทธิ)',
        'ตั้งกรอบด้วยสิทธิตามรัฐธรรมนูญแล้ววิเคราะห์ความเหลื่อมล้ำระหว่างกองทุน: ใช่ รายงานผลต่างระหว่างกองทุนแล้วเอ่ยว่าระบบแยกส่วนทำให้เหลื่อมล้ำ: ไม่ใช่ สิทธิคนพิการอยู่แค่ในพื้นหลังหรือข้อเสนอ: ก้ำกึ่ง'] },
    { key: 'purpose', label: 'น้ำหนักหลักของงาน', code: 'กรอบสี่ช่อง แกนที่ 1', opts: [['diagnosis', 'วิเคราะห์ปัญหา'], ['prescription', 'สังเคราะห์ข้อเสนอ'], ['unclear', 'ไม่ชัด']],
      def: ['วิเคราะห์ปัญหา: อธิบายว่าเกิดอะไรขึ้นและเพราะอะไร รวมการประเมินผล การสำรวจสถานการณ์ และการวิเคราะห์สาเหตุ',
        'สังเคราะห์ข้อเสนอ: เสนอว่าควรทำอะไรและด้วยเครื่องมือใด รวมการพัฒนารูปแบบบริการ ระบบ เครื่องมือ มาตรการ หรือข้อเสนอเชิงนโยบายที่เป็นผลหลักของงาน',
        'มีทั้งสองส่วน ให้เลือกส่วนที่เป็นวัตถุประสงค์หลักหรือผลหลัก งานประเมินที่ปิดด้วยข้อเสนอแนะทั่วไปลงวิเคราะห์ปัญหา'] },
    { key: 'rules', label: 'กติกาของระบบ', code: 'กรอบสี่ช่อง แกนที่ 2', opts: [['within', 'ภายในกติกาเดิม'], ['structural', 'เปลี่ยนแปลงโครงสร้าง'], ['unclear', 'ไม่ชัด']],
      def: ['ภายในกติกาเดิม: รับกติกาและการจัดการที่มีอยู่เป็นเงื่อนไข เช่น วิธีจ่ายเงินของกองทุน กรอบตำแหน่งและระบบการจ้าง การแบ่งความรับผิดชอบระหว่างหน่วยงาน โครงสร้างอภิบาล แล้วศึกษาหรือปรับปรุงงานภายใต้เงื่อนไขนั้น',
        'เปลี่ยนแปลงโครงสร้าง (radical ในความหมายว่าถึงราก): ถามว่าสิ่งที่งานอื่นรับไว้เป็นเงื่อนไขเกิดจากกติกาใด ใครได้ใครเสีย และเปลี่ยนได้อย่างไร หรือเสนอให้เปลี่ยนกติกาเหล่านั้นเอง เช่น แก้กฎหมาย เปลี่ยนวิธีจ่ายเงินหรือระบบการจ้าง เปลี่ยนโครงสร้างอำนาจในการตัดสินใจ',
        'ไม่จำเป็นต้องใช้ทฤษฎีวิพากษ์ และการเอ่ยคำว่าโครงสร้างหรือความเหลื่อมล้ำอย่างเดียวยังไม่พอ ต้องเห็นว่ากติกาเป็นสิ่งที่งานศึกษาหรือเสนอให้เปลี่ยน'] },
  ];
  const KEYS = FIELDS.map((f) => f.key);

  const S = { items: [], practice: [], codebook: '', user: null, label: '', codes: {}, submitted: false, tab: 'guide', set: 'practice', idx: { practice: 0, main: 0 }, saving: false };
  const list = () => (S.set === 'practice' ? S.practice : S.items);
  const isCoded = (c) => !!c && KEYS.every((k) => c[k]);
  const codedIn = (arr) => arr.filter((it) => isCoded(S.codes[it.id])).length;
  const practiceDone = () => codedIn(S.practice) >= PRACTICE_N;

  function esc(s) { return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
  function msg(el, text, kind) { el.textContent = text || ''; el.className = 'msg' + (kind ? ' ' + kind : ''); }
  function store(k, v) { try { localStorage.setItem('hsri-coding-' + k, JSON.stringify(v)); } catch (e) { /* private window */ } }
  function recall(k) { try { return JSON.parse(localStorage.getItem('hsri-coding-' + k)); } catch (e) { return null; } }

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
    if (error) { msg($('lgMsg'), 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง ลองอีกครั้ง หรือขอรหัสใหม่จาก Percy', 'warn'); return; }
    $('lgPass').value = '';
    await start();
  });
  $('logoutBtn').addEventListener('click', async () => { await sb.auth.signOut(); location.reload(); });

  async function start() {
    const { data } = await sb.auth.getSession();
    const session = data && data.session;
    if (!session) { show('login'); return; }
    S.user = session.user;
    const who = await sb.from('coders').select('label').maybeSingle();
    if (who.error || !who.data) {
      await sb.auth.signOut();
      show('login');
      msg($('lgMsg'), 'บัญชีนี้ยังไม่ได้เปิดสิทธิ์จัดประเภท ติดต่อ Percy', 'warn');
      return;
    }
    S.label = who.data.label;
    $('acctName').textContent = S.label;
    $('acct').hidden = false; $('tabs').hidden = false;
    const [codes, sub] = await Promise.all([sb.from('codes').select('*'), sb.from('submissions').select('user_id')]);
    if (codes.error) { status('โหลดคำตอบที่บันทึกไว้ไม่ได้ ตรวจอินเทอร์เน็ตแล้วเปิดหน้านี้ใหม่', true); }
    S.codes = {};
    (codes.data || []).forEach((r) => { S.codes[r.contactno] = r; });
    S.submitted = !!(sub.data && sub.data.length);
    S.idx.practice = clampIdx(recall('idx-practice'), S.practice.length);
    S.idx.main = clampIdx(recall('idx-main'), S.items.length);
    renderGuide();
    const first = !codedIn(S.practice) && !codedIn(S.items);
    go(first ? 'guide' : (practiceDone() ? 'main' : 'practice'));
    refreshProgress();
  }
  const clampIdx = (v, n) => (Number.isInteger(v) && v >= 0 && v < n ? v : 0);

  // ---------- tabs ----------
  function show(id) { ['login', 'guide', 'coding'].forEach((s) => { $(s).hidden = s !== id; }); }
  function go(tab) {
    if (tab === 'main' && !practiceDone()) tab = 'practice';
    S.tab = tab;
    document.querySelectorAll('.tab').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === tab)));
    $('tab-main').title = practiceDone() ? '' : 'ทำแบบฝึกให้ครบ 5 ข้อก่อน';
    updateTabCounts();
    if (tab === 'guide') { show('guide'); window.scrollTo(0, 0); return; }
    S.set = tab;
    $('coding').setAttribute('aria-labelledby', 'tab-' + tab);
    show('coding');
    renderNav(true); renderItem(); renderSetStatus();
  }
  document.querySelectorAll('.tab').forEach((b) => b.addEventListener('click', () => go(b.dataset.tab)));
  function updateTabCounts() {
    $('tabPracticeN').textContent = `${codedIn(S.practice)}/${S.practice.length}`;
    $('tabMainN').textContent = `${codedIn(S.items)}/${S.items.length}`;
  }

  // ---------- guide ----------
  function renderGuide() {
    const fieldCards = FIELDS.map((f) => `<div class="card"><h3>${esc(f.label)} <small class="muted">${esc(f.code)}</small></h3><ul>${f.def.map((d) => `<li>${esc(d)}</li>`).join('')}</ul></div>`).join('');
    $('guideBody').innerHTML = `
      <section><h1>คู่มือก่อนเริ่ม</h1>
        <p>สวัสดี${esc(S.label ? ' ' + S.label : '')} งานนี้คือการอ่านโครงการวิจัยที่ สวรส. ให้ทุน แล้วจัดประเภทลง 7 ช่อง ใช้เวลาอ่านคู่มือราว 10 นาที ทำแบบฝึก 5 ข้อ แล้วจึงจัดชุดจริง ${S.items.length} โครงการ ข้อละราว 2–3 นาที รวมราว 4–6 ชั่วโมง บันทึกทีละข้อ หยุดแล้วกลับมาทำต่อจากเครื่องไหนก็ได้</p></section>
      <section class="rule"><h2>กติกาการปิดตา</h2><ul>
        <li>คำตอบของคุณอ่านได้เฉพาะบัญชีของคุณ ผู้จัดอีกคนเห็นแค่ว่าคุณจัดไปแล้วกี่ข้อ</li>
        <li>ระบบนี้ไม่มีคำตอบของ AI หรือของการสำรวจก่อนหน้า อย่าเปิดผลการสำรวจเดิมระหว่างจัด</li>
        <li>คุยกับผู้จัดอีกคนได้เฉพาะเรื่องแบบฝึก 5 ข้อ ชุดจริงห้ามคุยรายข้อจนกว่าทั้งสองคนกดส่งงาน</li>
        <li>จัดจากข้อความในกรอบซ้าย (ชื่อเรื่อง คำสำคัญ บทคัดย่อ) ซึ่งเป็นข้อความชุดเดียวกับที่ใช้ในการสำรวจ ลิงก์ไปหน้าโครงการมีไว้เมื่อบทคัดย่อไม่พอ ถ้าเปิดอ่านรายงานฉบับเต็ม ให้ติ๊ก "เปิดอ่านรายงานฉบับเต็มประกอบ"</li>
        <li>ลำดับโครงการสุ่มไว้แล้ว ไม่ได้เรียงตามปีหรือหัวข้อ</li>
      </ul></section>
      <section><h2>โครงการที่มีหลายรายงาน (ชุดโครงการ)</h2><ul>
        <li>จัดทั้งชุดเป็นข้อเดียว</li>
        <li>ทฤษฎีวิพากษ์และกรอบสิทธิ: ใช้ค่าที่สูงสุดในบรรดารายงาน (ใช่ > ก้ำกึ่ง > ไม่ใช่) และบอกในหลักฐานว่ามาจากรายงานที่เท่าไร</li>
        <li>แนวทางวิจัย: ใช้แนวทางของรายงานส่วนใหญ่ ถ้าเสมอกันใช้ลำดับ ทบทวน > ต้นทุน > คุณภาพหรือผสม > ปริมาณ</li>
        <li>ประเมินหรือพัฒนาโครงการรัฐ: ใช่ ถ้ารายงานใดรายงานหนึ่งเป็นใช่</li>
      </ul></section>
      <section><h2>7 ช่องที่ต้องลง</h2><p class="small muted">ระหว่างจัด กด "ดูนิยาม" ใต้ชื่อช่องเพื่อเปิดข้อความเดียวกันนี้ ห้าช่องแรกใช้ codebook ชุดเดียวกับการสำรวจเดิม สองช่องหลังเป็นแกนของกรอบสี่ช่อง</p>${fieldCards}
        <p class="small">สองแกนรวมเป็นสี่ช่อง: ช่องที่ 1 วิเคราะห์ปัญหาภายในกติกาเดิม ช่องที่ 2 วิเคราะห์ปัญหาเชิงโครงสร้าง ช่องที่ 3 ข้อเสนอภายในกติกาเดิม ช่องที่ 4 ข้อเสนอเปลี่ยนแปลงโครงสร้าง</p></section>
      <section><h2>หลักฐานและหมายเหตุ</h2><ul>
        <li>หลักฐาน: วลีไม่เกิน 15 คำจากบทคัดย่อ (ภาษาเดิม) ที่ทำให้คุณลงใช่หรือก้ำกึ่งในช่องทฤษฎีวิพากษ์หรือกรอบสิทธิ</li>
        <li>หมายเหตุ: กรณีก้ำกึ่งเขียน "เส้นแบ่ง" แล้วเหตุผลสั้น ๆ ถ้าลงโครงการรัฐเป็นใช่เพราะกฎ 1.1 หรือ 1.2 ให้เขียนเลขกฎ</li>
      </ul></section>
      <section><h2>ขั้นตอน</h2><ol>
        <li>แบบฝึก 5 ข้อ ทำแล้วนัดคุยกับผู้จัดอีกคนเรื่องข้อที่ตอบต่างกัน แบบฝึกไม่นับในผล</li>
        <li>ชุดจริง ${S.items.length} ข้อ ช่องว่างข้อไหนกดเลขข้อด้านบนเพื่อกลับไปได้</li>
        <li>ครบแล้วกด "ส่งงาน" เพื่อบอก Percy ว่าคุณจัดเสร็จ หลังส่งยังแก้ได้ ระบบเก็บทุกครั้งที่แก้</li>
      </ol></section>
      <div class="start"><button class="btn btn--primary" type="button" id="startBtn">${practiceDone() ? 'ไปที่ชุดจริง' : 'เริ่มแบบฝึก'}</button><span class="small muted">ถามได้ที่ Percy</span></div>
      <details><summary>Codebook ฉบับเต็ม (ภาษาไทย)</summary><div class="cb-scroll"><div class="cb" id="cbFull"></div></div></details>`;
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

  // ---------- form ----------
  $('fields').innerHTML = FIELDS.map((f) => `
    <fieldset id="fs-${f.key}">
      <legend>${esc(f.label)} <small>${esc(f.code)}</small></legend>
      <div class="opts">${f.opts.map(([v, l]) => { const id = `o-${f.key}-${v.replace(/[^a-z]/g, '')}`; return `<label class="opt" for="${id}"><input type="radio" name="${f.key}" id="${id}" value="${v}"><span>${esc(l)}<em>${esc(v)}</em></span></label>`; }).join('')}</div>
      <details class="def"><summary>ดูนิยาม</summary><ul>${f.def.map((d) => `<li>${esc(d)}</li>`).join('')}</ul></details>
    </fieldset>`).join('');

  function readForm() {
    const o = {};
    KEYS.forEach((k) => { const r = document.querySelector(`input[name="${k}"]:checked`); o[k] = r ? r.value : null; });
    o.evidence = $('evidence').value.trim() || null;
    o.note = $('note').value.trim() || null;
    o.opened_fulltext = $('opened').checked;
    return o;
  }
  function fillForm(c) {
    KEYS.forEach((k) => document.querySelectorAll(`input[name="${k}"]`).forEach((r) => { r.checked = !!c && c[k] === r.value; }));
    $('evidence').value = (c && c.evidence) || '';
    $('note').value = (c && c.note) || '';
    $('opened').checked = !!(c && c.opened_fulltext);
    document.querySelectorAll('fieldset.missing').forEach((f) => f.classList.remove('missing'));
  }
  const sameAs = (a, b) => !!b && KEYS.every((k) => a[k] === b[k]) && (a.evidence || null) === (b.evidence || null) && (a.note || null) === (b.note || null) && !!a.opened_fulltext === !!b.opened_fulltext;

  // ---------- reader ----------
  function renderText(t) {
    return t.split('\n').map((line) => {
      const m = line.match(/^(\s*)- ([^:]{1,40}): (.*)$/);
      if (!m) return line.trim() ? `<p class="ln">${esc(line.trim())}</p>` : '';
      return `<p class="ln${m[1].length ? ' ln--sub' : ''}"><span class="lbl">${esc(m[2])}</span>${esc(m[3])}</p>`;
    }).join('');
  }
  function renderItem() {
    const arr = list(), i = S.idx[S.set], it = arr[i];
    if (!it) return;
    $('cid').textContent = it.id;
    $('pos').textContent = `${S.set === 'practice' ? 'แบบฝึก' : 'ข้อ'} ${i + 1} จาก ${arr.length}`;
    $('text').innerHTML = renderText(it.text);
    $('srcLink').href = it.url;
    $('formTitle').textContent = S.set === 'practice' ? 'คำตอบแบบฝึก (ไม่นับในผล)' : 'คำตอบของคุณ';
    fillForm(S.codes[it.id]);
    msg($('saved'), isCoded(S.codes[it.id]) ? 'บันทึกแล้ว' : '', isCoded(S.codes[it.id]) ? 'ok' : '');
    $('prev').disabled = i === 0; $('next').disabled = i === arr.length - 1;
    store('idx-' + S.set, i);
    renderFinish();
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
    arr.forEach((it, i) => {
      const b = nav.children[i], done = isCoded(S.codes[it.id]);
      b.classList.toggle('done', done); b.classList.toggle('cur', i === S.idx[S.set]);
      b.setAttribute('aria-label', `ข้อ ${i + 1}${done ? ' จัดแล้ว' : ' ยังไม่จัด'}`);
      if (i === S.idx[S.set]) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current');
    });
    $('bar').style.width = (100 * codedIn(arr) / arr.length) + '%';
    updateTabCounts();
  }
  function jump(i) {
    const arr = list();
    S.idx[S.set] = Math.max(0, Math.min(arr.length - 1, i));
    renderItem(); renderNav(false);
    $('reader').scrollIntoView({ block: 'start' });
  }
  // After a save, go to the next item not yet coded (wrapping round); when all are coded, step forward.
  function nextIndex() {
    const arr = list(), i = S.idx[S.set];
    for (let k = 1; k <= arr.length; k++) { const j = (i + k) % arr.length; if (!isCoded(S.codes[arr[j].id])) return j; }
    return Math.min(i + 1, arr.length - 1);
  }
  $('prev').addEventListener('click', () => jump(S.idx[S.set] - 1));
  $('next').addEventListener('click', () => {
    const arr = list(), i = S.idx[S.set];
    if ($('onlyTodo').checked) { for (let k = 1; k < arr.length; k++) { const j = i + k; if (j < arr.length && !isCoded(S.codes[arr[j].id])) { jump(j); return; } } }
    jump(i + 1);
  });

  // ---------- save ----------
  $('form').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (S.saving) return;
    const arr = list(), i = S.idx[S.set], it = arr[i], v = readForm();
    const missing = FIELDS.filter((f) => !v[f.key]);
    document.querySelectorAll('fieldset').forEach((fs) => fs.classList.toggle('missing', missing.some((f) => fs.id === 'fs-' + f.key)));
    if (missing.length) { msg($('saved'), 'ยังไม่ได้เลือก: ' + missing.map((f) => f.label).join(', '), 'warn'); $('fs-' + missing[0].key).scrollIntoView({ block: 'nearest' }); return; }
    if (sameAs(v, S.codes[it.id])) { jump(nextIndex()); return; }
    S.saving = true; $('save').disabled = true; msg($('saved'), 'กำลังบันทึก…');
    const row = { user_id: S.user.id, contactno: it.id, practice: S.set === 'practice', position: i + 1, ...v };
    const { error } = await sb.from('codes').upsert(row, { onConflict: 'user_id,contactno' });
    S.saving = false; $('save').disabled = false;
    if (error) { msg($('saved'), 'บันทึกไม่สำเร็จ ตรวจอินเทอร์เน็ตแล้วกดบันทึกอีกครั้ง คำตอบในฟอร์มยังอยู่', 'warn'); return; }
    S.codes[it.id] = row;
    refreshProgress();
    if (S.set === 'practice' && practiceDone() && codedIn(S.practice) === S.practice.length) { renderNav(false); renderItem(); renderSetStatus(); msg($('saved'), 'บันทึกแล้ว แบบฝึกครบ 5 ข้อ', 'ok'); return; }
    jump(nextIndex());
  });

  // ---------- status, progress, submission ----------
  function status(text, warn) { $('setStatus').textContent = text; $('setStatus').className = 'status' + (warn ? ' warn' : ''); }
  function renderSetStatus() {
    if (S.set === 'practice') {
      status(practiceDone()
        ? 'แบบฝึกครบแล้ว นัดคุยกับผู้จัดอีกคนเรื่องข้อที่ตอบต่างกัน แล้วกดแท็บ "3. จัดประเภท" เพื่อเริ่มชุดจริง'
        : 'แบบฝึก 5 ข้อ ไม่นับในผล ทำครบแล้วคุยกับผู้จัดอีกคนได้ จากนั้นชุดจริงจะเปิด');
    } else {
      status(S.submitted ? 'คุณส่งงานแล้ว ยังแก้คำตอบได้ ระบบเก็บทุกครั้งที่แก้' : 'ชุดจริง คำตอบของคุณอ่านได้เฉพาะบัญชีของคุณ อย่าคุยรายข้อกับผู้จัดอีกคนจนกว่าทั้งสองคนส่งงาน');
    }
  }
  function renderFinish() {
    const box = $('finishBox');
    if (S.set !== 'main') { box.hidden = true; return; }
    const left = S.items.length - codedIn(S.items);
    box.hidden = false;
    $('finishText').textContent = S.submitted ? 'ส่งงานแล้ว' : (left ? `เหลืออีก ${left} ข้อ ครบแล้วกดส่งงาน` : 'ครบทุกข้อแล้ว กดส่งงานเพื่อบอก Percy ว่าคุณจัดเสร็จ');
    $('finish').disabled = !!left || S.submitted;
  }
  $('finish').addEventListener('click', async () => {
    if (S.submitted || codedIn(S.items) < S.items.length) return;
    const { error } = await sb.from('submissions').insert({ user_id: S.user.id });
    if (error) { msg($('finishMsg'), 'ส่งไม่สำเร็จ ลองอีกครั้ง', 'warn'); return; }
    S.submitted = true; msg($('finishMsg'), 'ส่งงานแล้ว ขอบคุณครับ', 'ok'); renderFinish(); renderSetStatus(); refreshProgress();
  });
  async function refreshProgress() {
    const { data, error } = await sb.rpc('coding_progress');
    const box = $('peers');
    if (error || !data) { box.textContent = ''; return; }
    box.innerHTML = data.map((p) => `<span><b>${esc(p.is_me ? p.label + ' (คุณ)' : p.label)}</b> <span class="mono">ชุดจริง ${p.coded}/${S.items.length}</span> <span class="mono muted">แบบฝึก ${Math.min(p.practice_coded, PRACTICE_N)}/${PRACTICE_N}</span>${p.submitted ? ' ส่งงานแล้ว' : ''}</span>`).join('');
  }

  // ---------- boot ----------
  loadData().then(start).catch(() => { show('login'); msg($('lgMsg'), 'โหลดข้อมูลโครงการไม่ได้ เปิดหน้านี้ใหม่อีกครั้ง', 'warn'); });
})();
