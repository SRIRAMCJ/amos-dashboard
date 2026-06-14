'use client'

import { useAmosStore } from '@/store/amos-store'
import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { formatDistanceToNow } from 'date-fns'
import {
  Users,
  UserPlus,
  Mail,
  Share2,
  FileText,
  Activity,
  UserCircle,
  Pencil,
  Megaphone,
  Search,
  Factory,
  GraduationCap,
  Building2,
  Globe,
  ArrowRight,
  Sparkles,
} from 'lucide-react'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

// ── Stats card definitions ──────────────────────────────────────────────────
const statCards = [
  {
    key: 'totalLeads' as const,
    label: 'Total Leads',
    icon: Users,
    accent: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-500/10',
    ring: 'ring-emerald-500/20',
  },
  {
    key: 'newLeads' as const,
    label: 'New Leads',
    icon: UserPlus,
    accent: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-500/10',
    ring: 'ring-amber-500/20',
  },
  {
    key: 'totalEmails' as const,
    label: 'Emails Sent',
    icon: Mail,
    accent: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-500/10',
    ring: 'ring-blue-500/20',
  },
  {
    key: 'totalPosts' as const,
    label: 'Social Posts',
    icon: Share2,
    accent: 'text-purple-600 dark:text-purple-400',
    bg: 'bg-purple-500/10',
    ring: 'ring-purple-500/20',
  },
  {
    key: 'totalBlogs' as const,
    label: 'Blog Posts',
    icon: FileText,
    accent: 'text-orange-600 dark:text-orange-400',
    bg: 'bg-orange-500/10',
    ring: 'ring-orange-500/20',
  },
  {
    key: 'totalActivities' as const,
    label: 'Activities',
    icon: Activity,
    accent: 'text-teal-600 dark:text-teal-400',
    bg: 'bg-teal-500/10',
    ring: 'ring-teal-500/20',
  },
]

// ── Quick action definitions ────────────────────────────────────────────────
const quickActions = [
  {
    label: 'Add Lead',
    description: 'Capture a new prospect into your pipeline',
    icon: UserCircle,
    view: 'leads' as const,
    accent: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-500/10',
  },
  {
    label: 'Write Email',
    description: 'Draft an outreach email with AI assistance',
    icon: Pencil,
    view: 'emails' as const,
    accent: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-500/10',
  },
  {
    label: 'Create Post',
    description: 'Compose a social media post for any platform',
    icon: Megaphone,
    view: 'social' as const,
    accent: 'text-purple-600 dark:text-purple-400',
    bg: 'bg-purple-500/10',
  },
  {
    label: 'Search Competitors',
    description: 'Research competitors and market trends',
    icon: Search,
    view: 'search' as const,
    accent: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-500/10',
  },
]

// ── Vertical definitions ────────────────────────────────────────────────────
const verticals = [
  {
    title: 'Factories',
    description: 'AR maintenance & training solutions for industrial environments',
    icon: Factory,
    accent: 'text-slate-600 dark:text-slate-300',
    bg: 'bg-slate-500/10',
  },
  {
    title: 'Schools & Colleges',
    description: 'VR education labs for immersive learning experiences',
    icon: GraduationCap,
    accent: 'text-cyan-600 dark:text-cyan-400',
    bg: 'bg-cyan-500/10',
  },
  {
    title: 'Government',
    description: 'Smart city AR solutions for public infrastructure',
    icon: Building2,
    accent: 'text-rose-600 dark:text-rose-400',
    bg: 'bg-rose-500/10',
  },
  {
    title: 'Global Enterprises',
    description: 'Enterprise-grade AR/VR for large-scale deployment',
    icon: Globe,
    accent: 'text-violet-600 dark:text-violet-400',
    bg: 'bg-violet-500/10',
  },
]

// ── Animation variants ──────────────────────────────────────────────────────
const cardVariant = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05, duration: 0.35, ease: 'easeOut' },
  }),
}

