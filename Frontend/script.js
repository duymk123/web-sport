
// ===== CONSTANTS =====
const API_BASE = 'http://localhost:8080/api/v1';
const PRODUCTS_URL = API_BASE + '/products';
const CATEGORIES_URL = API_BASE + '/categories';
const PRODUCT_TYPES_URL = API_BASE + '/product-type';
let ALL_API_PRODUCTS = [];
let PRODUCTS = { badminton: [], football: [], pickleball: [] };

// SUB_CATS sẽ được build động từ API /categories/tree, không hard-code
let SUB_CATS = {
  badminton: ['Tất cả'],
  football: ['Tất cả'],
  pickleball: ['Tất cả']
};
const BRANDS = {
  badminton: ['Yonex', 'Victor', 'Li-Ning'],
  football: ['Nike', 'Adidas', 'Puma'],
  pickleball: ['Selkirk', 'Joola', 'Passion', 'Dill', 'Penn', 'K-Swiss']
};
const SPORT_TITLE = { badminton: 'Cầu lông', football: 'Bóng đá', pickleball: 'Pickleball' };

// Category IDs sẽ được map động từ API /categories/tree
// Dùng slug để xác định sport
const SPORT_SLUGS = {
  badminton: 'cau-long',
  football: 'bong-da',
  pickleball: 'pickleball'
};

// Mapping động - sẽ được điền sau khi load categories
let SPORT_CAT_IDS = {
  badminton: [],
  football: [],
  pickleball: []
};
let CAT_ID_TO_SUB = {};
let CAT_SLUG_TO_SPORT = {}; // slug => sport key

let currentSport = 'badminton';
let currentSub = 'Tất cả';
let cart = [];
let wishlist = new Set();

// ===== NAVIGATION =====
function scrollToSection(id) {
  const el = document.getElementById(id);
  if (el) {
    const navH = document.getElementById('main-nav').offsetHeight;
    window.scrollTo({ top: el.offsetTop - navH, behavior: 'smooth' });
  }
}

// Auto-hide header on scroll
let lastScrollTop = 0;
window.addEventListener('scroll', () => {
  const st = window.scrollY;
  const nav = document.getElementById('main-nav');
  if (st > lastScrollTop && st > 200) {
    nav.classList.add('nav-hidden');
  } else {
    nav.classList.remove('nav-hidden');
  }
  lastScrollTop = st <= 0 ? 0 : st;
}, false);

// ===== SPORT TABS (kept for internal use) =====
function selectSport(sport) { currentSport = sport; }

// ===== MAP API PRODUCT =====
// ProductListResponse trả về: id, name, brand, categoryId (Long), typeId, price (Double), imageUrl (String)
function mapProduct(p) {
  // API trả về field phẳng categoryId, không phải category.id
  const catId = p.categoryId || (p.category ? p.category.id : null);
  let subCat = CAT_ID_TO_SUB[catId] || 'Tất cả';

  // Đoán subCat từ tên sản phẩm nếu cần
  if (p.name) {
    const n = p.name.toLowerCase();
    if (subCat === 'Phụ kiện' && n.includes('cầu') && !n.includes('túi') && !n.includes('balo') && !n.includes('bao') && !n.includes('cước') && !n.includes('quấn')) {
      subCat = 'Cầu lông';
    }
    if (subCat === 'Phụ kiện' && n.includes('bóng')) {
      subCat = 'Bóng Pickleball';
    }
  }

  // Price từ API là Double trong ProductListResponse
  const apiPrice = p.price != null ? parseFloat(p.price) : 0;

  return {
    id: p.id,
    name: p.name || '',
    brand: p.brand || '',
    desc: p.description || '',
    price: apiPrice,
    imageUrl: p.imageUrl || null,
    oldPrice: null,
    icon: guessCatIcon(catId),
    rating: (3.5 + Math.random() * 1.5).toFixed(1) * 1,
    reviews: Math.floor(Math.random() * 50 + 5),
    badge: Math.random() > 0.7 ? ['new','hot','sale'][Math.floor(Math.random()*3)] : '',
    cat: subCat,
    catId: catId,
    variants: p.variants || [],
    specifications: p.specifications || ''
  };
}

// Icon theo catId thay vì category object
function guessCatIcon(catId) {
  const name = (CAT_ID_TO_SUB[catId] || '').toLowerCase();
  if (name.includes('vợt')) return 'ti-device-gamepad-2';
  if (name.includes('giày')) return 'ti-shoe';
  if (name.includes('quần áo')) return 'ti-shirt';
  if (name.includes('bóng')) return 'ti-circle';
  if (name.includes('phụ kiện')) return 'ti-backpack';
  return 'ti-tag';
}

function guessIcon(cat) {
  if (!cat) return 'ti-tag';
  const slug = (cat.slug || '').toLowerCase();
  const name = (cat.name || '').toLowerCase();
  if (slug.includes('vot') || name.includes('vợt')) return 'ti-device-gamepad-2';
  if (slug.includes('giay') || name.includes('giày')) return 'ti-shoe';
  if (slug.includes('quan-ao') || name.includes('quần áo')) return 'ti-shirt';
  if (slug.includes('bong') || name.includes('bóng')) return 'ti-circle';
  if (slug.includes('phu-kien') || name.includes('phụ kiện')) return 'ti-backpack';
  return 'ti-tag';
}

// ===== LOAD CATEGORIES FROM API =====
async function loadCategories() {
  try {
    // Lấy cây danh mục: Cầu lông | Bóng đá | Pickleball (parent_id = null)
    const res = await fetch(CATEGORIES_URL + '/tree');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const tree = await res.json(); // Array<Category> với children

    // Reset
    SPORT_CAT_IDS = { badminton: [], football: [], pickleball: [] };
    CAT_ID_TO_SUB = {};
    CAT_SLUG_TO_SPORT = {};

    const slugToSportKey = {
      'cau-long': 'badminton',
      'bong-da': 'football',
      'pickleball': 'pickleball'
    };

    tree.forEach(parent => {
      const sportKey = slugToSportKey[parent.slug];
      if (!sportKey) return;

      // Thêm parent id vào sport
      SPORT_CAT_IDS[sportKey].push(parent.id);
      CAT_ID_TO_SUB[parent.id] = 'Tất cả';
      CAT_SLUG_TO_SPORT[parent.slug] = sportKey;

      // Reset SUB_CATS rồi build lại hoàn toàn từ API (không hard-code)
      SUB_CATS[sportKey] = ['Tất cả'];

      // Thêm children
      (parent.children || []).forEach(child => {
        SPORT_CAT_IDS[sportKey].push(child.id);
        CAT_ID_TO_SUB[child.id] = child.name;
        CAT_SLUG_TO_SPORT[child.slug] = sportKey;
        // Chỉ push nếu chưa có
        if (!SUB_CATS[sportKey].includes(child.name)) {
          SUB_CATS[sportKey].push(child.name);
        }
      });
    });
    console.log('Categories loaded:', SPORT_CAT_IDS);
  } catch (err) {
    console.warn('Không tải được categories, dùng ID mặc định:', err);
    // Fallback với ID cố định nếu API lỗi
    SPORT_CAT_IDS = {
      badminton: [1, 4, 5, 6, 7],
      football: [2, 8, 9, 10, 11],
      pickleball: [3, 12, 13, 14, 15]
    };
    CAT_ID_TO_SUB = {
      4: 'Quần áo', 5: 'Giày', 6: 'Vợt cầu lông', 7: 'Phụ kiện',
      8: 'Quần áo', 9: 'Giày đá bóng', 10: 'Bóng đá', 11: 'Phụ kiện',
      12: 'Quần áo', 13: 'Giày', 14: 'Vợt Pickleball', 15: 'Phụ kiện',
      1: 'Tất cả', 2: 'Tất cả', 3: 'Tất cả'
    };
  }
}

// ===== CART =====
function addToCart(id, size = null) {
  const all = Object.values(PRODUCTS).flat();
  const p = all.find(x => x.id === id);
  if (!p) return;
  const existing = cart.find(c => c.id === id && c.size === size);
  if (existing) {
    existing.qty++;
  } else {
    cart.push({ ...p, qty: 1, size: size });
  }
  updateCartBadge();
  showToast(`Đã thêm "${p.name}" ${size ? '(Size: ' + size + ')' : ''} vào giỏ hàng`);
}

function updateCartBadge() {
  document.getElementById('cartBadge').textContent = cart.reduce((s, c) => s + c.qty, 0);
}

function openCart() {
  document.getElementById('cartOverlay').classList.add('open');
  document.getElementById('cartPanel').classList.add('open');
  renderCart();
}
function closeCart() {
  document.getElementById('cartOverlay').classList.remove('open');
  document.getElementById('cartPanel').classList.remove('open');
}

