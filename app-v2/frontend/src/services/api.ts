import axios from 'axios';
import { User, Product, Cart, Order, ProductFilters, AdminStats } from '../types';

const api = axios.create({
  baseURL: 'http://localhost:3001/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
    }
    return Promise.reject(error);
  }
);

// Auth
export const authApi = {
  login: async (email: string, password: string): Promise<{ token: string; user: User }> => {
    const res = await api.post('/auth/login', { email, password });
    return res.data;
  },
  register: async (name: string, email: string, password: string): Promise<{ token: string; user: User }> => {
    const res = await api.post('/auth/register', { name, email, password });
    return res.data;
  },
  logout: async (): Promise<void> => {
    await api.post('/auth/logout');
  },
  getProfile: async (): Promise<User> => {
    const res = await api.get('/auth/profile');
    return res.data;
  },
  updateProfile: async (data: Partial<User>): Promise<User> => {
    const res = await api.put('/auth/profile', data);
    return res.data;
  },
};

// Products
export interface ProductsResponse {
  products: Product[];
  total: number;
  page: number;
  totalPages: number;
}

export const productsApi = {
  getProducts: async (filters: ProductFilters = {}): Promise<ProductsResponse> => {
    const params: Record<string, string | number | boolean> = {};
    if (filters.category) params.category = filters.category;
    if (filters.brand) params.brand = filters.brand;
    if (filters.minPrice !== undefined) params.minPrice = filters.minPrice;
    if (filters.maxPrice !== undefined) params.maxPrice = filters.maxPrice;
    if (filters.inStock !== undefined) params.inStock = filters.inStock;
    if (filters.sort) params.sort = filters.sort;
    if (filters.search) params.search = filters.search;
    if (filters.page) params.page = filters.page;
    if (filters.limit) params.limit = filters.limit;
    const res = await api.get('/products', { params });
    return res.data;
  },
  getProduct: async (id: string): Promise<Product> => {
    const res = await api.get(`/products/${id}`);
    return res.data;
  },
  getCategories: async (): Promise<string[]> => {
    const res = await api.get('/products/categories');
    return res.data;
  },
  getFeatured: async (): Promise<Product[]> => {
    const res = await api.get('/products/featured');
    return res.data;
  },
};

// Cart
export const cartApi = {
  getCart: async (): Promise<Cart> => {
    const res = await api.get('/cart');
    return res.data;
  },
  addItem: async (productId: string, quantity: number): Promise<Cart> => {
    const res = await api.post('/cart/items', { productId, quantity });
    return res.data;
  },
  updateItem: async (itemId: string, quantity: number): Promise<Cart> => {
    const res = await api.put(`/cart/items/${itemId}`, { quantity });
    return res.data;
  },
  removeItem: async (itemId: string): Promise<Cart> => {
    const res = await api.delete(`/cart/items/${itemId}`);
    return res.data;
  },
  clearCart: async (): Promise<void> => {
    await api.delete('/cart');
  },
};

// Orders
export interface ShippingData {
  shippingName: string;
  shippingEmail: string;
  shippingAddressLine1: string;
  shippingCity: string;
  shippingState: string;
  shippingZip: string;
  shippingCountry: string;
}

export interface GuestOrderData {
  guestEmail: string;
  shipping: {
    name: string;
    email: string;
    address_line1: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
  cartItems: { productId: string; quantity: number }[];
}

export const ordersApi = {
  getOrders: async (): Promise<Order[]> => {
    const res = await api.get('/orders');
    return res.data;
  },
  getOrder: async (id: string): Promise<Order> => {
    const res = await api.get(`/orders/${id}`);
    return res.data;
  },
  createOrder: async (shippingData: ShippingData): Promise<Order> => {
    // Map camelCase frontend fields to the nested shipping object the backend expects
    const payload = {
      shipping: {
        name: shippingData.shippingName,
        email: shippingData.shippingEmail,
        address_line1: shippingData.shippingAddressLine1,
        city: shippingData.shippingCity,
        state: shippingData.shippingState,
        zip: shippingData.shippingZip,
        country: shippingData.shippingCountry,
      },
    };
    const res = await api.post('/orders', payload);
    return res.data.data?.order ?? res.data;
  },
  // CHANGE-4: guest checkout
  createGuestOrder: async (data: GuestOrderData): Promise<Order> => {
    const res = await api.post('/orders/guest', data);
    return res.data.data?.order ?? res.data;
  },
};

// Admin
export const adminApi = {
  getProducts: async (): Promise<Product[]> => {
    const res = await api.get('/admin/products');
    return res.data;
  },
  createProduct: async (data: Omit<Product, 'id' | 'rating' | 'reviewCount'>): Promise<Product> => {
    const res = await api.post('/admin/products', data);
    return res.data;
  },
  updateProduct: async (id: string, data: Partial<Product>): Promise<Product> => {
    const res = await api.put(`/admin/products/${id}`, data);
    return res.data;
  },
  deleteProduct: async (id: string): Promise<void> => {
    await api.delete(`/admin/products/${id}`);
  },
  getOrders: async (): Promise<Order[]> => {
    const res = await api.get('/admin/orders');
    return res.data;
  },
  updateOrderStatus: async (id: string, status: string): Promise<Order> => {
    const res = await api.put(`/admin/orders/${id}/status`, { status });
    return res.data;
  },
  getStats: async (): Promise<AdminStats> => {
    const res = await api.get('/admin/stats');
    return res.data;
  },
};

export default api;
