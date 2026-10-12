/* Trình xem 3D cổ vật (xoay, thu phóng) và bộ tạo ảnh thu nhỏ. */
window.G = window.G || {};

(() => {
  const T = THREE;

  function disposeObject(obj) {
    obj.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      const mats = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
      mats.forEach((m) => { if (m.map) m.map.dispose(); m.dispose(); });
    });
  }

  // Môi trường phản chiếu đơn giản giúp kim loại/men gốm trông thật hơn.
  function makeEnvironment(renderer) {
    const env = new T.Scene();
    const geo = new T.SphereGeometry(10, 32, 16);
    const colors = [];
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i) / 10;
      const c = new T.Color().setHSL(0.09, 0.3, 0.14 + Math.max(0, y) * 0.32);
      if (y < 0) c.setHSL(0.07, 0.3, 0.12 + (y + 1) * 0.08);
      colors.push(c.r, c.g, c.b);
    }
    geo.setAttribute('color', new T.Float32BufferAttribute(colors, 3));
    env.add(new T.Mesh(geo, new T.MeshBasicMaterial({ vertexColors: true, side: T.BackSide })));
    const lamp = new T.Mesh(new T.PlaneGeometry(6, 3), new T.MeshBasicMaterial({ color: 0xbdb3a0 }));
    lamp.position.set(0, 7, 3); lamp.lookAt(0, 0, 0);
    env.add(lamp);
    const pmrem = new T.PMREMGenerator(renderer);
    const rt = pmrem.fromScene(env, 0.04);
    pmrem.dispose();
    disposeObject(env);
    return rt.texture;
  }

  function setupScene(renderer) {
    renderer.outputEncoding = T.sRGBEncoding;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    const scene = new T.Scene();
    scene.environment = makeEnvironment(renderer);
    scene.add(new T.HemisphereLight(0xfff1dc, 0x3a2a1a, 0.7));
    const key = new T.DirectionalLight(0xffffff, 1.5); key.position.set(3, 4, 5); scene.add(key);
    const fill = new T.DirectionalLight(0xbfd7ff, 0.5); fill.position.set(-4, 1, 2); scene.add(fill);
    const rim = new T.DirectionalLight(0xffe0b0, 0.9); rim.position.set(0, 3, -5); scene.add(rim);
    return scene;
  }

  // Bọc mô hình vào một nhóm đã căn giữa và chuẩn hóa kích thước (~2.2 đơn vị).
  function normalized(id) {
    const obj = G.Models.build(id);
    const box = new T.Box3().setFromObject(obj);
    const size = box.getSize(new T.Vector3()), center = box.getCenter(new T.Vector3());
    obj.position.sub(center);
    const holder = new T.Group();
    holder.add(obj);
    holder.scale.setScalar(2.2 / Math.max(size.x, size.y, size.z));
    return holder;
  }

  class Viewer {
    constructor(canvas, { autoRotate = true, interactive = true, pitch = 0.12 } = {}) {
      this.canvas = canvas;
      this.autoRotate = autoRotate;
      this.renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: true });
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      this.renderer.setClearColor(0x000000, 0);
      this.scene = setupScene(this.renderer);
      this.camera = new T.PerspectiveCamera(32, 1, 0.1, 100);
      this.pivot = new T.Group();
      this.scene.add(this.pivot);
      this.rotY = 0.5; this.rotX = pitch; this.velY = 0; this.zoom = 1;
      this.model = null;
      this.alive = true;
      if (interactive) this.bindInput();
      this.ro = new ResizeObserver(() => this.resize());
      this.ro.observe(canvas);
      this.resize();
      const loop = () => {
        if (!this.alive) return;
        this.frame = requestAnimationFrame(loop);
        this.render();
      };
      loop();
    }

    bindInput() {
      let down = false, lx = 0, ly = 0;
      const c = this.canvas;
      c.style.touchAction = 'none';
      c.addEventListener('pointerdown', (e) => { down = true; lx = e.clientX; ly = e.clientY; this.velY = 0; c.setPointerCapture(e.pointerId); });
      c.addEventListener('pointermove', (e) => {
        if (!down) return;
        const dx = e.clientX - lx, dy = e.clientY - ly;
        lx = e.clientX; ly = e.clientY;
        this.rotY += dx * 0.01; this.velY = dx * 0.01;
        this.rotX = Math.max(-0.9, Math.min(1.1, this.rotX + dy * 0.006));
      });
      const up = () => { down = false; };
      c.addEventListener('pointerup', up); c.addEventListener('pointercancel', up);
      c.addEventListener('wheel', (e) => { e.preventDefault(); this.zoom = Math.max(0.6, Math.min(1.8, this.zoom * (e.deltaY > 0 ? 1.08 : 0.93))); }, { passive: false });
      this.dragging = () => down;
    }

    resize() {
      const w = this.canvas.clientWidth || 300, h = this.canvas.clientHeight || 300;
      this.renderer.setSize(w, h, false);
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
    }

    setModel(id) {
      if (this.model) { this.pivot.remove(this.model); disposeObject(this.model); }
      this.model = normalized(id);
      this.pivot.add(this.model);
    }

    render() {
      if (this.autoRotate && !(this.dragging && this.dragging())) this.rotY += 0.006;
      if (!(this.dragging && this.dragging())) { this.rotY += this.velY; this.velY *= 0.94; }
      this.pivot.rotation.set(this.rotX, this.rotY, 0);
      const fit = this.camera.aspect < 1 ? 1 / this.camera.aspect : 1;
      const dist = 5.2 * this.zoom * Math.max(1, fit * 0.85);
      this.camera.position.set(0, 0.25, dist);
      this.camera.lookAt(0, 0, 0);
      this.renderer.render(this.scene, this.camera);
    }

    dispose() {
      this.alive = false;
      cancelAnimationFrame(this.frame);
      this.ro.disconnect();
      if (this.model) disposeObject(this.model);
      if (this.scene.environment) this.scene.environment.dispose();
      this.renderer.dispose();
      if (this.renderer.forceContextLoss) this.renderer.forceContextLoss();
    }
  }
  G.Viewer = Viewer;

  // Ảnh thu nhỏ: một renderer dùng chung, kết xuất lần lượt và lưu cache.
  G.Thumbs = (() => {
    const cache = {};
    let renderer = null, scene = null, camera = null;
    function init() {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 320;
      renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
      renderer.setSize(320, 320, false);
      renderer.setClearColor(0x000000, 0);
      scene = setupScene(renderer);
      camera = new T.PerspectiveCamera(32, 1, 0.1, 100);
      camera.position.set(0, 0.5, 4.9);
      camera.lookAt(0, 0, 0);
    }
    function render(id) {
      if (cache[id]) return cache[id];
      if (!renderer) init();
      const m = normalized(id);
      m.rotation.set(0.12, 0.45, 0);
      scene.add(m);
      renderer.render(scene, camera);
      cache[id] = renderer.domElement.toDataURL('image/png');
      scene.remove(m);
      disposeObject(m);
      return cache[id];
    }
    return {
      get: render,
      // Điền ảnh vào các <img data-thumb="id"> mà không chặn giao diện.
      async fill(root) {
        const imgs = [...root.querySelectorAll('img[data-thumb]')];
        for (const img of imgs) {
          const id = img.dataset.thumb;
          if (!cache[id]) await new Promise((r) => setTimeout(r, 16));
          try { img.src = render(id); } catch (e) { console.warn(e); }
        }
      },
    };
  })();
})();
