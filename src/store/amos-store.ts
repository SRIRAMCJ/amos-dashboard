import { create } from 'zustand'

// Types
export type ActiveView = 'dashboard' | 'chat' | 'leads' | 'emails' | 'social' | 'search' | 'blogs' | 'activities'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

export interface Lead {
  id: string
  name: string
  email: string
  company: string | null
  phone: string | null
  vertical: string | null
  source: string | null
  status: string
  notes: string | null
  createdAt: string
  updatedAt: string
}

export interface OutreachEmail {
  id: string
  toName: string
  toEmail: string
  subject: string
  body: string
  status: string
  leadId: string | null
  scheduledAt: string | null
  sentAt: string | null
  createdAt: string
  updatedAt: string
}

export interface SocialPost {
  id: string
  platform: string
  content: string
  status: string
  scheduledAt: string | null
  publishedAt: string | null
  engagement: string | null
  createdAt: string
  updatedAt: string
}

export interface BlogPost {
  id: string
  title: string
  content: string
  seoKeywords: string | null
  vertical: string | null
  status: string
  publishedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface ActivityLog {
  id: string
  action: string
  description: string
  metadata: string | null
  createdAt: string
}

export interface SearchResult {
  url: string
  name: string
  snippet: string
  host_name: string
  rank: number
  date: string
  favicon: string
}

export interface DashboardStats {
  totalLeads: number
  newLeads: number
  totalEmails: number
  sentEmails: number
  totalPosts: number
  publishedPosts: number
  totalBlogs: number
  totalActivities: number
}

export interface AmosState {
  // Navigation
  activeView: ActiveView
  setActiveView: (view: ActiveView) => void
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void

  // Chat
  chatMessages: ChatMessage[]
  chatSessionId: string | null
  isChatLoading: boolean
  addChatMessage: (message: ChatMessage) => void
  setChatSessionId: (id: string) => void
  setIsChatLoading: (loading: boolean) => void
  clearChat: () => void

  // Data
  leads: Lead[]
  setLeads: (leads: Lead[]) => void
  emails: OutreachEmail[]
  setEmails: (emails: OutreachEmail[]) => void
  socialPosts: SocialPost[]
  setSocialPosts: (posts: SocialPost[]) => void
  blogPosts: BlogPost[]
  setBlogPosts: (posts: BlogPost[]) => void
  activities: ActivityLog[]
  setActivities: (activities: ActivityLog[]) => void
  searchResults: SearchResult[]
  setSearchResults: (results: SearchResult[]) => void
  stats: DashboardStats | null
  setStats: (stats: DashboardStats) => void

  // UI State
  isSearching: boolean
  setIsSearching: (searching: boolean) => void
  isGenerating: boolean
  setIsGenerating: (generating: boolean) => void
}

export const useAmosStore = create<AmosState>((set) => ({
  // Navigation
  activeView: 'dashboard',
  setActiveView: (view) => set({ activeView: view }),
  sidebarOpen: true,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  // Chat
  chatMessages: [],
  chatSessionId: null,
  isChatLoading: false,
  addChatMessage: (message) =>
    set((state) => ({ chatMessages: [...state.chatMessages, message] })),
  setChatSessionId: (id) => set({ chatSessionId: id }),
  setIsChatLoading: (loading) => set({ isChatLoading: loading }),
  clearChat: () =>
    set({ chatMessages: [], chatSessionId: null }),

  // Data
  leads: [],
  setLeads: (leads) => set({ leads }),
  emails: [],
  setEmails: (emails) => set({ emails }),
  socialPosts: [],
  setSocialPosts: (posts) => set({ socialPosts: posts }),
  blogPosts: [],
  setBlogPosts: (posts) => set({ blogPosts: posts }),
  activities: [],
  setActivities: (activities) => set({ activities }),
  searchResults: [],
  setSearchResults: (results) => set({ searchResults: results }),
  stats: null,
  setStats: (stats) => set({ stats }),

  // UI State
  isSearching: false,
  setIsSearching: (searching) => set({ isSearching: searching }),
  isGenerating: false,
  setIsGenerating: (generating) => set({ isGenerating: generating }),
}))