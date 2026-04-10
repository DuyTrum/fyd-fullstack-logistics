package com.fyd.backend.service;

import com.fyd.backend.entity.Customer;
import com.fyd.backend.entity.NightMarketConfig;
import com.fyd.backend.entity.NightMarketOffer;
import com.fyd.backend.entity.Product;
import com.fyd.backend.repository.NightMarketConfigRepository;
import com.fyd.backend.repository.NightMarketOfferRepository;
import com.fyd.backend.repository.ProductRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Random;
import java.util.stream.Collectors;

@Service
public class NightMarketService {

    @Autowired
    private NightMarketOfferRepository nightMarketOfferRepository;
    
    @Autowired
    private NightMarketConfigRepository configRepository;

    @Autowired
    private ProductRepository productRepository;
    
    private final Random random = new Random();

    public boolean isNightMarketActive() {
        // Use singleton pattern: find any or first config
        NightMarketConfig config = configRepository.findAll().stream().findFirst().orElse(null);
        if (config == null || !Boolean.TRUE.equals(config.getIsActive())) {
            return false;
        }

        LocalDateTime now = LocalDateTime.now();
        if (config.getStartTime() != null && now.isBefore(config.getStartTime())) {
            return false;
        }
        if (config.getEndTime() != null && now.isAfter(config.getEndTime())) {
            return false;
        }

        return true;
    }

    @Transactional
    public int syncUnrevealedOffers() {
        NightMarketConfig config = configRepository.findAll().stream().findFirst()
                .orElseThrow(() -> new RuntimeException("Night Market config not found"));
        
        System.out.println("Syncing unrevealed offers with range [" + config.getMinDiscountPercent() + "%, " + config.getMaxDiscountPercent() + "%]");
        return nightMarketOfferRepository.updateUnrevealedDiscounts(
                config.getMinDiscountPercent(), 
                config.getMaxDiscountPercent()
        );
    }

    @Transactional
    public List<NightMarketOffer> getOffersForCustomer(Customer customer) {
        List<NightMarketOffer> existingOffers = nightMarketOfferRepository.findByCustomer(customer);
        
        // Filter out expired offers
        List<NightMarketOffer> activeOffers = existingOffers.stream()
                .filter(offer -> offer.getExpirationDate().isAfter(LocalDateTime.now()))
                .collect(Collectors.toList());

        if (activeOffers.isEmpty()) {
            // If all offers expired or none exist, delete the old ones and generate new ones
            if (!existingOffers.isEmpty()) {
                nightMarketOfferRepository.deleteByCustomer(customer);
            }
            return generateNewOffers(customer);
        }

        return activeOffers;
    }

    private List<NightMarketOffer> generateNewOffers(Customer customer) {
        List<Product> allProducts = productRepository.findAllActive();
        if (allProducts.isEmpty()) {
            return Collections.emptyList();
        }

        // Load config via singleton pattern
        NightMarketConfig config = configRepository.findAll().stream().findFirst().orElse(null);
        
        if (config == null || !isNightMarketActive()) {
            return Collections.emptyList();
        }

        Collections.shuffle(allProducts);
        int offerCount = config.getMinOffers() + random.nextInt(config.getMaxOffers() - config.getMinOffers() + 1);
        int limit = Math.min(offerCount, allProducts.size());

        List<NightMarketOffer> newOffers = allProducts.stream()
                .filter(p -> p.getSalePrice() == null)
                .limit(limit)
                .map(product -> {
                    NightMarketOffer offer = new NightMarketOffer();
                    offer.setCustomer(customer);
                    offer.setConfig(config);
                    offer.setProduct(product);
                    
                    // Random discount between min and max
                    int minD = config.getMinDiscountPercent();
                    int maxD = config.getMaxDiscountPercent();
                    offer.setDiscountPercent(minD + random.nextInt(maxD - minD + 1));
                    
                    offer.setExpirationDate(LocalDateTime.now().plusDays(config.getOfferDurationDays()));
                    offer.setIsRevealed(false);
                    return offer;
                })
                .collect(Collectors.toList());

        return nightMarketOfferRepository.saveAll(newOffers);
    }

    @Transactional
    public NightMarketOffer revealOffer(Long offerId, Customer customer) {
        NightMarketOffer offer = nightMarketOfferRepository.findById(offerId)
                .orElseThrow(() -> new RuntimeException("Offer not found"));
        
        if (!offer.getCustomer().getId().equals(customer.getId())) {
            throw new RuntimeException("Unauthorized to reveal this offer");
        }

        offer.setIsRevealed(true);
        return nightMarketOfferRepository.save(offer);
    }
}
