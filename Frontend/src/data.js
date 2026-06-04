import blogApparel from "../images/blog_apparel.png";
import blogBadminton from "../images/blog_badminton.png";
import blogPickleball from "../images/blog_pickleball.png";
import messiHero from "../images/anh-nen-messi-26-sharp.jpeg";

export const SPORT_KEY_BY_SLUG = {
  "cau-long": "badminton",
  "bong-da": "football",
  pickleball: "pickleball"
};

export const SPORTS = {
  football: {
    key: "football",
    slug: "bong-da",
    title: "Bóng đá",
    label: "BÓNG ĐÁ",
    icon: "sports_soccer",
    tablerIcon: "ti-ball-football",
    navId: "nav-football",
    sub: "Giày, bóng & trang phục thi đấu chuyên nghiệp",
    route: "/products/categories/bong-da",
    hero:
      "https://images.unsplash.com/photo-1511886929837-354d827aae26?q=80&w=1600&auto=format&fit=crop",
    card:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBDvnVWGe9174Uck9FwRTgeoyJ5m-kS1FFq3IdBZ2XqYZJmUuDIxrwKBaynlA5jJup9J86Evu1bQ-u1MvhdqVqZ7V_4ZhUwSqQOqldmpBRZZI4tD8w9oycTmXj4KSgKvUHu3SOVlMEB-TZXi8cfA87NOHmvAa55ojxapeeLurdeGe5deGIwHdzUf-vlpyx8zts_7xnw1IHU9mYMuSnvz0osu_J6s16jfye5D3YNT9wkG1hrmkxJw_ip-CIPqmBa6L0-0mkD8N9sDXee"
  },
  badminton: {
    key: "badminton",
    slug: "cau-long",
    title: "Cầu lông",
    label: "CẦU LÔNG",
    icon: "sports_tennis",
    tablerIcon: "ti-shuttlecock",
    navId: "nav-badminton",
    sub: "Vợt cao cấp, giày chuyên dụng & phụ kiện",
    route: "/products/categories/cau-long",
    hero:
      "https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?q=80&w=1600&auto=format&fit=crop",
    card:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDbqAmI-A4Et4u04N82zDCfOts67WJ-XxgeHxrQh7qGwZk7WhT9iQQ9WpAYtvVWMsXRLIAQ_ElZkl_3JuLmPWoA0KLuoskOrKqvbVLCHJ_cwPNrnvXsZnrDZxRyXbRooV7vHYszJzA4NhMR86Y3dIDTglaqZk35XNohkmlC0vAV5ZcnOK8X9VEL6t3gclqbnnGvo7SBzkeZnonYH6sO9f6PWlYnwNza7cyhtgjc5deNc9FKBsFSDtgGAiC_ZIq9ofcJRri05thnY28f"
  },
  pickleball: {
    key: "pickleball",
    slug: "pickleball",
    title: "Pickleball",
    label: "PICKLEBALL",
    icon: "sports_handball",
    tablerIcon: "ti-ball-tennis",
    navId: "nav-pickleball",
    sub: "Vợt composite thế hệ mới & gear chuyên dụng",
    route: "/products/categories/pickleball",
    hero:
      "https://images.unsplash.com/photo-1640636130916-855c90ec0159?q=80&w=1600&auto=format&fit=crop",
    card:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBU5aYizwXy-EByEbDoais7cWGHQrAIDyGJ__0hBk9vwO3RvExjHJw_UyoeEqiPZfy5kz4plzAWizNCd_XRQiN64iEzYvj_KllbRO0NNAH-EAGtvd_IzgJG-gck5nbLUtgRnAX8bJwvi1l3GVPfsD3cByOIkubFotzJ0Mdn9-8uhWkohqVtU6iAso0kBKcsQYOoRMOF2C8FCRdYFug_h70vhtX68msFdotLozfIYMBfJ_IMw-f3FzwqfFEWLF5f0ZSgBZW2_7P0U_bk"
  }
};

export const SPORT_LIST = [SPORTS.football, SPORTS.badminton, SPORTS.pickleball];

export const FALLBACK_SUB_CATS = {
  badminton: ["Tất cả", "Quần áo", "Giày", "Vợt cầu lông", "Phụ kiện"],
  football: ["Tất cả", "Quần áo", "Giày đá bóng", "Bóng đá", "Phụ kiện"],
  pickleball: ["Tất cả", "Quần áo", "Giày", "Vợt Pickleball", "Phụ kiện"]
};

