'use client'

import { useAmosStore, type SearchResult } from '@/store/amos-store'
import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Search, Globe, ExternalLink, Loader2, Sparkles } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'

const QUICK_CHIPS = [
  'AR/VR competitors India',
  'VR in education market trends',
  'AR maintenance training factories',
  'Government AR VR policies India',
]

export function SearchView() {
  const { searchResults, setSearchResults, isSearching, setIsSearching } = useAmosStore()
  const [query, setQuery] = useState('AR VR AI competitors India 2024')

  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      toast.error('Please enter a search query.')
      return
    }
    setIsSearching(true)
    setSearchResults([])
    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery })
      })
      const data = await res.json()
      setSearchResults(data.results || [])
      if (!data.results?.length) {
        toast.info('No results found for this query.')
      }
    } catch {
      toast.error('Search failed. Please try again.')
    } finally {
      setIsSearching(false)
    }
  }, [setIsSearching, setSearchResults])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    performSearch(query)
  }

  const truncateUrl = (url: string) => {
    try {
      const parsed = new URL(url)
      const path = parsed.pathname === '/' ? '' : parsed.pathname
      const full = parsed.host + path
      return full.length > 60 ? full.slice(0, 57) + '...' : full
    } catch {
      return url.length > 60 ? url.slice(0, 57) + '...' : url
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-amber-500" />
          Competitor Intel
        </h2>
        <p className="text-muted-foreground mt-1">
          Search the web for competitor insights, market trends, and industry intelligence.
        </p>
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSubmit} className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for competitors, trends, policies..."
            className="pl-10 h-12 text-base"
          />
        </div>
        <Button
          type="submit"
          disabled={isSearching || !query.trim()}
          className="h-12 px-6"
        >
          {isSearching ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Search className="h-4 w-4 mr-2" />
          )}
          Search
        </Button>
      </form>

      {/* Quick Search Chips */}
      <div className="flex flex-wrap gap-2">
        <span className="text-sm text-muted-foreground self-center mr-1">Quick:</span>
        {QUICK_CHIPS.map((chip) => (
          <button
            key={chip}
            type="button"
            onClick={() => {
              setQuery(chip)
              performSearch(chip)
            }}
            disabled={isSearching}
            className={cn(
              'inline-flex items-center rounded-full border px-3 py-1.5 text-sm',
              'bg-background text-foreground shadow-xs',
              'hover:bg-accent hover:text-accent-foreground',
              'transition-colors cursor-pointer',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            {chip}
          </button>
        ))}
      </div>

      {/* Results Area */}
      <div className="max-h-[600px] overflow-y-auto rounded-lg border bg-background">
        <ScrollArea className="h-full">
          {isSearching ? (
            <div className="space-y-4 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="space-y-3 p-4 rounded-lg border">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                  <div className="flex gap-2">
                    <Skeleton className="h-5 w-24 rounded-full" />
                    <Skeleton className="h-5 w-20 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : searchResults.length > 0 ? (
            <div className="divide-y">
              {searchResults.map((result: SearchResult, index: number) => (
                <SearchResultCard key={result.url + index} result={result} truncateUrl={truncateUrl} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Globe className="h-12 w-12 text-muted-foreground/40 mb-4" />
              <p className="text-lg font-medium text-muted-foreground">No results found</p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                Try a different search query or use one of the quick search suggestions above.
              </p>
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  )
}

function SearchResultCard({
  result,
  truncateUrl,
}: {
  result: SearchResult
  truncateUrl: (url: string) => string
}) {
  return (
    <a
      href={result.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block p-4 hover:bg-accent/50 transition-colors"
    >
      <div className="space-y-1.5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-medium text-sm leading-snug text-foreground hover:underline line-clamp-2">
            {result.name || 'Untitled'}
          </h3>
          <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {result.favicon && (
            <img
              src={result.favicon}
              alt=""
              className="h-3.5 w-3.5 rounded-sm"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none'
              }}
            />
          )}
          <span className="truncate max-w-[300px]">{truncateUrl(result.url)}</span>
        </div>

        <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
          {result.snippet || 'No description available.'}
        </p>

        <div className="flex items-center gap-2 pt-1">
          {result.host_name && (
            <Badge variant="secondary" className="text-xs font-normal">
              {result.host_name}
            </Badge>
          )}
          {result.date && (
            <span className="text-xs text-muted-foreground/70">{result.date}</span>
          )}
          {result.rank != null && (
            <span className="text-xs text-muted-foreground/50 ml-auto">
              #{result.rank}
            </span>
          )}
        </div>
      </div>
    </a>
  )
}