import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Link,
  Navigate,
  NavLink,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams
} from "react-router-dom";
import { api, API_BASE } from "./api.js";
import {
  BLOG_POSTS,
  BRANDS,
  HERO_IMAGE,
  PRICE_RANGES,
  SERVICES,
  SPORT_KEY_BY_SLUG,
  SPORT_LIST,
  SPORTS
} from "./data.js";
import {
  buildCategoryMeta,
  formatPrice,
  getProductImages,
  normalizeProduct,
  uniqueById
} from "./utils.js";
import loginHeroImage from "../images/hinh-anh-messi-dep-nhat-8.webp";

const storage = {
  read(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  },
  write(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }
};

function brandKey(value = "") {
  return value.trim().toLowerCase();
}

function sizeOptionsForCategory(subCategory) {
  const lower = subCategory.toLowerCase();
  if (lower.includes("quần áo")) return ["S", "M", "L"];
  if (lower.includes("giày")) return ["36", "37", "38", "39", "40", "41", "42", "43", "44", "45"];
  return [];
}

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [pathname]);

  return null;
}

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [categoryMeta, setCategoryMeta] = useState(() => buildCategoryMeta());
  const [allProducts, setAllProducts] = useState([]);
  const [bootLoading, setBootLoading] = useState(true);
  const [backendError, setBackendError] = useState("");
  const [cartOpen, setCartOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [detailProduct, setDetailProduct] = useState(null);
  const [toast, setToast] = useState("");
  const [cart, setCart] = useState(() => storage.read("vp_cart", []));
  const [wishlist, setWishlist] = useState(() => new Set(storage.read("vp_wishlist", [])));
  const [user, setUser] = useState(() => storage.read("currentUser", null));
  const isStandalonePage =
    location.pathname === "/login" ||
    location.pathname === "/checkout" ||
    location.pathname === "/admin";

  const showToast = useCallback((message) => {
    setToast(message);
    window.clearTimeout(window.__vpToastTimer);
    window.__vpToastTimer = window.setTimeout(() => setToast(""), 2600);
  }, []);

  const loadProducts = useCallback(
    async (meta = categoryMeta) => {
      const products = await api.getAllProducts();
      const mapped = products.map((item) => normalizeProduct(item, meta.idToSub));
      setAllProducts(mapped);
      return mapped;
    },
    [categoryMeta]
  );

  useEffect(() => {
    let mounted = true;

    async function boot() {
      let meta = buildCategoryMeta();
      try {
        const tree = await api.getCategoryTree();
        meta = buildCategoryMeta(tree);
        if (mounted) setCategoryMeta(meta);
      } catch (error) {
        if (mounted) {
          setCategoryMeta(meta);
          setBackendError("Không tải được cây danh mục, đang dùng fallback.");
        }
      }

      try {
        const products = await api.getAllProducts();
        if (mounted) {
          setAllProducts(products.map((item) => normalizeProduct(item, meta.idToSub)));
          setBackendError("");
        }
      } catch (error) {
        if (mounted) {
          setBackendError("Không kết nối được backend. Hãy chạy server Spring Boot ở port 8080.");
        }
      } finally {
        if (mounted) setBootLoading(false);
      }
    }

    boot();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    storage.write("vp_cart", cart);
  }, [cart]);

  useEffect(() => {
    storage.write("vp_wishlist", [...wishlist]);
  }, [wishlist]);

  const cartCount = useMemo(() => cart.reduce((sum, item) => sum + item.qty, 0), [cart]);

  function addToCart(product, size = "") {
    const item = {
      id: product.id,
      name: product.name,
      brand: product.brand || "",
      price: Number(product.price || 0),
      imageUrl: product.imageUrl || "",
      size
    };

    setCart((current) => {
      const found = current.find((cartItem) => cartItem.id === item.id && cartItem.size === size);
      if (found) {
        return current.map((cartItem) =>
          cartItem.id === item.id && cartItem.size === size
            ? { ...cartItem, qty: cartItem.qty + 1 }
            : cartItem
        );
      }
      return [...current, { ...item, qty: 1 }];
    });

    showToast(`Đã thêm "${item.name}" vào giỏ hàng`);
  }

  function updateCartQty(id, size, delta) {
    setCart((current) =>
      current
        .map((item) =>
          item.id === id && item.size === size
            ? { ...item, qty: Math.max(1, item.qty + delta) }
            : item
        )
        .filter((item) => item.qty > 0)
    );
  }

  function removeCartItem(id, size) {
    setCart((current) => current.filter((item) => !(item.id === id && item.size === size)));
  }

  function toggleWishlist(id) {
    setWishlist((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleLoginSuccess(data) {
    const nextUser = {
      username: data.username,
      fullName: data.fullName,
      name: data.fullName,
      phoneNumber: data.phoneNumber,
      phone: data.phoneNumber,
      role: data.role,
      address: data.address || "",
      token: data.token
    };
    localStorage.setItem("isLoggedIn", "true");
    localStorage.setItem("isAdmin", String(data.role === "ADMIN"));
    localStorage.setItem("token", data.token);
    storage.write("currentUser", nextUser);
    setUser(nextUser);
    showToast("Đăng nhập thành công");
  }

  function handleProfileUpdate(nextUser) {
    const mergedUser = {
      ...(user || {}),
      ...nextUser,
      fullName: nextUser.fullName || nextUser.name || user?.fullName || user?.name || "",
      name: nextUser.fullName || nextUser.name || user?.fullName || user?.name || "",
      phoneNumber: nextUser.phoneNumber || nextUser.phone || user?.phoneNumber || user?.phone || "",
      phone: nextUser.phoneNumber || nextUser.phone || user?.phoneNumber || user?.phone || ""
    };
    storage.write("currentUser", mergedUser);
    setUser(mergedUser);
  }

  function logout() {
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("isAdmin");
    localStorage.removeItem("token");
    localStorage.removeItem("currentUser");
    setUser(null);
    setProfileOpen(false);
    showToast("Đã đăng xuất");
  }

  return (
    <>
      <ScrollToTop />
      {!isStandalonePage && (
        <Header
          cartCount={cartCount}
          user={user}
          onOpenCart={() => setCartOpen(true)}
          onOpenProfile={() => setProfileOpen(true)}
        />
      )}
      {!isStandalonePage && backendError && <BackendBanner message={backendError} />}
      <Routes>
        <Route
          path="/"
          element={
            <HomePage
              products={allProducts}
              loading={bootLoading}
              onOpenDetail={setDetailProduct}
              onAddToCart={addToCart}
              wishlist={wishlist}
              onToggleWishlist={toggleWishlist}
            />
          }
        />
        <Route
          path="/products/categories/:slug"
          element={
            <CategoryPage
              categoryMeta={categoryMeta}
              onOpenDetail={setDetailProduct}
              onAddToCart={addToCart}
              wishlist={wishlist}
              onToggleWishlist={toggleWishlist}
            />
          }
        />
        <Route
          path="/login"
          element={<LoginPage user={user} onSuccess={handleLoginSuccess} showToast={showToast} />}
        />
        <Route
          path="/checkout"
          element={
            <CheckoutPage
              cart={cart}
              user={user}
              onQty={updateCartQty}
              onRemove={removeCartItem}
              onClearCart={() => setCart([])}
              showToast={showToast}
            />
          }
        />
        <Route path="/blog" element={<BlogPage />} />
        <Route path="/orders" element={<OrdersPage user={user} />} />
        <Route
          path="/admin"
          element={
            <AdminPage
              user={user}
              products={allProducts}
              categoryMeta={categoryMeta}
              onRefresh={() => loadProducts(categoryMeta)}
              onLogout={logout}
              showToast={showToast}
            />
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {!isStandalonePage && <Footer />}
      <CartPanel
        open={cartOpen}
        cart={cart}
        onClose={() => setCartOpen(false)}
        onQty={updateCartQty}
        onRemove={removeCartItem}
        onCheckout={() => {
          if (!cart.length) {
            showToast("Giỏ hàng đang trống.");
            return;
          }
          setCartOpen(false);
          navigate("/checkout");
        }}
      />
      <ProductDetailModal
        product={detailProduct}
        onClose={() => setDetailProduct(null)}
        onAddToCart={addToCart}
        showToast={showToast}
      />
      <UserProfileModal
        open={profileOpen}
        user={user}
        onClose={() => setProfileOpen(false)}
        onUpdate={handleProfileUpdate}
        onLogout={logout}
        showToast={showToast}
      />
      <Toast message={toast} />
    </>
  );
}

function BackendBanner({ message }) {
  return (
    <div className="fixed top-[120px] left-1/2 z-[250] -translate-x-1/2 bg-[#111] text-white px-5 py-3 shadow-xl border-l-4 border-primary text-sm max-w-[90vw]">
      <span className="font-bold text-primary mr-2">Backend:</span>
      {message}
    </div>
  );
}

function Header({ cartCount, user, onOpenCart, onOpenProfile }) {
  const [hidden, setHidden] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState("");
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    let lastScrollTop = 0;
    function handleScroll() {
      const current = window.scrollY;
      setHidden(current > lastScrollTop && current > 200);
      lastScrollTop = current <= 0 ? 0 : current;
    }
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const activeSport = SPORT_LIST.find((sport) =>
    location.pathname.includes(`/products/categories/${sport.slug}`)
  );

  function submitSearch(event) {
    event.preventDefault();
    const slug = activeSport?.slug || SPORTS.badminton.slug;
    navigate(`/products/categories/${slug}?q=${encodeURIComponent(search.trim())}`);
  }

  const navClass = ({ isActive }) =>
    `px-3 xl:px-4 py-2 uppercase font-label-bold text-label-bold italic skew-x-[-10deg] inline-block cursor-pointer nav-link transition-colors ${
      isActive
        ? "text-white bg-primary/20 border-b-2 border-primary"
        : "text-gray-300 hover:text-white hover:bg-[#222]"
    }`;

  return (
    <header
      id="main-nav"
      className={`flex flex-col w-full z-50 fixed top-0 transition-transform duration-300 ${
        hidden ? "nav-hidden" : ""
      }`}
    >
      <div className="bg-primary text-on-primary py-2 marquee overflow-hidden">
        <div className="marquee-content font-label-bold text-label-bold flex gap-12 items-center uppercase italic">
          <span>MIỄN PHÍ VẬN CHUYỂN ĐƠN HÀNG TỪ 500K</span>
          <span>•</span>
          <span>GIẢM 20% CHO THÀNH VIÊN MỚI</span>
          <span>•</span>
          <span>KHÁM PHÁ BỘ SƯU TẬP PICKLEBALL MỚI NHẤT</span>
          <span>•</span>
          <span>ĐỔI TRẢ TRONG 30 NGÀY</span>
          <span>•</span>
          <span>HOTLINE: 1900 9999</span>
        </div>
      </div>

      <nav className="bg-[#111] backdrop-blur-md border-b-4 border-primary flex items-center justify-between px-margin-mobile md:px-margin-desktop py-3 h-20 shadow-2xl">
        <Link to="/" className="flex-shrink-0 flex items-center gap-4 cursor-pointer group">
          <div className="w-10 h-10 md:w-14 md:h-12 bg-primary flex items-center justify-center skew-x-[-15deg] group-hover:scale-105 transition-transform duration-300">
            <span className="text-white font-display-lg text-2xl font-black italic skew-x-[15deg] tracking-tighter">
              VP
            </span>
          </div>
          <div className="hidden sm:block">
            <div className="font-headline-lg text-sm font-black text-white tracking-[0.2em] uppercase italic">
              Velocity <span className="text-primary">Prime</span>
            </div>
            <div className="text-[9px] text-gray-400 tracking-[0.3em] uppercase mt-0.5">
              High Performance Sports
            </div>
          </div>
        </Link>

        <ul className="hidden lg:flex items-center gap-2">
          <li>
            <NavLink to="/" className={navClass}>
              <span className="inline-block skew-x-[10deg]">Trang chủ</span>
            </NavLink>
          </li>
          {SPORT_LIST.map((sport) => (
            <li key={sport.slug}>
              <NavLink to={sport.route} className={navClass}>
                <span className="inline-block skew-x-[10deg]">{sport.title}</span>
              </NavLink>
            </li>
          ))}
          <li>
            <NavLink to="/orders" className={navClass}>
              <span className="inline-flex skew-x-[10deg] items-center gap-1">
                <span className="material-symbols-outlined text-base">receipt_long</span>
                Đơn hàng
              </span>
            </NavLink>
          </li>
          <li>
            <NavLink to="/blog" className={navClass}>
              <span className="inline-block skew-x-[10deg]">Blog</span>
            </NavLink>
          </li>
          {user?.role === "ADMIN" && (
            <li>
              <NavLink to="/admin" className={navClass}>
                <span className="inline-flex skew-x-[10deg] items-center gap-1">
                  <span className="material-symbols-outlined text-base">admin_panel_settings</span>
                  Admin
                </span>
              </NavLink>
            </li>
          )}
        </ul>

        <div className="flex items-center gap-3 md:gap-5">
          <form
            onSubmit={submitSearch}
            className="hidden xl:flex items-center border border-[#333] skew-x-[-10deg] overflow-hidden bg-[#1a1a1a] max-w-[240px] focus-within:border-primary transition-colors"
          >
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tìm sản phẩm..."
              className="px-4 py-2 text-sm border-none outline-none bg-transparent w-full text-white placeholder-gray-500 skew-x-[10deg]"
            />
            <button className="px-4 py-2 bg-primary text-white hover:bg-red-700 transition-colors">
              <span className="material-symbols-outlined text-lg skew-x-[10deg] block">search</span>
            </button>
          </form>
          <button
            className="material-symbols-outlined text-gray-300 hover:text-primary transition-all duration-200 active:scale-95 text-[28px]"
            title="Yêu thích"
            onClick={() => navigate(activeSport?.route || SPORTS.badminton.route)}
          >
            favorite
          </button>
          <button
            className="material-symbols-outlined text-gray-300 hover:text-primary transition-all duration-200 active:scale-95 relative text-[28px]"
            onClick={onOpenCart}
            title="Giỏ hàng"
          >
            shopping_cart
            <span className="absolute -top-1 -right-2 bg-primary text-white text-[11px] min-w-5 h-5 px-1 flex items-center justify-center rounded-sm skew-x-[-10deg] font-black">
              <span className="skew-x-[10deg]">{cartCount}</span>
            </span>
          </button>
          {user ? (
            <button
              className="text-gray-300 hover:text-primary text-xs font-bold uppercase tracking-wider flex items-center gap-1"
              onClick={onOpenProfile}
              title="Thông tin tài khoản"
            >
              <span className="material-symbols-outlined text-[20px]">account_circle</span>
              {user.fullName || user.name || user.username}
            </button>
          ) : (
            <button
              className="material-symbols-outlined text-gray-300 hover:text-primary transition-all duration-200 active:scale-95 text-[28px]"
              onClick={() => navigate("/login")}
              title="Tài khoản"
            >
              person
            </button>
          )}
          <button
            className="lg:hidden material-symbols-outlined text-gray-300 text-[28px]"
            onClick={() => setMobileOpen((value) => !value)}
          >
            menu
          </button>
        </div>
      </nav>

      {mobileOpen && (
        <div className="lg:hidden bg-[#111] border-b border-primary px-margin-mobile py-4">
          <div className="flex flex-col gap-2">
            <Link onClick={() => setMobileOpen(false)} className="text-white py-2 uppercase font-bold" to="/">
              Trang chủ
            </Link>
            {SPORT_LIST.map((sport) => (
              <Link
                key={sport.slug}
                onClick={() => setMobileOpen(false)}
                className="text-gray-300 py-2 uppercase font-bold"
                to={sport.route}
              >
                {sport.title}
              </Link>
            ))}
            <Link onClick={() => setMobileOpen(false)} className="text-gray-300 py-2 uppercase font-bold" to="/orders">
              Đơn hàng
            </Link>
            <Link onClick={() => setMobileOpen(false)} className="text-gray-300 py-2 uppercase font-bold" to="/blog">
              Blog
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

function HomePage({ products, loading, onOpenDetail, onAddToCart, wishlist, onToggleWishlist }) {
  const featured = products.slice(0, 8);
  const saleProducts = products.filter((product) => product.badge === "sale").slice(0, 8);
  const visibleSale = saleProducts.length ? saleProducts : products.slice(0, 6);

  return (
    <main className="pt-[120px]">
      <section
        className="relative min-h-[90vh] flex items-center justify-start px-margin-mobile md:px-margin-desktop overflow-hidden bg-black"
        id="hero"
      >
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-r from-black/88 via-black/28 to-black/5 z-10" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/78 via-transparent to-black/25 z-10" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_42%,rgba(0,98,255,0.22),transparent_32%),radial-gradient(circle_at_18%_48%,rgba(192,0,33,0.20),transparent_28%)] z-10 mix-blend-screen" />
          <div className="absolute inset-y-0 left-0 w-[42vw] bg-gradient-to-r from-black via-black/70 to-transparent z-10" />
          <div
            className="w-full h-full bg-cover"
            style={{
              backgroundImage: `url("${HERO_IMAGE}")`,
              backgroundPosition: "center center",
              filter: "contrast(1.08) saturate(1.12) brightness(1.04)"
            }}
          />
        </div>
        <div className="absolute inset-x-0 top-0 h-1 bg-primary z-20 shadow-[0_0_28px_rgba(192,0,33,0.9)]" />
        <div className="absolute -left-20 bottom-8 w-[420px] h-[420px] border border-primary/30 rotate-45 z-10" />
        <div className="relative z-20 max-w-2xl flex flex-col items-start">
          <span className="bg-primary text-on-primary font-label-bold text-label-bold px-5 py-1.5 skew-x-hard italic mb-5 shadow-[0_0_28px_rgba(192,0,33,0.55)]">
            <span className="inline-block skew-x-reverse">MÙA GIẢI MỚI 2026</span>
          </span>
          <h1 className="font-display-lg text-[54px] md:text-[86px] leading-[1.08] italic uppercase mb-5 pt-2 text-white hero-title drop-shadow-[0_8px_24px_rgba(0,0,0,0.85)]">
            ĐỈNH CAO <br />{" "}
            <span className="text-primary drop-shadow-[0_0_18px_rgba(192,0,33,0.85)]">HIỆU SUẤT</span>
          </h1>
          <p className="font-body-lg text-body-lg text-white/80 max-w-lg mb-8 border-l-4 border-primary pl-4">
            Cầu lông · Bóng đá · Pickleball — Trang bị chính hãng từ các thương hiệu hàng đầu.
            Giao nhanh toàn quốc.
          </p>
          <a
            href="#equipment"
            className="group flex items-center gap-3 bg-primary text-on-primary font-headline-md text-xl italic px-10 py-4 hover:bg-white hover:text-primary transition-all transform active:scale-95 shadow-[0_14px_38px_rgba(192,0,33,0.45)] skew-x-hard"
          >
            <span className="inline-flex items-center gap-3 skew-x-reverse">
              SHOP NOW
              <span className="material-symbols-outlined group-hover:translate-x-2 transition-transform">
                arrow_forward
              </span>
            </span>
          </a>
          <div className="flex flex-wrap gap-4 mt-12 pt-8 border-t border-white/30">
            <Stat value={loading ? "..." : `${products.length}+`} label="Sản phẩm" />
            <Stat value="15+" label="Thương hiệu" />
            <Stat value="50K+" label="Khách hàng" />
            <Stat value="4.9★" label="Đánh giá" />
          </div>
        </div>
      </section>

      <section className="bg-white px-margin-mobile md:px-margin-desktop py-16" id="collection">
        <div className="max-w-7xl mx-auto">
          <SectionTitle title="BỘ SƯU TẬP MỚI" subtitle="Engineered for the elite" />
          {loading ? (
            <LoadingBlock text="Đang tải sản phẩm từ backend..." />
          ) : featured.length ? (
            <div className="marquee-container">
              <div className="flex gap-5 overflow-x-auto pb-3 scrollbar-hide">
                {featured.map((product) => (
                  <FeatureCard key={product.id} product={product} onOpenDetail={onOpenDetail} />
                ))}
              </div>
            </div>
          ) : (
            <EmptyBlock text="Chưa có sản phẩm để hiển thị." />
          )}
        </div>
      </section>

      <section className="bg-primary-container relative px-margin-mobile md:px-margin-desktop py-20 overflow-hidden">
        <div className="absolute -right-20 -top-20 opacity-10 pointer-events-none select-none">
          <span className="font-display-lg text-[200px] md:text-[300px] italic leading-none text-primary">
            SALE
          </span>
        </div>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-12 relative z-10">
          <div className="max-w-xl">
            <h2 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg italic text-on-primary-container leading-tight mb-4">
              HÀNG GIẢM GIÁ
            </h2>
            <p className="text-on-primary-container font-body-lg text-body-lg mb-8 opacity-90">
              Giảm đến 40% các sản phẩm hot nhất. Nhanh tay, số lượng có hạn.
            </p>
            <Link
              to={SPORTS.badminton.route}
              className="inline-block bg-primary text-on-primary px-12 py-4 font-label-bold text-label-bold skew-x-hard italic hover:bg-surface-tint transition-colors shadow-lg"
            >
              <span className="inline-block skew-x-reverse">SHOP SALE</span>
            </Link>
          </div>
          <div className="w-full flex gap-5 overflow-x-auto pb-3 scrollbar-hide">
            {visibleSale.map((product) => (
              <SaleCard key={product.id} product={product} onOpenDetail={onOpenDetail} />
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white px-margin-mobile md:px-margin-desktop py-20" id="equipment">
        <div className="max-w-7xl mx-auto">
          <h2 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg italic uppercase text-center mb-12 underline decoration-primary decoration-4 underline-offset-8 text-on-background">
            THIẾT BỊ THI ĐẤU
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {SPORT_LIST.map((sport) => (
              <Link key={sport.slug} to={sport.route} className="group cursor-pointer flex flex-col">
                <div className="flex-grow overflow-hidden bg-surface-container mb-4 border-b-4 border-transparent group-hover:border-primary transition-all rounded-xl min-h-[280px]">
                  <img
                    alt={sport.title}
                    className="w-full h-full object-cover grayscale group-hover:grayscale-0 group-hover:scale-105 transition-all duration-500"
                    src={sport.card}
                  />
                </div>
                <h3 className="font-headline-md text-headline-md italic uppercase flex items-center justify-between text-on-background">
                  {sport.label}
                  <span className="material-symbols-outlined text-primary">{sport.icon}</span>
                </h3>
                <p className="text-on-surface-variant mt-1">{sport.sub}.</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-surface-container-low px-margin-mobile md:px-margin-desktop py-16">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-8 border-l-8 border-primary pl-6">
            <h2 className="font-headline-lg text-xl md:text-2xl italic uppercase text-on-background">
              Dịch vụ chuyên nghiệp
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {SERVICES.map((service) => (
              <div
                key={service.title}
                className="bg-white p-6 rounded-xl border border-outline-variant hover:border-primary transition-all text-center group"
              >
                <i className={`ti ${service.icon} text-3xl text-primary mb-4 block group-hover:scale-110 transition-transform`} />
                <h4 className="font-label-bold text-sm text-on-surface mb-2">{service.title}</h4>
                <p className="text-xs text-secondary leading-relaxed">{service.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

function CategoryPage({ categoryMeta, onOpenDetail, onAddToCart, wishlist, onToggleWishlist }) {
  const { slug } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const sportKey = SPORT_KEY_BY_SLUG[slug] || "badminton";
  const sport = SPORTS[sportKey];
  const [products, setProducts] = useState([]);
  const [apiFiltered, setApiFiltered] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [subCategory, setSubCategory] = useState("Tất cả");
  const [selectedBrands, setSelectedBrands] = useState([]);
  const [selectedSizes, setSelectedSizes] = useState([]);
  const [priceRange, setPriceRange] = useState("");
  const [sortBy, setSortBy] = useState("");
  const [search, setSearch] = useState(searchParams.get("q") || "");

  useEffect(() => {
    setSearch(searchParams.get("q") || "");
  }, [searchParams]);

  useEffect(() => {
    let mounted = true;
    async function loadCategory() {
      setLoading(true);
      setError("");
      setSubCategory("Tất cả");
      setSelectedBrands([]);
      setSelectedSizes([]);
      setPriceRange("");
      setApiFiltered(null);
      try {
        const data = await api.getProductsByCategory(slug);
        if (mounted) {
          setProducts(data.map((item) => normalizeProduct(item, categoryMeta.idToSub)));
        }
      } catch (loadError) {
        if (mounted) {
          setProducts([]);
          setError(
            `Không gọi được ${API_BASE}/products/categories/${slug}. Hãy kiểm tra backend.`
          );
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadCategory();
    return () => {
      mounted = false;
    };
  }, [slug, categoryMeta.idToSub]);

  const activePrice = PRICE_RANGES.find((item) => item.value === priceRange) || PRICE_RANGES[0];

  useEffect(() => {
    let mounted = true;

    async function loadSizeFiltered() {
      if (!selectedSizes.length) {
        setApiFiltered(null);
        return;
      }

      try {
        const results = await Promise.all(
          selectedSizes.map((size) =>
            api.filterProducts({
              name: search,
              size,
              minPrice: activePrice.minPrice,
              maxPrice: activePrice.maxPrice
            })
          )
        );
        const sportIds = categoryMeta.sportCatIds[sportKey] || [];
        const mapped = uniqueById(results.flat())
          .filter((item) => sportIds.includes(item.categoryId))
          .map((item) => normalizeProduct(item, categoryMeta.idToSub));

        if (mounted) setApiFiltered(mapped);
      } catch {
        if (mounted) setApiFiltered(null);
      }
    }

    loadSizeFiltered();
    return () => {
      mounted = false;
    };
  }, [selectedSizes, search, activePrice.minPrice, activePrice.maxPrice, categoryMeta, sportKey]);

  function updateSearch(value) {
    setSearch(value);
    const next = new URLSearchParams(searchParams);
    if (value) next.set("q", value);
    else next.delete("q");
    setSearchParams(next, { replace: true });
  }

  const brandOptions = useMemo(() => {
    const mapped = new Map();
    [...(BRANDS[sportKey] || []), ...products.map((product) => product.brand)]
      .map((brand) => String(brand || "").trim())
      .filter(Boolean)
      .forEach((brand) => {
        const key = brandKey(brand);
        if (!mapped.has(key)) mapped.set(key, brand);
      });
    return [...mapped.values()];
  }, [products, sportKey]);

  const sizeOptions = useMemo(() => sizeOptionsForCategory(subCategory), [subCategory]);

  const visibleProducts = useMemo(() => {
    let list = [...(apiFiltered || products)];

    if (subCategory !== "Tất cả") {
      list = list.filter((product) => product.cat === subCategory);
    }
    if (search.trim()) {
      const needle = search.trim().toLowerCase();
      list = list.filter(
        (product) =>
          product.name.toLowerCase().includes(needle) ||
          product.brand.toLowerCase().includes(needle)
      );
    }
    if (selectedBrands.length) {
      const selectedBrandKeys = selectedBrands.map(brandKey);
      list = list.filter((product) => selectedBrandKeys.includes(brandKey(product.brand)));
    }
    if (activePrice.value) {
      list = list.filter(
        (product) =>
          product.price >= (activePrice.minPrice || 0) &&
          product.price <= (activePrice.maxPrice || Number.POSITIVE_INFINITY)
      );
    }
    if (sortBy === "price-asc") list.sort((a, b) => a.price - b.price);
    if (sortBy === "price-desc") list.sort((a, b) => b.price - a.price);
    if (sortBy === "rating") list.sort((a, b) => b.rating - a.rating);
    if (sortBy === "new") list.sort((a, b) => String(b.id).localeCompare(String(a.id)));

    return list;
  }, [products, apiFiltered, subCategory, search, selectedBrands, activePrice, sortBy]);

  function toggleBrand(brand) {
    setSelectedBrands((current) =>
      current.includes(brand) ? current.filter((item) => item !== brand) : [...current, brand]
    );
  }

  function toggleSize(size) {
    setSelectedSizes((current) =>
      current.includes(size) ? current.filter((item) => item !== size) : [...current, size]
    );
  }

  return (
    <main className="pt-[120px] min-h-screen bg-surface-container-low">
      <div className="max-w-[1500px] mx-auto px-margin-mobile md:px-margin-desktop py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)_230px] gap-6 layout-grid">
          <aside className="w-full h-fit flex flex-col gap-2 sidebar-filter lg:sticky lg:top-[132px] z-10">
            <FilterBox title="Danh mục sản phẩm">
              <ul className="p-2 space-y-1 text-sm text-on-surface">
                {(categoryMeta.subCats[sportKey] || ["Tất cả"]).map((cat) => (
                  <li key={cat}>
                    <button
                      className={`hover-slide-right w-full text-left px-3 py-2 rounded hover:bg-surface-container transition-colors ${
                        cat === subCategory ? "font-bold text-primary bg-primary/10" : ""
                      }`}
                      onClick={() => {
                        setSubCategory(cat);
                        setSelectedSizes([]);
                      }}
                    >
                      {cat.toUpperCase()}
                    </button>
                  </li>
                ))}
              </ul>
            </FilterBox>

            <FilterBox title="Theo kích cỡ" compact>
              <div className="p-2">
                {sizeOptions.length ? (
                  <div className="grid grid-cols-5 gap-1 text-[12px]">
                    {sizeOptions.map((size) => (
                      <button
                        key={size}
                        className={`size-filter-label py-1.5 border rounded text-center font-semibold ${
                          selectedSizes.includes(size)
                            ? "border-primary bg-primary text-white"
                            : "border-outline-variant hover:border-primary"
                        }`}
                        onClick={() => toggleSize(size)}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="px-2 py-2 text-[12px] text-secondary bg-surface-container-low rounded-md">
                    Chọn danh mục Quần áo hoặc Giày để lọc theo size.
                  </div>
                )}
              </div>
            </FilterBox>

            <FilterBox title="Mức giá">
              <div className="p-3 flex flex-col gap-1 text-sm">
                {PRICE_RANGES.map((range) => (
                  <label
                    key={range.value || "all"}
                    className="price-range-item flex items-center gap-2 px-2 py-2 rounded cursor-pointer hover:bg-surface-container transition-colors"
                  >
                    <input
                      type="radio"
                      name="priceRange"
                      value={range.value}
                      checked={priceRange === range.value}
                      onChange={() => setPriceRange(range.value)}
                      className="accent-primary"
                    />
                    <span className="text-on-surface">{range.label}</span>
                  </label>
                ))}
              </div>
            </FilterBox>
          </aside>

          <div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
              <div className="flex-1">
                <span className="font-headline-md text-xl font-semibold italic text-on-background">
                  {sport.title}
                </span>
                <span className="text-sm text-secondary ml-2">({visibleProducts.length} sản phẩm)</span>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="flex items-center border border-outline-variant rounded-lg overflow-hidden bg-white flex-1 sm:w-64 focus-within:border-primary transition-colors">
                  <span className="material-symbols-outlined text-secondary text-lg px-3">search</span>
                  <input
                    type="text"
                    value={search}
                    onChange={(event) => updateSearch(event.target.value)}
                    placeholder="Tìm sản phẩm..."
                    className="py-2 pr-3 text-sm border-none outline-none bg-transparent w-full text-on-surface placeholder-secondary"
                  />
                </div>
                <select
                  value={sortBy}
                  onChange={(event) => setSortBy(event.target.value)}
                  className="px-3 py-2 border border-outline-variant rounded-lg text-sm text-on-surface bg-white outline-none cursor-pointer whitespace-nowrap"
                >
                  <option value="">Sắp xếp</option>
                  <option value="price-asc">Giá tăng dần</option>
                  <option value="price-desc">Giá giảm dần</option>
                  <option value="rating">Đánh giá cao</option>
                  <option value="new">Mới nhất</option>
                </select>
              </div>
            </div>

            {loading ? (
              <LoadingBlock text="Đang tải sản phẩm..." />
            ) : error ? (
              <EmptyBlock text={error} />
            ) : visibleProducts.length ? (
              <div className="product-grid">
                {visibleProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onOpenDetail={onOpenDetail}
                    onAddToCart={onAddToCart}
                    isWishlisted={wishlist.has(product.id)}
                    onToggleWishlist={onToggleWishlist}
                  />
                ))}
              </div>
            ) : (
              <EmptyBlock text="Không tìm thấy sản phẩm. Thử đổi bộ lọc hoặc từ khóa tìm kiếm." />
            )}
          </div>

          <aside className="w-full h-fit flex flex-col gap-2 sidebar-filter lg:sticky lg:top-[132px] z-10">
            <FilterBox title="Thương hiệu" compact>
              <div className="p-2 grid grid-cols-1 gap-1 text-[12px]">
                {brandOptions.map((brand) => (
                  <label
                    key={brand}
                    className={`flex min-h-8 items-center gap-1.5 px-2 py-1 rounded-md border cursor-pointer transition-colors ${
                      selectedBrands.includes(brand)
                        ? "border-primary bg-primary/10 text-primary font-semibold"
                        : "border-outline-variant/70 text-on-surface-variant hover:border-primary"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedBrands.includes(brand)}
                      onChange={() => toggleBrand(brand)}
                      className="w-3.5 h-3.5 accent-primary flex-shrink-0"
                    />
                    <span className="truncate">{brand}</span>
                  </label>
                ))}
              </div>
            </FilterBox>
          </aside>
        </div>
      </div>
    </main>
  );
}

function FilterBox({ title, children, compact = false }) {
  return (
    <div className={`bg-white border border-[#68000d] ${compact ? "rounded-md" : "rounded"} overflow-hidden shadow-sm`}>
      <div
        className={`bg-[#68000d] text-white font-bold uppercase ${
          compact ? "px-3 py-1.5 text-[12px]" : "px-4 py-2 text-sm"
        }`}
      >
        {title}
      </div>
      {children}
    </div>
  );
}

function ProductCard({
  product,
  onOpenDetail,
  onAddToCart,
  isWishlisted = false,
  onToggleWishlist = () => {}
}) {
  return (
    <div
      className="product-card-hover bg-white rounded-xl overflow-hidden border border-outline-variant cursor-pointer flex flex-col h-full"
      onClick={() => onOpenDetail(product)}
    >
      <div className="relative bg-surface-container h-[210px] flex items-center justify-center overflow-hidden">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="product-img w-full h-full object-cover transition-transform duration-300"
          />
        ) : (
          <i className={`ti ${product.icon} text-[72px] text-outline-variant`} />
        )}
        <button
          className={`wishlist-btn absolute top-3 right-3 w-8 h-8 bg-white rounded-full border border-outline-variant flex items-center justify-center ${
            isWishlisted ? "active opacity-100" : ""
          }`}
          onClick={(event) => {
            event.stopPropagation();
            onToggleWishlist(product.id);
          }}
          title="Yêu thích"
        >
          <i className={`ti ti-heart ${isWishlisted ? "text-primary" : "text-secondary"}`} />
        </button>
        {product.badge && (
          <span className="absolute top-3 left-3 bg-primary text-white text-[10px] font-black px-2 py-1 rounded-sm uppercase">
            {product.badge}
          </span>
        )}
      </div>
      <div className="p-4 flex flex-col flex-1">
        <div className="text-[11px] font-bold text-secondary uppercase tracking-wider mb-1">
          {product.brand || "Velocity Prime"}
        </div>
        <h3 className="font-bold text-sm text-on-surface line-clamp-2 min-h-[40px]">{product.name}</h3>
        <div className="text-xs text-secondary mt-2">{product.cat}</div>
        <div className="flex items-center gap-1 mt-2 text-xs text-yellow-600">
          <span className="material-symbols-outlined text-sm">star</span>
          {product.rating}
          <span className="text-secondary">({product.reviews})</span>
        </div>
        <div className="mt-auto pt-4">
          <div className="text-primary font-black text-lg">{formatPrice(product.price)}</div>
          <button
            className="btn-effect mt-3 w-full py-2 bg-on-surface text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-2 hover:bg-primary transition-colors"
            onClick={(event) => {
              event.stopPropagation();
              onAddToCart(product);
            }}
          >
            <span className="material-symbols-outlined text-sm">add_shopping_cart</span>
            Thêm vào giỏ
          </button>
        </div>
      </div>
    </div>
  );
}

function FeatureCard({ product, onOpenDetail }) {
  return (
    <button
      className="w-[360px] flex-shrink-0 bg-surface-container rounded-xl border border-outline-variant hover:border-primary transition-all cursor-pointer p-6 flex flex-col items-center text-center product-card-hover"
      onClick={() => onOpenDetail(product)}
    >
      <div className="w-full h-48 flex items-center justify-center mb-4">
        {product.imageUrl ? (
          <img className="w-full h-full object-cover rounded-lg" src={product.imageUrl} alt={product.name} />
        ) : (
          <i className={`ti ${product.icon}`} style={{ fontSize: 80, color: "#d8c2c0" }} />
        )}
      </div>
      <div className="text-xs font-semibold text-secondary uppercase tracking-wider mb-2">
        {product.brand}
      </div>
      <h3 className="font-headline-md text-xl italic text-on-background line-clamp-1 mb-2">
        {product.name}
      </h3>
      <div className="text-primary font-black">{formatPrice(product.price)}</div>
    </button>
  );
}

function SaleCard({ product, onOpenDetail }) {
  return (
    <button
      className="w-[340px] flex-shrink-0 bg-white p-4 rounded-xl flex flex-col items-center text-center shadow-md border border-outline-variant cursor-pointer hover:border-primary transition-all product-card-hover"
      onClick={() => onOpenDetail(product)}
    >
      <div className="w-full h-40 bg-surface-container rounded-lg mb-4 flex items-center justify-center overflow-hidden">
        {product.imageUrl ? (
          <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
        ) : (
          <i className={`ti ${product.icon} text-[64px] text-outline-variant`} />
        )}
      </div>
      <span className="text-[10px] bg-primary text-white font-black px-2 py-1 rounded-sm mb-2">
        SALE
      </span>
      <h3 className="font-bold text-sm line-clamp-2 min-h-[40px]">{product.name}</h3>
      <div className="text-primary font-black mt-2">{formatPrice(product.price)}</div>
    </button>
  );
}

function ProductDetailModal({ product, onClose, onAddToCart, showToast }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState("");
  const [selectedVariant, setSelectedVariant] = useState(null);

  useEffect(() => {
    let mounted = true;
    async function loadDetail() {
      if (!product) return;
      setLoading(true);
      setDetail(null);
      setSelectedVariant(null);
      try {
        const data = await api.getProductDetail(product.id);
        const images = getProductImages(data, product.imageUrl);
        if (mounted) {
          setDetail(data);
          setSelectedImage(images[0] || "");
        }
      } catch {
        if (mounted) {
          setDetail(null);
          setSelectedImage(product.imageUrl || "");
          showToast("Không tải được chi tiết sản phẩm.");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadDetail();
    return () => {
      mounted = false;
    };
  }, [product, showToast]);

  if (!product) return null;

  const variants = detail?.productVariants || [];
  const images = getProductImages(detail, product.imageUrl);
  const price = Number(selectedVariant?.price || product.price || 0);
  const cartProduct = {
    ...product,
    price,
    imageUrl: selectedImage || product.imageUrl
  };

  return (
    <div className="detail-modal-bg open" onClick={onClose}>
      <div
        className="bg-white rounded-2xl w-[900px] max-w-full max-h-[90vh] overflow-y-auto relative shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          className="absolute right-4 top-4 z-10 w-9 h-9 bg-white/90 rounded-full flex items-center justify-center text-secondary hover:text-primary"
          onClick={onClose}
        >
          <span className="material-symbols-outlined">close</span>
        </button>
        {loading ? (
          <LoadingBlock text="Đang tải chi tiết sản phẩm..." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-6 md:p-8">
            <div>
              <div className="bg-surface-container rounded-xl h-[360px] flex items-center justify-center overflow-hidden">
                {selectedImage ? (
                  <img src={selectedImage} alt={product.name} className="w-full h-full object-cover" />
                ) : (
                  <i className={`ti ${product.icon} text-[96px] text-outline-variant`} />
                )}
              </div>
              {images.length > 1 && (
                <div className="flex gap-3 mt-3 overflow-x-auto">
                  {images.map((image) => (
                    <button
                      key={image}
                      className={`w-20 h-20 rounded-lg overflow-hidden border ${
                        image === selectedImage ? "border-primary" : "border-outline-variant"
                      }`}
                      onClick={() => setSelectedImage(image)}
                    >
                      <img src={image} alt={product.name} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="flex flex-col">
              <div className="text-xs font-bold text-secondary uppercase tracking-wider mb-2">
                {product.brand}
              </div>
              <h2 className="font-headline-lg text-3xl italic uppercase text-on-surface mb-3">
                {product.name}
              </h2>
              <div className="text-primary text-2xl font-black mb-4">{formatPrice(price)}</div>
              <p className="text-sm text-secondary leading-relaxed mb-5">
                {detail?.description || product.description || "Sản phẩm chính hãng, tối ưu cho hiệu suất thi đấu."}
              </p>

              {variants.length > 0 && (
                <div className="mb-6">
                  <div className="text-sm font-bold text-on-surface mb-2">Chọn biến thể</div>
                  <div className="flex flex-wrap gap-2">
                    {variants.map((variant) => {
                      const disabled = Number(variant.stockQuantity || 0) <= 0;
                      return (
                        <button
                          key={variant.id}
                          disabled={disabled}
                          className={`px-4 py-2 rounded-lg border text-sm font-semibold ${
                            selectedVariant?.id === variant.id
                              ? "border-primary bg-primary text-white"
                              : "border-outline-variant hover:border-primary"
                          } ${disabled ? "opacity-40 cursor-not-allowed" : ""}`}
                          onClick={() => setSelectedVariant(variant)}
                        >
                          {variant.size || variant.color || variant.sku}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex gap-3 mt-auto">
                <button
                  className="flex-1 py-3 bg-primary text-white rounded-lg font-bold hover:bg-surface-tint transition-colors"
                  onClick={() => {
                    onAddToCart(cartProduct, selectedVariant?.size || "");
                    onClose();
                  }}
                >
                  Thêm vào giỏ
                </button>
                <button
                  className="flex-1 py-3 bg-on-surface text-white rounded-lg font-bold hover:bg-primary transition-colors"
                  onClick={() => {
                    onAddToCart(cartProduct, selectedVariant?.size || "");
                    onClose();
                  }}
                >
                  Mua ngay
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function UserProfileModal({ open, user, onClose, onUpdate, onLogout, showToast }) {
  const [mode, setMode] = useState("view");
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState(null);
  const [editForm, setEditForm] = useState({
    fullName: "",
    phoneNumber: "",
    address: ""
  });
  const [passwordForm, setPasswordForm] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: ""
  });

  const username = user?.username;

  useEffect(() => {
    if (!open || !user) return;

    const localProfile = {
      username: user.username,
      fullName: user.fullName || user.name || "",
      role: user.role || "CUSTOMER",
      phoneNumber: user.phoneNumber || user.phone || "",
      address: user.address || ""
    };

    setMode("view");
    setProfile(localProfile);
    setEditForm({
      fullName: localProfile.fullName,
      phoneNumber: localProfile.phoneNumber,
      address: localProfile.address
    });
    setPasswordForm({ oldPassword: "", newPassword: "", confirmPassword: "" });

    let mounted = true;
    async function loadProfile() {
      if (!localProfile.username) return;
      setLoading(true);
      try {
        const data = await api.getProfile(localProfile.username);
        if (!mounted) return;
        const serverProfile = {
          username: data.username || localProfile.username,
          fullName: data.fullName || localProfile.fullName,
          role: data.role || localProfile.role,
          phoneNumber: data.phoneNumber || localProfile.phoneNumber,
          address: data.address || localProfile.address
        };
        setProfile(serverProfile);
        setEditForm({
          fullName: serverProfile.fullName,
          phoneNumber: serverProfile.phoneNumber,
          address: serverProfile.address
        });
        onUpdate(serverProfile);
      } catch {
        showToast("Không đồng bộ được thông tin từ server.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadProfile();
    return () => {
      mounted = false;
    };
  }, [open, username]);

  if (!open || !user || !profile) return null;

  function updateEdit(key, value) {
    setEditForm((current) => ({ ...current, [key]: value }));
  }

  function updatePassword(key, value) {
    setPasswordForm((current) => ({ ...current, [key]: value }));
  }

  async function saveProfile(event) {
    event.preventDefault();
    if (!username) return;
    if (!editForm.fullName.trim()) {
      showToast("Họ tên không được để trống.");
      return;
    }

    setLoading(true);
    try {
      const data = await api.updateProfile({
        username,
        fullname: editForm.fullName.trim(),
        phoneNumber: editForm.phoneNumber.trim()
      });
      const nextProfile = {
        username: data.username || username,
        fullName: data.fullName || editForm.fullName.trim(),
        role: data.role || profile.role,
        phoneNumber: data.phoneNumber || editForm.phoneNumber.trim(),
        address: data.address || editForm.address.trim()
      };
      setProfile(nextProfile);
      setEditForm({
        fullName: nextProfile.fullName,
        phoneNumber: nextProfile.phoneNumber,
        address: nextProfile.address
      });
      onUpdate(nextProfile);
      setMode("view");
      showToast("Cập nhật thông tin thành công.");
    } catch (error) {
      showToast(error.message || "Cập nhật thông tin thất bại.");
    } finally {
      setLoading(false);
    }
  }

  async function changePassword(event) {
    event.preventDefault();
    if (!username) return;
    if (!passwordForm.oldPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      showToast("Vui lòng nhập đầy đủ thông tin.");
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      showToast("Mật khẩu mới phải có ít nhất 6 ký tự.");
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showToast("Xác nhận mật khẩu mới không khớp.");
      return;
    }

    setLoading(true);
    try {
      await api.changePassword({
        username,
        oldPassword: passwordForm.oldPassword,
        newPassword: passwordForm.newPassword
      });
      setPasswordForm({ oldPassword: "", newPassword: "", confirmPassword: "" });
      setMode("view");
      showToast("Đổi mật khẩu thành công.");
    } catch (error) {
      showToast(error.message || "Đổi mật khẩu thất bại.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-bg open p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl w-[760px] max-w-full max-h-[90vh] overflow-y-auto shadow-2xl relative"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 text-gray-400 hover:text-primary transition-colors"
          title="Đóng"
        >
          <span className="material-symbols-outlined">close</span>
        </button>

        <div className="grid grid-cols-1 md:grid-cols-[260px_1fr]">
          <aside className="bg-on-surface text-white p-6 flex flex-col items-center text-center">
            <div className="w-24 h-24 rounded-full bg-primary flex items-center justify-center mb-4 shadow-xl">
              <span className="material-symbols-outlined text-5xl">person</span>
            </div>
            <h2 className="font-headline-md text-2xl italic uppercase leading-tight">
              {profile.fullName || "Người dùng"}
            </h2>
            <span className="mt-3 px-3 py-1 bg-primary/20 border border-primary/40 rounded-full text-xs font-bold uppercase">
              {profile.role || "CUSTOMER"}
            </span>
            <div className="mt-6 w-full space-y-3">
              <button
                className="w-full py-2.5 bg-white/10 text-white font-bold text-sm rounded-lg hover:bg-primary transition-colors flex items-center justify-center gap-2"
                onClick={() => setMode("edit")}
              >
                <span className="material-symbols-outlined text-lg">edit</span>
                Sửa thông tin
              </button>
              <button
                className="w-full py-2.5 border border-white/20 text-white font-bold text-sm rounded-lg hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2"
                onClick={() => {
                  setPasswordForm({ oldPassword: "", newPassword: "", confirmPassword: "" });
                  setMode("password");
                }}
              >
                <span className="material-symbols-outlined text-lg">lock_reset</span>
                Đổi mật khẩu
              </button>
              <button
                className="w-full py-2.5 bg-primary text-on-primary font-bold text-sm rounded-lg hover:bg-surface-tint transition-colors flex items-center justify-center gap-2"
                onClick={onLogout}
              >
                <span className="material-symbols-outlined text-lg">logout</span>
                Đăng xuất
              </button>
            </div>
          </aside>

          <section className="p-6 md:p-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-headline-md text-2xl italic uppercase text-on-surface">
                  {mode === "view" && "Thông tin tài khoản"}
                  {mode === "edit" && "Cập nhật thông tin"}
                  {mode === "password" && "Đổi mật khẩu"}
                </h3>
                <p className="text-sm text-secondary mt-1">
                  {loading ? "Đang đồng bộ dữ liệu..." : "Dữ liệu được lấy từ backend khi mở hồ sơ."}
                </p>
              </div>
            </div>

            {mode === "view" && (
              <div className="space-y-4">
                <ProfileInfoRow icon="badge" label="Họ và tên" value={profile.fullName || "Người dùng"} />
                <ProfileInfoRow icon="alternate_email" label="Tên đăng nhập" value={profile.username} />
                <ProfileInfoRow icon="phone" label="Số điện thoại" value={profile.phoneNumber || "Chưa cập nhật"} />
                <ProfileInfoRow icon="home" label="Địa chỉ" value={profile.address || "Chưa cập nhật"} />
                <ProfileInfoRow icon="admin_panel_settings" label="Vai trò" value={profile.role || "CUSTOMER"} />
              </div>
            )}

            {mode === "edit" && (
              <form className="space-y-4" onSubmit={saveProfile}>
                <Input
                  label="Họ và tên"
                  value={editForm.fullName}
                  onChange={(value) => updateEdit("fullName", value)}
                />
                <Input
                  label="Số điện thoại"
                  value={editForm.phoneNumber}
                  onChange={(value) => updateEdit("phoneNumber", value)}
                />
                <Input
                  label="Địa chỉ"
                  value={editForm.address}
                  onChange={(value) => updateEdit("address", value)}
                  required={false}
                />
                <p className="text-xs text-secondary">
                  Backend hiện lưu họ tên và số điện thoại. Địa chỉ được giữ trong localStorage nếu backend chưa có cột địa chỉ.
                </p>
                <div className="flex gap-3 pt-2">
                  <button
                    disabled={loading}
                    className="flex-1 py-2.5 bg-primary text-on-primary font-bold text-sm rounded-lg hover:bg-surface-tint transition-colors disabled:opacity-60"
                  >
                    Lưu thay đổi
                  </button>
                  <button
                    type="button"
                    className="flex-1 py-2.5 border border-outline-variant text-on-surface font-bold text-sm rounded-lg hover:border-primary transition-colors"
                    onClick={() => setMode("view")}
                  >
                    Hủy
                  </button>
                </div>
              </form>
            )}

            {mode === "password" && (
              <form className="space-y-4" onSubmit={changePassword}>
                <Input
                  label="Mật khẩu cũ"
                  type="password"
                  value={passwordForm.oldPassword}
                  onChange={(value) => updatePassword("oldPassword", value)}
                />
                <Input
                  label="Mật khẩu mới"
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(value) => updatePassword("newPassword", value)}
                />
                <Input
                  label="Xác nhận mật khẩu mới"
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(value) => updatePassword("confirmPassword", value)}
                />
                <div className="flex gap-3 pt-2">
                  <button
                    disabled={loading}
                    className="flex-1 py-2.5 bg-primary text-on-primary font-bold text-sm rounded-lg hover:bg-surface-tint transition-colors disabled:opacity-60"
                  >
                    Đổi mật khẩu
                  </button>
                  <button
                    type="button"
                    className="flex-1 py-2.5 border border-outline-variant text-on-surface font-bold text-sm rounded-lg hover:border-primary transition-colors"
                    onClick={() => setMode("view")}
                  >
                    Hủy
                  </button>
                </div>
              </form>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function ProfileInfoRow({ icon, label, value }) {
  return (
    <div className="flex items-start gap-3 p-4 border border-outline-variant rounded-xl bg-surface-container-lowest">
      <span className="material-symbols-outlined text-primary mt-0.5">{icon}</span>
      <div>
        <div className="text-xs font-bold text-secondary uppercase tracking-wider">{label}</div>
        <div className="text-sm font-semibold text-on-surface mt-1">{value}</div>
      </div>
    </div>
  );
}

function CartPanel({ open, cart, onClose, onQty, onRemove, onCheckout }) {
  const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);

  return (
    <>
      <div className={`cart-overlay ${open ? "open" : ""}`} onClick={onClose} />
      <aside className={`cart-panel ${open ? "open" : ""}`}>
        <div className="px-5 py-4 border-b border-outline-variant flex items-center justify-between">
          <h3 className="text-lg font-bold text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">shopping_cart</span>
            Giỏ hàng
          </h3>
          <button className="material-symbols-outlined text-secondary hover:text-on-surface" onClick={onClose}>
            close
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {cart.length ? (
            <div className="space-y-4">
              {cart.map((item) => (
                <div
                  key={`${item.id}-${item.size}`}
                  className="flex gap-3 border border-outline-variant rounded-lg p-3"
                >
                  <div className="w-16 h-16 bg-surface-container rounded overflow-hidden flex items-center justify-center">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <i className="ti ti-tag text-2xl text-outline" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm line-clamp-2">{item.name}</div>
                    {item.size && <div className="text-xs text-secondary mt-1">Size: {item.size}</div>}
                    <div className="text-primary font-black text-sm mt-1">{formatPrice(item.price)}</div>
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        className="w-7 h-7 border border-outline-variant rounded flex items-center justify-center"
                        onClick={() => onQty(item.id, item.size, -1)}
                      >
                        -
                      </button>
                      <span className="text-sm font-bold w-6 text-center">{item.qty}</span>
                      <button
                        className="w-7 h-7 border border-outline-variant rounded flex items-center justify-center"
                        onClick={() => onQty(item.id, item.size, 1)}
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <button
                    className="text-secondary hover:text-error self-start"
                    onClick={() => onRemove(item.id, item.size)}
                  >
                    <i className="ti ti-trash text-lg" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <EmptyBlock text="Giỏ hàng đang trống." compact />
          )}
        </div>
        <div className="p-5 border-t border-outline-variant">
          <div className="flex items-center justify-between mb-4">
            <span className="font-bold">Tổng tiền</span>
            <span className="font-black text-primary text-xl">{formatPrice(total)}</span>
          </div>
          <button
            className="w-full py-3.5 bg-primary text-on-primary rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-surface-tint transition-colors"
            onClick={onCheckout}
          >
            <span className="material-symbols-outlined text-lg">local_shipping</span>
            Thanh toán
          </button>
        </div>
      </aside>
    </>
  );
}

function CheckoutPage({ cart, user, onQty, onRemove, onClearCart, showToast }) {
  const navigate = useNavigate();
  const [shipping, setShipping] = useState("standard");
  const [payment, setPayment] = useState("cod");
  const [form, setForm] = useState({
    name: user?.fullName || user?.name || "",
    phone: user?.phoneNumber || user?.phone || "",
    city: "",
    district: "",
    ward: "",
    address: ""
  });

  useEffect(() => {
    if (!user) {
      sessionStorage.setItem("pendingCheckout", "true");
      showToast("Vui lòng đăng nhập để thanh toán.");
      navigate("/login", { replace: true });
    }
  }, [user, navigate, showToast]);

  if (!user) return null;

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const shippingFee = shipping === "express" ? 30000 : 0;
  const total = subtotal + shippingFee;

  function update(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function confirmOrder() {
    if (!cart.length) {
      showToast("Giỏ hàng đang trống.");
      return;
    }
    if (!form.name.trim() || !form.phone.trim() || !form.address.trim()) {
      showToast("Vui lòng nhập đầy đủ thông tin giao hàng.");
      return;
    }
    const nextOrder = {
      id: `VP${Date.now()}`,
      createdAt: new Date().toISOString(),
      status: "Chờ xác nhận",
      payment,
      shipping,
      customer: { ...form },
      items: cart,
      total
    };
    storage.write("vp_orders", [nextOrder, ...storage.read("vp_orders", [])]);
    onClearCart?.();
    showToast("Đặt hàng thành công! Cảm ơn bạn.");
    navigate("/orders", { replace: true });
  }

  return (
    <main className="bg-surface-container-low text-on-background font-body-md min-h-screen">
      <header className="bg-on-surface text-white py-4 px-margin-mobile md:px-margin-desktop flex items-center justify-between">
        <button className="flex items-center gap-2 cursor-pointer" onClick={() => navigate(-1)}>
          <span className="material-symbols-outlined">arrow_back</span>
          <span className="font-headline-md text-lg">Thanh toán</span>
        </button>
        <div className="text-sm">Bước 1/3</div>
      </header>

      <div className="max-w-4xl mx-auto px-margin-mobile md:px-margin-desktop py-8 w-full flex-1">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <section className="bg-white rounded-2xl p-6 md:p-8 shadow-sm">
              <h2 className="text-lg font-bold text-on-surface mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">local_shipping</span>
                Thông tin giao hàng
              </h2>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <CheckoutField
                    label="Họ và tên"
                    value={form.name}
                    onChange={(value) => update("name", value)}
                    placeholder="Nguyễn Văn A"
                  />
                  <CheckoutField
                    label="Số điện thoại"
                    value={form.phone}
                    onChange={(value) => update("phone", value)}
                    placeholder="0912 345 678"
                    type="tel"
                  />
                </div>
                <CheckoutSelect
                  label="Tỉnh/Thành phố"
                  value={form.city}
                  onChange={(value) => update("city", value)}
                  options={["Hà Nội", "Hồ Chí Minh", "Đà Nẵng"]}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <CheckoutSelect
                    label="Quận/Huyện"
                    value={form.district}
                    onChange={(value) => update("district", value)}
                    options={["Cầu Giấy", "Quận 1", "Hải Châu"]}
                  />
                  <CheckoutSelect
                    label="Phường/Xã"
                    value={form.ward}
                    onChange={(value) => update("ward", value)}
                    options={["Dịch Vọng", "Bến Nghé", "Thạch Thang"]}
                  />
                </div>
                <CheckoutField
                  label="Địa chỉ chi tiết"
                  value={form.address}
                  onChange={(value) => update("address", value)}
                  placeholder="Số nhà, tên đường..."
                />
              </div>
            </section>

            <section className="bg-white rounded-2xl p-6 md:p-8 shadow-sm">
              <h2 className="text-lg font-bold text-on-surface mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">local_shipping</span>
                Phương thức giao hàng
              </h2>
              <div className="space-y-3">
                <CheckoutRadio
                  name="shipping"
                  value="standard"
                  checked={shipping === "standard"}
                  onChange={setShipping}
                  title="Giao hàng tiêu chuẩn"
                  text="Giao trong 3-5 ngày (Miễn phí)"
                />
                <CheckoutRadio
                  name="shipping"
                  value="express"
                  checked={shipping === "express"}
                  onChange={setShipping}
                  title="Giao hàng nhanh (Express)"
                  text="Giao trong 1-2 ngày (+30.000₫)"
                />
              </div>
            </section>

            <section className="bg-white rounded-2xl p-6 md:p-8 shadow-sm">
              <h2 className="text-lg font-bold text-on-surface mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">payment</span>
                Phương thức thanh toán
              </h2>
              <div className="space-y-3">
                <CheckoutRadio
                  name="payment"
                  value="cod"
                  checked={payment === "cod"}
                  onChange={setPayment}
                  title="Thanh toán khi nhận hàng"
                  text="COD - Không phí thêm"
                />
                <CheckoutRadio
                  name="payment"
                  value="bank"
                  checked={payment === "bank"}
                  onChange={setPayment}
                  title="Chuyển khoản ngân hàng"
                  text="QR Code - Hoàn tiền nếu lỗi"
                />
                <CheckoutRadio
                  name="payment"
                  value="ewallet"
                  checked={payment === "ewallet"}
                  onChange={setPayment}
                  title="Ví điện tử"
                  text="Momo, ZaloPay, ViettelPay"
                />
              </div>
            </section>
          </div>

          <aside className="lg:col-span-1">
            <div className="bg-white rounded-2xl p-6 shadow-sm sticky top-6">
              <h2 className="text-lg font-bold text-on-surface mb-4">Đơn hàng của bạn</h2>
              <div className="space-y-3 mb-4 max-h-64 overflow-y-auto pb-4 border-b border-outline-variant">
                {cart.length ? (
                  cart.map((item) => (
                    <div key={`${item.id}-${item.size}`} className="flex gap-3">
                      <div className="w-14 h-14 bg-surface-container rounded overflow-hidden flex items-center justify-center">
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                          <i className="ti ti-tag text-xl text-outline" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm line-clamp-2">{item.name}</div>
                        <div className="text-xs text-secondary mt-1">
                          {item.size ? `Size ${item.size} · ` : ""}SL: {item.qty}
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-primary font-bold text-sm">{formatPrice(item.price)}</span>
                          <div className="flex items-center gap-1">
                            <button className="w-6 h-6 border border-outline-variant rounded" onClick={() => onQty(item.id, item.size, -1)}>
                              -
                            </button>
                            <button className="w-6 h-6 border border-outline-variant rounded" onClick={() => onQty(item.id, item.size, 1)}>
                              +
                            </button>
                            <button className="w-6 h-6 text-error" onClick={() => onRemove(item.id, item.size)}>
                              <i className="ti ti-trash" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-secondary text-center py-6">Giỏ hàng đang trống.</p>
                )}
              </div>

              <div className="mb-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Mã khuyến mãi"
                    className="flex-1 px-3 py-2 border border-outline-variant rounded-lg text-xs outline-none focus:border-primary transition-colors bg-white"
                  />
                  <button className="px-3 py-2 bg-primary/10 text-primary rounded-lg text-xs font-bold hover:bg-primary hover:text-white transition-colors">
                    Áp dụng
                  </button>
                </div>
              </div>

              <div className="space-y-2 mb-4 pb-4 border-b border-outline-variant text-sm">
                <div className="flex justify-between">
                  <span className="text-secondary">Tạm tính</span>
                  <span className="font-semibold text-on-surface">{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary">Vận chuyển</span>
                  <span className="font-semibold text-on-surface">
                    {shippingFee ? formatPrice(shippingFee) : "Miễn phí"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary">Giảm giá</span>
                  <span className="font-semibold text-error">0₫</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-outline-variant">
                  <span className="font-bold text-on-surface">Tổng cộng</span>
                  <span className="font-bold text-xl text-primary">{formatPrice(total)}</span>
                </div>
              </div>

              <button
                className="w-full py-3 bg-primary text-on-primary rounded-lg font-bold text-base hover:bg-surface-tint transition-colors flex items-center justify-center gap-2"
                onClick={confirmOrder}
              >
                <span className="material-symbols-outlined text-lg">check_circle</span>
                Xác nhận đặt hàng
              </button>
              <p className="text-xs text-secondary text-center mt-3">
                Bằng cách đặt hàng, bạn đã đồng ý với{" "}
                <span className="text-primary font-bold">Điều khoản</span> của chúng tôi
              </p>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

function OrdersPage({ user }) {
  const orders = useMemo(() => storage.read("vp_orders", []), []);

  return (
    <main className="min-h-screen bg-surface-container-low px-margin-mobile md:px-margin-desktop pt-[152px] pb-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
          <div>
            <p className="text-xs font-bold text-primary uppercase tracking-widest mb-2">Tài khoản</p>
            <h1 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg italic uppercase text-on-background">
              Đơn hàng
            </h1>
            <p className="text-sm text-secondary mt-1">Theo dõi các đơn đã đặt trên Velocity Prime.</p>
          </div>
          {!user && (
            <Link
              to="/login"
              className="px-5 py-3 bg-primary text-white rounded-lg font-bold text-sm hover:bg-surface-tint transition-colors"
            >
              Đăng nhập
            </Link>
          )}
        </div>

        {orders.length ? (
          <div className="space-y-4">
            {orders.map((order) => (
              <article key={order.id} className="bg-white border border-outline-variant rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-outline-variant flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <div className="font-bold text-on-surface">{order.id}</div>
                    <div className="text-xs text-secondary">
                      {new Date(order.createdAt).toLocaleString("vi-VN")}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold">
                      {order.status}
                    </span>
                    <span className="font-black text-primary">{formatPrice(order.total)}</span>
                  </div>
                </div>
                <div className="p-5">
                  <div className="grid grid-cols-1 md:grid-cols-[1fr_260px] gap-5">
                    <div className="space-y-3">
                      {(order.items || []).map((item) => (
                        <div key={`${order.id}-${item.id}-${item.size}`} className="flex gap-3">
                          <div className="w-14 h-14 bg-surface-container rounded overflow-hidden flex items-center justify-center flex-shrink-0">
                            {item.imageUrl ? (
                              <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                            ) : (
                              <i className="ti ti-tag text-xl text-outline" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold text-sm line-clamp-2">{item.name}</div>
                            <div className="text-xs text-secondary mt-1">
                              {item.size ? `Size ${item.size} · ` : ""}SL: {item.qty}
                            </div>
                            <div className="text-primary font-bold text-sm mt-1">{formatPrice(item.price)}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="bg-surface-container-low rounded-lg p-4 text-sm">
                      <div className="font-bold mb-2">Thông tin giao hàng</div>
                      <div className="text-secondary leading-relaxed">
                        <div>{order.customer?.name}</div>
                        <div>{order.customer?.phone}</div>
                        <div>{order.customer?.address}</div>
                        <div>
                          {[order.customer?.ward, order.customer?.district, order.customer?.city]
                            .filter(Boolean)
                            .join(", ")}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="bg-white border border-outline-variant rounded-xl p-10 text-center">
            <span className="material-symbols-outlined text-5xl text-outline-variant mb-3">receipt_long</span>
            <h2 className="font-bold text-on-surface mb-2">Chưa có đơn hàng</h2>
            <p className="text-sm text-secondary mb-6">Các đơn bạn đặt sẽ xuất hiện tại đây.</p>
            <Link
              to={SPORTS.badminton.route}
              className="inline-flex items-center justify-center px-6 py-3 bg-primary text-white rounded-lg font-bold text-sm hover:bg-surface-tint transition-colors"
            >
              Mua sắm ngay
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}

function CheckoutField({ label, value, onChange, type = "text", placeholder = "" }) {
  return (
    <label className="block">
      <span className="block text-sm font-bold text-on-surface mb-2">{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="w-full px-4 py-3 border border-outline-variant rounded-lg text-sm outline-none focus:border-primary transition-colors bg-white"
      />
    </label>
  );
}

function CheckoutSelect({ label, value, onChange, options }) {
  return (
    <label className="block">
      <span className="block text-sm font-bold text-on-surface mb-2">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full px-4 py-3 border border-outline-variant rounded-lg text-sm outline-none focus:border-primary transition-colors bg-white"
      >
        <option value="">-- Chọn {label} --</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function CheckoutRadio({ name, value, checked, onChange, title, text }) {
  return (
    <label
      className={`flex items-center gap-3 p-3 border-2 rounded-xl cursor-pointer transition-colors ${
        checked ? "border-primary bg-primary/5" : "border-outline-variant hover:border-primary"
      }`}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={() => onChange(value)}
        className="w-5 h-5 accent-primary"
      />
      <div className="flex-1">
        <div className="font-semibold text-on-surface">{title}</div>
        <div className="text-sm text-secondary">{text}</div>
      </div>
    </label>
  );
}

function LoginPage({ user, onSuccess, showToast }) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [mode, setMode] = useState(searchParams.get("tab") === "register" ? "register" : "login");
  const [form, setForm] = useState({
    username: "",
    password: "",
    fullname: "",
    phonenumber: "",
    confirmPassword: "",
    remember: false
  });
  const [errors, setErrors] = useState({});
  const [alert, setAlert] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setMode(searchParams.get("tab") === "register" ? "register" : "login");
    setErrors({});
    setAlert("");
  }, [searchParams]);

  function switchMode(nextMode) {
    const next = new URLSearchParams(searchParams);
    if (nextMode === "register") next.set("tab", "register");
    else next.delete("tab");
    setSearchParams(next, { replace: true });
  }

  function update(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function redirectAfterAuth(role) {
    if (sessionStorage.getItem("pendingCheckout")) {
      sessionStorage.removeItem("pendingCheckout");
      navigate("/checkout", { replace: true });
      return;
    }
    navigate(role === "ADMIN" ? "/admin" : "/", { replace: true });
  }

  function validateLogin() {
    const nextErrors = {};
    if (!form.username.trim()) nextErrors.username = "Vui lòng nhập tên đăng nhập.";
    if (!form.password.trim()) nextErrors.password = "Vui lòng nhập mật khẩu.";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function validateRegister() {
    const nextErrors = {};
    if (!form.username.trim()) nextErrors.username = "Vui lòng nhập tên đăng nhập.";
    if (!form.fullname.trim()) nextErrors.fullname = "Vui lòng nhập họ và tên.";
    if (!form.phonenumber.trim()) nextErrors.phonenumber = "Vui lòng nhập số điện thoại.";
    if (form.password.length < 6) nextErrors.password = "Mật khẩu tối thiểu 6 ký tự.";
    if (form.confirmPassword !== form.password) {
      nextErrors.confirmPassword = "Mật khẩu xác nhận không khớp.";
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function submit(event) {
    event.preventDefault();
    setAlert("");

    const isValid = mode === "login" ? validateLogin() : validateRegister();
    if (!isValid) return;

    setLoading(true);
    try {
      if (mode === "register") {
        await api.register({
          fullname: form.fullname.trim(),
          username: form.username.trim(),
          password: form.password,
          phonenumber: form.phonenumber.trim()
        });
      }

      const data = await api.login({
        username: form.username.trim(),
        password: form.password
      });

      onSuccess(data);
      if (mode === "register") showToast("Đăng ký thành công");
      redirectAfterAuth(data.role);
    } catch (error) {
      setAlert(error.message || "Có lỗi xảy ra khi kết nối đến server.");
    } finally {
      setLoading(false);
    }
  }

  if (user) {
    return (
      <main className="min-h-screen bg-surface-container-low flex items-center justify-center px-margin-mobile md:px-margin-desktop">
        <div className="bg-white border border-outline-variant rounded-2xl p-8 w-full max-w-[460px] text-center shadow-sm">
          <div className="w-16 h-16 bg-primary rounded-xl flex items-center justify-center mx-auto mb-5">
            <i className="ti ti-user-check text-3xl text-white" />
          </div>
          <h1 className="font-headline-lg text-3xl italic uppercase text-on-surface mb-2">
            Đã đăng nhập
          </h1>
          <p className="text-secondary mb-6">
            Bạn đang dùng tài khoản {user.fullName || user.username}.
          </p>
          <div className="flex gap-3">
            <button
              className="flex-1 py-3 bg-primary text-white rounded-lg font-bold hover:bg-surface-tint transition-colors"
              onClick={() => navigate(user.role === "ADMIN" ? "/admin" : "/")}
            >
              Tiếp tục
            </button>
            <button
              className="flex-1 py-3 border border-outline-variant rounded-lg font-bold hover:border-primary hover:text-primary transition-colors"
              onClick={() => navigate(-1)}
            >
              Quay lại
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="bg-[#f4f7fb] text-on-background font-body-md min-h-screen flex flex-col md:flex-row">
      <section className="hidden md:flex flex-1 bg-black text-white flex-col justify-center items-center p-12 relative overflow-hidden">
        <img
          src={loginHeroImage}
          className="absolute inset-0 w-full h-full object-cover object-center opacity-100 scale-105"
          alt="Messi background"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-[#11305e]/30 to-transparent z-10" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/10 z-10" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(60,130,255,0.22),transparent_30%),radial-gradient(circle_at_28%_55%,rgba(192,0,33,0.24),transparent_34%)] z-10 mix-blend-screen" />
        <div className="absolute inset-x-0 top-0 h-1 bg-primary z-20 shadow-[0_0_28px_rgba(192,0,33,0.9)]" />
        <div className="absolute -left-24 bottom-10 w-[420px] h-[420px] border border-primary/25 rotate-45 z-10" />
        <div className="relative z-20 text-center max-w-md px-6">
          <div className="w-16 h-16 bg-primary rounded-xl flex items-center justify-center mx-auto mb-6 shadow-[0_0_34px_rgba(192,0,33,0.65)]">
            <i className="ti ti-bolt text-3xl text-white" />
          </div>
          <p className="text-xs font-bold uppercase tracking-[0.32em] text-primary mb-3">
            Velocity Prime
          </p>
          <h1 className="font-display-lg text-[46px] leading-[1.08] italic uppercase mb-4 drop-shadow-[0_8px_28px_rgba(0,0,0,0.9)]">
            Sẵn sàng <span className="text-primary">ra sân</span>
          </h1>
          <p className="text-white/80 font-body-lg border-t border-white/15 pt-5">
            Đăng nhập để theo dõi đơn hàng, lưu wishlist và mua sắm gear thể thao chính hãng.
          </p>
        </div>
      </section>

      <section className="flex-1 flex flex-col justify-center items-center p-6 md:p-12 relative bg-[#f4f7fb] min-h-screen overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(0,98,255,0.10),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(192,0,33,0.10),transparent_34%)]" />
        <div className="absolute inset-y-0 left-0 w-px bg-primary/40 hidden md:block" />
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="absolute top-6 left-6 z-10 flex items-center gap-2 text-on-surface/70 hover:text-primary transition-colors"
        >
          <span className="material-symbols-outlined text-base">arrow_back</span>
          Quay lại
        </button>

        <Link to="/" className="absolute top-6 right-6 z-10 flex items-center gap-2 text-on-surface/70 hover:text-primary transition-colors">
          <span className="material-symbols-outlined text-base">home</span>
          Trang chủ
        </Link>

        <form className="relative z-10 w-full max-w-[420px] bg-white/95 border border-outline-variant rounded-2xl p-7 md:p-8 shadow-[0_24px_70px_rgba(10,18,35,0.16)] backdrop-blur-sm" onSubmit={submit}>
          <div className="flex border-b border-outline-variant mb-8">
            <button
              type="button"
              className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${
                mode === "login"
                  ? "text-primary border-primary"
                  : "text-secondary border-transparent hover:text-on-surface"
              }`}
              onClick={() => switchMode("login")}
            >
              Đăng Nhập
            </button>
            <button
              type="button"
              className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${
                mode === "register"
                  ? "text-primary border-primary"
                  : "text-secondary border-transparent hover:text-on-surface"
              }`}
              onClick={() => switchMode("register")}
            >
              Đăng Ký
            </button>
          </div>

          <h2 className="text-2xl font-bold text-on-surface mb-6">
            {mode === "login" ? "Chào mừng trở lại!" : "Tạo tài khoản mới"}
          </h2>

          {alert && (
            <div className="p-3 mb-4 text-xs font-semibold text-error bg-error-container border border-error/20 rounded-lg flex items-center gap-2">
              <span className="material-symbols-outlined text-base">error</span>
              <span>{alert}</span>
            </div>
          )}

          <div className="space-y-4">
            <AuthField
              label="Tên đăng nhập"
              value={form.username}
              error={errors.username}
              onChange={(value) => update("username", value)}
              placeholder="Nhập tên đăng nhập"
            />

            {mode === "register" && (
              <>
                <AuthField
                  label="Họ và tên"
                  value={form.fullname}
                  error={errors.fullname}
                  onChange={(value) => update("fullname", value)}
                  placeholder="Ví dụ: Nguyễn Văn A"
                />
                <AuthField
                  label="Số điện thoại"
                  value={form.phonenumber}
                  error={errors.phonenumber}
                  onChange={(value) => update("phonenumber", value)}
                  placeholder="0912 345 678"
                  type="tel"
                />
              </>
            )}

            <AuthField
              label="Mật khẩu"
              value={form.password}
              error={errors.password}
              onChange={(value) => update("password", value)}
              placeholder="••••••••"
              type="password"
            />

            {mode === "register" && (
              <AuthField
                label="Xác nhận mật khẩu"
                value={form.confirmPassword}
                error={errors.confirmPassword}
                onChange={(value) => update("confirmPassword", value)}
                placeholder="••••••••"
                type="password"
              />
            )}

            {mode === "login" && (
              <div className="flex items-center justify-between mt-2">
                <label className="flex items-center gap-2 text-sm text-secondary cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.remember}
                    onChange={(event) => update("remember", event.target.checked)}
                    className="rounded border-outline-variant text-primary focus:ring-primary"
                  />
                  <span className="text-secondary">Ghi nhớ đăng nhập</span>
                </label>
                <button type="button" className="text-xs text-primary font-semibold hover:underline">
                  Quên mật khẩu?
                </button>
              </div>
            )}

            <button
              disabled={loading}
              className={`btn-effect w-full py-3 mt-6 rounded-lg font-bold text-sm disabled:opacity-60 ${
                mode === "login" ? "bg-primary text-on-primary shadow-[0_12px_28px_rgba(192,0,33,0.22)]" : "bg-on-surface text-white"
              }`}
            >
              {loading ? "Đang xử lý..." : mode === "login" ? "Đăng Nhập" : "Đăng Ký Tài Khoản"}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}

function AuthField({ label, value, onChange, error, type = "text", placeholder = "" }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-on-surface block mb-1">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={`w-full px-4 py-3 border rounded-lg text-sm outline-none focus:border-primary transition-colors bg-white text-on-surface placeholder-secondary/70 ${
          error ? "border-error" : "border-outline-variant"
        }`}
      />
      {error && <p className="text-error text-xs mt-1">{error}</p>}
    </label>
  );
}

function AdminPage({ user, products, categoryMeta, onRefresh, onLogout, showToast }) {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [types, setTypes] = useState([]);
  const [activeTab, setActiveTab] = useState("featured");
  const [featuredIds, setFeaturedIds] = useState(() => storage.read("vp_admin_featured", []));
  const [saleConfig, setSaleConfig] = useState(() => storage.read("vp_admin_sale", []));
  const [featuredSearch, setFeaturedSearch] = useState("");
  const [saleSearch, setSaleSearch] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [form, setForm] = useState({
    name: "",
    brand: "",
    categoryId: "",
    typeId: "",
    description: "",
    sku: "",
    color: "",
    size: "",
    price: "",
    stockQuantity: "10",
    imageUrls: ""
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function loadAdminData() {
      try {
        const [catData, typeData] = await Promise.all([api.getCategories(), api.getProductTypes()]);
        if (mounted) {
          setCategories(catData);
          setTypes(typeData);
        }
      } catch {
        showToast("Không tải được dữ liệu admin từ backend.");
      }
    }
    loadAdminData();
    return () => {
      mounted = false;
    };
  }, [showToast]);

  useEffect(() => {
    storage.write("vp_admin_featured", featuredIds);
  }, [featuredIds]);

  useEffect(() => {
    storage.write("vp_admin_sale", saleConfig);
  }, [saleConfig]);

  const selectedFeaturedProducts = useMemo(
    () =>
      featuredIds
        .map((id) => products.find((product) => String(product.id) === String(id)))
        .filter(Boolean),
    [featuredIds, products]
  );

  const selectedSaleProducts = useMemo(
    () =>
      saleConfig
        .map((config) => {
          const product = products.find((item) => String(item.id) === String(config.id));
          return product ? { ...product, discount: config.discount } : null;
        })
        .filter(Boolean),
    [saleConfig, products]
  );

  const featuredChoices = useMemo(() => {
    const needle = featuredSearch.trim().toLowerCase();
    return (needle
      ? products.filter(
          (product) =>
            product.name.toLowerCase().includes(needle) ||
            product.brand.toLowerCase().includes(needle)
        )
      : products
    ).slice(0, 120);
  }, [featuredSearch, products]);

  const saleChoices = useMemo(() => {
    const needle = saleSearch.trim().toLowerCase();
    return (needle
      ? products.filter(
          (product) =>
            product.name.toLowerCase().includes(needle) ||
            product.brand.toLowerCase().includes(needle)
        )
      : products
    ).slice(0, 120);
  }, [saleSearch, products]);

  const adminUsers = useMemo(
    () => [
      {
        id: 1,
        username: user?.username || "admin",
        fullname: user?.fullName || user?.name || "Quản trị viên",
        role: "Admin",
        status: "Hoạt động",
        phone: user?.phoneNumber || user?.phone || "-"
      },
      { id: 2, username: "nguyenvana", fullname: "Nguyễn Văn A", role: "User", status: "Hoạt động", phone: "-" },
      { id: 3, username: "tranvib", fullname: "Trần Thị B", role: "User", status: "Hoạt động", phone: "-" },
      { id: 4, username: "levanc", fullname: "Lê Văn C", role: "User", status: "Bị khóa", phone: "-" },
      { id: 5, username: "phamthid", fullname: "Phạm Thị D", role: "User", status: "Hoạt động", phone: "-" }
    ],
    [user]
  );

  const filteredUsers = useMemo(() => {
    const needle = userSearch.trim().toLowerCase();
    if (!needle) return adminUsers;
    return adminUsers.filter(
      (adminUser) =>
        adminUser.username.toLowerCase().includes(needle) ||
        adminUser.fullname.toLowerCase().includes(needle)
    );
  }, [adminUsers, userSearch]);

  if (user?.role !== "ADMIN") {
    return (
      <main className="min-h-screen bg-surface-container-low">
        <AdminTopBar user={user} onLogout={user ? handleAdminLogout : null} />
        <section className="min-h-[calc(100vh-76px)] flex items-center justify-center px-margin-mobile md:px-margin-desktop py-12">
          <div className="max-w-xl w-full bg-white border border-outline-variant rounded-xl p-8 text-center shadow-sm">
            <span className="material-symbols-outlined text-5xl text-primary mb-3">lock</span>
            <h1 className="font-headline-lg text-4xl italic uppercase mb-2">Trang quản trị</h1>
            <p className="text-secondary mb-6">
              Vui lòng đăng nhập bằng tài khoản admin để quản lý sản phẩm và cấu hình giao diện.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                to="/login"
                className="px-6 py-3 bg-primary text-white rounded-lg font-bold text-sm hover:bg-surface-tint transition-colors"
              >
                Đăng nhập
              </Link>
              <Link
                to="/"
                className="px-6 py-3 border border-outline-variant rounded-lg font-bold text-sm hover:border-primary hover:text-primary transition-colors"
              >
                Về trang chủ
              </Link>
            </div>
            {user && (
              <button
                type="button"
                onClick={handleAdminLogout}
                className="mt-4 text-sm font-semibold text-primary hover:underline"
              >
                Đăng xuất tài khoản hiện tại
              </button>
            )}
          </div>
        </section>
      </main>
    );
  }

  const adminTabs = [
    { key: "featured", label: "Sản phẩm nổi bật", icon: "star" },
    { key: "sale", label: "Hàng giảm giá", icon: "local_offer" },
    { key: "add", label: "Thêm sản phẩm", icon: "add_circle" },
    { key: "users", label: "Quản lý User", icon: "group" }
  ];

  function update(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function clearForm() {
    setForm({
      name: "",
      brand: "",
      categoryId: "",
      typeId: "",
      description: "",
      sku: "",
      color: "",
      size: "",
      price: "",
      stockQuantity: "10",
      imageUrls: ""
    });
  }

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    try {
      const price = Number(form.price || 0);
      const brand = form.brand.trim();
      await api.createProduct({
        name: form.name.trim(),
        brand,
        categoryId: Number(form.categoryId),
        typeId: Number(form.typeId),
        description: form.description,
        imageUrls: form.imageUrls
          .split(/[\n,]/)
          .map((item) => item.trim())
          .filter(Boolean),
        variants: [
          {
            sku: form.sku.trim() || `${brand || "SKU"}-${Date.now()}`,
            color: form.color.trim() || "Default",
            size: form.size.trim() || "Default",
            price,
            stockQuantity: Number(form.stockQuantity || 0)
          }
        ]
      });
      showToast("Đã tạo sản phẩm.");
      clearForm();
      await onRefresh();
    } catch (error) {
      showToast(error.message || "Không tạo được sản phẩm.");
    } finally {
      setSaving(false);
    }
  }

  function handleAdminLogout() {
    onLogout?.();
    navigate("/");
  }

  function toggleFeatured(id) {
    const key = String(id);
    setFeaturedIds((current) => {
      if (current.includes(key)) return current.filter((item) => item !== key);
      if (current.length >= 3) {
        showToast("Tối đa 3 sản phẩm nổi bật.");
        return current;
      }
      return [...current, key];
    });
  }

  function removeFeatured(id) {
    const key = String(id);
    setFeaturedIds((current) => current.filter((item) => item !== key));
  }

  function toggleSale(id) {
    const key = String(id);
    setSaleConfig((current) =>
      current.some((item) => String(item.id) === key)
        ? current.filter((item) => String(item.id) !== key)
        : [...current, { id: key, discount: 20 }]
    );
  }

  function removeSale(id) {
    const key = String(id);
    setSaleConfig((current) => current.filter((item) => String(item.id) !== key));
  }

  function updateSaleDiscount(id, value) {
    const key = String(id);
    const nextDiscount = Math.min(90, Math.max(5, Number(value || 20)));
    setSaleConfig((current) =>
      current.map((item) => (String(item.id) === key ? { ...item, discount: nextDiscount } : item))
    );
  }

  return (
    <main className="min-h-screen bg-surface-container-low">
      <AdminTopBar user={user} onLogout={handleAdminLogout} />

      <div className="max-w-7xl mx-auto px-margin-mobile md:px-margin-desktop py-8">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5 mb-6">
          <div>
            <p className="text-xs font-bold text-primary uppercase tracking-widest mb-2">Velocity Prime Admin</p>
            <h1 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg italic uppercase text-on-background leading-tight">
              Trang quản trị
            </h1>
            <p className="text-on-surface-variant text-sm mt-1">
              Quản lý sản phẩm nổi bật, hàng giảm giá, thêm sản phẩm và tài khoản người dùng.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3 min-w-full lg:min-w-[420px]">
            <AdminStat label="Sản phẩm" value={products.length} />
            <AdminStat label="Nổi bật" value={`${featuredIds.length}/3`} />
            <AdminStat label="Sale" value={saleConfig.length} />
          </div>
        </div>

        <div className="flex gap-1 mb-6 bg-white border border-outline-variant rounded-xl p-1.5 w-full overflow-x-auto">
          {adminTabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
                activeTab === tab.key
                  ? "bg-primary text-white shadow-sm"
                  : "text-secondary hover:text-on-surface hover:bg-surface-container-low"
              }`}
            >
              <span className="material-symbols-outlined text-base">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "featured" && (
          <section className="bg-white rounded-xl border border-outline-variant p-6">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-5">
              <div>
                <h2 className="font-bold text-on-surface mb-1">Sản phẩm nổi bật</h2>
                <p className="text-sm text-secondary">
                  Chọn tối đa 3 sản phẩm để dùng cho khu vực bộ sưu tập mới trên trang chủ.
                </p>
              </div>
              <div className="flex items-center border border-outline-variant rounded-lg overflow-hidden bg-white w-full md:w-72 focus-within:border-primary transition-colors">
                <span className="material-symbols-outlined text-secondary text-lg px-3">search</span>
                <input
                  type="text"
                  value={featuredSearch}
                  onChange={(event) => setFeaturedSearch(event.target.value)}
                  placeholder="Tìm sản phẩm..."
                  className="py-2 pr-3 text-sm border-none outline-none bg-transparent w-full"
                />
              </div>
            </div>

            <div className="mb-6">
              <div className="text-xs font-bold text-secondary uppercase tracking-wider mb-3">
                Đang hiển thị ({selectedFeaturedProducts.length}/3)
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[0, 1, 2].map((slot) => {
                  const product = selectedFeaturedProducts[slot];
                  return product ? (
                    <div key={product.id} className="border border-primary rounded-xl p-3 relative bg-primary/5">
                      <button
                        type="button"
                        onClick={() => removeFeatured(product.id)}
                        className="absolute top-2 right-2 w-7 h-7 bg-error/10 text-error rounded-full flex items-center justify-center hover:bg-error/20 transition-colors"
                        aria-label="Bỏ sản phẩm nổi bật"
                      >
                        <span className="material-symbols-outlined text-sm">close</span>
                      </button>
                      <AdminProductThumb product={product} className="h-28 mb-2" />
                      <div className="text-[10px] text-secondary uppercase">{product.brand}</div>
                      <div className="text-sm font-semibold text-on-surface truncate pr-7">{product.name}</div>
                      <div className="text-xs text-primary font-bold mt-0.5">{formatPrice(product.price)}</div>
                    </div>
                  ) : (
                    <div
                      key={slot}
                      className="border-2 border-dashed border-outline-variant rounded-xl p-3 flex flex-col items-center justify-center h-[174px] text-secondary bg-surface-container-low"
                    >
                      <span className="material-symbols-outlined text-3xl text-outline-variant mb-1">
                        add_photo_alternate
                      </span>
                      <div className="text-xs">Slot {slot + 1} trống</div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="border-t border-outline-variant pt-4">
              <div className="text-xs font-bold text-secondary uppercase tracking-wider mb-3">
                Chọn từ danh sách sản phẩm
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 max-h-[420px] overflow-y-auto pr-1">
                {featuredChoices.map((product) => (
                  <AdminProductChoiceCard
                    key={product.id}
                    product={product}
                    selected={featuredIds.includes(String(product.id))}
                    onClick={() => toggleFeatured(product.id)}
                  />
                ))}
              </div>
              {!featuredChoices.length && <EmptyBlock text="Không tìm thấy sản phẩm phù hợp." />}
            </div>
          </section>
        )}

        {activeTab === "sale" && (
          <section className="bg-white rounded-xl border border-outline-variant p-6">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-5">
              <div>
                <h2 className="font-bold text-on-surface mb-1">Hàng giảm giá</h2>
                <p className="text-sm text-secondary">
                  Chọn sản phẩm cho carousel giảm giá và đặt phần trăm giảm từng sản phẩm.
                </p>
              </div>
              <div className="flex items-center border border-outline-variant rounded-lg overflow-hidden bg-white w-full md:w-72 focus-within:border-primary transition-colors">
                <span className="material-symbols-outlined text-secondary text-lg px-3">search</span>
                <input
                  type="text"
                  value={saleSearch}
                  onChange={(event) => setSaleSearch(event.target.value)}
                  placeholder="Tìm sản phẩm..."
                  className="py-2 pr-3 text-sm border-none outline-none bg-transparent w-full"
                />
              </div>
            </div>

            <div className="mb-6">
              <div className="text-xs font-bold text-secondary uppercase tracking-wider mb-3">
                Đang trong carousel ({selectedSaleProducts.length} sản phẩm)
              </div>
              {selectedSaleProducts.length ? (
                <div className="space-y-2">
                  {selectedSaleProducts.map((product) => (
                    <div
                      key={product.id}
                      className="flex items-center gap-3 p-3 border border-outline-variant rounded-xl bg-white"
                    >
                      <AdminProductThumb product={product} className="w-14 h-14 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-[10px] text-secondary uppercase">{product.brand}</div>
                        <div className="text-sm font-semibold text-on-surface truncate">{product.name}</div>
                        <div className="text-xs text-primary">{formatPrice(product.price)}</div>
                      </div>
                      <label className="flex items-center gap-2">
                        <span className="text-xs text-secondary">Giảm</span>
                        <input
                          type="number"
                          min="5"
                          max="90"
                          value={product.discount}
                          onChange={(event) => updateSaleDiscount(product.id, event.target.value)}
                          className="w-16 px-2 py-1 border border-outline-variant rounded text-sm text-center outline-none focus:border-primary"
                        />
                        <span className="text-xs text-secondary">%</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => removeSale(product.id)}
                        className="w-8 h-8 flex items-center justify-center text-secondary hover:text-error transition-colors flex-shrink-0"
                        aria-label="Bỏ sản phẩm sale"
                      >
                        <span className="material-symbols-outlined text-lg">delete</span>
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-secondary text-center py-6 border-2 border-dashed border-outline-variant rounded-xl">
                  Chưa có sản phẩm nào. Chọn từ danh sách bên dưới.
                </div>
              )}
            </div>

            <div className="border-t border-outline-variant pt-4">
              <div className="text-xs font-bold text-secondary uppercase tracking-wider mb-3">
                Chọn từ danh sách sản phẩm
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 max-h-[420px] overflow-y-auto pr-1">
                {saleChoices.map((product) => (
                  <AdminProductChoiceCard
                    key={product.id}
                    product={product}
                    selected={saleConfig.some((item) => String(item.id) === String(product.id))}
                    onClick={() => toggleSale(product.id)}
                  />
                ))}
              </div>
              {!saleChoices.length && <EmptyBlock text="Không tìm thấy sản phẩm phù hợp." />}
            </div>
          </section>
        )}

        {activeTab === "add" && (
          <section className="bg-white rounded-xl border border-outline-variant p-6">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
              <div>
                <h2 className="font-bold text-on-surface mb-1">Thêm sản phẩm mới</h2>
                <p className="text-sm text-secondary">
                  Tạo sản phẩm qua API backend và gửi kèm variant đầu tiên.
                </p>
              </div>
              <button
                type="button"
                onClick={clearForm}
                className="px-4 py-2 border border-outline-variant rounded-lg text-sm font-semibold text-secondary hover:text-on-surface hover:border-on-surface transition-colors"
              >
                Xóa form
              </button>
            </div>

            <form className="space-y-5" onSubmit={submit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Input label="Tên sản phẩm" value={form.name} onChange={(value) => update("name", value)} />
                <Input label="Thương hiệu" value={form.brand} onChange={(value) => update("brand", value)} />
                <Select
                  label="Danh mục"
                  value={form.categoryId}
                  onChange={(value) => update("categoryId", value)}
                  options={categories.map((cat) => ({
                    value: cat.id,
                    label: `${cat.name}${categoryMeta.idToSub[cat.id] === "Tất cả" ? " (cha)" : ""}`
                  }))}
                />
                <Select
                  label="Loại sản phẩm"
                  value={form.typeId}
                  onChange={(value) => update("typeId", value)}
                  options={types.map((type) => ({ value: type.id, label: type.name }))}
                />
                <div className="md:col-span-2">
                  <Textarea
                    label="Mô tả"
                    value={form.description}
                    onChange={(value) => update("description", value)}
                  />
                </div>
                <div className="md:col-span-2">
                  <Textarea
                    label="Image URL"
                    value={form.imageUrls}
                    onChange={(value) => update("imageUrls", value)}
                    placeholder="Mỗi dòng một URL hoặc phân tách bằng dấu phẩy"
                  />
                </div>
              </div>

              <div className="border border-dashed border-primary/40 rounded-xl p-4 bg-primary/5">
                <div className="text-xs font-bold text-primary uppercase tracking-wider mb-3">
                  Variant đầu tiên
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                  <Input label="SKU" value={form.sku} onChange={(value) => update("sku", value)} required={false} />
                  <Input
                    label="Màu sắc"
                    value={form.color}
                    onChange={(value) => update("color", value)}
                    required={false}
                  />
                  <Input label="Kích cỡ" value={form.size} onChange={(value) => update("size", value)} />
                  <Input label="Giá bán" type="number" value={form.price} onChange={(value) => update("price", value)} />
                  <Input
                    label="Tồn kho"
                    type="number"
                    value={form.stockQuantity}
                    onChange={(value) => update("stockQuantity", value)}
                  />
                </div>
              </div>

              <button
                disabled={saving}
                className="flex items-center justify-center gap-2 px-8 py-3 bg-primary text-white rounded-lg font-bold hover:bg-surface-tint transition-colors disabled:opacity-60"
              >
                <span className="material-symbols-outlined text-base">add_circle</span>
                {saving ? "Đang lưu..." : "Tạo sản phẩm"}
              </button>
            </form>
          </section>
        )}

        {activeTab === "users" && (
          <section className="bg-white rounded-xl border border-outline-variant p-6">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
              <div>
                <h2 className="font-bold text-on-surface mb-1">Quản lý User</h2>
                <p className="text-sm text-secondary">
                  Backend hiện chưa có API danh sách user, nên phần này giữ cách hiển thị như trang quản trị cũ.
                </p>
              </div>
              <div className="flex items-center border border-outline-variant rounded-lg overflow-hidden bg-white w-full md:w-72 focus-within:border-primary transition-colors">
                <span className="material-symbols-outlined text-secondary text-lg px-3">search</span>
                <input
                  type="text"
                  value={userSearch}
                  onChange={(event) => setUserSearch(event.target.value)}
                  placeholder="Tìm kiếm user..."
                  className="py-2 pr-3 text-sm border-none outline-none bg-transparent w-full"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-surface-container-low text-secondary font-semibold border-b border-outline-variant">
                  <tr>
                    <th className="py-3 px-4 rounded-tl-lg">ID</th>
                    <th className="py-3 px-4">Tên đăng nhập</th>
                    <th className="py-3 px-4">Họ và tên</th>
                    <th className="py-3 px-4">Số điện thoại</th>
                    <th className="py-3 px-4">Vai trò</th>
                    <th className="py-3 px-4">Trạng thái</th>
                    <th className="py-3 px-4 rounded-tr-lg">Hành động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  {filteredUsers.map((adminUser) => (
                    <tr key={adminUser.id} className="hover:bg-surface-container-low transition-colors">
                      <td className="py-3 px-4 text-secondary">{adminUser.id}</td>
                      <td className="py-3 px-4 font-semibold text-on-surface">{adminUser.username}</td>
                      <td className="py-3 px-4">{adminUser.fullname}</td>
                      <td className="py-3 px-4 text-secondary">{adminUser.phone}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                            adminUser.role === "Admin"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-surface-container text-secondary"
                          }`}
                        >
                          {adminUser.role}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                            adminUser.status === "Hoạt động"
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {adminUser.status}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            className="w-8 h-8 rounded bg-primary/10 text-primary flex items-center justify-center hover:bg-primary hover:text-white transition-colors"
                            title="Chỉnh sửa"
                          >
                            <span className="material-symbols-outlined text-sm">edit</span>
                          </button>
                          <button
                            type="button"
                            className="w-8 h-8 rounded bg-error/10 text-error flex items-center justify-center hover:bg-error hover:text-white transition-colors"
                            title="Khóa"
                          >
                            <span className="material-symbols-outlined text-sm">block</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!filteredUsers.length && (
                    <tr>
                      <td colSpan="7" className="py-6 text-center text-secondary">
                        Không tìm thấy người dùng nào
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

function AdminTopBar({ user, onLogout }) {
  return (
    <header className="bg-[#111] border-b-4 border-primary shadow-2xl">
      <div className="max-w-7xl mx-auto px-margin-mobile md:px-margin-desktop py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <Link to="/" className="flex items-center gap-3 group flex-shrink-0">
            <div className="w-10 h-10 bg-primary flex items-center justify-center skew-x-[-15deg] group-hover:scale-105 transition-transform duration-300">
              <span className="text-white font-display-lg text-2xl font-black italic skew-x-[15deg] tracking-tighter">
                VP
              </span>
            </div>
            <div className="hidden sm:block">
              <div className="font-headline-lg text-sm font-black text-white tracking-[0.2em] uppercase italic">
                Velocity <span className="text-primary">Prime</span>
              </div>
              <div className="text-[9px] text-gray-400 tracking-[0.3em] uppercase mt-0.5">Admin Panel</div>
            </div>
          </Link>
          <div className="h-8 w-px bg-gray-700 hidden sm:block" />
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-white text-sm">admin_panel_settings</span>
            </div>
            <div className="min-w-0">
              <div className="font-bold text-white text-sm truncate">Trang quản trị</div>
              <div className="text-[11px] text-gray-400 truncate">
                {user?.fullName || user?.name || user?.username || "Velocity Prime Admin"}
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <Link to="/" className="flex items-center gap-2 text-sm text-gray-300 hover:text-white transition-colors">
            <span className="material-symbols-outlined text-base">home</span>
            <span className="hidden sm:inline">Trang chủ</span>
          </Link>
          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              className="flex items-center gap-2 text-sm text-gray-300 hover:text-red-400 transition-colors border border-gray-600 rounded-lg px-4 py-2"
            >
              <span className="material-symbols-outlined text-base">logout</span>
              <span className="hidden sm:inline">Đăng xuất</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

function AdminStat({ label, value }) {
  return (
    <div className="bg-white border border-outline-variant rounded-xl px-4 py-3">
      <div className="text-xs text-secondary uppercase font-bold">{label}</div>
      <div className="font-headline-md text-2xl italic text-on-background">{value}</div>
    </div>
  );
}

function AdminProductThumb({ product, className = "" }) {
  return (
    <div className={`bg-surface-container rounded-lg flex items-center justify-center overflow-hidden ${className}`}>
      {product.imageUrl ? (
        <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
      ) : (
        <i className={`ti ${product.icon || "ti-package"} text-[40px] text-outline-variant`} />
      )}
    </div>
  );
}

function AdminProductChoiceCard({ product, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left border rounded-xl p-2 cursor-pointer transition-all ${
        selected ? "border-primary bg-primary/5" : "border-outline-variant hover:border-primary"
      }`}
    >
      <AdminProductThumb product={product} className="h-20 mb-2" />
      <div className="text-[10px] text-secondary uppercase truncate">{product.brand}</div>
      <div className="text-xs font-semibold text-on-surface truncate leading-tight">{product.name}</div>
      <div className="text-xs text-primary font-bold">{formatPrice(product.price)}</div>
      {selected && (
        <div className="mt-1 text-center">
          <span className="text-[10px] bg-primary text-white px-2 py-0.5 rounded-full">Đã chọn</span>
        </div>
      )}
    </button>
  );
}

function BlogPage() {
  return (
    <main className="pt-[120px] min-h-screen bg-surface-container-low">
      <div className="relative h-56 md:h-72 flex items-end overflow-hidden mb-12">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1461896836934-ffe607ba8211?q=80&w=1600&auto=format&fit=crop')"
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-transparent" />
        <div className="relative z-10 px-margin-mobile md:px-margin-desktop pb-8 w-full">
          <Link to="/" className="flex items-center gap-2 text-white/70 text-sm mb-3 hover:text-white transition-colors">
            <span className="material-symbols-outlined text-base">arrow_back</span>
            Trang chủ
          </Link>
          <h1 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg italic uppercase text-white">
            Tin Tức & Blog
          </h1>
          <p className="text-white/70 font-label-bold text-sm mt-1 uppercase tracking-widest">
            Cập nhật xu hướng, đánh giá thiết bị & kinh nghiệm tập luyện
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-margin-mobile md:px-margin-desktop pb-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {BLOG_POSTS.map((post) => (
            <article
              key={post.title}
              className="bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 flex flex-col group cursor-pointer border border-outline-variant/30"
            >
              <div className="h-[240px] w-full overflow-hidden relative">
                <img
                  src={post.image}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  alt={post.title}
                />
                <div className="absolute top-4 left-4 bg-primary text-white text-[10px] font-black px-3 py-1 rounded-sm skew-x-[-10deg] shadow-md">
                  <span className="block skew-x-[10deg]">{post.tag}</span>
                </div>
              </div>
              <div className="p-6 flex-1 flex flex-col justify-between">
                <div>
                  <span className="text-xs text-secondary font-medium">{post.date}</span>
                  <h3 className="font-bold text-lg leading-snug mt-2 mb-3 group-hover:text-primary transition-colors">
                    {post.title}
                  </h3>
                  <p className="text-sm text-secondary line-clamp-3">{post.text}</p>
                </div>
                <div className="mt-6 flex items-center justify-between text-primary font-bold text-sm">
                  <span>Đọc chi tiết</span>
                  <span className="material-symbols-outlined text-base group-hover:translate-x-1 transition-transform">
                    arrow_forward
                  </span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}

function Footer() {
  return (
    <footer className="bg-on-surface text-[#9ca3af] pt-16 pb-8 px-margin-mobile md:px-margin-desktop">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
        <div>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-on-primary font-bold text-xl italic">VP</span>
            </div>
            <div>
              <div className="text-sm font-bold text-white tracking-widest uppercase italic">
                Velocity Prime
              </div>
              <div className="text-[10px] tracking-wider">High Performance Sports</div>
            </div>
          </div>
          <p className="text-sm leading-relaxed max-w-[240px]">
            Cửa hàng thể thao chính hãng, chuyên cung cấp đồ cầu lông, bóng đá, pickleball với
            đầy đủ thương hiệu uy tín.
          </p>
        </div>
        <FooterColumn
          title="Mua sắm"
          items={SPORT_LIST.map((sport) => ({ label: sport.title, to: sport.route })).concat({
            label: "Khuyến mãi",
            to: SPORTS.badminton.route
          })}
        />
        <FooterColumn
          title="Hỗ trợ"
          items={[
            { label: "Chính sách đổi trả", to: "/" },
            { label: "Chính sách giao hàng", to: "/" },
            { label: "Hướng dẫn chọn size", to: "/" },
            { label: "Liên hệ", to: "/" }
          ]}
        />
        <div>
          <h4 className="text-sm font-semibold text-white mb-4 uppercase tracking-wider">Tài khoản</h4>
          <ul className="space-y-2 text-sm">
            <li>
              <Link className="hover:text-white transition-colors" to="/login">
                Đăng nhập
              </Link>
            </li>
            <li>
              <Link className="hover:text-white transition-colors" to="/login?tab=register">
                Đăng ký
              </Link>
            </li>
            <li>Wishlist</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10 pt-6 text-center text-xs">
        © 2026 VELOCITY PRIME. ENGINEERED FOR PERFORMANCE.
      </div>
    </footer>
  );
}

function FooterColumn({ title, items }) {
  return (
    <div>
      <h4 className="text-sm font-semibold text-white mb-4 uppercase tracking-wider">{title}</h4>
      <ul className="space-y-2 text-sm">
        {items.map((item) => (
          <li key={item.label}>
            <Link className="hover:text-white transition-colors" to={item.to}>
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SectionTitle({ title, subtitle }) {
  return (
    <div className="flex items-end justify-between mb-8 border-l-8 border-primary pl-6">
      <div>
        <h2 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg italic uppercase text-on-background">
          {title}
        </h2>
        <p className="text-on-surface-variant font-label-bold uppercase tracking-widest mt-2">
          {subtitle}
        </p>
      </div>
      <Link className="font-label-bold text-label-bold text-primary hover:underline italic flex items-center gap-2" to={SPORTS.badminton.route}>
        XEM TẤT CẢ
        <span className="material-symbols-outlined text-sm">open_in_new</span>
      </Link>
    </div>
  );
}

function Stat({ value, label }) {
  return (
    <div className="min-w-[104px] bg-white/12 border border-white/35 px-4 py-3 text-center backdrop-blur-md shadow-[0_12px_34px_rgba(0,0,0,0.32)]">
      <div className="font-stats-display text-stats-display text-primary drop-shadow-[0_0_14px_rgba(192,0,33,0.9)]">
        {value}
      </div>
      <div className="text-[10px] text-white/85 mt-1 uppercase tracking-wider font-semibold">{label}</div>
    </div>
  );
}

function LoadingBlock({ text }) {
  return (
    <div className="flex items-center justify-center py-20 text-secondary w-full">
      <span className="material-symbols-outlined text-5xl text-outline-variant block mr-3">
        hourglass_top
      </span>
      <span>{text}</span>
    </div>
  );
}

function EmptyBlock({ text, compact = false }) {
  return (
    <div
      className={`text-center text-secondary ${compact ? "py-8" : "py-16"}`}
      style={{ gridColumn: "1 / -1" }}
    >
      <i className="ti ti-search-off text-5xl text-outline-variant block mb-3" />
      <p className="font-semibold">{text}</p>
    </div>
  );
}

function Input({ label, value, onChange, type = "text", required = true }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-on-surface block mb-1">{label}</span>
      <input
        type={type}
        value={value}
        required={required}
        onChange={(event) => onChange(event.target.value)}
        className="w-full px-4 py-2.5 border border-outline-variant rounded-lg text-sm outline-none focus:border-primary transition-colors bg-white"
      />
    </label>
  );
}

function Textarea({ label, value, onChange, placeholder = "" }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-on-surface block mb-1">{label}</span>
      <textarea
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="w-full px-4 py-2.5 border border-outline-variant rounded-lg text-sm outline-none focus:border-primary transition-colors bg-white min-h-[90px]"
      />
    </label>
  );
}

function Select({ label, value, onChange, options }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-on-surface block mb-1">{label}</span>
      <select
        value={value}
        required
        onChange={(event) => onChange(event.target.value)}
        className="w-full px-3 py-2.5 border border-outline-variant rounded-lg text-sm outline-none focus:border-primary transition-colors bg-white"
      >
        <option value="">Chọn</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function Toast({ message }) {
  return (
    <div className={`toast ${message ? "show" : ""}`}>
      <i className="ti ti-circle-check" />
      {message}
    </div>
  );
}
