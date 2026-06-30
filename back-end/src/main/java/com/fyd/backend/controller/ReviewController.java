package com.fyd.backend.controller;

import com.fyd.backend.annotation.Loggable;
import com.fyd.backend.dto.ReviewDTO;
import com.fyd.backend.entity.Review;
import com.fyd.backend.repository.CustomerRepository;
import com.fyd.backend.repository.OrderRepository;
import com.fyd.backend.repository.ProductRepository;
import com.fyd.backend.repository.ReviewRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/reviews")
public class ReviewController {

    @Autowired
    private ReviewRepository reviewRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private CustomerRepository customerRepository;

    @Autowired
    private OrderRepository orderRepository;

    // ============ PUBLIC ENDPOINTS (Shop) ============

    /**
     * Get approved reviews for a product
     */
    @GetMapping("/product/{productId}")
    public ResponseEntity<Map<String, Object>> getProductReviews(
            @PathVariable Long productId,
            @RequestParam(required = false) Long customerId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "5") int size,
            @RequestParam(required = false) Integer rating,
            @RequestParam(required = false) Boolean hasPhotos,
            @RequestParam(defaultValue = "newest") String sort) {

        // 1. Calculate overall stats for ALL approved reviews of this product
        List<Review> allApproved = reviewRepository.findByProductIdAndStatus(productId, "APPROVED");

        Double avgRating = allApproved.stream().mapToInt(Review::getRating).average().orElse(0.0);
        long totalReviews = allApproved.size();

        Map<Integer, Long> distribution = new HashMap<>();
        for (int i = 1; i <= 5; i++) {
            distribution.put(i, 0L);
        }
        for (Review r : allApproved) {
            distribution.put(r.getRating(), distribution.getOrDefault(r.getRating(), 0L) + 1);
        }

        long withPhotosCount = allApproved.stream()
            .filter(r -> r.getImageUrls() != null && !r.getImageUrls().isEmpty() && !r.getImageUrls().equals("[]"))
            .count();

        List<String> allImages = allApproved.stream()
            .filter(r -> r.getImageUrls() != null && !r.getImageUrls().isEmpty() && !r.getImageUrls().equals("[]"))
            .flatMap(r -> {
                try {
                    String urlsStr = r.getImageUrls().trim();
                    if (urlsStr.startsWith("[") && urlsStr.endsWith("]")) {
                        urlsStr = urlsStr.substring(1, urlsStr.length() - 1);
                    }
                    String[] parts = urlsStr.split(",");
                    java.util.List<String> list = new java.util.ArrayList<>();
                    for (String part : parts) {
                        String clean = part.replace("\"", "").replace("'", "").trim();
                        if (!clean.isEmpty()) {
                            list.add(clean);
                        }
                    }
                    return list.stream();
                } catch (Exception e) {
                    return java.util.stream.Stream.empty();
                }
            })
            .collect(Collectors.toList());

        // 2. Perform sorting & pagination on the filtered reviews
        Sort sorting = Sort.by("createdAt").descending();
        if ("highest".equalsIgnoreCase(sort)) {
            sorting = Sort.by("rating").descending().and(Sort.by("createdAt").descending());
        } else if ("lowest".equalsIgnoreCase(sort)) {
            sorting = Sort.by("rating").ascending().and(Sort.by("createdAt").descending());
        } else if ("helpful".equalsIgnoreCase(sort)) {
            sorting = Sort.by("helpfulCount").descending().and(Sort.by("createdAt").descending());
        }

        PageRequest pageRequest = PageRequest.of(page, size, sorting);
        Page<Review> reviewPage = reviewRepository.findProductReviews(productId, rating, hasPhotos, pageRequest);
        List<ReviewDTO> paginatedReviews = reviewPage.getContent().stream()
            .map(ReviewDTO::fromEntity)
            .collect(Collectors.toList());

        // 3. Construct response
        Map<String, Object> response = new HashMap<>();
        response.put("reviews", paginatedReviews);
        response.put("averageRating", avgRating);
        response.put("totalReviews", totalReviews);
        response.put("ratingDistribution", distribution);
        response.put("withPhotosCount", withPhotosCount);
        response.put("allImages", allImages);
        response.put("currentPage", reviewPage.getNumber());
        response.put("totalItems", reviewPage.getTotalElements());
        response.put("totalPages", reviewPage.getTotalPages());

        // Eligibility check if customerId is provided
        if (customerId != null) {
            boolean alreadyReviewed = reviewRepository.existsByProductIdAndCustomerId(productId, customerId);
            boolean hasPurchased = orderRepository.existsByCustomerIdAndProductId(customerId, productId);
            response.put("canReview", !alreadyReviewed && hasPurchased);
            response.put("alreadyReviewed", alreadyReviewed);
            response.put("hasPurchased", hasPurchased);
        }

        return ResponseEntity.ok(response);
    }

    /**
     * Create a new review (customer)
     */
    @PostMapping
    public ResponseEntity<Map<String, Object>> createReview(@RequestBody ReviewDTO dto) {
        Map<String, Object> response = new HashMap<>();

        // Validate required fields
        if (dto.getProductId() == null || dto.getCustomerId() == null || dto.getRating() == null) {
            response.put("success", false);
            response.put("message", "Thiếu thông tin bắt buộc");
            return ResponseEntity.badRequest().body(response);
        }

        // Check if customer already reviewed this product
        if (reviewRepository.existsByProductIdAndCustomerId(dto.getProductId(), dto.getCustomerId())) {
            response.put("success", false);
            response.put("message", "Bạn đã đánh giá sản phẩm này rồi");
            return ResponseEntity.badRequest().body(response);
        }

        // Validate rating range
        if (dto.getRating() < 1 || dto.getRating() > 5) {
            response.put("success", false);
            response.put("message", "Đánh giá phải từ 1 đến 5 sao");
            return ResponseEntity.badRequest().body(response);
        }

        return productRepository.findById(dto.getProductId())
            .flatMap(product -> customerRepository.findById(dto.getCustomerId())
                .map(customer -> {
                    // 1. Check if customer already reviewed this product
                    if (reviewRepository.existsByProductIdAndCustomerId(product.getId(), customer.getId())) {
                        response.put("success", false);
                        response.put("message", "Bạn đã đánh giá sản phẩm này rồi");
                        return ResponseEntity.badRequest().body(response);
                    }

                    // 2. Check if customer has purchased and received the product (DELIVERED/COMPLETED)
                    boolean hasPurchased = orderRepository.existsByCustomerIdAndProductId(
                        customer.getId(), product.getId());
                    
                    if (!hasPurchased) {
                        response.put("success", false);
                        response.put("message", "Bạn chỉ có thể đánh giá sản phẩm này sau khi đã mua và nhận hàng thành công");
                        return ResponseEntity.badRequest().body(response);
                    }

                    Review review = new Review();
                    review.setProduct(product);
                    review.setCustomer(customer);
                    review.setRating(dto.getRating());
                    review.setTitle(dto.getTitle());
                    review.setContent(dto.getContent());
                    review.setImageUrls(dto.getImageUrls());
                    review.setStatus("PENDING"); // Need admin approval
                    review.setIsVerifiedPurchase(true); // Must be true if passed the check above

                    Review saved = reviewRepository.save(review);

                    response.put("success", true);
                    response.put("message", "Đánh giá đã được gửi và đang chờ duyệt");
                    response.put("review", ReviewDTO.fromEntity(saved));
                    return ResponseEntity.ok(response);
                }))
            .orElseGet(() -> {
                response.put("success", false);
                response.put("message", "Không tìm thấy sản phẩm hoặc khách hàng");
                return ResponseEntity.badRequest().body(response);
            });
    }

    // ============ ADMIN ENDPOINTS ============

    /**
     * Get all reviews for admin (paginated)
     */
    @GetMapping
    public ResponseEntity<Map<String, Object>> getAllReviews(
            @RequestParam(defaultValue = "") String q,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Integer rating,
            @RequestParam(required = false) Long productId,
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        LocalDateTime start = null;
        if (startDate != null && !startDate.isEmpty()) {
            try {
                if (startDate.contains("T")) {
                    start = LocalDateTime.parse(startDate);
                } else {
                    start = java.time.LocalDate.parse(startDate).atStartOfDay();
                }
            } catch (Exception e) {
                // ignore
            }
        }
        LocalDateTime end = null;
        if (endDate != null && !endDate.isEmpty()) {
            try {
                if (endDate.contains("T")) {
                    end = LocalDateTime.parse(endDate);
                } else {
                    end = java.time.LocalDate.parse(endDate).atTime(java.time.LocalTime.MAX);
                }
            } catch (Exception e) {
                // ignore
            }
        }

        String queryParam = q.trim();
        String statusParam = (status == null || status.isEmpty() || status.equalsIgnoreCase("all")) ? null : status;

        PageRequest pageRequest = PageRequest.of(page, size, Sort.by("createdAt").descending());
        Page<Review> reviewPage = reviewRepository.adminSearch(
                queryParam,
                statusParam,
                rating,
                productId,
                start,
                end,
                pageRequest
        );

        List<ReviewDTO> reviews = reviewPage.getContent().stream()
            .map(ReviewDTO::fromEntity)
            .collect(Collectors.toList());

        Map<String, Object> response = new HashMap<>();
        response.put("reviews", reviews);
        response.put("currentPage", reviewPage.getNumber());
        response.put("totalItems", reviewPage.getTotalElements());
        response.put("totalPages", reviewPage.getTotalPages());
        
        // Global stats for top summary cards
        response.put("totalReviews", reviewRepository.count());
        response.put("pendingCount", reviewRepository.countPending());
        response.put("approvedCount", reviewRepository.countApproved());
        response.put("rejectedCount", reviewRepository.countRejected());
        response.put("averageRating", reviewRepository.getAverageRating());

        return ResponseEntity.ok(response);
    }

    /**
     * Get single review
     */
    @GetMapping("/{id}")
    public ResponseEntity<ReviewDTO> getReview(@PathVariable Long id) {
        return reviewRepository.findById(id)
            .map(ReviewDTO::fromEntity)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Update review status (approve/reject)
     */
    @PatchMapping("/{id}/status")
    @Loggable(action = "UPDATE", entityType = "Review")
    public ResponseEntity<Map<String, Object>> updateStatus(
            @PathVariable Long id,
            @RequestParam String status) {
        
        Map<String, Object> response = new HashMap<>();

        if (!status.equals("APPROVED") && !status.equals("REJECTED") && !status.equals("PENDING")) {
            response.put("success", false);
            response.put("message", "Trạng thái không hợp lệ");
            return ResponseEntity.badRequest().body(response);
        }

        return reviewRepository.findById(id)
            .map(review -> {
                review.setStatus(status);
                Review saved = reviewRepository.save(review);

                response.put("success", true);
                response.put("message", status.equals("APPROVED") ? "Đã duyệt đánh giá" : "Đã từ chối đánh giá");
                response.put("review", ReviewDTO.fromEntity(saved));
                return ResponseEntity.ok(response);
            })
            .orElseGet(() -> {
                response.put("success", false);
                response.put("message", "Không tìm thấy đánh giá");
                return ResponseEntity.notFound().build();
            });
    }

    /**
     * Admin reply to review
     */
    @PatchMapping("/{id}/reply")
    @Loggable(action = "UPDATE", entityType = "Review")
    public ResponseEntity<Map<String, Object>> replyToReview(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        
        Map<String, Object> response = new HashMap<>();
        String reply = body.get("reply");

        return reviewRepository.findById(id)
            .map(review -> {
                review.setAdminReply(reply);
                review.setAdminReplyAt(LocalDateTime.now());
                Review saved = reviewRepository.save(review);

                response.put("success", true);
                response.put("message", "Đã gửi phản hồi");
                response.put("review", ReviewDTO.fromEntity(saved));
                return ResponseEntity.ok(response);
            })
            .orElseGet(() -> {
                response.put("success", false);
                response.put("message", "Không tìm thấy đánh giá");
                return ResponseEntity.notFound().build();
            });
    }

    /**
     * Delete review
     */
    @DeleteMapping("/{id}")
    @Loggable(action = "DELETE", entityType = "Review")
    public ResponseEntity<Map<String, Object>> deleteReview(@PathVariable Long id) {
        Map<String, Object> response = new HashMap<>();

        if (reviewRepository.existsById(id)) {
            reviewRepository.deleteById(id);
            response.put("success", true);
            response.put("message", "Đã xóa đánh giá");
            return ResponseEntity.ok(response);
        }

        response.put("success", false);
        response.put("message", "Không tìm thấy đánh giá");
        return ResponseEntity.notFound().build();
    }

    /**
     * Seed sample reviews if database has products and customers and the reviews table is empty
     */
    @PostMapping("/seed")
    public ResponseEntity<Map<String, Object>> seedReviews() {
        Map<String, Object> response = new HashMap<>();
        
        List<com.fyd.backend.entity.Product> products = productRepository.findAll();
        List<com.fyd.backend.entity.Customer> customers = customerRepository.findAll();
        
        if (products.isEmpty() || customers.isEmpty()) {
            response.put("success", false);
            response.put("message", "Vui lòng đảm bảo hệ thống đã có sản phẩm và khách hàng trước khi chạy seed.");
            return ResponseEntity.badRequest().body(response);
        }
        
        long countBefore = reviewRepository.count();
        if (countBefore > 0) {
            response.put("success", false);
            response.put("message", "Bảng reviews đã có dữ liệu. Không cần chạy seed.");
            return ResponseEntity.ok(response);
        }
        
        // Define realistic review templates
        String[] titles = {
            "Chất lượng tuyệt vời", "Rất đáng tiền", "Form đẹp vải mát", "Giao hàng hơi chậm",
            "Màu hơi lệch chút", "Hài lòng sản phẩm", "Đóng gói kỹ", "Vải dày dặn",
            "Đường may chắc chắn", "Ủng hộ shop tiếp"
        };
        
        String[] contents = {
            "Áo mặc rất mát và ôm dáng, đóng gói sản phẩm cẩn thận, đường may cực kỳ chắc chắn. Mình sẽ tiếp tục mua thêm màu khác.",
            "Form dáng rất ổn, có vài sợi chỉ thừa nhỏ nhưng không đáng kể. Giao hàng siêu nhanh luôn shop ơi.",
            "Rất hài lòng về chất lượng sản phẩm, shop tư vấn size cực kỳ chuẩn. Sẽ tiếp tục ủng hộ FYD.",
            "Chất nỉ hoodie dày dặn, ấm áp, giặt không bị xù lông. Đáng mua nha mọi người!",
            "Màu sắc bên ngoài y hệt như trên ảnh chụp, vải cotton 100% thấm hút mồ hôi tốt.",
            "Quần co giãn tốt, mặc đi làm cả ngày không thấy khó chịu. Rất recommend mua nha.",
            "Chất liệu tốt hơn mong đợi rất nhiều. Giao hàng nhanh và đóng gói chuyên nghiệp.",
            "Màu sắc bên ngoài tối hơn trên ảnh quảng cáo một chút, nhưng chất vải rất thích.",
            "Áo thun hơi mỏng so với mong đợi của mình, nhưng form rộng và thoải mái.",
            "Giày đi êm chân, ôm dáng tốt. Liên hệ hỗ trợ đổi size nhiệt tình nhanh chóng."
        };
        
        int[] ratings = {5, 4, 5, 5, 5, 4, 5, 3, 3, 4};
        String[] statuses = {"APPROVED", "APPROVED", "APPROVED", "PENDING", "APPROVED", "APPROVED", "APPROVED", "REJECTED", "APPROVED", "APPROVED"};
        int[] helpfulCounts = {5, 2, 8, 0, 4, 6, 12, 1, 3, 7};
        
        int reviewCount = 0;
        int maxSeed = Math.min(15, Math.min(products.size() * 3, customers.size()));
        
        for (int i = 0; i < maxSeed; i++) {
            com.fyd.backend.entity.Product product = products.get(i % products.size());
            com.fyd.backend.entity.Customer customer = customers.get(i % customers.size());
            
            // Avoid duplicate customer review on same product
            if (reviewRepository.existsByProductIdAndCustomerId(product.getId(), customer.getId())) {
                continue;
            }
            
            Review review = new Review();
            review.setProduct(product);
            review.setCustomer(customer);
            review.setRating(ratings[i % ratings.length]);
            review.setTitle(titles[i % titles.length]);
            review.setContent(contents[i % contents.length]);
            review.setStatus(statuses[i % statuses.length]);
            review.setIsVerifiedPurchase(i % 5 != 0); // 80% verified
            review.setHelpfulCount(helpfulCounts[i % helpfulCounts.length]);
            
            // Seed a few admin replies to look realistic
            if ("APPROVED".equals(review.getStatus()) && i % 3 == 0) {
                review.setAdminReply("Cảm ơn bạn đã tin tưởng và ủng hộ FYD Store! Shop sẽ tiếp tục mang lại những sản phẩm chất lượng tốt nhất.");
                review.setAdminReplyAt(LocalDateTime.now().minusDays(1));
            }
            
            // Set different dates
            review.setCreatedAt(LocalDateTime.now().minusDays(i + 1));
            
            reviewRepository.save(review);
            reviewCount++;
        }
        
        response.put("success", true);
        response.put("message", "Đã seed thành công " + reviewCount + " đánh giá mẫu.");
        return ResponseEntity.ok(response);
    }


    /**
     * Shop: Vote review as helpful
     */
    @PostMapping("/{id}/helpful")
    public ResponseEntity<Map<String, Object>> voteHelpful(@PathVariable Long id) {
        Map<String, Object> response = new HashMap<>();
        return reviewRepository.findById(id)
            .map(review -> {
                int count = review.getHelpfulCount() != null ? review.getHelpfulCount() : 0;
                review.setHelpfulCount(count + 1);
                Review saved = reviewRepository.save(review);
                response.put("success", true);
                response.put("helpfulCount", saved.getHelpfulCount());
                return ResponseEntity.ok(response);
            })
            .orElseGet(() -> {
                response.put("success", false);
                response.put("message", "Không tìm thấy đánh giá");
                return ResponseEntity.notFound().build();
            });
    }


    /**
     * Shop: Unvote review as helpful (undo)
     */
    @DeleteMapping("/{id}/helpful")
    public ResponseEntity<Map<String, Object>> unvoteHelpful(@PathVariable Long id) {
        Map<String, Object> response = new HashMap<>();
        return reviewRepository.findById(id)
            .map(review -> {
                int count = review.getHelpfulCount() != null ? review.getHelpfulCount() : 0;
                if (count > 0) {
                    review.setHelpfulCount(count - 1);
                }
                Review saved = reviewRepository.save(review);
                response.put("success", true);
                response.put("helpfulCount", saved.getHelpfulCount());
                return ResponseEntity.ok(response);
            })
            .orElseGet(() -> {
                response.put("success", false);
                response.put("message", "Không tìm thấy đánh giá");
                return ResponseEntity.notFound().build();
            });
    }


    /**
     * Bulk approve reviews
     */
    @PostMapping("/bulk-approve")
    public ResponseEntity<Map<String, Object>> bulkApprove(@RequestBody Map<String, List<Long>> body) {
        Map<String, Object> response = new HashMap<>();
        List<Long> ids = body.get("ids");

        if (ids == null || ids.isEmpty()) {
            response.put("success", false);
            response.put("message", "Không có ID nào được chọn");
            return ResponseEntity.badRequest().body(response);
        }

        int count = 0;
        for (Long id : ids) {
            reviewRepository.findById(id).ifPresent(review -> {
                review.setStatus("APPROVED");
                reviewRepository.save(review);
            });
            count++;
        }

        response.put("success", true);
        response.put("message", "Đã duyệt " + count + " đánh giá");
        return ResponseEntity.ok(response);
    }

    /**
     * Bulk reject reviews
     */
    @PostMapping("/bulk-reject")
    public ResponseEntity<Map<String, Object>> bulkReject(@RequestBody Map<String, List<Long>> body) {
        Map<String, Object> response = new HashMap<>();
        List<Long> ids = body.get("ids");

        if (ids == null || ids.isEmpty()) {
            response.put("success", false);
            response.put("message", "Không có ID nào được chọn");
            return ResponseEntity.badRequest().body(response);
        }

        int count = 0;
        for (Long id : ids) {
            reviewRepository.findById(id).ifPresent(review -> {
                review.setStatus("REJECTED");
                reviewRepository.save(review);
            });
            count++;
        }

        response.put("success", true);
        response.put("message", "Đã từ chối " + count + " đánh giá");
        return ResponseEntity.ok(response);
    }
}
