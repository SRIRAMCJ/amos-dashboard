'use client'

import { useAmosStore, type BlogPost } from '@/store/amos-store'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  PenLine,
  Sparkles,
  Loader2,
  Save,
  Send,
  Calendar,
  FileText,
  Eye,
  CheckCircle2,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'

const VERTICALS = [
  'Factories',
  'Schools & Colleges',
  'Government',
  'Global Enterprises',
]

export function BlogView() {
  const { blogPosts, setBlogPosts, isGenerating, setIsGenerating } = useAmosStore()

  // Form state
  const [title, setTitle] = useState('')
  const [vertical, setVertical] = useState('')
  const [keywords, setKeywords] = useState('')
  const [content, setContent] = useState('')

  // List state
  const [isLoading, setIsLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('all')

  // Dialog state
  const [selectedBlog, setSelectedBlog] = useState<BlogPost | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const fetchBlogs = async () => {
    setIsLoading(true)
    try {
      const params = statusFilter !== 'all' ? `?status=${statusFilter}` : ''
      const res = await fetch(`/api/blogs${params}`)
      if (!res.ok) throw new Error('Failed to fetch blogs')
      const data = await res.json()
      setBlogPosts(data || [])
    } catch {
      toast.error('Failed to load blogs.')
      setBlogPosts([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchBlogs()
  }, [statusFilter, setBlogPosts])

  const handleAIGenerate = async () => {
    if (!vertical) {
      toast.error('Please select a vertical first.')
      return
    }
    setIsGenerating(true)
    try {
      const context = `Title: ${title || 'AR/VR Industry Insights'}
Vertical: ${vertical}
Keywords: ${keywords || 'AR, VR, XR, immersive technology'}`
      const res = await fetch('/api/ai-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'blog', context })
      })
      const data = await res.json()
      if (data.content) {
        // Try to extract title from generated content (first line as heading)
        const lines = data.content.split('\n').filter(Boolean)
        const firstLine = lines[0] || ''
        // If first line looks like a markdown heading, use it as title
        const extractedTitle = firstLine.replace(/^#+\s*/, '').trim()
        if (extractedTitle.length > 5 && extractedTitle.length < 120 && !title) {
          setTitle(extractedTitle)
          // Remove the heading from content
          const remainingContent = lines.slice(1).join('\n').trim()
          setContent(remainingContent || data.content)
        } else {
          setContent(data.content)
        }
        if (!title && extractedTitle.length > 5) {
          setTitle(extractedTitle)
        }
        if (data.fallback) {
          toast.info('AI engine unavailable — using template content. Customize it to your needs!')
        } else {
          toast.success('Blog content generated successfully!')
        }
      } else {
        toast.error('AI could not generate content. Please try again.')
      }
    } catch {
      toast.error('AI generation failed. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSaveDraft = async () => {
    if (!title.trim()) {
      toast.error('Title is required.')
      return
    }
    try {
      const res = await fetch('/api/blogs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          content: content.trim(),
          vertical: vertical || null,
          seoKeywords: keywords.trim() || null,
          status: 'Draft',
        })
      })
      if (res.ok) {
        toast.success('Blog saved as draft!')
        setTitle('')
        setContent('')
        setKeywords('')
        setVertical('')
        fetchBlogs()
      } else {
        toast.error('Failed to save blog.')
      }
    } catch {
      toast.error('Failed to save blog.')
    }
  }

  const handlePublish = async () => {
    if (!title.trim()) {
      toast.error('Title is required.')
      return
    }
    if (!content.trim()) {
      toast.error('Content is required to publish.')
      return
    }
    try {
      const res = await fetch('/api/blogs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          content: content.trim(),
          vertical: vertical || null,
          seoKeywords: keywords.trim() || null,
          status: 'Published',
        })
      })
      if (res.ok) {
        toast.success('Blog published successfully!')
        setTitle('')
        setContent('')
        setKeywords('')
        setVertical('')
        fetchBlogs()
      } else {
        toast.error('Failed to publish blog.')
      }
    } catch {
      toast.error('Failed to publish blog.')
    }
  }

  const handleMarkPublished = async (blog: BlogPost) => {
    try {
      const res = await fetch(`/api/blogs/${blog.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...blog, status: 'Published' })
      })
      if (res.ok) {
        toast.success('Blog marked as published!')
        fetchBlogs()
        if (selectedBlog?.id === blog.id) {
          setSelectedBlog({ ...blog, status: 'Published' })
        }
      } else {
        toast.error('Failed to update blog status.')
      }
    } catch {
      toast.error('Failed to update blog status.')
    }
  }

  const openBlogDialog = (blog: BlogPost) => {
    setSelectedBlog(blog)
    setDialogOpen(true)
  }

  const getVerticalColor = (v: string | null) => {
    switch (v) {
      case 'Factories': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
      case 'Schools & Colleges': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
      case 'Government': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
      case 'Global Enterprises': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
      default: return 'bg-secondary text-secondary-foreground'
    }
  }

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    } catch {
      return dateStr
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <PenLine className="h-6 w-6 text-orange-500" />
          SEO Blog Writer
        </h2>
        <p className="text-muted-foreground mt-1">
          Create SEO-optimized blog posts with AI assistance for different verticals.
        </p>
      </div>

      {/* Create Blog Form */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Create New Blog
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="blog-title">
              Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="blog-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter blog title..."
              className="text-base"
            />
          </div>

          {/* Vertical + Keywords Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Vertical</Label>
              <Select value={vertical} onValueChange={setVertical}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select vertical..." />
                </SelectTrigger>
                <SelectContent>
                  {VERTICALS.map((v) => (
                    <SelectItem key={v} value={v}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="blog-keywords">SEO Keywords</Label>
              <Input
                id="blog-keywords"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                placeholder="ar, vr, education, training..."
              />
            </div>
          </div>

          {/* Content */}
          <div className="space-y-2">
            <Label htmlFor="blog-content">Content</Label>
            <Textarea
              id="blog-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your blog content here, or use AI to generate it..."
              className="min-h-[200px] text-sm leading-relaxed"
            />
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-3 pt-2">
            <Button
              variant="outline"
              onClick={handleAIGenerate}
              disabled={isGenerating}
              className="gap-2"
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              AI Generate Blog
            </Button>
            <Button
              variant="secondary"
              onClick={handleSaveDraft}
              disabled={!title.trim()}
              className="gap-2"
            >
              <Save className="h-4 w-4" />
              Save Draft
            </Button>
            <Button
              onClick={handlePublish}
              disabled={!title.trim() || !content.trim()}
              className="gap-2"
            >
              <Send className="h-4 w-4" />
              Publish
            </Button>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Blog List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h3 className="text-lg font-semibold">Blog Posts</h3>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="Draft">Draft</SelectItem>
              <SelectItem value="Published">Published</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="max-h-[500px] overflow-y-auto space-y-3">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-4 space-y-3">
                    <Skeleton className="h-5 w-3/4" />
                    <div className="flex gap-2">
                      <Skeleton className="h-5 w-24 rounded-full" />
                      <Skeleton className="h-5 w-32 rounded-full" />
                    </div>
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : blogPosts.length > 0 ? (
            blogPosts.map((blog) => (
              <Card
                key={blog.id}
                className="hover:shadow-md transition-shadow cursor-pointer group"
                onClick={() => openBlogDialog(blog)}
              >
                <CardContent className="p-4">
                  <div className="space-y-2">
                    {/* Title row */}
                    <div className="flex items-start justify-between gap-3">
                      <h4 className="font-medium text-sm leading-snug line-clamp-1 group-hover:text-primary transition-colors">
                        {blog.title}
                      </h4>
                      <div className="flex items-center gap-2 shrink-0">
                        {blog.status === 'Draft' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs gap-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleMarkPublished(blog)
                            }}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Publish
                          </Button>
                        )}
                        <Eye className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>

                    {/* Meta row */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {blog.vertical && (
                        <Badge
                          variant="secondary"
                          className={cn('text-xs', getVerticalColor(blog.vertical))}
                        >
                          {blog.vertical}
                        </Badge>
                      )}
                      <Badge
                        variant={blog.status === 'Published' ? 'default' : 'secondary'}
                        className={cn(
                          'text-xs',
                          blog.status === 'Published'
                            ? 'bg-emerald-600 hover:bg-emerald-700'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
                        )}
                      >
                        {blog.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(blog.createdAt)}
                      </span>
                    </div>

                    {/* Keywords */}
                    {blog.seoKeywords && (
                      <div className="flex flex-wrap gap-1">
                        {blog.seoKeywords.split(',').map((kw, i) => (
                          <span
                            key={i}
                            className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground"
                          >
                            {kw.trim()}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Content preview */}
                    <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                      {blog.content.length > 150
                        ? blog.content.slice(0, 150) + '...'
                        : blog.content}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="text-muted-foreground font-medium">No blogs found</p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                Create your first blog post using the form above.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Blog Detail Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="line-clamp-2">
              {selectedBlog?.title}
            </DialogTitle>
            <DialogDescription className="flex items-center gap-2 flex-wrap">
              {selectedBlog?.vertical && (
                <Badge variant="secondary" className={cn('text-xs', getVerticalColor(selectedBlog.vertical))}>
                  {selectedBlog.vertical}
                </Badge>
              )}
              <Badge
                variant={selectedBlog?.status === 'Published' ? 'default' : 'secondary'}
                className={cn(
                  'text-xs',
                  selectedBlog?.status === 'Published'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
                )}
              >
                {selectedBlog?.status}
              </Badge>
              {selectedBlog?.createdAt && (
                <span className="text-xs text-muted-foreground">
                  {formatDate(selectedBlog.createdAt)}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          {selectedBlog?.seoKeywords && (
            <div className="flex flex-wrap gap-1">
              {selectedBlog.seoKeywords.split(',').map((kw, i) => (
                <Badge key={i} variant="outline" className="text-xs">
                  {kw.trim()}
                </Badge>
              ))}
            </div>
          )}

          <ScrollArea className="max-h-[50vh]">
            <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap text-sm leading-relaxed">
              {selectedBlog?.content || 'No content available.'}
            </div>
          </ScrollArea>

          {selectedBlog?.status === 'Draft' && (
            <div className="flex justify-end pt-2">
              <Button
                size="sm"
                className="gap-2"
                onClick={() => {
                  if (selectedBlog) handleMarkPublished(selectedBlog)
                }}
              >
                <CheckCircle2 className="h-4 w-4" />
                Mark as Published
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}