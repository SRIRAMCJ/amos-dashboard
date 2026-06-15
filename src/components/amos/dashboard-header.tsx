'use client'

import React, { useCallback, useMemo } from 'react'
import { Menu, Search, CircleDot } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAmosStore } from '@/store/amos-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

// View title mapping
const VIEW_TITLES: Record<string, string> = {
  dashboard: 'Dashboard',
  chat: 'AMOS Chat',
  leads: 'Leads',
  emails: 'Email Outreach',
  social: 'Social Media',
  search: 'Competitor Intel',
  blogs: 'Blog Writer',
  activities: 'Activity Log',
  settings: 'Settings',
}

// View subtitle mapping
const VIEW_SUBTITLES: Record<string, string> = {
  dashboard: 'Overview of your marketing operations',
  chat: 'Talk with your AI marketing assistant',
  leads: 'Manage prospects and contacts',
  emails: 'Create and track outreach campaigns',
  social: 'Schedule and manage social content',
  search: 'Research competitors and market trends',
  blogs: 'Generate SEO-optimized blog content',
  activities: 'Track all system activities',
  settings: 'Connect accounts and configure integrations',
}

interface DashboardHeaderProps {
  className?: string
}

export function DashboardHeader({ className }: DashboardHeaderProps) {
  const { activeView, setSidebarOpen } = useAmosStore()

  const handleMenuClick = useCallback(() => {
    setSidebarOpen(true)
  }, [setSidebarOpen])

  const title = useMemo(
    () => VIEW_TITLES[activeView] ?? 'Dashboard',
    [activeView]
  )

  const subtitle = useMemo(
    () => VIEW_SUBTITLES[activeView] ?? '',
    [activeView]
  )

  return (
    <header
      className={cn(
        'sticky top-0 z-30 flex w-full items-center gap-4 border-b bg-background/80 px-4 py-3 backdrop-blur-md sm:px-6',
        className
      )}
      role="banner"
    >
      {/* Mobile hamburger */}
      <Button
        variant="ghost"
        size="icon"
        className="shrink-0 md:hidden"
        onClick={handleMenuClick}
        aria-label="Open navigation menu"
      >
        <Menu className="size-5" />
      </Button>

      {/* Left: View title */}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <h1 className="text-lg font-semibold leading-tight tracking-tight truncate">
          {title}
        </h1>
        {subtitle && (
          <p className="hidden text-xs text-muted-foreground sm:block truncate">
            {subtitle}
          </p>
        )}
      </div>

      {/* Center: Search placeholder (hidden on smallest screens) */}
      <div className="hidden max-w-xs flex-1 lg:block">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            disabled
            placeholder="Search AMOS..."
            className="h-9 bg-muted/50 pl-9 text-sm"
            aria-label="Search AMOS (disabled)"
          />
        </div>
      </div>

      <Separator orientation="vertical" className="hidden h-6 lg:block" />

      {/* Right: Status indicator */}
      <div className="flex shrink-0 items-center gap-2">
        <Badge
          variant="secondary"
          className="hidden gap-1.5 border border-emerald-200/60 bg-emerald-50 text-emerald-700 sm:inline-flex dark:border-emerald-800/60 dark:bg-emerald-950 dark:text-emerald-300"
        >
          <span className="relative flex size-2" aria-hidden="true">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <CircleDot className="size-2 text-emerald-500" />
          </span>
          AMOS Online
        </Badge>

        {/* Mobile compact status dot */}
        <span
          className="relative flex size-2.5 sm:hidden"
          aria-label="AMOS is online"
          title="AMOS Online"
        >
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex size-2.5 rounded-full bg-emerald-500" />
        </span>
      </div>
    </header>
  )
}
