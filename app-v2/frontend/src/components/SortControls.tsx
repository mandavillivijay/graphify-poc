import React from 'react';

const SORT_OPTIONS = [
  { value: 'featured', label: 'Featured' },
  { value: 'price_asc', label: 'Price ↑' },
  { value: 'price_desc', label: 'Price ↓' },
  { value: 'rating', label: 'Rating' },
  { value: 'name', label: 'Name A-Z' },
];

interface SortControlsProps {
  currentSort: string;
  onSortChange: (sort: string) => void;
}

const SortControls: React.FC<SortControlsProps> = ({ currentSort, onSortChange }) => {
  return (
    <div
      data-testid="sort-controls"
      style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}
    >
      {SORT_OPTIONS.map((opt) => {
        const isActive = currentSort === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => onSortChange(opt.value)}
            data-testid={`sort-btn-${opt.value}`}
            data-sort={opt.value}
            aria-pressed={isActive}
            style={{
              padding: '6px 14px',
              border: `1px solid ${isActive ? '#4f46e5' : '#d1d5db'}`,
              borderRadius: '20px',
              backgroundColor: isActive ? '#4f46e5' : '#fff',
              color: isActive ? '#fff' : '#374151',
              fontSize: '13px',
              fontWeight: isActive ? 600 : 400,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              whiteSpace: 'nowrap',
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
};

export default SortControls;
