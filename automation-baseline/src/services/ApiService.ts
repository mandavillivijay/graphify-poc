/**
 * ApiService.ts — Direct HTTP client for the ShopHub API.
 *
 * HIGH-CENTRALITY SERVICE: used by fixtures, workflows, and other services
 * for fast setup/teardown that bypasses the browser UI.
 *
 * All requests target http://localhost:3001 (configurable via ConfigManager).
 * Authentication uses Bearer tokens stored in-memory on this instance.
 */

import { ConfigManager, UserCredentials } from '../config/ConfigManager';
import type {
  ProductData,
  CartData,
  OrderData,
  ShippingData,
  UserData,
} from '../models/Product';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface LoginResponseData {
  user: Record<string, unknown>;
  token: string;
}

interface RawCartItem {
  product_id?: string;
  productId?: string;
  id?: string;
  product?: { id?: string; name?: string; price?: number };
  name?: string;
  priceAtAdd?: number;
  price?: number;
  quantity: number;
}

interface RawOrder {
  id: string;
  status: string;
  subtotal?: number;
  tax?: number;
  shipping_cost?: number;
  shippingCost?: number;
  total: number;
  created_at?: string;
  createdAt?: string;
  updated_at?: string;
  updatedAt?: string;
  items?: RawCartItem[];
  notes?: string;
}

interface RawProduct {
  id: string;
  name: string;
  description?: string;
  price: number;
  category: string;
  brand?: string;
  stock_quantity?: number;
  stockQuantity?: number;
  image_url?: string;
  imageUrl?: string;
  rating?: number;
  review_count?: number;
  reviewCount?: number;
  is_featured?: boolean;
  isFeatured?: boolean;
  is_active?: boolean;
}

// ---------------------------------------------------------------------------
// ApiService
// ---------------------------------------------------------------------------

export class ApiService {
  private baseUrl: string;
  private token: string | null = null;
  private config: ConfigManager;

  constructor() {
    this.config = ConfigManager.getInstance();
    this.baseUrl = this.config.getApiBaseUrl();
  }

  // ── Authentication ─────────────────────────────────────────────────────────

  /**
   * Logs in with the given credentials and stores the JWT token on this
   * instance. Returns the raw token string.
   */
  async login(credentials: UserCredentials): Promise<string> {
    const body = { email: credentials.email, password: credentials.password };
    const data = await this.request<{ data: LoginResponseData }>('POST', '/api/auth/login', body);
    const token = data.data.token;
    this.token = token;
    return token;
  }

  /** Logs in as the admin user and returns the JWT token. */
  async loginAsAdmin(): Promise<string> {
    const creds = this.config.getUserCredentials('admin');
    return this.login(creds);
  }

  /** Logs in as the customer user and returns the JWT token. */
  async loginAsCustomer(): Promise<string> {
    const creds = this.config.getUserCredentials('customer');
    return this.login(creds);
  }

  /** Fetches the authenticated user's profile. Requires a token to be set. */
  async getProfile(): Promise<UserData> {
    const resp = await this.request<{ data: { user: Record<string, unknown> } }>('GET', '/api/auth/profile');
    return this.normalizeUser(resp.data.user);
  }

  // ── Products ───────────────────────────────────────────────────────────────

  /**
   * Fetches a list of products. Accepts optional query params such as
   * q, category, brand, sort, page, limit, min_price, max_price, in_stock.
   */
  async getProducts(params?: Record<string, string>): Promise<ProductData[]> {
    let path = '/api/products';
    if (params && Object.keys(params).length > 0) {
      const qs = new URLSearchParams(params).toString();
      path = `${path}?${qs}`;
    }
    const resp = await this.request<{ data: { products: RawProduct[] } }>('GET', path);
    return (resp.data.products ?? []).map((p) => this.normalizeProduct(p));
  }

  /** Fetches a single product by its ID. */
  async getProduct(id: string): Promise<ProductData> {
    const resp = await this.request<{ data: { product: RawProduct } }>('GET', `/api/products/${id}`);
    return this.normalizeProduct(resp.data.product);
  }

  /**
   * Creates a new product via the admin API. Requires admin token to be set.
   */
  async createProduct(data: Partial<ProductData>): Promise<ProductData> {
    const payload = {
      name: data.name,
      description: data.description ?? '',
      price: data.price,
      category: data.category,
      brand: data.brand ?? '',
      stock_quantity: data.stockQuantity ?? 10,
      image_url: data.imageUrl ?? '',
      rating: data.rating ?? 4.0,
      review_count: data.reviewCount ?? 0,
      is_featured: data.isFeatured ?? false,
      is_active: data.isActive !== false,
    };
    const resp = await this.request<{ data: { product: RawProduct } }>('POST', '/api/admin/products', payload);
    return this.normalizeProduct(resp.data.product);
  }

