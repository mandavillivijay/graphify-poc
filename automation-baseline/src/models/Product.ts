/**
 * Product.ts — Core domain models for the ShopHub test automation framework.
 *
 * These interfaces mirror the shapes returned by the ShopHub API and used
 * throughout page objects, services, workflows, and validators.
 */

// ---------------------------------------------------------------------------
// Product
// ---------------------------------------------------------------------------

export interface ProductData {
  id?: string;
  name: string;
  description: string;
  price: number;
  category: string;
  brand: string;
  stockQuantity: number;
  imageUrl?: string;
  rating?: number;
  reviewCount?: number;
  isFeatured?: boolean;
  isActive?: boolean;
}

// ---------------------------------------------------------------------------
// Cart
// ---------------------------------------------------------------------------

export interface CartItemData {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  lineTotal: number;
}

export interface CartData {
  items: CartItemData[];
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
  itemCount: number;
}

// ---------------------------------------------------------------------------
// Order
// ---------------------------------------------------------------------------

export interface OrderData {
  id: string;
  status: string;
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
  createdAt: string;
  updatedAt?: string;
  items: CartItemData[];
  shippingAddress?: ShippingAddressData;
  notes?: string;
}

export interface ShippingAddressData {
  name: string;
  email: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

// ---------------------------------------------------------------------------
// User
// ---------------------------------------------------------------------------

export interface UserData {
  id?: string;
  name: string;
  email: string;
  password?: string;
  role?: string;
  phone?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  createdAt?: string;
}

// ---------------------------------------------------------------------------
// Shipping
// ---------------------------------------------------------------------------

export interface ShippingData {
  name: string;
  email: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

// ---------------------------------------------------------------------------
// Checkout result
// ---------------------------------------------------------------------------

export interface CheckoutResult {
  orderId: string;
  success: boolean;
  message: string;
  total?: number;
}

// ---------------------------------------------------------------------------
// API response wrappers
// ---------------------------------------------------------------------------

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  totalPages: number;
  limit: number;
}

export interface ProductsListResponse {
  products: ProductData[];
  total: number;
  page: number;
  totalPages: number;
}

export interface OrdersListResponse {
  orders: OrderData[];
  total: number;
  page: number;
  totalPages: number;
}
