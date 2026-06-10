export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  phone?: string;
  addressLine1?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  brand: string;
  stockQuantity: number;
  imageUrl?: string;
  rating: number;
  reviewCount: number;
  isFeatured: boolean;
}

export interface CartItem {
  id: string;
  productId: string;
  product: Product;
  quantity: number;
  priceAtAdd: number;
}

export interface Cart {
  id: string;
  items: CartItem[];
}

export interface Order {
  id: string;
  status: string;
  subtotal: number;
  tax: number;
  shippingCost: number;
  total: number;
  shippingName: string;
  shippingEmail: string;
  shippingAddressLine1: string;
  shippingCity: string;
  shippingState: string;
  shippingZip: string;
  shippingCountry: string;
  items: OrderItem[];
  createdAt: string;
}

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  productPrice: number;
  quantity: number;
  subtotal: number;
}

export interface ProductFilters {
  category?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  sort?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface AdminStats {
  totalProducts: number;
  totalOrders: number;
  totalUsers: number;
  totalRevenue: number;
}
