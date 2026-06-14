package com.example.websport.service.impl;

import com.example.websport.common.EnumStatus;
import com.example.websport.dto.request.ProductCreateReq;
import com.example.websport.dto.request.ProductUpdateReq;
import com.example.websport.dto.request.VariantReq;
import com.example.websport.dto.response.ProductDetailResponse;
import com.example.websport.dto.response.ProductListResponse;
import com.example.websport.entity.Category;
import com.example.websport.entity.Product;
import com.example.websport.entity.ProductImage;
import com.example.websport.entity.ProductVariant;
import com.example.websport.exception.NotFoundException;
import com.example.websport.repository.ProductImageRepo;
import com.example.websport.repository.ProductRepo;
import com.example.websport.repository.ProductVariantRepo;
import com.example.websport.service.CategoryService;
import com.example.websport.service.ProductService;
import jakarta.transaction.Transactional;
import lombok.AllArgsConstructor;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ProductServiceImpl implements ProductService {

    private final ProductRepo productRepo;
    private final CategoryService categoryService;
    private final ProductVariantRepo productVariantRepo;
    private final ProductImageRepo productImageRepo;

    @Override
    public List<ProductListResponse> getAllProducts() {
        List<Product> products = productRepo.findAll();
        return convertToDtoList(products);
    }

    //Tất cả quần áo
    //Tất cả giày
    // Tất cả dụng cụ
    // Tất cả phụ kiện

    @Override
    public List<ProductListResponse> getProductsByParentCategory(Long parentId) {
        List<Long> categoryIdsToSearch = new ArrayList<>();
        categoryIdsToSearch.add(parentId);

        // Gọi qua CategoryService
        List<Category> childCategories = categoryService.getChildCategories(parentId);

        if (childCategories != null && !childCategories.isEmpty()) {
            for (Category child : childCategories) {
                categoryIdsToSearch.add(child.getId()); // Hết lỗi gạch đỏ ở đây
            }
        }

        List<Product> products = productRepo.findByCategoryIdIn(categoryIdsToSearch);
        return convertToDtoList(products);
    }

    @Override
    public Page<ProductListResponse> getProductByCategorySlug(String slug, Long categoryId, Integer pageNumber, Integer pageSize) {
        // 1. Nhờ CategoryService dịch từ "cau-long" sang Entity Danh Mục
        Category parentCategory = categoryService.getCategoryBySlug(slug);

        // 2. Lấy ra ID thật của nó (ví dụ: số 1)
        Long parentId = parentCategory.getId();


        List<Long> availableCategoryIds = new ArrayList<>();
        availableCategoryIds.add(parentId);

        List<Category> childCategories = categoryService.getChildCategories(parentId);

        if (childCategories != null && !childCategories.isEmpty()) {
            for (Category child : childCategories) {
                availableCategoryIds.add(child.getId());
            }
        }

        int safePageNumber = pageNumber == null || pageNumber < 1 ? 1 : pageNumber;
        int safePageSize = pageSize == null || pageSize < 1 ? 6 : pageSize;
        Pageable pageable = PageRequest.of(safePageNumber - 1, safePageSize);

        List<Long> categoryIdsToSearch = availableCategoryIds;
        if (categoryId != null) {
            if (!availableCategoryIds.contains(categoryId)) {
                return new PageImpl<>(List.of(), pageable, 0);
            }
            categoryIdsToSearch = List.of(categoryId);
        }

        Page<Product> productPage = productRepo.findByCategoryIdIn(categoryIdsToSearch, pageable);
        List<ProductListResponse> dtoList = convertToDtoList(productPage.getContent());
        return new PageImpl<>(dtoList, pageable, productPage.getTotalElements());
    }

    @Override
    @Transactional
    public ProductListResponse createProduct(ProductCreateReq request) { // Tạo sản phẩm
//        System.out.println("TÊN: " + request.getName() + " | BRAND: " + request.getBrand());
//        System.out.println("TÊN: " + request.getName());
//        System.out.println("BRAND: " + request.getBrand());
//        System.out.println("CATE_ID: " + request.getCategoryId());
//        System.out.println("TYPE_ID: " + request.getTypeId());
//        System.out.println("DESC: " + request.getDescription());
        if (request.getName() == null
                || request.getBrand() == null
                || request.getCategoryId() == null
                || request.getTypeId() == null
                || request.getDescription() == null) {
            throw new RuntimeException("Vui long dien day du thong tin");
        }
        Product product = new Product();
        product.setName(request.getName());
        product.setBrand(request.getBrand());
        product.setCategoryId(request.getCategoryId());
        product.setTypeId(request.getTypeId());
        product.setDescription(request.getDescription());
        product.setStatus(EnumStatus.ACTIVE);

        // Nếu bạn đã cài jackson-databind thì mở dòng dưới ra:
        // product.setSpecifications(req.getSpecification());

        Product save = productRepo.save(product);


        if (request.getImageUrls() != null && !request.getImageUrls().isEmpty()) {
            List<ProductImage> imagesToSave = request.getImageUrls().stream()
                    .map(url -> ProductImage.builder()
                            .product(save) // Trỏ về cái ID sản phẩm vừa tạo ở trên
                            .imageUrl(url)
                            .build())
                    .collect(Collectors.toList());

            productImageRepo.saveAll(imagesToSave);
        }

        if (request.getVariants() != null && !request.getVariants().isEmpty()) {
            List<ProductVariant> variantsToSave = request.getVariants().stream()
                    .map(v -> ProductVariant.builder()
                            .product(save) // Móc nối với Product vừa tạo
                            .sku(v.getSku())
                            .color(v.getColor())
                            .size(v.getSize())
                            .price(v.getPrice())
                            .stockQuantity(v.getStockQuantity())
                            .build())
                    .collect(Collectors.toList());

            productVariantRepo.saveAll(variantsToSave);
        }

        return convertToDtoList(List.of(save)).get(0);
    }

    @Override
    public ProductListResponse updateProduct(Long id, ProductUpdateReq request) {
        Product product = productRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Product not found"));

        product.setName(request.getName());
        product.setBrand(request.getBrand());
        product.setCategoryId(request.getCategoryId());
        product.setTypeId(request.getTypeId());
        product.setDescription(request.getDescription());

//        if(request.getStatus() != null){
////            product.setStatus(request.getStatus().name());
//        }

        // Nếu bạn đã cài jackson-databind thì mở dòng dưới ra:
        // product.setSpecifications(req.getSpecification());

        Product update = productRepo.save(product);
        return convertToDtoList(List.of(update)).get(0);
    }

    @Override
    public void deleteProduct(Long id) {
        Product product = productRepo.findById(id)
                .orElseThrow(() -> new NotFoundException(HttpStatus.NOT_FOUND, "Product not found"));
        productRepo.delete(product);
    }

    @Override
    public ProductDetailResponse getProductDetail(Long id) { //Chi tiết sản phẩm
        // 1. Tìm sản phẩm gốc trong DB, nếu không thấy thì báo lỗi
        Product product = productRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy sản phẩm có ID: " + id));

        // 2.1. Chuyển đổi danh sách biến thể từ Entity sang DTO (đã cập nhật theo đúng các cột SKU, stockQuantity của bạn)
        List<ProductDetailResponse.VariantDetailDto> variantDtos = null;
        if (product.getProductVariants() != null) {
            variantDtos = product.getProductVariants().stream().map(v ->
                    ProductDetailResponse.VariantDetailDto.builder()
                            .id(v.getId())
                            .sku(v.getSku())
                            .color(v.getColor())
                            .size(v.getSize())
                            .price(v.getPrice())
                            .stockQuantity(v.getStockQuantity())
                            .build()
            ).collect(Collectors.toList());
        }

        // 2.2. CHUYỂN ĐỔI MẢNG HÌNH ẢNH
        List<ProductDetailResponse.ImageDetailDto> imageDetailDtos = null;
        if (product.getProductImages() != null) {
            imageDetailDtos = product.getProductImages().stream().map(img -> ProductDetailResponse.ImageDetailDto.builder()
                    .id(img.getId())
                    .imageUrl(img.getImageUrl())
                    .build()
            ).collect(Collectors.toList());
        }


        // 3. Đóng gói toàn bộ thông tin gốc + mảng biến thể vào DTO chi tiết
        return ProductDetailResponse.builder()
                .id(product.getId())
                .name(product.getName())
                .brand(product.getBrand())
                .categoryId(product.getCategoryId())
                .typeId(product.getTypeId())
                .description(product.getDescription())
                .status(product.getStatus())
                .productVariants(variantDtos)
                .productImages(imageDetailDtos)
                .build();
    }

    @Override
    public void addVariantsToProduct(Long productId, List<VariantReq> variantReqs) { //Thêm variants
        // 1. Tìm Sản phẩm gốc xem có tồn tại không
        Product product = productRepo.findById(productId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy Sản phẩm    : " + productId));

        // 2. Chuyển đổi từ DTO sang Entity và móc nối với Product
        List<ProductVariant> variants = new ArrayList<>();
        for (VariantReq req : variantReqs) {
            ProductVariant variant = new ProductVariant();
            variant.setProduct(product); // Quan trọng: Gắn ID sản phẩm cha vào đây
            variant.setSku(req.getSku());
            variant.setColor(req.getColor());
            variant.setSize(req.getSize());
            variant.setPrice(req.getPrice());
            variant.setStockQuantity(req.getStockQuantity());

            variants.add(variant);
        }

        // 3. Lưu toàn bộ mảng Biến thể vào Database
        productVariantRepo.saveAll(variants);
    }

    // tìm và lọc filter
    @Override
    public List<ProductListResponse> filter(String name, String brand, String size, Double minPrice, Double maxPrice) {
        List<Product> products = productRepo.searchAndFilterProducts(name, brand, size, minPrice, maxPrice);
        return convertToDtoList(products);
    }

    private List<ProductListResponse> convertToDtoList(List<Product> products) {
        return products.stream().map(p -> {

            // 1. Móc chính xác giá từ biến thể (variant) đầu tiên ra
            Double exactPrice = 0.0;
            if (p.getProductVariants() != null && !p.getProductVariants().isEmpty()) {
                exactPrice = p.getProductVariants().get(0).getPrice().doubleValue();
            }

            // 2. Build dữ liệu trả về
            return ProductListResponse.builder()
                    .id(p.getId())
                    .name(p.getName())
                    .brand(p.getBrand())
                    .categoryId(p.getCategoryId())
                    .typeId(p.getTypeId())
                    .price(exactPrice) // <--- Đã sửa thành price và truyền giá thật vào đây!
                    .imageUrl(p.getProductImages() != null && !p.getProductImages().isEmpty()
                            ? p.getProductImages().get(0).getImageUrl()
                            : null)
                    .build();
        }).collect(Collectors.toList());


    }
}
