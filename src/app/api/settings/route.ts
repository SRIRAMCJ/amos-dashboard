import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/settings — fetch integration settings (singleton)
export async function GET() {
  try {
    let settings = await db.integrationSettings.findFirst()

    // Auto-create default row if none exists
    if (!settings) {
      settings = await db.integrationSettings.create({
        data: { companyName: 'Madras MindWorks' },
      })
    }

    // Mask sensitive fields
    const masked = {
      ...settings,
      smtpPassword: settings.smtpPassword ? '••••••••' : null,
      linkedinToken: settings.linkedinToken ? '••••••••' : null,
      twitterApiKey: settings.twitterApiKey ? '••••••••' : null,
      twitterApiSecret: settings.twitterApiSecret ? '••••••••' : null,
      twitterAccessToken: settings.twitterAccessToken ? '••••••••' : null,
      twitterAccessTokenSecret: settings.twitterAccessTokenSecret ? '••••••••' : null,
      instagramToken: settings.instagramToken ? '••••••••' : null,
      facebookToken: settings.facebookToken ? '••••••••' : null,
    }

    return NextResponse.json({ success: true, settings: masked })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to fetch settings' },
      { status: 500 }
    )
  }
}

// PUT /api/settings — update integration settings
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const existing = await db.integrationSettings.findFirst()

    // Build update data, skipping masked values
    const updateData: Record<string, unknown> = {}
    const skipValues = ['••••••••', '', undefined, null]

    const fields = [
      'companyName', 'companyWebsite', 'companyTagline',
      'smtpHost', 'smtpPort', 'smtpEmail', 'smtpPassword', 'emailFromName',
      'linkedinToken', 'linkedinPageId', 'linkedinProfileUrl',
      'twitterApiKey', 'twitterApiSecret', 'twitterAccessToken', 'twitterAccessTokenSecret', 'twitterHandle',
      'instagramToken', 'instagramAccountId',
      'facebookToken', 'facebookPageId',
      'makeEmailWebhook', 'makeSocialWebhook', 'makeCrmWebhook',
    ] as const

    for (const field of fields) {
      if (field in body && !skipValues.includes(body[field])) {
        if (field === 'smtpPort') {
          updateData[field] = parseInt(body[field]) || null
        } else {
          updateData[field] = body[field]
        }
      }
    }

    let settings
    if (existing) {
      settings = await db.integrationSettings.update({
        where: { id: existing.id },
        data: updateData,
      })
    } else {
      settings = await db.integrationSettings.create({
        data: { ...updateData, companyName: (updateData.companyName as string) || 'Madras MindWorks' },
      })
    }

    return NextResponse.json({ success: true, settings })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to save settings' },
      { status: 500 }
    )
  }
}