function renderCart() {
  const items = document.getElementById('cartItems');
  const footer = document.getElementById('cartFooter');
  if (!cart.length) {
    items.innerHTML = `<div class="text-center py-12 text-secondary">
      <span class="material-symbols-outlined text-5xl text-outline-variant block mb-3">shopping_cart</span>
      <p class="font-semibold text-on-surface">Giỏ hàng trống</p>
      <p class="text-sm mt-1">Thêm sản phẩm yêu thích vào giỏ!</p>
    </div>`;
    footer.innerHTML = '';
    return;
  }
  items.innerHTML = cart.map((p, i) => `
    <div class="flex gap-3 py-3 border-b border-outline-variant/50">
      <div class="w-16 h-16 bg-surface-container rounded-lg flex items-center justify-center flex-shrink-0">
        <i class="ti ${p.icon} text-2xl text-outline-variant"></i>
      </div>
      <div class="flex-1 min-w-0">
        <div class="text-sm font-semibold text-on-surface truncate">${p.name}</div>
        <div class="text-xs text-secondary">${p.brand} ${p.size ? '<span class="ml-2 font-bold text-primary">Size: ' + p.size + '</span>' : ''}</div>
        <div class="text-sm font-bold text-primary mt-1">${(p.price * p.qty).toLocaleString('vi-VN')}₫</div>
        <div class="flex items-center gap-2 mt-2">
          <button class="w-7 h-7 border border-outline-variant rounded flex items-center justify-center text-sm hover:bg-surface-container" onclick="changeQty(${i},-1)">−</button>
          <span class="text-sm font-semibold w-6 text-center">${p.qty}</span>
          <button class="w-7 h-7 border border-outline-variant rounded flex items-center justify-center text-sm hover:bg-surface-container" onclick="changeQty(${i},1)">+</button>
        </div>
      </div>
      <button class="text-secondary hover:text-error self-start mt-1" onclick="removeItem(${i})"><i class="ti ti-trash text-lg"></i></button>
    </div>
  `).join('');
  const subtotal = cart.reduce((s, c) => s + c.price * c.qty, 0);
  const ship = subtotal >= 500000 ? 0 : 30000;
  footer.innerHTML = `
    <div class="flex justify-between text-sm text-secondary mb-1"><span>Tạm tính</span><span>${subtotal.toLocaleString('vi-VN')}₫</span></div>
    <div class="flex justify-between text-sm text-secondary mb-3"><span>Phí vận chuyển</span><span>${ship === 0 ? '<span class="text-primary font-semibold">Miễn phí</span>' : ship.toLocaleString('vi-VN') + '₫'}</span></div>
    <div class="flex justify-between text-lg font-bold mb-4"><span class="text-on-surface">Tổng cộng</span><span class="text-primary">${(subtotal + ship).toLocaleString('vi-VN')}₫</span></div>
    <button class="w-full py-3.5 bg-primary text-on-primary rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-surface-tint transition-colors" onclick="openCheckoutModal()">
      <span class="material-symbols-outlined">credit_card</span> Thanh toán ngay
    </button>
  `;
}

function changeQty(i, delta) { cart[i].qty = Math.max(1, cart[i].qty + delta); updateCartBadge(); renderCart(); }
function removeItem(i) { cart.splice(i, 1); updateCartBadge(); renderCart(); }

// ===== WISHLIST =====
function toggleWishlist(id, btn) {
  if (wishlist.has(id)) { wishlist.delete(id); if(btn) btn.classList.remove('active'); showToast('Đã xóa khỏi yêu thích'); }
  else { wishlist.add(id); if(btn) btn.classList.add('active'); showToast('Đã thêm vào yêu thích'); }
}
function openWishlistModal() {
  document.getElementById('wishlistModal').classList.add('open');
  renderWishlistItems();
}
function closeWishlistModal() {
  document.getElementById('wishlistModal').classList.remove('open');
}
function renderWishlistItems() {
  const container = document.getElementById('wishlistItems');
  const all = Object.values(PRODUCTS).flat();
  const items = all.filter(p => wishlist.has(p.id));
  if (!items.length) {
    container.innerHTML = `<div class="text-center py-12 text-secondary">
      <span class="material-symbols-outlined text-5xl text-outline-variant block mb-3">favorite_border</span>
      <p class="font-semibold text-on-surface">Danh sách trống</p>
    </div>`;
    return;
  }
  container.innerHTML = items.map(p => `
    <div class="flex gap-4 p-4 border border-outline-variant rounded-xl mb-3 items-center">
      <div class="w-16 h-16 bg-surface-container rounded-lg flex items-center justify-center flex-shrink-0">
        <i class="ti ${p.icon} text-2xl text-outline-variant"></i>
      </div>
      <div class="flex-1 min-w-0">
        <div class="text-sm font-bold text-on-surface truncate">${p.name}</div>
        <div class="text-xs text-secondary mt-1">${p.brand}</div>
        <div class="text-sm font-bold text-primary mt-1">${p.price.toLocaleString('vi-VN')}₫</div>
      </div>
      <div class="flex gap-2">
        <button class="btn-effect px-3 py-1.5 bg-primary text-white text-xs font-bold rounded-lg" onclick="closeWishlistModal();openProductDetail(${p.id})">Xem</button>
        <button class="btn-effect px-3 py-1.5 bg-surface-variant text-on-surface text-xs font-bold rounded-lg" onclick="toggleWishlist(${p.id});renderWishlistItems()">Xoá</button>
      </div>
    </div>
  `).join('');
}
function toggleWishlistView() { openWishlistModal(); }

// ===== PRODUCT DETAIL (gọi API GET /products/{id}) =====
async function openProductDetail(id) {
  const modal = document.getElementById('detailModal');
  const content = document.getElementById('detailModalContent');

  // Hiển loading
  content.innerHTML = `
    <div class="flex items-center justify-center min-h-[400px]">
      <div class="text-center text-secondary">
        <span class="material-symbols-outlined text-5xl text-outline-variant block mb-3 animate-spin">progress_activity</span>
        <p class="text-sm">Đang tải chi tiết sản phẩm...</p>
      </div>
    </div>`;
  modal.classList.add('open');

  try {
    // Gọi API GET /api/v1/products/{id} → ProductDetailResponse
    const res = await fetch(PRODUCTS_URL + '/' + id);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const p = await res.json();

    // ProductDetailResponse: id, name, brand, categoryId, typeId, description,
    // specification (Map), status, productVariants [{id,sku,color,size,price,stockQuantity}],
    // productImages [{id,imageUrl}]
    const variants = p.productVariants || [];
    const images = p.productImages || [];
    const icon = guessCatIcon(p.categoryId);

    // Hình ảnh: dùng ảnh thật nếu có, fallback về icon
    const imageHtml = images.length > 0
      ? `<img src="${images[0].imageUrl}" alt="${p.name}" class="w-full h-full object-cover product-img"
           onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
         <div style="display:none" class="absolute inset-0 flex items-center justify-center">
           <i class="ti ${icon}" style="font-size:100px;color:#d8c2c0"></i>
         </div>`
      : `<i class="ti ${icon}" style="font-size:100px;color:#d8c2c0"></i>`;

    // Thumbnail gallery
    const galleryHtml = images.length > 1
      ? `<div class="flex gap-2 mt-3 px-4 pb-2 overflow-x-auto">
          ${images.map((img, i) => `
            <img src="${img.imageUrl}" alt="${p.name} ${i+1}"
              class="w-14 h-14 object-cover rounded-lg border-2 cursor-pointer flex-shrink-0
                ${i===0 ? 'border-primary' : 'border-outline-variant hover:border-primary'} transition-colors"
              onclick="switchDetailImage('${img.imageUrl}', this)">`
          ).join('')}
         </div>` : '';

    // Variants: group theo size, hiển thị giá và tồn kho theo variant được chọn
    const variantMap = {}; // size -> variant object
    variants.forEach(v => {
      if (v.size) variantMap[v.size] = v;
    });
    const uniqueSizes = Object.keys(variantMap);

    let variantsHtml = '';
    if (uniqueSizes.length > 0) {
      variantsHtml = `
        <div class="mb-4">
          <div class="text-sm font-bold text-on-surface mb-2">CHỌN KÍCH CỠ <span class="text-error">*</span></div>
          <div class="flex flex-wrap gap-2" id="detailSizeOptions">
            ${uniqueSizes.map(s => {
              const v = variantMap[s];
              const inStock = v.stockQuantity > 0;
              return `<button
                class="px-3 py-2 border rounded-lg text-sm transition-colors focus:outline-none flex flex-col items-center min-w-[56px]
                  ${inStock ? 'border-outline-variant hover:border-primary cursor-pointer' : 'border-outline-variant opacity-40 cursor-not-allowed'}"
                onclick="${inStock ? `selectDetailVariant(this,'${s}',${v.price},${v.stockQuantity})` : ''}"
                data-size="${s}" data-price="${v.price}" data-stock="${v.stockQuantity}" ${!inStock ? 'disabled' : ''}>
                <span class="font-semibold">${s}</span>
                ${!inStock ? '<span class="text-[9px] text-secondary">Hết</span>' : ''}
              </button>`;
            }).join('')}
          </div>
          <div id="detailVariantInfo" class="mt-3 text-sm text-secondary hidden">
            <span class="material-symbols-outlined text-sm align-middle text-primary">inventory_2</span>
            <span id="detailStockText"></span>
          </div>
        </div>`;
    }

    // Giá khởi tạo (variant đầu tiên nếu có)
    const basePrice = variants.length > 0 ? parseFloat(variants[0].price) : 0;

    // Specification
    let specsHtml = '';
    if (p.specification && Object.keys(p.specification).length > 0) {
      specsHtml = `<div class="mb-4 p-3 bg-surface-container-low rounded-xl">
        <div class="text-xs font-bold text-secondary uppercase tracking-wider mb-2">Thông số kỹ thuật</div>
        <div class="grid grid-cols-2 gap-1.5">
          ${Object.entries(p.specification).map(([k,v]) =>
            `<div class="text-xs"><span class="text-secondary">${k}:</span> <span class="font-medium text-on-surface">${v}</span></div>`
          ).join('')}
        </div>
      </div>`;
    }

    // Trạng thái
    const statusBadge = p.status === 'INACTIVE'
      ? `<span class="text-xs bg-error/10 text-error px-2 py-0.5 rounded-full font-medium">Ngừng kinh doanh</span>`
      : `<span class="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Còn hàng</span>`;

    window.currentSelectedSize = null;
    window.currentSelectedProductId = id;
    window.currentProductHasSize = uniqueSizes.length > 0;
    window.currentDetailProduct = p;
    window.currentVariantMap = variantMap;
    window.currentDetailBasePrice = basePrice;

    content.innerHTML = `
      <button class="absolute top-4 right-4 w-9 h-9 bg-surface-container rounded-full flex items-center justify-center
        text-secondary hover:text-on-surface hover:bg-outline-variant transition-all z-10" onclick="closeProductDetail()">
        <span class="material-symbols-outlined">close</span>
      </button>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-0">
        <!-- Hình ảnh -->
        <div class="bg-surface-container flex flex-col rounded-tl-2xl md:rounded-bl-2xl overflow-hidden">
          <div class="flex-1 flex items-center justify-center min-h-[280px] md:min-h-[380px] relative overflow-hidden">
            ${imageHtml}
          </div>
          ${galleryHtml}
        </div>
        <!-- Thông tin -->
        <div class="p-6 md:p-8 flex flex-col overflow-y-auto max-h-[90vh] md:max-h-[none]">
          <div class="flex items-center gap-2 mb-1">
            <span class="text-xs font-semibold text-secondary uppercase tracking-widest">${p.brand || ''}</span>
            ${statusBadge}
          </div>
          <h2 class="text-xl md:text-2xl font-bold text-on-surface leading-tight mb-3">${p.name}</h2>
          <div id="detailPriceDisplay" class="flex items-center gap-3 mb-4">
            <span class="text-2xl font-bold text-primary" id="detailPriceMain">${basePrice > 0 ? basePrice.toLocaleString('vi-VN') + '₫' : 'Liên hệ'}</span>
          </div>
          <p class="text-sm text-secondary leading-relaxed mb-4">${p.description || ''}</p>
          ${specsHtml}
          ${variantsHtml}
          <div class="mt-auto pt-4 flex gap-2">
            <button id="btnBuyNow"
              class="btn-effect flex-1 py-3 ${uniqueSizes.length > 0 ? 'bg-surface-variant text-secondary cursor-not-allowed' : 'bg-on-surface text-white hover:bg-primary'}
              rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-colors"
              onclick="confirmBuyNow()" ${uniqueSizes.length > 0 ? 'disabled' : ''}>
              <span class="material-symbols-outlined text-base">bolt</span>
              ${uniqueSizes.length > 0 ? 'Chọn Size' : 'Mua ngay'}
            </button>
            <button id="btnConfirmAddToCart"
              class="btn-effect flex-1 py-3 ${uniqueSizes.length > 0 ? 'bg-surface-variant text-secondary cursor-not-allowed' : 'bg-primary text-on-primary hover:bg-surface-tint'}
              rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-colors"
              onclick="confirmAddToCart()" ${uniqueSizes.length > 0 ? 'disabled' : ''}>
              <i class="ti ti-shopping-cart-plus"></i>
              ${uniqueSizes.length > 0 ? 'Thêm vào giỏ' : 'Thêm vào giỏ'}
            </button>
          </div>
        </div>
      </div>`;

  } catch(err) {
    content.innerHTML = `
      <div class="flex flex-col items-center justify-center min-h-[400px] p-8 text-center">
        <span class="material-symbols-outlined text-5xl text-error/40 mb-4">error</span>
        <p class="font-semibold text-on-surface mb-1">Không tải được sản phẩm</p>
        <p class="text-sm text-secondary">${err.message}</p>
        <button class="mt-4 px-4 py-2 bg-primary text-white rounded-lg text-sm" onclick="closeProductDetail()">Đóng</button>
      </div>`;
  }
}

