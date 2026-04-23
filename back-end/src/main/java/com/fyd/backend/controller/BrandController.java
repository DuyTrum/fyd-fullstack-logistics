package com.fyd.backend.controller;

import com.fyd.backend.entity.Brand;
import com.fyd.backend.repository.BrandRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequestMapping("/api/brands")
public class BrandController {

    @Autowired
    private BrandRepository brandRepository;

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> getAllBrands() {
        List<Brand> brands = brandRepository.findAllActive();
        List<Map<String, Object>> result = new ArrayList<>();
        for (Brand b : brands) {
            result.add(brandToMap(b));
        }
        return ResponseEntity.ok(result);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> getBrand(@PathVariable Long id) {
        return brandRepository.findById(id)
            .map(this::brandToMap)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> createBrand(@RequestBody BrandDTO dto) {
        try {
            // Check slug uniqueness
            String slug = dto.getSlug() != null ? dto.getSlug() : generateSlug(dto.getName());
            if (brandRepository.findBySlug(slug).isPresent()) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Slug đã tồn tại"));
            }

            Brand brand = new Brand();
            brand.setName(dto.getName());
            brand.setSlug(slug);
            brand.setDescription(dto.getDescription());
            brand.setLogoUrl(dto.getLogoUrl());
            brand.setStatus("ACTIVE");
            brand.setCreatedAt(LocalDateTime.now());

            Brand saved = brandRepository.save(brand);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("data", brandToMap(saved));
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<Map<String, Object>> updateBrand(@PathVariable Long id, @RequestBody BrandDTO dto) {
        return brandRepository.findById(id)
            .map(brand -> {
                if (dto.getName() != null) brand.setName(dto.getName());
                if (dto.getSlug() != null) brand.setSlug(dto.getSlug());
                if (dto.getDescription() != null) brand.setDescription(dto.getDescription());
                if (dto.getLogoUrl() != null) brand.setLogoUrl(dto.getLogoUrl());
                if (dto.getStatus() != null) brand.setStatus(dto.getStatus());
                
                brand.setUpdatedAt(LocalDateTime.now());
                Brand saved = brandRepository.save(brand);
                
                Map<String, Object> response = new HashMap<>();
                response.put("success", true);
                response.put("data", brandToMap(saved));
                return ResponseEntity.ok(response);
            })
            .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, Object>> deleteBrand(@PathVariable Long id) {
        return brandRepository.findById(id)
            .map(brand -> {
                // Soft delete
                brand.setStatus("INACTIVE");
                brand.setUpdatedAt(LocalDateTime.now());
                brandRepository.save(brand);
                
                Map<String, Object> response = new HashMap<>();
                response.put("success", true);
                response.put("message", "Đã xóa thương hiệu");
                return ResponseEntity.ok(response);
            })
            .orElse(ResponseEntity.notFound().build());
    }

    private Map<String, Object> brandToMap(Brand b) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", b.getId());
        map.put("name", b.getName());
        map.put("slug", b.getSlug());
        map.put("description", b.getDescription());
        map.put("logoUrl", b.getLogoUrl());
        map.put("status", b.getStatus());
        return map;
    }

    private String generateSlug(String name) {
        if (name == null) return "";
        return name.toLowerCase()
            .replaceAll("[áàảãạâấầẩẫậăắằẳẵặ]", "a")
            .replaceAll("[éèẻẽẹêếềểễệ]", "e")
            .replaceAll("[íìỉĩị]", "i")
            .replaceAll("[óòỏõọôốồổỗộơớờởỡợ]", "o")
            .replaceAll("[úùủũụưứừửữự]", "u")
            .replaceAll("[ýỳỷỹỵ]", "y")
            .replaceAll("[đ]", "d")
            .replaceAll("[^a-z0-9\\s-]", "")
            .replaceAll("\\s+", "-")
            .replaceAll("-+", "-")
            .replaceAll("^-|-$", "");
    }

    // Inner DTO class
    public static class BrandDTO {
        private String name;
        private String slug;
        private String description;
        private String logoUrl;
        private String status;

        public String getName() { return name; }
        public void setName(String name) { this.name = name; }
        public String getSlug() { return slug; }
        public void setSlug(String slug) { this.slug = slug; }
        public String getDescription() { return description; }
        public void setDescription(String description) { this.description = description; }
        public String getLogoUrl() { return logoUrl; }
        public void setLogoUrl(String logoUrl) { this.logoUrl = logoUrl; }
        public String getStatus() { return status; }
        public void setStatus(String status) { this.status = status; }
    }
}
