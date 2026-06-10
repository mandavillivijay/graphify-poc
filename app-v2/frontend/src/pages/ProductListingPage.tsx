import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { productsApi, ProductsResponse } from '../services/api';
import { Product, ProductFilters } from '../types';
import ProductCard from '../components/ProductCard';
import LoadingSpinner from '../components/LoadingSpinner';
import FilterPanel from '../components/FilterPanel';
import SortControls from '../components/SortControls';

const ProductListingPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  // Multi-select categories (array instead of single string)
  const [selectedCategories, setSelectedCategories] = useState<string[]>(() => {
    const cat = searchParams.get('category');
    return cat ? [cat] : [];
  });
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [inStock, setInStock] = useState(false);
  const [sort, setSort] = useState('featured');
  const [page, setPage] = useState(1);
  const LIMIT = 12;

  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    setError('');
    const filters: ProductFilters = {
      sort,
      page,
      limit: LIMIT,
    };
    if (search) filters.search = search;
    // Use first selected category for API (backend supports single)
    if (selectedCategories.length > 0) filters.category = selectedCategories[0];
    if (minPrice) filters.minPrice = parseFloat(minPrice);
    if (maxPrice) filters.maxPrice = parseFloat(maxPrice);
    if (inStock) filters.inStock = true;

    try {
      const data: ProductsResponse = await productsApi.getProducts(filters);
      setProducts(data.products);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch {
      setError('Failed to load products. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [search, selectedCategories, minPrice, maxPrice, inStock, sort, page]);

  const fetchCategories = useCallback(async () => {
    try {
      const cats = await productsApi.getCategories();
      setCategories(cats);
    } catch {
      // non-critical
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const handleCategoryChange = (cat: string) => {
    setSelectedCategories((prev) => {
      if (prev.includes(cat)) {
        return prev.filter((c) => c !== cat);
      }
      return [...prev, cat];
    });
    setPage(1);
  };

  const handleSortChange = (newSort: string) => {
    setSort(newSort);
    setPage(1);
  };

  const handlePriceChange = (type: 'min' | 'max', value: string) => {
    if (type === 'min') setMinPrice(value);
    else setMaxPrice(value);
    setPage(1);
  };

  const handleInStockChange = (checked: boolean) => {
    setInStock(checked);
    setPage(1);
  };

  const handleClearFilters = () => {
    setSearch('');
    setSearchInput('');
    setSelectedCategories([]);
    setMinPrice('');
    setMaxPrice('');
    setInStock(false);
    setSort('featured');
    setPage(1);
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    boxSizing: 'border-box',
    outline: 'none',
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px 16px' }}>
      {/* Search Bar */}
      <form onSubmit={handleSearch} style={{ display: 'flex', gap: '10px', marginBottom: '24px' }}>
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search products..."
          id="product-search-input"
          data-testid="product-search-input"
          style={{ ...inputStyle, flexGrow: 1, fontSize: '16px', padding: '12px 16px' }}
        />
        <button
          type="submit"
          data-testid="product-search-btn"
          style={{ padding: '12px 24px', backgroundColor: '#4f46e5', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 600, cursor: 'pointer' }}
        >
          Search
        </button>
      </form>

      <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
        {/* FilterPanel Component */}
        <FilterPanel
          categories={categories}
          selectedCategories={selectedCategories}
          onCategoryChange={handleCategoryChange}
          priceMin={minPrice}
          priceMax={maxPrice}
          onPriceChange={handlePriceChange}
          inStock={inStock}
          onInStockChange={handleInStockChange}
          onClearFilters={handleClearFilters}
        />

        {/* Main Content */}
        <div style={{ flexGrow: 1, minWidth: 0 }}>
          {/* Top Bar with SortControls */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
            <span style={{ fontSize: '14px', color: '#6b7280' }} data-testid="product-count">
              {isLoading ? 'Loading...' : `${total} product${total !== 1 ? 's' : ''} found`}
            </span>
            {/* SortControls Component — renders buttons, not a select */}
            <SortControls currentSort={sort} onSortChange={handleSortChange} />
          </div>

          {/* Error */}
          {error && (
            <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fca5a5', color: '#dc2626', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px' }}>
              {error}
            </div>
          )}

          {/* Product Grid */}
          {isLoading ? (
            <LoadingSpinner />
          ) : products.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#6b7280' }}>
              <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5" style={{ marginBottom: '16px' }}>
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <p style={{ fontSize: '18px', fontWeight: 500 }}>No products found</p>
              <p style={{ fontSize: '14px', marginTop: '4px' }}>Try adjusting your search or filters.</p>
            </div>
          ) : (
            <div
              data-testid="product-grid"
              style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '20px' }}
            >
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}

          {/* Pagination */}
          {!isLoading && totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '32px' }}>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                style={{ padding: '8px 16px', border: '1px solid #d1d5db', borderRadius: '6px', backgroundColor: page === 1 ? '#f3f4f6' : '#fff', cursor: page === 1 ? 'not-allowed' : 'pointer', color: '#374151' }}
              >
                Previous
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  style={{
                    padding: '8px 14px',
                    border: '1px solid',
                    borderColor: p === page ? '#4f46e5' : '#d1d5db',
                    borderRadius: '6px',
                    backgroundColor: p === page ? '#4f46e5' : '#fff',
                    color: p === page ? '#fff' : '#374151',
                    cursor: 'pointer',
                    fontWeight: p === page ? 600 : 400,
                  }}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                style={{ padding: '8px 16px', border: '1px solid #d1d5db', borderRadius: '6px', backgroundColor: page === totalPages ? '#f3f4f6' : '#fff', cursor: page === totalPages ? 'not-allowed' : 'pointer', color: '#374151' }}
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductListingPage;
