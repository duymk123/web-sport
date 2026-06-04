export const API_BASE =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api/v1";

const PRODUCTS_URL = `${API_BASE}/products`;
const CATEGORIES_URL = `${API_BASE}/categories`;
const PRODUCT_TYPES_URL = `${API_BASE}/product-type`;
const AUTH_URL = `${API_BASE}/auth`;

async function request(path, options = {}) {
  const res = await fetch(path, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    ...options
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

export const api = {
  getAllProducts() {
    return request(`${PRODUCTS_URL}/all`);
  },
  getProductsByCategory(slug) {
    return request(`${PRODUCTS_URL}/categories/${encodeURIComponent(slug)}`);
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
      body: JSON.stringify(payload)
    });
  },
  updateProduct(id, payload) {
    return request(`${PRODUCTS_URL}/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload)
    });
  },
  deleteProduct(id) {
    return request(`${PRODUCTS_URL}/${id}`, {
      method: "DELETE"
    });
  },
  getCategories() {
    return request(CATEGORIES_URL);
  },
  getCategoryTree() {
    return request(`${CATEGORIES_URL}/tree`);
  },
  getProductTypes() {
    return request(PRODUCT_TYPES_URL);
  },
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
  }
};
