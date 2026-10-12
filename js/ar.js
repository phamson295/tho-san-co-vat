/* Lớp AR: camera, hướng nhìn (con quay hồi chuyển / kéo chuột) và AI nhận diện vật thể. */
window.G = window.G || {};

G.loadScript = (() => {
  const pending = {};
  return (src) => pending[src] || (pending[src] = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src; s.async = true; s.crossOrigin = 'anonymous';
    s.onload = resolve;
    s.onerror = () => { delete pending[src]; reject(new Error('Không tải được ' + src)); };
    document.head.appendChild(s);
  }));
})();

// Hộp [x, y, w, h] theo pixel của ảnh/video nguồn → tọa độ màn hình khi hiển thị kiểu object-fit: cover.
G.mapCover = ([bx, by, bw, bh], sw, sh, W, H, mirror = false) => {
  const s = Math.max(W / sw, H / sh);
  const ox = (W - sw * s) / 2, oy = (H - sh * s) / 2;
  let x = ox + bx * s;
  const w = bw * s;
  if (mirror) x = W - x - w;
  return { x, y: oy + by * s, w, h: bh * s };
};

// Đọc ảnh người chơi chụp/chọn thành canvas (đã xoay đúng chiều, thu nhỏ để gửi AI).
G.fileToCanvas = (file, max = 1280) => new Promise((resolve, reject) => {
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => {
    const sc = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement('canvas');
    c.width = Math.round(img.naturalWidth * sc); c.height = Math.round(img.naturalHeight * sc);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    URL.revokeObjectURL(url);
    resolve(c);
  };
  img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Không đọc được ảnh.')); };
  img.src = url;
});

// ---------- Camera ----------
G.Cam = {
  stream: null,
  video: null,
  mirror: false,
  facing: 'environment',

  supported: () => !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),

  async start(video, facing = this.facing) {
    this.stop();
    if (!this.supported()) throw new Error('Trình duyệt không hỗ trợ camera (cần HTTPS hoặc localhost).');
    this.facing = facing;
    this.video = video;
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: { ideal: facing }, width: { ideal: 1280 }, height: { ideal: 720 } },
    });
    video.srcObject = this.stream;
    video.setAttribute('playsinline', '');
    video.muted = true;
    await video.play();
    const s = this.stream.getVideoTracks()[0].getSettings ? this.stream.getVideoTracks()[0].getSettings() : {};
    // Webcam laptop thường không báo facingMode và là camera trước → lật gương cho tự nhiên.
    this.mirror = s.facingMode ? s.facingMode === 'user' : true;
    video.classList.toggle('mirror', this.mirror);
  },

  stop() {
    if (this.stream) this.stream.getTracks().forEach((t) => t.stop());
    this.stream = null;
    if (this.video) this.video.srcObject = null;
  },

  ready() { return !!(this.stream && this.video && this.video.readyState >= 2 && this.video.videoWidth); },

  // Chuyển hộp giới hạn từ tọa độ video sang tọa độ màn hình (video dùng object-fit: cover).
  toScreen(box, W, H) {
    return G.mapCover(box, this.video.videoWidth, this.video.videoHeight, W, H, this.mirror);
  },

  capture(max = 640) {
    const v = this.video;
    const sc = Math.min(1, max / Math.max(v.videoWidth, v.videoHeight));
    const c = document.createElement('canvas');
    c.width = Math.round(v.videoWidth * sc); c.height = Math.round(v.videoHeight * sc);
    const x = c.getContext('2d');
    if (this.mirror) { x.translate(c.width, 0); x.scale(-1, 1); }
    x.drawImage(v, 0, 0, c.width, c.height);
    return c;
  },
};

