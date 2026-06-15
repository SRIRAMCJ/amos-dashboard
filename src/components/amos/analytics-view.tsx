'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'
import {
  RefreshCw,
  Heart,
  MessageCircle,
  Share2,
  Eye,
  Users,
  AlertTriangle,
  ExternalLink,
  TrendingUp,
  BarChart3,
  Clock,
  Settings,
  Loader2,
  FileText,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Cell,
} from 'recharts'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardAction,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip'
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/components/ui/tabs'
import { useAmosStore, type PlatformAnalytics } from '@/store/amos-store'
import { cn } from '@/lib/utils'

// ── Platform configuration ──────────────────────────────────────────────────

type PlatformKey = 'twitter' | 'linkedin' | 'instagram' | 'facebook'

const PLATFORM_META: Record<
  PlatformKey,
  {
    label: string
    icon: string
    color: string
    borderColor: string
    bg: string
    ring: string
    textAccent: string
    badgeBg: string
    badgeText: string
    chartColor: string
    gradientFrom: string
    gradientTo: string
  }
> = {
  twitter: {
    label: 'Twitter / X',
    icon: '𝕏',
    color: 'text-sky-500',
    borderColor: 'border-l-sky-500',
    bg: 'bg-sky-500/10',
    ring: 'ring-sky-500/20',
    textAccent: 'text-sky-500 dark:text-sky-400',
    badgeBg: 'bg-sky-500/15',
    badgeText: 'text-sky-700 dark:text-sky-300',
    chartColor: '#0ea5e9',
    gradientFrom: 'from-sky-500',
    gradientTo: 'to-slate-500',
  },
  linkedin: {
    label: 'LinkedIn',
    icon: 'in',
    color: 'text-blue-700',
    borderColor: 'border-l-blue-700',
    bg: 'bg-blue-700/10',
    ring: 'ring-blue-700/20',
    textAccent: 'text-blue-700 dark:text-blue-400',
    badgeBg: 'bg-blue-700/15',
    badgeText: 'text-blue-700 dark:text-blue-300',
    chartColor: '#1d4ed8',
    gradientFrom: 'from-blue-700',
    gradientTo: 'to-blue-500',
  },
  instagram: {
    label: 'Instagram',
    icon: 'IG',
    color: 'text-pink-500',
    borderColor: 'border-l-pink-500',
    bg: 'bg-pink-500/10',
    ring: 'ring-pink-500/20',
    textAccent: 'text-pink-500 dark:text-pink-400',
    badgeBg: 'bg-gradient-to-r from-pink-500/15 to-purple-500/15',
    badgeText: 'text-pink-700 dark:text-pink-300',
    chartColor: '#ec4899',
    gradientFrom: 'from-pink-500',
    gradientTo: 'to-purple-500',
  },
  facebook: {
    label: 'Facebook',
    icon: 'f',
    color: 'text-blue-600',
    borderColor: 'border-l-blue-600',
    bg: 'bg-blue-600/10',
    ring: 'ring-blue-600/20',
    textAccent: 'text-blue-600 dark:text-blue-400',
    badgeBg: 'bg-blue-600/15',
    badgeText: 'text-blue-700 dark:text-blue-300',
    chartColor: '#2563eb',
    gradientFrom: 'from-blue-600',
    gradientTo: 'to-blue-400',
  },
}

const PLATFORM_KEYS: PlatformKey[] = ['twitter', 'linkedin', 'instagram', 'facebook']

// ── Helpers ─────────────────────────────────────────────────────────────────

const compactFormatter = new Intl.NumberFormat('en', {
  notation: 'compact',
  compactDisplay: 'short',
  maximumFractionDigits: 1,
})

function fmt(n: number): string {
  if (n === 0) return '0'
  return compactFormatter.format(n)
}

function fmtFull(n: number): string {
  return new Intl.NumberFormat('en').format(n)
}

function engagementRate(data: PlatformAnalytics): number {
  const total =
    data.engagement.likes +
    data.engagement.comments +
    data.engagement.shares
  const impressions = data.engagement.impressions || 1
  return Math.round((total / impressions) * 10000) / 100
}

