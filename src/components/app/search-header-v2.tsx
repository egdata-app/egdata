import type { SearchV2Response } from '@/types/search-v2';
import React from 'react';

export interface SearchHeaderV2Props {
  query: Record<string, unknown>;
  loading: boolean;
  results: SearchV2Response | null;
}

export function SearchHeaderV2({
  query,
  loading,
  results,
}: SearchHeaderV2Props) {
  const queryString = typeof query.q === 'string' ? query.q : undefined;
  return (
    <header className="flex flex-col gap-2 w-full">
      <div className="flex flex-row items-center gap-4">
        <h2 className="text-2xl font-bold">
          {results ? `${results.total} results` : 'Search'}
        </h2>
        {loading && (
          <span className="text-primary animate-pulse">Loading...</span>
        )}
      </div>
      {queryString && (
        <div className="text-gray-400 text-sm">
          Showing results for{' '}
          <span className="font-semibold">{queryString}</span>
        </div>
      )}
    </header>
  );
}
