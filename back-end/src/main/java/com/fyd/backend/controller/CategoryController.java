package com.fyd.backend.controller;

import com.fyd.backend.annotation.Loggable;
import com.fyd.backend.dto.CategoryDTO;
import com.fyd.backend.entity.Category;
import com.fyd.backend.repository.CategoryRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/categories")
public class CategoryController {

    @Autowired
    private CategoryRepository categoryRepository;

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> getCategories() {
        List<Category> rootCategories = categoryRepository.findRootCategories();
        List<Map<String, Object>> result = new ArrayList<>();
        
        for (Category root : rootCategories) {
            Map<String, Object> cat = categoryToMap(root);
            List<Category> children = categoryRepository.findByParentId(root.getId());
            cat.put("children", children.stream()
                .map(this::categoryToMap)
                .collect(Collectors.toList()));
            result.add(cat);
        }
        
        return ResponseEntity.ok(result);
    }

    @GetMapping("/flat")
    public ResponseEntity<List<Map<String, Object>>> getCategoriesFlat() {
        List<Category> categories = categoryRepository.findAllActive();
        List<Map<String, Object>> result = categories.stream()
            .map(this::categoryToMap)
            .collect(Collectors.toList());
        return ResponseEntity.ok(result);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> getCategory(@PathVariable Long id) {
        return categoryRepository.findById(id)
            .map(this::categoryToMap)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    @Loggable(action = "CREATE", entityType = "Category")
    public ResponseEntity<Map<String, Object>> createCategory(@RequestBody CategoryDTO dto) {
        try {
            // Check slug uniqueness
            if (dto.getSlug() != null && categoryRepository.findBySlug(dto.getSlug()).isPresent()) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Slug đã tồn tại"));
            }

            Category category = new Category();
            category.setName(dto.getName());
            category.setSlug(dto.getSlug() != null ? dto.getSlug() : generateSlug(dto.getName()));
            category.setDescription(dto.getDescription());
            category.setImageUrl(dto.getImageUrl());
            category.setSortOrder(dto.getSortOrder() != null ? dto.getSortOrder() : 0);
            category.setStatus("ACTIVE");
            category.setCreatedAt(LocalDateTime.now());

            // Set parent if provided
            if (dto.getParentId() != null) {
                categoryRepository.findById(dto.getParentId())
                    .ifPresent(category::setParent);
            }

            Category saved = categoryRepository.save(category);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("data", categoryToMap(saved));
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    @PutMapping("/{id}")
    @Loggable(action = "UPDATE", entityType = "Category")
    public ResponseEntity<Map<String, Object>> updateCategory(@PathVariable Long id, @RequestBody CategoryDTO dto) {
        return categoryRepository.findById(id)
            .map(category -> {
                if (dto.getName() != null) category.setName(dto.getName());
                if (dto.getSlug() != null) category.setSlug(dto.getSlug());
                if (dto.getDescription() != null) category.setDescription(dto.getDescription());
                if (dto.getImageUrl() != null) category.setImageUrl(dto.getImageUrl());
                if (dto.getSortOrder() != null) category.setSortOrder(dto.getSortOrder());
                if (dto.getStatus() != null) category.setStatus(dto.getStatus());
                
                if (dto.getParentId() != null) {
                    categoryRepository.findById(dto.getParentId())
                        .ifPresent(category::setParent);
                } else {
                    category.setParent(null);
                }
                
                category.setUpdatedAt(LocalDateTime.now());
                Category saved = categoryRepository.save(category);
                
                Map<String, Object> response = new HashMap<>();
                response.put("success", true);
                response.put("data", categoryToMap(saved));
                return ResponseEntity.ok(response);
            })
            .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @Loggable(action = "DELETE", entityType = "Category")
    public ResponseEntity<Map<String, Object>> deleteCategory(@PathVariable Long id) {
        return categoryRepository.findById(id)
            .map(category -> {
                // Soft delete - set status to INACTIVE
                category.setStatus("INACTIVE");
                category.setUpdatedAt(LocalDateTime.now());
                categoryRepository.save(category);
                
                Map<String, Object> response = new HashMap<>();
                response.put("success", true);
                response.put("message", "Đã xóa danh mục");
                return ResponseEntity.ok(response);
            })
            .orElse(ResponseEntity.notFound().build());
    }

    private Map<String, Object> categoryToMap(Category c) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", c.getId());
        map.put("name", c.getName());
        map.put("slug", c.getSlug());
        map.put("description", c.getDescription());
        map.put("image", c.getImageUrl());
        map.put("parentId", c.getParent() != null ? c.getParent().getId() : null);
        map.put("sortOrder", c.getSortOrder());
        map.put("status", c.getStatus());
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
}
