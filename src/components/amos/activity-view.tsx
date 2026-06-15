'use client'

import { useAmosStore, type ActivityLog } from '@/store/amos-store'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'
import {
  Activity,
  UserPlus,
  Mail,
  Share2,
  PenLine,
  Search,
  MessageSquare,
  Sparkles,
  Clock,
  Filter,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const ACTION_FILTERS = [
  { value: 'all', label: 'All Activities' },
  { value: 'lead_created', label: 'Lead Created' },
  { value: 'email_created', label: 'Email Created' },
  { value: 'email_sent', label: 'Email Sent' },
  { value: 'post_created', label: 'Post Created' },
  { value: 'post_published', label: 'Post Published' },
  { value: 'blog_created', label: 'Blog Created' },
  { value: 'search_performed', label: 'Search Performed' },
  { value: 'chat_command', label: 'Chat Command' },
  { value: 'ai_generated', label: 'AI Generated' },
]

const ACTION_CONFIG: Record<string, {
  icon: React.ElementType
  color: string
  bg: string
  label: string
}> = {
  lead_created: {
    icon: UserPlus,
    color: 'text-emerald-700 dark:text-emerald-400',
    bg: 'bg-emerald-100 dark:bg-emerald-900/40',
    label: 'Lead Created',
  },
  email_created: {
    icon: Mail,
    color: 'text-blue-700 dark:text-blue-400',
    bg: 'bg-blue-100 dark:bg-blue-900/40',
    label: 'Email Created',
  },
  email_sent: {
    icon: Mail,
    color: 'text-blue-700 dark:text-blue-400',
    bg: 'bg-blue-100 dark:bg-blue-900/40',
    label: 'Email Sent',
  },
  post_created: {
    icon: Share2,
    color: 'text-purple-700 dark:text-purple-400',
    bg: 'bg-purple-100 dark:bg-purple-900/40',
    label: 'Post Created',
  },
  post_published: {
    icon: Share2,
    color: 'text-purple-700 dark:text-purple-400',
    bg: 'bg-purple-100 dark:bg-purple-900/40',
    label: 'Post Published',
  },
  blog_created: {
    icon: PenLine,
    color: 'text-orange-700 dark:text-orange-400',
    bg: 'bg-orange-100 dark:bg-orange-900/40',
    label: 'Blog Created',
  },
  search_performed: {
    icon: Search,
    color: 'text-teal-700 dark:text-teal-400',
    bg: 'bg-teal-100 dark:bg-teal-900/40',
    label: 'Search Performed',
  },
  chat_command: {
    icon: MessageSquare,
    color: 'text-slate-700 dark:text-slate-400',
    bg: 'bg-slate-100 dark:bg-slate-900/40',
    label: 'Chat Command',
  },
  ai_generated: {
    icon: Sparkles,
    color: 'text-amber-700 dark:text-amber-400',
    bg: 'bg-amber-100 dark:bg-amber-900/40',
    label: 'AI Generated',
  },
}

function getActionConfig(action: string) {
  return ACTION_CONFIG[action] || {
    icon: Activity,
    color: 'text-muted-foreground',
    bg: 'bg-muted',
    label: action.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
  }
}

function TimelineItem({ activity }: { activity: ActivityLog }) {
  const config = getActionConfig(activity.action)
  const Icon = config.icon

  const relativeTime = (() => {
    try {
      return formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })
    } catch {
      return activity.createdAt
    }
  })()

  return (
    <div className="relative flex gap-4 pb-8 last:pb-0 group">
      {/* Timeline line */}
      <div className="absolute left-5 top-10 bottom-0 w-px bg-border group-last:hidden" />

      {/* Icon */}
      <div
        className={cn(
          'relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
          config.bg
        )}
      >
        <Icon className={cn('h-4.5 w-4.5', config.color)} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pt-1">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <Badge
            variant="secondary"
            className={cn('text-xs font-medium', config.bg, config.color, 'border-0')}
          >
            {config.label}
          </Badge>
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {relativeTime}
          </span>
        </div>
        <p className="text-sm text-foreground leading-relaxed">
          {activity.description}
        </p>
        {activity.metadata && (
          <details className="mt-2">
            <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
              View details
            </summary>
            <pre className="mt-1 text-xs text-muted-foreground bg-muted/50 rounded-md p-3 overflow-x-auto max-w-full whitespace-pre-wrap break-words">
              {(() => {
                try {
                  return JSON.stringify(JSON.parse(activity.metadata), null, 2)
                } catch {
                  return activity.metadata
                }
              })()}
            </pre>
          </details>
        )}
      </div>
    </div>
  )
}

export function ActivityView() {
  const { activities, setActivities } = useAmosStore()
  const [isLoading, setIsLoading] = useState(true)
  const [actionFilter, setActionFilter] = useState('all')

  const fetchActivities = async () => {
    setIsLoading(true)
    try {
      const params = actionFilter !== 'all' ? `?action=${actionFilter}` : ''
      const res = await fetch(`/api/activities${params}`)
      const data = await res.json()
      setActivities(data || [])
    } catch {
      toast.error('Failed to load activities.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchActivities()
  }, [actionFilter, setActivities])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Activity className="h-6 w-6 text-teal-500" />
          Activity Log
        </h2>
        <p className="text-muted-foreground mt-1">
          Track all actions and events across the AMOS dashboard.
        </p>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Filter className="h-4 w-4" />
          <span>Filter:</span>
        </div>
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Filter by action type" />
          </SelectTrigger>
          <SelectContent>
            {ACTION_FILTERS.map((f) => (
              <SelectItem key={f.value} value={f.value}>
                {f.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Badge variant="outline" className="text-xs">
          {activities.length} {activities.length === 1 ? 'activity' : 'activities'}
        </Badge>
      </div>

      {/* Timeline */}
      <div className="max-h-[600px] overflow-y-auto">
        <ScrollArea className="h-full">
          {isLoading ? (
            <div className="space-y-6 px-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex gap-4">
                  <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                  <div className="flex-1 space-y-2 pt-1">
                    <div className="flex gap-2">
                      <Skeleton className="h-5 w-24 rounded-full" />
                      <Skeleton className="h-4 w-28" />
                    </div>
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : activities.length > 0 ? (
            <div className="px-2 py-2">
              {activities.map((activity) => (
                <TimelineItem key={activity.id} activity={activity} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Activity className="h-12 w-12 text-muted-foreground/40 mb-4" />
              <p className="text-lg font-medium text-muted-foreground">No activities yet</p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                Activities will appear here as you use the dashboard.
              </p>
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  )
}