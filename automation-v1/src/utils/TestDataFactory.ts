/**
 * TestDataFactory.ts — Factory for generating unique, randomised test data.
 *
 * All methods are static. Provides helpers for creating users, products,
 * shipping addresses, and other test data payloads without duplicates.
 */

import type { UserData, ProductData, ShippingData } from '../models/Product';

// ---------------------------------------------------------------------------
// Seed data for random selection
// ---------------------------------------------------------------------------

const FIRST_NAMES = [
  'Alice', 'Bob', 'Carol', 'Dave', 'Eve', 'Frank', 'Grace', 'Henry',
  'Iris', 'Jack', 'Karen', 'Leo', 'Mia', 'Nick', 'Olivia', 'Paul',
];

const LAST_NAMES = [
  'Smith', 'Jones', 'Brown', 'Taylor', 'Wilson', 'Davis', 'Clark',
  'Lewis', 'Hall', 'Allen', 'Young', 'King', 'Scott', 'Green', 'Baker',
];

const ADJECTIVES = [
  'Premium', 'Ultra', 'Smart', 'Pro', 'Elite', 'Classic', 'Advanced',
  'Turbo', 'Mega', 'Super', 'Eco', 'Dynamic', 'Quantum', 'Fusion',
];

const PRODUCT_NOUNS = [
  'Widget', 'Gadget', 'Device', 'Gizmo', 'Module', 'Component',
  'Unit', 'System', 'Kit', 'Pack', 'Set', 'Bundle', 'Solution',
];

const CATEGORIES = [
  'Electronics', 'Clothing', 'Books', 'Home & Garden', 'Sports',
  'Toys', 'Beauty', 'Automotive', 'Food & Beverages', 'Office Supplies',
];

const BRANDS = [
  'TechBrand', 'ProLine', 'EcoTech', 'SmartGear', 'UltraMade',
  'ClassicPro', 'FusionWorks', 'QuantumLabs', 'DynaCore', 'MegaBuild',
];

const CITIES = [
  'San Francisco', 'New York', 'Austin', 'Seattle', 'Chicago',
  'Los Angeles', 'Boston', 'Denver', 'Miami', 'Portland',
];

const STATES = ['CA', 'NY', 'TX', 'WA', 'IL', 'FL', 'CO', 'OR', 'MA', 'AZ'];

const ZIP_CODES = [
  '94102', '10001', '73301', '98101', '60601',
  '90001', '02101', '80201', '33101', '97201',
];

// ---------------------------------------------------------------------------
// TestDataFactory
// ---------------------------------------------------------------------------

export class TestDataFactory {
  // ── Email ──────────────────────────────────────────────────────────────────

