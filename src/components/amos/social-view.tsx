'use client'

import { useAmosStore, type SocialPost } from '@/store/amos-store'
import { useEffect, useState } from 'react'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Share2,
  Sparkles,
  Loader2,
  Send,
  FileText,
  Linkedin,
  Twitter,
  Eye,
  EyeOff,
  GripVertical,
  Hash,
} from 'lucide-react'

// --- Zod Schema ---
const socialSchema = z.object({
  platform: z.string().min(1, 'Platform is required'),
  content: z.string().min(1, 'Content is required'),
})

type SocialFormData = z.infer<typeof socialSchema>

// --- Config ---
const PLATFORM_CONFIG = {
  LinkedIn: {
    icon: Linkedin,
    color: 'text-[#0A66C2]',
    bgBadge: 'bg-[#0A66C2]/10 text-[#0A66C2]',
    maxChars: 3000,
    label: 'LinkedIn',
  },
  Twitter: {
    icon: Twitter,
    color: 'text-black dark:text-white',
    bgBadge: 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200',
    maxChars: 280,
    label: 'Twitter / X',
  },
} as const

type Platform = keyof typeof PLATFORM_CONFIG

const statusColors: Record<string, string> = {
  Draft: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  Published: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
}

const platformOptions: string[] = ['All', 'LinkedIn', 'Twitter']

