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
            @RequestParam(required = false) Long customerId) {
        List<ReviewDTO> reviews = reviewRepository.findByProductIdAndStatus(productId, "APPROVED")
            .stream()
            .map(ReviewDTO::fromEntity)
            .collect(Collectors.toList());

        Double avgRating = reviewRepository.getAverageRatingByProductId(productId);
        Long totalReviews = reviewRepository.countApprovedByProductId(productId);

        Map<String, Object> response = new HashMap<>();
        response.put("reviews", reviews);
        response.put("averageRating", avgRating);
        response.put("totalReviews", totalReviews);

        // Eligibility check if customerId is provided
        if (customerId != null) {
            boolean alreadyReviewed = reviewRepository.existsByProductIdAndCustomerId(productId, customerId);
            boolean hasPurchased = orderRepository.existsByCustomerIdAndProductId(customerId, productId);
            response.put("canReview", !alreadyReviewed && hasPurchased);
            response.put("alreadyReviewed", alreadyReviewed);
            response.put("hasPurchased", hasPurchased);
        }

        // Rating distribution (1-5 stars count)
        Map<Integer, Long> distribution = new HashMap<>();
        for (int i = 1; i <= 5; i++) {
            int rating = i;
            long count = reviews.stream().filter(r -> r.getRating() == rating).count();
            distribution.put(i, count);
        }
        response.put("ratingDistribution", distribution);

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
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        PageRequest pageRequest = PageRequest.of(page, size, Sort.by("createdAt").descending());
        Page<Review> reviewPage;

        if (!q.isEmpty()) {
            reviewPage = reviewRepository.search(q, pageRequest);
        } else if (status != null && !status.isEmpty()) {
            reviewPage = reviewRepository.findByStatus(status, pageRequest);
        } else {
            reviewPage = reviewRepository.findAllOrdered(pageRequest);
        }

        List<ReviewDTO> reviews = reviewPage.getContent().stream()
            .map(ReviewDTO::fromEntity)
            .collect(Collectors.toList());

        Map<String, Object> response = new HashMap<>();
        response.put("reviews", reviews);
        response.put("currentPage", reviewPage.getNumber());
        response.put("totalItems", reviewPage.getTotalElements());
        response.put("totalPages", reviewPage.getTotalPages());
        response.put("pendingCount", reviewRepository.countPending());

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
}
