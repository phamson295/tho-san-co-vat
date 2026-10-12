/* Mini-game khai quật: dùng xẻng và cọ gạt lớp đất để lộ cổ vật mà không làm vỡ nó. */
window.G = window.G || {};

G.Excavation = (() => {
  const TOOLS = {
    shovel: { radius: 0.1, strength: 0.6, spacing: 0.07 }, // radius/spacing tính theo cạnh hố
    brush: { radius: 0.055, strength: 0.07, spacing: 0.013 }, // cọ gạt đất dày rất chậm
  };
  const DONE_AT = 0.9;

  function paintDirt(x, S) {
    const layers = ['#6b4a2b', '#7a5532', '#5e3f24', '#8a6238', '#6f4c2c'];
    const band = S / layers.length;
    layers.forEach((c, i) => {
      x.fillStyle = c;
      x.beginPath();
      x.moveTo(0, i * band - 6);
      for (let px = 0; px <= S; px += 12) x.lineTo(px, i * band + Math.sin(px * 0.03 + i) * 8);
      x.lineTo(S, S); x.lineTo(0, S); x.closePath(); x.fill();
    });
    for (let i = 0; i < 2600; i++) { // hạt đất
      x.fillStyle = Math.random() < 0.5 ? 'rgba(40,25,12,0.45)' : 'rgba(180,140,95,0.35)';
      x.fillRect(Math.random() * S, Math.random() * S, 1 + Math.random() * 2.5, 1 + Math.random() * 2.5);
    }
    for (let i = 0; i < 26; i++) { // sỏi
      const px = Math.random() * S, py = Math.random() * S, r = 3 + Math.random() * 8;
      x.fillStyle = `hsl(30, ${10 + Math.random() * 15}%, ${35 + Math.random() * 25}%)`;
      x.beginPath(); x.ellipse(px, py, r, r * 0.7, Math.random() * 3, 0, Math.PI * 2); x.fill();
    }
    x.strokeStyle = 'rgba(45,30,15,0.6)'; x.lineWidth = 2; // rễ cây
    for (let i = 0; i < 5; i++) {
      let px = Math.random() * S, py = 0;
      x.beginPath(); x.moveTo(px, py);
      for (let k = 0; k < 8; k++) { px += (Math.random() - 0.5) * 40; py += S / 16; x.lineTo(px, py); }
      x.stroke();
    }
  }

  // Lớp bụi cát mịn phủ sát cổ vật (vùng lõi hình elip).
  function paintDust(x, core) {
    x.save();
    x.translate(core.cx, core.cy);
    x.scale(core.rx * 1.18, core.ry * 1.18);
    const g = x.createRadialGradient(0, 0, 0, 0, 0, 1);
    g.addColorStop(0, '#b8925f'); g.addColorStop(0.85, '#a7814f'); g.addColorStop(1, 'rgba(150,115,70,0)');
    x.fillStyle = g;
    x.beginPath(); x.arc(0, 0, 1, 0, Math.PI * 2); x.fill();
    x.restore();
    for (let i = 0; i < 1400; i++) {
      const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random());
      x.fillStyle = Math.random() < 0.5 ? 'rgba(90,65,35,0.35)' : 'rgba(230,200,150,0.35)';
      x.fillRect(core.cx + Math.cos(a) * r * core.rx * 1.1, core.cy + Math.sin(a) * r * core.ry * 1.1, 1.5, 1.5);
    }
  }

  function drawCrack(x, cx, cy) {
    x.strokeStyle = 'rgba(20,10,5,0.85)'; x.lineWidth = 2;
    for (let b = 0; b < 3; b++) {
      let px = cx, py = cy, a = Math.random() * Math.PI * 2;
      x.beginPath(); x.moveTo(px, py);
      for (let k = 0; k < 5; k++) { a += (Math.random() - 0.5) * 1.2; px += Math.cos(a) * 9; py += Math.sin(a) * 9; x.lineTo(px, py); }
      x.stroke();
    }
  }

  function open(art, { onDone, onCancel }) {
    const S = Math.round(Math.min(window.innerWidth - 32, window.innerHeight * 0.5, 440));
    const root = document.createElement('div');
    root.className = 'modal-backdrop dig-backdrop';
    root.innerHTML = `
      <div class="modal dig-modal" role="dialog" aria-label="Khai quật">
        <div class="dig-head">
          <div><div class="eyebrow">Hố khai quật</div><h3>${art.name}</h3></div>
          <div class="dig-stats">
            <div><span>Lộ diện</span><b data-k="prog">0%</b></div>
            <div><span>Nguyên vẹn</span><b data-k="int">100%</b></div>
            <div><span>Thời gian</span><b data-k="time">0s</b></div>
          </div>
        </div>
        <div class="pit" style="width:${S}px;height:${S}px">
          <canvas class="pit-model"></canvas>
          <canvas class="pit-crack" width="${S}" height="${S}"></canvas>
          <canvas class="pit-dust" width="${S}" height="${S}"></canvas>
          <canvas class="pit-dirt" width="${S}" height="${S}"></canvas>
          <div class="pit-flash"></div>
        </div>
        <div class="dig-tools">
          <button class="tool" data-tool="shovel">⛏️ Xẻng<small>Nhanh – dễ làm vỡ</small></button>
          <button class="tool active" data-tool="brush">🖌️ Cọ<small>Chậm – an toàn</small></button>
        </div>
        <p class="dig-tip">Mẹo: dùng xẻng xúc lớp đất nâu dày. Khi thấy lớp cát vàng nhạt bao quanh cổ vật, đổi sang cọ – xẻng chạm vào lớp cát sẽ làm cổ vật nứt vỡ!</p>
        <button class="btn ghost small" data-act="cancel">Rời hố khai quật</button>
      </div>`;
    document.getElementById('modal-root').appendChild(root);

    const $ = (s) => root.querySelector(s);
    const dirt = $('.pit-dirt'), dx = dirt.getContext('2d', { willReadFrequently: true });
    const ux = $('.pit-dust').getContext('2d', { willReadFrequently: true });
    const crack = $('.pit-crack').getContext('2d');
    paintDirt(dx, S);
    const viewer = new G.Viewer($('.pit-model'), { autoRotate: false, interactive: false, pitch: 0.55 });
    viewer.setModel(art.id);
    viewer.zoom = 1.05;

    let tool = 'brush', integrity = 100, progress = 0, finished = false;
    const t0 = performance.now();
    let lastSound = 0, lastDamage = 0, lastPt = null;
    const core = { cx: S / 2, cy: S / 2, rx: S * 0.3, ry: S * 0.34 };
    const inCore = (px, py) => ((px - core.cx) / core.rx) ** 2 + ((py - core.cy) / core.ry) ** 2 <= 1;
    paintDust(ux, core);

    root.querySelectorAll('[data-tool]').forEach((b) => b.addEventListener('click', () => {
      tool = b.dataset.tool;
      root.querySelectorAll('[data-tool]').forEach((o) => o.classList.toggle('active', o === b));
      G.Sound.click();
    }));
    $('[data-act="cancel"]').addEventListener('click', () => { cleanup(); onCancel && onCancel(); });

    const alphaAt = (ctx, px, py) => ctx.getImageData(Math.max(0, Math.min(S - 1, px | 0)), Math.max(0, Math.min(S - 1, py | 0)), 1, 1).data[3];

    function erase(ctx, px, py, radius, strength, hard) {
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      const g = ctx.createRadialGradient(px, py, 0, px, py, radius);
      g.addColorStop(0, `rgba(0,0,0,${strength})`);
      g.addColorStop(hard ? 0.7 : 0.4, `rgba(0,0,0,${strength * 0.8})`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(px - radius, py - radius, radius * 2, radius * 2);
      ctx.restore();
    }

    // Hai lớp: đất dày (xẻng đào nhanh) và lớp bụi mịn bám sát cổ vật (chỉ cọ mới làm sạch an toàn).
    function dab(px, py) {
      const t = TOOLS[tool];
      const a = alphaAt(dx, px, py);
      const thin = a < 110; // lớp đất dày tại điểm này đã mỏng
      erase(dx, px, py, t.radius * S, t.strength, tool === 'shovel');
      if (!thin) return;
      if (tool === 'brush') { erase(ux, px, py, t.radius * S, 0.22, false); return; }
      if (a > 30 || !inCore(px, py)) return;
      // Xẻng xúc xuyên hết lớp đất, chọc vào lớp cát sát cổ vật → nứt vỡ.
      erase(ux, px, py, t.radius * S * 0.7, 0.3, true);
      const now = performance.now();
      if (now - lastDamage > 100) {
        lastDamage = now;
        integrity = Math.max(15, integrity - 2);
        drawCrack(crack, px, py);
        G.Sound.crack(); G.vibrate(40);
        const f = $('.pit-flash'); f.classList.remove('on'); void f.offsetWidth; f.classList.add('on');
        updateStats();
      }
    }

    function stroke(px, py) {
      const t = TOOLS[tool];
      if (lastPt) {
        const d = Math.hypot(px - lastPt.x, py - lastPt.y);
        const n = Math.max(1, Math.floor(d / (t.spacing * S)));
        for (let i = 1; i <= n; i++) dab(lastPt.x + ((px - lastPt.x) * i) / n, lastPt.y + ((py - lastPt.y) * i) / n);
      } else dab(px, py);
      lastPt = { x: px, y: py };
      const now = performance.now();
      if (now - lastSound > (tool === 'brush' ? 110 : 200)) { lastSound = now; tool === 'brush' ? G.Sound.brush() : G.Sound.dig(); }
    }

    const pos = (e) => { const r = dirt.getBoundingClientRect(); return { x: ((e.clientX - r.left) / r.width) * S, y: ((e.clientY - r.top) / r.height) * S }; };
    let down = false;
    dirt.addEventListener('pointerdown', (e) => { if (finished) return; down = true; lastPt = null; dirt.setPointerCapture(e.pointerId); const p = pos(e); stroke(p.x, p.y); });
    dirt.addEventListener('pointermove', (e) => { if (!down || finished) return; const p = pos(e); stroke(p.x, p.y); });
    const up = () => { down = false; lastPt = null; };
    dirt.addEventListener('pointerup', up); dirt.addEventListener('pointercancel', up);

    function measure() {
      const top = dx.getImageData(0, 0, S, S).data, dust = ux.getImageData(0, 0, S, S).data;
      let total = 0, clear = 0;
      for (let py = 0; py < S; py += 6) for (let px = 0; px < S; px += 6) {
        if (!inCore(px, py)) continue;
        total++;
        const i = (py * S + px) * 4 + 3;
        if (top[i] < 40 && dust[i] < 40) clear++;
      }
      return total ? clear / total : 0;
    }

    function updateStats() {
      $('[data-k="prog"]').textContent = Math.round(Math.min(1, progress / DONE_AT) * 100) + '%';
      const ib = $('[data-k="int"]');
      ib.textContent = integrity + '%';
      ib.className = integrity >= 80 ? 'good' : integrity >= 50 ? 'warn' : 'bad';
    }

    const timer = setInterval(() => {
      if (finished) return;
      $('[data-k="time"]').textContent = Math.round((performance.now() - t0) / 1000) + 's';
      progress = measure();
      updateStats();
      if (progress >= DONE_AT) complete();
    }, 200);

    function complete() {
      finished = true;
      const seconds = (performance.now() - t0) / 1000;
      $('.pit').classList.add('cleared');
      viewer.autoRotate = true;
      G.Sound.success(); G.vibrate([60, 40, 120]);
      root.querySelector('.dig-tip').textContent = 'Tuyệt vời! Cổ vật đã lộ diện hoàn toàn.';
      setTimeout(() => { cleanup(); onDone({ integrity, seconds }); }, 1500);
    }

    function cleanup() {
      clearInterval(timer);
      viewer.dispose();
      root.remove();
    }
  }

  return { open };
})();
