'use client'

import { useAmosStore, type Lead } from '@/store/amos-store'
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
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  UserPlus,
  Search,
  ChevronDown,
  ChevronUp,
  Loader2,
  Users,
} from 'lucide-react'

// --- Zod Schema ---
const leadSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Valid email is required'),
  company: z.string().optional().default(''),
  phone: z.string().optional().default(''),
  vertical: z.string().optional().default(''),
  source: z.string().optional().default(''),
  notes: z.string().optional().default(''),
})

type LeadFormData = z.infer<typeof leadSchema>

// --- Status color mapping ---
const statusColors: Record<string, string> = {
  New: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  Contacted: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300',
  Qualified: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  Proposal: 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300',
  Closed: 'bg-zinc-100 text-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-300',
}

const verticals = ['Factories', 'Schools & Colleges', 'Government', 'Global Enterprises']
const sources = ['Web', 'Referral', 'LinkedIn', 'Cold Outreach', 'AMOS']
const statuses = ['All', 'New', 'Contacted', 'Qualified', 'Proposal', 'Closed']

export default function LeadsView() {
  const { leads, setLeads } = useAmosStore()
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<LeadFormData>({
    resolver: zodResolver(leadSchema),
    defaultValues: {
      name: '',
      email: '',
      company: '',
      phone: '',
      vertical: '',
      source: '',
      notes: '',
    },
  })

  // Fetch leads on mount
  useEffect(() => {
    fetchLeads()
  }, [])

  const fetchLeads = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (searchQuery) params.set('search', searchQuery)
      if (statusFilter && statusFilter !== 'All') params.set('status', statusFilter)

      const res = await fetch(`/api/leads?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to fetch leads')
      const data = await res.json()
      setLeads(data)
    } catch (err) {
      toast.error('Failed to load leads')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  // Re-fetch when filters change
  useEffect(() => {
    fetchLeads()
  }, [statusFilter])

  const onSubmit = async (data: LeadFormData) => {
    setIsSubmitting(true)
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || 'Failed to create lead')
      }
      toast.success(`Lead "${data.name}" created successfully`)
      reset()
      setIsFormOpen(false)
      fetchLeads()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create lead')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    fetchLeads()
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Leads</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Manage and track your sales leads
          </p>
        </div>
        <Badge variant="secondary" className="text-sm px-3 py-1">
          {leads.length} lead{leads.length !== 1 ? 's' : ''}
        </Badge>
      </div>

      <Separator />

      {/* Add Lead Collapsible Form */}
      <Collapsible open={isFormOpen} onOpenChange={setIsFormOpen}>
        <CollapsibleTrigger asChild>
          <Button
            variant={isFormOpen ? 'outline' : 'default'}
            className="w-full sm:w-auto gap-2"
          >
            {isFormOpen ? (
              <>
                <ChevronUp className="h-4 w-4" />
                Hide Form
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4" />
                Add New Lead
              </>
            )}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-4">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="rounded-lg border bg-card p-4 sm:p-6 space-y-4">
              <h3 className="font-semibold text-lg">Lead Details</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Name */}
                <div className="space-y-2">
                  <Label htmlFor="lead-name">
                    Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="lead-name"
                    placeholder="John Doe"
                    {...register('name')}
                    className={cn(errors.name && 'border-destructive')}
                  />
                  {errors.name && (
                    <p className="text-xs text-destructive">{errors.name.message}</p>
                  )}
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="lead-email">
                    Email <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="lead-email"
                    type="email"
                    placeholder="john@company.com"
                    {...register('email')}
                    className={cn(errors.email && 'border-destructive')}
                  />
                  {errors.email && (
                    <p className="text-xs text-destructive">{errors.email.message}</p>
                  )}
                </div>

                {/* Company */}
                <div className="space-y-2">
                  <Label htmlFor="lead-company">Company</Label>
                  <Input
                    id="lead-company"
                    placeholder="Acme Inc."
                    {...register('company')}
                  />
                </div>

                {/* Phone */}
                <div className="space-y-2">
                  <Label htmlFor="lead-phone">Phone</Label>
                  <Input
                    id="lead-phone"
                    placeholder="+91 98765 43210"
                    {...register('phone')}
                  />
                </div>

                {/* Vertical */}
                <div className="space-y-2">
                  <Label htmlFor="lead-vertical">Vertical</Label>
                  <Select
                    onValueChange={(val) => {
                      if (val === '__none__') {
                        // reset to empty - we handle via form reset
                        return
                      }
                    }}
                  >
                    <SelectTrigger id="lead-vertical" className="w-full">
                      <SelectValue placeholder="Select vertical" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
                      {verticals.map((v) => (
                        <SelectItem key={v} value={v}>
                          {v}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {/* Hidden input for react-hook-form */}
                  <input type="hidden" {...register('vertical')} />
                </div>

                {/* Source */}
                <div className="space-y-2">
                  <Label htmlFor="lead-source">Source</Label>
                  <Select
                    onValueChange={(val) => {
                      if (val === '__none__') {
                        return
                      }
                    }}
                  >
                    <SelectTrigger id="lead-source" className="w-full">
                      <SelectValue placeholder="Select source" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
                      {sources.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <input type="hidden" {...register('source')} />
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="lead-notes">Notes</Label>
                <Textarea
                  id="lead-notes"
                  placeholder="Any additional notes about this lead..."
                  rows={3}
                  {...register('notes')}
                />
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                <Button type="submit" disabled={isSubmitting} className="gap-2">
                  {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  {isSubmitting ? 'Creating...' : 'Create Lead'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    reset()
                    setIsFormOpen(false)
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </form>
        </CollapsibleContent>
      </Collapsible>

      {/* Search & Filter Bar */}
      <form
        onSubmit={handleSearch}
        className="flex flex-col sm:flex-row gap-3"
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search leads by name, email, or company..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Filter status" />
          </SelectTrigger>
          <SelectContent>
            {statuses.map((s) => (
              <SelectItem key={s} value={s}>
                {s === 'All' ? 'All Statuses' : s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button type="submit" variant="secondary" className="gap-2">
          <Search className="h-4 w-4" />
          <span className="sr-only sm:not-sr-only">Search</span>
        </Button>
      </form>

      {/* Leads Table */}
      <div className="rounded-lg border">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading leads...</span>
          </div>
        ) : leads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Users className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground">No leads yet</h3>
            <p className="text-sm text-muted-foreground/70 mt-1 max-w-sm">
              Click &quot;Add New Lead&quot; above to start tracking your sales leads.
            </p>
          </div>
        ) : (
          <div className="max-h-[480px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow className="sticky top-0 bg-card z-10">
                  <TableHead className="min-w-[140px]">Name</TableHead>
                  <TableHead className="min-w-[180px]">Email</TableHead>
                  <TableHead className="min-w-[120px]">Company</TableHead>
                  <TableHead className="min-w-[120px]">Vertical</TableHead>
                  <TableHead className="min-w-[100px]">Status</TableHead>
                  <TableHead className="min-w-[100px]">Source</TableHead>
                  <TableHead className="min-w-[100px]">Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leads.map((lead) => (
                  <TableRow key={lead.id} className="hover:bg-muted/50">
                    <TableCell className="font-medium">{lead.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {lead.email}
                    </TableCell>
                    <TableCell>
                      {lead.company || (
                        <span className="text-muted-foreground/50">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {lead.vertical || (
                        <span className="text-muted-foreground/50">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          'border-transparent',
                          statusColors[lead.status] || ''
                        )}
                      >
                        {lead.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {lead.source || (
                        <span className="text-muted-foreground/50">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {formatDate(lead.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  )
}
