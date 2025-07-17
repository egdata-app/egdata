import React from 'react';
import type { SearchV2Response } from '@/types/search-v2';

export interface SearchFiltersV2Props {
  query: Record<string, unknown>;
  onQueryChange: (newQuery: Partial<Record<string, unknown>>) => void;
  loading: boolean;
  results?: SearchV2Response | null;
}

const OFFER_TYPES = [
  'IN_GAME_PURCHASE',
  'BASE_GAME',
  'EXPERIENCE',
  'UNLOCKABLE',
  'ADD_ON',
  'Bundle',
  'CONSUMABLE',
  'WALLET',
  'OTHERS',
  'DEMO',
  'DLC',
  'VIRTUAL_CURRENCY',
  'BUNDLE',
  'DIGITAL_EXTRA',
  'EDITION',
  'SUBSCRIPTION',
];

export function SearchFiltersV2({
  query,
  onQueryChange,
  loading,
  results,
}: SearchFiltersV2Props) {
  // Extract tags from aggregations if available
  const tagBuckets = results?.aggregations?.tags?.buckets || [];
  const selectedTags = Array.isArray(query.tags)
    ? query.tags
    : query.tags
      ? [query.tags]
      : [];

  return (
    <aside className="flex flex-col gap-4 w-80">
      <input
        type="search"
        placeholder="Search for games"
        className="input input-bordered"
        value={(query.q as string) || ''}
        onChange={(e) => onQueryChange({ q: e.target.value, page: 1 })}
        disabled={loading}
        id="search-title-input"
      />
      <select
        className="select select-bordered"
        value={(query.offerType as string) || ''}
        onChange={(e) =>
          onQueryChange({ offerType: e.target.value || undefined, page: 1 })
        }
        disabled={loading}
      >
        <option value="">All Offer Types</option>
        {OFFER_TYPES.map((type) => (
          <option key={type} value={type}>
            {type.replace(/_/g, ' ')}
          </option>
        ))}
      </select>
      <div>
        <label
          className="block mb-1 font-semibold"
          htmlFor="search-tags-filter"
        >
          Tags
        </label>
        <div className="flex flex-wrap gap-2" id="search-tags-filter">
          {tagBuckets.map((tag) => (
            <button
              key={tag.key}
              type="button"
              className={`px-2 py-1 rounded border ${selectedTags.includes(tag.key) ? 'bg-primary text-white' : 'bg-gray-200'}`}
              onClick={(e) => {
                e.preventDefault();
                const newTags = selectedTags.includes(tag.key)
                  ? selectedTags.filter((t: string) => t !== tag.key)
                  : [...selectedTags, tag.key];
                onQueryChange({ tags: newTags, page: 1 });
              }}
              disabled={loading}
            >
              {tag.key}{' '}
              <span className="text-xs text-gray-500">({tag.doc_count})</span>
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}
