package com.fyd.backend.service;

import com.fyd.backend.dto.*;
import com.fyd.backend.entity.*;
import com.fyd.backend.repository.*;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Service for importing products from Excel files
 * Handles template generation, parsing, validation, and import execution
 */
@Service
public class ProductImportService {
    
    @Autowired
    private ProductRepository productRepository;
    
    @Autowired
    private CategoryRepository categoryRepository;
    
    @Autowired
    private BrandRepository brandRepository;
    
    @Autowired
    private SizeRepository sizeRepository;
    
    @Autowired
    private ColorRepository colorRepository;
    
    @Autowired
    private ProductVariantRepository productVariantRepository;
    
    /**
     * Generate Excel template with headers and sample data
     */
    public byte[] generateTemplate() throws IOException {
        Workbook workbook = new XSSFWorkbook();
        Sheet sheet = workbook.createSheet("Products");
        
        // Create header style
        CellStyle headerStyle = workbook.createCellStyle();
        Font headerFont = workbook.createFont();
        headerFont.setBold(true);
        headerStyle.setFont(headerFont);
        headerStyle.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
        headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        
        // Create header row
        Row headerRow = sheet.createRow(0);
        String[] headers = {
            "SKU*", "Name*", "Category", "Brand", "BasePrice*", "SalePrice", 
            "CostPrice", "Description", "ShortDescription", "Material", 
            "InitialStock*", "Size", "Color", "Status"
        };
        
        for (int i = 0; i < headers.length; i++) {
            Cell cell = headerRow.createCell(i);
            cell.setCellValue(headers[i]);
            cell.setCellStyle(headerStyle);
            sheet.setColumnWidth(i, 4000);
        }
        
        // Add sample data rows
        addSampleRow(sheet, 1, "FYD-TS-001", "Áo thun FYD Premium", "Áo thun", "FYD Original", 
                    299000, Double.valueOf(249000), 150000, "Áo thun cotton cao cấp...", "Áo thun basic thoải mái", 
                    "Cotton 100%", 100, "M", "Đen", "ACTIVE");
        
        addSampleRow(sheet, 2, "FYD-PL-001", "Áo polo FYD Classic", "Áo polo", "FYD Original", 
                    399000, null, 200000, "Áo polo lịch sự...", "Áo polo công sở", 
                    "Cotton blend", 50, "L", "Trắng", "ACTIVE");
        
        // Write to byte array
        ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
        workbook.write(outputStream);
        workbook.close();
        
        return outputStream.toByteArray();
    }
    
    private void addSampleRow(Sheet sheet, int rowNum, String sku, String name, String category,
                             String brand, double basePrice, Double salePrice, double costPrice,
                             String description, String shortDescription, String material,
                             int stock, String size, String color, String status) {
        Row row = sheet.createRow(rowNum);
        row.createCell(0).setCellValue(sku);
        row.createCell(1).setCellValue(name);
        row.createCell(2).setCellValue(category);
        row.createCell(3).setCellValue(brand);
        row.createCell(4).setCellValue(basePrice);
        if (salePrice != null) {
            row.createCell(5).setCellValue(salePrice.doubleValue());
        }
        row.createCell(6).setCellValue(costPrice);
        row.createCell(7).setCellValue(description);
        row.createCell(8).setCellValue(shortDescription);
        row.createCell(9).setCellValue(material);
        row.createCell(10).setCellValue(stock);
        row.createCell(11).setCellValue(size);
        row.createCell(12).setCellValue(color);
        row.createCell(13).setCellValue(status);
    }
    