// Chuyển ảnh trong gallery
function switchDetailImage(url, thumbEl) {
  const mainImg = document.querySelector('#detailModalContent img:not([onclick])');
  if (mainImg) mainImg.src = url;
  document.querySelectorAll('#detailModalContent img[onclick]').forEach(el => {
    el.classList.remove('border-primary');
    el.classList.add('border-outline-variant');
  });
  thumbEl.classList.add('border-primary');
  thumbEl.classList.remove('border-outline-variant');
}

// Chọn variant theo size - cập nhật giá và tồn kho
function selectDetailVariant(btn, size, price, stock) {
  // Highlight button
  document.querySelectorAll('#detailSizeOptions button').forEach(b => {
    b.classList.remove('border-primary', 'bg-primary/10', 'text-primary', 'font-semibold');
    b.classList.add('border-outline-variant');
  });
  btn.classList.remove('border-outline-variant');
  btn.classList.add('border-primary', 'bg-primary/10', 'text-primary', 'font-semibold');

  window.currentSelectedSize = size;

  // Cập nhật hiển thị giá
  const priceEl = document.getElementById('detailPriceMain');
  if (priceEl) priceEl.textContent = parseFloat(price).toLocaleString('vi-VN') + '₫';

  // Hiển thị tồn kho
  const infoEl = document.getElementById('detailVariantInfo');
  const stockText = document.getElementById('detailStockText');
  if (infoEl && stockText) {
    infoEl.classList.remove('hidden');
    if (stock > 10) {
      stockText.innerHTML = `<span class="text-green-600 font-medium">Còn ${stock} sản phẩm</span>`;
    } else if (stock > 0) {
      stockText.innerHTML = `<span class="text-amber-600 font-medium">Chỉ còn ${stock} sản phẩm — đặt ngay!</span>`;
    } else {
      stockText.innerHTML = `<span class="text-error font-medium">Hết hàng</span>`;
    }
  }

  // Enable nút thêm giỏ và mua ngay
  const addBtn = document.getElementById('btnConfirmAddToCart');
  if (addBtn) {
    addBtn.disabled = false;
    addBtn.className = 'btn-effect flex-1 py-3 bg-primary text-on-primary hover:bg-surface-tint rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-colors';
    addBtn.innerHTML = '<i class="ti ti-shopping-cart-plus"></i> Thêm vào giỏ';
  }
  const buyBtn = document.getElementById('btnBuyNow');
  if (buyBtn) {
    buyBtn.disabled = false;
    buyBtn.className = 'btn-effect flex-1 py-3 bg-on-surface text-white hover:bg-primary rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-colors';
    buyBtn.innerHTML = '<span class="material-symbols-outlined text-base">bolt</span> Mua ngay';
  }
}

function confirmAddToCart() {
  if (window.currentProductHasSize && !window.currentSelectedSize) {
    showToast('Vui lòng chọn Kích cỡ trước khi thêm vào giỏ!');
    return;
  }
  addToCart(window.currentSelectedProductId, window.currentSelectedSize);
  closeProductDetail();
}

function confirmBuyNow() {
  if (window.currentProductHasSize && !window.currentSelectedSize) {
    showToast('Vui lòng chọn Kích cỡ trước khi mua!');
    return;
  }
  addToCart(window.currentSelectedProductId, window.currentSelectedSize);
  closeProductDetail();
  
  // Check if user is logged in
  if (!localStorage.getItem('isLoggedIn')) {
    sessionStorage.setItem('pendingCheckout', 'true');
    openLoginPage();
  } else {
    // Go directly to checkout
    setTimeout(openCheckoutPage, 300);
  }
}
function closeProductDetail() { document.getElementById('detailModal').classList.remove('open'); }
document.getElementById('detailModal')?.addEventListener('click', function(e) { if (e.target === this) closeProductDetail(); });

// ===== MODALS =====
function openCheckoutModal() {
  if (!cart.length) { showToast('Giỏ hàng đang trống!'); return; }
  document.getElementById('checkoutModal').classList.add('open');
}
function closeCheckoutModal() { document.getElementById('checkoutModal').classList.remove('open'); }

function toggleAddressType(type) {
  const isOther = type === 'other';
  const nameInput = document.getElementById('checkoutName');
  const phoneInput = document.getElementById('checkoutPhone');
  const addrInput = document.getElementById('checkoutAddress');
  const overlay = document.getElementById('defaultAddressOverlay');
  
  if (isOther) {
    nameInput.disabled = false;
    phoneInput.disabled = false;
    addrInput.disabled = false;
    overlay.style.display = 'none';
    
    // Clear values for user to enter new address
    if (nameInput.value === 'Nguyễn Văn Khách') nameInput.value = '';
    if (phoneInput.value === '0988123456') phoneInput.value = '';
    if (addrInput.value === '123 Cầu Giấy, Quận Cầu Giấy, Hà Nội') addrInput.value = '';
  } else {
    nameInput.disabled = true;
    phoneInput.disabled = true;
    addrInput.disabled = true;
    overlay.style.display = 'block';
    
    // Restore default values
    nameInput.value = 'Nguyễn Văn Khách';
    phoneInput.value = '0988123456';
    addrInput.value = '123 Cầu Giấy, Quận Cầu Giấy, Hà Nội';
  }
}
document.getElementById('checkoutModal')?.addEventListener('click', function(e) { if (e.target === this) closeCheckoutModal(); });

function openUserModal(tab = 'login') {
  if (tab === 'register') {
    window.location.href = 'login.html?tab=register';
  } else {
    window.location.href = 'login.html';
  }
}

// ===== LOGIN PAGE FUNCTIONS =====
let currentUser = null;

function openLoginPage() {
  window.location.href = 'login.html';
}

