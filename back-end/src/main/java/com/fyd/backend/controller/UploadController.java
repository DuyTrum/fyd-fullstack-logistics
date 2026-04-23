package com.fyd.backend.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Map;
import java.util.UUID;

/**
 * General file upload controller
 * Provides a public upload endpoint for review images, etc.
 */
@RestController
@RequestMapping("/api/upload")
public class UploadController {

    @Value("${file.upload-dir:uploads}")
    private String uploadDir;

    /**
     * Upload a single image file
     * Used by: review images, general purpose uploads
     * Returns: { url: "/uploads/reviews/filename.webp" }
     */
    @PostMapping
    public ResponseEntity<Map<String, Object>> uploadImage(
            @RequestParam("file") MultipartFile file) {

        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "error", "File is empty"
            ));
        }

        // Validate file type
        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "error", "Only image files are allowed"
            ));
        }

        // Validate file size (max 5MB)
        if (file.getSize() > 5 * 1024 * 1024) {
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "error", "File size must be less than 5MB"
            ));
        }

        try {
            // Create upload directory if not exists
            Path uploadPath = Paths.get(uploadDir, "reviews");
            if (!Files.exists(uploadPath)) {
                Files.createDirectories(uploadPath);
            }

            // Generate unique filename
            String newFilename = "review_" + UUID.randomUUID().toString().substring(0, 12) + ".webp";
            Path filePath = uploadPath.resolve(newFilename);

            // Try to convert to WebP with high quality
            try (var inputStream = file.getInputStream()) {
                BufferedImage image = ImageIO.read(inputStream);
                if (image == null) {
                    // Fallback: save as original format
                    String ext = getFileExtension(file.getOriginalFilename());
                    newFilename = "review_" + UUID.randomUUID().toString().substring(0, 12) + "." + ext;
                    filePath = uploadPath.resolve(newFilename);
                    Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);
                } else {
                    var writers = ImageIO.getImageWritersByFormatName("webp");
                    if (writers.hasNext()) {
                        var writer = writers.next();
                        var writeParam = writer.getDefaultWriteParam();
                        writeParam.setCompressionMode(javax.imageio.ImageWriteParam.MODE_EXPLICIT);
                        writeParam.setCompressionType(writeParam.getCompressionTypes()[0]);
                        writeParam.setCompressionQuality(0.9f); // 90% quality

                        try (var ios = ImageIO.createImageOutputStream(filePath.toFile())) {
                            writer.setOutput(ios);
                            writer.write(null, new javax.imageio.IIOImage(image, null, null), writeParam);
                            writer.dispose();
                        }
                    } else {
                        // Fallback if webp writer not available
                        String ext = getFileExtension(file.getOriginalFilename());
                        newFilename = "review_" + UUID.randomUUID().toString().substring(0, 12) + "." + ext;
                        filePath = uploadPath.resolve(newFilename);
                        Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);
                    }
                }
            }

            String url = "/uploads/reviews/" + newFilename;

            return ResponseEntity.ok(Map.of(
                "success", true,
                "url", url
            ));

        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of(
                "success", false,
                "error", "Upload failed: " + e.getMessage()
            ));
        }
    }

    private String getFileExtension(String filename) {
        if (filename == null || !filename.contains(".")) return "jpg";
        return filename.substring(filename.lastIndexOf(".") + 1).toLowerCase();
    }
}
