package com.fyd.backend;

import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.EnableAspectJAutoProxy;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;
import java.util.List;
import java.util.Map;

@SpringBootApplication
@EnableScheduling
@EnableAsync
@EnableAspectJAutoProxy
public class FydBackendApplication {

	public static void main(String[] args) {
		SpringApplication.run(FydBackendApplication.class, args);
	}

	@Bean
	public CommandLineRunner dbCleanRunner(JdbcTemplate jdbcTemplate) {
		return args -> {
			System.out.println("====== STARTING DATABASE CLEANUP RUNNER ======");
			try {
				// 1. Find and drop foreign key constraints on customer_coupons table referring to event_voucher_rules
				String findFkSql = "SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE " +
						"WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'customer_coupons' AND COLUMN_NAME = 'event_rule_id'";
				List<String> constraints = jdbcTemplate.queryForList(findFkSql, String.class);
				for (String constraint : constraints) {
					if (constraint != null) {
						System.out.println("Dropping foreign key constraint: " + constraint);
						jdbcTemplate.execute("ALTER TABLE customer_coupons DROP FOREIGN KEY " + constraint);
					}
				}
			} catch (Exception e) {
				System.err.println("Error dropping foreign key: " + e.getMessage());
			}

			try {
				// 2. Drop the column event_rule_id from customer_coupons if it exists
				System.out.println("Checking if column event_rule_id exists in customer_coupons...");
				String checkColSql = "SHOW COLUMNS FROM customer_coupons LIKE 'event_rule_id'";
				List<Map<String, Object>> columns = jdbcTemplate.queryForList(checkColSql);
				if (!columns.isEmpty()) {
					System.out.println("Dropping column event_rule_id...");
					jdbcTemplate.execute("ALTER TABLE customer_coupons DROP COLUMN event_rule_id");
				}
			} catch (Exception e) {
				System.err.println("Error dropping column: " + e.getMessage());
			}

			try {
				// 3. Drop tables if they exist
				System.out.println("Dropping tables: gift_card_transactions, gift_cards, event_voucher_rules...");
				jdbcTemplate.execute("DROP TABLE IF EXISTS gift_card_transactions");
				jdbcTemplate.execute("DROP TABLE IF EXISTS gift_cards");
				jdbcTemplate.execute("DROP TABLE IF EXISTS event_voucher_rules");
				System.out.println("====== DATABASE CLEANUP RUNNER COMPLETED ======");
			} catch (Exception e) {
				System.err.println("Error dropping tables: " + e.getMessage());
			}

			try {
				System.out.println("====== REPAIRING DOUBLE ENCODING ======");
				java.util.function.Function<String, String> fixEncoding = s -> {
					if (s == null || s.isEmpty()) return s;
					boolean hasNonAscii = false;
					for (int i = 0; i < s.length(); i++) {
						if (s.charAt(i) > 127) {
							hasNonAscii = true;
							break;
						}
					}
					if (!hasNonAscii) return s;
					try {
						byte[] bytes = new byte[s.length()];
						boolean allLatin1 = true;
						for (int i = 0; i < s.length(); i++) {
							char c = s.charAt(i);
							if (c > 255) {
								allLatin1 = false;
								break;
							}
							bytes[i] = (byte) c;
						}
						if (allLatin1) {
							java.nio.charset.CharsetDecoder decoder = java.nio.charset.StandardCharsets.UTF_8.newDecoder();
							decoder.onMalformedInput(java.nio.charset.CodingErrorAction.REPORT);
							decoder.onUnmappableCharacter(java.nio.charset.CodingErrorAction.REPORT);
							java.nio.ByteBuffer byteBuffer = java.nio.ByteBuffer.wrap(bytes);
							java.nio.CharBuffer charBuffer = decoder.decode(byteBuffer);
							String decoded = charBuffer.toString();
							if (!decoded.equals(s)) {
								return decoded;
							}
						}
					} catch (Exception e) {
						// Ignored
					}
					return s;
				};

				// 1. Repair categories
				List<Map<String, Object>> categories = jdbcTemplate.queryForList("SELECT id, name, description FROM categories");
				for (Map<String, Object> cat : categories) {
					Long id = ((Number) cat.get("id")).longValue();
					String name = (String) cat.get("name");
					String desc = (String) cat.get("description");
					
					String fixedName = fixEncoding.apply(name);
					String fixedDesc = fixEncoding.apply(desc);
					
					if ((name != null && !name.equals(fixedName)) || (desc != null && !desc.equals(fixedDesc))) {
						jdbcTemplate.update("UPDATE categories SET name = ?, description = ? WHERE id = ?", fixedName, fixedDesc, id);
					}
				}

				// 2. Repair brands
				List<Map<String, Object>> brands = jdbcTemplate.queryForList("SELECT id, name, description FROM brands");
				for (Map<String, Object> brand : brands) {
					Long id = ((Number) brand.get("id")).longValue();
					String name = (String) brand.get("name");
					String desc = (String) brand.get("description");
					
					String fixedName = fixEncoding.apply(name);
					String fixedDesc = fixEncoding.apply(desc);
					
					if ((name != null && !name.equals(fixedName)) || (desc != null && !desc.equals(fixedDesc))) {
						jdbcTemplate.update("UPDATE brands SET name = ?, description = ? WHERE id = ?", fixedName, fixedDesc, id);
					}
				}

				// 3. Repair products
				List<Map<String, Object>> products = jdbcTemplate.queryForList("SELECT id, name, description, short_description, material FROM products");
				for (Map<String, Object> prod : products) {
					Long id = ((Number) prod.get("id")).longValue();
					String name = (String) prod.get("name");
					String desc = (String) prod.get("description");
					String shortDesc = (String) prod.get("short_description");
					String material = (String) prod.get("material");
					
					String fixedName = fixEncoding.apply(name);
					String fixedDesc = fixEncoding.apply(desc);
					String fixedShortDesc = fixEncoding.apply(shortDesc);
					String fixedMaterial = fixEncoding.apply(material);
					
					if ((name != null && !name.equals(fixedName)) || (desc != null && !desc.equals(fixedDesc)) || 
						(shortDesc != null && !shortDesc.equals(fixedShortDesc)) || (material != null && !material.equals(fixedMaterial))) {
						jdbcTemplate.update("UPDATE products SET name = ?, description = ?, short_description = ?, material = ? WHERE id = ?", 
							fixedName, fixedDesc, fixedShortDesc, fixedMaterial, id);
					}
				}

				// 4. Repair colors
				List<Map<String, Object>> colors = jdbcTemplate.queryForList("SELECT id, name FROM colors");
				for (Map<String, Object> col : colors) {
					Long id = ((Number) col.get("id")).longValue();
					String name = (String) col.get("name");
					String fixedName = fixEncoding.apply(name);
					if (name != null && !name.equals(fixedName)) {
						jdbcTemplate.update("UPDATE colors SET name = ? WHERE id = ?", fixedName, id);
					}
				}

				// 5. Repair sizes
				List<Map<String, Object>> sizes = jdbcTemplate.queryForList("SELECT id, name FROM sizes");
				for (Map<String, Object> sz : sizes) {
					Long id = ((Number) sz.get("id")).longValue();
					String name = (String) sz.get("name");
					String fixedName = fixEncoding.apply(name);
					if (name != null && !name.equals(fixedName)) {
						jdbcTemplate.update("UPDATE sizes SET name = ? WHERE id = ?", fixedName, id);
					}
				}

				// 6. Repair promotions
				List<Map<String, Object>> promotions = jdbcTemplate.queryForList("SELECT id, name, description FROM promotions");
				for (Map<String, Object> promo : promotions) {
					Long id = ((Number) promo.get("id")).longValue();
					String name = (String) promo.get("name");
					String desc = (String) promo.get("description");
					
					String fixedName = fixEncoding.apply(name);
					String fixedDesc = fixEncoding.apply(desc);
					
					if ((name != null && !name.equals(fixedName)) || (desc != null && !desc.equals(fixedDesc))) {
						jdbcTemplate.update("UPDATE promotions SET name = ?, description = ? WHERE id = ?", fixedName, fixedDesc, id);
					}
				}

				// 7. Repair customer_tiers
				List<Map<String, Object>> customerTiers = jdbcTemplate.queryForList("SELECT id, name, benefits FROM customer_tiers");
				for (Map<String, Object> tier : customerTiers) {
					Long id = ((Number) tier.get("id")).longValue();
					String name = (String) tier.get("name");
					String benefits = (String) tier.get("benefits");
					
					String fixedName = fixEncoding.apply(name);
					String fixedBenefits = fixEncoding.apply(benefits);
					
					if ((name != null && !name.equals(fixedName)) || (benefits != null && !benefits.equals(fixedBenefits))) {
						jdbcTemplate.update("UPDATE customer_tiers SET name = ?, benefits = ? WHERE id = ?", fixedName, fixedBenefits, id);
					}
				}

				// 8. Repair product_images
				List<Map<String, Object>> productImages = jdbcTemplate.queryForList("SELECT id, alt_text FROM product_images");
				for (Map<String, Object> img : productImages) {
					Long id = ((Number) img.get("id")).longValue();
					String altText = (String) img.get("alt_text");
					String fixedAlt = fixEncoding.apply(altText);
					if (altText != null && !altText.equals(fixedAlt)) {
						jdbcTemplate.update("UPDATE product_images SET alt_text = ? WHERE id = ?", fixedAlt, id);
					}
				}
				System.out.println("====== REPAIRING DOUBLE ENCODING COMPLETED ======");
			} catch (Exception e) {
				System.err.println("Error repairing encoding: " + e.getMessage());
				e.printStackTrace();
			}
		};
	}
}
	