// ── Component ───────────────────────────────────────────────────────────────
export default function DashboardView() {
  const { stats, setStats, activities, setActivities, setActiveView } =
    useAmosStore()

  useEffect(() => {
    async function fetchData() {
      try {
        const [statsRes, activitiesRes] = await Promise.all([
          fetch('/api/stats'),
          fetch('/api/activities'),
        ])
        if (statsRes.ok) {
          const data = await statsRes.json()
          setStats(data)
        }
        if (activitiesRes.ok) {
          const data = await activitiesRes.json()
          setActivities(data.slice(0, 5))
        }
      } catch {
        // Silently handle — stats will remain null, skeleton shown
      }
    }
    fetchData()
  }, [setStats, setActivities])

  const recentActivities = activities.slice(0, 5)

  return (
    <div className="flex flex-col gap-8">
      {/* ── Welcome Banner ─────────────────────────────────────────── */}
      <motion.section
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Card className="border-0 bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 overflow-hidden relative">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(124,58,237,0.06),transparent_60%)]" />
          <CardHeader className="relative">
            <div className="flex items-center gap-3 mb-1">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <CardTitle className="text-2xl font-bold tracking-tight">
                Welcome to AMOS
              </CardTitle>
            </div>
            <CardDescription className="text-base max-w-2xl">
              AI-powered marketing &amp; outreach system for{' '}
              <span className="font-medium text-foreground">
                Madras MindWorks
              </span>
              . Manage leads, automate emails, schedule social posts, generate
              blog content, and research competitors — all from one place.
            </CardDescription>
          </CardHeader>
        </Card>
      </motion.section>

      {/* ── Stats Cards Grid ───────────────────────────────────────── */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Overview</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {statCards.map((card, i) => (
            <motion.div
              key={card.key}
              custom={i}
              variants={cardVariant}
              initial="hidden"
              animate="visible"
            >
              <Card
                className={cn(
                  'hover:shadow-md transition-shadow duration-200 border',
                  'hover:-translate-y-0.5 transition-transform duration-200'
                )}
              >
                <CardContent className="pt-0">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ring-1',
                        card.bg,
                        card.ring
                      )}
                    >
                      <card.icon className={cn('h-5 w-5', card.accent)} />
                    </div>
                    <div className="min-w-0 flex-1">
                      {stats ? (
                        <p className="text-2xl font-bold leading-none">
                          {stats[card.key].toLocaleString()}
                        </p>
                      ) : (
                        <Skeleton className="h-8 w-16 mb-1" />
                      )}
                      <p className="text-sm text-muted-foreground mt-1 truncate">
                        {card.label}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Quick Actions ───────────────────────────────────────────── */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action, i) => (
            <motion.div
              key={action.view}
              custom={i + statCards.length}
              variants={cardVariant}
              initial="hidden"
              animate="visible"
            >
              <Card
                className={cn(
                  'cursor-pointer group hover:shadow-md transition-shadow duration-200 border',
                  'hover:-translate-y-0.5 transition-transform duration-200'
                )}
                onClick={() => setActiveView(action.view)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    setActiveView(action.view)
                  }
                }}
                aria-label={`Go to ${action.label}`}
              >
                <CardContent className="pt-0">
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
                        action.bg
                      )}
                    >
                      <action.icon className={cn('h-5 w-5', action.accent)} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="font-semibold text-sm leading-none">
                          {action.label}
                        </p>
                        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200" />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                        {action.description}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Two-column: Recent Activity + Verticals ────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Activity */}
        <section>
          <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
          <Card className="border">
            <CardContent className="pt-0">
              {recentActivities.length === 0 && !activities.length ? (
                <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                  <Activity className="h-8 w-8 mb-2 opacity-40" />
                  <p className="text-sm">No activity yet. Start by adding a lead!</p>
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {recentActivities.map((log, i) => (
                    <motion.li
                      key={log.id}
                      custom={i + statCards.length + quickActions.length}
                      variants={cardVariant}
                      initial="hidden"
                      animate="visible"
                      className="py-3 first:pt-0 last:pb-0"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted mt-0.5">
                          <Activity className="h-3.5 w-3.5 text-muted-foreground" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge
                              variant="secondary"
                              className="text-[10px] px-1.5 py-0 h-5 font-medium"
                            >
                              {log.action}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(log.createdAt), {
                                addSuffix: true,
                              })}
                            </span>
                          </div>
                          <p className="text-sm mt-1 leading-snug text-foreground/90">
                            {log.description}
                          </p>
                        </div>
                      </div>
                    </motion.li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </section>

        {/* Verticals Overview */}
        <section>
          <h2 className="text-lg font-semibold mb-4">Target Verticals</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {verticals.map((v, i) => (
              <motion.div
                key={v.title}
                custom={
                  i +
                  statCards.length +
                  quickActions.length +
                  recentActivities.length
                }
                variants={cardVariant}
                initial="hidden"
                animate="visible"
              >
                <Card
                  className={cn(
                    'hover:shadow-md transition-shadow duration-200 border h-full',
                    'hover:-translate-y-0.5 transition-transform duration-200'
                  )}
                >
                  <CardContent className="pt-0">
                    <div className="flex items-start gap-3">
                      <div
                        className={cn(
                          'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
                          v.bg
                        )}
                      >
                        <v.icon className={cn('h-5 w-5', v.accent)} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-sm leading-none">
                          {v.title}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                          {v.description}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}