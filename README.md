# Thợ Săn Cổ Vật – Game khảo cổ AR

Người chơi nhập vai nhà khảo cổ, dùng **camera AR** và **trí tuệ nhân tạo** để lần theo dấu vết, khai quật và sưu tầm 12 cổ vật nổi tiếng từ 6 nền văn minh: Việt Nam, Ai Cập, Hy Lạp, Trung Hoa, Lưỡng Hà, Trung Mỹ.

## Chơi ngay

**https://phamson295.github.io/tho-san-co-vat/** – mở trên điện thoại (Chrome trên Android, Safari trên iPhone), cho phép camera và cảm biến chuyển động khi được hỏi.

## Chạy trên máy

Cần [Node.js](https://nodejs.org) (chỉ để chạy máy chủ tĩnh, không cần cài thư viện):

```bash
node server.js
```

Mở `http://localhost:8080` trên máy tính. Webcam sẽ được dùng cho AI quét; nếu không có camera, game chuyển sang khu khai quật mô phỏng (kéo chuột/phím mũi tên để nhìn quanh).

### Chơi trên điện thoại

Trình duyệt chỉ cho dùng camera và cảm biến trên **HTTPS**, nên trên điện thoại hãy dùng link GitHub Pages ở trên. Mỗi lần đẩy code lên nhánh `main`, GitHub Pages tự cập nhật trang. Game không có bước build: chỉ là HTML/CSS/JS.

Nếu trang không mở được camera trực tiếp (ví dụ khi chạy qua `http://` trên mạng LAN), game tự chuyển sang chế độ **📷 Chụp & quét**: chụp một tấm ảnh và AI tìm đồ vật trong ảnh.

### Bản đăng trên claude.ai

`node build-artifact.js` tạo `dist/tho-san-co-vat.html` để đăng thành Artifact trên claude.ai. Ở đó trang không được dùng camera trực tiếp nên luôn ở chế độ chụp ảnh; AI dùng Claude qua tài khoản claude.ai của người chơi và tiến trình được đồng bộ vào kho riêng của họ.

## Cách chơi

1. **Bản đồ thế giới** → chọn nền văn minh → chọn cổ vật. Mỗi cổ vật có một câu đố trong *nhật ký thám hiểm*.
2. **AI quét**: câu đố ám chỉ một đồ vật đời thường (cái chai, cuốn sách, bàn phím…). Lia camera – AI nhận diện vật thể (chạy ngay trên thiết bị) đóng khung mọi thứ nó thấy. Giữ đúng đồ vật trong khung ~1,5 giây để "đánh thức" cổ vật. Tìm bằng AI được thưởng ×1.2 điểm.
3. **Máy dò** (dự phòng khi không có đồ vật đó): cổ vật ẩn ở một hướng quanh người chơi. Xoay điện thoại theo tiếng bíp + radar; khi vầng sáng vàng xuất hiện, giữ nó ở giữa tâm ngắm.
4. **Khai quật**: hai lớp đất. ⛏️ Xẻng xúc nhanh lớp đất nâu dày; khi lộ lớp cát vàng bao quanh cổ vật phải đổi sang 🖌️ cọ – xẻng chọc vào lớp cát sẽ làm cổ vật nứt vỡ. Độ nguyên vẹn quyết định điểm uy tín.
5. **Bảo tàng & hồ sơ**: xoay mô hình 3D, đọc thông tin lịch sử, hỏi **Giáo sư AI** bất cứ điều gì.
6. **📸 Giám định AI**: chụp bất kỳ đồ vật nào quanh bạn, AI sẽ "giám định" nó như một cổ vật của tương lai (nội dung giả tưởng cho vui) và lưu vào Sổ giám định.

Tìm thêm cổ vật để mở khóa vùng mới (Hy Lạp: 1, Trung Hoa: 3, Lưỡng Hà: 5, Trung Mỹ: 7) và thăng hạng từ *Nhà khảo cổ tập sự* tới *Huyền thoại khảo cổ*.

## AI trong game

| Tính năng | Công nghệ | Cần mạng/khóa? |
|---|---|---|
| Nhận diện vật thể qua camera | TensorFlow.js + COCO-SSD (80 loại vật thể), chạy trên thiết bị | Tải mô hình lần đầu, không cần khóa |
| Giáo sư giám tuyển (chat) | Claude API qua SDK `@anthropic-ai/sdk`, trả lời dạng stream | Khóa API Anthropic (tùy chọn) |
| Máy giám định ảnh | Claude (thị giác) + gợi ý nhãn từ COCO-SSD | Khóa API (tùy chọn) |

Không có khóa API, Giáo sư trả lời từ dữ liệu cổ vật có sẵn và máy giám định dùng nhãn của COCO-SSD – game vẫn chơi trọn vẹn.

Khóa API nhập ở **Cài đặt AI**, chỉ lưu trong `localStorage` của trình duyệt và gửi thẳng tới `api.anthropic.com`. Vì khóa nằm phía trình duyệt, chỉ dùng trên thiết bị cá nhân; nếu phát hành công khai, hãy chuyển lời gọi Claude sang một máy chủ trung gian giữ khóa.

Model mặc định: Claude Opus 5.5 (đổi được sang Sonnet 5.5 / Haiku 5.5). Yêu cầu bật `fallbacks: "default"` (beta `server-side-fallback-2026-07-01`) để khi bộ lọc an toàn từ chối nhầm, máy chủ tự chạy lại trên model dự phòng; Haiku không hỗ trợ tùy chọn này nên được gọi không kèm. Effort đặt `low` để trò chuyện nhanh.

## Cấu trúc mã

```
index.html          Các màn hình (menu, bản đồ, vùng, AR, bảo tàng, hồ sơ, cài đặt…)
css/style.css       Giao diện
js/data.js          12 cổ vật, 6 vùng, câu đố, tên tiếng Việt cho vật thể COCO
js/storage.js       Lưu tiến trình (localStorage)
js/audio.js         Âm thanh tổng hợp bằng WebAudio
js/models.js        Mô hình 3D thủ tục cho từng cổ vật (Three.js, texture vẽ bằng canvas)
js/viewer.js        Trình xem 3D + ảnh thu nhỏ
js/ar.js            Camera, hướng nhìn (con quay hồi chuyển/chuột), AI nhận diện vật thể
js/expedition.js    Màn hình thám hiểm AR: AI quét, máy dò, radar, khu mô phỏng
js/excavate.js      Mini-game khai quật hai lớp
js/ai.js            Giáo sư AI & máy giám định (Claude) + chế độ ngoại tuyến
js/main.js          Điều hướng & giao diện
server.js           Máy chủ tĩnh cho localhost
```

Thêm cổ vật mới: thêm một mục vào `G.ARTIFACTS` trong `js/data.js` (chọn `hide` là một lớp COCO-SSD) và một hàm dựng mô hình trong `js/models.js`.