function closeLoginPage() {
  document.getElementById('loginPage').style.display = 'none';
  document.getElementById('mainContent').style.display = 'block';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function switchLoginTab(tab) {
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const loginTab = document.getElementById('loginTab');
  const registerTab = document.getElementById('registerTab');
  
  if (tab === 'login') {
    loginForm.style.display = 'block';
    registerForm.style.display = 'none';
    loginTab.classList.add('border-primary', 'text-primary');
    loginTab.classList.remove('border-transparent', 'text-secondary');
    registerTab.classList.add('border-transparent', 'text-secondary');
    registerTab.classList.remove('border-primary', 'text-primary');
  } else {
    loginForm.style.display = 'none';
    registerForm.style.display = 'block';
    registerTab.classList.add('border-primary', 'text-primary');
    registerTab.classList.remove('border-transparent', 'text-secondary');
    loginTab.classList.add('border-transparent', 'text-secondary');
    loginTab.classList.remove('border-primary', 'text-primary');
  }
}

function handleLogin() {
  const username = document.getElementById('loginUsername').value.trim();
  const password = document.getElementById('loginPassword').value;
  
  if (!username || !password) {
    showToast('Vui lòng điền đầy đủ thông tin!');
    return;
  }
  
  // Mock authentication
  if (username === 'admin' && password === 'admin123') {
    isAdmin = true;
    document.getElementById('adminNavBtn')?.classList.remove('hidden');
  }
  
  // Set user info
  currentUser = {
    username: username,
    name: username,
    phone: '',
    address: ''
  };
  localStorage.setItem('isLoggedIn', 'true');
  localStorage.setItem('currentUser', JSON.stringify(currentUser));
  
  showToast('Đăng nhập thành công!');
  
  // If user was trying to buy, go to checkout
  if (window.pendingCheckout) {
    window.pendingCheckout = false;
    setTimeout(openCheckoutPage, 500);
  } else {
    closeLoginPage();
  }
}

function handleRegister() {
  const username = document.getElementById('registerUsername').value.trim();
  const password = document.getElementById('registerPassword').value;
  const name = document.getElementById('registerName').value.trim();
  const phone = document.getElementById('registerPhone').value.trim();
  const agreeTerms = document.getElementById('agreeTerms').checked;
  
  if (!username || !name || !phone || !password) {
    showToast('Vui lòng điền đầy đủ thông tin!');
    return;
  }
  
  if (password.length < 6) {
    showToast('Mật khẩu phải có ít nhất 6 ký tự!');
    return;
  }
  
  if (!agreeTerms) {
    showToast('Vui lòng chấp nhận điều khoản!');
    return;
  }
  
  // Register user
  currentUser = { username, name, phone };
  localStorage.setItem('isLoggedIn', 'true');
  localStorage.setItem('currentUser', JSON.stringify(currentUser));
  
  showToast('Đăng ký thành công!');
  
  // Switch to login tab and fill username
  switchLoginTab('login');
  document.getElementById('loginUsername').value = username;
  document.getElementById('loginPassword').value = '';
}

// ===== CHECKOUT PAGE FUNCTIONS =====
function openCheckoutPage() {
  if (!localStorage.getItem('isLoggedIn')) {
    sessionStorage.setItem('pendingCheckout', 'true');
    openLoginPage();
    return;
  }
  
  if (!cart.length) {
    showToast('Giỏ hàng đang trống!');
    return;
  }
  
  document.getElementById('mainContent').style.display = 'none';
  document.getElementById('sportPage').style.display = 'none';
  document.getElementById('loginPage').style.display = 'none';
  document.getElementById('checkoutPage').style.display = 'block';
  window.scrollTo({ top: 0, behavior: 'smooth' });
  
  // Populate user info
  const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
  document.getElementById('checkoutName').value = user.name || '';
  document.getElementById('checkoutPhone').value = user.phone || '';
  document.getElementById('checkoutAddress').value = user.address || '';
  
  // Render cart items
  renderCheckoutCart();
  
  // Calculate totals
  calculateCheckoutTotals();
  
  // Add event listeners for shipping method changes
  document.querySelectorAll('input[name="shipping"]').forEach(radio => {
    radio.addEventListener('change', calculateCheckoutTotals);
  });
}

function closeCheckoutPage() {
  document.getElementById('checkoutPage').style.display = 'none';
  document.getElementById('mainContent').style.display = 'block';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderCheckoutCart() {
  const container = document.getElementById('checkoutCartItems');
  if (!cart.length) {
    container.innerHTML = '<p class="text-sm text-secondary text-center py-8">Giỏ hàng trống</p>';
    return;
  }
  
  container.innerHTML = cart.map((item, i) => `
    <div class="flex gap-3 pb-3">
      <div class="w-12 h-12 bg-surface-container rounded-lg flex items-center justify-center flex-shrink-0">
        <span class="material-symbols-outlined text-lg text-outline-variant">shopping_bag</span>
      </div>
      <div class="flex-1 min-w-0">
        <p class="text-xs font-semibold text-on-surface line-clamp-1">${item.name}</p>
        <p class="text-[11px] text-secondary">${item.size ? 'Size: ' + item.size + ' | ' : ''}x${item.qty}</p>
        <p class="text-xs font-bold text-primary">${(item.price * item.qty).toLocaleString('vi-VN')}₫</p>
      </div>
    </div>
  `).join('');
}

function calculateCheckoutTotals() {
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const shipping = document.querySelector('input[name="shipping"]:checked').value === 'express' ? 30000 : 0;
  const discount = 0; // TODO: implement promo code
  const total = subtotal + shipping - discount;
  
  document.getElementById('subtotal').textContent = subtotal.toLocaleString('vi-VN') + '₫';
  document.getElementById('shippingCost').textContent = shipping > 0 ? '+' + shipping.toLocaleString('vi-VN') + '₫' : 'Miễn phí';
  document.getElementById('discountAmount').textContent = discount > 0 ? '-' + discount.toLocaleString('vi-VN') + '₫' : '0₫';
  document.getElementById('totalPrice').textContent = total.toLocaleString('vi-VN') + '₫';
}

function proceedToPayment() {
  const name = document.getElementById('checkoutName').value.trim();
  const phone = document.getElementById('checkoutPhone').value.trim();
  const address = document.getElementById('checkoutAddress').value.trim();
  const paymentMethod = document.querySelector('input[name="payment"]:checked').value;
  
  if (!name || !phone || !address) {
    showToast('Vui lòng điền đầy đủ thông tin giao hàng!');
    return;
  }
  
  // Simulate payment processing
  showToast('Đang xử lý thanh toán...');
  
  setTimeout(() => {
    // Clear cart and show success
    cart = [];
    updateCartBadge();
    closeCheckoutPage();
    showToast('Đặt hàng thành công! Cảm ơn bạn.');
  }, 1500);
}
const AI_REPLIES = {
  'vợt': ['Yonex ArcSaber 11 Pro là lựa chọn hàng đầu cho game tốc độ. Bạn đang ở level nào để mình tư vấn thêm?', 'Victor Thruster F Claw II rất phù hợp người chơi smash. Budget khoảng bao nhiêu?'],
  'giày': ['Yonex Power Cushion 65 Z3 đang sale 15%. Bạn mang size bao nhiêu?', 'Với cầu lông, giày Yonex luôn là top lựa chọn về đệm và độ bám.'],
  'size': ['Để tư vấn size giày, cho mình biết size thường bạn mang (EU/US) và chiều dài bàn chân nhé!', 'Áo thi đấu: S=<165cm/60kg, M=165-175cm/60-75kg, L=>175cm/75kg.'],
  'đơn hàng': ['Bạn có thể cung cấp mã đơn hàng để mình kiểm tra trạng thái nhé!', 'Giao hàng nội thành trong ngày, tỉnh thành khác 2-3 ngày.'],
  'pickleball': ['Selkirk AMPED S2 và Joola Ben Johns đang rất hot. Bạn muốn tìm hiểu dòng nào?', 'Vợt Pickleball composite mới nhất vừa về hàng. Mình tư vấn nhé!'],
  'bóng đá': ['Nike Phantom GX2 Elite đang là dòng giày hot nhất. Bạn chơi sân cỏ nhân tạo hay sân trong nhà?']
};
const AI_DEFAULT = ['Tôi có thể giúp bạn tìm sản phẩm, tư vấn size hoặc tra cứu đơn hàng. Hãy cho tôi biết bạn cần gì!', 'Bạn có thể hỏi về sản phẩm cụ thể như vợt, giày, áo đấu... Tôi sẽ tư vấn chi tiết!'];

function toggleChat() { document.getElementById('aiChat').classList.toggle('open'); }
function sendAI() {
  const inp = document.getElementById('aiInput');
  const text = inp.value.trim();
  if (!text) return;
  const msgs = document.getElementById('aiMsgs');
  msgs.innerHTML += `<div class="max-w-[85%] p-3 rounded-xl text-sm leading-relaxed bg-primary text-on-primary self-end rounded-tr-sm">${text}</div>`;
  inp.value = '';
  const lower = text.toLowerCase();
  let reply = AI_DEFAULT[Math.floor(Math.random() * AI_DEFAULT.length)];
  for (const [key, replies] of Object.entries(AI_REPLIES)) {
    if (lower.includes(key)) { reply = replies[Math.floor(Math.random() * replies.length)]; break; }
  }
  setTimeout(() => {
    msgs.innerHTML += `<div class="max-w-[85%] p-3 rounded-xl text-sm leading-relaxed bg-surface-container text-on-surface self-start rounded-tl-sm">${reply}</div>`;
    msgs.scrollTop = msgs.scrollHeight;
  }, 600);
  msgs.scrollTop = msgs.scrollHeight;
}

// ===== TOAST =====
function showToast(msg) {
  const t = document.getElementById('toast');
  document.getElementById('toastMsg').textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2800);
}

// ===== FETCH API DATA =====
async function fetchProducts() {
  try {
    // Endpoint đúng: GET /api/v1/products/all
    const res = await fetch(PRODUCTS_URL + '/all');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    ALL_API_PRODUCTS = await res.json();

    // API trả về categoryId (field phẳng trong ProductListResponse)
    PRODUCTS.badminton = ALL_API_PRODUCTS.filter(p => SPORT_CAT_IDS.badminton.includes(p.categoryId)).map(mapProduct);
    PRODUCTS.football = ALL_API_PRODUCTS.filter(p => SPORT_CAT_IDS.football.includes(p.categoryId)).map(mapProduct);
    PRODUCTS.pickleball = ALL_API_PRODUCTS.filter(p => SPORT_CAT_IDS.pickleball.includes(p.categoryId)).map(mapProduct);

    // Update stats
    const total = ALL_API_PRODUCTS.length;
    document.getElementById('statProducts').textContent = total + '+';

    selectSport('badminton');
    renderBentoGrid();
    renderSaleCarousel();
    initDraggableMarquees();
    // If currently on a sport page, refresh it too
    if (currentSportPage) { renderSpBrands(); filterSportPage(); }
    showToast(`Đã tải ${total} sản phẩm từ server`);
  } catch (err) {
    console.error('Lỗi khi tải sản phẩm:', err);
    showToast('Không kết nối được server — vui lòng khởi động backend');
    if (currentSportPage) { renderSpBrands(); filterSportPage(); }
  }
}

// ===== BENTO GRID RENDER =====
// Admin-selected featured product IDs (up to 3), persisted in memory
let featuredProductIds = [];
let saleProductsConfig = []; // [{id, discount}]

function renderBentoGrid() {
  const allMapped = Object.values(PRODUCTS).flat();
  let picks = featuredProductIds.length
    ? featuredProductIds.map(id => allMapped.find(p => p.id === id)).filter(Boolean)
    : allMapped.slice(0, 8);
  if (!picks.length) return;

  const cardsHtml = picks.map(p => {
    return `<div class="w-[360px] flex-shrink-0 bg-surface-container rounded-xl border border-outline-variant hover:border-primary transition-all cursor-pointer p-6 flex flex-col items-center text-center product-card-hover" onclick="openProductDetail(${p.id})">
      <div class="w-full h-48 flex items-center justify-center mb-4"><i class="ti ${p.icon}" style="font-size:80px;color:#d8c2c0"></i></div>
      <div class="text-xs font-semibold text-secondary uppercase tracking-wider mb-2">${p.brand}</div>
      <h3 class="font-headline-md text-xl italic text-on-background line-clamp-1 mb-2">${p.name}</h3>
      <p class="text-primary font-bold text-lg">${p.price.toLocaleString('vi-VN')}₫</p>
    </div>`;
  }).join('');

  const loopHtml = `<div class="flex gap-6 flex-shrink-0">${cardsHtml}</div><div class="flex gap-6 flex-shrink-0">${cardsHtml}</div>`;

  document.getElementById('bentoGrid').innerHTML = `
    <div class="marquee-container py-4">
      <div class="animate-marquee gap-6" style="animation-duration: ${Math.max(60, picks.length * 15)}s;">
        ${loopHtml}
      </div>
    </div>
  `;
}

// ===== SALE CAROUSEL RENDER =====
function renderSaleCarousel() {
  const allMapped = Object.values(PRODUCTS).flat();
  let salePicks;
  if (saleProductsConfig.length) {
    salePicks = saleProductsConfig.map(cfg => {
      const p = allMapped.find(x => x.id === cfg.id);
      return p ? { ...p, discount: cfg.discount } : null;
    }).filter(Boolean);
  } else {
    salePicks = allMapped.filter(p => p.badge === 'sale').slice(0, 8);
    if (salePicks.length < 2) salePicks = allMapped.slice(0, 8);
    salePicks = salePicks.map(p => ({ ...p, discount: Math.floor(Math.random() * 3 + 2) * 10 }));
  }

  if (!salePicks.length) return;

  const cardsHtml = salePicks.map(p => {
    const salePrice = Math.round(p.price * (1 - p.discount / 100));
    return `<div class="w-[340px] flex-shrink-0 bg-white p-4 rounded-xl flex flex-col items-center text-center shadow-md border border-outline-variant cursor-pointer hover:border-primary transition-all product-card-hover" onclick="openProductDetail(${p.id})">
      <div class="relative w-full h-52 bg-surface-container-low mb-4 overflow-hidden rounded-lg flex items-center justify-center">
        <div class="absolute top-2 right-2 bg-primary text-on-primary px-2 py-1 text-[10px] font-bold rounded z-10">-${p.discount}%</div>
        <i class="ti ${p.icon}" style="font-size:64px;color:#d8c2c0"></i>
      </div>
      <div class="text-[10px] font-semibold text-secondary uppercase tracking-wider mb-1">${p.brand}</div>
      <h5 class="font-label-bold text-label-bold uppercase italic text-on-background text-sm line-clamp-2 mb-1">${p.name}</h5>
      <p class="text-outline line-through text-sm">${p.price.toLocaleString('vi-VN')}₫</p>
      <p class="text-primary font-stats-display text-stats-display">${salePrice.toLocaleString('vi-VN')}₫</p>
    </div>`;
  }).join('');

  const loopHtml = `<div class="flex gap-6 flex-shrink-0">${cardsHtml}</div><div class="flex gap-6 flex-shrink-0">${cardsHtml}</div>`;

  document.getElementById('saleCarousel').innerHTML = `
    <div class="marquee-container py-4">
      <div class="animate-marquee gap-6" style="animation-duration: ${Math.max(60, salePicks.length * 15)}s;">
        ${loopHtml}
      </div>
    </div>
  `;
}

// ===== ADMIN AUTH =====
let isAdmin = false;

// Note: handleLogin is already defined above for the login page.
// The modal login now redirects to the full login page via openUserModal().

function adminLogout() {
  isAdmin = false;
  localStorage.removeItem('isAdmin');
  localStorage.removeItem('isLoggedIn');
  document.getElementById('adminNavBtn')?.classList.add('hidden');
  // If on admin.html, redirect to index
  if (window.location.pathname.includes('admin.html')) {
    window.location.href = 'index.html';
    return;
  }
  navigateToHome();
  showToast('Đã đăng xuất');
}

function navigateToAdmin() {
  if (!isAdmin) { openUserModal(); return; }
  window.location.href = 'admin.html';
}

// ===== ADMIN TABS =====
function switchAdminTab(tab) {
  ['featured','sale','add'].forEach(t => {
    document.getElementById(`adminPanel-${t}`).style.display = t === tab ? 'block' : 'none';
    const btn = document.getElementById(`adminTab-${t}`);
    if (t === tab) { btn.classList.add('bg-primary','text-white'); btn.classList.remove('text-secondary'); }
    else { btn.classList.remove('bg-primary','text-white'); btn.classList.add('text-secondary'); }
  });
  if (tab === 'featured') renderAdminFeaturedPanel();
  if (tab === 'sale') renderAdminSalePanel();
}

// ===== ADMIN: FEATURED =====
function renderAdminFeaturedPanel() {
  renderFeaturedSlots();
  renderAdminProductList('featured');
}

function renderFeaturedSlots() {
  const allMapped = Object.values(PRODUCTS).flat();
  document.getElementById('featuredCount').textContent = featuredProductIds.length;
  const slots = document.getElementById('featuredSlots');
  const picks = featuredProductIds.map(id => allMapped.find(p => p.id === id)).filter(Boolean);
  // Always show 3 slots
  slots.innerHTML = [0,1,2].map(i => {
    const p = picks[i];
    return p
      ? `<div class="border border-primary rounded-xl p-3 relative bg-primary/5">
          <button onclick="removeFeatured(${p.id})" class="absolute top-2 right-2 w-6 h-6 bg-error/10 text-error rounded-full flex items-center justify-center hover:bg-error/20 transition-colors"><span class="material-symbols-outlined text-sm">close</span></button>
          <div class="w-full h-24 bg-surface-container rounded-lg flex items-center justify-center mb-2"><i class="ti ${p.icon}" style="font-size:40px;color:#d8c2c0"></i></div>
          <div class="text-[10px] text-secondary uppercase">${p.brand}</div>
          <div class="text-xs font-semibold text-on-surface truncate">${p.name}</div>
          <div class="text-xs text-primary font-bold mt-0.5">${p.price.toLocaleString('vi-VN')}₫</div>
        </div>`
      : `<div class="border-2 border-dashed border-outline-variant rounded-xl p-3 flex flex-col items-center justify-center h-[160px] text-secondary">
          <span class="material-symbols-outlined text-3xl text-outline-variant mb-1">add_photo_alternate</span>
          <div class="text-xs">Slot ${i+1} trống</div>
        </div>`;
  }).join('');
}

function renderAdminProductList(type) {
  const searchId = type === 'featured' ? 'adminFeaturedSearch' : 'adminSaleSearch';
  const listId = type === 'featured' ? 'adminFeaturedList' : 'adminSaleList';
  const search = (document.getElementById(searchId)?.value || '').toLowerCase();
  const allMapped = Object.values(PRODUCTS).flat();
  let products = search ? allMapped.filter(p => p.name.toLowerCase().includes(search) || p.brand.toLowerCase().includes(search)) : allMapped;

  document.getElementById(listId).innerHTML = products.map(p => {
    const isSelected = type === 'featured'
      ? featuredProductIds.includes(p.id)
      : saleProductsConfig.some(c => c.id === p.id);
    return `<div class="border rounded-xl p-2 cursor-pointer transition-all ${isSelected ? 'border-primary bg-primary/5' : 'border-outline-variant hover:border-primary'}"
        onclick="${type === 'featured' ? `toggleFeatured(${p.id})` : `toggleSale(${p.id})`}">
      <div class="w-full h-16 bg-surface-container rounded-lg flex items-center justify-center mb-1.5"><i class="ti ${p.icon}" style="font-size:28px;color:#d8c2c0"></i></div>
      <div class="text-[9px] text-secondary uppercase truncate">${p.brand}</div>
      <div class="text-[11px] font-semibold text-on-surface truncate leading-tight">${p.name}</div>
      <div class="text-[11px] text-primary font-bold">${p.price.toLocaleString('vi-VN')}₫</div>
      ${isSelected ? '<div class="mt-1 text-center"><span class="text-[9px] bg-primary text-white px-2 py-0.5 rounded-full">Đã chọn ✓</span></div>' : ''}
    </div>`;
  }).join('');
}

function toggleFeatured(id) {
  if (featuredProductIds.includes(id)) {
    featuredProductIds = featuredProductIds.filter(x => x !== id);
  } else {
    if (featuredProductIds.length >= 3) { showToast('Tối đa 3 sản phẩm nổi bật!'); return; }
    featuredProductIds.push(id);
  }
  renderFeaturedSlots();
  renderAdminProductList('featured');
  renderBentoGrid();
}

function removeFeatured(id) {
  featuredProductIds = featuredProductIds.filter(x => x !== id);
  renderFeaturedSlots();
  renderAdminProductList('featured');
  renderBentoGrid();
}

// ===== ADMIN: SALE =====
function renderAdminSalePanel() {
  renderSaleSlots();
  renderAdminProductList('sale');
}

function renderSaleSlots() {
  const allMapped = Object.values(PRODUCTS).flat();
  document.getElementById('saleCount').textContent = saleProductsConfig.length;
  const slots = document.getElementById('saleSlots');
  if (!saleProductsConfig.length) {
    slots.innerHTML = `<div class="text-sm text-secondary text-center py-6 border-2 border-dashed border-outline-variant rounded-xl">Chưa có sản phẩm nào. Chọn từ danh sách bên dưới.</div>`;
    return;
  }
  slots.innerHTML = saleProductsConfig.map(cfg => {
    const p = allMapped.find(x => x.id === cfg.id);
    if (!p) return '';
    return `<div class="flex items-center gap-3 p-3 border border-outline-variant rounded-xl bg-white">
      <div class="w-12 h-12 bg-surface-container rounded-lg flex items-center justify-center flex-shrink-0"><i class="ti ${p.icon}" style="font-size:24px;color:#d8c2c0"></i></div>
      <div class="flex-1 min-w-0">
        <div class="text-[10px] text-secondary uppercase">${p.brand}</div>
        <div class="text-sm font-semibold text-on-surface truncate">${p.name}</div>
        <div class="text-xs text-primary">${p.price.toLocaleString('vi-VN')}₫</div>
      </div>
      <div class="flex items-center gap-2 flex-shrink-0">
        <label class="text-xs text-secondary">Giảm</label>
        <input type="number" min="5" max="90" value="${cfg.discount}" class="w-16 px-2 py-1 border border-outline-variant rounded text-sm text-center outline-none focus:border-primary" onchange="updateSaleDiscount(${p.id},this.value)"/>
        <span class="text-xs text-secondary">%</span>
      </div>
      <button onclick="removeSale(${p.id})" class="w-8 h-8 flex items-center justify-center text-secondary hover:text-error transition-colors flex-shrink-0"><span class="material-symbols-outlined text-lg">delete</span></button>
    </div>`;
  }).join('');
}

function toggleSale(id) {
  const idx = saleProductsConfig.findIndex(c => c.id === id);
  if (idx >= 0) { saleProductsConfig.splice(idx,1); }
  else { saleProductsConfig.push({ id, discount: 20 }); }
  renderSaleSlots();
  renderAdminProductList('sale');
  renderSaleCarousel();
      initDraggableMarquees();
}

function removeSale(id) {
  saleProductsConfig = saleProductsConfig.filter(c => c.id !== id);
  renderSaleSlots();
  renderAdminProductList('sale');
  renderSaleCarousel();
      initDraggableMarquees();
}

function updateSaleDiscount(id, val) {
  const cfg = saleProductsConfig.find(c => c.id === id);
  if (cfg) { cfg.discount = parseInt(val) || 20; renderSaleCarousel();
      initDraggableMarquees(); }
}

// ===== ADMIN: ADD PRODUCT =====
async function submitNewProduct() {
  const name = document.getElementById('newProdName').value.trim();
  const brand = document.getElementById('newProdBrand').value.trim();
  const categoryId = parseInt(document.getElementById('newProdCategory').value);
  const typeId = parseInt(document.getElementById('newProdType')?.value || '1');
  const description = document.getElementById('newProdDesc').value.trim();
  const imageUrl = document.getElementById('newProdImage')?.value.trim() || '';
  const skuVal = document.getElementById('newProdSku')?.value.trim() || 'SKU-DEFAULT';
  const colorVal = document.getElementById('newProdColor')?.value.trim() || 'Mặc định';
  const sizeVal = document.getElementById('newProdSizeV')?.value.trim() || 'Mặc định';
  const priceVal = parseFloat(document.getElementById('newProdPrice').value);
  const stockVal = parseInt(document.getElementById('newProdStock').value) || 50;
  const resultEl = document.getElementById('addProductResult');

  if (!name || !brand || !priceVal || !categoryId) {
    resultEl.className = 'mt-4 p-3 bg-error/10 text-error rounded-lg text-sm';
    resultEl.textContent = '⚠️ Vui lòng điền đầy đủ: Tên, Thương hiệu, Giá bán, Danh mục.';
    resultEl.classList.remove('hidden');
    return;
  }

  // Payload phải match ProductCreateReq:
  // { name, brand, categoryId, typeId, description, imageUrls: [], variants: [{sku, color, size, price, stockQuantity}] }
  const payload = {
    name,
    brand,
    categoryId,
    typeId: typeId || 1,
    description,
    imageUrls: imageUrl ? [imageUrl] : [],
    variants: [{
      sku: skuVal,
      color: colorVal,
      size: sizeVal,
      price: priceVal,
      stockQuantity: stockVal
    }]
  };

  resultEl.className = 'mt-4 p-3 bg-surface-container rounded-lg text-sm text-secondary flex items-center gap-2';
  resultEl.innerHTML = '<span class="material-symbols-outlined text-base animate-spin">progress_activity</span> Đang tạo sản phẩm...';
  resultEl.classList.remove('hidden');

  try {
    // Endpoint đúng: POST /api/v1/products
    const res = await fetch(PRODUCTS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`HTTP ${res.status}: ${errText}`);
    }
    const created = await res.json();
    resultEl.className = 'mt-4 p-3 bg-green-50 text-green-800 rounded-lg text-sm';
    resultEl.innerHTML = `✅ Tạo thành công! ID: <strong>${created.id}</strong> — "${created.name}"`;
    clearNewProductForm();
    initDraggableMarquees();
    await fetchProducts();
    showToast(`Đã thêm sản phẩm "${name}"`);
  } catch(err) {
    resultEl.className = 'mt-4 p-3 bg-error/10 text-error rounded-lg text-sm';
    resultEl.textContent = `❌ Lỗi: ${err.message}`;
  }
}

