'use client'

import React, { useCallback } from 'react'
import {
  LayoutDashboard,
  Bot,
  Users,
  Mail,
  Share2,
  Search,
  FileText,
  Activity,
  ChevronsLeft,
  ChevronsRight,
  Glasses,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAmosStore, type ActiveView } from '@/store/amos-store'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip'
import { Separator } from '@/components/ui/separator'
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from '@/components/ui/sheet'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useState, useEffect } from 'react'

// Navigation items configuration
const NAV_ITEMS: { view: ActiveView; label: string; icon: React.ElementType }[] = [
  { view: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { view: 'chat', label: 'AMOS Chat', icon: Bot },
  { view: 'leads', label: 'Leads', icon: Users },
  { view: 'emails', label: 'Email Outreach', icon: Mail },
  { view: 'social', label: 'Social Media', icon: Share2 },
  { view: 'search', label: 'Competitor Intel', icon: Search },
  { view: 'blogs', label: 'Blog Writer', icon: FileText },
  { view: 'activities', label: 'Activity Log', icon: Activity },
]

// Shared sidebar nav content (used by both desktop & mobile)
function SidebarNavContent({
  collapsed,
  onSelect,
  activeView,
}: {
  collapsed: boolean
  onSelect: (view: ActiveView) => void
  activeView: ActiveView
}) {
  return (
    <>
      {/* Branding */}
      <div className="flex items-center gap-3 px-3 py-4">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white">
          <Glasses className="size-5" />
        </div>
        {!collapsed && (
          <div className="flex flex-col overflow-hidden">
            <span className="truncate text-sm font-bold tracking-tight text-emerald-100">
              Madras MindWorks
            </span>
            <span className="truncate text-[10px] font-medium uppercase tracking-widest text-emerald-400/70">
              AMOS Platform
            </span>
          </div>
        )}
      </div>

      <Separator className="bg-emerald-800/50" />

      {/* Navigation Items */}
      <ScrollArea className="flex-1 px-2 py-3">
        <nav className="flex flex-col gap-1" role="navigation" aria-label="Main navigation">
          {NAV_ITEMS.map(({ view, label, icon: Icon }) => {
            const isActive = activeView === view

            const button = (
              <button
                key={view}
                onClick={() => onSelect(view)}
                className={cn(
                  'group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-emerald-950',
                  isActive
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/30'
                    : 'text-emerald-200/70 hover:bg-emerald-900/60 hover:text-emerald-100',
                  collapsed && 'justify-center px-0'
                )}
                aria-current={isActive ? 'page' : undefined}
                aria-label={label}
              >
                <Icon
                  className={cn(
                    'size-5 shrink-0 transition-colors',
                    isActive
                      ? 'text-white'
                      : 'text-emerald-400/70 group-hover:text-emerald-300'
                  )}
                />
                {!collapsed && (
                  <span className="truncate">{label}</span>
                )}
              </button>
            )

            // When collapsed on desktop, wrap in tooltip
            if (collapsed) {
              return (
                <Tooltip key={view}>
                  <TooltipTrigger asChild>{button}</TooltipTrigger>
                  <TooltipContent side="right" sideOffset={8}>
                    {label}
                  </TooltipContent>
                </Tooltip>
              )
            }

            return button
          })}
        </nav>
      </ScrollArea>

      <Separator className="bg-emerald-800/50" />

      {/* Footer */}
      <div className="flex items-center px-3 py-3">
        {!collapsed ? (
          <span className="flex-1 text-[10px] font-medium uppercase tracking-widest text-emerald-500/50">
            AMOS v1.0
          </span>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="mx-auto text-[10px] font-medium text-emerald-500/50">
                v1.0
              </span>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={8}>
              AMOS v1.0
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </>
  )
}

// ─── Desktop Sidebar ────────────────────────────────────────────────────────
function DesktopSidebar() {
  const { activeView, setActiveView } = useAmosStore()
  const [expanded, setExpanded] = useState(true)

  const handleSelect = useCallback(
    (view: ActiveView) => {
      setActiveView(view)
    },
    [setActiveView]
  )

  const handleToggle = useCallback(() => {
    setExpanded(!expanded)
  }, [expanded])

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-emerald-800/50 bg-emerald-950 transition-all duration-300 ease-in-out md:flex',
        expanded ? 'w-[240px]' : 'w-16'
      )}
      aria-label="Sidebar navigation"
    >
      <SidebarNavContent
        collapsed={!expanded}
        onSelect={handleSelect}
        activeView={activeView}
      />

      {/* Collapse/Expand Toggle */}
      <div className="absolute -right-3 top-20 z-50 hidden md:block">
        <Button
          size="icon"
          variant="outline"
          onClick={handleToggle}
          className={cn(
            'size-6 rounded-full border-emerald-700 bg-emerald-900 p-0 shadow-md',
            'hover:bg-emerald-800 hover:border-emerald-600',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400'
          )}
          aria-label={expanded ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          {expanded ? (
            <ChevronsLeft className="size-3.5 text-emerald-300" />
          ) : (
            <ChevronsRight className="size-3.5 text-emerald-300" />
          )}
        </Button>
      </div>
    </aside>
  )
}

// ─── Mobile Sidebar (Sheet) ──────────────────────────────────────────────────
function MobileSidebar() {
  const { activeView, setActiveView, sidebarOpen, setSidebarOpen } = useAmosStore()

  const handleSelect = useCallback(
    (view: ActiveView) => {
      setActiveView(view)
      setSidebarOpen(false)
    },
    [setActiveView, setSidebarOpen]
  )

  const handleOpenChange = useCallback(
    (open: boolean) => {
      setSidebarOpen(open)
    },
    [setSidebarOpen]
  )

  return (
    <Sheet open={sidebarOpen} onOpenChange={handleOpenChange}>
      <SheetContent
        side="left"
        className="w-[280px] border-emerald-800/50 bg-emerald-950 p-0"
      >
        <SheetTitle className="sr-only">AMOS Navigation</SheetTitle>
        <div className="flex h-full flex-col">
          <SidebarNavContent
            collapsed={false}
            onSelect={handleSelect}
            activeView={activeView}
          />
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ─── Exported Sidebar Component ───────────────────────────────────────────────
export function AmosSidebar() {
  // Initialize mobile menu as closed on mount
  const setSidebarOpen = useAmosStore((s) => s.setSidebarOpen)

  useEffect(() => {
    setSidebarOpen(false)
  }, [setSidebarOpen])

  return (
    <>
      <DesktopSidebar />
      <MobileSidebar />
    </>
  )
}