'use client'

import React from 'react'
import { useAmosStore } from '@/store/amos-store'
import { AmosSidebar } from '@/components/amos/sidebar'
import { DashboardHeader } from '@/components/amos/dashboard-header'
import DashboardView from '@/components/amos/dashboard-view'
import { ChatView } from '@/components/amos/chat-view'
import LeadsView from '@/components/amos/leads-view'
import EmailView from '@/components/amos/email-view'
import SocialView from '@/components/amos/social-view'
import { SearchView } from '@/components/amos/search-view'
import { BlogView } from '@/components/amos/blog-view'
import { ActivityView } from '@/components/amos/activity-view'
import { SettingsView } from '@/components/amos/settings-view'
import { AnalyticsView } from '@/components/amos/analytics-view'

export default function AmosDashboard() {
  const activeView = useAmosStore((s) => s.activeView)

  const renderView = () => {
    switch (activeView) {
      case 'dashboard':
        return <DashboardView />
      case 'chat':
        return <ChatView />
      case 'leads':
        return <LeadsView />
      case 'emails':
        return <EmailView />
      case 'social':
        return <SocialView />
      case 'analytics':
        return <AnalyticsView />
      case 'search':
        return <SearchView />
      case 'blogs':
        return <BlogView />
      case 'activities':
        return <ActivityView />
      case 'settings':
        return <SettingsView />
      default:
        return <DashboardView />
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <AmosSidebar />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden md:ml-[240px]">
        {/* Header */}
        <DashboardHeader />

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {renderView()}
        </main>

        {/* Sticky Footer */}
        <footer className="border-t bg-background px-4 py-2 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Madras MindWorks — AMOS Autonomous Marketing Operating System
        </footer>
      </div>
    </div>
  )
}