function clearNewProductForm() {
  const fieldDefaults = {
    'newProdName': '',
    'newProdBrand': '',
    'newProdDesc': '',
    'newProdImage': '',
    'newProdType': '1',
    'newProdSku': '',
    'newProdColor': '',
    'newProdSizeV': '',
    'newProdPrice': '',
    'newProdStock': '50'
  };
  Object.entries(fieldDefaults).forEach(([id, def]) => {
    const el = document.getElementById(id);
    if (el) el.value = def;
  });
  const resultEl = document.getElementById('addProductResult');
  if (resultEl) resultEl.classList.add('hidden');
}



// ===== ROUTER / PAGE NAVIGATION =====
const SPORT_BANNERS = {
  badminton: {
    bg: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDbqAmI-A4Et4u04N82zDCfOts67WJ-XxgeHxrQh7qGwZk7WhT9iQQ9WpAYtvVWMsXRLIAQ_ElZkl_3JuLmPWoA0KLuoskOrKqvbVLCHJ_cwPNrnvXsZnrDZxRyXbRooV7vHYszJzA4NhMR86Y3dIDTglaqZk35XNohkmlC0vAV5ZcnOK8X9VEL6t3gclqbnnGvo7SBzkeZnonYH6sO9f6PWlYnwNza7cyhtgjc5deNc9FKBsFSDtgGAiC_ZIq9ofcJRri05thnY28f',
    title: 'Cầu lông',
    sub: 'Vợt cao cấp · Giày chuyên dụng · Phụ kiện',
    navId: 'nav-badminton'
  },
  football: {
    bg: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBDvnVWGe9174Uck9FwRTgeoyJ5m-kS1FFq3IdBZ2XqYZJmUuDIxrwKBaynlA5jJup9J86Evu1bQ-u1MvhdqVqZ7V_4ZhUwSqQOqldmpBRZZI4tD8w9oycTmXj4KSgKvUHu3SOVlMEB-TZXi8cfA87NOHmvAa55ojxapeeLurdeGe5deGIwHdzUf-vlpyx8zts_7xnw1IHU9mYMuSnvz0osu_J6s16jfye5D3YNT9wkG1hrmkxJw_ip-CIPqmBa6L0-0mkD8N9sDXee',
    title: 'Bóng đá',
    sub: 'Giày đá bóng · Bóng · Trang phục thi đấu',
    navId: 'nav-football'
  },
  pickleball: {
    bg: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBU5aYizwXy-EByEbDoais7cWGHQrAIDyGJ__0hBk9vwO3RvExjHJw_UyoeEqiPZfy5kz4plzAWizNCd_XRQiN64iEzYvj_KllbRO0NNAH-EAGtvd_IzgJG-gck5nbLUtgRnAX8bJwvi1l3GVPfsD3cByOIkubFotzJ0Mdn9-8uhWkohqVtU6iAso0kBKcsQYOoRMOF2C8FCRdYFug_h70vhtX68msFdotLozfIYMBfJ_IMw-f3FzwqfFEWLF5f0ZSgBZW2_7P0U_bk',
    title: 'Pickleball',
    sub: 'Vợt composite · Bóng Pickleball · Gear chuyên dụng',
    navId: 'nav-pickleball'
  }
};

