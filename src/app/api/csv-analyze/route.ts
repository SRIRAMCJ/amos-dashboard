import { NextRequest, NextResponse } from 'next/server';
import { chatCompletion, getAIProvider } from '@/lib/ai-provider';

// ── CSV Parsing Helpers ───────────────────────────────────────────────────

function parseCSV(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return { headers: [], rows: [] };

  // Detect delimiter
  const firstLine = lines[0];
  const delimiter = firstLine.includes('\t') ? '\t' : firstLine.includes(';') ? ';' : ',';

  const headers = parseLine(firstLine, delimiter);
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const values = parseLine(line, delimiter);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h.trim()] = (values[idx] || '').trim();
    });
    rows.push(row);
  }

  return { headers, rows };
}

function parseLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === delimiter) {
        result.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
  }
  result.push(current);
  return result;
}

// ── Column Detection ──────────────────────────────────────────────────────

type MetricType = 'date' | 'numeric' | 'text' | 'engagement_rate' | 'percent';

interface ColumnInfo {
  name: string;
  type: MetricType;
  sample: string[];
}

const DATE_PATTERNS = [
  /^date$/i, /^time$/i, /^timestamp$/i, /^day$/i, /^week$/i, /^month$/i, /^year$/i,
  /^posted$/i, /^created/i, /^published/i, /^period$/i, /^start/i, /^end/i,
];

const ENGAGEMENT_METRICS = [
  'engagement', 'engagement rate', 'eng. rate', 'er',
];

const NUMERIC_PATTERNS = [
  /impressions?/i, /reach/i, /likes?/i, /love/i, /reactions?/i,
  /comments?/i, /replies?/i, /shares?/i, /retweets?/i, /reposts?/i,
  /saves?/i, /clicks?/i, /ctr/i, /link clicks?/i, /profile visits?/i,
  /followers?/i, /following/i, /subscribers?/i, /views?/i, /plays?/i,
  /mentions?/i, /tags?/i, /hashtags?/i, /sentiment/i, /score/i,
  /count/i, /total/i, /growth/i, /change/i, /delta/i, /gain/i, /loss/i,
  /video views?/i, /story views?/i, /reach rate/i, /frequency/i,
];

function detectColumnType(name: string, sampleValues: string[]): MetricType {
  const lower = name.toLowerCase().trim();

  // Check if it's a date column
  if (DATE_PATTERNS.some((p) => p.test(lower))) return 'date';
  if (sampleValues.length > 0 && sampleValues.every((v) => isNaN(Date.parse(v)) === false)) return 'date';

  // Check if it's engagement rate or percentage
  if (ENGAGEMENT_METRICS.some((m) => lower.includes(m))) return 'engagement_rate';
  if (lower.includes('rate') || lower.includes('percent') || lower.includes('%')) {
    if (sampleValues.length > 0 && sampleValues.every((v) => v === '' || !isNaN(parseFloat(v.replace('%', ''))))) {
      return 'engagement_rate';
    }
  }

  // Check if it's numeric
  if (NUMERIC_PATTERNS.some((p) => p.test(lower))) return 'numeric';
  // Heuristic: if most sample values are numeric
  const nonEmpty = sampleValues.filter((v) => v !== '');
  if (nonEmpty.length > 0 && nonEmpty.every((v) => !isNaN(parseFloat(v.replace(/,/g, ''))))) {
    return 'numeric';
  }

  return 'text';
}

