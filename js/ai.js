/*
 * AI ngôn ngữ (Claude) cho "Giáo sư giám tuyển", "Máy giám định" và quét ảnh.
 * Ba nguồn, theo thứ tự ưu tiên:
 *  1. Trên claude.ai (Artifact): capability `sample` – dùng tài khoản Claude của người chơi, không cần khóa.
 *  2. Chạy độc lập: SDK chính thức @anthropic-ai/sdk với khóa API người chơi tự nhập.
 *  3. Không có gì: câu trả lời ngoại tuyến dựng từ dữ liệu cổ vật.
 */
window.G = window.G || {};

G.AI = (() => {
  const SDK_URL = 'https://cdn.jsdelivr.net/npm/@anthropic-ai/sdk@0.128.0/+esm';
  let sdkPromise = null;
  let sampleBlocked = false; // người chơi từ chối / không khả dụng trong lượt xem này
  let imagesOk = null;
  const settings = () => G.Store.state.settings;

  const hasKey = () => !G.Platform.inArtifact && !!(settings().apiKey || '').trim();
  const sample = () => (!sampleBlocked && G.Platform.sample) || null;

  /** 'sample' | 'key' | 'offline' */
  function mode() {
    if (sample()) return 'sample';
    if (hasKey()) return 'key';
    return 'offline';
  }

  async function canSee() {
    if (sample()) {
      if (imagesOk === null) {
        try { imagesOk = !!(await G.Platform.sample.limits()).images; } catch (e) { imagesOk = false; }
      }
      return imagesOk;
    }
    return hasKey();
  }

  // ---------- nguồn 1: sample ----------
  const SAMPLE_COPY = {
    not_granted: 'Bạn chưa cho phép trang này dùng Claude. Có thể bật lại trong menu Quyền của artifact.',
    sampling_disabled: 'Tài khoản này chưa dùng được Claude trong artifact.',
    rate_limited: 'Claude đang quá tải hoặc bạn đã chạm giới hạn sử dụng. Thử lại sau ít phút.',
    session_expired: 'Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại claude.ai.',
    image_rejected: 'Ảnh không dùng được. Hãy chụp lại ảnh khác.',
    images_unavailable: 'Chế độ xem này không gửi được ảnh cho Claude.',
    refused: 'Claude không xử lý yêu cầu này. Thử câu hỏi hoặc ảnh khác.',
    invalid_json: 'Claude trả lời không đúng định dạng. Hãy thử lại.',
  };
  function sampleError(e) {
    const code = e && e.code;
    if (['not_granted', 'sampling_disabled', 'not_declared', 'capability_disabled', 'capability_removed'].includes(code)) sampleBlocked = true;
    if (code === 'images_unavailable') imagesOk = false;
    return new Error(SAMPLE_COPY[code] || 'Không kết nối được Claude. Hãy thử lại.');
  }

  // ---------- nguồn 2: khóa API ----------
  async function client() {
    if (!sdkPromise) sdkPromise = import(SDK_URL).catch((e) => { sdkPromise = null; throw e; });
    const sdk = await sdkPromise;
    const Anthropic = sdk.default || sdk.Anthropic;
    // Khóa do chính người chơi nhập và chỉ lưu trên máy của họ.
    return new Anthropic({ apiKey: settings().apiKey.trim(), dangerouslyAllowBrowser: true });
  }

  // Haiku không có fallback phía máy chủ; các model khác bật fallbacks "default"
  // để khi bộ lọc an toàn từ chối nhầm, yêu cầu được chạy lại trên model dự phòng.
  function request(c, body) {
    const model = settings().model || 'claude-opus-5-5';
    const base = { model, output_config: { effort: 'low' }, ...body };
    if (model.startsWith('claude-haiku')) return { api: c.messages, body: base };
    return { api: c.beta.messages, body: { ...base, betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' } };
  }

  function textOf(msg) {
    if (msg.stop_reason === 'refusal') throw new Error('AI đã từ chối trả lời câu này.');
    return msg.content.filter((b) => b.type === 'text').map((b) => b.text).join('').trim();
  }

  function friendlyError(e) {
    const s = String((e && (e.status || '')) + ' ' + ((e && e.message) || e));
    if (/401|authentication|invalid x-api-key/i.test(s)) return 'Khóa API không hợp lệ. Hãy kiểm tra lại trong Cài đặt.';
    if (/429|rate/i.test(s)) return 'AI đang quá tải, hãy thử lại sau ít phút.';
    if (/Failed to fetch|NetworkError|import/i.test(s)) return 'Không kết nối được tới máy chủ AI (kiểm tra Internet).';
    return 'Lỗi AI: ' + ((e && e.message) || e);
  }

  async function keyJSON(prompt, canvas) {
    const c = await client();
    const content = [{ type: 'text', text: prompt }];
    if (canvas) content.unshift({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: canvas.toDataURL('image/jpeg', 0.8).split(',')[1] } });
    const { api, body } = request(c, { max_tokens: 2000, messages: [{ role: 'user', content }] });
    const txt = textOf(await api.create(body));
    const m = txt.match(/\{[\s\S]*\}/);
    if (!m) throw new Error('AI trả về dữ liệu không đọc được.');
    return JSON.parse(m[0]);
  }

  const toBlob = (canvas) => new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('Không đọc được ảnh'))), 'image/jpeg', 0.85));

  // Hỏi ra JSON (có thể kèm ảnh) qua nguồn đang có.
  async function askJSON(prompt, canvas, tier) {
    const s = sample();
    if (s) {
      try {
        const opts = { modelTier: tier };
        if (canvas) opts.images = [await toBlob(canvas)];
        return await s.json(prompt, opts);
      } catch (e) { throw sampleError(e); }
    }
    try { return await keyJSON(prompt, canvas); } catch (e) { throw new Error(friendlyError(e)); }
  }

  // ---------- Giáo sư giám tuyển ----------
  function curatorRules(art) {
    const region = G.regionById(art.region);
    return [
      'Bạn là Giáo sư Minh Khảo – giám tuyển bảo tàng trong trò chơi khảo cổ "Thợ Săn Cổ Vật".',
      'Người chơi vừa khai quật (trong game) một cổ vật và muốn tìm hiểu thêm.',
      'Trả lời bằng tiếng Việt, giọng thân thiện, sinh động, phù hợp mọi lứa tuổi.',
      'Mặc định trả lời ngắn gọn 2–5 câu (tối đa khoảng 120 từ), trừ khi người chơi yêu cầu chi tiết.',
      'Giữ chính xác về lịch sử. Nếu không chắc chắn hoặc giới nghiên cứu còn tranh luận, hãy nói rõ điều đó thay vì bịa thêm.',
      'Không dùng tiêu đề markdown; có thể dùng **in đậm** cho một vài từ khóa.',
      '',
      'Thông tin cổ vật:',
      `- Tên: ${art.name} (vùng ${region.name})`,
      `- Niên đại: ${art.era}`,
      `- Chất liệu: ${art.material}`,
      `- Kích thước: ${art.size}`,
      `- Phát hiện: ${art.discovered}`,
      `- Nơi lưu giữ: ${art.location}`,
      `- Tóm tắt: ${art.summary}`,
      `- Ý nghĩa: ${art.significance}`,
      `- Sự thật thú vị: ${art.facts.join(' | ')}`,
    ].join('\n');
  }

  async function chat(art, history, question, onText) {
    const s = sample();
    if (s) {
      try {
        const turns = [{ role: 'user', content: curatorRules(art) + '\n\nCâu hỏi đầu tiên của người chơi ở lượt tiếp theo.' }, ...history, { role: 'user', content: question }];
        const { text } = await s(turns, { cache: false, modelTier: 'quick', onText: ({ text: t }) => onText && onText(t) });
        return text;
      } catch (e) {
        if (e && e.code === 'cancelled') return e.text || '';
        throw sampleError(e);
      }
    }
    if (!hasKey()) {
      const ans = offlineAnswer(art, question);
      onText && onText(ans);
      return ans;
    }
    try {
      const c = await client();
      const { api, body } = request(c, { max_tokens: 2000, system: curatorRules(art), messages: [...history, { role: 'user', content: question }] });
      let acc = '';
      if (typeof api.stream === 'function') {
        const stream = api.stream(body);
        stream.on('text', (t) => { acc += t; onText && onText(acc); });
        return textOf(await stream.finalMessage());
      }
      const txt = textOf(await api.create(body));
      onText && onText(txt);
      return txt;
    } catch (e) {
      throw new Error(friendlyError(e));
    }
  }

  // ---------- Máy giám định ----------
  const APPRAISE_PROMPT = `Bạn là "Máy giám định cổ vật" hài hước trong trò chơi khảo cổ "Thợ Săn Cổ Vật".
Người chơi chụp một vật thể đời thường bằng camera (ảnh đính kèm). Hãy:
1) Nhận diện chính xác vật thể thật trong ảnh (nếu không rõ, hãy mô tả khung cảnh).
2) "Giám định" nó như thể đó là một cổ vật trong tương lai xa: đặt tên cổ vật kêu, niên đại và nền văn minh tưởng tượng vui nhộn, công dụng "cổ xưa" sáng tạo, liên hệ ngắn tới một cổ vật thật có hình dáng/công dụng tương tự nếu có.
Nội dung phải lành mạnh, phù hợp mọi lứa tuổi, không bình luận về ngoại hình con người.
Chỉ trả về một đối tượng JSON (không kèm chữ nào khác) với các khóa:
{"vat_that": string, "ten_co_vat": string, "nien_dai": string, "nen_van_minh": string, "cong_dung": string, "co_vat_tuong_tu": string, "gia_tri": số nguyên 10-999, "do_hiem": "Thường"|"Hiếm"|"Quý"|"Huyền thoại", "nhan_xet": string (1-2 câu dí dỏm)}
Viết toàn bộ bằng tiếng Việt.`;

  async function appraise(canvas, labels) {
    if (!(await canSee())) return offlineAppraise(labels);
    const hint = labels.length ? `\n(Gợi ý từ AI nhận diện trên máy: ${labels.map(G.objectName).join(', ')})` : '';
    const r = await askJSON(APPRAISE_PROMPT + hint, canvas, 'default');
    return { ...r, source: 'claude' };
  }

  // ---------- Quét ảnh tìm đồ vật trong câu đố ----------
  async function scanPhoto(canvas, art) {
    const target = `${G.objectName(art.hide)} (COCO: "${art.hide}")`;
    const prompt = `Ảnh đính kèm do người chơi game khảo cổ chụp bằng điện thoại.
Nhiệm vụ: (1) liệt kê tối đa 8 đồ vật dễ thấy nhất trong ảnh, mỗi đồ vật có hộp giới hạn chuẩn hóa [x, y, w, h] (số từ 0 đến 1, gốc ở góc trên bên trái ảnh); (2) cho biết trong ảnh có thật sự xuất hiện: ${target} hay không (ảnh chụp màn hình/hình vẽ của đồ vật đó cũng tính).
Chỉ trả lời một đối tượng JSON, ví dụ:
{"objects":[{"name":"Cốc","box":[0.42,0.55,0.12,0.18]}],"target_found":false,"target_box":null}
"name" viết bằng tiếng Việt, ngắn gọn. Nếu target_found là true thì target_box là hộp của đồ vật đó.`;
    const r = await askJSON(prompt, canvas, 'quick');
    const box = (b) => (Array.isArray(b) && b.length === 4 && b.every((v) => typeof v === 'number') ? b.map((v) => Math.max(0, Math.min(1, v))) : null);
    return {
      objects: (Array.isArray(r.objects) ? r.objects : []).slice(0, 8).map((o) => ({ name: String(o.name || '?'), box: box(o.box) })).filter((o) => o.box),
      found: r.target_found === true,
      targetBox: box(r.target_box),
    };
  }

  async function test() {
    if (sample()) {
      try { return (await G.Platform.sample('Chào giáo sư! Trả lời đúng một câu ngắn bằng tiếng Việt.', { modelTier: 'quick', cache: false })).text; }
      catch (e) { throw sampleError(e); }
    }
    try {
      const c = await client();
      const { api, body } = request(c, { max_tokens: 200, messages: [{ role: 'user', content: 'Chào giáo sư! Trả lời đúng một câu ngắn bằng tiếng Việt.' }] });
      return textOf(await api.create(body));
    } catch (e) {
      throw new Error(friendlyError(e));
    }
  }

  // ---------- Chế độ ngoại tuyến ----------
  const pick = (a) => a[Math.floor(Math.random() * a.length)];

  function offlineAnswer(art, q) {
    const s = ' ' + q.toLowerCase() + ' ';
    if (/ở đâu|bảo tàng|trưng bày|hiện nay|lưu giữ/.test(s)) return `Hiện nay, ${art.name} được lưu giữ tại **${art.location}**.`;
    if (/[\s,.?!]ai[\s,.?!]|phát hiện|tìm thấy|tìm ra|khai quật/.test(s)) return art.discovered;
    if (/làm bằng|chất liệu|chế tác|đúc|làm như thế nào|làm từ/.test(s)) return `${art.name} được làm từ **${art.material}**. ${art.size}.`;
    if (/kích thước|nặng|cao bao|to bao|lớn bao/.test(s)) return `${art.size}.`;
    if (/khi nào|niên đại|bao nhiêu tuổi|năm nào|thời kỳ|thời nào/.test(s)) return `Niên đại: **${art.era}**.`;
    if (/quan trọng|ý nghĩa|vì sao|tại sao|giá trị/.test(s)) return art.significance;
    if (/câu chuyện|thú vị|bí mật|kể/.test(s)) return pick(art.facts);
    return `${art.summary} Bạn có biết: ${pick(art.facts)}\n\n_(Giáo sư đang ở chế độ ngoại tuyến nên chỉ trả lời được các câu hỏi cơ bản.)_`;
  }

  function offlineAppraise(labels) {
    const label = labels[0];
    const name = label ? G.objectName(label) : 'Vật thể bí ẩn';
    const civs = ['Nền văn minh Văn Phòng Thượng Cổ', 'Vương triều Wi-Fi', 'Đế chế Cà Phê Sữa Đá', 'Thời đại Pin Dự Phòng', 'Liên bang Bàn Học'];
    const uses = ['nghi lễ triệu hồi buổi sáng', 'lưu trữ năng lượng cho chiến binh làm bài tập', 'giao tiếp với các bộ lạc ở xa', 'đo lòng kiên nhẫn của người cổ đại'];
    const r = ['Thường', 'Hiếm', 'Quý', 'Huyền thoại'];
    return {
      vat_that: name,
      ten_co_vat: `${name} Thần Thánh của ${pick(['Bộ lạc Phòng Khách', 'Vua Wifi Đệ Nhất', 'Nữ hoàng Deadline'])}`,
      nien_dai: `Khoảng năm ${2000 + Math.floor(Math.random() * 30)} (Kỷ Nguyên Số)`,
      nen_van_minh: pick(civs),
      cong_dung: `Theo truyền thuyết, vật này được dùng trong ${pick(uses)}.`,
      co_vat_tuong_tu: '—',
      gia_tri: 10 + Math.floor(Math.random() * 300),
      do_hiem: pick(r),
      nhan_xet: label ? 'Máy dò AI trên thiết bị đã nhận ra vật thể này. Bật AI Claude để được giám định chuyên sâu!'
        : 'Máy dò chưa nhận ra vật thể. Bật AI Claude để Giáo sư nhìn tận mắt!',
      source: 'offline',
    };
  }

  return { mode, hasKey, canSee, chat, appraise, scanPhoto, test };
})();
