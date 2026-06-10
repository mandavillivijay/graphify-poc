import React from 'react';

interface FilterPanelProps {
  categories: string[];
  selectedCategories: string[];
  onCategoryChange: (category: string) => void;
  priceMin: string;
  priceMax: string;
  onPriceChange: (type: 'min' | 'max', value: string) => void;
  inStock: boolean;
  onInStockChange: (checked: boolean) => void;
  onClearFilters: () => void;
}

const FilterPanel: React.FC<FilterPanelProps> = ({
  categories,
  selectedCategories,
  onCategoryChange,
  priceMin,
  priceMax,
  onPriceChange,
  inStock,
  onInStockChange,
  onClearFilters,
}) => {
  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    boxSizing: 'border-box',
    outline: 'none',
  };

  const hasActiveFilters =
    selectedCategories.length > 0 || priceMin || priceMax || inStock;

  return (
    <aside
      data-testid="filter-panel"
      style={{
        width: '220px',
        flexShrink: 0,
        backgroundColor: '#fff',
        border: '1px solid #e5e7eb',
        borderRadius: '12px',
        padding: '20px',
        height: 'fit-content',
        position: 'sticky',
        top: '76px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ margin: 0, fontSize: '16px', color: '#111827' }}>Filters</h3>
        {hasActiveFilters && (
          <button
            onClick={onClearFilters}
            data-testid="clear-filters-btn"
            style={{ fontSize: '12px', color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
          >
            Clear All
          </button>
        )}
      </div>

      {/* Categories */}
      <div style={{ marginBottom: '20px' }} data-testid="category-filter-group">
        <h4 style={{ margin: '0 0 10px', fontSize: '13px', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Category
        </h4>
        {categories.map((cat) => (
          <label
            key={cat}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', cursor: 'pointer', fontSize: '14px', color: '#374151' }}
          >
            <input
              type="checkbox"
              checked={selectedCategories.includes(cat)}
              onChange={() => onCategoryChange(cat)}
              data-testid={`category-checkbox-${cat.toLowerCase().replace(/\s+/g, '-')}`}
              style={{ accentColor: '#4f46e5' }}
            />
            {cat}
          </label>
        ))}
      </div>

      {/* Price Range */}
      <div style={{ marginBottom: '20px' }} data-testid="price-filter-group">
        <h4 style={{ margin: '0 0 10px', fontSize: '13px', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Price Range
        </h4>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            type="number"
            value={priceMin}
            onChange={(e) => onPriceChange('min', e.target.value)}
            placeholder="Min"
            min="0"
            id="filter-price-min"
            data-testid="filter-price-min"
            style={{ ...inputStyle, width: '50%' }}
          />
          <input
            type="number"
            value={priceMax}
            onChange={(e) => onPriceChange('max', e.target.value)}
            placeholder="Max"
            min="0"
            id="filter-price-max"
            data-testid="filter-price-max"
            style={{ ...inputStyle, width: '50%' }}
          />
        </div>
      </div>

      {/* In Stock Toggle */}
      <div data-testid="instock-filter-group">
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', color: '#374151' }}>
          <input
            type="checkbox"
            checked={inStock}
            onChange={(e) => onInStockChange(e.target.checked)}
            id="filter-in-stock"
            data-testid="filter-in-stock"
            style={{ accentColor: '#4f46e5' }}
          />
          In Stock Only
        </label>
      </div>
    </aside>
  );
};

export default FilterPanel;