function parseNumeric(value: string): number {
  if (!value) return 0;
  const cleaned = value.replace(/[%+,]/g, '').trim();
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

function findDateColumn(columns: ColumnInfo[]): ColumnInfo | null {
  return columns.find((c) => c.type === 'date') || null;
}

// ── Data Aggregation ──────────────────────────────────────────────────────

interface ChartDataPoint {
  label: string;
  [key: string]: string | number;
}

function buildChartData(
  rows: Record<string, string>[],
  columns: ColumnInfo[],
  dateCol: ColumnInfo | null,
  numericCols: ColumnInfo[],
): { data: ChartDataPoint[]; summary: Record<string, { total: number; avg: number; min: number; max: number; trend: string }> } {
  const data: ChartDataPoint[] = [];
  const summary: Record<string, { total: number; avg: number; min: number; max: number; trend: string }> = {};

  // Initialize summary
  for (const col of numericCols) {
    summary[col.name] = { total: 0, avg: 0, min: Infinity, max: -Infinity, trend: 'stable' };
  }

  for (const row of rows) {
    const point: ChartDataPoint = {};

    if (dateCol) {
      point.label = row[dateCol.name] || 'Unknown';
    }

    for (const col of numericCols) {
      const val = parseNumeric(row[col.name] || '0');
      point[col.name] = val;

      summary[col.name].total += val;
      summary[col.name].min = Math.min(summary[col.name].min, val);
      summary[col.name].max = Math.max(summary[col.name].max, val);
    }

    data.push(point);
  }

  // Calculate averages
  const count = rows.length || 1;
  for (const col of numericCols) {
    summary[col.name].avg = Math.round((summary[col.name].total / count) * 100) / 100;

    // Determine trend from first half vs second half
    const mid = Math.floor(data.length / 2);
    if (mid > 0 && data.length >= 4) {
      const firstHalfAvg = data.slice(0, mid).reduce((s, d) => s + (d[col.name] || 0), 0) / mid;
      const secondHalfAvg = data.slice(mid).reduce((s, d) => s + (d[col.name] || 0), 0) / (data.length - mid);
      const change = ((secondHalfAvg - firstHalfAvg) / (firstHalfAvg || 1)) * 100;
      if (change > 5) summary[col.name].trend = 'up';
      else if (change < -5) summary[col.name].trend = 'down';
      else summary[col.name].trend = 'stable';
    }
  }

  // Sort by date if available
  if (dateCol && data.length > 1) {
    data.sort((a, b) => {
      const da = new Date(a.label).getTime();
      const db = new Date(b.label).getTime();
      if (!isNaN(da) && !isNaN(db)) return da - db;
      return 0;
    });
  }

  return { data, summary };
}

// ── Main Handler ──────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
      return NextResponse.json({ error: 'Please upload a CSV file' }, { status: 400 });
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large. Maximum 5MB.' }, { status: 400 });
    }

    const text = await file.text();
    const { headers, rows } = parseCSV(text);

    if (rows.length === 0) {
      return NextResponse.json({ error: 'CSV file is empty or could not be parsed' }, { status: 400 });
    }

    // Detect column types
    const columns: ColumnInfo[] = headers.map((h) => ({
      name: h,
      type: detectColumnType(h, rows.slice(0, 10).map((r) => r[h] || '')),
      sample: rows.slice(0, 3).map((r) => r[h] || ''),
    }));

    const dateCol = findDateColumn(columns);
    const numericCols = columns.filter((c) => c.type === 'numeric');
    const engagementCols = columns.filter((c) => c.type === 'engagement_rate');

    if (numericCols.length === 0) {
      return NextResponse.json({
        error: 'No numeric columns detected. Make sure your CSV has columns with numbers (likes, impressions, etc.).',
        columns,
        fileName: file.name,
        totalRows: rows.length,
      }, { status: 422 });
    }

    // Build chart data
    const { data: chartData, summary } = buildChartData(rows, columns, dateCol, numericCols);

    // Generate AI insights
    let aiInsights: string | null = null;
    let aiProvider: string = 'none';

    const { provider } = await getAIProvider();

    if (provider !== 'none') {
      try {
        // Build a data summary for AI context
        const dataContext = [
          `File: ${file.name}, ${rows.length} rows, ${headers.length} columns`,
          `Columns: ${headers.join(', ')}`,
          `Date column: ${dateCol?.name || 'none detected'}`,
          `Numeric columns: ${numericCols.map((c) => c.name).join(', ')}`,
          '',
          'Summary statistics:',
          ...numericCols.map((c) => {
            const s = summary[c.name];
            const trendEmoji = s.trend === 'up' ? '↑' : s.trend === 'down' ? '↓' : '→';
            return `  ${c.name}: total=${fmtNum(s.total)}, avg=${fmtNum(s.avg)}, min=${fmtNum(s.min)}, max=${fmtNum(s.max)}, trend=${trendEmoji}`;
          }),
          '',
          'Sample rows (first 5):',
          ...rows.slice(0, 5).map((r, i) => `  Row ${i + 1}: ${Object.entries(r).map(([k, v]) => `${k}=${v}`).join(', ')}`),
        ].join('\n');

        const prompt = `You are a social media analytics expert. Analyze the following CSV data from a social media export and provide actionable insights. 

${dataContext}

Provide your analysis in this exact markdown format:

## Key Metrics Overview
A brief summary of the most important numbers.

## Trend Analysis  
Describe the upward/downward/stable trends you see in the data. Be specific about which metrics are growing or declining.

## Top Insights (3-5 bullet points)
- **[Insight title]**: Detailed explanation with specific numbers from the data

## Recommendations (3-5 actionable items)
- **[Recommendation]**: What action should be taken based on the data

## Content Performance Patterns
Identify any patterns in what type of content performs best (if discernible from the data).

Keep it concise but data-driven. Reference specific numbers from the summary.`;

        const { content } = await chatCompletion(
          [
            { role: 'system', content: 'You are a social media analytics expert. Analyze CSV data and provide actionable, data-driven insights. Use markdown formatting. Be specific with numbers.' },
            { role: 'user', content: prompt },
          ],
          { maxTokens: 2048 }
        );
        aiInsights = content;
        aiProvider = provider;
      } catch (err) {
        console.error('AI analysis failed:', err);
        aiInsights = null;
      }
    }

    return NextResponse.json({
      success: true,
      fileName: file.name,
      totalRows: rows.length,
      totalColumns: headers.length,
      columns,
      dateColumn: dateCol?.name || null,
      numericColumns: numericCols.map((c) => c.name),
      engagementColumns: engagementCols.map((c) => c.name),
      chartData: chartData.slice(0, 100), // Cap at 100 data points for frontend
      summary,
      aiInsights,
      aiProvider,
    });
  } catch (error) {
    console.error('CSV analysis error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to analyze CSV' },
      { status: 500 }
    );
  }
}

function fmtNum(n: number): string {
  if (!isFinite(n)) return '0';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n % 1 === 0 ? n.toString() : n.toFixed(2);
}