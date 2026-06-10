/**
 * ConfigManager — Singleton configuration hub for the ShopHub automation framework.
 *
 * HIGH-CENTRALITY MODULE: virtually every page object and test utility imports this.
 * All environment variable resolution, default values, and typed access happens here.
 */

// ---------------------------------------------------------------------------
// Public interfaces
// ---------------------------------------------------------------------------

export interface UserCredentials {
  email: string;
  password: string;
  name: string;
}

export interface ShippingData {
  name: string;
  email: string;
  addressLine1: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

export interface PaymentData {
  cardNumber: string;
  expiry: string;
  cvv: string;
  nameOnCard: string;
}

export interface TestData {
  defaultProduct: string;
  defaultQuantity: number;
  shipping: ShippingData;
  payment: PaymentData;
}

export interface Users {
  admin: UserCredentials;
  customer: UserCredentials;
  guestEmail: string;
}

export interface AppConfig {
  baseUrl: string;
  apiBaseUrl: string;
  defaultTimeout: number;
  slowMo: number;
  screenshotOnFailure: boolean;
  videoOnFailure: boolean;
  users: Users;
  testData: TestData;
  retries: number;
  parallel: boolean;
}

// ---------------------------------------------------------------------------
// ConfigManager singleton
// ---------------------------------------------------------------------------

export class ConfigManager {
  private static instance: ConfigManager;
  private config: AppConfig;

  private constructor() {
    this.config = {
      baseUrl: process.env['BASE_URL'] ?? 'http://localhost:3000',
      apiBaseUrl: process.env['API_BASE_URL'] ?? 'http://localhost:3001',
      defaultTimeout: ConfigManager.parseIntEnv('DEFAULT_TIMEOUT', 30000),
      slowMo: ConfigManager.parseIntEnv('SLOW_MO', 0),
      screenshotOnFailure: process.env['SCREENSHOT_ON_FAILURE'] !== 'false',
      videoOnFailure: process.env['VIDEO_ON_FAILURE'] !== 'false',
      users: {
        admin: {
          email: process.env['ADMIN_EMAIL'] ?? 'admin@shop.com',
          password: process.env['ADMIN_PASSWORD'] ?? 'admin123',
          name: process.env['ADMIN_NAME'] ?? 'Admin User',
        },
        customer: {
          email: process.env['CUSTOMER_EMAIL'] ?? 'user@shop.com',
          password: process.env['CUSTOMER_PASSWORD'] ?? 'user123',
          name: process.env['CUSTOMER_NAME'] ?? 'Test Customer',
        },
        guestEmail: process.env['GUEST_EMAIL'] ?? 'guest@test.com',
      },
      testData: {
        defaultProduct: process.env['DEFAULT_PRODUCT'] ?? 'Laptop',
        defaultQuantity: ConfigManager.parseIntEnv('DEFAULT_QUANTITY', 2),
        shipping: {
          name: process.env['SHIPPING_NAME'] ?? 'Test User',
          email: process.env['SHIPPING_EMAIL'] ?? 'test@example.com',
          addressLine1: process.env['SHIPPING_ADDRESS'] ?? '123 Test Street',
          city: process.env['SHIPPING_CITY'] ?? 'San Francisco',
          state: process.env['SHIPPING_STATE'] ?? 'CA',
          zip: process.env['SHIPPING_ZIP'] ?? '94102',
          country: process.env['SHIPPING_COUNTRY'] ?? 'US',
        },
        payment: {
          cardNumber: process.env['CARD_NUMBER'] ?? '4111111111111111',
          expiry: process.env['CARD_EXPIRY'] ?? '12/26',
          cvv: process.env['CARD_CVV'] ?? '123',
          nameOnCard: process.env['CARD_NAME'] ?? 'Test User',
        },
      },
      retries: ConfigManager.parseIntEnv('RETRIES', 1),
      parallel: process.env['PARALLEL'] !== 'false',
    };
  }

  // ---------------------------------------------------------------------------
  // Singleton accessor
  // ---------------------------------------------------------------------------

  /**
   * Returns the singleton ConfigManager instance.
   * Thread-safe for Node's single-threaded execution model.
   */
  static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  // ---------------------------------------------------------------------------
  // Accessor methods
  // ---------------------------------------------------------------------------

  /** Returns the full typed AppConfig object. */
  get(): AppConfig {
    return { ...this.config };
  }

  /** Returns the frontend base URL (e.g. http://localhost:3000). */
  getBaseUrl(): string {
    return this.config.baseUrl;
  }

  /** Returns the API base URL (e.g. http://localhost:3001). */
  getApiBaseUrl(): string {
    return this.config.apiBaseUrl;
  }

  /** Returns default timeout in milliseconds. */
  getDefaultTimeout(): number {
    return this.config.defaultTimeout;
  }

  /** Returns slowMo value in milliseconds (0 = disabled). */
  getSlowMo(): number {
    return this.config.slowMo;
  }

  /** Returns whether screenshots should be captured on test failure. */
  shouldScreenshotOnFailure(): boolean {
    return this.config.screenshotOnFailure;
  }

  /** Returns whether videos should be captured on test failure. */
  shouldVideoOnFailure(): boolean {
    return this.config.videoOnFailure;
  }

  /**
   * Returns credentials for the given user role.
   * @param role - 'admin' or 'customer'
   */
  getUserCredentials(role: 'admin' | 'customer'): UserCredentials {
    return { ...this.config.users[role] };
  }

  /** Returns the guest email address used for unauthenticated flows. */
  getGuestEmail(): string {
    return this.config.users.guestEmail;
  }

  /** Returns default shipping test data. */
  getShippingData(): ShippingData {
    return { ...this.config.testData.shipping };
  }

  /** Returns default payment test data. */
  getPaymentData(): PaymentData {
    return { ...this.config.testData.payment };
  }

  /** Returns the default product name used in tests. */
  getDefaultProduct(): string {
    return this.config.testData.defaultProduct;
  }

  /** Returns the default quantity used when adding items to cart. */
  getDefaultQuantity(): number {
    return this.config.testData.defaultQuantity;
  }

  /** Returns the configured retry count for flaky test mitigation. */
  getRetries(): number {
    return this.config.retries;
  }

  /** Returns whether tests should run in parallel. */
  isParallel(): boolean {
    return this.config.parallel;
  }

  /**
   * Returns true when running inside a CI environment
   * (detected via the standard CI env variable).
   */
  isCI(): boolean {
    return !!process.env['CI'];
  }

  /**
   * Returns a fully-qualified URL by appending a path to the base URL.
   * @param path - The route path (e.g. '/login')
   */
  buildUrl(path: string): string {
    const base = this.config.baseUrl.replace(/\/$/, '');
    const route = path.startsWith('/') ? path : `/${path}`;
    return `${base}${route}`;
  }

  /**
   * Returns a fully-qualified API URL by appending a path to the API base URL.
   * @param path - The API route path (e.g. '/api/products')
   */
  buildApiUrl(path: string): string {
    const base = this.config.apiBaseUrl.replace(/\/$/, '');
    const route = path.startsWith('/') ? path : `/${path}`;
    return `${base}${route}`;
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private static parseIntEnv(key: string, defaultValue: number): number {
    const raw = process.env[key];
    if (raw === undefined || raw === null || raw.trim() === '') {
      return defaultValue;
    }
    const parsed = parseInt(raw, 10);
    return isNaN(parsed) ? defaultValue : parsed;
  }
}