    /**
     * Parse Excel file to ProductImportRow DTOs
     */
    public List<ProductImportRow> parseExcel(MultipartFile file) throws IOException {
        List<ProductImportRow> rows = new ArrayList<>();
        
        Workbook workbook = new XSSFWorkbook(file.getInputStream());
        Sheet sheet = workbook.getSheetAt(0);
        
        // Skip header row, start from row 1
        for (int i = 1; i <= sheet.getLastRowNum(); i++) {
            Row row = sheet.getRow(i);
            if (row == null || isRowEmpty(row)) {
                continue;
            }
            
            ProductImportRow importRow = new ProductImportRow();
            importRow.setRowNumber(i + 1); // Excel row number (1-based)
            importRow.setSku(getCellValueAsString(row.getCell(0)));
            importRow.setName(getCellValueAsString(row.getCell(1)));
            importRow.setCategory(getCellValueAsString(row.getCell(2)));
            importRow.setBrand(getCellValueAsString(row.getCell(3)));
            importRow.setBasePrice(getCellValueAsBigDecimal(row.getCell(4)));
            importRow.setSalePrice(getCellValueAsBigDecimal(row.getCell(5)));
            importRow.setCostPrice(getCellValueAsBigDecimal(row.getCell(6)));
            importRow.setDescription(getCellValueAsString(row.getCell(7)));
            importRow.setShortDescription(getCellValueAsString(row.getCell(8)));
            importRow.setMaterial(getCellValueAsString(row.getCell(9)));
            importRow.setInitialStock(getCellValueAsInteger(row.getCell(10)));
            importRow.setSize(getCellValueAsString(row.getCell(11)));
            importRow.setColor(getCellValueAsString(row.getCell(12)));
            importRow.setStatus(getCellValueAsString(row.getCell(13)));
            
            rows.add(importRow);
        }
        
        workbook.close();
        return rows;
    }
    
    private boolean isRowEmpty(Row row) {
        for (int i = 0; i < 14; i++) {
            Cell cell = row.getCell(i);
            if (cell != null && cell.getCellType() != CellType.BLANK) {
                return false;
            }
        }
        return true;
    }
    
    private String getCellValueAsString(Cell cell) {
        if (cell == null) return null;
        
        switch (cell.getCellType()) {
            case STRING:
                return cell.getStringCellValue().trim();
            case NUMERIC:
                return String.valueOf((long) cell.getNumericCellValue());
            case BOOLEAN:
                return String.valueOf(cell.getBooleanCellValue());
            default:
                return null;
        }
    }
    
    private BigDecimal getCellValueAsBigDecimal(Cell cell) {
        if (cell == null) return null;
        
        try {
            if (cell.getCellType() == CellType.NUMERIC) {
                return BigDecimal.valueOf(cell.getNumericCellValue());
            } else if (cell.getCellType() == CellType.STRING) {
                String value = cell.getStringCellValue().trim();
                if (value.isEmpty()) return null;
                return new BigDecimal(value);
            }
        } catch (Exception e) {
            return null;
        }
        return null;
    }
    
    private Integer getCellValueAsInteger(Cell cell) {
        if (cell == null) return null;
        
        try {
            if (cell.getCellType() == CellType.NUMERIC) {
                return (int) cell.getNumericCellValue();
            } else if (cell.getCellType() == CellType.STRING) {
                String value = cell.getStringCellValue().trim();
                if (value.isEmpty()) return null;
                return Integer.parseInt(value);
            }
        } catch (Exception e) {
            return null;
        }
        return null;
    }
    
    /**
     * Validate a single import row
     */
    public ValidationResult validateRow(ProductImportRow row, int rowNumber) {
        ValidationResult result = new ValidationResult(rowNumber);
        
        // Required field validations
        if (row.getSku() == null || row.getSku().trim().isEmpty()) {
            result.addError("SKU is required");
        } else if (row.getSku().length() > 50) {
            result.addError("SKU must be max 50 characters");
        } else if (productRepository.existsBySku(row.getSku())) {
            result.addError("SKU already exists");
        }
        
        if (row.getName() == null || row.getName().trim().isEmpty()) {
            result.addError("Name is required");
        } else if (row.getName().length() > 255) {
            result.addError("Name must be max 255 characters");
        }
        
        if (row.getBasePrice() == null) {
            result.addError("BasePrice is required");
        } else if (row.getBasePrice().compareTo(BigDecimal.ZERO) <= 0) {
            result.addError("BasePrice must be greater than 0");
        }
        
        if (row.getInitialStock() == null) {
            result.addError("InitialStock is required");
        } else if (row.getInitialStock() < 0) {
            result.addError("InitialStock must be >= 0");
        }
        
        // Category validation
        if (row.getCategory() != null && !row.getCategory().trim().isEmpty()) {
            if (findCategoryByName(row.getCategory()) == null) {
                result.addError("Category '" + row.getCategory() + "' not found");
            }
        }
        
        // Brand validation (optional)
        if (row.getBrand() != null && !row.getBrand().trim().isEmpty()) {
            if (findBrandByName(row.getBrand()) == null) {
                result.addError("Brand '" + row.getBrand() + "' not found");
            }
        }
        
        // Status validation
        if (row.getStatus() != null && !row.getStatus().trim().isEmpty()) {
            if (!row.getStatus().equals("ACTIVE") && !row.getStatus().equals("INACTIVE")) {
                result.addError("Status must be ACTIVE or INACTIVE");
            }
        }
        
        return result;
    }
    
