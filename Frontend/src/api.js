export const API_BASE =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api/v1";

const PRODUCTS_URL = `${API_BASE}/products`;
const CATEGORIES_URL = `${API_BASE}/categories`;
const PRODUCT_TYPES_URL = `${API_BASE}/product-type`;
const AUTH_URL = `${API_BASE}/auth`;
const ADDRESSES_URL = `${API_BASE}/addresses`;
const CART_URL = `${API_BASE}/cart`;
const ORDERS_URL = `${API_BASE}/orders`;
const RETURN_REQUESTS_URL = `${API_BASE}/return-requests`;
const REVIEWS_URL = `${API_BASE}/reviews`;
const COUPONS_URL = `${API_BASE}/coupons`;
const ADMIN_URL = `${API_BASE}/admin`;
const UPLOAD_URL = `${API_BASE}/upload`;

async function request(path, options = {}) {
  const { auth = false, headers = {}, ...fetchOptions } = options;
  const token = localStorage.getItem("token");

  const res = await fetch(path, {
    headers: {
      "Content-Type": "application/json",
      ...(auth && token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers
    },
    ...fetchOptions
  });

  const contentType = res.headers.get("content-type") || "";
  const body = contentType.includes("application/json")
    ? await res.json()
    : await res.text();

  if (!res.ok) {
    throw new Error(typeof body === "string" ? body : body?.message || `HTTP ${res.status}`);
  }

  return body;
}

function withQuery(url, params = {}) {
  const search = new URLSearchParams();
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      search.set(key, value);
    }
  });

  const query = search.toString();
  return query ? `${url}?${query}` : url;
}

