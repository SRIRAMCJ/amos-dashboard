'use client'

import { useAmosStore, type ResearchStep, type ResearchSource } from '@/store/amos-store'
import { useState, useRef, useEffect, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Send, Bot, User, RotateCcw, Sparkles, Search, Globe, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'

const SUGGESTED_COMMANDS = [
  'Find AR/VR tenders in Tamil Nadu government 2025',
  'Research TVS Motor current AR/VR initiatives',
  'List manufacturing companies in Chennai needing AR training',
  'Write a LinkedIn post about VR in education',
  'Search AR/VR competitors in India 2025',
  'Create an outreach email for a school VR lab',
  'Generate an SEO blog about AR maintenance training',
]

function formatTime(ts: number): string {
  const d = new Date(ts)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1.5 px-1 py-2">
      <span className="sr-only">AMOS is thinking</span>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="size-2 rounded-full bg-muted-foreground/50 animate-bounce"
          style={{ animationDelay: `${i * 150}ms`, animationDuration: '0.6s' }}
        />
      ))}
    </div>
  )
}

function SourcesList({ sources }: { sources: ResearchSource[] }) {
  const [expanded, setExpanded] = useState(false)
  if (sources.length === 0) return null

  return (
    <div className="mt-1.5">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
      >
        {expanded ? <ChevronUp className="size-2.5" /> : <ChevronDown className="size-2.5" />}
        <span className="font-medium">{sources.length} source{sources.length > 1 ? 's' : ''}</span>
      </button>
      {expanded && (
        <div className="mt-1 space-y-0.5 pl-4">
          {sources.map((source, i) => (
            <div key={i} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <span className={cn(
                'size-1.5 rounded-full shrink-0',
                source.type === 'scraped' ? 'bg-emerald-500' : source.type === 'web' ? 'bg-sky-500' : 'bg-amber-500'
              )} />
              {source.url ? (
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-primary hover:underline truncate max-w-[220px]"
                >
                  {source.title}
                </a>
              ) : (
                <span className="truncate max-w-[220px]">{source.title}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function ChatView() {
  const {
    chatMessages,
    chatSessionId,
    isChatLoading,
    researchSteps,
    researchSources,
    addChatMessage,
    setChatSessionId,
    setIsChatLoading,
    setResearchSteps,
    setResearchSources,
    clearChat,
  } = useAmosStore()

  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [chatMessages, isChatLoading, researchSteps, scrollToBottom])

  // Reset textarea height when chat is cleared
  useEffect(() => {
    if (chatMessages.length === 0 && textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      setInput('')
    }
  }, [chatMessages.length])

  const sendMessage = async (text: string) => {
    if (!text.trim() || isChatLoading) return
    addChatMessage({ role: 'user', content: text.trim(), timestamp: Date.now() })
    setInput('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
    setResearchSteps([])
    setResearchSources([])
    setIsChatLoading(true)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text.trim(), sessionId: chatSessionId }),
      })
      const data = await res.json()
      if (data.sessionId) setChatSessionId(data.sessionId)

      // Set research steps and sources from the response
      if (data.steps) setResearchSteps(data.steps)
      if (data.sources) setResearchSources(data.sources)

      if (data.error && !data.response) {
        addChatMessage({
          role: 'assistant',
          content: `⚠️ ${data.error}. Please try again.`,
          timestamp: Date.now(),
        })
      } else {
        addChatMessage({
          role: 'assistant',
          content: data.response || 'No response received.',
          timestamp: Date.now(),
          searched: !!data.searchPerformed,
          sources: data.sources || [],
        })
      }
    } catch {
      addChatMessage({
        role: 'assistant',
        content: 'Error connecting to AMOS. Please try again.',
        timestamp: Date.now(),
      })
    } finally {
      setIsChatLoading(false)
    }
  }

  const handleSubmit = () => {
    sendMessage(input)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    // Auto-resize
    const ta = e.target
    ta.style.height = 'auto'
    ta.style.height = Math.min(ta.scrollHeight, 200) + 'px'
  }

  const handleNewChat = () => {
    clearChat()
  }

  return (
    <div className="flex flex-col h-full">
      {/* ── Header ── */}
      <header className="flex items-center justify-between border-b px-4 py-3 sm:px-6 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Bot className="size-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold leading-none">AMOS Assistant</h2>
            <div className="flex items-center gap-1.5 mt-1">
              <span
                className={cn(
                  'size-1.5 rounded-full',
                  isChatLoading
                    ? 'bg-amber-500 animate-pulse'
                    : 'bg-emerald-500'
                )}
              />
              <span className="text-xs text-muted-foreground">
                {isChatLoading ? 'Thinking...' : 'Online'}
              </span>
            </div>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleNewChat}
          className="text-muted-foreground hover:text-foreground"
        >
          <RotateCcw className="size-4" />
          <span className="hidden sm:inline">New Chat</span>
        </Button>
      </header>

      {/* ── Message List ── */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 space-y-4"
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: 'hsl(var(--muted)) transparent',
        }}
      >
        {/* Empty state with suggested commands */}
        {chatMessages.length === 0 && !isChatLoading && (
          <div className="flex flex-col items-center justify-center h-full gap-6 pb-4">
            <div className="flex flex-col items-center gap-2 text-center">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Sparkles className="size-7" />
              </div>
              <h3 className="text-lg font-semibold">How can AMOS help you today?</h3>
              <p className="text-sm text-muted-foreground max-w-md">
                Your AI-powered AR/VR business assistant with live web research.
                Ask me anything about leads, outreach, content, or market research.
              </p>
            </div>
            <div className="w-full max-w-2xl">
              <p className="text-xs font-medium text-muted-foreground mb-3 px-1">
                Try a suggestion
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {SUGGESTED_COMMANDS.map((cmd) => (
                  <button
                    key={cmd}
                    onClick={() => sendMessage(cmd)}
                    className="group flex items-center gap-1.5 rounded-full border bg-card px-3.5 py-2 text-xs text-card-foreground shadow-sm transition-colors hover:bg-accent hover:border-accent-foreground/20 cursor-pointer text-left max-w-[280px]"
                  >
                    <Sparkles className="size-3 shrink-0 text-muted-foreground group-hover:text-primary transition-colors" />
                    <span className="line-clamp-2">{cmd}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Messages */}
        {chatMessages.map((msg, idx) => (
          <div
            key={idx}
            className={cn(
              'flex gap-3',
              msg.role === 'user' ? 'justify-end' : 'justify-start'
            )}
          >
            {/* Assistant avatar */}
            {msg.role === 'assistant' && (
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground mt-0.5">
                <Bot className="size-4" />
              </div>
            )}

            <div
              className={cn(
                'flex flex-col gap-1 max-w-[80%]',
                msg.role === 'user' ? 'items-end' : 'items-start'
              )}
            >
              <div
                className={cn(
                  'rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground rounded-br-md'
                    : 'bg-card border shadow-sm rounded-bl-md'
                )}
              >
                {msg.role === 'assistant' ? (
                  <div className="prose prose-sm max-w-none dark:prose-invert [&_p]:mb-2 [&_p:last-child]:mb-0 [&_ul]:mb-2 [&_ol]:mb-2 [&_li]:mb-0.5 [&_h1]:text-base [&_h2]:text-base [&_h3]:text-sm [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs [&_pre]:bg-muted [&_pre]:p-3 [&_pre]:rounded-lg [&_a]:text-primary [&_a]:underline">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                ) : (
                  <span className="whitespace-pre-wrap">{msg.content}</span>
                )}
              </div>
              <div className="flex items-center gap-1.5 px-1">
                {msg.searched && (
                  <Badge variant="secondary" className="gap-1 text-[9px] px-1.5 py-0 h-4 font-medium bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800">
                    <Search className="size-2.5" />
                    Live search
                  </Badge>
                )}
                <span className="text-[10px] text-muted-foreground">
                  {formatTime(msg.timestamp)}
                </span>
              </div>
              {/* Show sources for assistant messages */}
              {msg.role === 'assistant' && msg.sources && msg.sources.length > 0 && (
                <SourcesList sources={msg.sources} />
              )}
            </div>

            {/* User avatar */}
            {msg.role === 'user' && (
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground mt-0.5">
                <User className="size-4" />
              </div>
            )}
          </div>
        ))}

        {/* Research progress indicator */}
        {isChatLoading && researchSteps.length > 0 && (
          <div className="flex gap-3 justify-start">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground mt-0.5">
              <Bot className="size-4" />
            </div>
            <div className="bg-card border shadow-sm rounded-2xl rounded-bl-md px-4 py-3 max-w-[80%]">
              {researchSteps.map((step: ResearchStep, i: number) => (
                <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                  {step.type === 'search' && <Search className="size-3 text-sky-500 shrink-0" />}
                  {step.type === 'scrape' && <Globe className="size-3 text-emerald-500 shrink-0" />}
                  {step.type === 'analyze' && <Sparkles className="size-3 text-amber-500 shrink-0" />}
                  {step.type === 'thinking' && <Sparkles className="size-3 text-violet-500 shrink-0" />}
                  <span>{step.detail || step.label}</span>
                </div>
              ))}
              <TypingDots />
            </div>
          </div>
        )}

        {/* Loading indicator (fallback when no research steps) */}
        {isChatLoading && researchSteps.length === 0 && (
          <div className="flex gap-3 justify-start">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground mt-0.5">
              <Bot className="size-4" />
            </div>
            <div className="bg-card border shadow-sm rounded-2xl rounded-bl-md px-4 py-1">
              <TypingDots />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ── Input Area ── */}
      <div className="shrink-0 border-t bg-background px-4 py-3 sm:px-6">
        <div className="relative flex items-end gap-2 max-w-3xl mx-auto">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            placeholder="Ask AMOS anything..."
            disabled={isChatLoading}
            rows={1}
            className="min-h-[44px] max-h-[200px] resize-none rounded-xl pr-12 py-3 text-sm"
          />
          <Button
            size="icon"
            onClick={handleSubmit}
            disabled={!input.trim() || isChatLoading}
            className="absolute right-2 bottom-2 size-8 rounded-lg"
            aria-label="Send message"
          >
            <Send className="size-4" />
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground text-center mt-2">
          AMOS is an AI assistant with live web research. Responses may not always be accurate.
        </p>
      </div>
    </div>
  )
}