export default function SocialView() {
  const { socialPosts, setSocialPosts, isGenerating, setIsGenerating } = useAmosStore()
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [platformFilter, setPlatformFilter] = useState('All')
  const [selectedPlatform, setSelectedPlatform] = useState<string>('')
  const [markingPublished, setMarkingPublished] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    getValues,
    formState: { errors },
  } = useForm<SocialFormData>({
    resolver: zodResolver(socialSchema),
    defaultValues: {
      platform: '',
      content: '',
    },
  })

  const contentValue = watch('content') || ''
  const currentPlatform = (selectedPlatform || 'LinkedIn') as Platform
  const maxChars = PLATFORM_CONFIG[currentPlatform]?.maxChars || 3000
  const charCount = contentValue.length
  const isOverLimit = charCount > maxChars

  // Fetch posts on mount
  useEffect(() => {
    fetchPosts()
  }, [])

  // Re-fetch when filter changes
  useEffect(() => {
    fetchPosts()
  }, [platformFilter])

  const fetchPosts = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (platformFilter && platformFilter !== 'All')
        params.set('platform', platformFilter)

      const res = await fetch(`/api/social?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to fetch posts')
      const data = await res.json()
      setSocialPosts(data)
    } catch (err) {
      toast.error('Failed to load posts')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const onSubmit = async (data: SocialFormData, status: string) => {
    setIsSubmitting(true)
    try {
      const res = await fetch('/api/social', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, status }),
      })
      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || 'Failed to create post')
      }
      toast.success(
        status === 'Draft'
          ? 'Post saved as draft'
          : 'Post marked as published'
      )
      reset()
      setSelectedPlatform('')
      fetchPosts()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save post')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAIGenerate = async () => {
    const platform = selectedPlatform || 'LinkedIn'
    setIsGenerating(true)
    try {
      const context = `Generate a ${platform.toLowerCase()} post for Madras MindWorks showcasing AR/VR/AI capabilities.`

      const res = await fetch('/api/ai-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'social', context, platform }),
      })
      if (!res.ok) throw new Error('Failed to generate content')

      const data = await res.json()
      setValue('content', data.content || '')
      toast.success('Post content generated successfully')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to generate content')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleMarkAsPublished = async (post: SocialPost) => {
    setMarkingPublished(post.id)
    try {
      const res = await fetch(`/api/social/${post.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Published' }),
      })
      if (!res.ok) throw new Error('Failed to update post')
      toast.success('Post marked as published')
      fetchPosts()
    } catch (err) {
      toast.error('Failed to mark post as published')
    } finally {
      setMarkingPublished(null)
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const charPercent = Math.min((charCount / maxChars) * 100, 100)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Social Media</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Create and schedule social media posts
          </p>
        </div>
        <Badge variant="secondary" className="text-sm px-3 py-1">
          {socialPosts.length} post{socialPosts.length !== 1 ? 's' : ''}
        </Badge>
      </div>

      <Separator />

      {/* Create Post Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Share2 className="h-5 w-5" />
            Create Post
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4">
            {/* Platform Select */}
            <div className="space-y-2">
              <Label htmlFor="post-platform">
                Platform <span className="text-destructive">*</span>
              </Label>
              <Select
                value={selectedPlatform}
                onValueChange={(val) => {
                  setSelectedPlatform(val)
                  setValue('platform', val)
                }}
              >
                <SelectTrigger id="post-platform" className="w-full sm:w-[240px]">
                  <SelectValue placeholder="Select platform" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LinkedIn">
                    <div className="flex items-center gap-2">
                      <Linkedin className="h-4 w-4 text-[#0A66C2]" />
                      LinkedIn
                    </div>
                  </SelectItem>
                  <SelectItem value="Twitter">
                    <div className="flex items-center gap-2">
                      <Twitter className="h-4 w-4" />
                      Twitter / X
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <input type="hidden" {...register('platform')} />
              {errors.platform && (
                <p className="text-xs text-destructive">{errors.platform.message}</p>
              )}
            </div>

            {/* Content */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="post-content">
                  Content <span className="text-destructive">*</span>
                </Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleAIGenerate}
                  disabled={isGenerating || !selectedPlatform}
                  className="gap-1.5 text-xs"
                >
                  {isGenerating ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5" />
                  )}
                  AI Generate
                </Button>
              </div>
              <Textarea
                id="post-content"
                placeholder={
                  currentPlatform === 'Twitter'
                    ? "What's happening? (280 character limit)"
                    : 'Share something professional with your network...'
                }
                rows={6}
                {...register('content')}
                className={cn(
                  errors.content && 'border-destructive',
                  isOverLimit && 'border-destructive'
                )}
              />
              {errors.content && (
                <p className="text-xs text-destructive">{errors.content.message}</p>
              )}

              {/* Character Count Indicator */}
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all duration-200',
                      charPercent > 90
                        ? isOverLimit
                          ? 'bg-destructive'
                          : 'bg-amber-500'
                        : 'bg-primary'
                    )}
                    style={{ width: `${charPercent}%` }}
                  />
                </div>
                <span
                  className={cn(
                    'text-xs tabular-nums shrink-0',
                    isOverLimit ? 'text-destructive font-medium' : 'text-muted-foreground'
                  )}
                >
                  {charCount} / {maxChars}
                </span>
              </div>
              {isOverLimit && (
                <p className="text-xs text-destructive">
                  Content exceeds the character limit for {PLATFORM_CONFIG[currentPlatform]?.label}.
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                className="gap-2"
                disabled={isSubmitting || isOverLimit}
                onClick={handleSubmit((data) => onSubmit(data, 'Draft'))}
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileText className="h-4 w-4" />
                )}
                Save Draft
              </Button>
              <Button
                type="button"
                className="gap-2"
                disabled={isSubmitting || isOverLimit}
                onClick={handleSubmit((data) => onSubmit(data, 'Published'))}
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Publish
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <Select value={platformFilter} onValueChange={setPlatformFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter platform" />
          </SelectTrigger>
          <SelectContent>
            {platformOptions.map((p) => (
              <SelectItem key={p} value={p}>
                {p === 'All' ? 'All Platforms' : p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Posts List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading posts...</span>
        </div>
      ) : socialPosts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Hash className="h-12 w-12 text-muted-foreground/40 mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground">No posts yet</h3>
          <p className="text-sm text-muted-foreground/70 mt-1 max-w-sm">
            Create your first social media post above to get started.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {socialPosts.map((post) => {
            const platformKey = post.platform as Platform
            const config = PLATFORM_CONFIG[platformKey]
            const PlatformIcon = config?.icon || Share2

            return (
              <Card key={post.id} className="overflow-hidden">
                <CardContent className="p-4">
                  {/* Header: Platform + Status + Date */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className={cn('flex items-center gap-1.5 text-sm font-medium rounded-md px-2 py-0.5', config?.bgBadge)}>
                        <PlatformIcon className="h-3.5 w-3.5" />
                        {post.platform}
                      </div>
                      <Badge
                        variant="outline"
                        className={cn(
                          'border-transparent text-[10px] px-1.5',
                          statusColors[post.status] || ''
                        )}
                      >
                        {post.status}
                      </Badge>
                    </div>
                  </div>

                  {/* Content Preview */}
                  <p className="text-sm text-foreground/90 line-clamp-3 whitespace-pre-wrap mb-3">
                    {post.content}
                  </p>

                  {/* Footer: Date + Action */}
                  <div className="flex items-center justify-between pt-2 border-t">
                    <span className="text-xs text-muted-foreground">
                      {formatDate(post.createdAt)}
                    </span>
                    {post.status === 'Draft' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1.5 text-xs h-7"
                        disabled={markingPublished === post.id}
                        onClick={() => handleMarkAsPublished(post)}
                      >
                        {markingPublished === post.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Send className="h-3 w-3" />
                        )}
                        Mark as Published
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