let currentSportPage = null;
let spCurrentSub = 'Tất cả';

function navigateToSport(sport) {
  currentSportPage = sport;
  spCurrentSub = 'Tất cả';
  // Reset filters
  spPriceMin = 0;
  spPriceMax = Infinity;
  document.getElementById('mainContent').style.display = 'none';
  document.getElementById('sportPage').style.display = 'block';
  window.scrollTo({ top: 0, behavior: 'smooth' });

  const info = SPORT_BANNERS[sport];
  document.getElementById('sportPageBg').style.backgroundImage = `url('${info.bg}')`;
  document.getElementById('sportPageTitle').textContent = info.title;
  document.getElementById('sportPageSub').textContent = info.sub;
  document.getElementById('spCatalogTitle').textContent = info.title;

  // Update nav active state
  document.querySelectorAll('.nav-link').forEach(el => {
    el.classList.remove('text-white', 'bg-primary/20', 'border-b-2', 'border-primary');
    el.classList.add('text-gray-300');
  });
  const activeNav = document.getElementById(info.navId);
  if (activeNav) {
    activeNav.classList.add('text-white', 'bg-primary/20', 'border-b-2', 'border-primary');
    activeNav.classList.remove('text-gray-300');
  }

  // Reset search input
  const searchEl = document.getElementById('spSearchInput');
  if (searchEl) searchEl.value = '';
  // Reset price radio to "all"
  const firstRadio = document.querySelector('input[name="spPriceRange"]');
  if (firstRadio) firstRadio.checked = true;
  document.querySelectorAll('.price-range-item').forEach(l => l.classList.remove('bg-primary/10','font-semibold','text-primary'));

  renderSpSubTabs();
  renderSpBrands();
  filterSportPage();
}

