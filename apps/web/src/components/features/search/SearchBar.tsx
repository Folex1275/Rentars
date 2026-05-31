'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';

interface SearchBarProps {
  onSearch: (location: string) => void;
}

export default function SearchBar({ onSearch }: SearchBarProps) {
  const [location, setLocation] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const handleChange = (value: string) => {
    setLocation(value);
    if (value.length > 0) {
      setSuggestions([
        `${value}, USA`,
        `${value}, Canada`,
        `${value}, UK`,
      ]);
    } else {
      setSuggestions([]);
    }
  };

  const handleSelect = (suggestion: string) => {
    setLocation(suggestion);
    setSuggestions([]);
    onSearch(suggestion);
  };

  return (
    <div className="relative">
      <div className="flex items-center gap-2 bg-white border rounded-lg px-4 py-3">
        <Search size={20} className="text-gray-400" />
        <input
          type="text"
          placeholder="Search by location..."
          value={location}
          onChange={(e) => handleChange(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && onSearch(location)}
          className="flex-1 outline-none"
        />
      </div>
      {suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 bg-white border border-t-0 rounded-b-lg shadow-lg z-10">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              onClick={() => handleSelect(suggestion)}
              className="w-full text-left px-4 py-2 hover:bg-gray-50 border-b last:border-b-0"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
