import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  normalizeImageUrl,
  normalizeProduct,
  uniqueById
} from "./utils.js";
import loginHeroImage from "../images/hinh-anh-messi-dep-nhat-8.webp";

const CATEGORY_PAGE_SIZE = 6;

function normalizeProductPage(response, idToSub = {}) {
  const content = Array.isArray(response)
    ? response
    : Array.isArray(response?.content)
      ? response.content
      : [];

  const totalElements = Array.isArray(response) ? content.length : response?.totalElements ?? content.length;
  const totalPages = Array.isArray(response) ? 1 : Math.max(1, response?.totalPages ?? 1);
  const pageNumber = Array.isArray(response) ? 1 : (response?.number ?? 0) + 1;

  return {
    items: content.map((item) => normalizeProduct(item, idToSub)),
    pageNumber,
    pageSize: Array.isArray(response) ? content.length : response?.size ?? content.length,
    totalElements,
    totalPages,
    first: Array.isArray(response) ? true : response?.first ?? pageNumber <= 1,
    last: Array.isArray(response) ? true : response?.last ?? pageNumber >= totalPages
  };
}

function buildClientPage(items, pageNumber, pageSize = CATEGORY_PAGE_SIZE) {
  const totalElements = items.length;
  const totalPages = Math.max(1, Math.ceil(totalElements / pageSize));
  const safePageNumber = Math.min(Math.max(1, pageNumber), totalPages);
  const start = (safePageNumber - 1) * pageSize;

  return {
    items: items.slice(start, start + pageSize),
    pageNumber: safePageNumber,
    pageSize,
    totalElements,
    totalPages,
    first: safePageNumber <= 1,
    last: safePageNumber >= totalPages
  };
}

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

function getStoredUser() {
  return storage.read("currentUser", null);
}

function accountStorageId(user) {
  return user?.username ? String(user.username).trim().toLowerCase() : "guest";
}

function scopedStorageKey(baseKey, user) {
  return `${baseKey}_${accountStorageId(user)}`;
}

function normalizeAddress(address = {}) {
  return {
    id: address.id,
    receiverName: address.receiverName || "",
    receiverPhone: address.receiverPhone || "",
    city: address.city || "",
    district: address.district || "",
    detailAddress: address.detailAddress || "",
    isDefault: Boolean(address.isDefault ?? address.default)
  };
}

function sortAddresses(addresses = []) {
  return [...addresses].sort((first, second) => {
    if (first.isDefault !== second.isDefault) return first.isDefault ? -1 : 1;
    return Number(second.id || 0) - Number(first.id || 0);
  });
}

function createAddressForm(user, address = {}) {
  return {
    receiverName: address.receiverName || user?.fullName || user?.name || "",
    receiverPhone: address.receiverPhone || user?.phoneNumber || user?.phone || "",
    city: address.city || "",
    district: address.district || "",
    detailAddress: address.detailAddress || "",
    isDefault: Boolean(address.isDefault)
  };
}

function addressPayloadFromForm(form) {
  return {
    receiverName: form.receiverName.trim(),
    receiverPhone: form.receiverPhone.trim(),
    city: form.city.trim(),
    district: form.district.trim(),
    detailAddress: form.detailAddress.trim(),
    isDefault: Boolean(form.isDefault)
  };
}

function formatAddressLine(address) {
  return [address?.detailAddress, address?.district, address?.city].filter(Boolean).join(", ");
}

function addressToCheckoutForm(address, user) {
  return {
    name: address?.receiverName || user?.fullName || user?.name || "",
    phone: address?.receiverPhone || user?.phoneNumber || user?.phone || "",
    city: address?.city || "",
    district: address?.district || "",
    ward: "",
    address: address?.detailAddress || ""
  };
}

function normalizeCartFromBackend(cartRes) {
  if (!cartRes || !Array.isArray(cartRes.items)) return [];
  return cartRes.items.map((item) => ({
    cartItemId: item.cartItemId,
    variantId: item.variantId,
    productId: item.productId,
    name: item.productName || "",
    color: item.color || "",
    size: item.size || "",
    imageUrl: item.imageUrl || "",
    price: Number(item.price || 0),
    quantity: item.quantity || 0,
    subTotal: Number(item.subTotal || 0)
  }));
}

function brandKey(value = "") {
  return value.trim().toLowerCase();
}

function sizeOptionsForCategory(subCategory) {
  const lower = subCategory.toLowerCase();
  if (lower.includes("quần áo")) return ["S", "M", "L"];
  if (lower.includes("giày")) return ["36", "37", "38", "39", "40", "41", "42", "43", "44", "45"];
  return [];
}

function categoryIconFor(category = "") {
  const normalized = category
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (normalized.includes("tat")) return "grid_view";
  if (normalized.includes("giay")) return "directions_run";
  if (normalized.includes("quan")) return "checkroom";
  if (normalized.includes("bong")) return "sports_soccer";
  if (normalized.includes("vot")) return "sports_tennis";
  if (normalized.includes("phu")) return "sports_handball";
  return "category";
}

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [pathname]);

  return null;
}