  /**
   * Updates an existing product by ID via the admin API.
   */
  async updateProduct(id: string, data: Partial<ProductData>): Promise<ProductData> {
    const payload: Record<string, unknown> = {};
    if (data.name !== undefined) payload['name'] = data.name;
    if (data.description !== undefined) payload['description'] = data.description;
    if (data.price !== undefined) payload['price'] = data.price;
    if (data.category !== undefined) payload['category'] = data.category;
    if (data.brand !== undefined) payload['brand'] = data.brand;
    if (data.stockQuantity !== undefined) payload['stock_quantity'] = data.stockQuantity;
    if (data.imageUrl !== undefined) payload['image_url'] = data.imageUrl;
    if (data.rating !== undefined) payload['rating'] = data.rating;
    if (data.reviewCount !== undefined) payload['review_count'] = data.reviewCount;
    if (data.isFeatured !== undefined) payload['is_featured'] = data.isFeatured;
    if (data.isActive !== undefined) payload['is_active'] = data.isActive;

    const resp = await this.request<{ data: { product: RawProduct } }>(
      'PUT',
      `/api/admin/products/${id}`,
      payload,
    );
    return this.normalizeProduct(resp.data.product);
  }

  /**
   * Soft-deletes a product by ID via the admin API.
   */
  async deleteProduct(id: string): Promise<void> {
    await this.request('DELETE', `/api/admin/products/${id}`);
  }

  // ── Cart ───────────────────────────────────────────────────────────────────

  /** Retrieves the authenticated user's cart. */
  async getCart(): Promise<CartData> {
    const resp = await this.request<{ data: Record<string, unknown> }>('GET', '/api/cart');
    return this.normalizeCart(resp.data);
  }

  /**
   * Adds a product to the cart. Uses POST /api/cart/items with
   * { product_id, quantity }.
   */
  async addToCart(productId: string, quantity: number): Promise<CartData> {
    const payload = { product_id: productId, quantity };
    const resp = await this.request<{ data: Record<string, unknown> }>('POST', '/api/cart/items', payload);
    return this.normalizeCart(resp.data);
  }

  /**
   * Clears all items from the authenticated user's cart via DELETE /api/cart.
   */
  async clearCart(): Promise<void> {
    await this.request('DELETE', '/api/cart');
  }

  // ── Orders ─────────────────────────────────────────────────────────────────

  /** Returns all orders for the authenticated user. */
  async getOrders(): Promise<OrderData[]> {
    const resp = await this.request<{ data: { orders: RawOrder[] } }>('GET', '/api/orders');
    return (resp.data.orders ?? []).map((o) => this.normalizeOrder(o));
  }

  /** Returns a single order by ID. */
  async getOrder(id: string): Promise<OrderData> {
    const resp = await this.request<{ data: { order: RawOrder } }>('GET', `/api/orders/${id}`);
    return this.normalizeOrder(resp.data.order);
  }

  /**
   * Creates an order from the current cart contents, using the provided
   * shipping data. Mirrors POST /api/orders body shape.
   */
  async createOrder(shippingData: ShippingData): Promise<OrderData> {
    const payload = {
      shipping: {
        name: shippingData.name,
        email: shippingData.email,
        address_line1: shippingData.addressLine1,
        address_line2: shippingData.addressLine2 ?? '',
        city: shippingData.city,
        state: shippingData.state,
        zip: shippingData.zip,
        country: shippingData.country ?? 'US',
      },
    };
    const resp = await this.request<{ data: { order: RawOrder } }>('POST', '/api/orders', payload);
    return this.normalizeOrder(resp.data.order);
  }

  // ── Token helpers ──────────────────────────────────────────────────────────

  /** Sets the Bearer token that will be included in subsequent requests. */
  setToken(token: string): void {
    this.token = token;
  }

  /** Clears the stored Bearer token. */
  clearToken(): void {
    this.token = null;
  }