function navigateToHome() {
  currentSportPage = null;
  document.getElementById('mainContent').style.display = 'block';
  document.getElementById('sportPage').style.display = 'none';
  window.scrollTo({ top: 0, behavior: 'smooth' });

  // Reset nav
  document.querySelectorAll('.nav-link').forEach(el => {
    el.classList.remove('text-white', 'bg-primary/20', 'border-b-2', 'border-primary');
    el.classList.add('text-gray-300');
  });
  const homeNav = document.getElementById('nav-home');
  if (homeNav) {
    homeNav.classList.add('text-white', 'bg-primary/20', 'border-b-2', 'border-primary');
    homeNav.classList.remove('text-gray-300');
  }
}

function renderSpSubTabs() {
  const cats = SUB_CATS[currentSportPage] || [];
  const container = document.getElementById('spSidebarCategories');
  if(container) {
    container.innerHTML = cats.map(c =>
      `<li><button class="hover-slide-right w-full text-left px-3 py-2 rounded hover:bg-surface-container transition-colors ${c === spCurrentSub ? 'font-bold text-primary bg-primary/10' : ''}" onclick="selectSpSub('${c}')">${c.toUpperCase()}</button></li>`
    ).join('');
  }
  
  const sizeContainer = document.getElementById('spSizeFilters');
  if(sizeContainer) {
    // Collect sizes from product variants for current sport + subcategory
    const products = PRODUCTS[currentSportPage] || [];
    const filteredProducts = spCurrentSub !== 'Tất cả'
      ? products.filter(p => p.cat === spCurrentSub)
      : products;

    const sizeSet = new Set();
    // 1) Collect sizes from actual variant data
    filteredProducts.forEach(p => {
      if (p.variants && p.variants.length > 0) {
        p.variants.forEach(v => { if (v.size) sizeSet.add(v.size); });
      }
    });

    // 2) Infer sizes from subcategory name if variants empty
    const lowerSub = (spCurrentSub || '').toLowerCase();
    if (sizeSet.size === 0) {
      if (lowerSub.includes('giày')) {
        ['36','37','38','39','40','41','42','43','44','45'].forEach(s => sizeSet.add(s));
      } else if (lowerSub.includes('quần áo')) {
        ['S','M','L','XL','XXL'].forEach(s => sizeSet.add(s));
      }
    }

    // Sort: clothing sizes (alpha) first, then shoe sizes (numeric)
    const sizeOrder = ['XS','S','M','L','XL','XXL','XXXL'];
    const alphaSizes = [...sizeSet].filter(s => isNaN(s)).sort((a,b) => {
      const ai = sizeOrder.indexOf(a), bi = sizeOrder.indexOf(b);
      return (ai >= 0 && bi >= 0) ? ai - bi : a.localeCompare(b);
    });
    const numericSizes = [...sizeSet].filter(s => !isNaN(s)).sort((a,b) => Number(a)-Number(b));
    const sizes = [...alphaSizes, ...numericSizes];

    if (sizes.length === 0) {
      sizeContainer.parentElement.style.display = 'none';
    } else {
      sizeContainer.parentElement.style.display = 'block';
      sizeContainer.innerHTML = sizes.map(s => 
        `<label class="flex items-center justify-center py-1.5 border border-outline-variant rounded hover:border-primary cursor-pointer select-none size-filter-label" data-size="${s}">
           <input type="checkbox" value="${s}" class="hidden" onchange="toggleSizeFilter(this)"/>
           <span>${s}</span>
         </label>`
      ).join('');
    }
  }
}

function toggleSizeFilter(input) {
  if(input.checked) {
    input.parentElement.classList.add('border-primary', 'bg-primary/10', 'text-primary', 'font-bold');
    input.parentElement.classList.remove('border-outline-variant');
  } else {
    input.parentElement.classList.remove('border-primary', 'bg-primary/10', 'text-primary', 'font-bold');
    input.parentElement.classList.add('border-outline-variant');
  }
  filterSportPage();
}

function selectSpSub(sub) {
  spCurrentSub = sub;
  renderSpSubTabs();
  filterSportPage();
}

function renderSpBrands() {
  const brands = BRANDS[currentSportPage] || [];
  const apiBrands = [...new Set((PRODUCTS[currentSportPage] || []).map(p => p.brand).filter(Boolean))];
  const allBrands = [...new Set([...brands, ...apiBrands])];
  document.getElementById('spBrandFilters').innerHTML = allBrands.map(b =>
    `<label class="filter-item"><input type="checkbox" onchange="filterSportPage()"/> ${b}</label>`
  ).join('');
}

// Price range state
let spPriceMin = 0;
let spPriceMax = Infinity;

function applyPriceRange(input) {
  const val = input.value;
  if (!val) {
    spPriceMin = 0;
    spPriceMax = Infinity;
  } else {
    const parts = val.split('-');
    spPriceMin = parseFloat(parts[0]) || 0;
    spPriceMax = parseFloat(parts[1]) || Infinity;
  }
  // Highlight selected radio label
  document.querySelectorAll('.price-range-item').forEach(l => {
    l.classList.remove('bg-primary/10', 'font-semibold', 'text-primary');
  });
  if (input.checked) {
    input.closest('.price-range-item').classList.add('bg-primary/10', 'font-semibold', 'text-primary');
  }
  filterSportPage();
}

// Debounce timer for search
let _searchTimer = null;

async function filterSportPage() {
  if (!currentSportPage) return;

  const search = (document.getElementById('spSearchInput')?.value || '').trim();
  const checkedSizes = [...document.querySelectorAll('#spSizeFilters input:checked')].map(i => i.value);
  const checkedBrands = [...document.querySelectorAll('#spBrandFilters input:checked')].map(i => i.parentElement.textContent.trim());

  const hasAPIFilter = search || checkedSizes.length > 0 || spPriceMin > 0 || spPriceMax < Infinity;

  let products;

  if (hasAPIFilter) {
    // Gọi backend /filter API
    try {
      const params = new URLSearchParams();
      if (search) params.append('name', search);
      if (checkedSizes.length === 1) params.append('size', checkedSizes[0]); // API filter by single size
      if (spPriceMin > 0) params.append('minPrice', spPriceMin);
      if (spPriceMax < Infinity) params.append('maxPrice', spPriceMax);

      const res = await fetch(PRODUCTS_URL + '/filter?' + params.toString());
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const raw = await res.json();

      // Map và lọc theo sport hiện tại
      const sportCatIds = SPORT_CAT_IDS[currentSportPage] || [];
      products = raw
        .filter(p => sportCatIds.includes(p.categoryId))
        .map(mapProduct);

      // Nếu nhiều size được chọn, filter thêm client-side
      if (checkedSizes.length > 1) {
        // Gọi thêm API cho từng size rồi hợp nhất kết quả
        const multiResults = await Promise.all(
          checkedSizes.map(async sz => {
            const p2 = new URLSearchParams();
            if (search) p2.append('name', search);
            p2.append('size', sz);
            if (spPriceMin > 0) p2.append('minPrice', spPriceMin);
            if (spPriceMax < Infinity) p2.append('maxPrice', spPriceMax);
            const r2 = await fetch(PRODUCTS_URL + '/filter?' + p2.toString());
            if (!r2.ok) return [];
            return await r2.json();
          })
        );
        const merged = multiResults.flat();
        const idSet = new Set(merged.map(p => p.id));
        products = [...idSet].map(id => merged.find(p => p.id === id))
          .filter(p => sportCatIds.includes(p.categoryId))
          .map(mapProduct);
      }
    } catch(err) {
      console.warn('Filter API error, falling back to local:', err);
      // Fallback: lọc local
      products = PRODUCTS[currentSportPage] || [];
      if (search) products = products.filter(p => (p.name||'').toLowerCase().includes(search.toLowerCase()));
      if (checkedSizes.length) products = products.filter(p =>
        !p.variants || p.variants.length === 0 || p.variants.some(v => checkedSizes.includes(v.size))
      );
      products = products.filter(p => p.price >= spPriceMin && p.price <= spPriceMax);
    }
  } else {
    // Không có filter nào → dùng data local (đã load sẵn)
    products = [...(PRODUCTS[currentSportPage] || [])];
  }

  // Lọc thêm theo subcategory và brand (client-side)
  if (spCurrentSub !== 'Tất cả') products = products.filter(p => p.cat === spCurrentSub);
  if (checkedBrands.length) products = products.filter(p => checkedBrands.includes(p.brand));

  document.getElementById('spCatalogCount').textContent = `(${products.length} sản phẩm)`;
  renderSpProducts(products);
}

