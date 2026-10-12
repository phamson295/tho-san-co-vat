/* Dữ liệu game: vùng khảo cổ, cổ vật, tên đồ vật mà AI nhận diện được. */
window.G = window.G || {};

// Tên tiếng Việt cho các lớp vật thể COCO-SSD (mô hình AI nhận diện vật thể).
G.OBJECT_VI = {
  person: 'Người', bicycle: 'Xe đạp', car: 'Ô tô', motorcycle: 'Xe máy', bus: 'Xe buýt',
  truck: 'Xe tải', 'traffic light': 'Đèn giao thông', bench: 'Ghế băng', bird: 'Chim',
  cat: 'Mèo', dog: 'Chó', backpack: 'Ba lô', umbrella: 'Ô dù', handbag: 'Túi xách',
  tie: 'Cà vạt', suitcase: 'Va li', 'sports ball': 'Quả bóng', bottle: 'Chai', 'wine glass': 'Ly rượu',
  cup: 'Cốc', fork: 'Nĩa', knife: 'Dao', spoon: 'Thìa', bowl: 'Bát', banana: 'Chuối',
  apple: 'Táo', orange: 'Cam', chair: 'Ghế', couch: 'Sofa', 'potted plant': 'Chậu cây',
  bed: 'Giường', 'dining table': 'Bàn ăn', toilet: 'Bồn cầu', tv: 'Màn hình', laptop: 'Laptop',
  mouse: 'Chuột máy tính', remote: 'Điều khiển', keyboard: 'Bàn phím', 'cell phone': 'Điện thoại',
  microwave: 'Lò vi sóng', oven: 'Lò nướng', sink: 'Bồn rửa', refrigerator: 'Tủ lạnh',
  book: 'Sách', clock: 'Đồng hồ', vase: 'Bình hoa', scissors: 'Kéo', 'teddy bear': 'Gấu bông',
  toothbrush: 'Bàn chải', 'hair drier': 'Máy sấy',
};
G.objectName = (cls) => G.OBJECT_VI[cls] || cls;

G.RARITY = {
  common: { name: 'Thường', stars: 1, color: '#9fb3a5' },
  rare: { name: 'Hiếm', stars: 2, color: '#5fa8d3' },
  epic: { name: 'Quý', stars: 3, color: '#b07cd8' },
  legendary: { name: 'Huyền thoại', stars: 4, color: '#f0b429' },
};

G.RANKS = [
  { min: 0, name: 'Nhà khảo cổ tập sự' },
  { min: 250, name: 'Nhà khảo cổ thực địa' },
  { min: 700, name: 'Chuyên gia cổ vật' },
  { min: 1300, name: 'Giáo sư khảo cổ' },
  { min: 2000, name: 'Huyền thoại khảo cổ' },
];

// lon/lat dùng để đặt ghim trên bản đồ. unlock = số cổ vật cần tìm trước khi mở vùng.
G.REGIONS = [
  { id: 'vietnam', name: 'Việt Nam', sub: 'Văn minh sông Hồng', lon: 105.8, lat: 21.0, unlock: 0, color: '#d1495b',
    intro: 'Vùng châu thổ sông Hồng là cái nôi của văn hóa Đông Sơn rực rỡ và những làng gốm danh tiếng.' },
  { id: 'egypt', name: 'Ai Cập', sub: 'Vương quốc sông Nile', lon: 31.2, lat: 30.0, unlock: 0, color: '#edae49',
    intro: 'Hơn 3.000 năm văn minh Pharaoh để lại kim tự tháp, chữ tượng hình và vô số bùa hộ mệnh.' },
  { id: 'greece', name: 'Hy Lạp', sub: 'Biển Aegea cổ đại', lon: 23.7, lat: 38.0, unlock: 1, lab: 'left', color: '#00798c',
    intro: 'Quê hương của triết học, Thế vận hội và những con tàu đắm chứa đầy bí ẩn kỹ thuật.' },
  { id: 'china', name: 'Trung Hoa', sub: 'Hoàng Hà – Vị Thủy', lon: 108.9, lat: 34.3, unlock: 3, lab: 'top', color: '#c0392b',
    intro: 'Những triều đại đồ đồng và đế chế đầu tiên để lại các công trình vượt thời gian.' },
  { id: 'mesopotamia', name: 'Lưỡng Hà', sub: 'Giữa hai dòng sông', lon: 44.4, lat: 33.3, unlock: 5, lab: 'right', color: '#6a4c93',
    intro: 'Nơi chữ viết, bánh xe và bộ luật thành văn đầu tiên ra đời, giữa sông Tigris và Euphrates.' },
  { id: 'mesoamerica', name: 'Trung Mỹ', sub: 'Maya & Aztec', lon: -96.0, lat: 18.0, unlock: 7, color: '#2a9d8f',
    intro: 'Các thành bang Maya và đế chế Aztec với lịch pháp, kim tự tháp bậc thang và đá ngọc bích.' },
];

