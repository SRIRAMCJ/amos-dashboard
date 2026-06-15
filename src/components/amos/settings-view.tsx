'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  Building2,
  Mail,
  Linkedin,
  Globe,
  Webhook,
  Eye,
  EyeOff,
  Save,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Info,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

// ─── Types ───────────────────────────────────────────────────────────────────

interface SettingsData {
  id: string
  companyName: string
  companyWebsite: string | null
  companyTagline: string | null
  smtpHost: string | null
  smtpPort: number | null
  smtpEmail: string | null
  smtpPassword: string | null
  emailFromName: string | null
  linkedinToken: string | null
  linkedinPageId: string | null
  linkedinProfileUrl: string | null
  twitterApiKey: string | null
  twitterApiSecret: string | null
  twitterAccessToken: string | null
  twitterAccessTokenSecret: string | null
  twitterHandle: string | null
  makeEmailWebhook: string | null
  makeSocialWebhook: string | null
  makeCrmWebhook: string | null
}

const EMPTY_SETTINGS: SettingsData = {
  id: '',
  companyName: 'Madras MindWorks',
  companyWebsite: '',
  companyTagline: '',
  smtpHost: '',
  smtpPort: null,
  smtpEmail: '',
  smtpPassword: '',
  emailFromName: '',
  linkedinToken: '',
  linkedinPageId: '',
  linkedinProfileUrl: '',
  twitterApiKey: '',
  twitterApiSecret: '',
  twitterAccessToken: '',
  twitterAccessTokenSecret: '',
  twitterHandle: '',
  makeEmailWebhook: '',
  makeSocialWebhook: '',
  makeCrmWebhook: '',
}

// ─── Section Component ───────────────────────────────────────────────────────

function SettingsSection({
  icon: Icon,
  title,
  description,
  badge,
  badgeVariant,
  children,
  defaultOpen = true,
}: {
  icon: React.ElementType
  title: string
  description: string
  badge?: string
  badgeVariant?: 'default' | 'secondary' | 'destructive' | 'outline'
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <Card className="border-border/60">
      <button
        type="button"
        className="flex w-full items-center gap-3 p-4 md:p-6 text-left hover:bg-muted/30 transition-colors rounded-t-lg"
        onClick={() => setOpen(!open)}
      >
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
          <Icon className="size-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">{title}</CardTitle>
            {badge && <Badge variant={badgeVariant || 'outline'} className="text-xs">{badge}</Badge>}
          </div>
          <CardDescription className="mt-0.5">{description}</CardDescription>
        </div>
        {open ? <ChevronDown className="size-4 text-muted-foreground shrink-0" /> : <ChevronRight className="size-4 text-muted-foreground shrink-0" />}
      </button>
      {open && (
        <>
          <Separator />
          <CardContent className="p-4 md:p-6 pt-4 space-y-4">
            {children}
          </CardContent>
        </>
      )}
    </Card>
  )
}

// ─── Password Input ──────────────────────────────────────────────────────────

