export const API_BASE =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api/v1";

const PRODUCTS_URL = `${API_BASE}/products`;
const CATEGORIES_URL = `${API_BASE}/categories`;
const PRODUCT_TYPES_URL = `${API_BASE}/product-type`;
const AUTH_URL = `${API_BASE}/auth`;
const ADDRESSES_URL = `${API_BASE}/addresses`;

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
  },
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
  }
};
