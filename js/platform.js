/*
 * Nhận biết môi trường chạy. Khi game được đăng thành Artifact trên claude.ai, trang có
 * `window.claude` và có thể dùng: `sample` (hỏi Claude, kể cả gửi ảnh), `db` (lưu tiến trình
 * riêng của người chơi) và `user` (mã người chơi). Chạy ở nơi khác thì các mục này là null.
 */
window.G = window.G || {};

G.Platform = (() => {
  const inArtifact = !!(window.claude && typeof window.claude.use === 'function');
  const caps = { sample: null, db: null, user: null, userId: null };

  const ready = inArtifact
    ? Promise.all(['sample', 'db', 'user'].map((n) => window.claude.use(n).catch(() => null)))
      .then(async ([sample, db, user]) => {
        caps.sample = sample; caps.db = db; caps.user = user;
        if (user) { try { caps.userId = await user.id(); } catch (e) { caps.userId = null; } }
        return caps;
      })
    : Promise.resolve(caps);

  return {
    inArtifact,
    ready,
    get sample() { return caps.sample; },
    get db() { return caps.db; },
    get userId() { return caps.userId; },
  };
})();
