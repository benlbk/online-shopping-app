"use client";

import { useState, useCallback, useRef, useEffect } from 'react';
import { useDebounce } from '@/hooks/useDebounce';
import { SearchIcon, XIcon } from '@heroicons/react/outline';
import { useSearchProducts } from '@/hooks/useSearchProducts';

export default function SearchBar() {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debouncedQuery = useDebounce(query, 300);

  const { data, isLoading } = useSearchProducts(debouncedQuery);

  const handleClear = useCallback(() => {
    setQuery('');
    inputRef.current?.focus();
  }, []);

  return (
    <div className="relative max-w-xl w-full">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 200)}
          placeholder="Search products..."
          className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <SearchIcon className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
        {query && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 transform -translate-y-1/2"
          >
            <XIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
          </button>
        )}
      </div>

      {isFocused && query.length >= 3 && (
        <div className="absolute z-50 w-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200">
          {isLoading ? (
            <div className="p-4 text-center text-gray-500">Loading...</div>
          ) : data?.results.length ? (
            <ul className="max-h-96 overflow-auto">
              {data.results.map((product) => (
                <li
                  key={product.id}
                  className="p-4 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                >
                  <div className="flex items-center gap-4">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-16 h-16 object-cover rounded"
                    />
                    <div>
                      <h3 className="font-medium">{product.name}</h3>
                      <p className="text-gray-600">${product.price}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-4 text-center text-gray-500">
              No products found
            </div>
          )}
        </div>
      )}
    </div>
  );
}
