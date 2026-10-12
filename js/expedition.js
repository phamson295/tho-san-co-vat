/*
 * Màn hình thám hiểm AR. Ba cách tìm cổ vật:
 *  - "AI quét" (scan): AI nhận diện vật thể trên camera trực tiếp; thấy đúng đồ vật trong câu đố → cổ vật xuất hiện.
 *  - "Chụp ảnh" (photo): khi không mở được camera trực tiếp (ví dụ trên claude.ai), người chơi chụp một tấm
 *    bằng camera điện thoại và AI (COCO-SSD hoặc Claude) tìm đồ vật trong ảnh.
 *  - "Máy dò" (signal): cổ vật ẩn ở một hướng quanh người chơi; xoay điện thoại (hoặc kéo) theo tín hiệu.
 */
window.G = window.G || {};

G.Expedition = (() => {
  const T = THREE;
  const deg = Math.PI / 180;
  let st = null;
  const el = {};

  function $(id) { return document.getElementById(id); }

  function init() {
    ['exp-video', 'exp-sim', 'exp-photo', 'exp-file', 'exp-hud', 'exp-title', 'exp-region', 'exp-clue', 'exp-status', 'exp-mode', 'exp-hint', 'exp-flip', 'exp-appraise', 'exp-back', 'exp-target', 'screen-expedition']
      .forEach((id) => { el[id.replace('exp-', '').replace('screen-', '')] = $(id); });
    el.back.addEventListener('click', () => { stop(); G.UI.openRegion(st ? st.art.region : 'vietnam'); });
    el.mode.addEventListener('click', toggleMode);
    el.hint.addEventListener('click', useHint);
    el.flip.addEventListener('click', flipCamera);
    el.appraise.addEventListener('click', mainAction);
    el.file.addEventListener('change', onPhotoPicked);
    el.status.addEventListener('click', (e) => {
      if (e.target.closest('[data-act="appraise-photo"]') && st && st.photo) G.UI.appraise(st, st.photo.canvas);
    });
  }

  // Nút giữa: giám định (camera trực tiếp) hoặc chụp ảnh để quét/giám định.
  function mainAction() {
    G.Sound.unlock();
    if (st.mode === 'photo') return pickPhoto('scan');
    if (st.camOk && G.Cam.ready()) return G.UI.appraise(st, G.Cam.capture(768));
    return pickPhoto('appraise');
  }

  function pickPhoto(purpose) {
    st.photoPurpose = purpose;
    el.file.value = '';
    el.file.click();
  }

  async function onPhotoPicked() {
    const f = el.file.files && el.file.files[0];
    if (!f || !st) return;
    let canvas;
    try { canvas = await G.fileToCanvas(f); } catch (e) { return G.UI.toast(e.message); }
    G.Sound.shutter();
    if (st.photoPurpose === 'appraise') return G.UI.appraise(st, canvas);
    scanPhoto(canvas);
  }

  async function scanPhoto(canvas) {
    const art = st.art;
    st.photo = { canvas, w: canvas.width, h: canvas.height, dets: [], found: null, scanning: true };
    st.lock = 0;
    el.photo.src = canvas.toDataURL('image/jpeg', 0.85);
    el.photo.hidden = false;
    el.sim.hidden = true;
    setStatus('<span class="dots"><i></i><i></i><i></i></span> AI đang phân tích ảnh…');
    const shot = st.photo;
    try {
      if (G.Detector.status === 'ready') {
        const d = await G.Detector.detect(canvas);
        shot.dets = d.map((o) => ({ name: G.objectName(o.class), box: o.bbox, target: o.class === art.hide && o.score >= 0.45 }));
        const t = shot.dets.find((o) => o.target);
        shot.found = t ? t.box : null;
      } else if (await G.AI.canSee()) {
        const r = await G.AI.scanPhoto(canvas, art);
        const px = (b) => [b[0] * shot.w, b[1] * shot.h, b[2] * shot.w, b[3] * shot.h];
        const tName = G.objectName(art.hide).toLowerCase();
        // Khi đã tìm thấy, bỏ khung trùng của chính đồ vật mục tiêu trong danh sách chung.
        shot.dets = r.objects.filter((o) => !(r.found && o.name.toLowerCase() === tName))
          .map((o) => ({ name: o.name, box: px(o.box), target: false }));
        if (r.found) {
          const tb = r.targetBox ? px(r.targetBox) : [shot.w * 0.35, shot.h * 0.35, shot.w * 0.3, shot.h * 0.3];
          shot.dets.push({ name: G.objectName(art.hide), box: tb, target: true });
          shot.found = tb;
        }
      } else {
        throw new Error('Chưa có AI nhìn được ảnh trong chế độ này.');
      }
    } catch (e) {
      if (st.photo !== shot) return;
      shot.scanning = false;
      setStatus(`${G.UI.esc(e.message)} Hãy thử lại hoặc bật <b>Máy dò</b>.`);
      return;
    }
    if (st.photo !== shot) return; // người chơi đã chụp ảnh khác
    shot.scanning = false;
    const names = [...new Set(shot.dets.filter((o) => !o.target).map((o) => o.name))];
    if (shot.found) {
      setStatus('<b class="gold">Năng lượng cổ vật phát ra từ bức ảnh!</b>');
      G.Sound.lock();
    } else {
      setStatus((names.length ? `AI thấy: ${names.map((n) => `<span class="chip">${G.UI.esc(n)}</span>`).join(' ')}. ` : 'AI chưa nhận ra đồ vật nào. ') +
        'Chưa có đồ vật trong câu đố, hãy chụp chỗ khác. <button class="link-btn" data-act="appraise-photo">📸 Giám định ảnh này</button>');
    }
  }

  async function start(id) {
    const art = G.artifactById(id);
    stop();
    st = {
      art, mode: 'scan', lock: 0, lockPt: null, dets: [], busy: false, lastDetect: 0, lastBeep: 0,
      camOk: false, running: true, paused: false, usedSignal: false, targetRevealed: false,
      arrowUntil: 0, target: null, t0: performance.now(), last: performance.now(), seen: new Set(),
      photo: null, photoPurpose: 'scan',
    };
    G.UI.show('expedition');
    el.title.textContent = art.name;
    el.region.textContent = G.regionById(art.region).name;
    el.clue.textContent = art.clue;
    el.target.hidden = true;
    el.photo.hidden = true;
    el.photo.removeAttribute('src');
    G.Look.start(el.expedition);
    setStatus('Đang mở camera…');

    // Trên claude.ai trang không được dùng camera trực tiếp: vào thẳng chế độ chụp ảnh.
    if (!G.Platform.inArtifact) {
      try {
        await G.Cam.start(el.video, 'environment');
        st.camOk = true;
      } catch (e) {
        console.warn(e);
        st.camOk = false;
      }
    }
    if (!st || !st.running) return;
    el.sim.hidden = st.camOk;
    el.flip.hidden = !st.camOk;

    if (st.camOk) {
      setMode('scan');
      if (G.Detector.status !== 'ready') {
        setStatus('Đang tải bộ não AI nhận diện vật thể…');
        G.Detector.load().then(() => { if (st && st.mode === 'scan') setStatus('AI sẵn sàng – hãy lia camera quanh bạn.'); })
          .catch(() => { if (st && st.running) { G.UI.toast('Không tải được AI nhận diện – dùng Máy dò tín hiệu.'); setMode('signal'); } });
      }
    } else {
      if (!G.Platform.inArtifact) G.Detector.load().catch(() => {}); // để quét ảnh ngay trên máy nếu được
      await G.Platform.ready;
      if (!st || !st.running) return;
      const canPhoto = G.Detector.status === 'ready' || G.Detector.status === 'loading' || (await G.AI.canSee());
      setMode(canPhoto ? 'photo' : 'signal');
      if (!canPhoto) G.UI.toast('Không có camera trực tiếp và AI xem ảnh – dùng Máy dò.');
    }

    requestAnimationFrame(loop);
  }

  function stop() {
    if (!st) return;
    st.running = false;
    G.Cam.stop();
    G.Look.stop();
  }

  function setMode(m) {
    st.mode = m;
    st.lock = 0;
    if (m === 'signal') { st.usedSignal = true; makeTarget(); }
    const aiMode = st.camOk ? 'scan' : 'photo';
    el.mode.innerHTML = m === 'signal' ? (aiMode === 'scan' ? '🤖<span>AI quét</span>' : '📷<span>AI ảnh</span>') : '📡<span>Máy dò</span>';
    el.appraise.innerHTML = m === 'photo' ? '📷<span>Chụp & quét</span>' : '📸<span>Giám định AI</span>';
    el.hint.querySelector('small').textContent = G.Store.state.hints;
    el.expedition.dataset.mode = m;
    el.photo.hidden = !(m === 'photo' && st.photo);
    el.sim.hidden = st.camOk || (m === 'photo' && !!st.photo);
    if (m === 'signal') {
      setStatus(G.Look.usingGyro ? 'Xoay người chậm và lắng nghe tín hiệu máy dò…' : 'Vuốt màn hình (hoặc kéo chuột, phím mũi tên) để nhìn quanh và nghe tín hiệu.');
      el.clue.textContent = 'Máy dò kim loại đã bật! Cổ vật đang ở đâu đó quanh bạn – đi theo tín hiệu, khi vầng sáng xuất hiện hãy giữ nó ở giữa màn hình.';
    } else {
      el.clue.textContent = st.art.clue;
      if (m === 'photo' && !st.photo) setStatus('Bấm <b>📷 Chụp & quét</b> để chụp đồ vật trong câu đố. AI sẽ xem ảnh và tìm dấu vết cổ vật.');
    }
    showTarget();
  }

  function toggleMode() {
    G.Sound.click();
    if (st.mode !== 'signal') return setMode('signal');
    if (st.camOk) {
      if (G.Detector.status === 'failed') return G.UI.toast('AI nhận diện chưa sẵn sàng.');
      return setMode('scan');
    }
    setMode('photo');
  }

  function useHint() {
    const s = G.Store.state;
    if (st.mode !== 'signal' && st.targetRevealed) return G.UI.toast('Mục tiêu đã được hiển thị.');
    if (s.hints <= 0) return G.UI.toast('Hết lượt gợi ý! Tìm thêm cổ vật để nhận lượt mới.');
    s.hints -= 1; G.Store.save();
    el.hint.querySelector('small').textContent = s.hints;
    G.Sound.click();
    if (st.mode !== 'signal') { st.targetRevealed = true; showTarget(); }
    else { st.arrowUntil = performance.now() + 8000; G.UI.toast('La bàn chỉ hướng trong 8 giây!'); }
  }

  function showTarget() {
    el.target.hidden = !(st.mode !== 'signal' && st.targetRevealed);
    el.target.textContent = '🎯 AI cần nhìn thấy: ' + G.objectName(st.art.hide);
  }

  async function flipCamera() {
    G.Sound.click();
    try { await G.Cam.start(el.video, G.Cam.facing === 'environment' ? 'user' : 'environment'); }
    catch (e) { G.UI.toast('Không đổi được camera.'); }
  }

  function setStatus(html) { el.status.innerHTML = html; }

  // ---------- vòng lặp ----------
  function loop(now) {
    if (!st || !st.running) return;
    requestAnimationFrame(loop);
    const dt = Math.min(0.1, (now - st.last) / 1000);
    st.last = now;
    const c = el.hud, W = c.clientWidth, H = c.clientHeight, dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (c.width !== Math.round(W * dpr) || c.height !== Math.round(H * dpr)) { c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); }
    const x = c.getContext('2d');
    x.setTransform(dpr, 0, 0, dpr, 0, 0);
    x.clearRect(0, 0, W, H);
    const view = viewInfo(W, H);
    if (!el.sim.hidden) drawSim(view);
    if (st.paused) return;
    if (st.mode === 'scan') updateScan(x, W, H, dt, now);
    else if (st.mode === 'photo') updatePhoto(x, W, H, dt, now);
    else updateSignal(x, W, H, dt, now, view);
  }

  function scanSweep(x, W, H, now) {
    const sy = ((now / 1800) % 1) * H;
    const grad = x.createLinearGradient(0, sy - 40, 0, sy);
    grad.addColorStop(0, 'rgba(64,224,208,0)'); grad.addColorStop(1, 'rgba(64,224,208,0.25)');
    x.fillStyle = grad; x.fillRect(0, sy - 40, W, 40);
  }

  // ---------- Quét ảnh chụp ----------
  function updatePhoto(x, W, H, dt, now) {
    const p = st.photo;
    if (!p) return;
    if (p.scanning) return scanSweep(x, W, H, now);
    let tgt = null;
    for (const d of p.dets) {
      const b = G.mapCover(d.box, p.w, p.h, W, H);
      if (d.target) tgt = b;
      drawBox(x, b, d.target ? '#f6c453' : 'rgba(64,224,208,0.9)', d.name, d.target);
    }
    if (!tgt) return;
    st.lockPt = { x: tgt.x + tgt.w / 2, y: tgt.y + tgt.h / 2 };
    st.lock = Math.min(1, st.lock + dt / 1.6);
    drawLock(x, st.lockPt.x, st.lockPt.y, st.lock, now);
    if (st.lock >= 1) found(st.lockPt);
  }

  function viewInfo(W, H) {
    const q = G.Look.quaternion();
    const f = new T.Vector3(0, 0, -1).applyQuaternion(q);
    const vfov = (H > W ? 62 : 48) * deg;
    const focal = H / 2 / Math.tan(vfov / 2);
    return { q, f, W, H, focal, yaw: Math.atan2(-f.x, -f.z), pitch: Math.asin(Math.max(-1, Math.min(1, f.y))) };
  }

  // ---------- AI quét ----------
  function updateScan(x, W, H, dt, now) {
    if (G.Detector.status === 'ready' && G.Cam.ready() && !st.busy && now - st.lastDetect > 150) {
      st.busy = true; st.lastDetect = now;
      G.Detector.detect(el.video).then((d) => {
        if (!st) return;
        d.forEach((o) => { if (!st.seen.has(o.class)) { st.seen.add(o.class); G.Sound.scan(); } });
        st.dets = d;
      }).catch(() => {}).finally(() => { if (st) st.busy = false; });
    }

    scanSweep(x, W, H, now);

    if (!G.Cam.ready()) return;
    let target = null;
    for (const d of st.dets) {
      const b = G.Cam.toScreen(d.bbox, W, H);
      const isT = d.class === st.art.hide && d.score >= 0.45;
      if (isT && (!target || d.score > target.d.score)) target = { d, b };
      drawBox(x, b, isT ? '#f6c453' : 'rgba(64,224,208,0.9)', `${G.objectName(d.class)} ${Math.round(d.score * 100)}%`, isT);
    }

    if (target) st.lock = Math.min(1, st.lock + dt / 1.4);
    else st.lock = Math.max(0, st.lock - dt * 0.7);
    if (target) st.lockPt = { x: target.b.x + target.b.w / 2, y: target.b.y + target.b.h / 2 };
    if (st.lock > 0 && st.lockPt) drawLock(x, st.lockPt.x, st.lockPt.y, st.lock, now);

    if (G.Detector.status === 'ready') {
      const names = [...new Set(st.dets.map((d) => G.objectName(d.class)))];
      setStatus(target
        ? '<b class="gold">Năng lượng cổ vật phát ra! Giữ yên camera…</b>'
        : names.length ? `AI đang thấy: ${names.map((n) => `<span class="chip">${n}</span>`).join(' ')}` : 'AI đang quét… hãy lia camera chậm quanh phòng.');
    }
    if (st.lock >= 1) found(st.lockPt);
  }

  function drawBox(x, b, color, label, strong) {
    const k = Math.min(22, b.w / 4, b.h / 4);
    x.strokeStyle = color; x.lineWidth = strong ? 3 : 2;
    x.beginPath();
    [[b.x, b.y, 1, 1], [b.x + b.w, b.y, -1, 1], [b.x, b.y + b.h, 1, -1], [b.x + b.w, b.y + b.h, -1, -1]].forEach(([px, py, sx, sy]) => {
      x.moveTo(px, py + sy * k); x.lineTo(px, py); x.lineTo(px + sx * k, py);
    });
    x.stroke();
    x.font = '600 12px "Be Vietnam Pro", system-ui, sans-serif';
    const tw = x.measureText(label).width + 12;
    x.fillStyle = strong ? 'rgba(246,196,83,0.92)' : 'rgba(10,30,30,0.7)';
    x.fillRect(b.x, Math.max(0, b.y - 22), tw, 20);
    x.fillStyle = strong ? '#2b1d05' : '#bff7ee';
    x.fillText(label, b.x + 6, Math.max(14, b.y - 8));
  }

  function drawLock(x, cx, cy, p, now) {
    x.save();
    x.translate(cx, cy);
    x.strokeStyle = 'rgba(246,196,83,0.35)'; x.lineWidth = 6;
    x.beginPath(); x.arc(0, 0, 46, 0, Math.PI * 2); x.stroke();
    x.strokeStyle = '#f6c453';
    x.beginPath(); x.arc(0, 0, 46, -Math.PI / 2, -Math.PI / 2 + p * Math.PI * 2); x.stroke();
    x.rotate(now / 400);
    x.lineWidth = 2; x.strokeStyle = 'rgba(255,236,170,0.8)';
    for (let i = 0; i < 4; i++) { x.rotate(Math.PI / 2); x.beginPath(); x.arc(0, 0, 60, 0, 0.6); x.stroke(); }
    x.restore();
  }

  // ---------- Máy dò tín hiệu ----------
  function makeTarget() {
    const f = G.Look.forward();
    const baseYaw = Math.atan2(-f.x, -f.z);
    const dyaw = (Math.random() < 0.5 ? -1 : 1) * (70 + Math.random() * 120) * deg;
    const pitch = (Math.random() * 30 - 12) * deg;
    st.target = new T.Vector3(0, 0, -1).applyEuler(new T.Euler(pitch, baseYaw + dyaw, 0, 'YXZ'));
  }

  function project(v, view) {
    const local = v.clone().applyQuaternion(view.q.clone().invert());
    if (local.z >= -0.01) return { behind: true, local };
    return { x: view.W / 2 + (local.x / -local.z) * view.focal, y: view.H / 2 - (local.y / -local.z) * view.focal, local };
  }

  function updateSignal(x, W, H, dt, now, view) {
    const angle = view.f.angleTo(st.target);
    const strength = 1 - angle / Math.PI;
    const interval = angle < 10 * deg ? 90 : 1100 - 1000 * strength ** 3;
    if (now - st.lastBeep > interval) { st.lastBeep = now; G.Sound.beep(strength); }

    const p = project(st.target, view);
    if (!p.behind && angle < 38 * deg) {
      const a = 1 - angle / (38 * deg);
      const pulse = 1 + Math.sin(now / 180) * 0.12;
      const r = 40 + a * 50;
      const g = x.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 1.8 * pulse);
      g.addColorStop(0, `rgba(255,230,150,${0.85 * a})`);
      g.addColorStop(0.35, `rgba(246,196,83,${0.45 * a})`);
      g.addColorStop(1, 'rgba(246,196,83,0)');
      x.fillStyle = g; x.beginPath(); x.arc(p.x, p.y, r * 1.8 * pulse, 0, Math.PI * 2); x.fill();
      for (let i = 0; i < 10; i++) { // bụi sáng
        const t = now / 900 + i * 0.63;
        x.fillStyle = `rgba(255,240,190,${a * (0.4 + 0.6 * Math.abs(Math.sin(t * 2)))})`;
        x.fillRect(p.x + Math.cos(t) * r * (0.6 + (i % 3) * 0.3), p.y + Math.sin(t * 1.3) * r * 0.8 - ((now / 25 + i * 40) % 80), 3, 3);
      }
    }
    // la bàn chỉ hướng (khi dùng gợi ý)
    if (now < st.arrowUntil && angle > 12 * deg) {
      const lx = p.local.x, ly = p.local.y;
      const ang = Math.atan2(-ly, lx);
      x.save(); x.translate(W / 2, H / 2); x.rotate(ang);
      x.fillStyle = 'rgba(246,196,83,0.95)';
      x.beginPath(); x.moveTo(110, 0); x.lineTo(80, -18); x.lineTo(80, 18); x.closePath(); x.fill();
      x.restore();
    }
    // tâm ngắm
    x.strokeStyle = 'rgba(255,255,255,0.7)'; x.lineWidth = 1.5;
    x.beginPath(); x.arc(W / 2, H / 2, 16, 0, Math.PI * 2); x.moveTo(W / 2 - 26, H / 2); x.lineTo(W / 2 - 10, H / 2); x.moveTo(W / 2 + 10, H / 2); x.lineTo(W / 2 + 26, H / 2); x.stroke();

    drawRadar(x, W, H, view, strength);

    if (angle < 9 * deg && !p.behind) { st.lock = Math.min(1, st.lock + dt / 1.2); st.lockPt = { x: p.x, y: p.y }; }
    else st.lock = Math.max(0, st.lock - dt * 0.9);
    if (st.lock > 0 && st.lockPt) drawLock(x, st.lockPt.x, st.lockPt.y, st.lock, now);

    const bars = Math.round(strength * 10);
    setStatus(`Tín hiệu <span class="bars">${'▮'.repeat(bars)}<i>${'▮'.repeat(10 - bars)}</i></span> ${Math.round(strength * 100)}%` +
      (angle < 38 * deg ? ' — <b class="gold">Rất gần! Đưa vầng sáng vào giữa.</b>' : ''));
    if (st.lock >= 1) found(st.lockPt);
  }

  function drawRadar(x, W, H, view, strength) {
    const R = H < 560 ? 34 : 46;
    const cx = W - R - 16, cy = el.clue.parentElement.getBoundingClientRect().bottom + R + 14; // ngay dưới câu đố

    x.save();
    x.fillStyle = 'rgba(8,20,18,0.6)'; x.strokeStyle = 'rgba(64,224,208,0.7)'; x.lineWidth = 1.5;
    x.beginPath(); x.arc(cx, cy, R, 0, Math.PI * 2); x.fill(); x.stroke();
    x.beginPath(); x.arc(cx, cy, R * 0.55, 0, Math.PI * 2); x.stroke();
    x.beginPath(); x.moveTo(cx, cy); x.lineTo(cx, cy - R); x.stroke();
    const tYaw = Math.atan2(-st.target.x, -st.target.z);
    let rel = tYaw - view.yaw;
    rel = Math.atan2(Math.sin(rel), Math.cos(rel));
    const d = R * (0.35 + 0.55 * (1 - strength));
    x.fillStyle = '#f6c453';
    x.shadowColor = '#f6c453'; x.shadowBlur = 10;
    x.beginPath(); x.arc(cx - Math.sin(rel) * d, cy - Math.cos(rel) * d, 5, 0, Math.PI * 2); x.fill();
    x.restore();
  }

  // ---------- Khu khai quật mô phỏng (khi không có camera) ----------
  function drawSim(view) {
    const c = el.sim, W = view.W, H = view.H;
    if (c.width !== W || c.height !== H) { c.width = W; c.height = H; }
    const x = c.getContext('2d');
    const ppr = view.focal; // pixel trên mỗi radian
    const horizon = H / 2 + view.pitch * ppr;
    const sky = x.createLinearGradient(0, horizon - H, 0, horizon);
    sky.addColorStop(0, '#2a4d73'); sky.addColorStop(1, '#f3c58b');
    x.fillStyle = sky; x.fillRect(0, 0, W, H);
    const sx = (a) => W / 2 - Math.atan2(Math.sin(a - view.yaw), Math.cos(a - view.yaw)) * ppr;
    // mặt trời
    x.fillStyle = 'rgba(255,240,200,0.9)'; x.beginPath(); x.arc(sx(0.6), horizon - 0.5 * ppr, 0.06 * ppr, 0, Math.PI * 2); x.fill();
    // núi xa
    x.fillStyle = '#9b6b4a';
    x.beginPath(); x.moveTo(0, horizon);
    for (let px = 0; px <= W; px += 8) {
      const a = view.yaw + ((W / 2 - px) / ppr);
      x.lineTo(px, horizon - (Math.sin(a * 3) * 0.04 + Math.sin(a * 7 + 1) * 0.02 + 0.06) * ppr);
    }
    x.lineTo(W, horizon); x.fill();
    // tàn tích cột đá
    [[1.2, 0.18], [1.35, 0.12], [2.6, 0.22], [-1.0, 0.15], [-2.4, 0.2], [3.4, 0.1]].forEach(([a, hgt]) => {
      const px = sx(a);
      if (px < -60 || px > W + 60) return;
      x.fillStyle = '#c9a77a'; x.fillRect(px - 0.02 * ppr, horizon - hgt * ppr, 0.04 * ppr, hgt * ppr);
      x.fillStyle = '#b08e62'; x.fillRect(px - 0.03 * ppr, horizon - hgt * ppr, 0.06 * ppr, 0.012 * ppr);
    });
    // đất
    const ground = x.createLinearGradient(0, horizon, 0, H);
    ground.addColorStop(0, '#c99d68'); ground.addColorStop(1, '#7a5130');
    x.fillStyle = ground; x.fillRect(0, horizon, W, Math.max(0, H - horizon));
    x.strokeStyle = 'rgba(90,60,30,0.35)'; x.lineWidth = 1;
    for (let i = 1; i < 12; i++) { const y = horizon + (H - horizon) * (i / 12) ** 1.6; x.beginPath(); x.moveTo(0, y); x.lineTo(W, y); x.stroke(); }
  }

  // ---------- Tìm thấy! ----------
  function found(pt) {
    if (st.paused) return;
    st.paused = true;
    G.Sound.lock(); G.vibrate([80, 50, 80]);
    const burst = document.createElement('div');
    burst.className = 'found-burst';
    burst.style.left = (pt ? pt.x : innerWidth / 2) + 'px';
    burst.style.top = (pt ? pt.y : innerHeight / 2) + 'px';
    burst.innerHTML = '<span>Phát hiện cổ vật!</span>';
    el.expedition.appendChild(burst);
    setTimeout(() => {
      burst.remove();
      const art = st.art;
      G.Excavation.open(art, {
        onDone: (res) => finish(res),
        onCancel: () => {
          st.paused = false; st.lock = 0;
          if (st.mode === 'signal') makeTarget();
          if (st.mode === 'photo' && st.photo) st.photo.dets = st.photo.dets.filter((d) => !d.target);
        },
      });
    }, 1100);
  }

  function finish({ integrity, seconds }) {
    const art = st.art;
    const aiBonus = !st.usedSignal;
    const speed = seconds < 45 ? 1.1 : 1;
    const score = Math.round(art.value * (integrity / 100) * (aiBonus ? 1.2 : 1) * speed);
    const result = G.Store.recordFind(art.id, { integrity, score, byAI: aiBonus });
    stop();
    G.UI.showDiscovery(art, { integrity, score, aiBonus, speedBonus: speed > 1, ...result });
  }

  return { init, start, stop, get state() { return st; } };
})();