export const FALLBACK_CATEGORY_IDS = {
  badminton: [1, 4, 5, 6, 7],
  football: [2, 8, 9, 10, 11],
  pickleball: [3, 12, 13, 14, 15]
};

export const FALLBACK_CATEGORY_NAMES = {
  1: "Tất cả",
  2: "Tất cả",
  3: "Tất cả",
  4: "Quần áo",
  5: "Giày",
  6: "Vợt cầu lông",
  7: "Phụ kiện",
  8: "Quần áo",
  9: "Giày đá bóng",
  10: "Bóng đá",
  11: "Phụ kiện",
  12: "Quần áo",
  13: "Giày",
  14: "Vợt Pickleball",
  15: "Phụ kiện"
};

export const BRANDS = {
  badminton: ["Yonex", "Victor", "Li-Ning"],
  football: ["Nike", "Adidas", "Puma"],
  pickleball: ["Selkirk", "Joola", "Passion", "Dill", "Penn", "K-Swiss"]
};

export const PRICE_RANGES = [
  { label: "Tất cả mức giá", value: "", minPrice: undefined, maxPrice: undefined },
  { label: "Dưới 500.000₫", value: "0-500000", minPrice: 0, maxPrice: 500000 },
  { label: "500.000 - 700.000₫", value: "500000-700000", minPrice: 500000, maxPrice: 700000 },
  { label: "700.000 - 1.000.000₫", value: "700000-1000000", minPrice: 700000, maxPrice: 1000000 },
  { label: "1.000.000 - 2.000.000₫", value: "1000000-2000000", minPrice: 1000000, maxPrice: 2000000 },
  { label: "Trên 2.000.000₫", value: "2000000-999999999", minPrice: 2000000, maxPrice: 999999999 }
];

export const SERVICES = [
  {
    icon: "ti-tools",
    title: "Đan vợt",
    text: "Đan lại vợt đúng lực căng, nhiều loại cước chọn lựa"
  },
  {
    icon: "ti-ruler",
    title: "Tư vấn chọn size",
    text: "Chọn size áo, giày chuẩn xác theo số đo"
  },
  {
    icon: "ti-shield-check",
    title: "Bảo hành chính hãng",
    text: "Hỗ trợ bảo hành theo chính sách hãng"
  },
  {
    icon: "ti-truck",
    title: "Giao hàng nhanh",
    text: "Nội thành trong ngày, toàn quốc 2-3 ngày"
  }
];

export const BLOG_POSTS = [
  {
    tag: "SỰ KIỆN",
    date: "22 Tháng 5, 2026",
    title: "Giải vô địch Cầu lông Thế giới 2026: Những công nghệ vợt đột phá",
    text: "Khám phá các thiết kế vật liệu nano và công nghệ khí động học mới nhất được các tay vợt hàng đầu thế giới sử dụng.",
    image:
      "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?q=80&w=800&auto=format&fit=crop"
  },
  {
    tag: "ĐÁNH GIÁ",
    date: "18 Tháng 5, 2026",
    title: "Siêu phẩm giày đá bóng siêu nhẹ mới từ Nike",
    text: "Đánh giá chi tiết về mẫu giày đá bóng mới với trọng lượng nhẹ, tối ưu tốc độ và độ bám sân.",
    image:
      "https://images.unsplash.com/photo-1511886929837-354d827aae26?q=80&w=800&auto=format&fit=crop"
  },
  {
    tag: "XU HƯỚNG",
    date: "15 Tháng 5, 2026",
    title: "Cơn sốt Pickleball đang bùng nổ toàn cầu như thế nào?",
    text: "Vì sao môn thể thao kết hợp giữa tennis, cầu lông và bóng bàn lại thu hút hàng triệu người chơi.",
    image: blogPickleball
  },
  {
    tag: "HOT TREND",
    date: "10 Tháng 5, 2026",
    title: "Top 5 trang phục thi đấu giải nhiệt mùa hè",
    text: "Tổng hợp những mẫu áo quần thi đấu sở hữu công nghệ vải thoáng khí, thấm hút mồ hôi tốt.",
    image: blogApparel
  },
  {
    tag: "VIDEO",
    date: "05 Tháng 5, 2026",
    title: "Hướng dẫn chọn vợt cầu lông cho người mới bắt đầu",
    text: "Video hướng dẫn cách lựa chọn cây vợt đầu tiên theo trọng lượng, điểm cân bằng và độ dẻo.",
    image: blogBadminton
  }
];

export const HERO_IMAGE = messiHero;