function sortSportPage(val) {
  if (!currentSportPage) return;
  let products = PRODUCTS[currentSportPage] || [];
  if (spCurrentSub !== 'Tất cả') products = products.filter(p => p.cat === spCurrentSub);
  if (val === 'price-asc') products = [...products].sort((a, b) => a.price - b.price);
  else if (val === 'price-desc') products = [...products].sort((a, b) => b.price - a.price);
  else if (val === 'rating') products = [...products].sort((a, b) => b.rating - a.rating);
  else if (val === 'new') products = [...products].filter(p => p.badge === 'new').concat(products.filter(p => p.badge !== 'new'));
  renderSpProducts(products);
}

function renderSpProducts(products) {
  const grid = document.getElementById('spProductGrid');
  if (!products.length) {
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:60px;color:#857372">
      <i class="ti ti-search-off" style="font-size:48px;display:block;margin-bottom:12px;color:#d8c2c0"></i>
      <p style="font-size:16px;font-weight:600">Không tìm thấy sản phẩm</p>
      <p style="font-size:13px;margin-top:4px">Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm</p>
    </div>`;
    return;
  }
  grid.innerHTML = products.map(p => `
    <div class="product-card-hover bg-white rounded-xl overflow-hidden border border-outline-variant cursor-pointer flex flex-col h-full" onclick="openProductDetail(${p.id})">
      <div class="relative overflow-hidden aspect-[4/3] bg-surface-container flex items-center justify-center">
        <i class="ti ${p.icon}" style="font-size:64px;color:#d8c2c0"></i>
        ${p.badge ? `<span class="absolute top-3 left-3 px-3 py-1 text-[11px] font-bold rounded ${p.badge==='new'?'bg-blue-100 text-blue-800':p.badge==='sale'?'bg-red-100 text-red-800':'bg-amber-100 text-amber-800'}">${p.badge==='new'?'Mới':p.badge==='sale'?'Sale':'Hot'}</span>` : ''}
        <button class="wishlist-btn absolute top-3 right-3 w-8 h-8 bg-white rounded-full border border-outline-variant flex items-center justify-center ${wishlist.has(p.id)?'active':''}" onclick="event.stopPropagation();toggleWishlist(${p.id},this)">
          <i class="ti ti-heart text-sm text-secondary"></i>
        </button>
      </div>
      <div class="p-4 flex flex-col flex-1">
        <div class="text-[11px] font-semibold text-secondary uppercase tracking-wider mb-1">${p.brand}</div>
        <div class="text-sm font-semibold text-on-surface mb-1 line-clamp-2 leading-tight">${p.name}</div>
        <div class="text-xs text-secondary mb-2 line-clamp-1">${p.desc}</div>
        <div class="flex items-center gap-1 mb-2">
          <span class="text-xs" style="color:#f59e0b">${'★'.repeat(Math.round(p.rating))}${'☆'.repeat(5-Math.round(p.rating))}</span>
          <span class="text-[11px] text-secondary">${p.rating}</span>
        </div>
        <div class="mt-auto pt-2">
          <div class="flex items-center justify-between">
            <div>
              <span class="font-stats-display text-lg text-primary">${p.price.toLocaleString('vi-VN')}₫</span>
              ${p.oldPrice ? `<span class="text-xs text-secondary line-through ml-1">${p.oldPrice.toLocaleString('vi-VN')}₫</span>` : ''}
            </div>
          </div>
          <button class="btn-effect mt-3 w-full py-2 bg-on-surface text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-2 hover:bg-primary transition-colors" onclick="event.stopPropagation();openProductDetail(${p.id})">
            <i class="ti ti-shopping-cart-plus"></i> Xem chi tiết
          </button>
        </div>
      </div>
    </div>
  `).join('');
}

// Also update footer links
function spNavigate(sport) { navigateToSport(sport); window.scrollTo({ top: 0, behavior: 'smooth' }); }



// Fade-in on scroll
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => { if (entry.isIntersecting) entry.target.classList.add('visible'); });
}, { threshold: 0.1 });
document.querySelectorAll('.fade-in').forEach(el => observer.observe(el));

// Initialize page

function initDraggableMarquees() {
  const containers = document.querySelectorAll('.marquee-container:has(.animate-marquee)');
  
  containers.forEach(container => {
    if (container._isDraggableInit) return;
    container._isDraggableInit = true;
    
    container.classList.add('scrollbar-hide');
    
    let isDown = false;
    let startX;
    let scrollLeft;
    let isAutoScrolling = true;
    let speed = 0.5;
    
    const content = container.querySelector('.animate-marquee');
    if (content && content.style.animationDuration) {
      const duration = parseFloat(content.style.animationDuration);
      if (!isNaN(duration)) speed = Math.max(0.2, 50 / duration);
      content.style.animation = 'none';
    }

    const autoScroll = () => {
      if (!isDown && isAutoScrolling) {
        container.scrollLeft += speed;
        const firstWrapper = content.children[0];
        if (firstWrapper) {
          const gap = parseFloat(getComputedStyle(content).gap) || 0;
          const jumpDistance = firstWrapper.offsetWidth + gap;
          if (container.scrollLeft >= jumpDistance) {
            container.scrollLeft -= jumpDistance;
          }
        }
      }
      requestAnimationFrame(autoScroll);
    };

    const onDragStart = (x) => {
      isDown = true;
      isAutoScrolling = false;
      container.style.cursor = 'grabbing';
      startX = x - container.offsetLeft;
      scrollLeft = container.scrollLeft;
    };

    const onDragEnd = () => {
      isDown = false;
      container.style.cursor = 'grab';
      isAutoScrolling = true;
    };

    const onDragMove = (e, x) => {
      if (!isDown) return;
      e.preventDefault();
      const walk = (x - startX) * 2;
      container.scrollLeft = scrollLeft - walk;
      
      const firstWrapper = content.children[0];
      if (firstWrapper) {
        const gap = parseFloat(getComputedStyle(content).gap) || 0;
        const jumpDistance = firstWrapper.offsetWidth + gap;
        if (container.scrollLeft <= 0) {
          container.scrollLeft += jumpDistance;
          startX = x - container.offsetLeft;
          scrollLeft = container.scrollLeft;
        } else if (container.scrollLeft >= jumpDistance) {
          container.scrollLeft -= jumpDistance;
          startX = x - container.offsetLeft;
          scrollLeft = container.scrollLeft;
        }
      }
    };

    container.addEventListener('mousedown', (e) => onDragStart(e.pageX));
    container.addEventListener('mouseleave', onDragEnd);
    container.addEventListener('mouseup', onDragEnd);
    container.addEventListener('mousemove', (e) => onDragMove(e, e.pageX));
    
    container.addEventListener('touchstart', (e) => onDragStart(e.touches[0].pageX), {passive: true});
    container.addEventListener('touchend', onDragEnd);
    container.addEventListener('touchmove', (e) => onDragMove(e, e.touches[0].pageX), {passive: false});

    // We do NOT pause on hover, so that it continues to auto-scroll unless the user actually clicks to drag.

    requestAnimationFrame(autoScroll);
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  initDraggableMarquees();
  // Load categories trước để build mapping catId -> tên
  await loadCategories();
  // Sau đó mới load products (cần SPORT_CAT_IDS đã sẵn sàng)
  await fetchProducts();
  // Load category dropdown cho form thêm sản phẩm
  loadCategoryDropdown();

  const params = new URLSearchParams(window.location.search);
  const toastMsg = params.get('toast');
  if (toastMsg === 'admin') {
    showToast('Đăng nhập admin thành công!');
    setTimeout(() => { window.location.href = 'admin.html'; }, 500);
  } else if (toastMsg === 'login') {
    showToast('Đăng nhập thành công!');
  } else if (toastMsg === 'register') {
    showToast('Đăng ký thành công!');
  }
  if (localStorage.getItem('isAdmin') === 'true') {
    isAdmin = true;
    document.getElementById('adminNavBtn')?.classList.remove('hidden');
  }
  if (toastMsg) {
    window.history.replaceState({}, document.title, window.location.pathname);
  }
});

// ===== LOAD CATEGORY DROPDOWN CHO ADMIN FORM =====
async function loadCategoryDropdown() {
  const select = document.getElementById('newProdCategory');
  if (!select) return;
  try {
    const res = await fetch(CATEGORIES_URL);
    if (!res.ok) return;
    const cats = await res.json();
    // Lọc chỉ lấy category con (có parent) để tránh chọn parent
    const leafCats = cats.filter(c => c.parent === undefined || c.parent === null);
    // Thực ra API /categories trả tất cả, ta hiển thị tất cả
    select.innerHTML = cats.map(c =>
      `<option value="${c.id}">${c.name}</option>`
    ).join('');
  } catch(e) {
    console.warn('Không load được category dropdown:', e);
  }
}

// ===== ADMIN: FILTER TÌM KIẾM QUA API =====
async function filterViaAPI(name, brand, size, minPrice, maxPrice) {
  const params = new URLSearchParams();
  if (name) params.append('name', name);
  if (brand) params.append('brand', brand);
  if (size) params.append('size', size);
  if (minPrice > 0) params.append('minPrice', minPrice);
  if (maxPrice && isFinite(maxPrice)) params.append('maxPrice', maxPrice);
  const url = PRODUCTS_URL + '/filter?' + params.toString();
  const res = await fetch(url);
  if (!res.ok) throw new Error('HTTP ' + res.status);
  return await res.json();
}