function MotionEffects({ trigger }) {
  const location = useLocation();

  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    const selector = [
      "main section",
      ".product-card-hover",
      ".stat-card",
      "main article",
      ".cart-panel",
      ".detail-modal-bg.open > div",
      ".modal-bg.open > div"
    ].join(",");
    const elements = [...document.querySelectorAll(selector)].filter(
      (element) => !element.closest("#main-nav")
    );
    if (!("IntersectionObserver" in window)) {
      elements.forEach((element) => element.classList.add("reveal-up", "is-visible"));
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );

    elements.forEach((element, index) => {
      element.classList.add("reveal-up");
      element.style.setProperty("--reveal-delay", `${Math.min(index * 35, 280)}ms`);
      observer.observe(element);
    });

    return () => observer.disconnect();
  }, [location.pathname, location.search, trigger]);

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
  const [user, setUser] = useState(() => getStoredUser());
  const [cart, setCart] = useState([]);
  const [cartLoading, setCartLoading] = useState(false);
  const [wishlist, setWishlist] = useState(() => new Set(storage.read("vp_wishlist", [])));
  const isStandalonePage =
    location.pathname === "/login" ||
    location.pathname === "/checkout" ||
    location.pathname.startsWith("/admin");

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

  // Load cart từ backend khi boot nếu user đã đăng nhập
  useEffect(() => {
    if (!user) return;
    let mounted = true;
    async function loadInitialCart() {
      setCartLoading(true);
      try {
        const cartRes = await api.getCart();
        if (mounted) setCart(normalizeCartFromBackend(cartRes));
      } catch {
        // Token hết hạn hoặc lỗi => bỏ qua
      } finally {
        if (mounted) setCartLoading(false);
      }
    }
    loadInitialCart();
    return () => { mounted = false; };
  }, [user?.username]);

  useEffect(() => {
    storage.write("vp_wishlist", [...wishlist]);
  }, [wishlist]);

  const cartCount = useMemo(() => cart.reduce((sum, item) => sum + (item.quantity || 0), 0), [cart]);

  async function addToCart(product, variantId, quantity = 1) {
    if (!user) {
      showToast("Vui lòng đăng nhập để thêm vào giỏ hàng.");
      navigate("/login");
      return;
    }
    if (!variantId) {
      showToast("Vui lòng chọn phân loại sản phẩm.");
      return;
    }
    try {
      const cartRes = await api.addToCart({ variantId, quantity });
      setCart(normalizeCartFromBackend(cartRes));
      showToast(`Đã thêm "${product.name || "Sản phẩm"}" vào giỏ hàng`);
    } catch (error) {
      showToast(error.message || "Không thể thêm vào giỏ hàng.");
    }
  }

  async function updateCartQty(cartItemId, delta) {
    const item = cart.find((i) => i.cartItemId === cartItemId);
    if (!item) return;
    const newQty = Math.max(1, item.quantity + delta);
    try {
      const cartRes = await api.updateCartItem(cartItemId, newQty);
      setCart(normalizeCartFromBackend(cartRes));
    } catch (error) {
      showToast(error.message || "Không thể cập nhật số lượng.");
    }
  }

  async function removeCartItem(cartItemId) {
    try {
      const cartRes = await api.removeCartItem(cartItemId);
      setCart(normalizeCartFromBackend(cartRes));
    } catch (error) {
      showToast(error.message || "Không thể xóa sản phẩm.");
    }
  }

  function toggleWishlist(id) {
    setWishlist((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleLoginSuccess(data) {
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
    // Load giỏ hàng từ backend sau khi đăng nhập
    try {
      const cartRes = await api.getCart();
      setCart(normalizeCartFromBackend(cartRes));
    } catch {
      setCart([]);
    }
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
    sessionStorage.removeItem("pendingCheckout");
    setCart([]);
    setCartOpen(false);
    setUser(null);
    setProfileOpen(false);
    showToast("Đã đăng xuất");
  }

  return (
    <>
      <ScrollToTop />
      <MotionEffects
        trigger={`${allProducts.length}-${bootLoading}-${cartOpen}-${profileOpen}-${Boolean(detailProduct)}`}
      />
      {!isStandalonePage && (
        <Header
          cartCount={cartCount}
          user={user}
          onOpenCart={() => setCartOpen(true)}
          onOpenProfile={() => setProfileOpen(true)}
        />
      )}
      {!isStandalonePage && backendError && <BackendBanner message={backendError} />}
      <div className="route-transition" key={location.pathname}>
        <Routes location={location}>
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
            path="/admin/*"
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
      </div>
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
    <div className="fixed top-[116px] left-1/2 z-[250] -translate-x-1/2 bg-on-surface text-white px-5 py-3 shadow-xl border border-white/10 rounded-full text-sm max-w-[90vw]">
      <span className="font-bold text-primary mr-2">Backend:</span>
      {message}
    </div>
  );
}

function CouponBanner() {
  const [coupons, setCoupons] = useState([]);
  
  useEffect(() => {
    async function load() {
      try {
        const data = await api.getActiveCoupons();
        setCoupons(data || []);
      } catch (err) {
        // silently fail for public endpoint
      }
    }
    load();
  }, []);

  if (!coupons.length) return null;

  return (
    <div className="bg-gradient-to-r from-primary to-rose-600 py-3 px-4 shadow-md">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-3">
        <span className="material-symbols-outlined text-white animate-pulse">local_offer</span>
        <div className="text-white text-sm font-medium text-center">
          Khuyến mãi đặc biệt: 
          {coupons.map((c, i) => (
            <span key={c.id} className="inline-block ml-2">
              Nhập mã <strong className="bg-white/20 px-2 py-0.5 rounded font-bold tracking-wider">{c.code}</strong> để giảm {c.discountType === 'PERCENT' ? `${c.discountValue}%` : formatPrice(c.discountValue)}!
              {i < coupons.length - 1 && <span className="ml-2">|</span>}
            </span>
          ))}
        </div>
      </div>
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
    `nav-link group inline-flex h-11 items-center gap-2 rounded-full px-3.5 xl:px-4 text-[12px] font-black uppercase tracking-[0.08em] cursor-pointer transition-all duration-300 ${
      isActive ? "nav-link-active" : ""
    }`;

  return (
    <header
      id="main-nav"
      className={`flex flex-col w-full z-50 fixed top-0 transition-transform duration-300 ${
        hidden ? "nav-hidden" : ""
      }`}
    >
      <div className="bg-primary text-on-primary py-2 marquee overflow-hidden">
        <div className="marquee-content font-label-bold text-[11px] flex gap-10 items-center uppercase">
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

      <nav className="bg-white/95 backdrop-blur-xl border-b border-outline-variant/70 flex items-center justify-between px-margin-mobile md:px-margin-desktop py-3 h-[76px] shadow-[0_16px_46px_rgba(20,20,20,0.08)]">
        <Link to="/" className="flex-shrink-0 flex items-center gap-3 cursor-pointer group" aria-label="Velocity Prime">
          <div className="w-11 h-11 md:w-12 md:h-12 bg-primary rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform duration-300 shadow-[0_14px_34px_rgba(192,0,33,0.28)]">
            <span className="text-white font-display-lg text-2xl font-black italic tracking-tighter">
              VP
            </span>
          </div>
          <div className="hidden sm:block">
            <div className="font-headline-lg text-sm font-black text-on-surface tracking-[0.14em] uppercase">
              Velocity <span className="text-primary">Prime</span>
            </div>
            <div className="text-[9px] text-secondary tracking-[0.24em] uppercase mt-0.5">
              High Performance Sports
            </div>
          </div>
        </Link>

        <ul className="nav-segment hidden lg:flex items-center gap-1">
          <li>
            <NavLink to="/" className={navClass}>
              <span className="material-symbols-outlined nav-link-icon text-[17px]">home</span>
              <span>Trang chủ</span>
            </NavLink>
          </li>
          {SPORT_LIST.map((sport) => (
            <li key={sport.slug}>
              <NavLink to={sport.route} className={navClass}>
                <span className="material-symbols-outlined nav-link-icon text-[17px]">{sport.icon}</span>
                <span>{sport.title}</span>
              </NavLink>
            </li>
          ))}
          <li>
            <NavLink to="/orders" className={navClass}>
              <span className="material-symbols-outlined nav-link-icon text-[17px]">receipt_long</span>
              <span>Đơn hàng</span>
            </NavLink>
          </li>
          <li>
            <NavLink to="/blog" className={navClass}>
              <span className="material-symbols-outlined nav-link-icon text-[17px]">article</span>
              <span>Blog</span>
            </NavLink>
          </li>
          {user?.role === "ADMIN" && (
            <li>
              <NavLink to="/admin" className={navClass}>
                <span className="material-symbols-outlined nav-link-icon text-[17px]">admin_panel_settings</span>
                <span>Admin</span>
              </NavLink>
            </li>
          )}
        </ul>

        <div className="flex items-center gap-2 md:gap-3">
          <form
            onSubmit={submitSearch}
            className="hidden xl:flex h-11 items-center border border-outline-variant/80 rounded-full overflow-hidden bg-surface-container-low w-[260px] focus-within:border-primary focus-within:bg-white transition-colors"
          >
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tìm sản phẩm..."
              className="px-4 py-2 text-sm border-none outline-none bg-transparent w-full text-on-surface placeholder-secondary"
            />
            <button className="h-full px-4 bg-primary text-white hover:bg-red-700 transition-colors" aria-label="Tìm kiếm">
              <span className="material-symbols-outlined text-lg block">search</span>
            </button>
          </form>
          <button
            className="w-10 h-10 rounded-full bg-surface-container-low text-on-surface-variant hover:text-white hover:bg-primary border border-outline-variant/70 transition-all duration-200 active:scale-95 text-[24px] flex items-center justify-center material-symbols-outlined"
            title="Yêu thích"
            aria-label="Yêu thích"
            onClick={() => navigate(activeSport?.route || SPORTS.badminton.route)}
          >
            favorite
          </button>
          <button
            className="w-10 h-10 rounded-full bg-surface-container-low text-on-surface-variant hover:text-white hover:bg-primary border border-outline-variant/70 transition-all duration-200 active:scale-95 relative text-[24px] flex items-center justify-center material-symbols-outlined"
            onClick={onOpenCart}
            title="Giỏ hàng"
            aria-label="Giỏ hàng"
          >
            shopping_cart
            <span className="absolute -top-1 -right-1 bg-primary text-white text-[11px] min-w-5 h-5 px-1 flex items-center justify-center rounded-full font-black">
              <span>{cartCount}</span>
            </span>
          </button>
          {user ? (
            <button
              className="w-10 h-10 rounded-full bg-surface-container-low border border-outline-variant/70 text-on-surface-variant hover:border-primary transition-all duration-200 active:scale-95 flex items-center justify-center overflow-hidden shadow-sm"
              onClick={onOpenProfile}
              title="Thông tin tài khoản"
            >
              <img src={`https://api.dicebear.com/9.x/micah/svg?seed=${user.username}&backgroundColor=b6e3f4`} alt="avatar" className="w-full h-full object-cover" />
            </button>
          ) : (
            <button
              className="w-10 h-10 rounded-full bg-surface-container-low text-on-surface-variant hover:text-white hover:bg-primary border border-outline-variant/70 transition-all duration-200 active:scale-95 text-[24px] flex items-center justify-center material-symbols-outlined"
              onClick={() => navigate("/login")}
              title="Tài khoản"
              aria-label="Tài khoản"
            >
              person
            </button>
          )}
          <button
            className="lg:hidden w-10 h-10 rounded-full bg-surface-container-low border border-outline-variant/70 text-on-surface-variant text-[26px] flex items-center justify-center material-symbols-outlined"
            onClick={() => setMobileOpen((value) => !value)}
            aria-label="Mở menu"
          >
            menu
          </button>
        </div>
      </nav>

      {mobileOpen && (
        <div className="lg:hidden bg-white border-b border-outline-variant/70 px-margin-mobile py-4 shadow-2xl">
          <form onSubmit={submitSearch} className="flex items-center border border-outline-variant/80 rounded-full overflow-hidden bg-surface-container-low mb-4 focus-within:border-primary">
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tìm sản phẩm..."
              className="px-4 py-3 text-sm border-none outline-none bg-transparent w-full text-on-surface placeholder-secondary"
            />
            <button className="px-4 py-3 bg-primary text-white" aria-label="Tìm kiếm">
              <span className="material-symbols-outlined text-lg block">search</span>
            </button>
          </form>
          <div className="flex flex-col gap-1">
            <Link
              onClick={() => setMobileOpen(false)}
              className={`mobile-nav-link ${location.pathname === "/" ? "active" : ""}`}
              to="/"
            >
              <span className="material-symbols-outlined text-[18px]">home</span>
              <span>Trang chủ</span>
            </Link>
            {SPORT_LIST.map((sport) => (
              <Link
                key={sport.slug}
                onClick={() => setMobileOpen(false)}
                className={`mobile-nav-link ${
                  location.pathname.includes(`/products/categories/${sport.slug}`) ? "active" : ""
                }`}
                to={sport.route}
              >
                <span className="material-symbols-outlined text-[18px]">{sport.icon}</span>
                <span>{sport.title}</span>
              </Link>
            ))}
            <Link
              onClick={() => setMobileOpen(false)}
              className={`mobile-nav-link ${location.pathname === "/orders" ? "active" : ""}`}
              to="/orders"
            >
              <span className="material-symbols-outlined text-[18px]">receipt_long</span>
              <span>Đơn hàng</span>
            </Link>
            <Link
              onClick={() => setMobileOpen(false)}
              className={`mobile-nav-link ${location.pathname === "/blog" ? "active" : ""}`}
              to="/blog"
            >
              <span className="material-symbols-outlined text-[18px]">article</span>
              <span>Blog</span>
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
    <main className="pt-[108px]">
      <section
        className="home-clean-hero relative min-h-[calc(100dvh-108px)] flex items-center justify-start px-margin-mobile md:px-margin-desktop overflow-hidden bg-white"
        id="hero"
      >
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-r from-black/92 via-black/45 to-black/8 z-10" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 z-10" />
          <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.10),transparent_34%),linear-gradient(250deg,rgba(192,0,33,0.16),transparent_48%)] z-10 mix-blend-screen" />
          <div className="absolute inset-y-0 left-0 w-[48vw] bg-gradient-to-r from-black via-black/70 to-transparent z-10" />
          <div
            className="hero-bg-image w-full h-full bg-cover"
            style={{
              backgroundImage: `url("${HERO_IMAGE}")`,
              backgroundPosition: "center center",
              filter: "contrast(1.08) saturate(1.12) brightness(1.04)"
            }}
          />
        </div>
        <div className="absolute inset-x-0 top-0 h-px bg-primary z-20 shadow-[0_0_28px_rgba(192,0,33,0.9)]" />
        <div className="absolute -left-28 bottom-4 w-[430px] h-[430px] border border-white/10 rotate-45 z-10" />
        <div className="hero-copy relative z-20 max-w-3xl flex flex-col items-start py-16 md:py-20">
          <span className="bg-white/10 text-white border border-white/20 rounded-full font-label-bold text-[11px] px-4 py-2 mb-5 backdrop-blur-md">
            <span>MÙA GIẢI MỚI 2026</span>
          </span>
          <h1 className="font-display-lg text-[54px] md:text-[86px] leading-[1.03] uppercase mb-5 pt-2 text-white hero-title drop-shadow-[0_8px_24px_rgba(0,0,0,0.85)]">
            Đỉnh cao hiệu suất.
          </h1>
          <p className="font-body-lg text-body-lg text-white/90 max-w-xl mb-8 border-l-4 border-primary pl-4">
            Cầu lông · Bóng đá · Pickleball. Trang bị chính hãng từ các thương hiệu hàng đầu.
            Giao nhanh toàn quốc.
          </p>
          <a
            href="#equipment"
            className="group inline-flex items-center gap-3 bg-primary text-on-primary font-headline-md text-lg px-8 md:px-10 py-4 rounded-full hover:bg-white hover:text-primary transition-all active:scale-95 shadow-[0_18px_40px_rgba(192,0,33,0.40)]"
          >
            <span className="inline-flex items-center gap-3">
              KHÁM PHÁ NGAY
              <span className="material-symbols-outlined group-hover:translate-x-2 transition-transform">
                arrow_forward
              </span>
            </span>
          </a>
          <div className="flex flex-wrap gap-3 md:gap-4 mt-10 pt-7 border-t border-white/20">
            <Stat value={loading ? "..." : `${products.length}+`} label="Sản phẩm" />
            <Stat value="15+" label="Thương hiệu" />
            <Stat value="50K+" label="Khách hàng" />
            <Stat value="4.9★" label="Đánh giá" />
          </div>
        </div>
      </section>

      <CouponBanner />

      <section className="bg-white px-margin-mobile md:px-margin-desktop py-20" id="collection">
        <div className="max-w-7xl mx-auto">
          <SectionTitle title="BỘ SƯU TẬP MỚI" subtitle="Engineered for the elite" />
          {loading ? (
            <LoadingBlock text="Đang tải sản phẩm từ backend..." />
          ) : featured.length ? (
            <CarouselRail ariaLabel="Cuon bo suu tap moi">
              <div className="flex gap-5 overflow-x-auto pb-3 scrollbar-hide carousel-scroll-rail">
                {featured.map((product) => (
                  <FeatureCard key={product.id} product={product} onOpenDetail={onOpenDetail} />
                ))}
              </div>
            </CarouselRail>
          ) : (
            <EmptyBlock text="Chưa có sản phẩm để hiển thị." />
          )}
        </div>
      </section>

      <section className="home-clean-promo bg-[#f5f7f1] text-on-surface relative px-margin-mobile md:px-margin-desktop py-20 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_18%,rgba(192,0,33,0.28),transparent_30%),linear-gradient(120deg,rgba(255,255,255,0.08),transparent_35%)]" />
        <div className="absolute -right-20 -top-20 opacity-10 pointer-events-none select-none">
          <span className="font-display-lg text-[200px] md:text-[300px] italic leading-none text-primary">
            SALE
          </span>
        </div>
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-start lg:items-center justify-between gap-10 lg:gap-12 relative z-10">
          <div className="w-full lg:w-[360px] lg:flex-shrink-0">
            <h2 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-white leading-tight mb-4">
              HÀNG GIẢM GIÁ
            </h2>
            <p className="text-white/80 font-body-lg text-body-lg mb-8">
              Giảm đến 40% các sản phẩm hot nhất. Nhanh tay, số lượng có hạn.
            </p>
            <Link
              to={SPORTS.badminton.route}
              className="inline-flex items-center justify-center bg-primary text-on-primary px-8 py-4 rounded-full font-label-bold text-label-bold hover:bg-white hover:text-primary transition-colors shadow-lg"
            >
              <span>SHOP SALE</span>
            </Link>
          </div>
          <CarouselRail className="w-full min-w-0 lg:flex-1" ariaLabel="Cuon hang giam gia">
            <div className="flex gap-5 overflow-x-auto pb-3 scrollbar-hide carousel-scroll-rail">
              {visibleSale.map((product) => (
                <SaleCard key={product.id} product={product} onOpenDetail={onOpenDetail} />
              ))}
            </div>
          </CarouselRail>
        </div>
      </section>

      <section className="bg-white px-margin-mobile md:px-margin-desktop py-20" id="equipment">
        <div className="max-w-7xl mx-auto">
          <h2 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg uppercase text-center mb-12 text-on-background">
            THIẾT BỊ THI ĐẤU
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {SPORT_LIST.map((sport) => (
              <Link key={sport.slug} to={sport.route} className="sport-category-card group cursor-pointer flex flex-col">
                <div className="sport-category-media relative flex-grow overflow-hidden bg-surface-container mb-5 border border-outline-variant/60 group-hover:border-primary transition-all rounded-2xl min-h-[320px] shadow-sm group-hover:shadow-[0_22px_60px_rgba(20,20,20,0.16)]">
                  <img
                    alt={sport.title}
                    className="absolute inset-0 w-full h-full object-cover grayscale-[0.2] group-hover:grayscale-0 group-hover:scale-105 transition-all duration-500"
                    src={sport.card}
                  />
                  <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/70 to-transparent" />
                  <span className="sport-category-icon absolute bottom-5 right-5 w-11 h-11 rounded-full bg-white text-primary flex items-center justify-center shadow-xl group-hover:bg-primary group-hover:text-white transition-colors">
                    <span className="material-symbols-outlined">{sport.icon}</span>
                  </span>
                </div>
                <h3 className="font-headline-md text-headline-md uppercase flex items-center justify-between text-on-background">
                  {sport.label}
                  <span className="material-symbols-outlined text-primary group-hover:translate-x-1 transition-transform">arrow_forward</span>
                </h3>
                <p className="text-on-surface-variant mt-1">{sport.sub}.</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-surface-container-low px-margin-mobile md:px-margin-desktop py-16">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-8 border-l-4 border-primary pl-5">
            <h2 className="font-headline-lg text-xl md:text-2xl uppercase text-on-background">
              Dịch vụ chuyên nghiệp
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {SERVICES.map((service) => (
              <div
                key={service.title}
                className="bg-white p-6 rounded-2xl border border-outline-variant/70 hover:border-primary transition-all text-center group shadow-sm hover:shadow-[0_18px_42px_rgba(20,20,20,0.10)]"
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
  const [pageNumber, setPageNumber] = useState(() =>
    Math.max(1, Number(searchParams.get("page")) || 1)
  );
  const [pageInfo, setPageInfo] = useState({
    pageNumber: 1,
    pageSize: CATEGORY_PAGE_SIZE,
    totalElements: 0,
    totalPages: 1,
    first: true,
    last: true
  });

  useEffect(() => {
    setSearch(searchParams.get("q") || "");
    setPageNumber(Math.max(1, Number(searchParams.get("page")) || 1));
  }, [searchParams]);

  const selectedCategoryId = useMemo(() => {
    if (subCategory === "Tất cả") return undefined;
    return categoryMeta.subCategoryIds?.[sportKey]?.[subCategory];
  }, [categoryMeta.subCategoryIds, sportKey, subCategory]);

  useEffect(() => {
    setSubCategory("Tất cả");
    setSelectedBrands([]);
    setSelectedSizes([]);
    setPriceRange("");
    setApiFiltered(null);
    setPageNumber(1);
    const next = new URLSearchParams(searchParams);
    next.delete("page");
    setSearchParams(next, { replace: true });
  }, [slug]);

  useEffect(() => {
    let mounted = true;
    async function loadCategory() {
      setLoading(true);
      setError("");
      try {
        const data = await api.getProductsByCategory(slug, {
          categoryId: selectedCategoryId,
          pageNumber,
          pageSize: CATEGORY_PAGE_SIZE
        });
        if (mounted) {
          let mappedPage = normalizeProductPage(data, categoryMeta.idToSub);
          const selectedCategoryNumber = Number(selectedCategoryId);

          if (selectedCategoryId) {
            const categoryData = await api.getProductsByCategory(slug, {
              pageNumber: 1,
              pageSize: 1000
            });
            const categoryItems = normalizeProductPage(categoryData, categoryMeta.idToSub).items.filter(
              (product) => Number(product.categoryId) === selectedCategoryNumber
            );
            mappedPage = buildClientPage(categoryItems, pageNumber);
          }

          if (pageNumber > mappedPage.totalPages) {
            setPageNumber(1);
            const next = new URLSearchParams(searchParams);
            next.delete("page");
            setSearchParams(next, { replace: true });
            return;
          }
          setProducts(mappedPage.items);
          setPageInfo(mappedPage);
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
  }, [slug, selectedCategoryId, pageNumber, categoryMeta.idToSub, searchParams, setSearchParams]);

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
    next.delete("page");
    setPageNumber(1);
    setSearchParams(next, { replace: true });
  }

  function updatePage(nextPage) {
    const targetPage = Math.min(Math.max(1, nextPage), Math.max(1, pageInfo.totalPages || 1));
    setPageNumber(targetPage);
    const next = new URLSearchParams(searchParams);
    if (targetPage > 1) next.set("page", String(targetPage));
    else next.delete("page");
    setSearchParams(next, { replace: true });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetCategoryPage() {
    setPageNumber(1);
    const next = new URLSearchParams(searchParams);
    next.delete("page");
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

    if (apiFiltered && selectedCategoryId) {
      list = list.filter((product) => Number(product.categoryId) === Number(selectedCategoryId));
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
  }, [products, apiFiltered, selectedCategoryId, search, selectedBrands, activePrice, sortBy]);

  const productCount = pageInfo.totalElements ?? visibleProducts.length;

  function toggleBrand(brand) {
    resetCategoryPage();
    setSelectedBrands((current) =>
      current.includes(brand) ? current.filter((item) => item !== brand) : [...current, brand]
    );
  }

  function toggleSize(size) {
    resetCategoryPage();
    setSelectedSizes((current) =>
      current.includes(size) ? current.filter((item) => item !== size) : [...current, size]
    );
  }

  return (
    <main className="pt-[108px] min-h-screen bg-surface-container-low">
      <section className="category-hero relative overflow-hidden bg-on-surface text-white">
        <div
          className="category-hero-image absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url("${sport.hero}")` }}
        />
        <div className="category-hero-overlay absolute inset-0" />
        <div className="relative max-w-[1500px] mx-auto px-margin-mobile md:px-margin-desktop py-10 md:py-14">
          <div className="category-hero-copy max-w-2xl">
            <p className="category-hero-eyebrow text-xs font-bold uppercase tracking-[0.18em] text-primary mb-3">
              Velocity Prime
            </p>
            <h1 className="category-hero-title font-display-lg text-[44px] md:text-[68px] leading-[1.02] uppercase">
              {sport.title}
            </h1>
            <p className="category-hero-sub text-white/80 text-base md:text-lg mt-4 max-w-xl">
              {sport.sub}
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3 text-xs font-bold uppercase tracking-[0.08em] text-white/75">
              <span className="category-hero-badge rounded-full border border-white/20 bg-white/10 px-3 py-2 backdrop-blur-sm">
                {productCount} sản phẩm
              </span>
              <span className="category-hero-badge rounded-full border border-white/20 bg-white/10 px-3 py-2 backdrop-blur-sm">
                Hàng chính hãng
              </span>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-[1500px] mx-auto px-margin-mobile md:px-margin-desktop py-8 md:py-10">
        <div className="grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)_240px] gap-6 layout-grid">
          <aside className="w-full h-fit flex flex-col gap-3 sidebar-filter lg:sticky lg:top-[124px] z-10">
            <FilterBox title="Danh mục sản phẩm">
              <ul className="p-2 space-y-1 text-sm text-on-surface">
                {(categoryMeta.subCats[sportKey] || ["Tất cả"]).map((cat) => (
                  <li key={cat}>
                    <button
                      className={`category-filter-pill group w-full text-left px-3 py-3 rounded-2xl transition-all ${
                        cat === subCategory
                          ? "active font-bold text-primary bg-primary/10"
                          : "text-on-surface hover:bg-surface-container"
                      }`}
                      onClick={() => {
                        setSubCategory(cat);
                        setSelectedSizes([]);
                        setApiFiltered(null);
                        resetCategoryPage();
                      }}
                    >
                      <span className="inline-flex items-center gap-3 min-w-0">
                        <span className="category-filter-icon material-symbols-outlined text-[18px]">
                          {categoryIconFor(cat)}
                        </span>
                        <span className="truncate">{cat.toUpperCase()}</span>
                      </span>
                      <span className="category-filter-arrow material-symbols-outlined text-[16px]">
                        chevron_right
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </FilterBox>

            <FilterBox title="Theo kích cỡ" compact>
              <div className="p-2">
                {sizeOptions.length ? (
                  <div className="grid grid-cols-5 gap-1.5 text-[12px]">
                    {sizeOptions.map((size) => (
                      <button
                        key={size}
                        className={`size-filter-label py-2 border rounded-lg text-center font-semibold ${
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
                  <div className="px-3 py-3 text-[12px] text-secondary bg-surface-container-low rounded-xl">
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
                    className={`price-range-item flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer hover:bg-surface-container transition-colors ${
                      priceRange === range.value ? "selected" : ""
                    }`}
                  >
                    <input
                      type="radio"
                      name="priceRange"
                      value={range.value}
                      checked={priceRange === range.value}
                      onChange={() => {
                        setPriceRange(range.value);
                        resetCategoryPage();
                      }}
                      className="accent-primary"
                    />
                    <span className="text-on-surface">{range.label}</span>
                  </label>
                ))}
              </div>
            </FilterBox>
          </aside>

          <div>
            <div className="bg-white border border-outline-variant/70 rounded-2xl p-4 md:p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
              <div className="flex-1">
                <span className="font-headline-md text-2xl font-semibold uppercase text-on-background">
                  {sport.title}
                </span>
                <span className="text-sm text-secondary ml-2">({productCount} sản phẩm)</span>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="flex items-center border border-outline-variant rounded-full overflow-hidden bg-surface-container-low flex-1 sm:w-72 focus-within:border-primary transition-colors">
                  <span className="material-symbols-outlined text-secondary text-lg px-3">search</span>
                  <input
                    type="text"
                    value={search}
                    onChange={(event) => updateSearch(event.target.value)}
                    placeholder="Tìm sản phẩm..."
                    className="py-3 pr-4 text-sm border-none outline-none bg-transparent w-full text-on-surface placeholder-secondary"
                  />
                </div>
                <select
                  value={sortBy}
                  onChange={(event) => {
                    setSortBy(event.target.value);
                    resetCategoryPage();
                  }}
                  className="px-4 py-3 border border-outline-variant rounded-full text-sm text-on-surface bg-white outline-none cursor-pointer whitespace-nowrap"
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
              <>
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
                <ProductPagination
                  pageInfo={pageInfo}
                  pageNumber={pageNumber}
                  onPageChange={updatePage}
                />
              </>
            ) : (
              <EmptyBlock text="Không tìm thấy sản phẩm. Thử đổi bộ lọc hoặc từ khóa tìm kiếm." />
            )}
          </div>

          <aside className="w-full h-fit flex flex-col gap-3 sidebar-filter lg:sticky lg:top-[124px] z-10">
            <FilterBox title="Thương hiệu" compact>
              <div className="p-2 grid grid-cols-1 gap-1 text-[12px]">
                {brandOptions.map((brand) => (
                  <label
                    key={brand}
                    className={`brand-filter-pill flex min-h-9 items-center gap-2 px-3 py-2 rounded-xl border cursor-pointer transition-all ${
                      selectedBrands.includes(brand)
                        ? "active border-primary bg-primary/10 text-primary font-semibold"
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

function ProductPagination({ pageInfo, pageNumber, onPageChange }) {
  const totalPages = Math.max(1, pageInfo?.totalPages || 1);
  if (totalPages <= 1) return null;

  const currentPage = Math.min(Math.max(1, pageNumber || pageInfo?.pageNumber || 1), totalPages);
  const windowSize = 5;
  const start = Math.max(1, Math.min(currentPage - 2, totalPages - windowSize + 1));
  const pages = Array.from({ length: Math.min(windowSize, totalPages) }, (_, index) => start + index);

  return (
    <nav className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white border border-outline-variant/70 rounded-2xl px-4 py-3 shadow-sm">
      <div className="text-sm text-secondary">
        Trang <span className="font-bold text-on-surface">{currentPage}</span> / {totalPages}
        <span className="mx-2 text-outline-variant">|</span>
        {pageInfo.totalElements || 0} sản phẩm
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="w-10 h-10 rounded-full border border-outline-variant bg-white text-on-surface disabled:opacity-40 disabled:cursor-not-allowed hover:border-primary hover:text-primary transition-colors flex items-center justify-center"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          aria-label="Trang trước"
        >
          <span className="material-symbols-outlined text-lg">chevron_left</span>
        </button>
        {pages.map((page) => (
          <button
            key={page}
            type="button"
            className={`min-w-10 h-10 px-3 rounded-full border text-sm font-bold transition-colors ${
              page === currentPage
                ? "border-primary bg-primary text-white"
                : "border-outline-variant bg-white text-on-surface hover:border-primary hover:text-primary"
            }`}
            onClick={() => onPageChange(page)}
            aria-current={page === currentPage ? "page" : undefined}
          >
            {page}
          </button>
        ))}
        <button
          type="button"
          className="w-10 h-10 rounded-full border border-outline-variant bg-white text-on-surface disabled:opacity-40 disabled:cursor-not-allowed hover:border-primary hover:text-primary transition-colors flex items-center justify-center"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          aria-label="Trang sau"
        >
          <span className="material-symbols-outlined text-lg">chevron_right</span>
        </button>
      </div>
    </nav>
  );
}

function FilterBox({ title, children, compact = false }) {
  return (
    <div className={`bg-white border border-outline-variant/70 ${compact ? "rounded-2xl" : "rounded-2xl"} overflow-hidden shadow-sm`}>
      <div
        className={`bg-white text-on-surface border-b border-outline-variant/60 font-bold uppercase tracking-[0.08em] ${
          compact ? "px-4 py-3 text-[12px]" : "px-4 py-3.5 text-sm"
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
      className="group product-card-hover bg-white rounded-2xl overflow-hidden border border-outline-variant/70 cursor-pointer flex flex-col h-full"
      onClick={() => onOpenDetail(product)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpenDetail(product);
        }
      }}
      role="button"
      tabIndex={0}
    >
      <div className="relative bg-[#f3f3f3] h-[230px] flex items-center justify-center overflow-hidden">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="product-img w-full h-full object-cover"
          />
        ) : (
          <i className={`ti ${product.icon} text-[72px] text-outline-variant`} />
        )}
        <button
          className={`wishlist-btn absolute top-3 right-3 w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full border border-white/70 flex items-center justify-center shadow-lg hover:bg-primary hover:text-white ${
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
          <span className="absolute top-3 left-3 bg-primary text-white text-[10px] font-black px-3 py-1.5 rounded-full uppercase shadow-[0_10px_24px_rgba(192,0,33,0.28)]">
            {product.badge}
          </span>
        )}
      </div>
      <div className="p-4 md:p-5 flex flex-col flex-1">
        <div className="text-[11px] font-bold text-secondary uppercase tracking-wider mb-2">
          {product.brand || "Velocity Prime"}
        </div>
        <h3 className="font-bold text-[15px] text-on-surface line-clamp-2 min-h-[42px] leading-snug group-hover:text-primary transition-colors">{product.name}</h3>
        <div className="mt-3 flex items-center justify-between gap-2">
          <span className="text-[11px] text-secondary bg-surface-container-low px-2.5 py-1 rounded-full">{product.cat}</span>
          <span className="flex items-center gap-1 text-xs text-yellow-600">
            <span className="material-symbols-outlined text-sm">star</span>
            {product.rating}
            <span className="text-secondary">({product.reviews})</span>
          </span>
        </div>
        <div className="mt-auto pt-4">
          <div className="text-primary font-black text-xl tracking-tight">{formatPrice(product.price)}</div>
          <button
            className="btn-effect mt-3 w-full py-3 bg-on-surface text-white rounded-full text-xs font-bold uppercase tracking-[0.05em] flex items-center justify-center gap-2 hover:bg-primary transition-colors"
            onClick={(event) => {
              event.stopPropagation();
              onOpenDetail(product);
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
      className="group w-[320px] md:w-[360px] flex-shrink-0 bg-white rounded-2xl border border-outline-variant/70 hover:border-primary transition-all cursor-pointer p-4 flex flex-col text-left product-card-hover"
      onClick={() => onOpenDetail(product)}
    >
      <div className="w-full h-56 flex items-center justify-center mb-4 overflow-hidden rounded-xl bg-surface-container">
        {product.imageUrl ? (
          <img className="product-img w-full h-full object-cover" src={product.imageUrl} alt={product.name} />
        ) : (
          <i className={`ti ${product.icon}`} style={{ fontSize: 80, color: "#d8c2c0" }} />
        )}
      </div>
      <div className="text-xs font-semibold text-secondary uppercase tracking-wider mb-2">
        {product.brand}
      </div>
      <h3 className="font-headline-md text-xl text-on-background line-clamp-1 mb-2 group-hover:text-primary transition-colors">
        {product.name}
      </h3>
      <div className="mt-auto flex w-full items-center justify-between">
        <div className="text-primary font-black">{formatPrice(product.price)}</div>
        <span className="w-9 h-9 rounded-full bg-on-surface text-white flex items-center justify-center group-hover:bg-primary transition-colors">
          <span className="material-symbols-outlined text-base">arrow_forward</span>
        </span>
      </div>
    </button>
  );
}

function SaleCard({ product, onOpenDetail }) {
  return (
    <button
      className="group w-[290px] md:w-[320px] flex-shrink-0 bg-white p-4 rounded-2xl flex flex-col text-left shadow-md border border-outline-variant/70 cursor-pointer hover:border-primary transition-all product-card-hover"
      onClick={() => onOpenDetail(product)}
    >
      <div className="w-full h-44 bg-surface-container rounded-xl mb-4 flex items-center justify-center overflow-hidden">
        {product.imageUrl ? (
          <img src={product.imageUrl} alt={product.name} className="product-img w-full h-full object-cover" />
        ) : (
          <i className={`ti ${product.icon} text-[64px] text-outline-variant`} />
        )}
      </div>
      <span className="w-fit text-[10px] bg-primary text-white font-black px-3 py-1 rounded-full mb-2">
        SALE
      </span>
      <h3 className="font-bold text-sm line-clamp-2 min-h-[40px] group-hover:text-primary transition-colors">{product.name}</h3>
      <div className="text-primary font-black mt-3">{formatPrice(product.price)}</div>
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

  const variants = detail?.productVariants || [];
  const images = getProductImages(detail, product?.imageUrl || "");

  // Tự động chọn variant nếu chỉ có 1
  useEffect(() => {
    if (variants.length === 1 && !selectedVariant) {
      setSelectedVariant(variants[0]);
    }
  }, [variants, selectedVariant]);

  if (!product) return null;

  const price = Number(selectedVariant?.price || product.price || 0);
  const cartProduct = {
    ...product,
    price,
    imageUrl: selectedImage || product.imageUrl
  };

  return (
    <div className="detail-modal-bg open" onClick={onClose}>
      <div
        className="bg-white rounded-2xl w-[1040px] max-w-full max-h-[90vh] overflow-y-auto relative shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          className="absolute right-4 top-4 z-10 w-10 h-10 bg-white/95 rounded-full flex items-center justify-center text-secondary hover:text-primary shadow-lg border border-outline-variant/60"
          onClick={onClose}
          aria-label="Đóng"
        >
          <span className="material-symbols-outlined">close</span>
        </button>
        {loading ? (
          <LoadingBlock text="Đang tải chi tiết sản phẩm..." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-[1.08fr_0.92fr] gap-8 p-5 md:p-8">
            <div>
              <div className="bg-surface-container rounded-2xl aspect-square md:aspect-[1/0.92] flex items-center justify-center overflow-hidden border border-outline-variant/50">
                {selectedImage ? (
                  <img src={selectedImage} alt={product.name} className="w-full h-full object-cover" />
                ) : (
                  <i className={`ti ${product.icon} text-[96px] text-outline-variant`} />
                )}
              </div>
              {images.length > 1 && (
                <div className="flex gap-3 mt-4 overflow-x-auto pb-1">
                  {images.map((image) => (
                    <button
                      key={image}
                      className={`w-20 h-20 rounded-xl overflow-hidden border-2 flex-shrink-0 transition-all ${
                        image === selectedImage ? "border-primary shadow-[0_10px_24px_rgba(192,0,33,0.18)]" : "border-outline-variant hover:border-primary"
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
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className="text-xs font-bold text-secondary uppercase tracking-wider">
                  {product.brand || "Velocity Prime"}
                </span>
                <span className="w-1 h-1 rounded-full bg-outline-variant" />
                <span className="text-xs text-secondary">{product.cat}</span>
              </div>
              <h2 className="font-headline-lg text-3xl md:text-4xl uppercase text-on-surface leading-tight mb-4">
                {product.name}
              </h2>
              <div className="text-primary text-3xl font-black mb-5 tracking-tight">{formatPrice(price)}</div>
              <p className="text-sm text-secondary leading-relaxed mb-5 bg-surface-container-low border border-outline-variant/60 rounded-2xl p-4">
                {detail?.description || product.description || "Sản phẩm chính hãng, tối ưu cho hiệu suất thi đấu."}
              </p>

              {variants.length > 0 && (
                <div className="mb-6">
                  <div className="text-sm font-bold text-on-surface mb-3">Chọn biến thể</div>
                  <div className="flex flex-wrap gap-2">
                    {variants.map((variant) => {
                      const disabled = Number(variant.stockQuantity || 0) <= 0;
                      return (
                        <button
                          key={variant.id}
                          disabled={disabled}
                          className={`px-4 py-2.5 rounded-full border text-sm font-semibold transition-colors ${
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-auto pt-2">
                <button
                  className="btn-effect py-3.5 bg-primary text-white rounded-full font-bold hover:bg-surface-tint transition-colors"
                  onClick={() => {
                    onAddToCart(cartProduct, selectedVariant?.id);
                    if (selectedVariant?.id) onClose();
                  }}
                >
                  Thêm vào giỏ
                </button>
                <button
                  className="btn-effect py-3.5 bg-on-surface text-white rounded-full font-bold hover:bg-primary transition-colors"
                  onClick={() => {
                    onAddToCart(cartProduct, selectedVariant?.id);
                    if (selectedVariant?.id) onClose();
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
  const [addresses, setAddresses] = useState([]);
  const [addressLoading, setAddressLoading] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState(null);
  const [addressForm, setAddressForm] = useState(() => createAddressForm(user));

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
    setAddresses([]);
    setAddressForm(createAddressForm(user));
    setEditingAddressId(null);

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

    async function loadAddressesForModal() {
      setAddressLoading(true);
      try {
        const data = await api.getAddresses();
        if (!mounted) return;
        setAddresses(sortAddresses((Array.isArray(data) ? data : []).map(normalizeAddress)));
      } catch (error) {
        if (mounted) showToast(error.message || "Không tải được danh sách địa chỉ.");
      } finally {
        if (mounted) setAddressLoading(false);
      }
    }

    loadProfile();
    loadAddressesForModal();
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

  function updateAddressForm(key, value) {
    setAddressForm((current) => ({ ...current, [key]: value }));
  }

  function resetAddressForm(nextAddress = null) {
    setEditingAddressId(nextAddress?.id || null);
    setAddressForm(createAddressForm(user, nextAddress || { isDefault: !addresses.length }));
  }

  async function refreshAddresses() {
    setAddressLoading(true);
    try {
      const data = await api.getAddresses();
      const nextAddresses = sortAddresses((Array.isArray(data) ? data : []).map(normalizeAddress));
      setAddresses(nextAddresses);
      return nextAddresses;
    } catch (error) {
      showToast(error.message || "Không tải được danh sách địa chỉ.");
      return addresses;
    } finally {
      setAddressLoading(false);
    }
  }

  function validateAddressForm() {
    const payload = addressPayloadFromForm(addressForm);
    if (!payload.receiverName || !payload.receiverPhone || !payload.city || !payload.district || !payload.detailAddress) {
      showToast("Vui lòng nhập đầy đủ thông tin địa chỉ.");
      return null;
    }
    if (payload.receiverPhone.replace(/\D/g, "").length < 10) {
      showToast("Số điện thoại nhận hàng cần có ít nhất 10 chữ số.");
      return null;
    }
    return payload;
  }

  async function saveAddress(event) {
    event.preventDefault();
    const payload = validateAddressForm();
    if (!payload) return;

    setAddressLoading(true);
    try {
      if (editingAddressId) {
        await api.updateAddress(editingAddressId, payload);
        showToast("Đã cập nhật địa chỉ giao hàng.");
      } else {
        await api.addAddress(payload);
        showToast("Đã thêm địa chỉ giao hàng.");
      }
      await refreshAddresses();
      resetAddressForm();
      setMode("addresses");
    } catch (error) {
      showToast(error.message || "Không lưu được địa chỉ.");
    } finally {
      setAddressLoading(false);
    }
  }

  async function setDefaultAddress(id) {
    setAddressLoading(true);
    try {
      await api.setDefaultAddress(id);
      await refreshAddresses();
      showToast("Đã đặt địa chỉ mặc định.");
    } catch (error) {
      showToast(error.message || "Không đặt được địa chỉ mặc định.");
    } finally {
      setAddressLoading(false);
    }
  }

  async function deleteAddress(id) {
    if (!window.confirm("Xóa địa chỉ giao hàng này?")) return;
    setAddressLoading(true);
    try {
      await api.deleteAddress(id);
      await refreshAddresses();
      if (editingAddressId === id) resetAddressForm();
      showToast("Đã xóa địa chỉ giao hàng.");
    } catch (error) {
      showToast(error.message || "Không xóa được địa chỉ.");
    } finally {
      setAddressLoading(false);
    }
  }

  const defaultAddress = addresses.find((address) => address.isDefault) || addresses[0];

  return (
    <div className="modal-bg open p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl w-[820px] max-w-full max-h-[90vh] overflow-y-auto shadow-2xl relative"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/90 border border-outline-variant/60 text-gray-400 hover:text-primary transition-colors flex items-center justify-center shadow-sm"
          title="Đóng"
        >
          <span className="material-symbols-outlined">close</span>
        </button>

        <div className="grid grid-cols-1 md:grid-cols-[260px_1fr]">
          <aside className="bg-on-surface text-white p-6 flex flex-col items-center text-center">
            <div className="w-24 h-24 rounded-full bg-blue-100 flex items-center justify-center mb-4 shadow-xl overflow-hidden border-4 border-white/20">
              <img src={`https://api.dicebear.com/9.x/micah/svg?seed=${profile.username}&backgroundColor=b6e3f4`} alt="avatar" className="w-full h-full object-cover" />
            </div>
            <h2 className="font-headline-md text-2xl uppercase leading-tight">
              {profile.fullName || "Người dùng"}
            </h2>
            <span className="mt-3 px-3 py-1 bg-primary/20 border border-primary/40 rounded-full text-xs font-bold uppercase">
              {profile.role || "CUSTOMER"}
            </span>
            <div className="mt-6 w-full space-y-3">
              <button
              className="btn-effect w-full py-2.5 bg-white/10 text-white font-bold text-sm rounded-full hover:bg-primary transition-colors flex items-center justify-center gap-2"
                onClick={() => setMode("edit")}
              >
                <span className="material-symbols-outlined text-lg">edit</span>
                Sửa thông tin
              </button>
              <button
                className="btn-effect w-full py-2.5 border border-white/20 text-white font-bold text-sm rounded-full hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2"
                onClick={() => {
                  resetAddressForm();
                  setMode("addresses");
                }}
              >
                <span className="material-symbols-outlined text-lg">location_on</span>
                Địa chỉ giao hàng
              </button>
              <button
                className="btn-effect w-full py-2.5 border border-white/20 text-white font-bold text-sm rounded-full hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2"
                onClick={() => {
                  setPasswordForm({ oldPassword: "", newPassword: "", confirmPassword: "" });
                  setMode("password");
                }}
              >
                <span className="material-symbols-outlined text-lg">lock_reset</span>
                Đổi mật khẩu
              </button>
              <button
                className="btn-effect w-full py-2.5 bg-primary text-on-primary font-bold text-sm rounded-full hover:bg-surface-tint transition-colors flex items-center justify-center gap-2"
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
                <h3 className="font-headline-md text-2xl uppercase text-on-surface">
                  {mode === "view" && "Thông tin tài khoản"}
                  {mode === "edit" && "Cập nhật thông tin"}
                  {mode === "password" && "Đổi mật khẩu"}
                  {mode === "addresses" && "Địa chỉ giao hàng"}
                </h3>
                <p className="text-sm text-secondary mt-1">
                  {loading ? "Đang đồng bộ dữ liệu..." : ""}
                </p>
              </div>
            </div>

            {mode === "view" && (
              <div className="space-y-4">
                <ProfileInfoRow icon="badge" label="Họ và tên" value={profile.fullName || "Người dùng"} />
                <ProfileInfoRow icon="alternate_email" label="Tên đăng nhập" value={profile.username} />
                <ProfileInfoRow icon="phone" label="Số điện thoại" value={profile.phoneNumber || "Chưa cập nhật"} />
                <ProfileInfoRow
                  icon="location_on"
                  label="Địa chỉ mặc định"
                  value={defaultAddress ? formatAddressLine(defaultAddress) : "Chưa có địa chỉ giao hàng"}
                />
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
                <div className="flex gap-3 pt-2">
                  <button
                    disabled={loading}
                    className="btn-effect flex-1 py-2.5 bg-primary text-on-primary font-bold text-sm rounded-full hover:bg-surface-tint transition-colors disabled:opacity-60"
                  >
                    Lưu thay đổi
                  </button>
                  <button
                    type="button"
                    className="btn-effect flex-1 py-2.5 border border-outline-variant text-on-surface font-bold text-sm rounded-full hover:border-primary transition-colors"
                    onClick={() => setMode("view")}
                  >
                    Hủy
                  </button>
                </div>
              </form>
            )}

            {mode === "addresses" && (
              <div className="space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <p className="text-sm text-secondary">
                    {addressLoading ? "Đang đồng bộ địa chỉ..." : `${addresses.length} địa chỉ đã lưu`}
                  </p>
                  <button
                    type="button"
                    className="btn-effect px-4 py-2.5 bg-on-surface text-white rounded-full font-bold text-sm hover:bg-primary transition-colors flex items-center justify-center gap-2"
                    onClick={() => resetAddressForm()}
                  >
                    <span className="material-symbols-outlined text-lg">add_location_alt</span>
                    Thêm địa chỉ
                  </button>
                </div>

                {addresses.length ? (
                  <div className="space-y-3">
                    {addresses.map((address) => (
                      <article
                        key={address.id}
                        className={`border rounded-2xl p-4 bg-surface-container-lowest shadow-sm transition-colors ${
                          editingAddressId === address.id
                            ? "border-primary ring-4 ring-primary/10"
                            : "border-outline-variant/70"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <span className="material-symbols-outlined text-primary mt-0.5">location_on</span>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="font-bold text-on-surface">{address.receiverName}</div>
                              {address.isDefault && (
                                <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-bold uppercase">
                                  Mặc định
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-secondary mt-1">{address.receiverPhone}</div>
                            <div className="text-sm text-on-surface mt-2 leading-relaxed">
                              {formatAddressLine(address)}
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-4">
                          {!address.isDefault && (
                            <button
                              type="button"
                              disabled={addressLoading}
                              className="px-3 py-2 rounded-full border border-outline-variant text-xs font-bold hover:border-primary hover:text-primary transition-colors disabled:opacity-60"
                              onClick={() => setDefaultAddress(address.id)}
                            >
                              Đặt mặc định
                            </button>
                          )}
                          <button
                            type="button"
                            disabled={addressLoading}
                            className="px-3 py-2 rounded-full border border-outline-variant text-xs font-bold hover:border-primary hover:text-primary transition-colors disabled:opacity-60"
                            onClick={() => resetAddressForm(address)}
                          >
                            Sửa
                          </button>
                          <button
                            type="button"
                            disabled={addressLoading || address.isDefault}
                            className="px-3 py-2 rounded-full border border-outline-variant text-xs font-bold text-error hover:border-error disabled:opacity-40 disabled:hover:border-outline-variant"
                            onClick={() => deleteAddress(address.id)}
                            title={address.isDefault ? "Hãy đặt địa chỉ khác làm mặc định trước khi xóa" : "Xóa địa chỉ"}
                          >
                            Xóa
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="border border-dashed border-outline-variant rounded-2xl p-6 text-center bg-surface-container-low">
                    <span className="material-symbols-outlined text-4xl text-outline-variant mb-2">add_location_alt</span>
                    <div className="font-bold text-on-surface">Chưa có địa chỉ giao hàng</div>
                    <p className="text-sm text-secondary mt-1">Thêm địa chỉ đầu tiên để checkout nhanh hơn.</p>
                  </div>
                )}

                <form className="space-y-4 border-t border-outline-variant pt-5" onSubmit={saveAddress}>
                  <div className="flex items-center justify-between gap-3">
                    <h4 className="font-bold text-on-surface">
                      {editingAddressId ? "Sửa địa chỉ" : "Thêm địa chỉ mới"}
                    </h4>
                    {editingAddressId && (
                      <button
                        type="button"
                        className="text-xs font-bold text-secondary hover:text-primary transition-colors"
                        onClick={() => resetAddressForm()}
                      >
                        Hủy sửa
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Tên người nhận"
                      value={addressForm.receiverName}
                      onChange={(value) => updateAddressForm("receiverName", value)}
                    />
                    <Input
                      label="Số điện thoại"
                      type="tel"
                      value={addressForm.receiverPhone}
                      onChange={(value) => updateAddressForm("receiverPhone", value)}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Tỉnh/Thành phố"
                      value={addressForm.city}
                      onChange={(value) => updateAddressForm("city", value)}
                    />
                    <Input
                      label="Quận/Huyện"
                      value={addressForm.district}
                      onChange={(value) => updateAddressForm("district", value)}
                    />
                  </div>
                  <Textarea
                    label="Địa chỉ chi tiết"
                    value={addressForm.detailAddress}
                    onChange={(value) => updateAddressForm("detailAddress", value)}
                    placeholder="Số nhà, tên đường, ghi chú giao hàng..."
                  />
                  <label className="flex items-center gap-3 text-sm text-on-surface">
                    <input
                      type="checkbox"
                      checked={addressForm.isDefault || !addresses.length}
                      disabled={!addresses.length}
                      onChange={(event) => updateAddressForm("isDefault", event.target.checked)}
                      className="w-4 h-4 accent-primary"
                    />
                    Đặt làm địa chỉ mặc định
                  </label>
                  <button
                    disabled={addressLoading}
                    className="btn-effect w-full py-3 bg-primary text-on-primary rounded-full font-bold hover:bg-surface-tint transition-colors disabled:opacity-60"
                  >
                    {addressLoading ? "Đang lưu..." : editingAddressId ? "Lưu địa chỉ" : "Thêm địa chỉ"}
                  </button>
                </form>
              </div>
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
                    className="btn-effect flex-1 py-2.5 bg-primary text-on-primary font-bold text-sm rounded-full hover:bg-surface-tint transition-colors disabled:opacity-60"
                  >
                    Đổi mật khẩu
                  </button>
                  <button
                    type="button"
                    className="btn-effect flex-1 py-2.5 border border-outline-variant text-on-surface font-bold text-sm rounded-full hover:border-primary transition-colors"
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
    <div className="flex items-start gap-3 p-4 border border-outline-variant/70 rounded-2xl bg-surface-container-lowest shadow-sm">
      <span className="material-symbols-outlined text-primary mt-0.5">{icon}</span>
      <div>
        <div className="text-xs font-bold text-secondary uppercase tracking-wider">{label}</div>
        <div className="text-sm font-semibold text-on-surface mt-1">{value}</div>
      </div>
    </div>
  );
}

function CartPanel({ open, cart, onClose, onQty, onRemove, onCheckout }) {
  const total = cart.reduce((sum, item) => sum + item.price * (item.quantity || 0), 0);

  if (!open) return null;

  return (
    <>
      <div className={`cart-overlay ${open ? "open" : ""}`} onClick={onClose} />
      <aside className={`cart-panel ${open ? "open" : ""}`}>
        <div className="px-5 py-5 border-b border-outline-variant flex items-center justify-between">
          <h3 className="text-lg font-bold text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">shopping_cart</span>
            Giỏ hàng
          </h3>
          <button
            type="button"
            className="w-9 h-9 rounded-full bg-surface-container text-secondary hover:text-on-surface flex items-center justify-center material-symbols-outlined"
            onClick={onClose}
            aria-label="Đóng giỏ hàng"
          >
            close
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {cart.length ? (
            <div className="space-y-4">
              {cart.map((item) => (
                <div
                  key={item.cartItemId}
                  className="flex gap-3 border border-outline-variant/70 rounded-2xl p-3 bg-white shadow-sm"
                >
                  <div className="w-16 h-16 bg-surface-container rounded-xl overflow-hidden flex items-center justify-center flex-shrink-0">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <i className="ti ti-tag text-2xl text-outline" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm line-clamp-2">{item.name}</div>
                    {(item.size || item.color) && (
                      <div className="text-xs text-secondary mt-1">
                        {item.color && <span>{item.color}</span>}
                        {item.color && item.size && <span> · </span>}
                        {item.size && <span>Size: {item.size}</span>}
                      </div>
                    )}
                    <div className="text-primary font-black text-sm mt-1">{formatPrice(item.price)}</div>
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        className="w-8 h-8 border border-outline-variant rounded-full flex items-center justify-center hover:border-primary hover:text-primary transition-colors"
                        onClick={() => onQty(item.cartItemId, -1)}
                      >
                        -
                      </button>
                      <span className="text-sm font-bold w-6 text-center">{item.quantity}</span>
                      <button
                        className="w-8 h-8 border border-outline-variant rounded-full flex items-center justify-center hover:border-primary hover:text-primary transition-colors"
                        onClick={() => onQty(item.cartItemId, 1)}
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <button
                    className="w-8 h-8 rounded-full text-secondary hover:text-error hover:bg-error-container self-start transition-colors"
                    onClick={() => onRemove(item.cartItemId)}
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
            className="btn-effect w-full py-3.5 bg-primary text-on-primary rounded-full font-bold flex items-center justify-center gap-2 hover:bg-surface-tint transition-colors"
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
  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [addressMode, setAddressMode] = useState("new");
  const [saveNewAddress, setSaveNewAddress] = useState(true);
  const [addressLoading, setAddressLoading] = useState(false);
  const [placingOrder, setPlacingOrder] = useState(false);
  const newAddressFormRef = useRef(null);

  // Multi-coupon state
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupons, setAppliedCoupons] = useState([]);
  const [couponLoading, setCouponLoading] = useState(false);
  const [totalDiscount, setTotalDiscount] = useState(0);

  useEffect(() => {
    if (!user) {
      sessionStorage.setItem("pendingCheckout", "true");
      showToast("Vui lòng đăng nhập để thanh toán.");
      navigate("/login", { replace: true });
    }
  }, [user, navigate, showToast]);

  useEffect(() => {
    if (!user) return;

    let mounted = true;
    async function loadCheckoutAddresses() {
      setAddressLoading(true);
      try {
        const data = await api.getAddresses();
        if (!mounted) return;
        const nextAddresses = sortAddresses((Array.isArray(data) ? data : []).map(normalizeAddress));
        setAddresses(nextAddresses);

        const nextSelected = nextAddresses.find((address) => address.isDefault) || nextAddresses[0];
        if (nextSelected) {
          setSelectedAddressId(String(nextSelected.id));
          setAddressMode("saved");
          setForm(addressToCheckoutForm(nextSelected, user));
        } else {
          setSelectedAddressId("");
          setAddressMode("new");
          setForm(addressToCheckoutForm(null, user));
        }
      } catch (error) {
        if (mounted) {
          setAddressMode("new");
          showToast(error.message || "Không tải được địa chỉ giao hàng.");
        }
      } finally {
        if (mounted) setAddressLoading(false);
      }
    }

    loadCheckoutAddresses();
    return () => {
      mounted = false;
    };
  }, [user?.username]);

  const selectedAddress = useMemo(
    () => addresses.find((address) => String(address.id) === String(selectedAddressId)),
    [addresses, selectedAddressId]
  );

  if (!user) return null;

  const subtotal = cart.reduce((sum, item) => sum + item.price * (item.quantity || 0), 0);
  const shippingFee = shipping === "express" ? 30000 : 0;
  const total = Math.max(0, subtotal + shippingFee - totalDiscount);

  function update(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function selectSavedAddress(address) {
    setSelectedAddressId(String(address.id));
    setAddressMode("saved");
    setForm(addressToCheckoutForm(address, user));
  }

  function startNewAddress() {
    setSelectedAddressId("");
    setAddressMode("new");
    setForm(addressToCheckoutForm(null, user));
    setSaveNewAddress(true);
    setTimeout(() => {
      newAddressFormRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
  }

  function validateCheckoutAddress() {
    const payload = {
      receiverName: form.name.trim(),
      receiverPhone: form.phone.trim(),
      city: form.city.trim(),
      district: form.district.trim(),
      detailAddress: form.address.trim(),
      isDefault: !addresses.length
    };

    if (!payload.receiverName || !payload.receiverPhone || !payload.city || !payload.district || !payload.detailAddress) {
      showToast("Vui lòng nhập đầy đủ thông tin giao hàng.");
      return null;
    }
    if (payload.receiverPhone.replace(/\D/g, "").length < 10) {
      showToast("Số điện thoại nhận hàng cần có ít nhất 10 chữ số.");
      return null;
    }
    return payload;
  }

  async function saveCheckoutAddress() {
    const payload = validateCheckoutAddress();
    if (!payload) return null;

    setAddressLoading(true);
    try {
      const saved = normalizeAddress(await api.addAddress(payload));
      const nextAddresses = sortAddresses([saved, ...addresses.map((address) => (
        saved.isDefault ? { ...address, isDefault: false } : address
      ))]);
      setAddresses(nextAddresses);
      selectSavedAddress(saved);
      showToast("Đã lưu địa chỉ giao hàng.");
      return saved;
    } catch (error) {
      showToast(error.message || "Không lưu được địa chỉ giao hàng.");
      return null;
    } finally {
      setAddressLoading(false);
    }
  }

  async function handleApplyCoupon() {
    const code = couponInput.trim().toUpperCase();
    if (!code) return;
    if (appliedCoupons.some((c) => c.code === code)) {
      showToast("Mã này đã được áp dụng!");
      return;
    }
    setCouponLoading(true);
    try {
      const currentSubtotal = subtotal - appliedCoupons.reduce((s, c) => s + c.discountAmount, 0);
      const res = await api.applyCoupon(code, currentSubtotal);
      const newCoupon = { code, discountAmount: res.discountAmount, message: res.message };
      const nextCoupons = [...appliedCoupons, newCoupon];
      setAppliedCoupons(nextCoupons);
      setTotalDiscount(nextCoupons.reduce((s, c) => s + c.discountAmount, 0));
      setCouponInput("");
      showToast(res.message || "Áp dụng mã thành công!");
    } catch (error) {
      showToast(error.message || "Mã giảm giá không hợp lệ.");
    } finally {
      setCouponLoading(false);
    }
  }

  function removeCoupon(code) {
    const nextCoupons = appliedCoupons.filter((c) => c.code !== code);
    setAppliedCoupons(nextCoupons);
    setTotalDiscount(nextCoupons.reduce((s, c) => s + c.discountAmount, 0));
  }

  async function confirmOrder() {
    if (!cart.length) {
      showToast("Giỏ hàng đang trống.");
      return;
    }

    const payload = validateCheckoutAddress();
    if (!payload) return;

    setPlacingOrder(true);
    let addressForOrder = selectedAddress;
    try {
      if (addressMode === "new" && saveNewAddress) {
        addressForOrder = await saveCheckoutAddress();
        if (!addressForOrder) return;
      }

      if (!addressForOrder?.id && addressMode === "new") {
        addressForOrder = await saveCheckoutAddress();
        if (!addressForOrder) return;
      }

      const paymentMethodMap = { cod: "COD", bank: "BANK_TRANSFER", ewallet: "VNPAY" };

      const checkoutPayload = {
        addressId: addressForOrder.id,
        paymentMethod: paymentMethodMap[payment] || "COD",
        note: "",
        couponCodes: appliedCoupons.map((c) => c.code)
      };

      await api.checkout(checkoutPayload);
      onClearCart?.();
      showToast("Đặt hàng thành công! Cảm ơn bạn.");
      navigate("/orders", { replace: true });
    } catch (error) {
      showToast(error.message || "Không thể đặt hàng. Vui lòng thử lại.");
    } finally {
      setPlacingOrder(false);
    }
  }

  return (
    <main className="bg-surface-container-low text-on-background font-body-md min-h-screen">
      <header className="bg-on-surface text-white py-4 px-margin-mobile md:px-margin-desktop flex items-center justify-between shadow-[0_12px_34px_rgba(0,0,0,0.22)]">
        <button className="flex items-center gap-2 cursor-pointer rounded-full px-3 py-2 hover:bg-white/10 transition-colors" onClick={() => navigate(-1)}>
          <span className="material-symbols-outlined">arrow_back</span>
          <span className="font-headline-md text-lg">Thanh toán</span>
        </button>
        <div className="text-sm">Bước 1/3</div>
      </header>

      <div className="max-w-6xl mx-auto px-margin-mobile md:px-margin-desktop py-8 md:py-10 w-full flex-1">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <section className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-outline-variant/70">
              <h2 className="text-lg font-bold text-on-surface mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">local_shipping</span>
                Thông tin giao hàng
              </h2>
              <div className="space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <p className="text-sm text-secondary">
                    {addressLoading ? "Đang tải địa chỉ..." : "Chọn địa chỉ đã lưu hoặc thêm địa chỉ mới."}
                  </p>
                  <button
                    type="button"
                    className="btn-effect px-4 py-2.5 bg-on-surface text-white rounded-full font-bold text-sm hover:bg-primary transition-colors flex items-center justify-center gap-2"
                    onClick={startNewAddress}
                  >
                    <span className="material-symbols-outlined text-lg">add_location_alt</span>
                    Thêm địa chỉ mới
                  </button>
                </div>

                {addresses.length ? (
                  <div className="space-y-3">
                    {addresses.map((address) => (
                      <label
                        key={address.id}
                        className={`flex items-start gap-3 p-4 border-2 rounded-2xl cursor-pointer transition-colors ${
                          String(selectedAddressId) === String(address.id) && addressMode === "saved"
                            ? "border-primary bg-primary/5 shadow-[0_10px_24px_rgba(192,0,33,0.08)]"
                            : "border-outline-variant hover:border-primary"
                        }`}
                      >
                        <input
                          type="radio"
                          name="checkout-address"
                          checked={String(selectedAddressId) === String(address.id) && addressMode === "saved"}
                          onChange={() => selectSavedAddress(address)}
                          className="w-5 h-5 accent-primary mt-1"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-on-surface">{address.receiverName}</span>
                            <span className="text-sm text-secondary">{address.receiverPhone}</span>
                            {address.isDefault && (
                              <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-bold uppercase">
                                Mặc định
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-secondary mt-2 leading-relaxed">
                            {formatAddressLine(address)}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                ) : (
                  <div className="border border-dashed border-outline-variant rounded-2xl p-5 bg-surface-container-low text-center">
                    <span className="material-symbols-outlined text-4xl text-outline-variant mb-2">location_off</span>
                    <div className="font-bold text-on-surface">Bạn chưa có địa chỉ giao hàng</div>
                    <p className="text-sm text-secondary mt-1">Thêm địa chỉ đầu tiên để dùng cho đơn hàng này.</p>
                  </div>
                )}

                {addressMode === "new" && (
                  <div ref={newAddressFormRef} className="space-y-4 border-t border-outline-variant pt-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <CheckoutField label="Họ và tên" value={form.name} onChange={(value) => update("name", value)} placeholder="Nguyễn Văn A" />
                      <CheckoutField label="Số điện thoại" value={form.phone} onChange={(value) => update("phone", value)} placeholder="0912 345 678" type="tel" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <CheckoutField label="Tỉnh/Thành phố" value={form.city} onChange={(value) => update("city", value)} placeholder="Hà Nội" />
                      <CheckoutField label="Quận/Huyện" value={form.district} onChange={(value) => update("district", value)} placeholder="Cầu Giấy" />
                    </div>
                    <CheckoutField label="Địa chỉ chi tiết" value={form.address} onChange={(value) => update("address", value)} placeholder="Số nhà, tên đường..." />
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <label className="flex items-center gap-3 text-sm text-on-surface">
                        <input
                          type="checkbox"
                          checked={saveNewAddress || !addresses.length}
                          disabled={!addresses.length}
                          onChange={(event) => setSaveNewAddress(event.target.checked)}
                          className="w-4 h-4 accent-primary"
                        />
                        Lưu địa chỉ này cho lần sau
                      </label>
                      <button
                        type="button"
                        disabled={addressLoading}
                        className="btn-effect px-4 py-2.5 border border-outline-variant text-on-surface rounded-full font-bold text-sm hover:border-primary hover:text-primary transition-colors disabled:opacity-60"
                        onClick={saveCheckoutAddress}
                      >
                        {addressLoading ? "Đang lưu..." : "Lưu địa chỉ"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </section>

            <section className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-outline-variant/70">
              <h2 className="text-lg font-bold text-on-surface mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">local_shipping</span>
                Phương thức giao hàng
              </h2>
              <div className="space-y-3">
                <CheckoutRadio name="shipping" value="standard" checked={shipping === "standard"} onChange={setShipping} title="Giao hàng tiêu chuẩn" text="Giao trong 3-5 ngày (Miễn phí)" />
                <CheckoutRadio name="shipping" value="express" checked={shipping === "express"} onChange={setShipping} title="Giao hàng nhanh (Express)" text="Giao trong 1-2 ngày (+30.000₫)" />
              </div>
            </section>

            <section className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-outline-variant/70">
              <h2 className="text-lg font-bold text-on-surface mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">payment</span>
                Phương thức thanh toán
              </h2>
              <div className="space-y-3">
                <CheckoutRadio name="payment" value="cod" checked={payment === "cod"} onChange={setPayment} title="Thanh toán khi nhận hàng" text="COD - Không phí thêm" />
                <CheckoutRadio name="payment" value="bank" checked={payment === "bank"} onChange={setPayment} title="Chuyển khoản ngân hàng" text="QR Code - Hoàn tiền nếu lỗi" />
                <CheckoutRadio name="payment" value="ewallet" checked={payment === "ewallet"} onChange={setPayment} title="Ví điện tử" text="Momo, ZaloPay, ViettelPay" />
              </div>
            </section>
          </div>

          <aside className="lg:col-span-1">
            <div className="bg-white rounded-2xl p-6 shadow-[0_20px_60px_rgba(20,20,20,0.10)] border border-outline-variant/70 sticky top-6">
              <h2 className="text-lg font-bold text-on-surface mb-4">Đơn hàng của bạn</h2>
              <div className="space-y-3 mb-4 max-h-64 overflow-y-auto pb-4 border-b border-outline-variant">
                {cart.length ? (
                  cart.map((item) => (
                    <div key={item.cartItemId} className="flex gap-3">
                      <div className="w-14 h-14 bg-surface-container rounded-xl overflow-hidden flex items-center justify-center flex-shrink-0">
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                          <i className="ti ti-tag text-xl text-outline" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm line-clamp-2">{item.name}</div>
                        <div className="text-xs text-secondary mt-1">
                          {item.color && <span>{item.color} · </span>}
                          {item.size ? `Size ${item.size} · ` : ""}SL: {item.quantity}
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-primary font-bold text-sm">{formatPrice(item.price)}</span>
                          <div className="flex items-center gap-1">
                            <button className="w-6 h-6 border border-outline-variant rounded" onClick={() => onQty(item.cartItemId, -1)}>-</button>
                            <button className="w-6 h-6 border border-outline-variant rounded" onClick={() => onQty(item.cartItemId, 1)}>+</button>
                            <button className="w-6 h-6 text-error" onClick={() => onRemove(item.cartItemId)}>
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

              {/* Multi-coupon section */}
              <div className="mb-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleApplyCoupon()}
                    placeholder="Nhập mã giảm giá"
                    className="flex-1 px-3 py-2.5 border border-outline-variant rounded-full text-xs outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-colors bg-white"
                  />
                  <button
                    onClick={handleApplyCoupon}
                    disabled={couponLoading}
                    className="px-4 py-2.5 bg-primary/10 text-primary rounded-full text-xs font-bold hover:bg-primary hover:text-white transition-colors disabled:opacity-60"
                  >
                    {couponLoading ? "..." : "Áp dụng"}
                  </button>
                </div>
                {appliedCoupons.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {appliedCoupons.map((coupon) => (
                      <div key={coupon.code} className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-3 py-2">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-green-600 text-sm">confirmation_number</span>
                          <span className="text-xs font-bold text-green-700">{coupon.code}</span>
                          <span className="text-xs text-green-600">-{formatPrice(coupon.discountAmount)}</span>
                        </div>
                        <button onClick={() => removeCoupon(coupon.code)} className="text-red-400 hover:text-red-600 transition-colors">
                          <span className="material-symbols-outlined text-sm">close</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
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
                  <span className="text-secondary">Giảm giá {appliedCoupons.length > 0 && `(${appliedCoupons.length} mã)`}</span>
                  <span className="font-semibold text-error">{totalDiscount > 0 ? `-${formatPrice(totalDiscount)}` : "0₫"}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-outline-variant">
                  <span className="font-bold text-on-surface">Tổng cộng</span>
                  <span className="font-bold text-xl text-primary">{formatPrice(total)}</span>
                </div>
              </div>

              <button
                disabled={placingOrder || addressLoading}
                className="btn-effect w-full py-3.5 bg-primary text-on-primary rounded-full font-bold text-base hover:bg-surface-tint transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                onClick={confirmOrder}
              >
                <span className="material-symbols-outlined text-lg">check_circle</span>
                {placingOrder ? "Đang đặt hàng..." : "Xác nhận đặt hàng"}
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
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user) return;
    let mounted = true;
    async function load() {
      try {
        setLoading(true);
        const data = await api.getMyOrders();
        if (mounted) setOrders(data);
      } catch (err) {
        if (mounted) setError(err.message || "Lỗi tải đơn hàng");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [user]);

  async function handleConfirmDelivered(orderId) {
    if (!window.confirm("Xác nhận bạn đã nhận được hàng?")) return;
    try {
      const updatedOrder = await api.confirmDelivered(orderId);
      setOrders(orders.map(o => o.id === orderId ? updatedOrder : o));
    } catch (err) {
      alert(err.message || "Không thể xác nhận");
    }
  }

  // Helper mapping status to color
  const statusColors = {
    PENDING: "bg-amber-100 text-amber-700",
    CONFIRMED: "bg-blue-100 text-blue-700",
    SHIPPING: "bg-indigo-100 text-indigo-700",
    DELIVERED: "bg-green-100 text-green-700",
    FAILED: "bg-red-100 text-red-700",
    CANCELLED: "bg-gray-100 text-gray-700"
  };

  const statusLabels = {
    PENDING: "Chờ xác nhận",
    CONFIRMED: "Đã xác nhận",
    SHIPPING: "Đang giao",
    DELIVERED: "Thành công",
    FAILED: "Giao thất bại",
    CANCELLED: "Đã hủy"
  };

  if (!user) {
    return (
      <main className="min-h-screen bg-surface-container-low px-margin-mobile md:px-margin-desktop pt-[140px] pb-10 flex items-center justify-center">
        <div className="text-center">
          <p className="mb-4">Vui lòng đăng nhập để xem đơn hàng</p>
          <Link to="/login" className="btn-effect px-6 py-3 bg-primary text-white rounded-full font-bold">Đăng nhập</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-surface-container-low px-margin-mobile md:px-margin-desktop pt-[140px] pb-10">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
          <div>
            <p className="text-xs font-bold text-primary uppercase tracking-widest mb-2">Tài khoản</p>
            <h1 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg uppercase text-on-background">
              Đơn hàng
            </h1>
            <p className="text-sm text-secondary mt-1">Theo dõi các đơn đã đặt trên Velocity Prime.</p>
          </div>
        </div>

        {loading ? (
          <div className="py-20 text-center text-secondary">Đang tải đơn hàng...</div>
        ) : error ? (
          <div className="py-20 text-center text-error">{error}</div>
        ) : orders.length ? (
          <div className="space-y-4">
            {orders.map((order) => (
              <article key={order.id} className="bg-white border border-outline-variant/70 rounded-2xl overflow-hidden shadow-sm">
                <div className="px-5 py-4 border-b border-outline-variant flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <div className="font-bold text-on-surface">Đơn #{order.id}</div>
                    <div className="text-xs text-secondary">
                      {new Date(order.createdAt).toLocaleString("vi-VN")}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${statusColors[order.status] || "bg-gray-100 text-gray-800"}`}>
                      {statusLabels[order.status] || order.status}
                    </span>
                    <span className="font-black text-primary">{formatPrice(order.totalAmount)}</span>
                  </div>
                </div>
                <div className="p-5">
                  <div className="grid grid-cols-1 md:grid-cols-[1fr_260px] gap-5">
                    <div className="space-y-3">
                      {(order.items || []).map((item) => (
                        <div key={item.id} className="flex gap-3">
                          <div className="w-14 h-14 bg-surface-container rounded-xl overflow-hidden flex items-center justify-center flex-shrink-0">
                            {item.imageUrl ? (
                              <img src={item.imageUrl} alt={item.productName} className="w-full h-full object-cover" />
                            ) : (
                              <i className="ti ti-tag text-xl text-outline" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold text-sm line-clamp-2">{item.productName}</div>
                            <div className="text-xs text-secondary mt-1">
                              {item.color && <span>{item.color} · </span>}
                              {item.size ? `Size ${item.size} · ` : ""}SL: {item.quantity}
                            </div>
                            <div className="text-primary font-bold text-sm mt-1">{formatPrice(item.priceAtPurchase)}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex flex-col justify-between">
                      <div className="bg-surface-container-low rounded-2xl p-4 text-sm">
                        <div className="font-bold mb-2">Thông tin giao hàng</div>
                        <div className="text-secondary leading-relaxed space-y-1">
                          <div><span className="font-semibold text-on-surface">Người nhận:</span> {order.fullName}</div>
                          <div><span className="font-semibold text-on-surface">SĐT:</span> {order.phoneNumber}</div>
                          <div><span className="font-semibold text-on-surface">Địa chỉ:</span> {order.shippingAddress}</div>
                          <div><span className="font-semibold text-on-surface">Thanh toán:</span> {order.paymentMethod}</div>
                          {order.discountAmount > 0 && (
                            <div className="text-green-600 font-semibold mt-2 border-t border-green-200 pt-2">
                              Đã giảm: {formatPrice(order.discountAmount)}
                              {order.couponCodes && <span className="block text-xs font-normal">Mã: {order.couponCodes}</span>}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {order.status === "SHIPPING" && (
                        <button
                          onClick={() => handleConfirmDelivered(order.id)}
                          className="mt-4 w-full py-2 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition-colors"
                        >
                          Đã nhận hàng
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="bg-white border border-outline-variant/70 rounded-2xl p-10 text-center shadow-sm">
            <span className="material-symbols-outlined text-5xl text-outline-variant mb-3">receipt_long</span>
            <h2 className="font-bold text-on-surface mb-2">Chưa có đơn hàng</h2>
            <p className="text-sm text-secondary mb-6">Các đơn bạn đặt sẽ xuất hiện tại đây.</p>
            <Link
              to={SPORTS.badminton.route}
              className="btn-effect inline-flex items-center justify-center px-6 py-3 bg-primary text-white rounded-full font-bold text-sm hover:bg-surface-tint transition-colors"
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
        className="w-full px-4 py-3 border border-outline-variant rounded-xl text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-colors bg-white placeholder-secondary/70"
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
        className="w-full px-4 py-3 border border-outline-variant rounded-xl text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-colors bg-white"
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
      className={`flex items-center gap-3 p-4 border-2 rounded-2xl cursor-pointer transition-colors ${
        checked ? "border-primary bg-primary/5 shadow-[0_10px_24px_rgba(192,0,33,0.08)]" : "border-outline-variant hover:border-primary"
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
  const [forgotStep, setForgotStep] = useState(1);
  const [form, setForm] = useState({
    username: "",
    password: "",
    fullname: "",
    phonenumber: "",
    confirmPassword: "",
    remember: false,
    token: "",
    newPassword: ""
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
    setMode(nextMode);
    setForgotStep(1);
    setErrors({});
    setAlert("");
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

    if (mode === "forgot_password") {
      if (forgotStep === 1) {
        if (!form.username.trim()) return setAlert("Vui lòng nhập tên đăng nhập");
        setLoading(true);
        try {
          await api.forgotPassword({ username: form.username });
          setAlert("");
          setForgotStep(2);
          showToast("Mã xác thực đã được tạo!");
        } catch (error) {
          setAlert(error.message || "Tài khoản không tồn tại");
        } finally {
          setLoading(false);
        }
      } else {
        if (!form.token.trim()) return setAlert("Vui lòng nhập mã xác thực");
        if (!form.newPassword) return setAlert("Vui lòng nhập mật khẩu mới");
        setLoading(true);
        try {
          const res = await api.resetPassword({ token: form.token, newPassword: form.newPassword });
          setAlert("");
          window.alert(res || "Đổi mật khẩu thành công! Vui lòng đăng nhập lại.");
          switchMode("login");
        } catch (error) {
          setAlert(error.message || "Mã xác thực không hợp lệ!");
        } finally {
          setLoading(false);
        }
      }
      return;
    }

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
        <div className="bg-white border border-outline-variant rounded-2xl p-8 w-full max-w-[460px] text-center shadow-[0_22px_60px_rgba(20,20,20,0.10)]">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-5">
            <i className="ti ti-user-check text-3xl text-white" />
          </div>
          <h1 className="font-headline-lg text-3xl uppercase text-on-surface mb-2">
            Đã đăng nhập
          </h1>
          <p className="text-secondary mb-6">
            Bạn đang dùng tài khoản {user.fullName || user.username}.
          </p>
          <div className="flex gap-3">
            <button
              className="btn-effect flex-1 py-3 bg-primary text-white rounded-full font-bold hover:bg-surface-tint transition-colors"
              onClick={() => navigate(user.role === "ADMIN" ? "/admin" : "/")}
            >
              Tiếp tục
            </button>
            <button
              className="btn-effect flex-1 py-3 border border-outline-variant rounded-full font-bold hover:border-primary hover:text-primary transition-colors"
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
    <main className="bg-surface-container-low text-on-background font-body-md min-h-screen flex flex-col md:flex-row">
      <section className="hidden md:flex flex-1 bg-black text-white flex-col justify-center items-center p-12 relative overflow-hidden">
        <img
          src={loginHeroImage}
          className="absolute inset-0 w-full h-full object-cover object-center opacity-100 scale-105"
          alt="Messi background"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/78 via-black/44 to-transparent z-10" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/10 z-10" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_28%_55%,rgba(192,0,33,0.26),transparent_34%)] z-10 mix-blend-screen" />
        <div className="absolute inset-x-0 top-0 h-1 bg-primary z-20 shadow-[0_0_28px_rgba(192,0,33,0.9)]" />
        <div className="absolute -left-24 bottom-10 w-[420px] h-[420px] border border-primary/25 rotate-45 z-10" />
        <div className="relative z-20 text-center max-w-md px-6">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-[0_0_34px_rgba(192,0,33,0.65)]">
            <i className="ti ti-bolt text-3xl text-white" />
          </div>
          <p className="text-xs font-bold uppercase tracking-[0.32em] text-primary mb-3">
            Velocity Prime
          </p>
          <h1 className="font-display-lg text-[46px] leading-[1.08] uppercase mb-4 drop-shadow-[0_8px_28px_rgba(0,0,0,0.9)]">
            Sẵn sàng <span className="text-primary">ra sân</span>
          </h1>
          <p className="text-white/80 font-body-lg border-t border-white/15 pt-5">
            Đăng nhập để theo dõi đơn hàng, lưu wishlist và mua sắm gear thể thao chính hãng.
          </p>
        </div>
      </section>

      <section className="flex-1 flex flex-col justify-center items-center p-6 md:p-12 relative bg-surface-container-low min-h-screen overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(192,0,33,0.10),transparent_34%)]" />
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

        <form className="relative z-10 w-full max-w-[430px] bg-white/95 border border-outline-variant rounded-2xl p-6 md:p-8 shadow-[0_24px_70px_rgba(10,18,35,0.16)] backdrop-blur-sm" onSubmit={submit}>
          {mode !== "forgot_password" && (
            <div className="flex rounded-full bg-surface-container-low p-1 mb-8">
              <button
                type="button"
                className={`flex-1 py-3 text-sm font-bold rounded-full transition-colors ${
                  mode === "login"
                    ? "text-white bg-on-surface shadow-sm"
                    : "text-secondary hover:text-on-surface"
                }`}
                onClick={() => switchMode("login")}
              >
                Đăng Nhập
              </button>
              <button
                type="button"
                className={`flex-1 py-3 text-sm font-bold rounded-full transition-colors ${
                  mode === "register"
                    ? "text-white bg-on-surface shadow-sm"
                    : "text-secondary hover:text-on-surface"
                }`}
                onClick={() => switchMode("register")}
              >
                Đăng Ký
              </button>
            </div>
          )}

          <h2 className="text-2xl font-black text-on-surface mb-6">
            {mode === "login" ? "Chào mừng trở lại!" : mode === "register" ? "Tạo tài khoản mới" : "Khôi phục mật khẩu"}
          </h2>

          {alert && (
            <div className="p-3 mb-4 text-xs font-semibold text-error bg-error-container border border-error/20 rounded-lg flex items-center gap-2">
              <span className="material-symbols-outlined text-base">error</span>
              <span>{alert}</span>
            </div>
          )}

          <div className="space-y-4">
            {mode !== "forgot_password" && (
              <AuthField
                label="Tên đăng nhập"
                value={form.username}
                error={errors.username}
                onChange={(value) => update("username", value)}
                placeholder="Nhập tên đăng nhập"
              />
            )}

            {mode === "forgot_password" && forgotStep === 1 && (
              <AuthField
                label="Tên đăng nhập"
                value={form.username}
                error={errors.username}
                onChange={(value) => update("username", value)}
                placeholder="Nhập tên đăng nhập để khôi phục"
              />
            )}

            {mode === "forgot_password" && forgotStep === 2 && (
              <>
                <AuthField
                  label="Mã xác thực"
                  value={form.token}
                  error={errors.token}
                  onChange={(value) => update("token", value)}
                  placeholder="Nhập mã xác nhận"
                />
                <AuthField
                  label="Mật khẩu mới"
                  value={form.newPassword}
                  error={errors.newPassword}
                  onChange={(value) => update("newPassword", value)}
                  placeholder="••••••••"
                  type="password"
                />
              </>
            )}

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

            {mode !== "forgot_password" && (
              <AuthField
                label="Mật khẩu"
                value={form.password}
                error={errors.password}
                onChange={(value) => update("password", value)}
                placeholder="••••••••"
                type="password"
              />
            )}

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
                <button type="button" onClick={() => switchMode("forgot_password")} className="text-xs text-primary font-semibold hover:underline">
                  Quên mật khẩu?
                </button>
              </div>
            )}

            {mode === "forgot_password" && (
              <div className="text-center mt-2">
                <button type="button" onClick={() => switchMode("login")} className="text-xs text-secondary font-semibold hover:text-primary hover:underline">
                  Quay lại đăng nhập
                </button>
              </div>
            )}

            <button
              disabled={loading}
            className={`btn-effect w-full py-3.5 mt-6 rounded-full font-bold text-sm disabled:opacity-60 ${
                mode === "login" || mode === "forgot_password" ? "bg-primary text-on-primary shadow-[0_12px_28px_rgba(192,0,33,0.22)]" : "bg-on-surface text-white"
              }`}
            >
              {loading ? "Đang xử lý..." : mode === "login" ? "Đăng Nhập" : mode === "forgot_password" ? (forgotStep === 1 ? "Gửi mã xác nhận" : "Đổi mật khẩu") : "Đăng Ký Tài Khoản"}
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
      <span className="text-sm font-bold text-on-surface block mb-2">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-invalid={Boolean(error)}
        className={`w-full px-4 py-3 border rounded-xl text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-colors bg-white text-on-surface placeholder-secondary/70 ${
          error ? "border-error bg-error-container/30 focus:ring-error/10" : "border-outline-variant"
        }`}
      />
      {error && <p className="text-error text-xs font-semibold mt-1.5">{error}</p>}
    </label>
  );
}

function AdminProductForm({ onClose, onSave, showToast, categoriesTree, productTypes, editData }) {
  const [formData, setFormData] = useState({
    name: "", brand: "", categoryId: "", typeId: "", description: ""
  });
  const [images, setImages] = useState([]); // New file objects
  const [existingImageUrls, setExistingImageUrls] = useState([]); // Existing URLs
  const [imagePreviews, setImagePreviews] = useState([]); // Previews for new files
  const [variants, setVariants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(!!editData);

  useEffect(() => {
    if (editData) {
      api.getProductDetail(editData.id)
        .then(res => {
          setFormData({
            name: res.name || "",
            brand: res.brand || "",
            categoryId: res.categoryId || "",
            typeId: res.typeId || "",
            description: res.description || "",
          });
          if (res.productImages) {
            setExistingImageUrls(res.productImages.map(img => img.imageUrl));
          }
          if (res.productVariants) {
            setVariants(res.productVariants);
          }
        })
        .catch(err => showToast("Lỗi tải thông tin sản phẩm: " + err.message))
        .finally(() => setInitialLoading(false));
    }
  }, [editData]);

  const handleImageChange = (e) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setImages(prev => [...prev, ...filesArray]);
      
      // Create previews
      const previews = filesArray.map(file => URL.createObjectURL(file));
      setImagePreviews(prev => [...prev, ...previews]);
    }
  };

  const removeImage = (index) => {
    setImages(images.filter((_, i) => i !== index));
    setImagePreviews(imagePreviews.filter((_, i) => i !== index));
  };

  const removeExistingImage = (index) => {
    setExistingImageUrls(existingImageUrls.filter((_, i) => i !== index));
  };

  const addVariant = () => {
    setVariants([...variants, { sku: "", color: "", size: "", price: 0, stockQuantity: 0 }]);
  };

  const updateVariant = (index, field, value) => {
    const newV = [...variants];
    newV[index][field] = value;
    setVariants(newV);
  };

  const removeVariant = (index) => {
    setVariants(variants.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.categoryId) return showToast("Vui lòng chọn danh mục");
    if (!formData.typeId) return showToast("Vui lòng chọn loại sản phẩm");
    if (images.length === 0 && existingImageUrls.length === 0) return showToast("Vui lòng chọn ít nhất 1 ảnh");
    if (variants.length === 0) return showToast("Vui lòng thêm ít nhất 1 phiên bản");

    setLoading(true);
    try {
      let newUrls = [];
      if (images.length > 0) {
        newUrls = await api.uploadImages(images);
      }
      const combinedUrls = [...existingImageUrls, ...newUrls];
      const payload = { ...formData, imageUrls: combinedUrls, variants };

      if (editData) {
        await api.updateProduct(editData.id, payload);
        showToast("Cập nhật sản phẩm thành công!");
      } else {
        await api.createProduct(payload);
        showToast("Thêm sản phẩm thành công!");
      }
      onSave();
    } catch (err) {
      showToast("Lỗi: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-4xl shadow-xl my-8 relative">
        {initialLoading && (
          <div className="absolute inset-0 bg-white/80 z-10 flex items-center justify-center rounded-2xl">
            <span className="material-symbols-outlined animate-spin text-4xl text-primary">progress_activity</span>
          </div>
        )}
        <div className="flex justify-between items-center p-6 border-b border-outline-variant/50">
          <h2 className="text-xl font-bold">{editData ? "Cập Nhật Sản Phẩm" : "Thêm Sản Phẩm Mới"}</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-container-low transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="font-bold border-b pb-2">Thông tin chung</h3>
              <div>
                <label className="block text-sm font-medium mb-1">Tên sản phẩm *</label>
                <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-2 border rounded-xl outline-none focus:border-primary" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Thương hiệu *</label>
                <input required type="text" value={formData.brand} onChange={e => setFormData({...formData, brand: e.target.value})} className="w-full px-4 py-2 border rounded-xl outline-none focus:border-primary" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Danh mục *</label>
                  <select required value={formData.categoryId} onChange={e => setFormData({...formData, categoryId: e.target.value})} className="w-full px-4 py-2 border rounded-xl outline-none focus:border-primary">
                    <option value="">Chọn danh mục</option>
                    {categoriesTree.map(parent => (
                      <optgroup key={parent.id} label={parent.name}>
                        {parent.children?.map(child => (
                          <option key={child.id} value={child.id}>{child.name}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Loại sản phẩm *</label>
                  <select required value={formData.typeId} onChange={e => setFormData({...formData, typeId: e.target.value})} className="w-full px-4 py-2 border rounded-xl outline-none focus:border-primary">
                    <option value="">Chọn loại</option>
                    {productTypes.map(pt => (
                      <option key={pt.id} value={pt.id}>{pt.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Mô tả</label>
                <textarea rows="4" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-4 py-2 border rounded-xl outline-none focus:border-primary"></textarea>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-bold border-b pb-2">Hình ảnh sản phẩm *</h3>
              <div className="border-2 border-dashed border-outline-variant rounded-xl p-6 text-center hover:bg-surface-container-low transition-colors cursor-pointer relative">
                <input type="file" multiple accept="image/*" onChange={handleImageChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                <span className="material-symbols-outlined text-4xl text-secondary mb-2">cloud_upload</span>
                <p className="text-sm font-medium text-secondary">Kéo thả hoặc click để chọn ảnh</p>
              </div>
              {(imagePreviews.length > 0 || existingImageUrls.length > 0) && (
                <div className="flex gap-2 overflow-x-auto py-2">
                  {existingImageUrls.map((url, idx) => (
                    <div key={`ext-${idx}`} className="relative w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden border">
                      <img src={url} alt="existing" className="w-full h-full object-cover" />
                      <button type="button" onClick={() => removeExistingImage(idx)} className="absolute top-1 right-1 bg-error text-white rounded-full w-5 h-5 flex items-center justify-center">
                        <span className="material-symbols-outlined text-[12px]">close</span>
                      </button>
                    </div>
                  ))}
                  {imagePreviews.map((preview, idx) => (
                    <div key={`new-${idx}`} className="relative w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden border">
                      <img src={preview} alt="preview" className="w-full h-full object-cover" />
                      <button type="button" onClick={() => removeImage(idx)} className="absolute top-1 right-1 bg-error text-white rounded-full w-5 h-5 flex items-center justify-center">
                        <span className="material-symbols-outlined text-[12px]">close</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-outline-variant/50">
            <div className="flex justify-between items-center">
              <h3 className="font-bold">Các phiên bản (Kích cỡ, Màu sắc, Giá) *</h3>
              <button type="button" onClick={addVariant} className="px-3 py-1 bg-surface-container text-on-surface rounded-lg text-sm font-medium hover:bg-surface-container-highest transition-colors">
                + Thêm phiên bản
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-surface-container-low text-secondary text-left">
                  <tr>
                    <th className="p-2 font-medium">SKU</th>
                    <th className="p-2 font-medium">Màu sắc</th>
                    <th className="p-2 font-medium">Kích cỡ</th>
                    <th className="p-2 font-medium">Giá bán</th>
                    <th className="p-2 font-medium">Tồn kho</th>
                    <th className="p-2 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {variants.length === 0 && (
                    <tr><td colSpan="6" className="p-4 text-center text-secondary">Chưa có phiên bản nào</td></tr>
                  )}
                  {variants.map((v, idx) => (
                    <tr key={idx} className="border-b">
                      <td className="p-2"><input required type="text" value={v.sku} onChange={e => updateVariant(idx, 'sku', e.target.value)} className="w-full px-2 py-1 border rounded focus:border-primary outline-none" placeholder="VD: SP-01-RED" /></td>
                      <td className="p-2"><input type="text" value={v.color} onChange={e => updateVariant(idx, 'color', e.target.value)} className="w-full px-2 py-1 border rounded focus:border-primary outline-none" placeholder="Đỏ" /></td>
                      <td className="p-2"><input type="text" value={v.size} onChange={e => updateVariant(idx, 'size', e.target.value)} className="w-full px-2 py-1 border rounded focus:border-primary outline-none" placeholder="XL" /></td>
                      <td className="p-2"><input required type="number" value={v.price} onChange={e => updateVariant(idx, 'price', e.target.value)} className="w-full px-2 py-1 border rounded focus:border-primary outline-none" /></td>
                      <td className="p-2"><input required type="number" value={v.stockQuantity} onChange={e => updateVariant(idx, 'stockQuantity', e.target.value)} className="w-full px-2 py-1 border rounded focus:border-primary outline-none" /></td>
                      <td className="p-2">
                        <button type="button" onClick={() => removeVariant(idx)} className="text-error hover:bg-error/10 w-6 h-6 rounded flex items-center justify-center"><span className="material-symbols-outlined text-sm">delete</span></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-outline-variant/50">
            <button type="button" onClick={onClose} className="px-6 py-2 border rounded-full font-bold hover:bg-surface-container-low transition-colors">Hủy</button>
            <button type="submit" disabled={loading} className="px-6 py-2 bg-primary text-white rounded-full font-bold hover:bg-primary/90 transition-colors flex items-center gap-2">
              {loading && <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>}
              {loading ? "Đang lưu..." : "Lưu Sản Phẩm"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AdminProductsTab({ showToast }) {
  const [categoriesTree, setCategoriesTree] = useState([]);
  const [productTypes, setProductTypes] = useState([]);
  const [products, setProducts] = useState([]);
  const [expandedParents, setExpandedParents] = useState({});
  const [activeCategory, setActiveCategory] = useState(null); // child category ID
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editProductData, setEditProductData] = useState(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [tree, types, prods] = await Promise.all([
        api.getCategoryTree(),
        api.getProductTypes(),
        api.getAllProducts()
      ]);
      setCategoriesTree(tree);
      setProductTypes(types);
      setProducts(prods);
      
      if (tree.length > 0 && tree[0].children && tree[0].children.length > 0) {
        setExpandedParents({ [tree[0].id]: true });
        setActiveCategory(tree[0].children[0].id);
      }
    } catch (err) {
      showToast("Lỗi tải dữ liệu sản phẩm");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const toggleParent = (id) => {
    setExpandedParents(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleEditProduct = (p) => {
    setEditProductData(p);
    setIsFormOpen(true);
  };

  const handleDeleteProduct = async (id) => {
    if (window.confirm("Bạn có chắc chắn muốn xóa sản phẩm này?")) {
      try {
        await api.deleteProduct(id);
        showToast("Xóa sản phẩm thành công");
        loadData();
      } catch (err) {
        showToast("Lỗi khi xóa: " + err.message);
      }
    }
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditProductData(null);
  };

  const displayedProducts = activeCategory 
    ? products.filter(p => p.categoryId === activeCategory)
    : [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-on-surface">Quản lý Sản phẩm</h2>
        <button 
          onClick={() => setIsFormOpen(true)}
          className="btn-effect px-4 py-2 bg-primary text-white rounded-full font-bold text-sm flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-sm">add</span>
          Thêm sản phẩm mới
        </button>
      </div>

      {loading ? (
        <div className="text-center py-10">Đang tải dữ liệu...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          {/* Sidebar Danh Mục dọc */}
          <div className="bg-white rounded-2xl shadow-sm border border-outline-variant/50 overflow-hidden lg:sticky lg:top-6">
            <div className="p-4 bg-surface-container-low border-b font-bold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">category</span>
              Cây Danh Mục
            </div>
            <div className="p-2 space-y-1">
              {categoriesTree.map(parent => (
                <div key={parent.id}>
                  <button 
                    onClick={() => toggleParent(parent.id)}
                    className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-surface-container-low transition-colors font-medium text-left"
                  >
                    <span>{parent.name}</span>
                    <span className="material-symbols-outlined text-sm transition-transform" style={{ transform: expandedParents[parent.id] ? 'rotate(180deg)' : 'rotate(0)' }}>
                      expand_more
                    </span>
                  </button>
                  {expandedParents[parent.id] && (
                    <div className="pl-4 pr-2 py-1 space-y-1 border-l-2 border-outline-variant/30 ml-4 mb-2">
                      {parent.children?.length === 0 && <div className="text-xs text-secondary italic px-3 py-1">Không có danh mục con</div>}
                      {parent.children?.map(child => (
                        <button
                          key={child.id}
                          onClick={() => setActiveCategory(child.id)}
                          className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                            activeCategory === child.id ? 'bg-primary/10 text-primary font-bold' : 'text-secondary hover:bg-surface-container-low hover:text-on-surface'
                          }`}
                        >
                          {child.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Bảng Danh Sách Sản Phẩm */}
          <div className="lg:col-span-3 bg-white rounded-2xl shadow-sm border border-outline-variant/50 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-secondary uppercase bg-surface-container-low border-b border-outline-variant/60">
                  <tr>
                    <th className="px-6 py-4">Sản phẩm</th>
                    <th className="px-6 py-4">Thương hiệu</th>
                    <th className="px-6 py-4">Giá bán</th>
                    <th className="px-6 py-4">Số lượng</th>
                    <th className="px-6 py-4">Trạng thái</th>
                    <th className="px-6 py-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {!activeCategory ? (
                    <tr><td colSpan="6" className="px-6 py-10 text-center text-secondary">Vui lòng chọn danh mục con bên trái.</td></tr>
                  ) : displayedProducts.length === 0 ? (
                    <tr><td colSpan="6" className="px-6 py-10 text-center text-secondary">Chưa có sản phẩm nào trong danh mục này.</td></tr>
                  ) : displayedProducts.map(p => (
                    <tr key={p.id} className="border-b border-outline-variant/30 hover:bg-surface-container-low/50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <img src={p.imageUrl ? p.imageUrl : "https://placehold.co/100x100?text=No+Image"} alt={p.name} className="w-12 h-12 rounded object-cover border border-outline-variant/30" />
                          <div>
                            <div className="font-bold text-on-surface line-clamp-2 max-w-[250px]" title={p.name}>{p.name}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-secondary">{p.brand || '---'}</td>
                      <td className="px-6 py-4 font-medium text-primary">
                        {formatPrice(p.price)}
                      </td>
                      <td className="px-6 py-4 text-secondary font-medium">
                        {p.totalQuantity || 0}
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 rounded text-xs font-bold bg-green-100 text-green-700">Đang bán</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button onClick={() => handleEditProduct(p)} className="w-8 h-8 rounded-full hover:bg-primary/10 text-primary transition-colors inline-flex items-center justify-center mr-2">
                          <span className="material-symbols-outlined text-sm">edit</span>
                        </button>
                        <button onClick={() => handleDeleteProduct(p.id)} className="w-8 h-8 rounded-full hover:bg-error/10 text-error transition-colors inline-flex items-center justify-center">
                          <span className="material-symbols-outlined text-sm">delete</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      
      {isFormOpen && (
        <AdminProductForm 
          onClose={handleCloseForm} 
          onSave={() => { handleCloseForm(); loadData(); }} 
          showToast={showToast} 
          categoriesTree={categoriesTree} 
          productTypes={productTypes} 
          editData={editProductData}
        />
      )}
    </div>
  );
}

function AdminPage({ user, onLogout, showToast }) {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isSidebarOpen, setSidebarOpen] = useState(true);

  if (!user || user.role !== "ADMIN") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-container-low text-on-surface">
        <div className="text-center">
          <i className="ti ti-lock text-5xl text-error mb-4 block" />
          <h1 className="text-2xl font-bold mb-2">Quyền truy cập bị từ chối</h1>
          <p className="text-secondary mb-4">Bạn không có quyền quản trị viên.</p>
          <Link to="/" className="btn-effect px-6 py-2 bg-primary text-white rounded-full">Về trang chủ</Link>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return <AdminDashboardTab showToast={showToast} setActiveTab={setActiveTab} />;
      case "orders":
        return <AdminOrdersTab showToast={showToast} />;
      case "coupons":
        return <AdminCouponsTab showToast={showToast} />;
      case "users":
        return <AdminUsersTab showToast={showToast} />;
      case "products":
        return <AdminProductsTab showToast={showToast} />;
      default:
        return <AdminDashboardTab showToast={showToast} setActiveTab={setActiveTab} />;
    }
  };

  return (
    <div className="min-h-screen bg-surface-container-low flex overflow-hidden">
      {/* Sidebar */}
      <aside className={`bg-white border-r border-outline-variant/60 flex flex-col transition-all duration-300 ${isSidebarOpen ? 'w-64' : 'w-20'}`}>
        <div className="h-16 flex items-center justify-between px-4 border-b border-outline-variant/60">
          <div className={`flex items-center gap-2 overflow-hidden ${!isSidebarOpen && 'justify-center w-full'}`}>
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold italic">VP</span>
            </div>
            {isSidebarOpen && <span className="font-bold text-on-surface uppercase tracking-wider text-sm whitespace-nowrap">Admin Portal</span>}
          </div>
        </div>
        
        <nav className="flex-1 py-4 flex flex-col gap-1 px-3">
          <AdminNavItem icon="dashboard" label="Dashboard" active={activeTab === "dashboard"} onClick={() => setActiveTab("dashboard")} isSidebarOpen={isSidebarOpen} />
          <AdminNavItem icon="shopping_cart" label="Đơn hàng" active={activeTab === "orders"} onClick={() => setActiveTab("orders")} isSidebarOpen={isSidebarOpen} />
          <AdminNavItem icon="local_offer" label="Mã giảm giá" active={activeTab === "coupons"} onClick={() => setActiveTab("coupons")} isSidebarOpen={isSidebarOpen} />
          <AdminNavItem icon="group" label="Khách hàng" active={activeTab === "users"} onClick={() => setActiveTab("users")} isSidebarOpen={isSidebarOpen} />
          <AdminNavItem icon="inventory_2" label="Sản phẩm" active={activeTab === "products"} onClick={() => setActiveTab("products")} isSidebarOpen={isSidebarOpen} />
        </nav>
        
        <div className="p-4 border-t border-outline-variant/60">
          <button 
            onClick={onLogout}
            className={`flex items-center gap-3 text-error hover:bg-error/10 w-full p-2.5 rounded-xl transition-colors ${!isSidebarOpen && 'justify-center'}`}
            title="Đăng xuất"
          >
            <span className="material-symbols-outlined">logout</span>
            {isSidebarOpen && <span className="font-medium text-sm">Đăng xuất</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-b border-outline-variant/60 flex items-center justify-between px-6 z-10 shadow-sm">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="text-secondary hover:text-primary transition-colors p-1">
              <span className="material-symbols-outlined">{isSidebarOpen ? 'menu_open' : 'menu'}</span>
            </button>
            <div className="hidden md:flex items-center gap-2 bg-surface-container-low px-4 py-2 rounded-full border border-outline-variant/50 w-64 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all">
              <span className="material-symbols-outlined text-secondary text-sm">search</span>
              <input type="text" placeholder="Tìm kiếm..." className="bg-transparent border-none outline-none text-sm w-full" />
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <Link to="/" className="text-sm text-secondary hover:text-primary font-medium flex items-center gap-1">
              <span className="material-symbols-outlined text-base">storefront</span> Cửa hàng
            </Link>
            <button className="relative p-2 text-secondary hover:text-primary transition-colors">
              <span className="material-symbols-outlined">notifications</span>
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-error rounded-full"></span>
            </button>
            <div className="flex items-center gap-2 pl-4 border-l border-outline-variant/60">
              <div className="w-8 h-8 rounded-full bg-surface-variant flex items-center justify-center text-on-surface-variant font-bold">
                {user.fullName ? user.fullName.charAt(0).toUpperCase() : 'A'}
              </div>
              <div className="hidden md:block">
                <div className="text-xs font-bold text-on-surface">{user.fullName || user.username}</div>
                <div className="text-[10px] text-secondary">Quản trị viên</div>
              </div>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-4 md:p-6 lg:p-8 relative">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(192,0,33,0.03),transparent_50%)] pointer-events-none" />
          <div className="relative z-10 max-w-7xl mx-auto">
            {renderContent()}
          </div>
        </div>
      </main>
    </div>
  );
}

function AdminNavItem({ icon, label, active, onClick, isSidebarOpen }) {
  return (
    <button
      onClick={onClick}
      title={!isSidebarOpen ? label : ""}
      className={`flex items-center gap-3 w-full p-3 rounded-xl transition-all duration-200 ${
        active 
          ? "bg-primary text-white shadow-md shadow-primary/20" 
          : "text-secondary hover:bg-surface-container-highest hover:text-on-surface"
      } ${!isSidebarOpen && 'justify-center'}`}
    >
      <span className="material-symbols-outlined">{icon}</span>
      {isSidebarOpen && <span className="font-medium text-sm text-left flex-1 whitespace-nowrap overflow-hidden text-ellipsis">{label}</span>}
    </button>
  );
}

function AdminDashboardTab({ showToast, setActiveTab }) {
  const [stats, setStats] = useState({ revenue: 0, orders: 0, users: 0, activeCoupons: 0 });
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function loadData() {
      try {
        const [ordersData, usersData, couponsData] = await Promise.all([
          api.adminGetAllOrders(),
          api.adminGetAllUsers(),
          api.adminGetCoupons()
        ]);
        
        if (mounted) {
          const validOrders = ordersData.filter(o => o.status !== "CANCELLED" && o.status !== "FAILED");
          const revenue = validOrders.reduce((sum, o) => sum + o.totalAmount, 0);
          setStats({
            revenue,
            orders: ordersData.length,
            users: usersData.length,
            activeCoupons: couponsData.filter(c => c.isActive).length
          });

          // Calculate chart data (last 7 months)
          const months = [];
          const now = new Date();
          for (let i = 6; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            months.push({
              label: `T${d.getMonth() + 1}`,
              month: d.getMonth(),
              year: d.getFullYear(),
              revenue: 0
            });
          }

          validOrders.forEach(o => {
            const date = new Date(o.createdAt);
            const item = months.find(m => m.month === date.getMonth() && m.year === date.getFullYear());
            if (item) {
              item.revenue += o.totalAmount;
            }
          });

          // Normalize heights (max 100%)
          const maxRev = Math.max(...months.map(m => m.revenue), 1);
          setChartData(months.map(m => ({
            ...m,
            height: Math.max((m.revenue / maxRev) * 100, 5) // Min 5% height for visibility
          })));

          setLoading(false);
        }
      } catch (err) {
        if (mounted) {
          showToast("Lỗi khi tải dữ liệu thống kê");
          setLoading(false);
        }
      }
    }
    loadData();
    return () => { mounted = false; };
  }, []);

  if (loading) return <div className="py-10 text-center">Đang tải dữ liệu Dashboard...</div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <AdminStatCard icon="payments" color="text-green-600" bg="bg-green-100" label="Tổng doanh thu" value={formatPrice(stats.revenue)} />
        <AdminStatCard icon="shopping_cart" color="text-blue-600" bg="bg-blue-100" label="Tổng đơn hàng" value={stats.orders} />
        <AdminStatCard icon="group" color="text-purple-600" bg="bg-purple-100" label="Người dùng" value={stats.users} />
        <AdminStatCard icon="local_offer" color="text-amber-600" bg="bg-amber-100" label="Coupon hoạt động" value={stats.activeCoupons} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-outline-variant/50 p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-lg text-on-surface">Biểu đồ doanh thu</h3>
            <select className="text-sm border-outline-variant rounded-lg px-2 py-1 outline-none focus:border-primary">
              <option>7 tháng gần nhất</option>
            </select>
          </div>
          <div className="h-64 flex items-end justify-between gap-2 pt-4 border-b border-l border-outline-variant/30 pl-4 pb-2 relative">
            {/* CSS Bar Chart */}
            {chartData.map((d, i) => (
              <div key={i} className="w-full flex flex-col items-center gap-2 group relative">
                <div 
                  className="w-full bg-primary/20 hover:bg-primary rounded-t-sm transition-all duration-300 relative" 
                  style={{ height: `${d.height}%` }}
                >
                  <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-on-surface text-white text-xs py-1 px-2 rounded pointer-events-none whitespace-nowrap transition-opacity z-10">
                    {formatPrice(d.revenue)}
                  </div>
                </div>
                <span className="text-[10px] text-secondary">{d.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-outline-variant/50 p-6">
          <h3 className="font-bold text-lg text-on-surface mb-6">Thao tác nhanh</h3>
          <div className="space-y-3">
            <button onClick={() => setActiveTab('products')} className="w-full flex items-center justify-between p-3 rounded-xl border border-outline-variant hover:border-primary hover:text-primary transition-colors group">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center group-hover:bg-primary/10">
                  <span className="material-symbols-outlined">add_box</span>
                </div>
                <div className="text-sm font-medium text-left">Thêm sản phẩm mới</div>
              </div>
              <span className="material-symbols-outlined text-sm">chevron_right</span>
            </button>
            <button onClick={() => setActiveTab('coupons')} className="w-full flex items-center justify-between p-3 rounded-xl border border-outline-variant hover:border-primary hover:text-primary transition-colors group">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center group-hover:bg-primary/10">
                  <span className="material-symbols-outlined">post_add</span>
                </div>
                <div className="text-sm font-medium text-left">Tạo mã giảm giá</div>
              </div>
              <span className="material-symbols-outlined text-sm">chevron_right</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AdminStatCard({ icon, label, value, color, bg }) {
  return (
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-outline-variant/50 flex items-center gap-4 hover:-translate-y-1 transition-transform duration-300">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${bg} ${color}`}>
        <span className="material-symbols-outlined">{icon}</span>
      </div>
      <div>
        <div className="text-sm text-secondary font-medium">{label}</div>
        <div className="text-2xl font-bold text-on-surface">{value}</div>
      </div>
    </div>
  );
}

function AdminOrdersTab({ showToast }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrders();
  }, []);

  async function loadOrders() {
    try {
      setLoading(true);
      const data = await api.adminGetAllOrders();
      setOrders(data);
    } catch (err) {
      showToast(err.message || "Lỗi tải đơn hàng");
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusChange(orderId, newStatus) {
    if (!window.confirm(`Chuyển trạng thái đơn #${orderId} sang ${newStatus}?`)) return;
    try {
      await api.adminUpdateOrderStatus(orderId, newStatus, "");
      showToast("Cập nhật trạng thái thành công");
      loadOrders();
    } catch (err) {
      showToast(err.message || "Không thể cập nhật trạng thái");
    }
  }

  const getStatusBadge = (status) => {
    const map = {
      PENDING: "bg-amber-100 text-amber-700",
      CONFIRMED: "bg-blue-100 text-blue-700",
      SHIPPING: "bg-indigo-100 text-indigo-700",
      DELIVERED: "bg-green-100 text-green-700",
      FAILED: "bg-red-100 text-red-700",
      CANCELLED: "bg-gray-100 text-gray-700"
    };
    return map[status] || "bg-gray-100 text-gray-800";
  };

  const getAvailableNextStatuses = (current) => {
    switch (current) {
      case "PENDING": return ["CONFIRMED", "CANCELLED"];
      case "CONFIRMED": return ["SHIPPING"];
      case "SHIPPING": return ["DELIVERED", "FAILED"];
      default: return [];
    }
  };

  if (loading) return <div className="py-10 text-center">Đang tải danh sách đơn hàng...</div>;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-outline-variant/50 overflow-hidden">
      <div className="p-5 border-b border-outline-variant/60 flex justify-between items-center">
        <h2 className="text-xl font-bold text-on-surface">Quản lý đơn hàng</h2>
        <button onClick={loadOrders} className="p-2 text-secondary hover:text-primary transition-colors rounded-full hover:bg-surface-container">
          <span className="material-symbols-outlined">refresh</span>
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-secondary uppercase bg-surface-container-low border-b border-outline-variant/60">
            <tr>
              <th className="px-6 py-4 font-bold">Mã ĐH</th>
              <th className="px-6 py-4 font-bold">Khách hàng</th>
              <th className="px-6 py-4 font-bold">Ngày đặt</th>
              <th className="px-6 py-4 font-bold">Tổng tiền</th>
              <th className="px-6 py-4 font-bold">Trạng thái</th>
              <th className="px-6 py-4 font-bold text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => {
              const nextStatuses = getAvailableNextStatuses(order.status);
              return (
                <tr key={order.id} className="border-b border-outline-variant/30 hover:bg-surface-container-lowest transition-colors">
                  <td className="px-6 py-4 font-medium text-on-surface">#{order.id}</td>
                  <td className="px-6 py-4">
                    <div className="font-semibold">{order.fullName}</div>
                    <div className="text-xs text-secondary">{order.phoneNumber}</div>
                  </td>
                  <td className="px-6 py-4 text-secondary">{new Date(order.createdAt).toLocaleDateString("vi-VN")}</td>
                  <td className="px-6 py-4 font-bold text-primary">{formatPrice(order.totalAmount)}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${getStatusBadge(order.status)}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {nextStatuses.length > 0 ? (
                      <select 
                        className="text-xs border border-outline-variant rounded-lg px-2 py-1.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 cursor-pointer"
                        value=""
                        onChange={(e) => handleStatusChange(order.id, e.target.value)}
                      >
                        <option value="" disabled>Đổi trạng thái...</option>
                        {nextStatuses.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    ) : (
                      <span className="text-xs text-secondary italic">Đã chốt</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {orders.length === 0 && (
              <tr><td colSpan="6" className="px-6 py-10 text-center text-secondary">Chưa có đơn hàng nào</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AdminCouponsTab({ showToast }) {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  
  const [form, setForm] = useState({
    code: "", discountType: "PERCENT", discountValue: "", maxDiscountAmount: "",
    usageLimit: "", startDate: "", endDate: "", isActive: true
  });

  useEffect(() => { loadCoupons(); }, []);

  async function loadCoupons() {
    try {
      setLoading(true);
      const data = await api.adminGetCoupons();
      setCoupons(data);
    } catch (err) {
      showToast(err.message || "Lỗi tải mã giảm giá");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      const payload = {
        ...form,
        discountValue: Number(form.discountValue),
        maxDiscountAmount: form.maxDiscountAmount ? Number(form.maxDiscountAmount) : null,
        usageLimit: form.usageLimit ? Number(form.usageLimit) : null,
        startDate: form.startDate + "T00:00:00",
        endDate: form.endDate + "T23:59:59"
      };
      await api.adminCreateCoupon(payload);
      showToast("Tạo mã thành công!");
      setShowForm(false);
      loadCoupons();
    } catch (err) {
      showToast(err.message || "Lỗi tạo mã giảm giá");
    }
  }

  async function toggleStatus(id) {
    try {
      await api.adminToggleCouponStatus(id);
      loadCoupons();
    } catch (err) {
      showToast(err.message || "Lỗi cập nhật trạng thái");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-on-surface">Mã giảm giá</h2>
        <button 
          onClick={() => setShowForm(!showForm)}
          className="btn-effect px-4 py-2 bg-primary text-white rounded-full font-bold text-sm flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-sm">{showForm ? 'close' : 'add'}</span>
          {showForm ? 'Đóng form' : 'Tạo mã mới'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl shadow-sm border border-outline-variant/50">
          <h3 className="font-bold mb-4">Tạo mã giảm giá mới</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            <Input label="Mã Code" value={form.code} onChange={v => setForm({...form, code: v})} placeholder="VD: NEWBIE20" />
            <Select 
              label="Loại giảm giá" value={form.discountType} onChange={v => setForm({...form, discountType: v})}
              options={[{value: 'PERCENT', label: 'Phần trăm (%)'}, {value: 'FIXED', label: 'Số tiền cố định (₫)'}]}
            />
            <Input label="Giá trị giảm" type="number" value={form.discountValue} onChange={v => setForm({...form, discountValue: v})} />
            <Input label="Giảm tối đa (₫)" type="number" required={false} value={form.maxDiscountAmount} onChange={v => setForm({...form, maxDiscountAmount: v})} placeholder="Để trống nếu ko giới hạn" />
            <Input label="Giới hạn lượt dùng" type="number" required={false} value={form.usageLimit} onChange={v => setForm({...form, usageLimit: v})} placeholder="Để trống nếu ko giới hạn" />
            <Input label="Ngày bắt đầu" type="date" value={form.startDate} onChange={v => setForm({...form, startDate: v})} />
            <Input label="Ngày kết thúc" type="date" value={form.endDate} onChange={v => setForm({...form, endDate: v})} />
          </div>
          <button type="submit" className="px-6 py-2 bg-primary text-white rounded-full font-bold text-sm">Tạo mã</button>
        </form>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-outline-variant/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-secondary uppercase bg-surface-container-low border-b border-outline-variant/60">
              <tr>
                <th className="px-6 py-4">Mã Code</th>
                <th className="px-6 py-4">Giảm giá</th>
                <th className="px-6 py-4">Giới hạn</th>
                <th className="px-6 py-4">Thời gian</th>
                <th className="px-6 py-4">Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="5" className="px-6 py-10 text-center">Đang tải...</td></tr>
              ) : coupons.map(c => (
                <tr key={c.id} className="border-b border-outline-variant/30">
                  <td className="px-6 py-4 font-bold text-primary">{c.code}</td>
                  <td className="px-6 py-4">
                    {c.discountType === 'PERCENT' ? `${c.discountValue}%` : formatPrice(c.discountValue)}
                    {c.maxDiscountAmount && <div className="text-[10px] text-secondary">Tối đa: {formatPrice(c.maxDiscountAmount)}</div>}
                  </td>
                  <td className="px-6 py-4 text-xs">
                    Đã dùng: {c.usedCount} {c.usageLimit && `/ ${c.usageLimit}`}
                  </td>
                  <td className="px-6 py-4 text-xs text-secondary">
                    {new Date(c.startDate).toLocaleDateString("vi-VN")} - {new Date(c.endDate).toLocaleDateString("vi-VN")}
                  </td>
                  <td className="px-6 py-4">
                    <button 
                      onClick={() => toggleStatus(c.id)}
                      className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${c.isActive ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                    >
                      {c.isActive ? 'Đang bật' : 'Đang tắt'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function AdminUsersTab({ showToast }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await api.adminGetAllUsers();
        setUsers(data);
      } catch (err) {
        showToast("Lỗi tải danh sách người dùng");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-outline-variant/50 overflow-hidden">
      <div className="p-5 border-b border-outline-variant/60">
        <h2 className="text-xl font-bold text-on-surface">Danh sách khách hàng</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-secondary uppercase bg-surface-container-low border-b border-outline-variant/60">
            <tr>
              <th className="px-6 py-4 font-bold">ID</th>
              <th className="px-6 py-4 font-bold">Họ tên</th>
              <th className="px-6 py-4 font-bold">Username</th>
              <th className="px-6 py-4 font-bold">Số điện thoại</th>
              <th className="px-6 py-4 font-bold">Quyền</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="5" className="px-6 py-10 text-center">Đang tải...</td></tr>
            ) : users.map(u => (
              <tr key={u.id} className="border-b border-outline-variant/30 hover:bg-surface-container-lowest">
                <td className="px-6 py-4 text-secondary">#{u.id}</td>
                <td className="px-6 py-4 font-medium">{u.fullname || '-'}</td>
                <td className="px-6 py-4">{u.username}</td>
                <td className="px-6 py-4">{u.phoneNumber || '-'}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded text-xs font-bold ${u.role === 'ADMIN' ? 'bg-primary/10 text-primary' : 'bg-surface-container text-on-surface'}`}>
                    {u.role}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BlogPage() {
  return (
    <main className="pt-[108px] min-h-screen bg-surface-container-low">
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
          <h1 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg uppercase text-white">
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
              className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-[0_24px_70px_rgba(20,20,20,0.14)] transition-all duration-300 flex flex-col group cursor-pointer border border-outline-variant/50"
            >
              <div className="h-[240px] w-full overflow-hidden relative">
                <img
                  src={post.image}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  alt={post.title}
                />
                <div className="absolute top-4 left-4 bg-primary text-white text-[10px] font-black px-3 py-1.5 rounded-full shadow-md">
                  <span className="block">{post.tag}</span>
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
    <footer className="bg-on-surface text-[#9ca3af] pt-16 pb-8 px-margin-mobile md:px-margin-desktop border-t border-white/10">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
        <div>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center">
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
      <div className="border-t border-white/10 pt-6 text-center text-xs tracking-[0.08em]">
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

function CarouselRail({ children, className = "", ariaLabel = "Cuon danh sach san pham" }) {
  const shellRef = useRef(null);
  const [scrollState, setScrollState] = useState({
    hasOverflow: false,
    canScrollLeft: false,
    canScrollRight: false
  });

  const getRail = useCallback(() => shellRef.current?.querySelector(".carousel-scroll-rail"), []);

  const updateScrollState = useCallback(() => {
    const rail = getRail();
    if (!rail) return;

    const maxScrollLeft = Math.max(0, rail.scrollWidth - rail.clientWidth);
    const nextState = {
      hasOverflow: maxScrollLeft > 2,
      canScrollLeft: rail.scrollLeft > 2,
      canScrollRight: rail.scrollLeft < maxScrollLeft - 2
    };

    setScrollState((current) => {
      if (
        current.hasOverflow === nextState.hasOverflow &&
        current.canScrollLeft === nextState.canScrollLeft &&
        current.canScrollRight === nextState.canScrollRight
      ) {
        return current;
      }
      return nextState;
    });
  }, [getRail]);

  useEffect(() => {
    const rail = getRail();
    if (!rail) return undefined;

    updateScrollState();
    rail.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState);

    const observer = "ResizeObserver" in window ? new ResizeObserver(updateScrollState) : null;
    observer?.observe(rail);

    return () => {
      rail.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
      observer?.disconnect();
    };
  }, [getRail, updateScrollState, children]);

  function scrollRail(direction) {
    const rail = getRail();
    if (!rail) return;

    const distance = Math.max(280, rail.clientWidth * 0.82);
    rail.scrollBy({
      left: direction * distance,
      behavior: "smooth"
    });
    window.setTimeout(updateScrollState, 360);
  }

  return (
    <div ref={shellRef} className={`carousel-shell ${className}`}>
      <div className="marquee-container carousel-frame">{children}</div>
      {scrollState.hasOverflow && (
        <>
          <button
            type="button"
            className="carousel-arrow carousel-arrow-left"
            onClick={() => scrollRail(-1)}
            disabled={!scrollState.canScrollLeft}
            aria-label={`${ariaLabel} sang trai`}
          >
            <span className="material-symbols-outlined">chevron_left</span>
          </button>
          <button
            type="button"
            className="carousel-arrow carousel-arrow-right"
            onClick={() => scrollRail(1)}
            disabled={!scrollState.canScrollRight}
            aria-label={`${ariaLabel} sang phai`}
          >
            <span className="material-symbols-outlined">chevron_right</span>
          </button>
        </>
      )}
    </div>
  );
}

function SectionTitle({ title, subtitle }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8 border-l-4 border-primary pl-5">
      <div>
        <h2 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg uppercase text-on-background leading-tight">
          {title}
        </h2>
        <p className="text-on-surface-variant font-label-bold uppercase tracking-widest mt-2 text-xs md:text-sm">
          {subtitle}
        </p>
      </div>
      <Link className="font-label-bold text-label-bold text-primary hover:text-on-surface flex items-center gap-2 transition-colors" to={SPORTS.badminton.route}>
        XEM TẤT CẢ
        <span className="material-symbols-outlined text-sm">open_in_new</span>
      </Link>
    </div>
  );
}

function Stat({ value, label }) {
  return (
    <div className="stat-card min-w-[104px] rounded-2xl bg-white/10 border border-white/20 px-4 py-3 text-center backdrop-blur-md shadow-[0_12px_34px_rgba(0,0,0,0.24)]">
      <div className="font-stats-display text-stats-display text-white">
        {value}
      </div>
      <div className="text-[10px] text-white/80 mt-1 uppercase tracking-wider font-semibold">{label}</div>
    </div>
  );
}

function LoadingBlock({ text }) {
  return (
    <div className="flex items-center justify-center py-20 text-secondary w-full bg-white/60 rounded-2xl border border-outline-variant/50">
      <span className="material-symbols-outlined text-5xl text-outline-variant block mr-3 animate-pulse">
        hourglass_top
      </span>
      <span>{text}</span>
    </div>
  );
}

function EmptyBlock({ text, compact = false }) {
  return (
    <div
      className={`text-center text-secondary bg-white/70 rounded-2xl border border-outline-variant/60 ${compact ? "py-8 px-4" : "py-16 px-6"}`}
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
      <span className="text-sm font-bold text-on-surface block mb-2">{label}</span>
      <input
        type={type}
        value={value}
        required={required}
        onChange={(event) => onChange(event.target.value)}
        className="w-full px-4 py-3 border border-outline-variant rounded-xl text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-colors bg-white"
      />
    </label>
  );
}

function Textarea({ label, value, onChange, placeholder = "" }) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-on-surface block mb-2">{label}</span>
      <textarea
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="w-full px-4 py-3 border border-outline-variant rounded-xl text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-colors bg-white min-h-[100px]"
      />
    </label>
  );
}

function Select({ label, value, onChange, options }) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-on-surface block mb-2">{label}</span>
      <select
        value={value}
        required
        onChange={(event) => onChange(event.target.value)}
        className="w-full px-4 py-3 border border-outline-variant rounded-xl text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-colors bg-white"
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