// ── Animation variants ──────────────────────────────────────────────────────

const cardVariant = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.35, ease: 'easeOut' },
  }),
}

const sectionVariant = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.4, ease: 'easeOut' },
  },
}

// ── Custom tooltip for Recharts ─────────────────────────────────────────────

function ChartTooltipContent({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ name: string; value: number; color: string }>
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-xl">
      <p className="font-semibold mb-1.5 text-popover-foreground">{label}</p>
      <div className="space-y-1">
        {payload.map((entry) => (
          <div key={entry.name} className="flex items-center gap-2">
            <span
              className="inline-block h-2 w-2 rounded-full shrink-0"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-muted-foreground">{entry.name}</span>
            <span className="ml-auto font-medium text-popover-foreground">
              {fmtFull(entry.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Platform overview card skeleton ─────────────────────────────────────────

function PlatformCardSkeleton() {
  return (
    <Card className="border">
      <CardContent className="pt-0">
        <div className="flex items-center gap-3 mb-4">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
        <Skeleton className="h-8 w-20 mb-4" />
        <div className="flex gap-2">
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
      </CardContent>
    </Card>
  )
}

// ── Recent post item ────────────────────────────────────────────────────────

function RecentPostItem({
  platform,
  post,
}: {
  platform: PlatformKey
  post: PlatformAnalytics['recentPosts'][number]
}) {
  const meta = PLATFORM_META[platform]
  return (
    <div
      className={cn(
        'relative pl-4 py-3 border-l-2',
        meta.borderColor
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span
              className={cn(
                'inline-flex items-center justify-center rounded px-1.5 py-0.5 text-[10px] font-bold leading-none',
                meta.badgeBg,
                meta.badgeText
              )}
            >
              {meta.icon}
            </span>
            <span className="text-[11px] text-muted-foreground">
              {formatDistanceToNow(new Date(post.createdAt), {
                addSuffix: true,
              })}
            </span>
          </div>
          <p className="text-sm leading-snug text-foreground/90 line-clamp-2">
            {post.text}
          </p>
          <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Heart className="h-3 w-3 text-rose-400" />
              {fmt(post.metrics.likes)}
            </span>
            <span className="inline-flex items-center gap-1">
              <MessageCircle className="h-3 w-3 text-amber-400" />
              {fmt(post.metrics.comments)}
            </span>
            <span className="inline-flex items-center gap-1">
              <Share2 className="h-3 w-3 text-purple-400" />
              {fmt(post.metrics.shares)}
            </span>
            <span className="inline-flex items-center gap-1">
              <Eye className="h-3 w-3 text-slate-400" />
              {fmt(post.metrics.impressions)}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Per-platform detail view ────────────────────────────────────────────────

function PlatformDetailTab({
  platformKey,
  data,
}: {
  platformKey: PlatformKey
  data: PlatformAnalytics
}) {
  const meta = PLATFORM_META[platformKey]
  const rate = engagementRate(data)

  const postsChartData = data.recentPosts
    .slice()
    .reverse()
    .map((p, i) => ({
      name: `Post ${i + 1}`,
      likes: p.metrics.likes,
      comments: p.metrics.comments,
      shares: p.metrics.shares,
      impressions: p.metrics.impressions,
    }))

  const totalEngagement =
    data.engagement.likes +
    data.engagement.comments +
    data.engagement.shares

  return (
    <div className="space-y-6">
      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <MiniStat
          label="Followers"
          value={fmt(data.followers)}
          icon={<Users className="h-4 w-4" />}
          accent={meta.textAccent}
          bg={meta.bg}
        />
        <MiniStat
          label="Following"
          value={fmt(data.following ?? 0)}
          icon={<Users className="h-4 w-4" />}
          accent={meta.textAccent}
          bg={meta.bg}
        />
        <MiniStat
          label="Total Posts"
          value={fmtFull(data.totalPosts)}
          icon={<FileText className="h-4 w-4" />}
          accent={meta.textAccent}
          bg={meta.bg}
        />
        <MiniStat
          label="Engagement"
          value={fmt(totalEngagement)}
          icon={<TrendingUp className="h-4 w-4" />}
          accent="text-emerald-600 dark:text-emerald-400"
          bg="bg-emerald-500/10"
        />
        <MiniStat
          label="Eng. Rate"
          value={`${rate}%`}
          icon={<BarChart3 className="h-4 w-4" />}
          accent="text-amber-600 dark:text-amber-400"
          bg="bg-amber-500/10"
        />
      </div>

      <Separator />

      {/* Per-post engagement line chart */}
      {postsChartData.length > 0 ? (
        <div>
          <h4 className="text-sm font-semibold mb-4">Per-Post Engagement</h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={postsChartData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  className="stroke-border"
                />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11 }}
                  className="text-muted-foreground"
                  stroke="currentColor"
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  className="text-muted-foreground"
                  stroke="currentColor"
                  tickFormatter={fmt}
                />
                <RechartsTooltip content={<ChartTooltipContent />} />
                <Line
                  type="monotone"
                  dataKey="likes"
                  name="Likes"
                  stroke="#22c55e"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="comments"
                  name="Comments"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="shares"
                  name="Shares"
                  stroke="#a855f7"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="impressions"
                  name="Impressions"
                  stroke="#64748b"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
          <FileText className="h-8 w-8 mb-2 opacity-40" />
          <p className="text-sm">No recent posts to display.</p>
        </div>
      )}

      <Separator />

      {/* Engagement breakdown bar */}
      <div>
        <h4 className="text-sm font-semibold mb-4">Engagement Breakdown</h4>
        <div className="space-y-3">
          <EngagementBar
            label="Likes"
            value={data.engagement.likes}
            total={totalEngagement || 1}
            color="bg-emerald-500"
          />
          <EngagementBar
            label="Comments"
            value={data.engagement.comments}
            total={totalEngagement || 1}
            color="bg-amber-500"
          />
          <EngagementBar
            label="Shares"
            value={data.engagement.shares}
            total={totalEngagement || 1}
            color="bg-purple-500"
          />
          <EngagementBar
            label="Impressions"
            value={data.engagement.impressions}
            total={totalEngagement || 1}
            color="bg-slate-500"
          />
        </div>
      </div>
    </div>
  )
}

function MiniStat({
  label,
  value,
  icon,
  accent,
  bg,
}: {
  label: string
  value: string
  icon: React.ReactNode
  accent: string
  bg: string
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg border p-3">
      <div
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-md',
          bg
        )}
      >
        <span className={accent}>{icon}</span>
      </div>
      <div>
        <p className="text-lg font-bold leading-none">{value}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">{label}</p>
      </div>
    </div>
  )
}

function EngagementBar({
  label,
  value,
  total,
  color,
}: {
  label: string
  value: number
  total: number
  color: string
}) {
  const pct = Math.round((value / total) * 100)
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{fmtFull(value)}</span>
      </div>
      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
        <motion.div
          className={cn('h-full rounded-full', color)}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      </div>
    </div>
  )
}

// ── Main Component ──────────────────────────────────────────────────────────

export function AnalyticsView() {
  const {
    analytics,
    setAnalytics,
    setAnalyticsFetching,
    setActiveView,
  } = useAmosStore()

  const [selectedPlatform, setSelectedPlatform] = useState<PlatformKey | null>(
    null
  )
  const [initialLoading, setInitialLoading] = useState(true)
  const [platformRefreshing, setPlatformRefreshing] = useState<PlatformKey | null>(
    null
  )

  // ── Data fetching ─────────────────────────────────────────────────────

  const fetchAnalytics = useCallback(
    async (method: 'GET' | 'POST', platform?: PlatformKey) => {
      if (method === 'POST') {
        setAnalyticsFetching(true)
        if (platform) {
          setPlatformRefreshing(platform)
        }
      }

      try {
        const options: RequestInit = {
          method,
          headers: { 'Content-Type': 'application/json' },
        }
        if (method === 'POST') {
          options.body = JSON.stringify(platform ? { platform } : {})
        }

        const res = await fetch('/api/analytics', options)
        if (!res.ok) throw new Error(`API returned ${res.status}`)

        const json = await res.json()
        if (!json.success) throw new Error(json.error || 'Fetch failed')

        // Map API response to store shape
        const apiData = json.data || {}
        const lastFetched = json.lastFetched ?? apiData.lastFetched ?? null

        setAnalytics({
          twitter: apiData.twitter ?? null,
          linkedin: apiData.linkedin ?? null,
          instagram: apiData.instagram ?? null,
          facebook: apiData.facebook ?? null,
          lastFetched,
          fetching: false,
        })

        if (method === 'POST') {
          toast.success(
            platform
              ? `${PLATFORM_META[platform].label} data refreshed`
              : 'All platforms refreshed successfully'
          )
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to fetch analytics'
        toast.error(message)
      } finally {
        setAnalyticsFetching(false)
        setPlatformRefreshing(null)
        setInitialLoading(false)
      }
    },
    [setAnalytics, setAnalyticsFetching]
  )

  // Initial load
  useEffect(() => {
    fetchAnalytics('GET')
  }, [fetchAnalytics])

  // ── Derived data ──────────────────────────────────────────────────────

  const platforms = PLATFORM_KEYS.map((key) => ({
    key,
    data: analytics[key],
    meta: PLATFORM_META[key],
  }))

  const connectedPlatforms = platforms.filter((p) => p.data?.connected)
  const connectedCount = connectedPlatforms.length
  const totalFollowers = connectedPlatforms.reduce(
    (sum, p) => sum + (p.data?.followers ?? 0),
    0
  )

  // Engagement comparison chart data (only connected platforms)
  const engagementChartData = connectedPlatforms.map((p) => ({
    name: p.meta.label,
    Likes: p.data!.engagement.likes,
    Comments: p.data!.engagement.comments,
    Shares: p.data!.engagement.shares,
    Impressions: p.data!.engagement.impressions,
  }))

  // Follower comparison chart data
  const followerChartData = connectedPlatforms.map((p) => ({
    name: p.meta.label,
    followers: p.data!.followers,
    fill: p.meta.chartColor,
  }))

  // All recent posts merged & sorted
  const allRecentPosts = platforms
    .filter((p) => p.data?.connected && p.data!.recentPosts.length > 0)
    .flatMap((p) =>
      p.data!.recentPosts.map((post) => ({
        ...post,
        platformKey: p.key,
        platformLabel: p.meta.label,
      }))
    )
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )

  // ── Refresh handler ───────────────────────────────────────────────────

  const handleRefreshAll = () => {
    fetchAnalytics('POST')
  }

  const handleRefreshPlatform = (key: PlatformKey) => {
    fetchAnalytics('POST', key)
  }

  // ── Last fetched text ─────────────────────────────────────────────────

  const lastFetchedText = analytics.lastFetched
    ? formatDistanceToNow(new Date(analytics.lastFetched), { addSuffix: true })
    : null

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-8 max-w-7xl mx-auto">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <motion.section
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Card className="border-0 bg-gradient-to-br from-emerald-500/5 via-emerald-500/10 to-emerald-500/5 overflow-hidden relative">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.06),transparent_60%)]" />
          <CardHeader className="relative">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="text-lg font-bold tracking-tight">
                  Track performance across all your social platforms
                </CardTitle>
                <CardDescription className="mt-1">
                  {initialLoading ? (
                    <Skeleton className="h-4 w-48 inline-block" />
                  ) : (
                    <span className="inline-flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      {lastFetchedText
                        ? `Last fetched: ${lastFetchedText}`
                        : 'No data fetched yet'}
                      <span className="mx-1 text-border">·</span>
                      <span className="font-medium text-foreground">
                        {connectedCount} of {PLATFORM_KEYS.length} connected
                      </span>
                      <span className="mx-1 text-border">·</span>
                      <span className="font-medium text-foreground">
                        {fmt(totalFollowers)} total followers
                      </span>
                    </span>
                  )}
                </CardDescription>
              </div>
              <Button
                onClick={handleRefreshAll}
                disabled={analytics.fetching}
                className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shrink-0"
              >
                {analytics.fetching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Refresh All
              </Button>
            </div>

            {/* Connection status pills */}
            {!initialLoading && (
              <div className="flex flex-wrap items-center gap-2 mt-3">
                {platforms.map((p) => (
                  <Badge
                    key={p.key}
                    variant="outline"
                    className={cn(
                      'text-[11px] font-medium gap-1.5',
                      p.data?.connected
                        ? 'border-emerald-500/30 text-emerald-700 dark:text-emerald-400 bg-emerald-500/5'
                        : 'border-border text-muted-foreground'
                    )}
                  >
                    <span
                      className={cn(
                        'inline-block h-1.5 w-1.5 rounded-full',
                        p.data?.connected
                          ? 'bg-emerald-500'
                          : 'bg-muted-foreground/40'
                      )}
                    />
                    {p.meta.label}
                  </Badge>
                ))}
              </div>
            )}
          </CardHeader>
        </Card>
      </motion.section>

      {/* ── Platform Overview Cards ──────────────────────────────────────── */}
      <motion.section
        variants={sectionVariant}
        initial="hidden"
        animate="visible"
      >
        <h2 className="text-lg font-semibold mb-4">Platform Overview</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {initialLoading
            ? Array.from({ length: 4 }).map((_, i) => (
                <PlatformCardSkeleton key={i} />
              ))
            : platforms.map((p, i) => {
                const data = p.data
                const isConnected = data?.connected ?? false
                const hasError = isConnected && !!data?.error

                return (
                  <motion.div
                    key={p.key}
                    custom={i}
                    variants={cardVariant}
                    initial="hidden"
                    animate="visible"
                  >
                    <Card
                      className={cn(
                        'border hover:shadow-md transition-shadow duration-200 cursor-pointer',
                        'hover:-translate-y-0.5 transition-transform duration-200',
                        selectedPlatform === p.key &&
                          'ring-2 ring-emerald-500/50'
                      )}
                      onClick={() => {
                        if (isConnected) {
                          setSelectedPlatform(
                            selectedPlatform === p.key ? null : p.key
                          )
                        }
                      }}
                    >
                      <CardContent className="pt-0">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10 rounded-lg">
                              {data?.profileAvatar && (
                                <AvatarImage
                                  src={data.profileAvatar}
                                  alt={p.meta.label}
                                />
                              )}
                              <AvatarFallback
                                className={cn(
                                  'rounded-lg font-bold text-sm',
                                  p.key === 'instagram'
                                    ? 'bg-gradient-to-br from-pink-500 to-purple-500 text-white'
                                    : p.key === 'twitter'
                                      ? 'bg-sky-500 text-white'
                                      : p.key === 'linkedin'
                                        ? 'bg-blue-700 text-white'
                                        : 'bg-blue-600 text-white'
                                )}
                              >
                                {p.meta.icon}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-semibold text-sm leading-none">
                                {p.meta.label}
                              </p>
                              {isConnected && !hasError ? (
                                <p className="text-xs text-muted-foreground mt-1">
                                  {data!.profileName}
                                  {data!.profileHandle && (
                                    <span className="text-muted-foreground/70 ml-1">
                                      @{data!.profileHandle}
                                    </span>
                                  )}
                                </p>
                              ) : (
                                <p className="text-xs text-muted-foreground mt-1">
                                  —
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-1.5">
                            {isConnected ? (
                              <Badge
                                variant="outline"
                                className={cn(
                                  'text-[10px] px-1.5 py-0 h-5',
                                  hasError
                                    ? 'border-amber-500/50 text-amber-600 dark:text-amber-400 bg-amber-500/10'
                                    : 'border-emerald-500/50 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10'
                                )}
                              >
                                {hasError ? (
                                  <AlertTriangle className="h-3 w-3 mr-0.5" />
                                ) : null}
                                {hasError ? 'Error' : 'Connected'}
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="text-[10px] px-1.5 py-0 h-5 border-border text-muted-foreground"
                              >
                                Not Connected
                              </Badge>
                            )}

                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    if (isConnected) {
                                      handleRefreshPlatform(p.key)
                                    }
                                  }}
                                  disabled={
                                    !isConnected ||
                                    platformRefreshing === p.key
                                  }
                                >
                                  {platformRefreshing === p.key ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <RefreshCw className="h-3.5 w-3.5" />
                                  )}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                Refresh {p.meta.label}
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </div>

                        {isConnected && !hasError && (
                          <div className="mt-4">
                            <div className="flex items-baseline gap-2">
                              <span className="text-3xl font-bold tracking-tight">
                                {fmt(data!.followers)}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                followers
                              </span>
                            </div>
                            <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground">
                              <span className="inline-flex items-center gap-1">
                                <FileText className="h-3 w-3" />
                                {fmtFull(data!.totalPosts)} posts
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <TrendingUp className="h-3 w-3" />
                                {engagementRate(data!)}% eng.
                              </span>
                            </div>
                          </div>
                        )}

                        {hasError && data?.error && (
                          <div className="mt-3 flex items-start gap-2 rounded-md bg-amber-500/10 border border-amber-500/20 px-3 py-2">
                            <AlertTriangle className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />
                            <p className="text-[11px] text-amber-700 dark:text-amber-300 leading-snug">
                              {data.error}
                            </p>
                          </div>
                        )}

                        {!isConnected && (
                          <div className="mt-3">
                            <button
                              className={cn(
                                'text-xs font-medium transition-colors',
                                p.meta.textAccent,
                                'hover:underline'
                              )}
                              onClick={(e) => {
                                e.stopPropagation()
                                setActiveView('settings')
                              }}
                            >
                              Go to Settings →
                            </button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                )
              })}
        </div>
      </motion.section>

      {/* ── Charts Row ──────────────────────────────────────────────────── */}
      {connectedPlatforms.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Engagement Comparison */}
          <motion.section
            variants={sectionVariant}
            initial="hidden"
            animate="visible"
          >
            <Card className="border h-full">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-emerald-500" />
                  Engagement Comparison
                </CardTitle>
                <CardDescription>
                  Likes, comments, shares &amp; impressions per platform
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={engagementChartData}
                      margin={{ top: 4, right: 4, left: -12, bottom: 0 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        className="stroke-border"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 11 }}
                        className="text-muted-foreground"
                        stroke="currentColor"
                      />
                      <YAxis
                        tick={{ fontSize: 11 }}
                        className="text-muted-foreground"
                        stroke="currentColor"
                        tickFormatter={fmt}
                      />
                      <RechartsTooltip content={<ChartTooltipContent />} />
                      <Bar
                        dataKey="Likes"
                        fill="#22c55e"
                        radius={[2, 2, 0, 0]}
                        maxBarSize={28}
                      />
                      <Bar
                        dataKey="Comments"
                        fill="#f59e0b"
                        radius={[2, 2, 0, 0]}
                        maxBarSize={28}
                      />
                      <Bar
                        dataKey="Shares"
                        fill="#a855f7"
                        radius={[2, 2, 0, 0]}
                        maxBarSize={28}
                      />
                      <Bar
                        dataKey="Impressions"
                        fill="#64748b"
                        radius={[2, 2, 0, 0]}
                        maxBarSize={28}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                {/* Legend */}
                <div className="flex flex-wrap items-center justify-center gap-4 mt-3 text-[11px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="inline-block h-2.5 w-2.5 rounded-sm bg-emerald-500" />
                    Likes
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="inline-block h-2.5 w-2.5 rounded-sm bg-amber-500" />
                    Comments
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="inline-block h-2.5 w-2.5 rounded-sm bg-purple-500" />
                    Shares
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="inline-block h-2.5 w-2.5 rounded-sm bg-slate-500" />
                    Impressions
                  </span>
                </div>
              </CardContent>
            </Card>
          </motion.section>

          {/* Follower Comparison */}
          <motion.section
            variants={sectionVariant}
            initial="hidden"
            animate="visible"
          >
            <Card className="border h-full">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4 text-emerald-500" />
                  Follower Comparison
                </CardTitle>
                <CardDescription>
                  Total followers across connected platforms
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={followerChartData}
                      layout="vertical"
                      margin={{ top: 4, right: 4, left: 0, bottom: 4 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        className="stroke-border"
                        horizontal={false}
                      />
                      <XAxis
                        type="number"
                        tick={{ fontSize: 11 }}
                        className="text-muted-foreground"
                        stroke="currentColor"
                        tickFormatter={fmt}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        tick={{ fontSize: 11 }}
                        className="text-muted-foreground"
                        stroke="currentColor"
                        width={90}
                      />
                      <RechartsTooltip content={<ChartTooltipContent />} />
                      <Bar
                        dataKey="followers"
                        radius={[0, 4, 4, 0]}
                        maxBarSize={32}
                      >
                        {followerChartData.map((entry, index) => (
                          <Cell key={index} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </motion.section>
        </div>
      )}

      {/* ── Per-Platform Detailed Tabs ───────────────────────────────────── */}
      {selectedPlatform && analytics[selectedPlatform]?.connected && (
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          <Card className="border">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarFallback
                      className={cn(
                        'rounded-lg font-bold text-xs',
                        selectedPlatform === 'instagram'
                          ? 'bg-gradient-to-br from-pink-500 to-purple-500 text-white'
                          : selectedPlatform === 'twitter'
                            ? 'bg-sky-500 text-white'
                            : selectedPlatform === 'linkedin'
                              ? 'bg-blue-700 text-white'
                              : 'bg-blue-600 text-white'
                      )}
                    >
                      {PLATFORM_META[selectedPlatform].icon}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-base">
                      {PLATFORM_META[selectedPlatform].label} — Detailed View
                    </CardTitle>
                    <CardDescription className="text-xs mt-0.5">
                      {analytics[selectedPlatform]?.profileName}
                      {analytics[selectedPlatform]?.profileHandle &&
                        ` @${analytics[selectedPlatform].profileHandle}`}
                    </CardDescription>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground h-7"
                  onClick={() => setSelectedPlatform(null)}
                >
                  Close
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <PlatformDetailTab
                platformKey={selectedPlatform}
                data={analytics[selectedPlatform]!}
              />
            </CardContent>
          </Card>
        </motion.section>
      )}

      {/* ── Recent Posts Timeline ───────────────────────────────────────── */}
      <motion.section
        variants={sectionVariant}
        initial="hidden"
        animate="visible"
      >
        <Card className="border">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-emerald-500" />
              Recent Posts
            </CardTitle>
            <CardDescription>
              Latest posts across all connected platforms
            </CardDescription>
          </CardHeader>
          <CardContent>
            {allRecentPosts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                <FileText className="h-8 w-8 mb-2 opacity-40" />
                <p className="text-sm">
                  {connectedCount === 0
                    ? 'Connect platforms to see recent posts'
                    : 'No recent posts found'}
                </p>
              </div>
            ) : (
              <ScrollArea className="max-h-96 pr-3">
                <div className="space-y-0.5">
                  {allRecentPosts.map((post) => (
                    <RecentPostItem
                      key={`${post.platformKey}-${post.id}`}
                      platform={post.platformKey}
                      post={post}
                    />
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </motion.section>

      {/* ── Quick Summary Footer ────────────────────────────────────────── */}
      {connectedPlatforms.length > 0 && (
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.4 }}
        >
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {connectedPlatforms.map((p) => {
              const data = p.data!
              const engRate = engagementRate(data)
              return (
                <Card key={p.key} className="border">
                  <CardContent className="pt-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className={cn(
                          'inline-flex items-center justify-center rounded px-1.5 py-0.5 text-[10px] font-bold',
                          p.meta.badgeBg,
                          p.meta.badgeText
                        )}
                      >
                        {p.meta.icon}
                      </span>
                      <span className="text-xs font-medium text-muted-foreground truncate">
                        {data.profileName}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px]">
                      <span className="text-muted-foreground">Followers</span>
                      <span className="text-right font-medium">
                        {fmt(data.followers)}
                      </span>
                      <span className="text-muted-foreground">Posts</span>
                      <span className="text-right font-medium">
                        {fmtFull(data.totalPosts)}
                      </span>
                      <span className="text-muted-foreground">Eng. Rate</span>
                      <span className="text-right font-medium">{engRate}%</span>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </motion.section>
      )}
    </div>
  )
}