    /**
     * Import valid products into database
     */
    @Transactional
    public ImportResultDTO importProducts(List<ProductImportRow> rows) {
        ImportResultDTO result = new ImportResultDTO();
        
        for (ProductImportRow row : rows) {
            try {
                // Validate row
                ValidationResult validation = validateRow(row, row.getRowNumber());
                if (!validation.isValid()) {
                    result.incrementFailure("Row " + row.getRowNumber() + ": " + 
                                          String.join(", ", validation.getErrors()));
                    continue;
                }
                
                // Create product
                Product product = new Product();
                product.setSku(row.getSku());
                product.setName(row.getName());
                product.setSlug(generateSlug(row.getSku()));
                
                // Set category
                if (row.getCategory() != null && !row.getCategory().trim().isEmpty()) {
                    Category category = findCategoryByName(row.getCategory());
                    product.setCategory(category);
                }
                
                // Set brand
                if (row.getBrand() != null && !row.getBrand().trim().isEmpty()) {
                    Brand brand = findBrandByName(row.getBrand());
                    product.setBrand(brand);
                }
                
                product.setBasePrice(row.getBasePrice());
                product.setSalePrice(row.getSalePrice());
                product.setDescription(row.getDescription());
                product.setShortDescription(row.getShortDescription());
                product.setMaterial(row.getMaterial());
                product.setStatus(row.getStatus() != null ? row.getStatus() : "ACTIVE");
                product.setIsFeatured(false);
                product.setIsNew(true);
                product.setViewCount(0);
                product.setSoldCount(0);
                product.setCreatedAt(LocalDateTime.now());
                product.setUpdatedAt(LocalDateTime.now());
                
                // Save product
                product = productRepository.save(product);
                
                // Create default variant with initial stock
                ProductVariant variant = new ProductVariant();
                variant.setProduct(product);
                
                // Set size if provided
                if (row.getSize() != null && !row.getSize().trim().isEmpty()) {
                    Size size = findSizeByName(row.getSize());
                    variant.setSize(size);
                }
                
                // Set color if provided
                if (row.getColor() != null && !row.getColor().trim().isEmpty()) {
                    com.fyd.backend.entity.Color color = findColorByName(row.getColor());
                    variant.setColor(color);
                }
                
                variant.setSkuVariant(row.getSku() + "-DEFAULT");
                variant.setPriceAdjustment(BigDecimal.ZERO);
                variant.setStockQuantity(row.getInitialStock());
                variant.setStatus("ACTIVE");
                variant.setCreatedAt(LocalDateTime.now());
                variant.setUpdatedAt(LocalDateTime.now());
                
                productVariantRepository.save(variant);
                
                result.incrementSuccess(product.getId());
                
            } catch (Exception e) {
                result.incrementFailure("Row " + row.getRowNumber() + ": " + e.getMessage());
            }
        }
        
        return result;
    }
    
    // Helper methods
    
    private Category findCategoryByName(String name) {
        return categoryRepository.findByName(name).orElse(null);
    }
    
    private Brand findBrandByName(String name) {
        return brandRepository.findByName(name).orElse(null);
    }
    
    private Size findSizeByName(String name) {
        return sizeRepository.findByName(name).orElse(null);
    }
    
    private com.fyd.backend.entity.Color findColorByName(String name) {
        return colorRepository.findByName(name).orElse(null);
    }
    
    private String generateSlug(String sku) {
        return sku.toLowerCase()
                  .replaceAll("[^a-z0-9-]", "-")
                  .replaceAll("-+", "-")
                  .replaceAll("^-|-$", "");
    }
}
