/* Mô hình 3D thủ tục (procedural) cho từng cổ vật – dựng bằng Three.js, không cần file mô hình. */
window.G = window.G || {};

G.Models = (() => {
  const T = THREE;
  const TAU = Math.PI * 2;

  // ---------- tiện ích ----------
  function rng(seed) { // mulberry32: texture giống nhau mỗi lần dựng
    let a = seed >>> 0;
    return () => {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function tex(w, h, draw, { repeat = false, alpha = false } = {}) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const x = c.getContext('2d');
    if (!alpha) { x.fillStyle = '#888'; x.fillRect(0, 0, w, h); }
    draw(x, w, h);
    const t = new T.CanvasTexture(c);
    t.encoding = T.sRGBEncoding;
    t.anisotropy = 4;
    if (repeat) t.wrapS = t.wrapT = T.RepeatWrapping;
    return t;
  }

  const std = (o) => new T.MeshStandardMaterial({ roughness: 0.6, metalness: 0, ...o });

  function mesh(geo, material, pos, rot, scale) {
    const m = new T.Mesh(geo, material);
    if (pos) m.position.set(...pos);
    if (rot) m.rotation.set(...rot);
    if (scale) m.scale.set(...scale);
    m.castShadow = true;
    return m;
  }

  function lathe(ctrl, n = 72, segs = 72) {
    const curve = new T.SplineCurve(ctrl.map(([r, y]) => new T.Vector2(r, y)));
    return new T.LatheGeometry(curve.getSpacedPoints(n), segs);
  }

  function blotches(x, w, h, r, colors, count, size) {
    for (let i = 0; i < count; i++) {
      const cx = r() * w, cy = r() * h, s = size * (0.3 + r());
      const g = x.createRadialGradient(cx, cy, 0, cx, cy, s);
      const c = colors[Math.floor(r() * colors.length)];
      g.addColorStop(0, c); g.addColorStop(1, 'rgba(0,0,0,0)');
      x.fillStyle = g;
      x.fillRect(cx - s, cy - s, s * 2, s * 2);
    }
  }

  function speckle(x, w, h, r, colors, count, size = 1.5) {
    for (let i = 0; i < count; i++) {
      x.fillStyle = colors[Math.floor(r() * colors.length)];
      x.fillRect(r() * w, r() * h, size * (0.5 + r()), size * (0.5 + r()));
    }
  }

  function hband(x, w, y, color, lw = 3) {
    x.strokeStyle = color; x.lineWidth = lw;
    x.beginPath(); x.moveTo(0, y); x.lineTo(w, y); x.stroke();
  }

  // Vẽ quanh tâm (cx,cy) ở bán kính rad, góc a – dùng cho hoa văn đồng tâm.
  function atPolar(x, cx, cy, rad, a, fn) {
    x.save(); x.translate(cx, cy); x.rotate(a); x.translate(0, -rad); fn(); x.restore();
  }

  // ---------- 1. Trống đồng Ngọc Lũ ----------
  function drum() {
    const g = new T.Group();
    const r = rng(7);
    const bronze = '#8c6a3b', dark = '#4a3417', light = '#c8a15e';

    const side = tex(1024, 512, (x, w, h) => {
      x.fillStyle = bronze; x.fillRect(0, 0, w, h);
      blotches(x, w, h, r, ['rgba(70,130,100,0.55)', 'rgba(40,90,70,0.5)', 'rgba(200,160,90,0.35)'], 90, 60);
      // Băng hoa văn trên tang trống: vòng tròn tiếp tuyến + thuyền
      [[20, 60], [150, 175], [290, 315]].forEach(([a, b]) => { hband(x, w, a, dark); hband(x, w, b, dark); });
      for (let i = 0; i < 48; i++) {
        const cx = (i + 0.5) * (w / 48);
        x.strokeStyle = dark; x.lineWidth = 2;
        x.beginPath(); x.arc(cx, 40, 8, 0, TAU); x.stroke();
        x.fillStyle = dark; x.beginPath(); x.arc(cx, 40, 2.5, 0, TAU); x.fill();
      }
      for (let i = 0; i < 6; i++) { // thuyền
        const cx = (i + 0.5) * (w / 6);
        x.strokeStyle = dark; x.lineWidth = 4;
        x.beginPath(); x.moveTo(cx - 60, 100); x.quadraticCurveTo(cx, 140, cx + 60, 100); x.stroke();
        x.beginPath(); x.moveTo(cx - 60, 100); x.lineTo(cx - 70, 80); x.moveTo(cx + 60, 100); x.lineTo(cx + 72, 78); x.stroke();
        for (let k = -2; k <= 2; k++) { // người chèo thuyền đội mũ lông chim
          x.beginPath(); x.moveTo(cx + k * 18, 118); x.lineTo(cx + k * 18, 92); x.stroke();
          x.beginPath(); x.moveTo(cx + k * 18, 92); x.lineTo(cx + k * 18 - 8, 78); x.stroke();
        }
      }
      for (let i = 0; i < 40; i++) { // răng cưa
        const x0 = i * (w / 40);
        x.fillStyle = dark; x.beginPath(); x.moveTo(x0, 175); x.lineTo(x0 + w / 80, 160); x.lineTo(x0 + w / 40, 175); x.fill();
      }
      // Lưng trống: ô chữ nhật người múa
      for (let i = 0; i < 12; i++) {
        const x0 = i * (w / 12);
        x.strokeStyle = dark; x.lineWidth = 3;
        x.strokeRect(x0 + 6, 195, w / 12 - 12, 85);
        x.beginPath(); x.arc(x0 + w / 24, 220, 7, 0, TAU); x.stroke();
        x.beginPath(); x.moveTo(x0 + w / 24, 227); x.lineTo(x0 + w / 24, 255);
        x.moveTo(x0 + w / 24 - 14, 240); x.lineTo(x0 + w / 24 + 14, 236);
        x.moveTo(x0 + w / 24, 255); x.lineTo(x0 + w / 24 - 10, 272); x.moveTo(x0 + w / 24, 255); x.lineTo(x0 + w / 24 + 10, 272);
        x.moveTo(x0 + w / 24, 213); x.lineTo(x0 + w / 24 + 16, 200);
        x.stroke();
      }
      speckle(x, w, h, r, ['rgba(30,20,10,0.35)', 'rgba(220,190,120,0.25)'], 2500);
    });
    const body = mesh(
      lathe([[1.0, 0], [0.95, 0.15], [0.85, 0.38], [0.8, 0.62], [0.8, 0.95], [0.9, 1.2], [1.02, 1.45], [1.05, 1.62], [1.02, 1.74]]),
      std({ map: side, metalness: 0.5, roughness: 0.5, side: T.DoubleSide }),
    );
    g.add(body);

    const top = tex(1024, 1024, (x, w, h) => {
      const c = w / 2;
      x.fillStyle = '#111'; x.fillRect(0, 0, w, h);
      x.fillStyle = bronze; x.beginPath(); x.arc(c, c, 510, 0, TAU); x.fill();
      blotches(x, w, h, r, ['rgba(70,130,100,0.5)', 'rgba(40,95,72,0.45)'], 70, 90);
      // ngôi sao 14 cánh
      x.fillStyle = light; x.beginPath();
      for (let i = 0; i < 28; i++) {
        const a = (i / 28) * TAU, rad = i % 2 ? 48 : 125;
        x.lineTo(c + Math.sin(a) * rad, c - Math.cos(a) * rad);
      }
      x.closePath(); x.fill();
      x.fillStyle = '#d9b673'; x.beginPath(); x.arc(c, c, 38, 0, TAU); x.fill();
      x.strokeStyle = dark; x.lineWidth = 3;
      [135, 150, 178, 188, 250, 260, 292, 302, 372, 384, 440, 452, 482, 494].forEach((rad) => { x.beginPath(); x.arc(c, c, rad, 0, TAU); x.stroke(); });
      // vòng tròn chấm
      for (let i = 0; i < 44; i++) atPolar(x, c, c, 164, (i / 44) * TAU, () => {
        x.beginPath(); x.arc(0, 0, 9, 0, TAU); x.stroke(); x.fillStyle = dark; x.beginPath(); x.arc(0, 0, 3, 0, TAU); x.fill();
      });
      // người hóa trang lông chim & nhà sàn
      for (let i = 0; i < 20; i++) atPolar(x, c, c, 220, (i / 20) * TAU, () => {
        x.lineWidth = 4;
        if (i % 5 === 0) { // nhà sàn mái cong
          x.beginPath(); x.moveTo(-26, 10); x.quadraticCurveTo(0, -40, 26, 10); x.stroke();
          x.beginPath(); x.moveTo(-18, 10); x.lineTo(-18, 26); x.moveTo(18, 10); x.lineTo(18, 26); x.moveTo(-22, 16); x.lineTo(22, 16); x.stroke();
        } else {
          x.beginPath(); x.arc(0, -6, 5, 0, TAU); x.stroke();
          x.beginPath(); x.moveTo(0, -1); x.lineTo(0, 16); x.moveTo(-9, 6); x.lineTo(9, 4);
          x.moveTo(0, 16); x.lineTo(-7, 26); x.moveTo(0, 16); x.lineTo(7, 26); x.stroke();
          x.beginPath(); x.moveTo(0, -11); x.lineTo(-14, -28); x.moveTo(0, -11); x.lineTo(-4, -30); x.moveTo(0, -11); x.lineTo(8, -27); x.stroke();
        }
      });
      // răng cưa
      for (let i = 0; i < 90; i++) atPolar(x, c, c, 297, (i / 90) * TAU, () => {
        x.fillStyle = dark; x.beginPath(); x.moveTo(-8, 5); x.lineTo(0, -5); x.lineTo(8, 5); x.fill();
      });
      // chim Lạc bay
      for (let i = 0; i < 14; i++) atPolar(x, c, c, 340, (i / 14) * TAU + 0.1, () => {
        x.rotate(Math.PI / 2);
        x.fillStyle = dark;
        x.beginPath(); x.ellipse(0, 0, 26, 8, 0, 0, TAU); x.fill();
        x.beginPath(); x.moveTo(24, -2); x.lineTo(62, 0); x.lineTo(24, 3); x.fill(); // mỏ dài
        x.beginPath(); x.moveTo(-8, 0); x.lineTo(6, -26); x.lineTo(12, -2); x.fill(); // cánh
        x.beginPath(); x.moveTo(-8, 0); x.lineTo(6, 26); x.lineTo(12, 2); x.fill();
        x.beginPath(); x.moveTo(-24, 0); x.lineTo(-44, -10); x.lineTo(-44, 10); x.fill(); // đuôi
      });
      for (let i = 0; i < 60; i++) atPolar(x, c, c, 412, (i / 60) * TAU, () => {
        x.beginPath(); x.arc(0, 0, 11, 0, TAU); x.stroke(); x.fillStyle = dark; x.beginPath(); x.arc(0, 0, 3.5, 0, TAU); x.fill();
      });
      for (let i = 0; i < 160; i++) atPolar(x, c, c, 467, (i / 160) * TAU, () => {
        x.lineWidth = 2; x.beginPath(); x.moveTo(-6, -10); x.lineTo(6, 10); x.stroke();
      });
      speckle(x, w, h, r, ['rgba(30,20,10,0.3)', 'rgba(230,200,130,0.25)'], 4000);
    });
    const face = mesh(new T.CircleGeometry(1.1, 96), std({ map: top, metalness: 0.5, roughness: 0.5 }), [0, 1.765, 0], [-Math.PI / 2, 0, 0]);
    g.add(face);
    g.add(mesh(new T.CylinderGeometry(1.1, 1.08, 0.05, 96, 1, true), std({ color: 0x7a5c33, metalness: 0.5, roughness: 0.5, side: T.DoubleSide }), [0, 1.74, 0]));

    const handleMat = std({ color: 0x6f5a35, metalness: 0.5, roughness: 0.55 });
    [0.3, -0.3, Math.PI + 0.3, Math.PI - 0.3].forEach((a) => {
      const hnd = mesh(new T.TorusGeometry(0.15, 0.035, 8, 20, Math.PI), handleMat,
        [Math.sin(a) * 0.84, 1.08, Math.cos(a) * 0.84], [0, a - Math.PI / 2, -Math.PI / 2]);
      g.add(hnd);
    });
    g.rotation.x = 0.4; // nghiêng mặt trống về phía người xem
    return g;
  }

  // ---------- 2. Bình gốm hoa lam Chu Đậu ----------
  function vase() {
    const g = new T.Group();
    const r = rng(21);
    const blue = '#24468a', cream = '#efe9d8';
    const t = tex(1024, 1024, (x, w, h) => {
      x.fillStyle = cream; x.fillRect(0, 0, w, h);
      blotches(x, w, h, r, ['rgba(210,195,160,0.35)'], 40, 80);
      x.strokeStyle = blue; x.fillStyle = blue;
      // miệng & cổ: lá chuối
      hband(x, w, 30, blue, 5); hband(x, w, 300, blue, 5);
      for (let i = 0; i < 12; i++) {
        const cx = (i + 0.5) * (w / 12);
        x.lineWidth = 3;
        x.beginPath(); x.moveTo(cx - 34, 290); x.quadraticCurveTo(cx - 20, 120, cx, 60); x.quadraticCurveTo(cx + 20, 120, cx + 34, 290); x.stroke();
        x.beginPath(); x.moveTo(cx, 70); x.lineTo(cx, 285); x.stroke();
        for (let k = 0; k < 7; k++) { x.beginPath(); x.moveTo(cx, 110 + k * 25); x.lineTo(cx - 18, 125 + k * 25); x.moveTo(cx, 110 + k * 25); x.lineTo(cx + 18, 125 + k * 25); x.stroke(); }
      }
      // vai: cánh sen như ý
      hband(x, w, 320, blue, 4); hband(x, w, 410, blue, 4);
      for (let i = 0; i < 8; i++) {
        const cx = (i + 0.5) * (w / 8);
        x.lineWidth = 4;
        x.beginPath(); x.moveTo(cx - 55, 322); x.quadraticCurveTo(cx - 60, 380, cx, 400); x.quadraticCurveTo(cx + 60, 380, cx + 55, 322); x.stroke();
        x.beginPath(); x.arc(cx, 360, 14, 0, TAU); x.fill();
      }
      // thân: hoa mẫu đơn dây leo
      hband(x, w, 430, blue, 5); hband(x, w, 760, blue, 5);
      x.lineWidth = 5;
      x.beginPath();
      for (let px = 0; px <= w; px += 4) x.lineTo(px, 595 + Math.sin((px / w) * TAU * 3) * 90);
      x.stroke();
      for (let i = 0; i < 6; i++) {
        const cx = (i + 0.25) * (w / 6) + 40, cy = 595 + Math.sin(((cx) / w) * TAU * 3) * 90;
        for (let k = 5; k >= 1; k--) {
          x.fillStyle = k % 2 ? blue : cream;
          x.beginPath(); x.ellipse(cx, cy, 16 + k * 11, 10 + k * 8, 0, Math.PI, TAU); x.fill();
        }
        x.fillStyle = blue; x.beginPath(); x.arc(cx, cy + 4, 14, 0, TAU); x.fill();
        for (let k = 0; k < 3; k++) { // lá
          const lx = cx + 70 + k * 18, ly = cy + (k % 2 ? 45 : -45);
          x.beginPath(); x.ellipse(lx, ly, 28, 11, k % 2 ? 0.6 : -0.6, 0, TAU); x.fill();
        }
      }
      // chân: cánh sen
      hband(x, w, 780, blue, 4); hband(x, w, 930, blue, 4);
      for (let i = 0; i < 16; i++) {
        const cx = (i + 0.5) * (w / 16);
        x.lineWidth = 3;
        x.beginPath(); x.moveTo(cx - 28, 925); x.lineTo(cx - 28, 820); x.quadraticCurveTo(cx, 770, cx + 28, 820); x.lineTo(cx + 28, 925); x.stroke();
        x.beginPath(); x.moveTo(cx - 14, 920); x.lineTo(cx - 14, 835); x.quadraticCurveTo(cx, 812, cx + 14, 835); x.lineTo(cx + 14, 920); x.stroke();
      }
      x.fillStyle = 'rgba(120,90,60,0.6)'; x.fillRect(0, 990, w, 34); // chân đế mộc
      speckle(x, w, h, r, ['rgba(40,60,120,0.25)', 'rgba(150,130,90,0.25)'], 1500);
    });
    const glaze = new T.MeshPhysicalMaterial({ map: t, roughness: 0.28, clearcoat: 0.8, clearcoatRoughness: 0.15, side: T.DoubleSide });
    g.add(mesh(lathe([[0.4, 0], [0.45, 0.08], [0.62, 0.32], [0.8, 0.7], [0.85, 0.95], [0.76, 1.3], [0.52, 1.6], [0.3, 1.86], [0.26, 2.1], [0.3, 2.3], [0.4, 2.42]], 90), glaze));
    g.add(mesh(new T.CircleGeometry(0.4, 48), std({ color: 0x9a7a55, roughness: 0.9 }), [0, 0.005, 0], [Math.PI / 2, 0, 0]));
    return g;
  }

  // ---------- 3. Phiến đá Rosetta ----------
  function rosetta() {
    const g = new T.Group();
    const r = rng(3);
    const granite = tex(256, 256, (x, w, h) => {
      x.fillStyle = '#2d2c30'; x.fillRect(0, 0, w, h);
      speckle(x, w, h, r, ['#1b1a1d', '#4a474d', '#5e5a60', '#7a6f6a'], 3000, 2);
    }, { repeat: true });
    granite.repeat.set(2, 2);
    const s = new T.Shape();
    [[-0.7, 0], [0.7, 0], [0.73, 1.52], [0.58, 1.66], [0.38, 1.6], [0.16, 1.86], [-0.12, 1.74], [-0.38, 1.8], [-0.58, 1.55], [-0.72, 1.4]]
      .forEach(([px, py], i) => (i ? s.lineTo(px, py) : s.moveTo(px, py)));
    s.closePath();
    const geo = new T.ExtrudeGeometry(s, { depth: 0.42, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 2 });
    g.add(mesh(geo, std({ map: granite, roughness: 0.75, metalness: 0.05 })));

    const ins = tex(520, 576, (x, w, h) => {
      x.clearRect(0, 0, w, h);
      const ink = 'rgba(205,205,210,0.8)';
      x.strokeStyle = ink; x.fillStyle = ink; x.lineWidth = 2;
      // Chữ tượng hình (phần trên, bị vỡ)
      for (let row = 0; row < 7; row++) {
        const y = 40 + row * 24;
        for (let col = 0; col < 22; col++) {
          const cx = 20 + col * 22.5;
          if (row < 2 && (cx < 140 + row * 60 || cx > 420 - row * 40)) continue; // mép vỡ
          const k = Math.floor(r() * 6);
          x.beginPath();
          if (k === 0) x.arc(cx, y, 6, 0, TAU);
          else if (k === 1) { x.moveTo(cx - 7, y + 6); x.lineTo(cx, y - 7); x.lineTo(cx + 7, y + 6); }
          else if (k === 2) { for (let q = 0; q < 4; q++) x.lineTo(cx - 8 + q * 5, y + (q % 2 ? -3 : 3)); }
          else if (k === 3) { x.moveTo(cx, y - 8); x.lineTo(cx, y + 8); x.moveTo(cx - 5, y - 2); x.lineTo(cx + 5, y - 2); }
          else if (k === 4) { x.ellipse(cx, y, 8, 4, 0, 0, TAU); x.moveTo(cx + 2, y); x.arc(cx, y, 2, 0, TAU); }
          else { x.moveTo(cx - 6, y + 6); x.quadraticCurveTo(cx - 6, y - 8, cx + 6, y - 6); x.lineTo(cx + 2, y + 6); }
          x.stroke();
        }
      }
      // Chữ Demotic
      for (let row = 0; row < 13; row++) {
        const y = 222 + row * 13;
        x.beginPath(); x.moveTo(18, y);
        for (let px = 18; px < w - 18; px += 5) x.lineTo(px, y + (r() - 0.5) * 8);
        x.lineWidth = 1.6; x.stroke();
      }
      // Chữ Hy Lạp
      const greek = 'ΒΑΣΙΛΕΥΟΝΤΟΣ ΤΟΥ ΝΕΟΥ ΚΑΙ ΠΑΡΑΛΑΒΟΝΤΟΣ ΤΗΝ ΒΑΣΙΛΕΙΑΝ ΠΑΡΑ ΤΟΥ ΠΑΤΡΟΣ ΚΥΡΙΟΥ ΒΑΣΙΛΕΙΩΝ ΜΕΓΑΛΟΔΟΞΟΥ ';
      x.font = '11px "Times New Roman", serif';
      for (let row = 0; row < 19; row++) {
        const off = Math.floor(r() * greek.length);
        x.fillText((greek + greek).slice(off, off + 64), 16, 412 + row * 8.5);
      }
    }, { alpha: true });
    const plane = mesh(new T.PlaneGeometry(1.3, 1.44), new T.MeshStandardMaterial({
      map: ins, transparent: true, roughness: 0.9, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2,
    }), [0, 0.78, 0.452]);
    g.add(plane);
    return g;
  }

  // ---------- 4. Bùa bọ hung Scarab ----------
  function scarab() {
    const g = new T.Group();
    const r = rng(4);
    const t = tex(256, 256, (x, w, h) => {
      x.fillStyle = '#3aa6a0'; x.fillRect(0, 0, w, h);
      blotches(x, w, h, r, ['rgba(20,90,95,0.5)', 'rgba(150,220,200,0.4)', 'rgba(120,90,50,0.3)'], 30, 40);
      speckle(x, w, h, r, ['rgba(10,60,60,0.4)'], 600);
    });
    const faience = std({ map: t, roughness: 0.32, metalness: 0.05 });
    const darkF = std({ color: 0x1f6f6c, roughness: 0.45 });
    g.add(mesh(new T.CylinderGeometry(0.62, 0.66, 0.12, 48), std({ map: t, roughness: 0.5 }), [0, 0.06, 0.05], null, [1, 1, 1.45]));
    g.add(mesh(new T.SphereGeometry(0.5, 40, 24), faience, [0, 0.2, -0.15], null, [1, 0.6, 1.2])); // cánh
    g.add(mesh(new T.BoxGeometry(0.02, 0.04, 1.05), darkF, [0, 0.5, -0.17])); // đường chia cánh
    g.add(mesh(new T.SphereGeometry(0.42, 32, 20), faience, [0, 0.2, 0.52], null, [1.05, 0.55, 0.62])); // ngực
    g.add(mesh(new T.BoxGeometry(0.82, 0.03, 0.02), darkF, [0, 0.35, 0.3]));
    g.add(mesh(new T.SphereGeometry(0.28, 28, 16), faience, [0, 0.16, 0.86], null, [1.2, 0.5, 0.7])); // đầu
    for (let i = -2; i <= 2; i++) g.add(mesh(new T.BoxGeometry(0.06, 0.05, 0.12), darkF, [i * 0.08, 0.16, 1.04])); // răng cào
    [[-1, 0.5], [-1, 0.15], [-1, -0.35], [1, 0.5], [1, 0.15], [1, -0.35]].forEach(([sd, z]) => {
      g.add(mesh(new T.CylinderGeometry(0.035, 0.03, 0.32, 8), darkF, [sd * 0.55, 0.13, z], [0.2 * Math.sign(z), 0, sd * 1.2]));
    });
    g.rotation.x = 0.45; // nghiêng để thấy lưng bọ hung
    return g;
  }

  // ---------- 5. Cỗ máy Antikythera ----------
  function gearShape(R, n, toothH, spokes) {
    const s = new T.Shape();
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * TAU, st = TAU / n;
      const pts = [[R - toothH, a0], [R, a0 + st * 0.2], [R, a0 + st * 0.5], [R - toothH, a0 + st * 0.7]];
      pts.forEach(([rad, a], k) => {
        const px = Math.cos(a) * rad, py = Math.sin(a) * rad;
        if (i === 0 && k === 0) s.moveTo(px, py); else s.lineTo(px, py);
      });
    }
    s.closePath();
    const inner = R - toothH - 0.06, hub = R * 0.18;
    for (let k = 0; k < spokes; k++) {
      const a0 = (k / spokes) * TAU + 0.18, a1 = ((k + 1) / spokes) * TAU - 0.18;
      const hole = new T.Path();
      hole.absarc(0, 0, inner, a0, a1, false);
      hole.lineTo(Math.cos(a1) * hub, Math.sin(a1) * hub);
      hole.absarc(0, 0, hub, a1, a0, true);
      hole.closePath();
      s.holes.push(hole);
    }
    return s;
  }

  function antikythera() {
    const g = new T.Group();
    const r = rng(5);
    const pat = tex(256, 256, (x, w, h) => {
      x.fillStyle = '#5f7a55'; x.fillRect(0, 0, w, h);
      blotches(x, w, h, r, ['rgba(120,170,120,0.6)', 'rgba(70,55,30,0.6)', 'rgba(170,200,160,0.4)', 'rgba(40,60,40,0.6)'], 70, 40);
      speckle(x, w, h, r, ['rgba(20,30,20,0.5)', 'rgba(200,220,190,0.3)'], 2500, 2);
    }, { repeat: true });
    pat.repeat.set(1.5, 1.5);
    const corroded = std({ map: pat, roughness: 0.8, metalness: 0.3 });
    const slab = new T.Shape();
    [[-0.95, -0.7], [-0.2, -0.82], [0.7, -0.66], [0.98, -0.1], [0.85, 0.55], [0.4, 0.78], [-0.3, 0.7], [-0.82, 0.48], [-1.0, 0.0]]
      .forEach(([px, py], i) => (i ? slab.lineTo(px, py) : slab.moveTo(px, py)));
    slab.closePath();
    g.add(mesh(new T.ExtrudeGeometry(slab, { depth: 0.16, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.05, bevelSegments: 2 }), corroded));
    const gearMat = std({ map: pat, roughness: 0.5, metalness: 0.6, color: 0xe8c890 });
    const gears = [[0.62, 64, 4, -0.12, 0.0, 0.24], [0.28, 26, 4, 0.58, 0.38, 0.3], [0.2, 18, 3, 0.62, -0.36, 0.3], [0.16, 15, 3, -0.7, 0.42, 0.3]];
    gears.forEach(([R, n, sp, px, py, pz], i) => {
      const m = mesh(new T.ExtrudeGeometry(gearShape(R, n, 0.045, sp), { depth: 0.04, bevelEnabled: false, curveSegments: 6 }), gearMat, [px, py, pz]);
      m.rotation.z = i * 0.4;
      g.add(m);
      g.add(mesh(new T.CylinderGeometry(0.04, 0.04, 0.12, 12), gearMat, [px, py, pz + 0.03], [Math.PI / 2, 0, 0]));
    });
    // vành mặt số vỡ
    g.add(mesh(new T.TorusGeometry(0.85, 0.035, 8, 60, Math.PI * 0.7), gearMat, [0.05, -0.05, 0.26], [0, 0, 2.3]));
    g.rotation.x = -0.25;
    return g;
  }

  // ---------- 6. Bình Amphora hình đen ----------
  function amphora() {
    const g = new T.Group();
    const r = rng(6);
    const orange = '#c4632c', black = '#1d1512';
    const t = tex(1024, 1024, (x, w, h) => {
      x.fillStyle = orange; x.fillRect(0, 0, w, h);
      x.fillStyle = black; x.fillRect(0, 0, w, 300); // cổ đen
      x.fillRect(0, 760, w, 264); // chân đen
      // hoa văn ở cổ: hoa sen – cọ (palmette)
      x.strokeStyle = orange; x.lineWidth = 3;
      for (let i = 0; i < 10; i++) {
        const cx = (i + 0.5) * (w / 10);
        for (let k = -3; k <= 3; k++) { x.beginPath(); x.moveTo(cx, 250); x.quadraticCurveTo(cx + k * 10, 200, cx + k * 14, 170); x.stroke(); }
      }
      // dải meander (chữ triện Hy Lạp)
      x.fillStyle = orange; x.fillRect(0, 300, w, 60);
      x.strokeStyle = black; x.lineWidth = 6;
      for (let i = 0; i < 32; i++) {
        const x0 = i * 32;
        x.beginPath(); x.moveTo(x0, 350); x.lineTo(x0, 310); x.lineTo(x0 + 26, 310); x.lineTo(x0 + 26, 340); x.lineTo(x0 + 10, 340); x.lineTo(x0 + 10, 325); x.stroke();
      }
      // hai ô tranh hình đen: chiến binh đấu nhau (tâm ở u = 0.25 và 0.75)
      [0.25, 0.75].forEach((u, pi) => {
        const cx = u * w;
        x.fillStyle = black;
        [-1, 1].forEach((d) => {
          const fx = cx + d * 70;
          x.beginPath(); x.arc(fx, 450, 18, 0, TAU); x.fill(); // đầu
          x.beginPath(); x.moveTo(fx - 6 * d, 432); x.quadraticCurveTo(fx - 30 * d, 400, fx - 40 * d, 440); x.lineTo(fx - 10 * d, 440); x.fill(); // mào mũ
          x.fillRect(fx - 14, 468, 28, 110); // thân
          x.beginPath(); x.moveTo(fx - 12, 575); x.lineTo(fx - 40 * d, 690); x.lineTo(fx - 26 * d, 690); x.lineTo(fx, 590); x.fill();
          x.beginPath(); x.moveTo(fx + 8, 575); x.lineTo(fx + 30 * d, 690); x.lineTo(fx + 44 * d, 690); x.lineTo(fx + 16, 580); x.fill();
          x.beginPath(); x.arc(fx + d * 30, 520, 46, 0, TAU); x.fill(); // khiên
          x.strokeStyle = orange; x.lineWidth = 3; x.beginPath(); x.arc(fx + d * 30, 520, 36, 0, TAU); x.stroke();
          x.strokeStyle = black; x.lineWidth = 5; x.beginPath(); x.moveTo(fx - d * 10, 500); x.lineTo(fx + d * 150, 400 + pi * 30); x.stroke(); // giáo
        });
        x.fillStyle = 'rgba(160,30,20,0.6)'; x.beginPath(); x.arc(cx - 40, 520, 14, 0, TAU); x.arc(cx + 40, 520, 14, 0, TAU); x.fill();
      });
      // tia ở chân
      x.fillStyle = orange; x.fillRect(0, 700, w, 60);
      x.fillStyle = black;
      for (let i = 0; i < 40; i++) { const x0 = i * (w / 40); x.beginPath(); x.moveTo(x0, 760); x.lineTo(x0 + w / 80, 704); x.lineTo(x0 + w / 40, 760); x.fill(); }
      blotches(x, w, h, r, ['rgba(90,60,40,0.25)', 'rgba(240,200,160,0.2)'], 40, 60);
    });
    const body = mesh(lathe([[0.26, 0], [0.3, 0.08], [0.18, 0.25], [0.45, 0.6], [0.74, 1.1], [0.66, 1.55], [0.3, 1.85], [0.26, 2.2], [0.37, 2.32]], 80),
      std({ map: t, roughness: 0.55, side: T.DoubleSide }));
    body.rotation.y = -Math.PI / 2; // đưa ô tranh (u = 0.25) ra phía trước
    g.add(body);
    const black3 = std({ color: 0x1d1512, roughness: 0.5 });
    [-1, 1].forEach((d) => {
      const curve = new T.CatmullRomCurve3([
        new T.Vector3(d * 0.26, 2.12, 0), new T.Vector3(d * 0.52, 2.2, 0), new T.Vector3(d * 0.62, 1.95, 0), new T.Vector3(d * 0.56, 1.66, 0),
      ]);
      g.add(mesh(new T.TubeGeometry(curve, 30, 0.045, 10, false), black3));
    });
    return g;
  }

  // ---------- 7. Tượng binh mã ----------
  function warrior() {
    const g = new T.Group();
    const r = rng(8);
    const clay = (seed) => tex(256, 256, (x, w, h) => {
      x.fillStyle = '#8c8174'; x.fillRect(0, 0, w, h);
      blotches(x, w, h, rng(seed), ['rgba(70,60,50,0.4)', 'rgba(170,160,145,0.4)', 'rgba(160,60,50,0.18)'], 40, 30);
      speckle(x, w, h, r, ['rgba(40,35,30,0.4)', 'rgba(200,190,175,0.3)'], 1500);
    });
    const terr = std({ map: clay(1), roughness: 0.95 });
    const armorT = tex(512, 256, (x, w, h) => {
      x.fillStyle = '#7d7266'; x.fillRect(0, 0, w, h);
      x.strokeStyle = '#4c443b'; x.lineWidth = 3;
      for (let row = 0; row < 7; row++) for (let col = 0; col < 16; col++) {
        const px = col * 32 + (row % 2) * 16, py = 20 + row * 32;
        x.strokeRect(px + 2, py, 28, 28);
        x.fillStyle = '#5a5046'; x.beginPath(); x.arc(px + 16, py + 14, 3, 0, TAU); x.fill();
      }
      blotches(x, w, h, r, ['rgba(160,60,50,0.15)', 'rgba(40,35,30,0.3)'], 20, 40);
    });
    const armor = std({ map: armorT, roughness: 0.9 });
    const faceT = tex(512, 256, (x, w, h) => {
      x.fillStyle = '#93877a'; x.fillRect(0, 0, w, h);
      const cx = w * 0.25; // mặt trước của khối cầu (u = 0.25)
      x.fillStyle = '#3d362f';
      x.fillRect(0, 0, w, 62); // tóc
      x.beginPath(); x.ellipse(cx - 22, 112, 11, 4, 0, 0, TAU); x.ellipse(cx + 22, 112, 11, 4, 0, 0, TAU); x.fill();
      x.lineWidth = 4; x.strokeStyle = '#4b423a';
      x.beginPath(); x.moveTo(cx - 34, 98); x.lineTo(cx - 10, 96); x.moveTo(cx + 10, 96); x.lineTo(cx + 34, 98); x.stroke();
      x.beginPath(); x.moveTo(cx, 112); x.lineTo(cx - 4, 140); x.lineTo(cx + 4, 142); x.stroke();
      x.beginPath(); x.moveTo(cx - 24, 160); x.quadraticCurveTo(cx, 150, cx + 24, 160); x.stroke(); // ria mép
      x.beginPath(); x.moveTo(cx - 12, 172); x.lineTo(cx + 12, 172); x.stroke();
    });
    g.add(mesh(new T.BoxGeometry(0.9, 0.1, 0.7), terr, [0, 0.05, 0]));
    [-0.15, 0.15].forEach((lx) => {
      g.add(mesh(new T.CylinderGeometry(0.1, 0.11, 0.75, 16), terr, [lx, 0.47, 0]));
      g.add(mesh(new T.BoxGeometry(0.17, 0.08, 0.3), terr, [lx, 0.14, 0.05]));
    });
    g.add(mesh(lathe([[0.4, 0.82], [0.36, 1.0], [0.31, 1.22]], 10, 32), std({ map: clay(2), roughness: 0.95, side: T.DoubleSide }))); // vạt áo
    g.add(mesh(new T.CylinderGeometry(0.31, 0.29, 0.58, 32), armor, [0, 1.5, 0])); // giáp
    g.add(mesh(new T.CylinderGeometry(0.3, 0.3, 0.08, 32), terr, [0, 1.2, 0])); // đai lưng
    [-1, 1].forEach((d) => {
      g.add(mesh(new T.SphereGeometry(0.14, 16, 12), terr, [d * 0.33, 1.72, 0], null, [1, 0.8, 1]));
      g.add(mesh(new T.CylinderGeometry(0.075, 0.085, 0.42, 12), terr, [d * 0.38, 1.5, 0.02], [0, 0, d * 0.1]));
      g.add(mesh(new T.CylinderGeometry(0.065, 0.075, 0.36, 12), terr, [d * 0.32, 1.27, 0.17], [1.25, 0, 0]));
      g.add(mesh(new T.SphereGeometry(0.075, 12, 10), terr, [d * 0.28, 1.25, 0.36]));
    });
    g.add(mesh(new T.CylinderGeometry(0.08, 0.1, 0.12, 16), terr, [0, 1.84, 0]));
    const head = mesh(new T.SphereGeometry(0.18, 32, 24), std({ map: faceT, roughness: 0.95 }), [0, 2.02, 0], null, [0.92, 1.05, 1]);
    head.rotation.y = -Math.PI / 2; // khuôn mặt (u = 0.25) nhìn ra phía trước
    g.add(head);
    g.add(mesh(new T.SphereGeometry(0.075, 12, 10), std({ color: 0x3d362f, roughness: 0.9 }), [0.08, 2.2, -0.02])); // búi tóc lệch phải
    return g;
  }

  // ---------- 8. Hậu Mẫu Mậu đỉnh ----------
  function frame(w, h, t) {
    const s = new T.Shape();
    s.moveTo(-w / 2, -h / 2); s.lineTo(w / 2, -h / 2); s.lineTo(w / 2, h / 2); s.lineTo(-w / 2, h / 2); s.closePath();
    const hole = new T.Path();
    hole.moveTo(-w / 2 + t, -h / 2 + t); hole.lineTo(-w / 2 + t, h / 2 - t); hole.lineTo(w / 2 - t, h / 2 - t); hole.lineTo(w / 2 - t, -h / 2 + t); hole.closePath();
    s.holes.push(hole);
    return s;
  }

  function ding() {
    const g = new T.Group();
    const r = rng(9);
    const t = tex(512, 512, (x, w, h) => {
      x.fillStyle = '#4f7b61'; x.fillRect(0, 0, w, h);
      blotches(x, w, h, r, ['rgba(120,170,130,0.55)', 'rgba(60,45,25,0.45)', 'rgba(30,60,45,0.5)'], 60, 50);
      x.strokeStyle = 'rgba(25,40,30,0.85)'; x.lineWidth = 5;
      // dải lôi văn (xoắn vuông)
      for (let i = 0; i < 8; i++) {
        const x0 = i * 64;
        x.beginPath(); x.moveTo(x0 + 6, 70); x.lineTo(x0 + 6, 14); x.lineTo(x0 + 56, 14); x.lineTo(x0 + 56, 56); x.lineTo(x0 + 22, 56); x.lineTo(x0 + 22, 30); x.lineTo(x0 + 40, 30); x.stroke();
      }
      // mặt thao thiết
      const cx = w / 2, cy = 300;
      x.lineWidth = 7;
      [-1, 1].forEach((d) => {
        x.beginPath(); x.ellipse(cx + d * 70, cy - 20, 34, 22, 0, 0, TAU); x.stroke();
        x.fillStyle = 'rgba(25,40,30,0.9)'; x.beginPath(); x.arc(cx + d * 70, cy - 20, 12, 0, TAU); x.fill();
        x.beginPath(); x.moveTo(cx + d * 30, cy - 70); x.quadraticCurveTo(cx + d * 160, cy - 140, cx + d * 200, cy - 40); x.quadraticCurveTo(cx + d * 210, cy + 10, cx + d * 150, cy + 10); x.stroke();
        x.beginPath(); x.arc(cx + d * 150, cy + 80, 40, 0, TAU * 0.8); x.stroke();
        x.beginPath(); x.arc(cx + d * 150, cy + 80, 18, 0, TAU * 0.8); x.stroke();
      });
      x.beginPath(); x.moveTo(cx, cy - 100); x.lineTo(cx, cy + 110); x.stroke();
      x.beginPath(); x.moveTo(cx - 40, cy + 60); x.quadraticCurveTo(cx, cy + 120, cx + 40, cy + 60); x.stroke();
      speckle(x, w, h, r, ['rgba(20,30,20,0.35)', 'rgba(190,220,190,0.3)'], 2000, 2);
    }, { repeat: true });
    const bronze = std({ map: t, roughness: 0.65, metalness: 0.4 });
    const walls = mesh(new T.ExtrudeGeometry(frame(1.6, 1.1, 0.08), { depth: 1.0, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 1 }), bronze, [0, 0.72, 0], [-Math.PI / 2, 0, 0]);
    g.add(walls);
    g.add(mesh(new T.BoxGeometry(1.56, 0.06, 1.06), bronze, [0, 0.75, 0]));
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => g.add(mesh(new T.CylinderGeometry(0.13, 0.15, 0.76, 20), bronze, [sx * 0.6, 0.38, sz * 0.38])));
    [-1, 1].forEach((d) => {
      g.add(mesh(new T.ExtrudeGeometry(frame(0.5, 0.42, 0.09), { depth: 0.07, bevelEnabled: false }), bronze, [d * 0.76 - 0.035, 1.93, 0], [0, Math.PI / 2, 0]));
    });
    return g;
  }

  // ---------- 9. Bia luật Hammurabi ----------
  function hammurabi() {
    const g = new T.Group();
    const r = rng(10);
    const basalt = tex(256, 256, (x, w, h) => {
      x.fillStyle = '#1f1e22'; x.fillRect(0, 0, w, h);
      speckle(x, w, h, r, ['#111013', '#323037', '#3c3a40'], 2500, 2);
    }, { repeat: true });
    const shape = new T.Shape();
    shape.moveTo(-0.48, 0); shape.lineTo(0.48, 0); shape.lineTo(0.52, 2.2); shape.absarc(0, 2.2, 0.52, 0, Math.PI, false); shape.lineTo(-0.48, 0);
    g.add(mesh(new T.ExtrudeGeometry(shape, { depth: 0.46, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04, bevelSegments: 3, curveSegments: 24 }),
      std({ map: basalt, roughness: 0.45, metalness: 0.1 })));

    const W = 400, H = Math.round(400 * 2.72 / 1.04);
    const dec = tex(W, H, (x, w, h) => {
      const sx = w / 1.04, toY = (y) => h - y * sx; // đơn vị mô hình → pixel
      x.clearRect(0, 0, w, h);
      x.save();
      x.beginPath(); x.moveTo(4, toY(0.02)); x.lineTo(4, toY(2.2)); x.arc(w / 2, toY(2.2), w / 2 - 4, Math.PI, 0); x.lineTo(w - 4, toY(0.02)); x.closePath(); x.clip();
      // Phù điêu: vua Hammurabi đứng trước thần Shamash
      const ry = toY(2.0);
      const relief = (fill) => { x.fillStyle = fill; };
      relief('rgba(120,118,128,0.9)');
      // Shamash ngồi bên phải
      x.beginPath(); x.moveTo(w * 0.55, ry + 40); x.lineTo(w * 0.85, ry + 40); x.lineTo(w * 0.88, ry - 90); x.lineTo(w * 0.6, ry - 100); x.closePath(); x.fill();
      x.fillRect(w * 0.48, ry + 40, w * 0.42, 14); // ngai
      x.beginPath(); x.arc(w * 0.7, ry - 130, 24, 0, TAU); x.fill();
      for (let k = 0; k < 4; k++) x.fillRect(w * 0.64, ry - 175 + k * 10, w * 0.13, 6); // mũ sừng
      x.strokeStyle = 'rgba(120,118,128,0.9)'; x.lineWidth = 5;
      for (let k = 0; k < 3; k++) { x.beginPath(); x.moveTo(w * 0.77, ry - 95 + k * 8); x.lineTo(w * 0.9, ry - 120 + k * 10); x.stroke(); } // tia sáng
      x.beginPath(); x.moveTo(w * 0.6, ry - 60); x.lineTo(w * 0.47, ry - 70); x.stroke();
      x.strokeRect(w * 0.42, ry - 78, 18, 18); // vòng và gậy đo – biểu tượng quyền lực
      // Hammurabi đứng bên trái
      x.beginPath(); x.moveTo(w * 0.2, ry + 54); x.lineTo(w * 0.38, ry + 54); x.lineTo(w * 0.35, ry - 90); x.lineTo(w * 0.22, ry - 90); x.closePath(); x.fill();
      x.beginPath(); x.arc(w * 0.29, ry - 115, 22, 0, TAU); x.fill();
      x.fillRect(w * 0.24, ry - 145, w * 0.11, 14);
      x.beginPath(); x.moveTo(w * 0.34, ry - 70); x.lineTo(w * 0.4, ry - 110); x.stroke(); // tay giơ lên
      x.strokeStyle = 'rgba(160,158,168,0.6)'; x.lineWidth = 2;
      for (let k = 0; k < 7; k++) { x.beginPath(); x.moveTo(w * 0.56, ry + 30 - k * 18); x.lineTo(w * 0.86, ry + 30 - k * 18); x.stroke(); } // nếp áo tầng
      // Văn bản chữ hình nêm
      const top = toY(1.6);
      x.fillStyle = 'rgba(150,148,158,0.75)'; x.strokeStyle = 'rgba(150,148,158,0.55)';
      for (let y = top; y < h - 20; y += 22) {
        x.lineWidth = 1; x.beginPath(); x.moveTo(10, y + 10); x.lineTo(w - 10, y + 10); x.stroke();
        for (let px = 14; px < w - 14;) {
          const k = r();
          if (k < 0.5) { x.beginPath(); x.moveTo(px, y - 4); x.lineTo(px + 6, y - 4); x.lineTo(px + 3, y + 7); x.fill(); px += 8; }
          else if (k < 0.8) { x.beginPath(); x.moveTo(px, y); x.lineTo(px + 7, y - 3); x.lineTo(px + 7, y + 3); x.fill(); x.fillRect(px + 6, y - 0.6, 8, 1.4); px += 16; }
          else px += 7;
        }
      }
      x.restore();
    }, { alpha: true });
    g.add(mesh(new T.PlaneGeometry(1.04, 2.72), new T.MeshStandardMaterial({ map: dec, transparent: true, roughness: 0.6, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }),
      [0, 1.36, 0.505]));
    return g;
  }

  // ---------- 10. Ấn trụ lăn ----------
  function cylinderSeal() {
    const g = new T.Group();
    const r = rng(12);
    const figures = (x, w, h, color, lw) => {
      x.strokeStyle = color; x.fillStyle = color; x.lineWidth = lw;
      for (let i = 0; i < 3; i++) {
        const cx = (i + 0.5) * (w / 3);
        x.beginPath(); x.arc(cx, h * 0.25, h * 0.07, 0, TAU); x.stroke();
        x.beginPath(); x.moveTo(cx, h * 0.32); x.lineTo(cx, h * 0.62); x.moveTo(cx, h * 0.62); x.lineTo(cx - h * 0.1, h * 0.85); x.moveTo(cx, h * 0.62); x.lineTo(cx + h * 0.1, h * 0.85);
        x.moveTo(cx - h * 0.14, h * 0.4); x.lineTo(cx + h * 0.14, h * 0.45); x.stroke();
        // con thú
        const ax = cx + w / 6;
        x.beginPath(); x.ellipse(ax, h * 0.55, h * 0.12, h * 0.06, 0, 0, TAU); x.stroke();
        x.beginPath(); x.moveTo(ax + h * 0.1, h * 0.52); x.lineTo(ax + h * 0.17, h * 0.4); x.moveTo(ax - h * 0.08, h * 0.6); x.lineTo(ax - h * 0.08, h * 0.75); x.moveTo(ax + h * 0.08, h * 0.6); x.lineTo(ax + h * 0.08, h * 0.75); x.stroke();
        // ngôi sao
        x.beginPath(); for (let k = 0; k < 8; k++) { const a = (k / 8) * TAU; x.moveTo(cx + w / 6, h * 0.18); x.lineTo(cx + w / 6 + Math.cos(a) * h * 0.06, h * 0.18 + Math.sin(a) * h * 0.06); } x.stroke();
      }
    };
    const lapis = tex(512, 256, (x, w, h) => {
      x.fillStyle = '#1e3b8a'; x.fillRect(0, 0, w, h);
      blotches(x, w, h, r, ['rgba(40,80,190,0.6)', 'rgba(15,25,70,0.6)', 'rgba(200,210,230,0.25)'], 40, 40);
      speckle(x, w, h, r, ['#d4af37', '#e8c860'], 160, 2.5);
      figures(x, w, h, 'rgba(8,15,45,0.85)', 4);
    });
    const seal = mesh(new T.CylinderGeometry(0.3, 0.3, 1.0, 48), std({ map: lapis, roughness: 0.3, metalness: 0.1 }), [0.35, 0.42, 0.1], [0, 0, Math.PI / 2]);
    g.add(seal);
    const gold = std({ color: 0xd4a640, metalness: 0.9, roughness: 0.3 });
    [-1, 1].forEach((d) => {
      g.add(mesh(new T.CylinderGeometry(0.31, 0.31, 0.05, 48), gold, [0.35 + d * 0.51, 0.42, 0.1], [0, 0, Math.PI / 2]));
      g.add(mesh(new T.CircleGeometry(0.06, 16), std({ color: 0x050505 }), [0.35 + d * 0.54, 0.42, 0.1], [0, d * Math.PI / 2, 0]));
    });
    const clay = tex(512, 256, (x, w, h) => {
      x.fillStyle = '#b98b5d'; x.fillRect(0, 0, w, h);
      blotches(x, w, h, r, ['rgba(120,80,50,0.4)', 'rgba(220,180,140,0.35)'], 30, 40);
      x.save(); x.translate(0, 0);
      figures(x, w * 0.66, h, 'rgba(240,210,170,0.9)', 7); // vệt in nổi
      x.translate(2, 3);
      figures(x, w * 0.66, h, 'rgba(90,60,35,0.7)', 4);
      x.restore();
      speckle(x, w, h, r, ['rgba(80,50,30,0.4)'], 800);
    });
    g.add(mesh(new T.BoxGeometry(2.0, 0.12, 0.9), std({ map: clay, roughness: 0.95 }), [0, 0.06, 0]));
    // In ảnh vệt lăn lên mặt đất sét
    g.add(mesh(new T.PlaneGeometry(2.0, 0.9), std({ map: clay, roughness: 0.95 }), [0, 0.121, 0], [-Math.PI / 2, 0, 0]));
    return g;
  }

  // ---------- 11. Đá Mặt Trời Aztec ----------
  function sunstone() {
    const g = new T.Group();
    const r = rng(13);
    const face = tex(1024, 1024, (x, w, h) => {
      const c = w / 2;
      x.fillStyle = '#76726b'; x.fillRect(0, 0, w, h);
      blotches(x, w, h, r, ['rgba(60,58,55,0.5)', 'rgba(150,145,135,0.35)', 'rgba(170,70,50,0.15)', 'rgba(40,140,140,0.12)'], 70, 80);
      speckle(x, w, h, r, ['rgba(30,30,30,0.4)', 'rgba(200,200,190,0.3)'], 6000, 2);
      const line = 'rgba(35,33,30,0.85)';
      x.strokeStyle = line; x.lineWidth = 5;
      [95, 200, 215, 275, 290, 380, 395, 440, 500].forEach((rad) => { x.beginPath(); x.arc(c, c, rad, 0, TAU); x.stroke(); });
      // khuôn mặt trung tâm
      x.fillStyle = 'rgba(180,170,155,0.6)'; x.beginPath(); x.arc(c, c, 92, 0, TAU); x.fill();
      x.fillStyle = line;
      x.beginPath(); x.ellipse(c - 34, c - 20, 16, 9, 0, 0, TAU); x.ellipse(c + 34, c - 20, 16, 9, 0, 0, TAU); x.fill();
      x.beginPath(); x.moveTo(c - 10, c - 5); x.lineTo(c, c + 25); x.lineTo(c + 10, c - 5); x.stroke();
      x.beginPath(); x.moveTo(c - 30, c + 40); x.lineTo(c + 30, c + 40); x.stroke();
      x.fillStyle = 'rgba(150,50,40,0.75)'; x.beginPath(); x.moveTo(c - 12, c + 42); x.lineTo(c, c + 88); x.lineTo(c + 12, c + 42); x.fill(); // lưỡi dao
      // 4 ô Ollin
      [Math.PI / 4, (3 * Math.PI) / 4, (5 * Math.PI) / 4, (7 * Math.PI) / 4].forEach((a) => {
        const px = c + Math.cos(a) * 145, py = c + Math.sin(a) * 145;
        x.strokeStyle = line; x.lineWidth = 5; x.strokeRect(px - 38, py - 38, 76, 76);
        x.beginPath(); x.arc(px, py, 14, 0, TAU); x.stroke();
        x.fillStyle = 'rgba(40,130,130,0.25)'; x.fillRect(px - 34, py - 34, 68, 68);
      });
      // 20 ký hiệu ngày
      for (let i = 0; i < 20; i++) atPolar(x, c, c, 245, (i / 20) * TAU, () => {
        x.strokeStyle = line; x.lineWidth = 4; x.strokeRect(-28, -24, 56, 48);
        x.lineWidth = 3; x.beginPath();
        const k = i % 4;
        if (k === 0) { x.arc(0, 0, 12, 0, TAU); }
        else if (k === 1) { x.moveTo(-14, 10); x.lineTo(0, -12); x.lineTo(14, 10); }
        else if (k === 2) { x.moveTo(-14, -8); x.quadraticCurveTo(0, 14, 14, -8); x.moveTo(-6, 0); x.lineTo(6, 0); }
        else { x.ellipse(0, 0, 14, 8, 0, 0, TAU); x.moveTo(3, 0); x.arc(0, 0, 3, 0, TAU); }
        x.stroke();
      });
      // tia mặt trời
      for (let i = 0; i < 8; i++) atPolar(x, c, c, 335, (i / 8) * TAU, () => {
        x.fillStyle = 'rgba(40,38,34,0.75)';
        x.beginPath(); x.moveTo(-34, 44); x.lineTo(0, -44); x.lineTo(34, 44); x.fill();
        x.fillStyle = 'rgba(170,70,50,0.3)'; x.beginPath(); x.moveTo(-20, 38); x.lineTo(0, -20); x.lineTo(20, 38); x.fill();
      });
      for (let i = 0; i < 64; i++) atPolar(x, c, c, 417, (i / 64) * TAU, () => { x.fillStyle = line; x.beginPath(); x.arc(0, 0, 6, 0, TAU); x.fill(); });
      // hai rắn lửa ở vành ngoài
      for (let i = 0; i < 48; i++) atPolar(x, c, c, 470, (i / 48) * TAU, () => {
        x.strokeStyle = line; x.lineWidth = 4; x.strokeRect(-24, -22, 48, 44);
        x.beginPath(); x.moveTo(-12, -10); x.lineTo(12, 10); x.moveTo(12, -10); x.lineTo(-12, 10); x.stroke();
      });
    });
    const side = std({ color: 0x6b675f, roughness: 0.95 });
    const disc = mesh(new T.CylinderGeometry(1.3, 1.32, 0.32, 96), [side, std({ map: face, roughness: 0.9 }), side], [0, 1.32, 0], [Math.PI / 2, 0, 0]);
    disc.rotation.z = 0; // mặt có hoa văn hướng về phía trước (+z)
    g.add(disc);
    return g;
  }

  // ---------- 12. Mặt nạ ngọc Pakal ----------
  function pakal() {
    const g = new T.Group();
    const r = rng(14);
    const t = tex(1024, 1024, (x, w, h) => {
      x.fillStyle = '#1a2b22'; x.fillRect(0, 0, w, h);
      // khảm ngọc
      const cols = 30, rows = 30, pts = [];
      for (let j = 0; j <= rows; j++) { pts[j] = []; for (let i = 0; i <= cols; i++) pts[j][i] = [i * (w / cols) + (r() - 0.5) * 18, j * (h / rows) + (r() - 0.5) * 18]; }
      for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
        const gr = 90 + r() * 70;
        x.fillStyle = `rgb(${30 + r() * 30},${gr},${60 + r() * 40})`;
        x.beginPath(); x.moveTo(...pts[j][i]); x.lineTo(...pts[j][i + 1]); x.lineTo(...pts[j + 1][i + 1]); x.lineTo(...pts[j + 1][i]); x.closePath(); x.fill();
        x.strokeStyle = '#13211a'; x.lineWidth = 2.5; x.stroke();
        x.fillStyle = 'rgba(220,255,230,0.15)'; x.fillRect(pts[j][i][0] + 6, pts[j][i][1] + 5, 8, 4);
      }
      const cx = w / 2;
      // lông mày
      x.strokeStyle = '#0f1a14'; x.lineWidth = 12;
      [-1, 1].forEach((d) => { x.beginPath(); x.moveTo(cx + d * 30, 380); x.quadraticCurveTo(cx + d * 100, 350, cx + d * 160, 395); x.stroke(); });
      // mắt: vỏ sò + obsidian
      [-1, 1].forEach((d) => {
        const ex = cx + d * 95, ey = 435;
        x.fillStyle = '#f2eee2'; x.beginPath(); x.moveTo(ex - 62, ey); x.quadraticCurveTo(ex, ey - 34, ex + 62, ey); x.quadraticCurveTo(ex, ey + 30, ex - 62, ey); x.fill();
        x.fillStyle = '#0b0b0e'; x.beginPath(); x.arc(ex + d * -4, ey, 17, 0, TAU); x.fill();
        x.fillStyle = 'rgba(255,255,255,0.7)'; x.beginPath(); x.arc(ex + d * -4 - 5, ey - 6, 4, 0, TAU); x.fill();
      });
      // miệng hé
      x.fillStyle = '#0f1a14';
      x.beginPath(); x.moveTo(cx - 80, 690); x.quadraticCurveTo(cx, 650, cx + 80, 690); x.quadraticCurveTo(cx, 735, cx - 80, 690); x.fill();
      x.fillStyle = '#e8e2d0'; x.fillRect(cx - 36, 682, 72, 12);
      blotches(x, w, h, r, ['rgba(255,255,255,0.08)', 'rgba(0,0,0,0.15)'], 30, 90);
    });
    const jade = new T.MeshPhysicalMaterial({ map: t, roughness: 0.25, clearcoat: 0.6, side: T.DoubleSide });
    g.add(mesh(new T.SphereGeometry(1, 64, 48, 0, Math.PI, 0, Math.PI), jade, [0, 1.1, 0], null, [0.78, 1.05, 0.55]));
    const jadeSolid = std({ color: 0x3f8a5f, roughness: 0.3 });
    g.add(mesh(new T.SphereGeometry(0.12, 20, 16), jadeSolid, [0, 1.04, 0.54], null, [0.9, 1.6, 0.9])); // mũi
    [-1, 1].forEach((d) => {
      g.add(mesh(new T.CylinderGeometry(0.2, 0.2, 0.05, 32), jadeSolid, [d * 0.8, 1.12, 0.02], [0, 0, Math.PI / 2]));
      g.add(mesh(new T.CylinderGeometry(0.07, 0.07, 0.07, 16), std({ color: 0xece5d0, roughness: 0.4 }), [d * 0.83, 1.12, 0.02], [0, 0, Math.PI / 2]));
    });
    return g;
  }

  const BUILDERS = {
    'dongson-drum': drum, 'chudau-vase': vase, rosetta, scarab, antikythera, amphora,
    terracotta: warrior, houmuwu: ding, hammurabi, 'cylinder-seal': cylinderSeal, sunstone, 'pakal-mask': pakal,
  };

  return {
    build(id) {
      const fn = BUILDERS[id];
      if (!fn) throw new Error('Không có mô hình cho ' + id);
      return fn();
    },
  };
})();
