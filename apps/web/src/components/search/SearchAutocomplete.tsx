'use client';

import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { usePropertySearch } from '@/hooks/usePropertySearch';

interface SearchAutocompleteProps {
  onSearch: (query: string) => void;
  placeholder?: string;
}

export default function SearchAutocomplete({ onSearch, placeholder = 'Search properties...' }: SearchAutocompleteProps) {
  const [input, setInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const { suggestions, getSuggestions, getTrending } = usePropertySearch();

  useEffect(() => {
    if (input.length >= 2) {
      getSuggestions(input);
      setShowSuggestions(true);
    } else if (input.length === 0) {
      getTrending();
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  }, [input, getSuggestions, getTrending]);

  const handleSelectSuggestion = (query: string) => {
    setInput(query);
    setShowSuggestions(false);
    onSearch(query);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      setShowSuggestions(false);
      onSearch(input);
    }
  };

  return (
    <div className="relative w-full">
      <form onSubmit={handleSearch} className="relative">
        <Search size={20} className="absolute left-3 top-3 text-gray-400" />
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          placeholder={placeholder}
          className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </form>

      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg z-10">
          {suggestions.map((suggestion, idx) => (
            <button
              key={idx}
              onClick={() => handleSelectSuggestion(suggestion)}
              className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm"
            >
              <Search size={14} className="inline mr-2 text-gray-400" />
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
