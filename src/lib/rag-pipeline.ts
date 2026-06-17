/**
 * RAG (Retrieval-Augmented Generation) Pipeline
 *
 * Orchestrates: Search → Scrape → Extract → Send to AI → Generate Final Answer.
 * Used by the AMOS chat system to provide real-time, sourced responses.
 */

import { chatCompletion, type AIProvider } from './ai-provider';
import { webSearch, type SearchResult } from './search-client';
import { scrapeUrl, type ScrapedPage } from './scraper-client';

export interface ResearchStep {
  type: 'search' | 'scrape' | 'analyze' | 'thinking';
  label: string;
  detail?: string;
  timestamp: number;
}

export interface ResearchSource {
  type: 'web' | 'scraped' | 'database' | 'model';
  title: string;
  url?: string;
  snippet?: string;
}

export interface ResearchResult {
  answer: string;
  sources: ResearchSource[];
  steps: ResearchStep[];
  provider: AIProvider;
  searchResults?: SearchResult[];
  scrapedPages?: ScrapedPage[];
}

// Determine if a query needs real-time search vs can be answered from model knowledge
function needsSearch(query: string): boolean {
  const searchTriggers = [
    /find\b.*?(companies?|schools?|prospects?|leads?|institutions?|clients?|businesses?)/i,
    /search\b.*?(for|about)/i,
    /who (is|are|makes|provides)/i,
    /what (is|are|happened|new|latest|current)/i,
    /competitor/i,
    /market (size|share|trend|analysis)/i,
    /news/i,
    /recent/i,
    /latest/i,
    /current/i,
    /2025/i,
    /tender/i,
    /pricing/i,
    /website/i,
    /(linkedin|twitter|instagram|facebook|social media).*(profile|page|account)/i,
  ];
  return searchTriggers.some((pattern) => pattern.test(query));
}

// Truncate content to fit within model context
function truncateContent(content: string, maxChars: number = 8000): string {
  if (content.length <= maxChars) return content;
  return content.slice(0, maxChars) + '\n\n[... content truncated ...]';
}

// Main research pipeline
export async function researchAndAnswer(
  query: string,
  options?: {
    systemPrompt?: string;
    maxSearchResults?: number;
    maxScrapePages?: number;
    conversationHistory?: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
    forceSearch?: boolean;
    forceScrape?: string[]; // URLs to scrape
  }
): Promise<ResearchResult> {
  const steps: ResearchStep[] = [];
  const sources: ResearchSource[] = [];
  let searchResults: SearchResult[] = [];
  let scrapedPages: ScrapedPage[] = [];

  const shouldSearch = options?.forceSearch || needsSearch(query);
  let contextData = '';

  // Step 1: Search the web
  if (shouldSearch) {
    steps.push({ type: 'search', label: 'Searching the web...', timestamp: Date.now() });
    const searchRes = await webSearch(query, { num: options?.maxSearchResults || 8 });

    if (searchRes.success && searchRes.results.length > 0) {
      searchResults = searchRes.results;
      steps[steps.length - 1].detail = `Found ${searchResults.length} results`;

      // Add search results as sources
      for (const r of searchResults.slice(0, 5)) {
        sources.push({
          type: 'web',
          title: r.name,
          url: r.url,
          snippet: r.snippet,
        });
      }

      // Build context from search snippets
      contextData += '## Web Search Results\n\n';
      for (const r of searchResults) {
        contextData += `### ${r.name}\n${r.snippet}\nSource: ${r.url}\n\n`;
      }
    } else {
      steps[steps.length - 1].detail = searchRes.error || 'No results found';
    }
  }

  // Step 2: Scrape relevant pages (if URLs provided or from search results)
  const urlsToScrape =
    options?.forceScrape ||
    (searchResults.length > 0
      ? searchResults.slice(0, options?.maxScrapePages || 2).map((r) => r.url)
      : []);

  if (urlsToScrape.length > 0) {
    steps.push({
      type: 'scrape',
      label: `Scraping ${urlsToScrape.length} page(s)...`,
      timestamp: Date.now(),
    });

    for (const url of urlsToScrape) {
      steps.push({
        type: 'scrape',
        label: `Reading: ${new URL(url).hostname}`,
        timestamp: Date.now(),
      });
      const scrapeRes = await scrapeUrl(url, { extractLinks: false });

      if (scrapeRes.success && scrapeRes.data) {
        const page = scrapeRes.data;
        scrapedPages.push(page);
        steps[steps.length - 1].detail = `Extracted ${page.metadata.wordCount} words`;

        sources.push({
          type: 'scraped',
          title: page.title,
          url: page.url,
          snippet: page.description || page.content.slice(0, 200),
        });

        contextData += `\n## Scraped: ${page.title}\n\n${truncateContent(page.content, 4000)}\n\n`;
      } else {
        steps[steps.length - 1].detail = scrapeRes.error || 'Failed to scrape';
      }
    }
  }

  // Step 3: Generate AI response with context
  steps.push({
    type: 'analyze',
    label: 'Analyzing and generating response...',
    timestamp: Date.now(),
  });

  const systemPrompt =
    options?.systemPrompt ||
    'You are AMOS, a helpful AI assistant for Madras MindWorks (AR/VR/AI company in Chennai, India). Answer the user\'s question directly and naturally. Do NOT generate email content or marketing copy unless explicitly asked. Base your answers on the provided research data. Cite sources when possible.';

  let fullSystemPrompt = systemPrompt;
  if (contextData) {
    fullSystemPrompt += `\n\n## Retrieved Context (real-time data)\n\n${truncateContent(contextData, 12000)}\n\nIMPORTANT: Use the above real-time data to inform your answer. When you reference information from the context, cite the source URL. If the context doesn't contain relevant information, use your knowledge but clearly note that.`;
  }

  const messages = [
    { role: 'system' as const, content: fullSystemPrompt },
    ...(options?.conversationHistory || []).slice(-4),
    { role: 'user' as const, content: query },
  ];

  try {
    const { content: answer, provider } = await chatCompletion(messages, { maxTokens: 4096 });
    steps[steps.length - 1].detail = `Completed using ${provider}`;

    return {
      answer,
      sources,
      steps,
      provider,
      searchResults: searchResults.length > 0 ? searchResults : undefined,
      scrapedPages: scrapedPages.length > 0 ? scrapedPages : undefined,
    };
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    steps[steps.length - 1].detail = `Error: ${errMsg}`;

    // If AI fails but we have search results, return a basic summary
    if (searchResults.length > 0) {
      const fallbackAnswer = `Based on my research, here's what I found:\n\n${searchResults
        .slice(0, 5)
        .map((r) => `**${r.name}**\n${r.snippet}\n[Source](${r.url})\n`)
        .join(
          '\n'
        )}\n\n_Note: AI analysis unavailable. Showing raw search results._`;
      return {
        answer: fallbackAnswer,
        sources,
        steps,
        provider: 'none',
        searchResults,
      };
    }

    throw error;
  }
}