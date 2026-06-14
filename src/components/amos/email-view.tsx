'use client'

import { useAmosStore, type OutreachEmail } from '@/store/amos-store'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
  Mail,
  Sparkles,
  Loader2,
  Send,
  SendHorizonal,
  FileText,
  ChevronDown,
  ChevronUp,
  Inbox,
} from 'lucide-react'

// --- Zod Schema ---
const emailSchema = z.object({
  toName: z.string().min(1, 'Recipient name is required'),
  toEmail: z.string().email('Valid email is required'),
  subject: z.string().min(1, 'Subject is required'),
  body: z.string().min(1, 'Email body is required'),
})

type EmailFormData = z.infer<typeof emailSchema>

// --- Status color mapping ---
const statusColors: Record<string, string> = {
  Draft: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  Sent: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
}

const statusOptions = ['All', 'Draft', 'Sent']

export default function EmailView() {
  const { emails, setEmails, isGenerating, setIsGenerating } = useAmosStore()
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [statusFilter, setStatusFilter] = useState('All')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [markingSent, setMarkingSent] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<EmailFormData>({
    resolver: zodResolver(emailSchema),
    defaultValues: {
      toName: '',
      toEmail: '',
      subject: '',
      body: '',
    },
  })

  // Fetch emails on mount
  useEffect(() => {
    fetchEmails()
  }, [])

  // Re-fetch when filter changes
  useEffect(() => {
    fetchEmails()
  }, [statusFilter])

  const fetchEmails = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter && statusFilter !== 'All') params.set('status', statusFilter)

      const res = await fetch(`/api/emails?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to fetch emails')
      const data = await res.json()
      setEmails(data)
    } catch (err) {
      toast.error('Failed to load emails')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const onSubmit = async (data: EmailFormData) => {
    setIsSubmitting(true)
    try {
      const res = await fetch('/api/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, status: 'Draft' }),
      })
      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || 'Failed to create email')
      }
      toast.success('Email draft saved successfully')
      reset()
      fetchEmails()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save email')
    } finally {
      setIsSubmitting(false)
    }
  }

  const onSubmitAsSent = async (data: EmailFormData) => {
    setIsSubmitting(true)
    try {
      const res = await fetch('/api/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, status: 'Sent' }),
      })
      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || 'Failed to send email')
      }
      toast.success('Email marked as sent')
      reset()
      fetchEmails()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send email')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAIGenerate = async () => {
    const toName = getValues('toName')
    const toEmail = getValues('toEmail')
    if (!toName) {
      toast.error('Please enter recipient name first for better AI context')
      return
    }

    setIsGenerating(true)
    try {
      const context = `Recipient: ${toName} (${toEmail || 'no email'}). ${getValues('subject') ? `Subject context: ${getValues('subject')}` : 'No specific subject provided.'} Generate a cold outreach email for Madras MindWorks AR/VR/AI services.`

      const res = await fetch('/api/ai-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'email', context }),
      })
      if (!res.ok) throw new Error('Failed to generate email')

      const data = await res.json()
      const generatedContent = data.content || ''

      // Try to extract subject from first line if it looks like a subject
      const lines = generatedContent.split('\n')
      let subjectLine = ''
      let bodyText = generatedContent

      if (lines.length > 1 && lines[0].length < 100 && !lines[0].startsWith('Dear') && !lines[0].startsWith('Hi')) {
        subjectLine = lines[0].replace(/^Subject:\s*/i, '').trim()
        bodyText = lines.slice(1).join('\n').trim()
      }

      if (subjectLine) setValue('subject', subjectLine)
      if (!getValues('subject') && subjectLine) setValue('subject', subjectLine)
      setValue('body', bodyText || generatedContent)

      toast.success('Email generated successfully')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to generate email')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleMarkAsSent = async (email: OutreachEmail) => {
    setMarkingSent(email.id)
    try {
      const res = await fetch(`/api/emails/${email.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Sent' }),
      })
      if (!res.ok) throw new Error('Failed to update email')
      toast.success(`Email to "${email.toName}" marked as sent`)
      fetchEmails()
    } catch (err) {
      toast.error('Failed to mark email as sent')
    } finally {
      setMarkingSent(null)
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Email Outreach</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Compose and manage outreach emails
          </p>
        </div>
        <Badge variant="secondary" className="text-sm px-3 py-1">
          {emails.length} email{emails.length !== 1 ? 's' : ''}
        </Badge>
      </div>

      <Separator />

      {/* Compose Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Mail className="h-5 w-5" />
            Compose Email
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* To Name */}
              <div className="space-y-2">
                <Label htmlFor="email-to-name">
                  To Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="email-to-name"
                  placeholder="Jane Smith"
                  {...register('toName')}
                  className={cn(errors.toName && 'border-destructive')}
                />
                {errors.toName && (
                  <p className="text-xs text-destructive">{errors.toName.message}</p>
                )}
              </div>

              {/* To Email */}
              <div className="space-y-2">
                <Label htmlFor="email-to-email">
                  To Email <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="email-to-email"
                  type="email"
                  placeholder="jane@company.com"
                  {...register('toEmail')}
                  className={cn(errors.toEmail && 'border-destructive')}
                />
                {errors.toEmail && (
                  <p className="text-xs text-destructive">{errors.toEmail.message}</p>
                )}
              </div>
            </div>

            {/* Subject */}
            <div className="space-y-2">
              <Label htmlFor="email-subject">
                Subject <span className="text-destructive">*</span>
              </Label>
              <Input
                id="email-subject"
                placeholder="Transform Your Training with AR/VR Solutions"
                {...register('subject')}
                className={cn(errors.subject && 'border-destructive')}
              />
              {errors.subject && (
                <p className="text-xs text-destructive">{errors.subject.message}</p>
              )}
            </div>

            {/* Body */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="email-body">
                  Body <span className="text-destructive">*</span>
                </Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleAIGenerate}
                  disabled={isGenerating}
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
                id="email-body"
                placeholder="Write your email content here..."
                rows={8}
                {...register('body')}
                className={cn(errors.body && 'border-destructive')}
              />
              {errors.body && (
                <p className="text-xs text-destructive">{errors.body.message}</p>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <Button
                type="button"
                onClick={handleSubmit(onSubmit)}
                disabled={isSubmitting}
                variant="outline"
                className="gap-2"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileText className="h-4 w-4" />
                )}
                Save as Draft
              </Button>
              <Button
                type="button"
                onClick={handleSubmit(onSubmitAsSent)}
                disabled={isSubmitting}
                className="gap-2"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Mark as Sent
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter status" />
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map((s) => (
              <SelectItem key={s} value={s}>
                {s === 'All' ? 'All Statuses' : s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Email List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading emails...</span>
        </div>
      ) : emails.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Inbox className="h-12 w-12 text-muted-foreground/40 mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground">No emails yet</h3>
          <p className="text-sm text-muted-foreground/70 mt-1 max-w-sm">
            Compose your first outreach email above to get started.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {emails.map((email) => (
            <Card key={email.id} className="overflow-hidden">
              <CardContent className="p-0">
                {/* Summary Row */}
                <button
                  type="button"
                  onClick={() =>
                    setExpandedId(expandedId === email.id ? null : email.id)
                  }
                  className="w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm truncate">
                          {email.toName}
                        </span>
                        <span className="text-muted-foreground text-xs truncate">
                          &lt;{email.toEmail}&gt;
                        </span>
                        <Badge
                          variant="outline"
                          className={cn(
                            'border-transparent text-[10px] px-1.5',
                            statusColors[email.status] || ''
                          )}
                        >
                          {email.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground truncate mt-0.5">
                        {email.subject}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-muted-foreground hidden sm:inline">
                        {formatDate(email.createdAt)}
                      </span>
                      {expandedId === email.id ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                </button>

                {/* Expanded Body */}
                {expandedId === email.id && (
                  <>
                    <div className="border-t px-4 py-3">
                      <div className="text-sm font-medium mb-1">{email.subject}</div>
                      <p className="text-sm text-muted-foreground sm:hidden mb-2">
                        {formatDate(email.createdAt)}
                      </p>
                      <div className="bg-muted/50 rounded-md p-3 text-sm whitespace-pre-wrap max-h-64 overflow-y-auto">
                        {email.body}
                      </div>
                    </div>
                    {email.status === 'Draft' && (
                      <div className="border-t px-4 py-2 flex justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5"
                          disabled={markingSent === email.id}
                          onClick={() => handleMarkAsSent(email)}
                        >
                          {markingSent === email.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <SendHorizonal className="h-3.5 w-3.5" />
                          )}
                          Mark as Sent
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