export const api = {
  // ===== Products =====
  getAllProducts() {
    return request(`${PRODUCTS_URL}/all`);
  },
  getProductsByCategory(slug, params = {}) {
    return request(withQuery(`${PRODUCTS_URL}/categories/${encodeURIComponent(slug)}`, params));
  },
  getProductDetail(id) {
    return request(`${PRODUCTS_URL}/${id}`);
  },
  filterProducts(params) {
    const search = new URLSearchParams();
    Object.entries(params || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        search.set(key, value);
      }
    });
    return request(`${PRODUCTS_URL}/filter?${search.toString()}`);
  },
  createProduct(payload) {
    return request(PRODUCTS_URL, {
      method: "POST",
      auth: true,
      body: JSON.stringify(payload)
    });
  },
  updateProduct(id, payload) {
    return request(`${PRODUCTS_URL}/${id}`, {
      method: "PUT",
      auth: true,
      body: JSON.stringify(payload)
    });
  },
  deleteProduct(id) {
    return request(`${PRODUCTS_URL}/${id}`, {
      method: "DELETE",
      auth: true
    });
  },
  uploadImages(files) {
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append("files", files[i]);
    }
    const token = localStorage.getItem("token");
    return fetch(UPLOAD_URL, {
      method: "POST",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: formData
    }).then(res => res.json());
  },

  // ===== Categories =====
  getCategories() {
    return request(CATEGORIES_URL);
  },
  getCategoryTree() {
    return request(`${CATEGORIES_URL}/tree`);
  },
  getProductTypes() {
    return request(PRODUCT_TYPES_URL);
  },

  // ===== Auth =====
  login(payload) {
    return request(`${AUTH_URL}/login`, {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },
  register(payload) {
    return request(`${AUTH_URL}/register`, {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },
  getProfile(username) {
    const search = new URLSearchParams({ username });
    return request(`${AUTH_URL}/profile?${search.toString()}`);
  },
  updateProfile(payload) {
    return request(`${AUTH_URL}/update-profile`, {
      method: "PUT",
      body: JSON.stringify(payload)
    });
  },
  changePassword(payload) {
    return request(`${AUTH_URL}/change-password`, {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },
  forgotPassword(payload) {
    return request(`${AUTH_URL}/forgot-password`, {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },
  resetPassword(payload) {
    return request(`${AUTH_URL}/reset-password`, {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },

  // ===== Addresses =====
  getAddresses() {
    return request(ADDRESSES_URL, { auth: true });
  },
  addAddress(payload) {
    return request(ADDRESSES_URL, {
      method: "POST",
      auth: true,
      body: JSON.stringify(payload)
    });
  },
  updateAddress(id, payload) {
    return request(`${ADDRESSES_URL}/${id}`, {
      method: "PUT",
      auth: true,
      body: JSON.stringify(payload)
    });
  },
  deleteAddress(id) {
    return request(`${ADDRESSES_URL}/${id}`, {
      method: "DELETE",
      auth: true
    });
  },
  setDefaultAddress(id) {
    return request(`${ADDRESSES_URL}/${id}/default`, {
      method: "PATCH",
      auth: true
    });
  },

  // ===== Cart =====
  getCart() {
    return request(CART_URL, { auth: true });
  },
  addToCart(payload) {
    return request(`${CART_URL}/add`, {
      method: "POST",
      auth: true,
      body: JSON.stringify(payload)
    });
  },
  updateCartItem(cartItemId, quantity) {
    return request(`${CART_URL}/update/${cartItemId}?quantity=${quantity}`, {
      method: "PUT",
      auth: true
    });
  },
  removeCartItem(cartItemId) {
    return request(`${CART_URL}/remove/${cartItemId}`, {
      method: "DELETE",
      auth: true
    });
  },

  // ===== Orders (User) =====
  checkout(payload) {
    return request(`${ORDERS_URL}/checkout`, {
      method: "POST",
      auth: true,
      body: JSON.stringify(payload)
    });
  },
  getMyOrders() {
    return request(`${ORDERS_URL}/my-orders`, { auth: true });
  },
  confirmDelivered(orderId) {
    return request(`${ORDERS_URL}/${orderId}/confirm-delivered`, {
      method: "PATCH",
      auth: true
    });
  },

  // ===== Return Requests =====
  createReturnRequest(payload) {
    return request(RETURN_REQUESTS_URL, {
      method: "POST",
      auth: true,
      body: JSON.stringify(payload)
    });
  },
  getMyReturnRequests() {
    return request(`${RETURN_REQUESTS_URL}/my-requests`, { auth: true });
  },

  // ===== Product Reviews =====
  createReview(payload) {
    return request(REVIEWS_URL, {
      method: "POST",
      auth: true,
      body: JSON.stringify(payload)
    });
  },
  getMyReviews() {
    return request(`${REVIEWS_URL}/my-reviews`, { auth: true });
  },
  getReviewsByOrder(orderId) {
    return request(`${REVIEWS_URL}/orders/${orderId}`, { auth: true });
  },
  getReviewsByProduct(productId) {
    return request(`${REVIEWS_URL}/products/${productId}`);
  },

  // ===== Coupons (Public/Customer) =====
  getActiveCoupons() {
    return request(`${COUPONS_URL}/active`);
  },
  applyCoupon(code, orderTotal) {
    return request(`${COUPONS_URL}/apply`, {
      method: "POST",
      auth: true,
      body: JSON.stringify({ code, orderTotal })
    });
  },

  // ===== Admin: Coupons =====
  adminGetCoupons() {
    return request(`${ADMIN_URL}/coupons`, { auth: true });
  },
  adminCreateCoupon(payload) {
    return request(`${ADMIN_URL}/coupons`, {
      method: "POST",
      auth: true,
      body: JSON.stringify(payload)
    });
  },
  adminToggleCouponStatus(id) {
    return request(`${ADMIN_URL}/coupons/${id}/toggle-status`, {
      method: "PATCH",
      auth: true
    });
  },

  // ===== Admin: Orders =====
  adminGetAllOrders() {
    return request(`${ADMIN_URL}/orders`, { auth: true });
  },
  adminUpdateOrderStatus(orderId, status, note) {
    return request(`${ADMIN_URL}/orders/${orderId}/status`, {
      method: "PATCH",
      auth: true,
      body: JSON.stringify({ status, note })
    });
  },

  // ===== Admin: Return Requests =====
  adminGetReturnRequests() {
    return request(`${ADMIN_URL}/return-requests`, { auth: true });
  },
  adminUpdateReturnRequestStatus(id, status) {
    return request(`${ADMIN_URL}/return-requests/${id}/status`, {
      method: "PATCH",
      auth: true,
      body: JSON.stringify({ status })
    });
  },

  adminGetAllUsers() {
    return request(`${ADMIN_URL}/users`, { auth: true });
  },

  // ===== AI Chatbot =====
  chatWithAI(message) {
    return request(`${API_BASE}/chat`, {
      method: "POST",
      body: JSON.stringify({ message })
    });
  }
};

