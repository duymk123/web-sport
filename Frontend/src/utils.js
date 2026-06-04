import {
  FALLBACK_CATEGORY_IDS,
  FALLBACK_CATEGORY_NAMES,
  FALLBACK_SUB_CATS,
  SPORT_KEY_BY_SLUG
} from "./data.js";

export function formatPrice(value) {
  const price = Number(value || 0);
  return price.toLocaleString("vi-VN") + "₫";
}

export function buildCategoryMeta(tree = []) {
  const sportCatIds = {
    badminton: [],
    football: [],
    pickleball: []
  };
  const idToSub = {};
  const subCats = {
    ...FALLBACK_SUB_CATS
  };

  if (!Array.isArray(tree) || tree.length === 0) {
    return {
      sportCatIds: FALLBACK_CATEGORY_IDS,
      idToSub: FALLBACK_CATEGORY_NAMES,
      subCats: FALLBACK_SUB_CATS
    };
  }

  tree.forEach((parent) => {
    const sportKey = SPORT_KEY_BY_SLUG[parent.slug];
    if (!sportKey) return;

    sportCatIds[sportKey].push(parent.id);
    idToSub[parent.id] = "Tất cả";
    subCats[sportKey] = ["Tất cả"];

    (parent.children || []).forEach((child) => {
      sportCatIds[sportKey].push(child.id);
      idToSub[child.id] = child.name;
      if (!subCats[sportKey].includes(child.name)) {
        subCats[sportKey].push(child.name);
      }
    });
  });

  return { sportCatIds, idToSub, subCats };
}

export function guessProductIcon(categoryName = "") {
  const name = categoryName.toLowerCase();
  if (name.includes("vợt")) return "ti-device-gamepad-2";
  if (name.includes("giày")) return "ti-shoe";
  if (name.includes("quần áo")) return "ti-shirt";
  if (name.includes("bóng")) return "ti-circle";
  if (name.includes("phụ kiện")) return "ti-backpack";
  return "ti-tag";
}

export function normalizeProduct(product, idToSub = {}) {
  const categoryName = idToSub[product.categoryId] || "Tất cả";
  const price = product.price != null ? Number(product.price) : 0;

  return {
    id: product.id,
    name: product.name || "",
    brand: product.brand || "",
    categoryId: product.categoryId,
    typeId: product.typeId,
    price,
    imageUrl: product.imageUrl || "",
    description: product.description || "",
    cat: categoryName,
    icon: guessProductIcon(categoryName),
    rating: 4.5,
    reviews: 18,
    badge: price > 0 && price < 500000 ? "sale" : ""
  };
}

export function inferSizes(subCategory = "") {
  const lower = subCategory.toLowerCase();
  if (lower.includes("giày")) {
    return ["36", "37", "38", "39", "40", "41", "42", "43", "44", "45"];
  }
  if (lower.includes("quần áo")) {
    return ["S", "M", "L", "XL", "XXL"];
  }
  return [];
}

export function getProductImages(detail, fallbackUrl = "") {
  const images = Array.isArray(detail?.productImages)
    ? detail.productImages.map((item) => item.imageUrl).filter(Boolean)
    : [];
  if (images.length) return images;
  return fallbackUrl ? [fallbackUrl] : [];
}

export function uniqueById(products) {
  return [...new Map(products.map((item) => [item.id, item])).values()];
}
