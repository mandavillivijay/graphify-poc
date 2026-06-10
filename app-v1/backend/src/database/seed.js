'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const { getDb, initializeDatabase } = require('./db');

async function seed() {
  console.log('[seed] Starting database seed...');
  initializeDatabase();
  const db = getDb();

  // ── Clear existing data ──────────────────────────────────────────────────
  db.exec(`
    DELETE FROM order_items;
    DELETE FROM orders;
    DELETE FROM cart_items;
    DELETE FROM carts;
    DELETE FROM products;
    DELETE FROM users;
  `);
  console.log('[seed] Cleared existing data.');

  // ── Users ────────────────────────────────────────────────────────────────
  const adminPasswordHash = bcrypt.hashSync('admin123', 10);
  const userPasswordHash  = bcrypt.hashSync('user123', 10);

  const adminId    = uuidv4();
  const customerId = uuidv4();

  const insertUser = db.prepare(`
    INSERT INTO users (id, email, password_hash, name, role, phone,
      address_line1, address_line2, city, state, zip, country)
    VALUES (@id, @email, @password_hash, @name, @role, @phone,
      @address_line1, @address_line2, @city, @state, @zip, @country)
  `);

  insertUser.run({
    id: adminId,
    email: 'admin@shop.com',
    password_hash: adminPasswordHash,
    name: 'Shop Admin',
    role: 'admin',
    phone: '555-000-0001',
    address_line1: '1 Admin Plaza',
    address_line2: 'Suite 100',
    city: 'San Francisco',
    state: 'CA',
    zip: '94102',
    country: 'US',
  });

  insertUser.run({
    id: customerId,
    email: 'user@shop.com',
    password_hash: userPasswordHash,
    name: 'Jane Customer',
    role: 'customer',
    phone: '555-123-4567',
    address_line1: '42 Elm Street',
    address_line2: null,
    city: 'Austin',
    state: 'TX',
    zip: '78701',
    country: 'US',
  });

  console.log('[seed] Created 2 users (admin@shop.com / admin123, user@shop.com / user123).');

  // ── Products ─────────────────────────────────────────────────────────────
  const insertProduct = db.prepare(`
    INSERT INTO products
      (id, name, description, price, category, brand, stock_quantity,
       image_url, rating, review_count, is_featured, is_active)
    VALUES
      (@id, @name, @description, @price, @category, @brand, @stock_quantity,
       @image_url, @rating, @review_count, @is_featured, @is_active)
  `);

  const products = [
    // ── Electronics ──────────────────────────────────────────────────────
    {
      id: uuidv4(),
      name: 'ProBook Laptop 15"',
      description: 'Powerful 15-inch laptop with Intel Core i7, 16 GB RAM, 512 GB SSD, and a stunning 4K IPS display. Perfect for professionals and creatives alike.',
      price: 1299.99,
      category: 'Electronics',
      brand: 'ProBook',
      stock_quantity: 45,
      image_url: 'https://placehold.co/600x400?text=ProBook+Laptop',
      rating: 4.6,
      review_count: 312,
      is_featured: 1,
      is_active: 1,
    },
    {
      id: uuidv4(),
      name: 'SoundWave Pro Headphones',
      description: 'Premium over-ear wireless headphones with active noise cancellation, 30-hour battery, and Hi-Res audio certification.',
      price: 249.99,
      category: 'Electronics',
      brand: 'SoundWave',
      stock_quantity: 120,
      image_url: 'https://placehold.co/600x400?text=SoundWave+Headphones',
      rating: 4.8,
      review_count: 875,
      is_featured: 1,
      is_active: 1,
    },
    {
      id: uuidv4(),
      name: 'PixelShot 4K Camera',
      description: '24 MP mirrorless camera with 4K video, 5-axis image stabilisation, and a weather-sealed magnesium-alloy body.',
      price: 899.00,
      category: 'Electronics',
      brand: 'PixelShot',
      stock_quantity: 30,
      image_url: 'https://placehold.co/600x400?text=PixelShot+Camera',
      rating: 4.7,
      review_count: 204,
      is_featured: 0,
      is_active: 1,
    },
    {
      id: uuidv4(),
      name: 'SmartWatch Series X',
      description: 'Feature-packed smartwatch with AMOLED display, GPS, heart-rate monitoring, 7-day battery, and 50 m water resistance.',
      price: 349.95,
      category: 'Electronics',
      brand: 'TechWear',
      stock_quantity: 80,
      image_url: 'https://placehold.co/600x400?text=SmartWatch+Series+X',
      rating: 4.4,
      review_count: 530,
      is_featured: 1,
      is_active: 1,
    },
    {
      id: uuidv4(),
      name: 'UltraTab 11 Tablet',
      description: '11-inch tablet with 2K display, octa-core processor, 8 GB RAM, and a 10 000 mAh battery that lasts all day.',
      price: 499.00,
      category: 'Electronics',
      brand: 'UltraTab',
      stock_quantity: 60,
      image_url: 'https://placehold.co/600x400?text=UltraTab+11',
      rating: 4.3,
      review_count: 148,
      is_featured: 0,
      is_active: 1,
    },

    // ── Clothing ──────────────────────────────────────────────────────────
    {
      id: uuidv4(),
      name: 'Urban Slim-Fit Jeans',
      description: 'Classic slim-fit jeans crafted from premium stretch denim. Available in multiple washes for a versatile everyday look.',
      price: 59.99,
      category: 'Clothing',
      brand: 'UrbanThread',
      stock_quantity: 200,
      image_url: 'https://placehold.co/600x400?text=Slim-Fit+Jeans',
      rating: 4.2,
      review_count: 680,
      is_featured: 0,
      is_active: 1,
    },
    {
      id: uuidv4(),
      name: 'Merino Wool Sweater',
      description: 'Luxuriously soft 100 % merino wool sweater with a relaxed fit. Naturally temperature-regulating and itch-free.',
      price: 89.00,
      category: 'Clothing',
      brand: 'WoolCraft',
      stock_quantity: 150,
      image_url: 'https://placehold.co/600x400?text=Merino+Sweater',
      rating: 4.6,
      review_count: 321,
      is_featured: 1,
      is_active: 1,
    },
    {
      id: uuidv4(),
      name: 'TrailRunner Pro Jacket',
      description: 'Lightweight, waterproof trail-running jacket with taped seams, mesh lining, and a packable hood.',
      price: 129.95,
      category: 'Clothing',
      brand: 'TrailGear',
      stock_quantity: 90,
      image_url: 'https://placehold.co/600x400?text=TrailRunner+Jacket',
      rating: 4.5,
      review_count: 210,
      is_featured: 0,
      is_active: 1,
    },
    {
      id: uuidv4(),
      name: 'Classic White Oxford Shirt',
      description: 'Timeless Oxford-weave cotton button-down shirt. Wrinkle-resistant finish and a tailored fit that works in or out of the office.',
      price: 45.00,
      category: 'Clothing',
      brand: 'FormalEdge',
      stock_quantity: 175,
      image_url: 'https://placehold.co/600x400?text=Oxford+Shirt',
      rating: 4.1,
      review_count: 452,
      is_featured: 0,
      is_active: 1,
    },

    // ── Books ─────────────────────────────────────────────────────────────
    {
      id: uuidv4(),
      name: 'Clean Code',
      description: 'Robert C. Martin\'s essential guide to writing readable, maintainable, and elegant software. A must-read for every developer.',
      price: 34.99,
      category: 'Books',
      brand: 'Prentice Hall',
      stock_quantity: 500,
      image_url: 'https://placehold.co/600x400?text=Clean+Code',
      rating: 4.8,
      review_count: 3200,
      is_featured: 1,
      is_active: 1,
    },
    {
      id: uuidv4(),
      name: 'Designing Data-Intensive Applications',
      description: 'Martin Kleppmann\'s comprehensive guide to the principles, practices, and tools of modern data systems architecture.',
      price: 49.99,
      category: 'Books',
      brand: "O'Reilly Media",
      stock_quantity: 300,
      image_url: 'https://placehold.co/600x400?text=DDIA+Book',
      rating: 4.9,
      review_count: 2100,
      is_featured: 1,
      is_active: 1,
    },
    {
      id: uuidv4(),
      name: 'The Pragmatic Programmer',
      description: '20th Anniversary Edition. From journeyman to master — practical advice for every stage of a software developer\'s career.',
      price: 39.99,
      category: 'Books',
      brand: 'Pragmatic Bookshelf',
      stock_quantity: 400,
      image_url: 'https://placehold.co/600x400?text=Pragmatic+Programmer',
      rating: 4.7,
      review_count: 1850,
      is_featured: 0,
      is_active: 1,
    },

    // ── Home & Garden ─────────────────────────────────────────────────────
    {
      id: uuidv4(),
      name: 'Bamboo Cutting Board Set',
      description: 'Set of 3 eco-friendly bamboo cutting boards in graduated sizes. Naturally antimicrobial and dishwasher-safe.',
      price: 39.95,
      category: 'Home & Garden',
      brand: 'GreenKitchen',
      stock_quantity: 220,
      image_url: 'https://placehold.co/600x400?text=Bamboo+Cutting+Board',
      rating: 4.4,
      review_count: 610,
      is_featured: 0,
      is_active: 1,
    },
    {
      id: uuidv4(),
      name: 'AeroPress Coffee Maker',
      description: 'The iconic AeroPress makes rich, smooth espresso-style coffee in under 2 minutes. Compact, durable, and BPA-free.',
      price: 34.99,
      category: 'Home & Garden',
      brand: 'AeroPress',
      stock_quantity: 340,
      image_url: 'https://placehold.co/600x400?text=AeroPress',
      rating: 4.8,
      review_count: 5400,
      is_featured: 1,
      is_active: 1,
    },
    {
      id: uuidv4(),
      name: 'Indoor Herb Garden Kit',
      description: 'All-in-one indoor growing kit for basil, mint, parsley, and cilantro. Includes seeds, soil pods, and a self-watering tray.',
      price: 29.99,
      category: 'Home & Garden',
      brand: 'GardenBliss',
      stock_quantity: 180,
      image_url: 'https://placehold.co/600x400?text=Herb+Garden+Kit',
      rating: 4.3,
      review_count: 890,
      is_featured: 0,
      is_active: 1,
    },
    {
      id: uuidv4(),
      name: 'Weighted Blanket 15 lbs',
      description: '60x80 inch weighted blanket with glass bead filling and a removable, machine-washable duvet cover in 12 colours.',
      price: 69.95,
      category: 'Home & Garden',
      brand: 'CozyNight',
      stock_quantity: 130,
      image_url: 'https://placehold.co/600x400?text=Weighted+Blanket',
      rating: 4.6,
      review_count: 1340,
      is_featured: 1,
      is_active: 1,
    },

    // ── Sports ────────────────────────────────────────────────────────────
    {
      id: uuidv4(),
      name: 'Adjustable Dumbbell Set',
      description: 'Space-saving adjustable dumbbells ranging from 5 to 52.5 lbs each. Quick-change dial system replaces 15 pairs of weights.',
      price: 349.00,
      category: 'Sports',
      brand: 'IronFlex',
      stock_quantity: 55,
      image_url: 'https://placehold.co/600x400?text=Adjustable+Dumbbells',
      rating: 4.7,
      review_count: 1200,
      is_featured: 1,
      is_active: 1,
    },
    {
      id: uuidv4(),
      name: 'Yoga Mat Pro 6mm',
      description: 'Extra-thick 6 mm yoga mat with alignment lines, non-slip texture, and a carrying strap. Eco-friendly TPE material.',
      price: 49.95,
      category: 'Sports',
      brand: 'ZenFlow',
      stock_quantity: 310,
      image_url: 'https://placehold.co/600x400?text=Yoga+Mat',
      rating: 4.5,
      review_count: 2100,
      is_featured: 0,
      is_active: 1,
    },
    {
      id: uuidv4(),
      name: 'Carbon Road Bike Helmet',
      description: 'Aerodynamic road cycling helmet with 18 vents, MIPS rotational protection, and adjustable retention system. 240 g.',
      price: 119.00,
      category: 'Sports',
      brand: 'SpeedShield',
      stock_quantity: 75,
      image_url: 'https://placehold.co/600x400?text=Road+Bike+Helmet',
      rating: 4.6,
      review_count: 440,
      is_featured: 0,
      is_active: 1,
    },
    {
      id: uuidv4(),
      name: 'Foam Roller Recovery Kit',
      description: 'Set of 3 foam rollers (smooth, grid, and trigger-point) for myofascial release, warm-up, and post-workout recovery.',
      price: 44.99,
      category: 'Sports',
      brand: 'RecoverPro',
      stock_quantity: 260,
      image_url: 'https://placehold.co/600x400?text=Foam+Roller+Kit',
      rating: 4.4,
      review_count: 760,
      is_featured: 0,
      is_active: 1,
    },
  ];

  const seedProducts = db.transaction((prods) => {
    for (const p of prods) insertProduct.run(p);
  });
  seedProducts(products);
  console.log(`[seed] Inserted ${products.length} products.`);

  // ── Summary ──────────────────────────────────────────────────────────────
  const userCount    = db.prepare('SELECT COUNT(*) AS n FROM users').get().n;
  const productCount = db.prepare('SELECT COUNT(*) AS n FROM products').get().n;

  console.log('[seed] ─────────────────────────────────────────────');
  console.log(`[seed] Users    : ${userCount}`);
  console.log(`[seed] Products : ${productCount}`);
  console.log('[seed] ─────────────────────────────────────────────');
  console.log('[seed] Seed complete. Credentials:');
  console.log('[seed]   Admin    => admin@shop.com / admin123');
  console.log('[seed]   Customer => user@shop.com  / user123');
}

seed().catch((err) => {
  console.error('[seed] Fatal error:', err);
  process.exit(1);
});
