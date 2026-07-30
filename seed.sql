-- Initial Seed Data for Feelinga Tea

-- 1. Admin and Test Customer
INSERT IGNORE INTO users (name, email, password, role, email_verified) VALUES 
('Admin', 'admin@feelinga.com', '$2b$10$Z1prqNqybF6K4TjekFV0heQI6qV6KrmlSvFm4DJVkRfFvJhqjCz2O', 'admin', 1),
('Test User', 'test@example.com', '$2b$10$Z1prqNqybF6K4TjekFV0heQI6qV6KrmlSvFm4DJVkRfFvJhqjCz2O', 'customer', 1);

-- 2. Products
INSERT IGNORE INTO products (slug, name, type, description, short_description, price_100g, price_200g, moods, origin, caffeine, images, in_stock, stock, is_best_seller, is_new_arrival, rating, review_count) VALUES
('darjeeling-first-flush', 'Darjeeling First Flush', 'Black Tea', 'The champagne of teas. Harvested in the spring, this light and floral black tea offers a delicate muscatel character with hints of apricot and citrus.', 'Premium spring harvest with delicate muscatel character', 499, 899, '["energize", "focus"]', 'Darjeeling, West Bengal', 'medium', '["/images/darjeeling-tea.png"]', 1, 50, 1, 0, 4.7, 24),
('assam-golden-tippy', 'Assam Golden Tippy', 'Black Tea', 'Rich, malty and full-bodied with golden tips. A classic Indian breakfast tea that pairs perfectly with milk.', 'Rich malty breakfast tea with golden tips', 349, 649, '["energize"]', 'Assam', 'high', '["/images/products/assam-breakfast.jpg"]', 1, 75, 1, 0, 4.5, 18),
('nilgiri-frost-tea', 'Nilgiri Frost Tea', 'Black Tea', 'Grown in the misty Blue Mountains of South India. Smooth, fragrant, and naturally sweet with notes of eucalyptus and wildflowers.', 'Smooth South Indian tea with floral notes', 399, 749, '["relax", "focus"]', 'Nilgiri, Tamil Nadu', 'medium', '["/images/products/nilgiri-frost.jpg"]', 1, 60, 0, 1, 4.3, 12),
('masala-chai-classic', 'Masala Chai Classic', 'Masala Chai', 'Our signature masala chai blend with cardamom, cinnamon, ginger, cloves, and black pepper. A comforting cup of India.', 'Traditional spiced tea with aromatic Indian masalas', 299, 549, '["energize", "relax"]', 'Blended in India', 'medium', '["/images/masala-chai.png"]', 1, 100, 1, 0, 4.8, 42),
('jasmine-green-tea', 'Jasmine Green Tea', 'Green Tea', 'Fragrant green tea scented with jasmine blossoms. Light, refreshing, and subtly sweet. Perfect for relaxation.', 'Lightly scented with fragrant jasmine blossoms', 449, 849, '["relax", "detox"]', 'Kangra, Himachal Pradesh', 'low', '["/images/green-tea.png"]', 1, 40, 0, 1, 4.6, 15),
('tulsi-ginger-herbal', 'Tulsi Ginger Herbal', 'Herbal Infusion', 'A caffeine-free wellness blend of holy basil (tulsi), ginger, and lemon. Ayurvedic immunity support in every cup.', 'Caffeine-free wellness blend with tulsi and ginger', 249, 449, '["detox", "immunity", "relax"]', 'Blended in India', 'none', '["/images/herbal-tea.png"]', 1, 80, 0, 0, 4.4, 9);

-- 3. Coupons
INSERT IGNORE INTO coupons (code, name, discount_type, discount_value, min_order_amount, max_discount, active, valid_from, valid_to, featured_on_store) VALUES 
('WELCOME10', 'Welcome Offer', 'percentage', 10, 499, 100, 1, '2020-01-01 00:00:00', '2099-12-31 23:59:59', 1);

-- 4. Testimonials
INSERT IGNORE INTO testimonials (author, role, text, rating, approved, featured, sort_order) VALUES 
('Priya S.', 'Tea Enthusiast', 'The Darjeeling First Flush is absolutely divine! It has become my morning ritual.', 5, 1, 1, 1),
('Rahul M.', 'Verified Buyer', 'Masala Chai Classic tastes just like homemade. My whole family loves it.', 5, 1, 1, 2),
('Anjali K.', 'Wellness Coach', 'I recommend Tulsi Ginger to all my clients. Great for immunity and so soothing.', 5, 1, 0, 3);
