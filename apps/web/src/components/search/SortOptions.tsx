'use client';

interface SortOption {
  label: string;
  value: string;
}

interface SortOptionsProps {
  onSortChange: (sortBy: string) => void;
  currentSort: string;
}

const SORT_OPTIONS: SortOption[] = [
  { label: 'Recommended', value: 'recommended' },
  { label: 'Price: Low to High', value: 'price_asc' },
  { label: 'Price: High to Low', value: 'price_desc' },
  { label: 'Rating: High to Low', value: 'rating_desc' },
  { label: 'Newest', value: 'newest' },
];

export default function SortOptions({ onSortChange, currentSort }: SortOptionsProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-semibold text-gray-700">Sort by:</span>
      <select
        value={currentSort}
        onChange={(e) => onSortChange(e.target.value)}
        className="px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {SORT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