// ---------- Hướng nhìn ----------
G.Look = (() => {
  const T = THREE;
  const zee = new T.Vector3(0, 0, 1);
  const q0 = new T.Quaternion();
  const q1 = new T.Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5)); // camera nhìn ra sau lưng thiết bị
  const euler = new T.Euler();
  const deg = Math.PI / 180;

  const st = { gyro: false, alpha: 0, beta: 0, gamma: 0, yaw: 0, pitch: 0, el: null };
  let handlers = null;

  function onOrient(e) {
    if (e.alpha == null && e.beta == null) return; // máy tính không có cảm biến vẫn có thể bắn sự kiện rỗng
    st.gyro = true;
    st.alpha = e.alpha || 0; st.beta = e.beta || 0; st.gamma = e.gamma || 0;
  }

  function screenAngle() {
    const o = (screen.orientation && screen.orientation.angle) || window.orientation || 0;
    return o * deg;
  }

  return {
    get usingGyro() { return st.gyro; },

    // iOS bắt buộc xin quyền trong một thao tác chạm của người dùng.
    async requestPermission() {
      const DOE = window.DeviceOrientationEvent;
      if (DOE && typeof DOE.requestPermission === 'function') {
        try { return (await DOE.requestPermission()) === 'granted'; } catch (e) { return false; }
      }
      return true;
    },

    start(el) {
      this.stop();
      st.el = el; st.yaw = 0; st.pitch = 0;
      let down = false, lx = 0, ly = 0;
      handlers = {
        orient: onOrient,
        down: (e) => { if (e.target.closest('button, .no-drag')) return; down = true; lx = e.clientX; ly = e.clientY; },
        move: (e) => {
          if (!down || st.gyro) return;
          st.yaw += (e.clientX - lx) * 0.005;
          st.pitch = Math.max(-1.2, Math.min(1.2, st.pitch + (e.clientY - ly) * 0.005));
          lx = e.clientX; ly = e.clientY;
        },
        up: () => { down = false; },
        key: (e) => {
          if (st.gyro) return;
          if (e.key === 'ArrowLeft') st.yaw += 0.08;
          if (e.key === 'ArrowRight') st.yaw -= 0.08;
          if (e.key === 'ArrowUp') st.pitch = Math.min(1.2, st.pitch + 0.06);
          if (e.key === 'ArrowDown') st.pitch = Math.max(-1.2, st.pitch - 0.06);
        },
      };
      window.addEventListener('deviceorientation', handlers.orient);
      el.addEventListener('pointerdown', handlers.down);
      window.addEventListener('pointermove', handlers.move);
      window.addEventListener('pointerup', handlers.up);
      window.addEventListener('keydown', handlers.key);
    },

    stop() {
      if (!handlers) return;
      window.removeEventListener('deviceorientation', handlers.orient);
      if (st.el) st.el.removeEventListener('pointerdown', handlers.down);
      window.removeEventListener('pointermove', handlers.move);
      window.removeEventListener('pointerup', handlers.up);
      window.removeEventListener('keydown', handlers.key);
      handlers = null;
    },

    quaternion(out = new T.Quaternion()) {
      if (st.gyro) {
        euler.set(st.beta * deg, st.alpha * deg, -st.gamma * deg, 'YXZ');
        out.setFromEuler(euler);
        out.multiply(q1);
        out.multiply(q0.setFromAxisAngle(zee, -screenAngle()));
      } else {
        out.setFromEuler(euler.set(st.pitch, st.yaw, 0, 'YXZ'));
      }
      return out;
    },

    forward() { return new T.Vector3(0, 0, -1).applyQuaternion(this.quaternion()); },
  };
})();

// ---------- AI nhận diện vật thể (TensorFlow.js + COCO-SSD, chạy ngay trên thiết bị) ----------
G.Detector = {
  model: null,
  promise: null,
  status: 'idle', // idle | loading | ready | failed

  load() {
    if (this.promise) return this.promise;
    this.status = 'loading';
    this.promise = (async () => {
      await G.loadScript('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js');
      await G.loadScript('https://cdn.jsdelivr.net/npm/@tensorflow-models/coco-ssd@2.2.3/dist/coco-ssd.min.js');
      await window.tf.ready();
      this.model = await window.cocoSsd.load({ base: 'lite_mobilenet_v2' });
      this.status = 'ready';
      return this.model;
    })().catch((e) => {
      console.warn('Detector', e);
      this.status = 'failed';
      this.promise = null;
      throw e;
    });
    return this.promise;
  },

  async detect(source) {
    if (!this.model) return [];
    return this.model.detect(source, 12, 0.3);
  },
};