function PasswordInput({
  label,
  placeholder,
  value,
  onChange,
  hint,
}: {
  label: string
  placeholder: string
  value: string
  onChange: (val: string) => void
  hint?: string
}) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="space-y-1.5">
      <Label htmlFor={label} className="text-sm font-medium">{label}</Label>
      <div className="relative">
        <Input
          id={label}
          type={visible ? 'text' : 'password'}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="pr-10"
        />
        <button
          type="button"
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => setVisible(!visible)}
          tabIndex={-1}
        >
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
      {hint && <p className="text-xs text-muted-foreground flex items-start gap-1"><Info className="size-3 mt-0.5 shrink-0" />{hint}</p>}
    </div>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function SettingsView() {
  const [settings, setSettings] = useState<SettingsData>(EMPTY_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Fetch settings on mount
  useEffect(() => {
    async function fetchSettings() {
      try {
        const res = await fetch('/api/settings')
        const data = await res.json()
        if (data.success && data.settings) {
          setSettings({ ...EMPTY_SETTINGS, ...data.settings })
        }
      } catch {
        toast.error('Failed to load settings')
      } finally {
        setLoading(false)
      }
    }
    fetchSettings()
  }, [])

  const updateField = (field: keyof SettingsData, value: string | number | null) => {
    setSettings((prev) => ({ ...prev, [field]: value }))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })
      const data = await res.json()
      if (data.success) {
        toast.success('Settings saved successfully!')
      } else {
        toast.error(data.error || 'Failed to save settings')
      }
    } catch {
      toast.error('Network error. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const isFieldConfigured = (val: string | null | number | undefined) => !!val && val !== '' && val !== '••••••••'

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Settings & Integrations</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Connect your accounts and configure AMOS to act on your behalf.
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0">
          {saving ? (
            <span className="flex items-center gap-2">
              <span className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Saving...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Save className="size-4" />
              Save All Settings
            </span>
          )}
        </Button>
      </div>

      {/* Info Banner */}
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
        <Info className="size-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-sm text-amber-800 space-y-1">
          <p className="font-medium">How integrations work</p>
          <p>
            AMOS uses <strong>Make.com webhooks</strong> as the bridge between this dashboard and external services.
            Add your Make.com webhook URLs below, then create scenarios in Make.com to handle email sending, social posting, and CRM updates.
            API keys and tokens are stored locally and never shared.
          </p>
        </div>
      </div>

      {/* ── 1. Company Profile ──────────────────────────────────────────────── */}
      <SettingsSection
        icon={Building2}
        title="Company Profile"
        description="Your business details used in AI-generated content and email signatures."
        badge={isFieldConfigured(settings.companyWebsite) ? 'Configured' : 'Setup Required'}
        badgeVariant={isFieldConfigured(settings.companyWebsite) ? 'default' : 'outline'}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="companyName" className="text-sm font-medium">Company Name</Label>
            <Input
              id="companyName"
              placeholder="Madras MindWorks"
              value={settings.companyName}
              onChange={(e) => updateField('companyName', e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="companyWebsite" className="text-sm font-medium">Website</Label>
            <Input
              id="companyWebsite"
              placeholder="https://madrasmindworks.com"
              value={settings.companyWebsite || ''}
              onChange={(e) => updateField('companyWebsite', e.target.value)}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="companyTagline" className="text-sm font-medium">Tagline / One-liner</Label>
          <Input
            id="companyTagline"
            placeholder="Immersive AR/VR/AI Solutions for the Future"
            value={settings.companyTagline || ''}
            onChange={(e) => updateField('companyTagline', e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Used by AMOS when generating outreach emails and social posts.
          </p>
        </div>
      </SettingsSection>

      {/* ── 2. Email Configuration ─────────────────────────────────────────── */}
      <SettingsSection
        icon={Mail}
        title="Email Configuration (SMTP)"
        description="Configure your org email so AMOS can send outreach emails on your behalf."
        badge={isFieldConfigured(settings.smtpHost) ? 'Connected' : 'Not Connected'}
        badgeVariant={isFieldConfigured(settings.smtpHost) ? 'default' : 'outline'}
        defaultOpen={true}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="smtpHost" className="text-sm font-medium">SMTP Host</Label>
            <Input
              id="smtpHost"
              placeholder="smtp.gmail.com"
              value={settings.smtpHost || ''}
              onChange={(e) => updateField('smtpHost', e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="smtpPort" className="text-sm font-medium">SMTP Port</Label>
            <Input
              id="smtpPort"
              type="number"
              placeholder="587"
              value={settings.smtpPort?.toString() || ''}
              onChange={(e) => updateField('smtpPort', e.target.value ? parseInt(e.target.value) : null)}
            />
            <p className="text-xs text-muted-foreground">Common: 587 (TLS), 465 (SSL), 2525</p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="smtpEmail" className="text-sm font-medium">Email Address</Label>
            <Input
              id="smtpEmail"
              type="email"
              placeholder="outreach@madrasmindworks.com"
              value={settings.smtpEmail || ''}
              onChange={(e) => updateField('smtpEmail', e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="emailFromName" className="text-sm font-medium">Display Name</Label>
            <Input
              id="emailFromName"
              placeholder="Madras MindWorks"
              value={settings.emailFromName || ''}
              onChange={(e) => updateField('emailFromName', e.target.value)}
            />
          </div>
        </div>
        <PasswordInput
          label="SMTP Password / App Password"
          placeholder="Enter your email password or app-specific password"
          value={settings.smtpPassword || ''}
          onChange={(val) => updateField('smtpPassword', val)}
          hint="For Gmail, use an App Password from Google Account → Security → 2-Step Verification → App passwords."
        />
      </SettingsSection>

      {/* ── 3. LinkedIn ────────────────────────────────────────────────────── */}
      <SettingsSection
        icon={Linkedin}
        title="LinkedIn Integration"
        description="Connect your LinkedIn account or Company Page to auto-publish posts."
        badge={isFieldConfigured(settings.linkedinToken) ? 'Connected' : 'Not Connected'}
        badgeVariant={isFieldConfigured(settings.linkedinToken) ? 'default' : 'outline'}
        defaultOpen={false}
      >
        <div className="space-y-1.5">
          <Label htmlFor="linkedinProfileUrl" className="text-sm font-medium">LinkedIn Profile / Page URL</Label>
          <Input
            id="linkedinProfileUrl"
            placeholder="https://www.linkedin.com/company/madrasmindworks"
            value={settings.linkedinProfileUrl || ''}
            onChange={(e) => updateField('linkedinProfileUrl', e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="linkedinPageId" className="text-sm font-medium">LinkedIn Page ID (optional)</Label>
          <Input
            id="linkedinPageId"
            placeholder="e.g. 1234567890"
            value={settings.linkedinPageId || ''}
            onChange={(e) => updateField('linkedinPageId', e.target.value)}
          />
        </div>
        <PasswordInput
          label="LinkedIn Access Token"
          placeholder="Paste your LinkedIn OAuth 2.0 access token"
          value={settings.linkedinToken || ''}
          onChange={(val) => updateField('linkedinToken', val)}
          hint="Generate this from LinkedIn Developer App → Auth tab. Requires 'r_liteprofile', 'r_emailaddress', 'w_member_social' scopes. Use Make.com LinkedIn module for easier setup."
        />
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800 space-y-1">
          <p className="font-medium">Easier setup via Make.com:</p>
          <p>1. Create a LinkedIn module in <a href="https://www.make.com" target="_blank" rel="noopener noreferrer" className="underline font-medium">Make.com</a> and authenticate.</p>
          <p>2. Copy the Make.com webhook URL into the &quot;Webhooks&quot; section below.</p>
          <p>3. AMOS will send post content to the webhook → Make.com publishes to LinkedIn.</p>
        </div>
      </SettingsSection>

      {/* ── 4. Twitter / X ─────────────────────────────────────────────────── */}
      <SettingsSection
        icon={Globe}
        title="Twitter / X Integration"
        description="Connect your X (Twitter) account to auto-publish tweets."
        badge={isFieldConfigured(settings.twitterApiKey) ? 'Connected' : 'Not Connected'}
        badgeVariant={isFieldConfigured(settings.twitterApiKey) ? 'default' : 'outline'}
        defaultOpen={false}
      >
        <div className="space-y-1.5">
          <Label htmlFor="twitterHandle" className="text-sm font-medium">X Handle</Label>
          <Input
            id="twitterHandle"
            placeholder="@madrasmindworks"
            value={settings.twitterHandle || ''}
            onChange={(e) => updateField('twitterHandle', e.target.value)}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <PasswordInput
            label="API Key"
            placeholder="Your X API Key"
            value={settings.twitterApiKey || ''}
            onChange={(val) => updateField('twitterApiKey', val)}
          />
          <PasswordInput
            label="API Secret"
            placeholder="Your X API Secret"
            value={settings.twitterApiSecret || ''}
            onChange={(val) => updateField('twitterApiSecret', val)}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <PasswordInput
            label="Access Token"
            placeholder="Your X Access Token"
            value={settings.twitterAccessToken || ''}
            onChange={(val) => updateField('twitterAccessToken', val)}
          />
          <PasswordInput
            label="Access Token Secret"
            placeholder="Your X Access Token Secret"
            value={settings.twitterAccessTokenSecret || ''}
            onChange={(val) => updateField('twitterAccessTokenSecret', val)}
          />
        </div>
        <div className="rounded-lg border border-sky-200 bg-sky-50 p-3 text-xs text-sky-800 space-y-1">
          <p className="font-medium">How to get X API credentials:</p>
          <p>1. Go to <a href="https://developer.x.com" target="_blank" rel="noopener noreferrer" className="underline font-medium">developer.x.com</a> → Create a Project & App.</p>
          <p>2. Enable OAuth 2.0 with read and write permissions.</p>
          <p>3. Generate keys and tokens from the Keys and Tokens tab.</p>
        </div>
      </SettingsSection>

      {/* ── 5. Make.com Webhooks ───────────────────────────────────────────── */}
      <SettingsSection
        icon={Webhook}
        title="Make.com Webhooks"
        description="Webhook URLs that AMOS calls to execute actions. This is the bridge between AMOS and external services."
        badge={isFieldConfigured(settings.makeEmailWebhook) || isFieldConfigured(settings.makeSocialWebhook) ? 'Active' : 'Not Configured'}
        badgeVariant={isFieldConfigured(settings.makeEmailWebhook) || isFieldConfigured(settings.makeSocialWebhook) ? 'default' : 'outline'}
        defaultOpen={false}
      >
        <div className="space-y-1.5">
          <Label htmlFor="makeEmailWebhook" className="text-sm font-medium">Email Webhook URL</Label>
          <Input
            id="makeEmailWebhook"
            placeholder="https://hook.make.com/your-unique-email-webhook-id"
            value={settings.makeEmailWebhook || ''}
            onChange={(e) => updateField('makeEmailWebhook', e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            AMOS sends <code className="bg-muted px-1 py-0.5 rounded text-xs">{"{ toName, toEmail, subject, body }"}</code> to this webhook when you send an outreach email.
          </p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="makeSocialWebhook" className="text-sm font-medium">Social Media Webhook URL</Label>
          <Input
            id="makeSocialWebhook"
            placeholder="https://hook.make.com/your-unique-social-webhook-id"
            value={settings.makeSocialWebhook || ''}
            onChange={(e) => updateField('makeSocialWebhook', e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            AMOS sends <code className="bg-muted px-1 py-0.5 rounded text-xs">{"{ platform, content }"}</code> to this webhook when you publish a social post.
          </p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="makeCrmWebhook" className="text-sm font-medium">CRM Webhook URL (Airtable / Google Sheets)</Label>
          <Input
            id="makeCrmWebhook"
            placeholder="https://hook.make.com/your-unique-crm-webhook-id"
            value={settings.makeCrmWebhook || ''}
            onChange={(e) => updateField('makeCrmWebhook', e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            AMOS sends <code className="bg-muted px-1 py-0.5 rounded text-xs">{"{ name, email, company, vertical, source }"}</code> to this webhook when you save a lead.
          </p>
        </div>

        <Separator />

        {/* Setup guide */}
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 space-y-3">
          <p className="font-medium text-sm text-emerald-900 flex items-center gap-2">
            <CheckCircle2 className="size-4" />
            Quick Setup Guide
          </p>
          <ol className="text-xs text-emerald-800 space-y-2 list-decimal list-inside">
            <li>
              Go to <a href="https://www.make.com" target="_blank" rel="noopener noreferrer" className="underline font-medium inline-flex items-center gap-1">make.com <ExternalLink className="size-3" /></a> and create a new Scenario.
            </li>
            <li>Add a <strong>Webhook</strong> trigger module → Copy the generated webhook URL.</li>
            <li>Connect the next module (e.g., Gmail for email, LinkedIn for posts, Airtable for CRM).</li>
            <li>Map the incoming JSON fields from AMOS to the target module fields.</li>
            <li>Activate the scenario and paste the webhook URL in the corresponding field above.</li>
          </ol>
        </div>
      </SettingsSection>

      {/* Bottom Save Button */}
      <div className="flex justify-end pt-2 pb-4">
        <Button onClick={handleSave} disabled={saving} size="lg" className="bg-emerald-600 hover:bg-emerald-700 text-white">
          {saving ? (
            <span className="flex items-center gap-2">
              <span className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Saving...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Save className="size-4" />
              Save All Settings
            </span>
          )}
        </Button>
      </div>
    </div>
  )
}