  /** Returns the currently stored token, or null if not set. */
  getToken(): string | null {
    return this.token;
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  /**
   * Core HTTP request method. Handles JSON serialisation, auth headers,
   * and error handling. Throws on non-2xx status codes.
   */
  private async request<T = unknown>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const init: RequestInit = {
      method,
      headers,
    };

    if (body !== undefined && method !== 'GET' && method !== 'HEAD') {
      init.body = JSON.stringify(body);
    }

    let response: Response;
    try {
      response = await fetch(url, init);
    } catch (networkErr) {
      throw new Error(
        `ApiService network error: ${method} ${url} — ${String(networkErr)}`,
      );
    }

    let responseBody: unknown;
    const contentType = response.headers.get('content-type') ?? '';
    if (contentType.includes('application/json')) {
      responseBody = await response.json();
    } else {
      responseBody = await response.text();
    }

    if (!response.ok) {
      const msg =
        typeof responseBody === 'object' &&
        responseBody !== null &&
        'message' in responseBody
          ? (responseBody as Record<string, unknown>)['message']
          : response.statusText;
      throw new Error(
        `ApiService HTTP ${response.status}: ${method} ${url} — ${String(msg)}`,
      );
    }

    return responseBody as T;
  }

  // ── Normalisers ────────────────────────────────────────────────────────────

  private normalizeProduct(raw: RawProduct): ProductData {
    return {
      id: raw.id,
      name: raw.name,
      description: raw.description ?? '',
      price: raw.price,
      category: raw.category,
      brand: raw.brand ?? '',
      stockQuantity: raw.stock_quantity ?? raw.stockQuantity ?? 0,
      imageUrl: raw.image_url ?? raw.imageUrl ?? '',
      rating: raw.rating ?? 0,
      reviewCount: raw.review_count ?? raw.reviewCount ?? 0,
      isFeatured: raw.is_featured ?? raw.isFeatured ?? false,
      isActive: raw.is_active !== false,
    };
  }

  private normalizeCart(raw: Record<string, unknown>): CartData {
    const rawItems = (raw['items'] as RawCartItem[] | undefined) ?? [];
    const items = rawItems.map((item) => {
      const price = item.priceAtAdd ?? item.price ?? item.product?.price ?? 0;
      const productId =
        item.product_id ?? item.productId ?? item.product?.id ?? item.id ?? '';
      const productName = item.product?.name ?? item.name ?? '';
      const quantity = item.quantity;
      return {
        productId,
        productName,
        quantity,
        price,
        lineTotal: price * quantity,
      };
    });

    const subtotal = typeof raw['subtotal'] === 'number'
      ? raw['subtotal']
      : items.reduce((s, i) => s + i.lineTotal, 0);
    const tax = typeof raw['tax'] === 'number' ? raw['tax'] : subtotal * 0.08;
    const shipping =
      typeof raw['shipping'] === 'number'
        ? raw['shipping']
        : subtotal >= 50
          ? 0
          : subtotal === 0
            ? 0
            : 5.99;
    const total = typeof raw['total'] === 'number'
      ? raw['total']
      : subtotal + tax + shipping;

    return {
      items,
      subtotal,
      tax,
      shipping,
      total,
      itemCount: items.reduce((s, i) => s + i.quantity, 0),
    };
  }

  private normalizeOrder(raw: RawOrder): OrderData {
    const rawItems = raw.items ?? [];
    const items = rawItems.map((item) => {
      const price = item.priceAtAdd ?? item.price ?? item.product?.price ?? 0;
      const productId =
        item.product_id ?? item.productId ?? item.product?.id ?? item.id ?? '';
      const productName = item.product?.name ?? item.name ?? '';
      const quantity = item.quantity;
      return {
        productId,
        productName,
        quantity,
        price,
        lineTotal: price * quantity,
      };
    });

    return {
      id: raw.id,
      status: raw.status,
      subtotal: raw.subtotal ?? 0,
      tax: raw.tax ?? 0,
      shipping: raw.shipping_cost ?? raw.shippingCost ?? 0,
      total: raw.total,
      createdAt: raw.created_at ?? raw.createdAt ?? new Date().toISOString(),
      updatedAt: raw.updated_at ?? raw.updatedAt,
      items,
      notes: raw.notes,
    };
  }

  private normalizeUser(raw: Record<string, unknown>): UserData {
    return {
      id: raw['id'] as string | undefined,
      name: (raw['name'] as string) ?? '',
      email: (raw['email'] as string) ?? '',
      role: raw['role'] as string | undefined,
      phone: raw['phone'] as string | undefined,
      addressLine1: (raw['address_line1'] ?? raw['addressLine1']) as string | undefined,
      addressLine2: (raw['address_line2'] ?? raw['addressLine2']) as string | undefined,
      city: raw['city'] as string | undefined,
      state: raw['state'] as string | undefined,
      zip: raw['zip'] as string | undefined,
      country: raw['country'] as string | undefined,
      createdAt: (raw['created_at'] ?? raw['createdAt']) as string | undefined,
    };
  }
}
