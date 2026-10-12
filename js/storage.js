/*
 * Lưu tiến trình chơi. Luôn lưu vào localStorage của trình duyệt; khi chạy trên claude.ai
 * còn đồng bộ vào kho dữ liệu riêng của người chơi (data/users/<id>/save) để chơi tiếp
 * trên thiết bị khác. Khóa API và ảnh giám định không bao giờ rời khỏi máy.
 */
window.G = window.G || {};

G.Store = (() => {
  const KEY = 'tho-san-co-vat-v1';
  const defaults = () => ({
    found: {},        // id -> { integrity, score, date, byAI }
    rep: 0,           // điểm uy tín
    hints: 3,         // lượt gợi ý
    appraisals: [],   // sổ giám định AI (chỉ lưu trên máy)
    settings: { apiKey: '', model: 'claude-opus-5-5', sound: true },
    seenGuide: false,
    updatedAt: 0,
  });

  let state = defaults();
  const listeners = [];
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      state = { ...defaults(), ...saved, settings: { ...defaults().settings, ...(saved.settings || {}) } };
    }
  } catch (e) { /* bộ nhớ không khả dụng: chơi không lưu */ }

  function saveLocal() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); }
    catch (e) {
      // Có thể đầy bộ nhớ do ảnh giám định: bỏ bớt ảnh cũ rồi thử lại.
      if (state.appraisals.length > 5) {
        state.appraisals = state.appraisals.slice(0, 5);
        try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e2) { /* bỏ qua */ }
      }
    }
  }

  // ---------- đồng bộ đám mây (chỉ trên claude.ai) ----------
  let cloudDoc = null, cloudTimer = null, cloudBusy = false, cloudDirty = false;
  const cloudData = () => ({
    found: state.found, rep: state.rep, hints: state.hints, seenGuide: state.seenGuide,
    sound: state.settings.sound, updatedAt: state.updatedAt,
  });

  async function pushCloud() {
    if (!cloudDoc) return;
    if (cloudBusy) { cloudDirty = true; return; } // mỗi lần chỉ một lệnh ghi vào tài liệu
    cloudBusy = true;
    try { await cloudDoc.set(cloudData()); } catch (e) { console.warn('Đồng bộ thất bại', e); }
    cloudBusy = false;
    if (cloudDirty) { cloudDirty = false; pushCloud(); }
  }

  function save() {
    state.updatedAt = Date.now();
    saveLocal();
    if (cloudDoc) { clearTimeout(cloudTimer); cloudTimer = setTimeout(pushCloud, 1200); }
  }

  async function connectCloud() {
    const P = G.Platform;
    await P.ready;
    if (!P.db || !P.userId) return;
    try {
      cloudDoc = P.db.doc('data/users/' + P.userId + '/save');
      const snap = await cloudDoc.get();
      const remote = snap.exists ? snap.data() : null;
      if (remote && (remote.updatedAt || 0) > (state.updatedAt || 0)) {
        state = { ...state, found: { ...(remote.found || {}) }, rep: remote.rep || 0, hints: remote.hints ?? 3,
          seenGuide: !!remote.seenGuide, updatedAt: remote.updatedAt,
          settings: { ...state.settings, sound: remote.sound !== false } };
        saveLocal();
        listeners.forEach((fn) => fn());
      } else if (state.updatedAt) {
        pushCloud();
      }
    } catch (e) {
      console.warn('Không đọc được bản lưu đám mây', e);
      cloudDoc = null;
    }
  }

  return {
    get state() { return state; },
    save,
    connectCloud,
    get cloudOn() { return !!cloudDoc; },
    onRemoteLoad: (fn) => listeners.push(fn),
    foundCount: () => Object.keys(state.found).length,
    isFound: (id) => !!state.found[id],
    rank() {
      let r = G.RANKS[0];
      for (const x of G.RANKS) if (state.rep >= x.min) r = x;
      return r;
    },
    nextRank() { return G.RANKS.find((x) => x.min > state.rep) || null; },
    isRegionUnlocked: (region) => Object.keys(state.found).length >= region.unlock,
    recordFind(id, data) {
      const prev = state.found[id];
      // Khai quật lại chỉ cập nhật nếu tình trạng tốt hơn; uy tín chỉ cộng phần chênh lệch.
      if (prev && prev.score >= data.score) return { improved: false, gained: 0 };
      const gained = data.score - (prev ? prev.score : 0);
      state.found[id] = { ...data, date: Date.now() };
      state.rep += gained;
      if (!prev) state.hints += 1;
      save();
      return { improved: true, gained, first: !prev };
    },
    addAppraisal(item) {
      state.appraisals.unshift({ ...item, date: Date.now() });
      state.appraisals = state.appraisals.slice(0, 30);
      saveLocal();
    },
    reset() {
      const keep = state.settings;
      state = defaults();
      state.settings = keep;
      save();
    },
  };
})();
