package com.fyd.backend.controller;

import com.fyd.backend.dto.NightMarketOfferDTO;
import com.fyd.backend.entity.Customer;
import com.fyd.backend.repository.CustomerRepository;
import com.fyd.backend.service.NightMarketService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import java.io.StringWriter;
import java.io.PrintWriter;

@RestController
@RequestMapping("/api/night-market")
public class NightMarketController {

    @Autowired
    private NightMarketService nightMarketService;
    
    @Autowired
    private CustomerRepository customerRepository;

    @GetMapping("/offers")
    public ResponseEntity<?> getOffers() {
        if (!nightMarketService.isNightMarketActive()) {
            return ResponseEntity.status(403).body(Map.of(
                "code", "FEATURE_DISABLED",
                "message", "Chợ đêm hiện đang tạm đóng. Hẹn gặp lại bạn sớm!"
            ));
        }

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        Customer customer = getCurrentCustomer();
        if (customer == null) {
            return ResponseEntity.status(401).body(Map.of("message", "Customer not found in security context"));
        }

        List<NightMarketOfferDTO> offers = nightMarketService.getOffersForCustomer(customer).stream()
                .map(NightMarketOfferDTO::fromEntity)
                .collect(Collectors.toList());

        return ResponseEntity.ok(offers);
    }

    @GetMapping("/status")
    public ResponseEntity<?> getStatus() {
        return ResponseEntity.ok(Map.of("active", nightMarketService.isNightMarketActive()));
    }

    @PostMapping("/reveal/{id}")
    public ResponseEntity<?> revealOffer(@PathVariable Long id) {
        Customer customer = getCurrentCustomer();
        if (customer == null) {
            return ResponseEntity.status(401).body(Map.of("message", "Customer not found"));
        }

        NightMarketOfferDTO revealedOffer = NightMarketOfferDTO.fromEntity(
                nightMarketService.revealOffer(id, customer)
        );

        return ResponseEntity.ok(revealedOffer);
    }

    private Customer getCurrentCustomer() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() != null) {
            try {
                String userIdStr = auth.getPrincipal().toString();
                Long userId = Long.parseLong(userIdStr);
                return customerRepository.findById(userId).orElse(null);
            } catch (Exception e) {
                return null;
            }
        }
        return null;
    }
}
