"""AMOS Scraper Service - Web scraping with Playwright."""

import re
from fastapi import FastAPI
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional

app = FastAPI(title="AMOS Scraper Service")


class ScrapeRequest(BaseModel):
    url: str
    extractLinks: bool = True


class ScrapeBatchRequest(BaseModel):
    urls: list[str]


def clean_text(text: str) -> str:
    """Remove excessive whitespace and normalize text."""
    text = re.sub(r'\n{3,}', '\n\n', text)
    text = re.sub(r' {2,}', ' ', text)
    return text.strip()


def scrape_single_url(url: str, extract_links: bool = True) -> dict:
    """Scrape a single URL using Playwright."""
    from playwright.sync_api import sync_playwright

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        try:
            page = browser.new_page()
            page.goto(url, timeout=15000, wait_until='networkidle')

            # Extract title
            title = page.title() or ''

            # Extract meta description
            description = ''
            desc_el = page.query_selector('meta[name="description"]')
            if desc_el:
                description = desc_el.get_attribute('content') or ''

            # Remove script and style elements for clean text extraction
            page.evaluate('''() => {
                document.querySelectorAll('script, style, noscript').forEach(el => el.remove());
            }''')

            # Extract body text
            body_text = page.evaluate('''() => {
                const body = document.body;
                if (!body) return '';
                return body.innerText || '';
            }''')
            body_text = clean_text(body_text)

            # Extract headings H1-H6
            headings = page.evaluate('''() => {
                const result = [];
                document.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach(h => {
                    result.push(h.textContent?.trim() || '');
                });
                return result.filter(t => t.length > 0);
            }''')

            # Extract links
            links = []
            if extract_links:
                links = page.evaluate('''() => {
                    const result = [];
                    document.querySelectorAll('a[href]').forEach(a => {
                        const text = a.textContent?.trim() || '';
                        const href = a.getAttribute('href') || '';
                        if (text.length > 0 && href.length > 0) {
                            result.push({ text, href });
                        }
                    });
                    return result;
                }''')

            # Word count
            word_count = len(body_text.split()) if body_text else 0

            # Try to detect language from html lang attribute
            language = None
            lang_attr = page.evaluate('''() => document.documentElement.lang || null''')
            if lang_attr:
                language = lang_attr.split('-')[0] if lang_attr else None

            return {
                'url': url,
                'title': title,
                'description': description,
                'content': body_text,
                'headings': headings,
                'links': links,
                'metadata': {
                    'wordCount': word_count,
                    'language': language,
                },
            }
        finally:
            browser.close()


@app.get('/health')
def health():
    return {'status': 'ok', 'service': 'scraper'}


@app.post('/scrape')
def scrape(req: ScrapeRequest):
    try:
        data = scrape_single_url(req.url, req.extractLinks)
        return {'success': True, 'data': data}
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={'success': False, 'error': f'Scrape failed: {str(e)}'},
        )


@app.post('/scrape-batch')
def scrape_batch(req: ScrapeBatchRequest):
    results = []
    for url in req.urls:
        try:
            data = scrape_single_url(url)
            results.append({'url': url, 'success': True, 'data': data})
        except Exception as e:
            results.append({'url': url, 'success': False, 'error': str(e)})
    return {'results': results}