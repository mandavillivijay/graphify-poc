import React from 'react';

interface StarRatingProps {
  rating: number;
  maxStars?: number;
  size?: number;
}

const StarRating: React.FC<StarRatingProps> = ({ rating, maxStars = 5, size = 16 }) => {
  return (
    <span style={{ display: 'inline-flex', gap: '2px', alignItems: 'center' }}>
      {Array.from({ length: maxStars }, (_, i) => {
        const filled = i < Math.floor(rating);
        const partial = !filled && i < rating;
        return (
          <svg
            key={i}
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill={filled ? '#f59e0b' : 'none'}
            stroke={filled || partial ? '#f59e0b' : '#d1d5db'}
            strokeWidth="2"
          >
            <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
          </svg>
        );
      })}
    </span>
  );
};

export default StarRating;