  /**
   * Generates a unique email address using the current timestamp and a random
   * suffix to prevent collisions in parallel test runs.
   *
   * @param prefix - Optional prefix (default: 'test').
   * @returns Something like "test.1718000000000.abc123@example.com"
   */
  static createUniqueEmail(prefix = 'test'): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).slice(2, 8);
    return `${prefix}.${timestamp}.${random}@example.com`;
  }

  // ── User ───────────────────────────────────────────────────────────────────

  /**
   * Creates a UserData object with unique, randomised fields.
   * Any field can be overridden by passing `overrides`.
   */
  static createUser(overrides: Partial<UserData> = {}): UserData {
    const firstName = TestDataFactory.randomItem(FIRST_NAMES);
    const lastName = TestDataFactory.randomItem(LAST_NAMES);
    const name = `${firstName} ${lastName}`;
    const cityIdx = TestDataFactory.randomIndex(CITIES.length);

    const base: UserData = {
      name,
      email: TestDataFactory.createUniqueEmail(firstName.toLowerCase()),
      password: 'TestPass123!',
      role: 'customer',
      phone: TestDataFactory.createRandomPhone(),
      addressLine1: `${TestDataFactory.randomInt(1, 9999)} ${TestDataFactory.randomItem(LAST_NAMES)} Street`,
      city: CITIES[cityIdx],
      state: STATES[cityIdx],
      zip: ZIP_CODES[cityIdx],
      country: 'US',
    };

    return { ...base, ...overrides };
  }

  // ── Product ────────────────────────────────────────────────────────────────

  /**
   * Creates a ProductData object with randomised, realistic values.
   * Any field can be overridden.
   */
  static createProduct(overrides: Partial<ProductData> = {}): ProductData {
    const base: ProductData = {
      name: TestDataFactory.createRandomProductName(),
      description: TestDataFactory.createRandomDescription(),
      price: TestDataFactory.createRandomPrice(9.99, 499.99),
      category: TestDataFactory.randomItem(CATEGORIES),
      brand: TestDataFactory.randomItem(BRANDS),
      stockQuantity: TestDataFactory.randomInt(1, 100),
      rating: TestDataFactory.randomFloat(3.0, 5.0, 1),
      reviewCount: TestDataFactory.randomInt(0, 500),
      isFeatured: Math.random() < 0.2,
      isActive: true,
    };

    return { ...base, ...overrides };
  }

  // ── Shipping ───────────────────────────────────────────────────────────────

  /**
   * Creates a ShippingData object using randomised but realistic values.
   */
  static createShippingData(overrides: Partial<ShippingData> = {}): ShippingData {
    const firstName = TestDataFactory.randomItem(FIRST_NAMES);
    const lastName = TestDataFactory.randomItem(LAST_NAMES);
    const cityIdx = TestDataFactory.randomIndex(CITIES.length);

    const base: ShippingData = {
      name: `${firstName} ${lastName}`,
      email: TestDataFactory.createUniqueEmail(firstName.toLowerCase()),
      addressLine1: `${TestDataFactory.randomInt(1, 9999)} ${TestDataFactory.randomItem(LAST_NAMES)} Ave`,
      city: CITIES[cityIdx],
      state: STATES[cityIdx],
      zip: ZIP_CODES[cityIdx],
      country: 'US',
    };

    return { ...base, ...overrides };
  }

  // ── String generators ──────────────────────────────────────────────────────

  /**
   * Creates a randomised product name combining an adjective and a noun,
   * with a timestamp suffix for uniqueness.
   */
  static createRandomProductName(): string {
    const adj = TestDataFactory.randomItem(ADJECTIVES);
    const noun = TestDataFactory.randomItem(PRODUCT_NOUNS);
    const suffix = TestDataFactory.randomInt(100, 9999);
    return `${adj} ${noun} ${suffix}`;
  }

  /**
   * Generates a random product description sentence.
   */
  static createRandomDescription(): string {
    const adj = TestDataFactory.randomItem(ADJECTIVES).toLowerCase();
    const noun = TestDataFactory.randomItem(PRODUCT_NOUNS).toLowerCase();
    return (
      `A high-quality, ${adj} ${noun} designed for everyday use. ` +
      `Featuring durable construction and a modern design, ` +
      `this product delivers outstanding performance and value.`
    );
  }

  /**
   * Returns a random phone number in US format.
   */
  static createRandomPhone(): string {
    const area = TestDataFactory.randomInt(200, 999);
    const mid = TestDataFactory.randomInt(100, 999);
    const end = TestDataFactory.randomInt(1000, 9999);
    return `${area}-${mid}-${end}`;
  }

  // ── Number generators ──────────────────────────────────────────────────────

  /**
   * Returns a random price between min and max (inclusive), rounded to 2 dp.
   */
  static createRandomPrice(min = 5.0, max = 999.99): number {
    return TestDataFactory.randomFloat(min, max, 2);
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private static randomItem<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  private static randomIndex(length: number): number {
    return Math.floor(Math.random() * length);
  }

  private static randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  private static randomFloat(min: number, max: number, decimals: number): number {
    const value = Math.random() * (max - min) + min;
    const factor = Math.pow(10, decimals);
    return Math.round(value * factor) / factor;
  }
}
