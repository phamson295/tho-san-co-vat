/* Điều khiển giao diện: menu, bản đồ thế giới, vùng, bảo tàng, hồ sơ cổ vật, cài đặt. */
window.G = window.G || {};

G.UI = (() => {
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const md = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/(^|\s)_(.+?)_(?=\s|$)/g, '$1<i>$2</i>').replace(/\n/g, '<br>');
  const stars = (r) => '★'.repeat(G.RARITY[r].stars) + '<i>' + '★'.repeat(4 - G.RARITY[r].stars) + '</i>';
  let viewer = null;
  let current = 'menu';
  let backToList = () => openMap(); // nút quay lại của màn hồ sơ

  // ---------- điều hướng ----------
  function show(name) {
    if (viewer && name !== current) { viewer.dispose(); viewer = null; }
    if (current === 'expedition' && name !== 'expedition') G.Expedition.stop();
    document.querySelectorAll('.screen').forEach((s) => s.classList.toggle('active', s.id === 'screen-' + name));
    current = name;
    document.body.dataset.screen = name;
    window.scrollTo(0, 0);
  }

  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('on');
    clearTimeout(t._h);
    t._h = setTimeout(() => t.classList.remove('on'), 2800);
  }

  function modal(html, cls = '') {
    const root = document.createElement('div');
    root.className = 'modal-backdrop';
    root.innerHTML = `<div class="modal ${cls}" role="dialog">${html}</div>`;
    $('#modal-root').appendChild(root);
    const close = () => { root.classList.add('closing'); setTimeout(() => root.remove(), 180); };
    root.addEventListener('click', (e) => { if (e.target === root) close(); });
    root.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', close));
    return { root, close };
  }

  function aiLabel() {
    const m = G.AI.mode();
    if (m === 'sample') return 'AI Claude: qua tài khoản claude.ai của bạn';
    if (m === 'key') return 'AI Claude: đã kết nối bằng khóa API';
    return 'AI Claude: ngoại tuyến';
  }

  // ---------- menu ----------
  function renderMenu() {
    const s = G.Store.state;
    $('#menu-rank').innerHTML = `${esc(G.Store.rank().name)} · ${s.rep} uy tín · ${G.Store.foundCount()}/${G.ARTIFACTS.length} cổ vật`;
    $('#menu-ai').textContent = aiLabel() + (G.Store.cloudOn ? ' · Tiến trình đồng bộ trên claude.ai' : '');
    show('menu');
  }

  // ---------- bản đồ ----------
  const LAND = [
    [[-168, 66], [-160, 71], [-140, 70], [-120, 72], [-95, 72], [-80, 68], [-62, 60], [-55, 52], [-66, 45], [-70, 42], [-76, 35], [-81, 31], [-80, 25], [-82, 29], [-90, 30], [-97, 27], [-97, 21], [-90, 21], [-87, 15], [-83, 9], [-79, 8], [-86, 12], [-92, 15], [-105, 20], [-112, 29], [-117, 32], [-124, 40], [-124, 48], [-135, 58], [-150, 60], [-165, 60]],
    [[-79, 8], [-72, 12], [-62, 10], [-50, 0], [-35, -6], [-39, -15], [-48, -26], [-58, -35], [-65, -42], [-68, -52], [-73, -50], [-75, -40], [-71, -30], [-70, -18], [-76, -12], [-81, -5], [-80, 1]],
    [[-9, 37], [-9, 43], [-2, 44], [-4, 48], [2, 51], [8, 54], [10, 58], [5, 62], [15, 69], [28, 71], [40, 67], [45, 60], [50, 50], [40, 45], [30, 46], [28, 41], [23, 40], [22, 37], [19, 42], [13, 45], [16, 40], [10, 44], [3, 43], [-1, 37]],
    [[-17, 21], [-10, 30], [-5, 36], [10, 37], [20, 32], [32, 31], [35, 28], [43, 12], [51, 12], [40, -5], [40, -15], [35, -25], [20, -35], [17, -28], [12, -15], [9, 0], [5, 5], [-8, 4], [-17, 14]],
    [[28, 41], [36, 36], [35, 32], [43, 13], [52, 16], [57, 24], [50, 30], [57, 26], [67, 25], [72, 20], [77, 8], [80, 15], [88, 22], [92, 21], [98, 16], [98, 8], [103, 1], [104, 10], [109, 12], [108, 21], [117, 24], [122, 30], [121, 40], [127, 39], [130, 43], [140, 48], [142, 55], [155, 59], [163, 61], [180, 67], [180, 71], [140, 73], [110, 77], [80, 73], [68, 70], [60, 69], [45, 68], [40, 67], [45, 60], [50, 50], [40, 45], [30, 46]],
    [[114, -22], [122, -18], [131, -12], [137, -12], [142, -11], [146, -19], [153, -26], [150, -37], [141, -38], [135, -34], [129, -31], [115, -34]],
    [[-5, 50], [1, 51], [-2, 55], [-5, 58], [-6, 54]], // Anh
    [[130, 31], [135, 34], [140, 36], [141, 41], [140, 38], [136, 36], [131, 34]], // Nhật
    [[95, 5], [105, -6], [115, -8], [120, -9], [110, -7], [104, -3], [98, 2]], // Indonesia
    [[44, -16], [50, -15], [48, -25], [44, -24]], // Madagascar
  ];
  // Vị trí nhãn quanh ghim để các vùng gần nhau không đè chữ lên nhau.
  const LAB = {
    bottom: ['y="28"', 'y="42"'],
    top: ['y="-30"', 'y="-16"'],
    left: ['x="-16" y="-6" text-anchor="end"', 'x="-16" y="8" text-anchor="end"'],
    right: ['x="16" y="-2" text-anchor="start"', 'x="16" y="12" text-anchor="start"'],
  };
  const proj = (lon, lat) => [((lon + 180) / 360) * 1000, ((80 - lat) / 140) * 500];

  function openMap() {
    const n = G.Store.foundCount();
    const land = LAND.map((poly) => `<path d="M${poly.map(([lo, la]) => proj(lo, la).map((v) => v.toFixed(1)).join(',')).join('L')}Z"/>`).join('');
    const grid = [];
    for (let lo = -150; lo <= 180; lo += 30) { const [gx] = proj(lo, 0); grid.push(`<line x1="${gx}" y1="0" x2="${gx}" y2="500"/>`); }
    for (let la = 60; la >= -60; la -= 30) { const [, gy] = proj(0, la); grid.push(`<line x1="0" y1="${gy}" x2="1000" y2="${gy}"/>`); }
    const pins = G.REGIONS.map((r) => {
      const [px, py] = proj(r.lon, r.lat);
      const open = G.Store.isRegionUnlocked(r);
      const done = G.ARTIFACTS.filter((a) => a.region === r.id && G.Store.isFound(a.id)).length;
      const total = G.ARTIFACTS.filter((a) => a.region === r.id).length;
      return `<g class="pin ${open ? 'open' : 'locked'}" data-region="${r.id}" transform="translate(${px},${py})" tabindex="0" role="button" aria-label="${esc(r.name)}">
        ${open ? '<circle class="pulse" r="14"/>' : ''}
        <circle class="dot" r="9" style="fill:${open ? r.color : '#6b625a'}"/>
        <text class="pin-icon" y="4">${open ? (done === total ? '✓' : '') : '🔒'}</text>
        <text class="pin-label" ${LAB[r.lab || 'bottom'][0]}>${esc(r.name)}</text>
        <text class="pin-sub" ${LAB[r.lab || 'bottom'][1]}>${open ? `${done}/${total}` : `cần ${r.unlock} cổ vật`}</text>
      </g>`;
    }).join('');
    $('#map-svg').innerHTML = `<g class="grid">${grid.join('')}</g><g class="land">${land}</g>${pins}`;
    $('#map-progress').innerHTML = `Đã sưu tầm <b>${n}/${G.ARTIFACTS.length}</b> cổ vật · ${esc(G.Store.rank().name)}`;
    $('#map-svg').querySelectorAll('.pin').forEach((p) => {
      const go = () => {
        const r = G.regionById(p.dataset.region);
        if (!G.Store.isRegionUnlocked(r)) { G.Sound.fail(); return toast(`Tìm thêm ${r.unlock - n} cổ vật nữa để mở ${r.name}.`); }
        G.Sound.click(); openRegion(r.id);
      };
      p.addEventListener('click', go);
      p.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
    });
    show('map');
  }

  // ---------- vùng ----------
  function cardHTML(a) {
    const f = G.Store.state.found[a.id];
    return `<button class="art-card ${f ? 'found' : 'unknown'}" data-art="${a.id}" style="--rc:${G.RARITY[a.rarity].color}">
      <div class="thumb"><img data-thumb="${a.id}" alt=""></div>
      <div class="art-meta">
        <div class="stars">${stars(a.rarity)}</div>
        <div class="art-name">${esc(a.name)}</div>
        <div class="art-state">${f ? `✓ Đã sưu tầm · ${f.integrity}%` : 'Chưa tìm thấy'}</div>
      </div>
    </button>`;
  }

  function bindCards(root) {
    root.querySelectorAll('[data-art]').forEach((b) => b.addEventListener('click', () => {
      G.Sound.click();
      const id = b.dataset.art;
      if (G.Store.isFound(id)) openDetail(id);
      else {
        const r = G.regionById(G.artifactById(id).region);
        if (!G.Store.isRegionUnlocked(r)) return toast(`Vùng ${r.name} chưa mở khóa.`);
        openMission(id);
      }
    }));
    G.Thumbs.fill(root);
  }

  function openRegion(id) {
    const r = G.regionById(id);
    const arts = G.ARTIFACTS.filter((a) => a.region === id);
    const done = arts.filter((a) => G.Store.isFound(a.id)).length;
    $('#region-head').innerHTML = `
      <div class="eyebrow" style="color:${r.color}">${esc(r.sub)}</div>
      <h2>${esc(r.name)}</h2>
      <p>${esc(r.intro)}</p>
      <div class="meter"><span style="width:${(done / arts.length) * 100}%"></span></div>
      <small>${done}/${arts.length} cổ vật đã sưu tầm</small>`;
    $('#region-list').innerHTML = arts.map(cardHTML).join('');
    bindCards($('#region-list'));
    backToList = () => openRegion(id);
    show('region');
  }

  // ---------- nhiệm vụ ----------
  function openMission(id) {
    const a = G.artifactById(id);
    const r = G.regionById(a.region);
    const m = modal(`
      <div class="mission">
        <div class="eyebrow">Nhật ký thám hiểm · ${esc(r.name)}</div>
        <div class="mission-thumb unknown"><img data-thumb="${a.id}" alt=""></div>
        <h3>${esc(a.name)}</h3>
        <div class="stars" style="--rc:${G.RARITY[a.rarity].color}">${stars(a.rarity)} <span>${G.RARITY[a.rarity].name}</span></div>
        <blockquote class="clue">${esc(a.clue)}</blockquote>
        <ol class="howto">
          <li>Mở camera AR và lia quanh không gian của bạn.</li>
          <li>AI sẽ nhận diện đồ vật – tìm đúng đồ vật trong câu đố để đánh thức cổ vật.</li>
          <li>Không có đồ vật đó? Bật <b>Máy dò</b> và xoay người theo tín hiệu.</li>
          <li>Khai quật cẩn thận bằng xẻng và cọ!</li>
        </ol>
        <div class="row">
          <button class="btn ghost" data-close>Để sau</button>
          <button class="btn primary" data-go>📷 Bắt đầu khai quật AR</button>
        </div>
      </div>`, 'mission-modal');
    G.Thumbs.fill(m.root);
    m.root.querySelector('[data-go]').addEventListener('click', async () => {
      G.Sound.unlock(); G.Sound.click();
      await G.Look.requestPermission();
      m.close();
      G.Expedition.start(id);
    });
  }

  // ---------- phát hiện ----------
  function showDiscovery(a, res) {
    const unlockedNow = res.first ? G.REGIONS.filter((r) => r.unlock === G.Store.foundCount() && r.unlock > 0) : [];
    const cond = res.integrity >= 95 ? 'Hoàn hảo' : res.integrity >= 75 ? 'Tốt' : res.integrity >= 50 ? 'Khá' : 'Hư hại nặng';
    const m = modal(`
      <div class="discovery">
        <div class="rays"></div>
        <div class="eyebrow">${res.first ? 'Cổ vật mới!' : res.improved ? 'Khai quật tốt hơn!' : 'Khai quật lại'}</div>
        <canvas class="disc-view"></canvas>
        <h2>${esc(a.name)}</h2>
        <div class="stars" style="--rc:${G.RARITY[a.rarity].color}">${stars(a.rarity)} <span>${G.RARITY[a.rarity].name}</span></div>
        <p class="sum">${esc(a.summary)}</p>
        <div class="score-grid">
          <div><span>Tình trạng</span><b>${cond} · ${res.integrity}%</b></div>
          <div><span>Điểm khai quật</span><b>${res.score}</b></div>
          <div><span>Uy tín nhận được</span><b>+${res.gained}</b></div>
        </div>
        <div class="bonus">${res.aiBonus ? '<span class="chip gold">🤖 Thưởng AI quét ×1.2</span>' : ''}${res.speedBonus ? '<span class="chip">⚡ Nhanh tay ×1.1</span>' : ''}${res.first ? '<span class="chip">💡 +1 gợi ý</span>' : ''}</div>
        ${unlockedNow.map((r) => `<div class="unlock">🔓 Vùng mới mở khóa: <b>${esc(r.name)}</b></div>`).join('')}
        <div class="row">
          <button class="btn ghost" data-act="map">🗺️ Bản đồ</button>
          <button class="btn primary" data-act="detail">📖 Hồ sơ & hỏi Giáo sư AI</button>
        </div>
      </div>`, 'discovery-modal');
    const v = new G.Viewer(m.root.querySelector('.disc-view'));
    v.setModel(a.id);
    const done = (fn) => () => { v.dispose(); m.close(); fn(); };
    m.root.querySelector('[data-act="map"]').addEventListener('click', done(openMap));
    m.root.querySelector('[data-act="detail"]').addEventListener('click', done(() => openDetail(a.id)));
    m.root.addEventListener('click', (e) => { if (e.target === m.root) { v.dispose(); openRegion(a.region); } });
    openRegion(a.region);
  }

  // ---------- hồ sơ cổ vật + chat AI ----------
  function openDetail(id) {
    const a = G.artifactById(id);
    const r = G.regionById(a.region);
    const f = G.Store.state.found[id];
    show('detail');
    $('#detail-body').innerHTML = `
      <div class="detail-hero">
        <canvas id="detail-view"></canvas>
        <div class="drag-hint">Kéo để xoay · cuộn để phóng to</div>
      </div>
      <div class="detail-info">
        <div class="eyebrow" style="color:${r.color}">${esc(r.name)} · ${esc(a.era)}</div>
        <h2>${esc(a.name)}</h2>
        <div class="stars" style="--rc:${G.RARITY[a.rarity].color}">${stars(a.rarity)} <span>${G.RARITY[a.rarity].name}</span>
          ${f ? `<span class="chip">Tình trạng ${f.integrity}%</span><span class="chip">${f.score} điểm</span>` : ''}</div>
        <p class="lead">${esc(a.summary)}</p>
        <dl class="facts">
          <dt>Chất liệu</dt><dd>${esc(a.material)}</dd>
          <dt>Kích thước</dt><dd>${esc(a.size)}</dd>
          <dt>Phát hiện</dt><dd>${esc(a.discovered)}</dd>
          <dt>Lưu giữ</dt><dd>${esc(a.location)}</dd>
          <dt>Ý nghĩa</dt><dd>${esc(a.significance)}</dd>
        </dl>
        <h4>Bạn có biết?</h4>
        <ul class="trivia">${a.facts.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
        <button class="btn ghost small" id="detail-redig">⛏️ Khai quật lại để cải thiện tình trạng</button>
      </div>
      <section class="chat">
        <div class="chat-head">
          <div class="prof">🧑‍🏫</div>
          <div><b>Giáo sư Minh Khảo</b><small>${G.AI.mode() !== 'offline' ? 'AI Claude · trực tuyến' : G.Platform.inArtifact ? 'Chế độ ngoại tuyến' : 'Chế độ ngoại tuyến · thêm khóa API trong Cài đặt'}</small></div>
        </div>
        <div class="chat-log" id="chat-log"><div class="msg bot">Chào nhà khảo cổ! Tôi có thể kể cho bạn mọi điều về <b>${esc(a.name)}</b>. Bạn muốn biết gì?</div></div>
        <div class="chips" id="chat-chips">
          ${['Ai đã tìm ra nó?', 'Nó được làm như thế nào?', 'Vì sao nó quan trọng?', 'Kể một câu chuyện thú vị!', 'Hiện nay nó ở đâu?'].map((q) => `<button class="chip-btn">${q}</button>`).join('')}
        </div>
        <form class="chat-input" id="chat-form">
          <input id="chat-text" placeholder="Hỏi Giáo sư về cổ vật này…" autocomplete="off" maxlength="400">
          <button class="btn primary" type="submit" aria-label="Gửi">➤</button>
        </form>
      </section>`;
    viewer = new G.Viewer($('#detail-view'));
    viewer.setModel(id);
    $('#detail-redig').addEventListener('click', () => openMission(id));

    const history = [];
    const log = $('#chat-log');
    let busy = false;
    async function ask(q) {
      if (busy || !q.trim()) return;
      busy = true;
      log.insertAdjacentHTML('beforeend', `<div class="msg me">${esc(q)}</div>`);
      const bot = document.createElement('div');
      bot.className = 'msg bot typing';
      bot.innerHTML = '<span class="dots"><i></i><i></i><i></i></span>';
      log.appendChild(bot);
      log.scrollTop = log.scrollHeight;
      try {
        const full = await G.AI.chat(a, history, q, (t) => {
          bot.classList.remove('typing');
          bot.innerHTML = md(t);
          log.scrollTop = log.scrollHeight;
        });
        bot.innerHTML = md(full);
        history.push({ role: 'user', content: q }, { role: 'assistant', content: full });
        if (history.length > 16) history.splice(0, 2);
      } catch (e) {
        bot.classList.remove('typing');
        bot.classList.add('err');
        bot.textContent = e.message;
      }
      log.scrollTop = log.scrollHeight;
      busy = false;
    }
    $('#chat-chips').querySelectorAll('.chip-btn').forEach((b) => b.addEventListener('click', () => ask(b.textContent)));
    $('#chat-form').addEventListener('submit', (e) => { e.preventDefault(); const t = $('#chat-text'); ask(t.value); t.value = ''; });
  }

  // ---------- bảo tàng ----------
  function openMuseum() {
    const s = G.Store.state;
    const rank = G.Store.rank(), next = G.Store.nextRank();
    const pct = next ? ((s.rep - rank.min) / (next.min - rank.min)) * 100 : 100;
    $('#museum-head').innerHTML = `
      <div class="stat-row">
        <div class="stat"><b>${G.Store.foundCount()}/${G.ARTIFACTS.length}</b><span>Cổ vật</span></div>
        <div class="stat"><b>${s.rep}</b><span>Uy tín</span></div>
        <div class="stat"><b>${s.hints}</b><span>Gợi ý</span></div>
        <div class="stat"><b>${s.appraisals.length}</b><span>Giám định</span></div>
      </div>
      <div class="rank"><b>${esc(rank.name)}</b>${next ? `<small>Còn ${next.min - s.rep} uy tín để trở thành ${esc(next.name)}</small>` : '<small>Bạn đã đạt danh hiệu cao nhất!</small>'}</div>
      <div class="meter"><span style="width:${pct}%"></span></div>`;
    $('#museum-list').innerHTML = G.REGIONS.map((r) => `
      <h3 class="museum-region" style="--c:${r.color}">${esc(r.name)}</h3>
      <div class="art-grid">${G.ARTIFACTS.filter((a) => a.region === r.id).map(cardHTML).join('')}</div>`).join('');
    bindCards($('#museum-list'));
    backToList = openMuseum;
    show('museum');
  }

  // ---------- giám định AI ----------
  async function appraise(st, shot) {
    if (!st || !shot) return;
    G.Sound.shutter();
    st.paused = true;
    let labels = [];
    try {
      if (G.Detector.status === 'ready') labels = (await G.Detector.detect(shot)).sort((p, q) => q.score - p.score).map((d) => d.class);
    } catch (e) { /* bỏ qua */ }
    const m = modal(`
      <div class="appraise">
        <div class="eyebrow">Máy giám định AI</div>
        <img class="shot" src="${shot.toDataURL('image/jpeg', 0.85)}" alt="Ảnh chụp">
        <div class="appraise-body"><div class="loading"><span class="dots"><i></i><i></i><i></i></span> Giáo sư AI đang soi kính lúp…</div></div>
        <div class="row"><button class="btn primary" data-close>Tiếp tục thám hiểm</button></div>
      </div>`, 'appraise-modal');
    const resume = () => { if (st.running) { st.paused = false; st.lock = 0; } };
    m.root.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', resume));
    m.root.addEventListener('click', (e) => { if (e.target === m.root) resume(); });
    try {
      const r = await G.AI.appraise(shot, labels);
      const thumb = document.createElement('canvas');
      const sc = 220 / Math.max(shot.width, shot.height);
      thumb.width = shot.width * sc; thumb.height = shot.height * sc;
      thumb.getContext('2d').drawImage(shot, 0, 0, thumb.width, thumb.height);
      G.Store.addAppraisal({ ...r, img: thumb.toDataURL('image/jpeg', 0.7) });
      m.root.querySelector('.appraise-body').innerHTML = appraisalHTML(r);
      G.Sound.success();
    } catch (e) {
      m.root.querySelector('.appraise-body').innerHTML = `<p class="err">${esc(e.message)}</p>`;
    }
  }

  function appraisalHTML(r) {
    const rar = Object.values(G.RARITY).find((x) => x.name === r.do_hiem) || G.RARITY.common;
    return `
      <div class="appraisal-card" style="--rc:${rar.color}">
        <small>Vật thể thật: ${esc(r.vat_that || '?')}</small>
        <h3>${esc(r.ten_co_vat || 'Cổ vật vô danh')}</h3>
        <div class="stars">${'★'.repeat(rar.stars)}<i>${'★'.repeat(4 - rar.stars)}</i> <span>${esc(r.do_hiem || '')}</span></div>
        <dl class="facts">
          <dt>Niên đại</dt><dd>${esc(r.nien_dai || '')}</dd>
          <dt>Nền văn minh</dt><dd>${esc(r.nen_van_minh || '')}</dd>
          <dt>Công dụng</dt><dd>${esc(r.cong_dung || '')}</dd>
          ${r.co_vat_tuong_tu && r.co_vat_tuong_tu !== '—' ? `<dt>Cổ vật tương tự</dt><dd>${esc(r.co_vat_tuong_tu)}</dd>` : ''}
          <dt>Định giá</dt><dd><b>${esc(r.gia_tri)} xu vàng</b></dd>
        </dl>
        <p class="quote">“${esc(r.nhan_xet || '')}”</p>
        <small class="src">${r.source === 'claude' ? 'Giám định bởi AI Claude · nội dung giả tưởng cho vui' : 'Chế độ ngoại tuyến · nội dung giả tưởng'}</small>
      </div>`;
  }

  function openAppraisals() {
    const list = G.Store.state.appraisals;
    $('#appraisal-list').innerHTML = list.length
      ? list.map((r) => `<div class="appraisal-item">${r.img ? `<img src="${r.img}" alt="">` : ''}${appraisalHTML(r)}</div>`).join('')
      : '<p class="empty">Chưa có món nào. Trong lúc thám hiểm AR, bấm 📸 để AI giám định một đồ vật bất kỳ quanh bạn!</p>';
    show('appraisals');
  }

  // ---------- cài đặt ----------
  function openSettings() {
    const s = G.Store.state.settings;
    $('#set-key').value = s.apiKey;
    $('#set-model').value = s.model;
    $('#set-sound').checked = s.sound;
    $('#set-result').textContent = '';
    // Trên claude.ai: Claude chạy qua tài khoản người chơi, không cần (và không gọi được) khóa API.
    const viaClaude = G.Platform.inArtifact;
    $('#set-key-block').hidden = viaClaude;
    $('#set-claude-note').hidden = !viaClaude;
    $('#set-claude-note').textContent = G.AI.mode() === 'sample'
      ? 'Giáo sư AI dùng Claude qua tài khoản claude.ai của bạn – không cần khóa API. Lần đầu hỏi, claude.ai sẽ xin phép bạn.'
      : 'Chế độ xem này chưa dùng được Claude (cần đăng nhập claude.ai và cho phép trang dùng Claude). Game vẫn chơi được ở chế độ ngoại tuyến.';
    $('#set-sync').textContent = G.Store.cloudOn
      ? 'Tiến trình được lưu trên máy này và đồng bộ vào kho riêng của bạn trên claude.ai.'
      : 'Tiến trình được lưu trong trình duyệt trên máy này.';
    show('settings');
  }

  function bindSettings() {
    const save = () => {
      const s = G.Store.state.settings;
      s.apiKey = $('#set-key').value.trim();
      s.model = $('#set-model').value;
      s.sound = $('#set-sound').checked;
      G.Store.save();
    };
    ['#set-key', '#set-model', '#set-sound'].forEach((id) => $(id).addEventListener('change', save));
    $('#set-test').addEventListener('click', async () => {
      save();
      const out = $('#set-result');
      if (G.AI.mode() === 'offline') { out.textContent = G.Platform.inArtifact ? 'Claude chưa khả dụng trong chế độ xem này.' : 'Chưa nhập khóa API.'; return; }
      out.textContent = 'Đang kết nối…';
      try { out.textContent = '✓ ' + (await G.AI.test()); }
      catch (e) { out.textContent = '✗ ' + (e.message || e); }
    });
    // Xác nhận hai bước ngay trên trang (hộp thoại confirm() không hiện trong artifact).
    const resetBtn = $('#set-reset');
    let armed = null;
    resetBtn.addEventListener('click', () => {
      if (!armed) {
        resetBtn.textContent = 'Bấm lần nữa để xóa vĩnh viễn';
        resetBtn.classList.add('armed');
        armed = setTimeout(() => { armed = null; resetBtn.textContent = 'Xóa tiến trình chơi'; resetBtn.classList.remove('armed'); }, 4000);
        return;
      }
      clearTimeout(armed); armed = null;
      resetBtn.textContent = 'Xóa tiến trình chơi'; resetBtn.classList.remove('armed');
      G.Store.reset();
      toast('Đã xóa tiến trình.');
      renderMenu();
    });
  }

  // ---------- khởi động ----------
  function init() {
    document.addEventListener('click', (e) => {
      const b = e.target.closest('[data-go]');
      if (!b || b.closest('.modal')) return;
      G.Sound.unlock();
      G.Sound.click();
      const go = b.dataset.go;
      if (go === 'play') {
        if (!G.Store.state.seenGuide) { G.Store.state.seenGuide = true; G.Store.save(); show('guide'); }
        else openMap();
      } else if (go === 'map') openMap();
      else if (go === 'museum') openMuseum();
      else if (go === 'settings') openSettings();
      else if (go === 'guide') show('guide');
      else if (go === 'appraisals') openAppraisals();
      else if (go === 'menu') renderMenu();
      else if (go === 'back') backToList();
      else if (go === 'back-region') openRegion(G.Expedition.state ? G.Expedition.state.art.region : 'vietnam');
    });
    bindSettings();
    G.Expedition.init();
    renderMenu();
    // Tải sẵn AI nhận diện (chỉ khi chạy độc lập – trên claude.ai trang không tải được mô hình từ ngoài).
    if (!G.Platform.inArtifact) setTimeout(() => { G.Detector.load().catch(() => {}); }, 2500);
    G.Store.onRemoteLoad(() => { if (current === 'menu') renderMenu(); });
    G.Platform.ready.then(async () => {
      await G.Store.connectCloud();
      if (current === 'menu') renderMenu();
    });
  }

  return { init, show, toast, esc, openMap, openRegion, openMission, openDetail, openMuseum, showDiscovery, appraise, renderMenu };
})();

window.addEventListener('DOMContentLoaded', () => {
  if (!window.THREE) {
    document.body.innerHTML = '<p style="padding:24px;font-family:sans-serif">Không tải được thư viện 3D. Hãy kiểm tra kết nối Internet rồi tải lại trang.</p>';
    return;
  }
  G.UI.init();
});