/*
 * hide: lớp vật thể COCO mà AI phải nhìn thấy qua camera để "đánh thức" cổ vật.
 * clue: câu đố gợi ý vật thể đó. value: điểm uy tín tối đa.
 */
G.ARTIFACTS = [
  {
    id: 'dongson-drum', region: 'vietnam', name: 'Trống đồng Ngọc Lũ', rarity: 'legendary', value: 260,
    era: 'Văn hóa Đông Sơn, khoảng 2.500 – 2.000 năm trước', material: 'Đồng thau (hợp kim đồng – thiếc – chì)',
    discovered: 'Tìm thấy cuối thế kỷ 19 (khoảng 1893–1902) khi người dân đắp đê ở làng Ngọc Lũ, Hà Nam.',
    location: 'Bảo tàng Lịch sử Quốc gia, Hà Nội',
    size: 'Đường kính mặt khoảng 79 cm, cao khoảng 63 cm',
    summary: 'Một trong những chiếc trống đồng Đông Sơn đẹp và hoàn chỉnh nhất từng được biết, được công nhận là Bảo vật quốc gia năm 2012.',
    significance: 'Hoa văn trên trống như một "bộ sử khắc trên đồng": cảnh lễ hội, nhà sàn, thuyền, chim Lạc – cho thấy đời sống của cư dân Việt cổ.',
    facts: [
      'Giữa mặt trống là ngôi sao 14 cánh, xung quanh là nhiều vành hoa văn đồng tâm.',
      'Có hình người hóa trang lông chim đang nhảy múa, giã gạo và đánh trống.',
      'Trống được đúc bằng kỹ thuật khuôn hai mang rất tinh xảo.',
      'Trống đồng vừa là nhạc cụ, vừa là biểu tượng quyền lực và vật dùng trong nghi lễ cầu mùa.',
    ],
    hide: 'person',
    clue: 'Tiếng trống đồng xưa vang lên để tập hợp cộng đồng trong lễ hội. Hãy hướng camera về phía một CON NGƯỜI – trống sẽ đáp lời.',
  },
  {
    id: 'chudau-vase', region: 'vietnam', name: 'Bình gốm hoa lam Chu Đậu', rarity: 'epic', value: 200,
    era: 'Thế kỷ 15 (thời Lê sơ)', material: 'Gốm men trắng vẽ lam (cobalt)',
    discovered: 'Chiếc bình nổi tiếng nhất nằm ở Bảo tàng Topkapi (Istanbul); làng gốm Chu Đậu ở Hải Dương được các nhà khảo cổ tìm lại vào thập niên 1980.',
    location: 'Bảo tàng Topkapi, Istanbul (Thổ Nhĩ Kỳ)',
    size: 'Dáng bình cao, thân phình, cổ dài loe miệng',
    summary: 'Gốm Chu Đậu từng theo những con thuyền buôn đi khắp châu Á, trở thành hàng xa xỉ được giới quý tộc nhiều nước ưa chuộng.',
    significance: 'Chiếc bình Topkapi có dòng chữ ghi năm Thái Hòa thứ 8 (1450) cùng tên người thợ vẽ Bùi Thị Hý – bằng chứng hiếm hoi ghi tên nghệ nhân, giúp xác định nguồn gốc gốm Chu Đậu.',
    facts: [
      'Hoa văn vẽ bằng men lam cobalt dưới lớp men trắng trong.',
      'Con tàu đắm ngoài khơi Cù Lao Chàm (Quảng Nam) được khai quật cuối thập niên 1990 chứa hơn 200.000 hiện vật gốm, phần lớn là gốm Chu Đậu.',
      'Gốm Chu Đậu được ví là "gốm của vua chúa" nhờ xương gốm mỏng, nhẹ và nét vẽ phóng khoáng.',
    ],
    hide: 'bottle',
    clue: 'Bình gốm xưa dùng để đựng rượu, đựng nước. Ngày nay, vật chứa chất lỏng có cổ cao ấy thường làm bằng nhựa hay thủy tinh. Hãy tìm một CÁI CHAI.',
  },
  {
    id: 'rosetta', region: 'egypt', name: 'Phiến đá Rosetta', rarity: 'legendary', value: 250,
    era: 'Năm 196 TCN (thời Ptolemy V)', material: 'Đá granodiorite',
    discovered: 'Binh lính Pháp tìm thấy tháng 7/1799 gần thị trấn Rashid (Rosetta) ở châu thổ sông Nile.',
    location: 'Bảo tàng Anh, London',
    size: 'Cao khoảng 112 cm, nặng khoảng 760 kg',
    summary: 'Một sắc lệnh được khắc bằng ba loại chữ: chữ tượng hình, chữ Demotic và chữ Hy Lạp cổ.',
    significance: 'Nhờ đoạn chữ Hy Lạp đọc được, Jean-François Champollion đã giải mã chữ tượng hình Ai Cập năm 1822, mở cánh cửa vào cả nền văn minh Ai Cập cổ đại.',
    facts: [
      'Phiến đá là mảnh vỡ của một tấm bia lớn hơn; phần trên bị mất.',
      'Đoạn chữ Hy Lạp mở đầu bằng từ "ΒΑΣΙΛΕΥΟΝΤΟΣ" (Dưới triều vua…).',
      'Đây là một trong những hiện vật được xem nhiều nhất ở Bảo tàng Anh.',
    ],
    hide: 'book',
    clue: 'Phiến đá này là "cuốn từ điển" giúp đọc hiểu cả một nền văn minh. Tri thức ngày nay được đóng thành trang – hãy tìm một CUỐN SÁCH.',
  },
  {
    id: 'scarab', region: 'egypt', name: 'Bùa bọ hung Scarab', rarity: 'common', value: 110,
    era: 'Phổ biến từ Trung Vương quốc (khoảng 2000 TCN) trở đi', material: 'Faience (gốm tráng men xanh), đá steatite',
    discovered: 'Hàng nghìn bùa scarab đã được tìm thấy trong lăng mộ và khu dân cư khắp Ai Cập.',
    location: 'Nhiều bảo tàng trên thế giới',
    size: 'Thường chỉ dài 1 – 5 cm',
    summary: 'Bùa hình con bọ hung – biểu tượng của thần Khepri, vị thần mặt trời mọc và sự tái sinh.',
    significance: 'Người Ai Cập thấy bọ hung lăn viên phân giống như thần Khepri lăn mặt trời qua bầu trời mỗi ngày, nên bọ hung tượng trưng cho sự sống mới.',
    facts: [
      'Mặt dưới bùa thường khắc chữ hoặc tên người, dùng như con dấu.',
      '"Bọ hung trái tim" được đặt lên ngực xác ướp để giúp người chết qua phán xét ở thế giới bên kia.',
      'Pharaoh Amenhotep III cho làm scarab cỡ lớn để thông báo các sự kiện, như một dạng "bản tin" cổ đại.',
    ],
    hide: 'mouse',
    clue: 'Một "con bọ" nhỏ, lưng tròn, nằm cạnh bàn phím và có cái đuôi dài nối vào máy tính... Hãy tìm CHUỘT MÁY TÍNH.',
  },
  {
    id: 'antikythera', region: 'greece', name: 'Cỗ máy Antikythera', rarity: 'legendary', value: 280,
    era: 'Khoảng thế kỷ 2 – 1 TCN', material: 'Đồng thau, gỗ (đã mục)',
    discovered: 'Thợ lặn tìm bọt biển phát hiện năm 1901 trong xác một con tàu đắm gần đảo Antikythera.',
    location: 'Bảo tàng Khảo cổ Quốc gia, Athens',
    size: 'Hộp gốc cỡ một hộp giày; còn lại 82 mảnh',
    summary: 'Được xem là "máy tính analog" cổ nhất từng được biết, dùng bánh răng để mô phỏng chuyển động bầu trời.',
    significance: 'Cỗ máy dự đoán vị trí Mặt Trời, Mặt Trăng, nhật – nguyệt thực và cả chu kỳ các kỳ Thế vận hội – trình độ cơ khí mà phải hơn nghìn năm sau mới xuất hiện trở lại.',
    facts: [
      'Bên trong có ít nhất 30 bánh răng đồng ăn khớp với nhau.',
      'Các nhà khoa học dùng chụp CT tia X để đọc những dòng chữ khắc ẩn bên trong các mảnh vỡ.',
      'Người dùng xoay tay quay để "tua" thời gian tới hoặc lui.',
    ],
    hide: 'laptop',
    clue: 'Tổ tiên xa xưa của mọi chiếc máy tính. Hậu duệ hiện đại của nó gập mở được và có bàn phím riêng – hãy tìm một chiếc LAPTOP.',
  },
  {
    id: 'amphora', region: 'greece', name: 'Bình Amphora hình đen', rarity: 'rare', value: 150,
    era: 'Thế kỷ 6 TCN (Athens)', material: 'Gốm nung, men đen',
    discovered: 'Amphora được tìm thấy rất nhiều trong mộ cổ và xác tàu đắm khắp Địa Trung Hải.',
    location: 'Bảo tàng Louvre, Bảo tàng Anh, Bảo tàng Vatican…',
    size: 'Cao khoảng 40 – 70 cm',
    summary: 'Chiếc bình hai quai dùng để chứa và vận chuyển rượu vang, dầu ô liu – "container" của thế giới cổ đại.',
    significance: 'Kỹ thuật "hình đen" vẽ nhân vật màu đen trên nền đất nung cam, rồi khắc chi tiết – cho ta thấy thần thoại và đời sống Hy Lạp.',
    facts: [
      'Bình amphora đựng dầu ô liu được trao làm giải thưởng cho người thắng cuộc ở Đại hội Panathenaic.',
      'Khoảng năm 530 TCN, kỹ thuật "hình đỏ" ra đời và dần thay thế hình đen.',
      'Đáy nhọn của amphora vận chuyển giúp xếp chặt trong khoang tàu hoặc cắm xuống cát.',
    ],
    hide: 'cup',
    clue: 'Người Hy Lạp rót rượu từ amphora vào những chiếc cốc nhỏ. Hãy tìm một CÁI CỐC trong phòng bạn.',
  },
  {
    id: 'terracotta', region: 'china', name: 'Tượng binh mã đất nung', rarity: 'epic', value: 210,
    era: 'Nhà Tần, khoảng 210 TCN', material: 'Đất nung, từng được sơn màu',
    discovered: 'Nông dân đào giếng phát hiện năm 1974 ở Lâm Đồng, gần Tây An (Thiểm Tây).',
    location: 'Bảo tàng Binh Mã Dũng Tần Thủy Hoàng, Tây An',
    size: 'Mỗi tượng cao khoảng 1,8 m',
    summary: 'Đội quân đất nung canh giữ lăng mộ Tần Thủy Hoàng – hoàng đế đầu tiên thống nhất Trung Hoa.',
    significance: 'Ước tính có hơn 8.000 tượng lính, 130 cỗ xe và hàng trăm tượng ngựa; mỗi gương mặt đều khác nhau.',
    facts: [
      'Tượng vốn được sơn màu rực rỡ, nhưng lớp sơn bong tróc nhanh khi tiếp xúc với không khí sau khai quật.',
      'Khu lăng mộ được UNESCO công nhận Di sản Thế giới năm 1987.',
      'Phần mộ chính của Tần Thủy Hoàng đến nay vẫn chưa được khai quật.',
    ],
    hide: 'chair',
    clue: 'Đội quân đứng nghiêm suốt hơn 2.200 năm không ngồi xuống. Hãy tìm thứ có bốn chân, sinh ra để người ta ngồi: một CÁI GHẾ.',
  },
  {
    id: 'houmuwu', region: 'china', name: 'Hậu Mẫu Mậu đỉnh', rarity: 'rare', value: 170,
    era: 'Cuối nhà Thương (khoảng thế kỷ 13 – 11 TCN)', material: 'Đồng thau',
    discovered: 'Dân làng ở An Dương (Hà Nam) tìm thấy năm 1939, rồi chôn giấu lại để bảo vệ trong thời chiến.',
    location: 'Bảo tàng Quốc gia Trung Quốc, Bắc Kinh',
    size: 'Cao 133 cm, nặng khoảng 833 kg',
    summary: 'Chiếc đỉnh đồng bốn chân lớn nhất còn lại của thời cổ đại Trung Hoa, đúc để tế lễ người mẹ của nhà vua.',
    significance: 'Cho thấy trình độ luyện kim đỉnh cao thời Thương: cần hàng trăm thợ phối hợp nấu chảy và rót đồng cùng lúc.',
    facts: [
      'Đỉnh là vật dùng nấu và dâng thức ăn trong nghi lễ tế tổ tiên.',
      'Bên trong thành đỉnh có khắc ba chữ "Hậu Mẫu Mậu".',
      'Hoa văn "thao thiết" (mặt thú) phủ quanh thân đỉnh.',
    ],
    hide: 'bowl',
    clue: 'Đỉnh đồng là vật đựng thức ăn dâng lên tổ tiên. Hậu duệ khiêm tốn của nó có trong mọi gian bếp – hãy tìm một CÁI BÁT.',
  },
  {
    id: 'hammurabi', region: 'mesopotamia', name: 'Bia luật Hammurabi', rarity: 'legendary', value: 260,
    era: 'Khoảng 1754 TCN (Babylon)', material: 'Đá bazan đen',
    discovered: 'Đoàn khảo cổ Pháp tìm thấy năm 1901 ở Susa (Iran) – nơi tấm bia bị mang đến làm chiến lợi phẩm từ thế kỷ 12 TCN.',
    location: 'Bảo tàng Louvre, Paris',
    size: 'Cao khoảng 2,25 m',
    summary: 'Tấm bia khắc 282 điều luật của vua Hammurabi bằng chữ hình nêm – một trong những bộ luật thành văn cổ nhất.',
    significance: 'Thể hiện ý tưởng luật lệ công khai, áp dụng cho mọi người – nổi tiếng với nguyên tắc "mắt đền mắt, răng đền răng".',
    facts: [
      'Phần trên bia chạm cảnh vua Hammurabi đứng trước thần Mặt Trời Shamash – vị thần công lý.',
      'Luật quy định cả giá thuê thuyền, lương thợ và trách nhiệm của thầy thuốc.',
      'Hình phạt khác nhau tùy theo địa vị xã hội của người bị hại.',
    ],
    hide: 'keyboard',
    clue: 'Chữ hình nêm được tạo ra bằng cách ẤN que sậy vào đất sét. Ngày nay, ta ấn những phím vuông để viết – hãy tìm một BÀN PHÍM.',
  },
  {
    id: 'cylinder-seal', region: 'mesopotamia', name: 'Ấn trụ lăn Lưỡng Hà', rarity: 'common', value: 120,
    era: 'Xuất hiện khoảng 3500 TCN', material: 'Đá lapis lazuli, carnelian, hematit…',
    discovered: 'Hàng nghìn ấn trụ được tìm thấy ở các thành phố Ur, Uruk, Babylon…',
    location: 'Bảo tàng Anh, Louvre, Bảo tàng Iraq…',
    size: 'Thường cao 2 – 5 cm',
    summary: 'Một khối trụ nhỏ được khắc chìm hình ảnh; khi lăn trên đất sét ướt sẽ in ra một dải tranh nổi liên tục.',
    significance: 'Là "chữ ký" và con dấu cá nhân của người Lưỡng Hà, dùng niêm phong hàng hóa, hợp đồng và thư từ.',
    facts: [
      'Ấn trụ thường được khoan lỗ dọc thân để xỏ dây đeo cổ hoặc cổ tay.',
      'Mất ấn trụ thời đó cũng phiền như mất thẻ căn cước ngày nay!',
      'Lapis lazuli dùng làm ấn được chở từ vùng Afghanistan xa xôi.',
    ],
    hide: 'cell phone',
    clue: 'Ấn trụ là "chữ ký" mà người Lưỡng Hà luôn mang theo người. Ngày nay, danh tính và chữ ký số của bạn nằm trong một thiết bị bỏ túi – hãy tìm một CHIẾC ĐIỆN THOẠI.',
  },
  {
    id: 'sunstone', region: 'mesoamerica', name: 'Đá Mặt Trời Aztec', rarity: 'epic', value: 220,
    era: 'Khoảng 1502 – 1521', material: 'Đá bazan',
    discovered: 'Tìm thấy ngày 17/12/1790 khi sửa chữa quảng trường Zócalo, Thành phố Mexico.',
    location: 'Bảo tàng Nhân chủng học Quốc gia, Mexico',
    size: 'Đường kính khoảng 3,6 m, nặng khoảng 24 tấn',
    summary: 'Khối đá tròn khổng lồ chạm khắc vũ trụ quan Aztec – thường bị gọi nhầm là "lịch Aztec".',
    significance: 'Thể hiện quan niệm của người Aztec về các "kỷ Mặt Trời" nối tiếp nhau; vành ngoài khắc 20 ký hiệu ngày.',
    facts: [
      'Gương mặt ở chính giữa thường được cho là thần Mặt Trời Tonatiuh, lưỡi là một con dao đá.',
      'Khối đá có thể từng được sơn màu rực rỡ.',
      'Hình ảnh đá Mặt Trời xuất hiện trên đồng xu và biểu tượng của Mexico hiện đại.',
    ],
    hide: 'clock',
    clue: 'Mọi người gọi nhầm khối đá tròn này là "lịch" – một thứ đo đếm thời gian. Hãy tìm thứ tròn tròn chuyên đếm giờ: một CHIẾC ĐỒNG HỒ.',
  },
  {
    id: 'pakal-mask', region: 'mesoamerica', name: 'Mặt nạ ngọc vua Pakal', rarity: 'legendary', value: 270,
    era: 'Năm 683 (Maya cổ điển)', material: 'Ngọc bích (jade), vỏ sò, đá obsidian',
    discovered: 'Nhà khảo cổ Alberto Ruz Lhuillier phát hiện năm 1952 trong hầm mộ dưới Đền Khắc Chữ ở Palenque.',
    location: 'Bảo tàng Nhân chủng học Quốc gia, Mexico',
    size: 'Cỡ một khuôn mặt người',
    summary: 'Mặt nạ tang lễ của K\'inich Janaab\' Pakal – vị vua trị vì thành Palenque gần 70 năm.',
    significance: 'Ghép từ hàng trăm mảnh ngọc bích, thể hiện niềm tin rằng nhà vua sẽ tái sinh như thần ngô bất tử.',
    facts: [
      'Nhóm khảo cổ mất khoảng 4 năm dọn đất đá lấp cầu thang mới xuống tới hầm mộ.',
      'Mắt mặt nạ làm bằng vỏ sò trắng và đá obsidian đen.',
      'Mặt nạ từng bị đánh cắp khỏi bảo tàng năm 1985 và được tìm lại năm 1989.',
    ],
    hide: 'tv',
    clue: 'Một tấm "gương đen" phẳng lớn phản chiếu gương mặt bạn khi tắt đi – nơi các khuôn mặt hiện lên mỗi tối. Hãy tìm một MÀN HÌNH / TIVI.',
  },
];

G.artifactById = (id) => G.ARTIFACTS.find((a) => a.id === id);
G.regionById = (id) => G.REGIONS.find((r) => r.id === id);
