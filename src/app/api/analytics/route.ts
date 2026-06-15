import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import crypto from 'crypto'

// ─── Types ────────────────────────────────────────────────────────────────────

interface PlatformResult {
  platform: string
  connected: boolean
  profileName: string
  profileHandle: string
  profileAvatar?: string
  profileUrl?: string
  followers: number
  following?: number
  totalPosts: number
  engagement: { likes: number; comments: number; shares: number; impressions: number }
  recentPosts: {
    id: string
    text: string
    createdAt: string
    metrics: { likes: number; comments: number; shares: number; impressions: number }
  }[]
  error?: string
}

// ─── OAuth 1.0a Helper for Twitter/X ─────────────────────────────────────────

function percentEncode(str: string): string {
  return encodeURIComponent(str).replace(/!/g, '%21').replace(/'/g, '%27').replace(/\(/g, '%28').replace(/\)/g, '%29').replace(/\*/g, '%2A').replace(/~/g, '%7E')
}

function generateOAuthSignature(
  method: string,
  url: string,
  params: Record<string, string>,
  consumerSecret: string,
  tokenSecret: string
): string {
  const sortedKeys = Object.keys(params).sort()
  const paramString = sortedKeys.map((k) => `${percentEncode(k)}=${percentEncode(params[k])}`).join('&')
  const baseString = `${method.toUpperCase()}&${percentEncode(url)}&${percentEncode(paramString)}`
  const signingKey = `${percentEncode(consumerSecret)}&${percentEncode(tokenSecret)}`
  return crypto.createHmac('sha256', signingKey).update(baseString).digest('base64')
}

async function twitterApiRequest(
  endpoint: string,
  method: string,
  apiKey: string,
  apiSecret: string,
  accessToken: string,
  accessTokenSecret: string,
  queryParams: Record<string, string> = {}
): Promise<{ data: unknown; status: number }> {
  const baseUrl = 'https://api.x.com/2'
  const fullUrl = `${baseUrl}${endpoint}`
  const urlObj = new URL(fullUrl)
  Object.entries(queryParams).forEach(([k, v]) => urlObj.searchParams.set(k, v))

  const oauthParams: Record<string, string> = {
    oauth_consumer_key: apiKey,
    oauth_nonce: crypto.randomBytes(16).toString('hex'),
    oauth_signature_method: 'HMAC-SHA256',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: accessToken,
    oauth_version: '1.0',
  }

  // Merge query params into signature params
  const allParams = { ...oauthParams, ...queryParams }

  const signature = generateOAuthSignature(
    method,
    `${baseUrl}${endpoint}${Object.keys(queryParams).length > 0 ? '?' + new URLSearchParams(queryParams).toString() : ''}`,
    allParams,
    apiSecret,
    accessTokenSecret
  )

  oauthParams['oauth_signature'] = signature

  const authHeader = `OAuth ${Object.entries(oauthParams)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${percentEncode(k)}="${percentEncode(v)}"`)
    .join(', ')}`

  const fetchOptions: RequestInit = {
    method,
    headers: {
      Authorization: authHeader,
      'Content-Type': 'application/json',
    },
  }

  const res = await fetch(urlObj.toString(), fetchOptions)
  let data: unknown
  const text = await res.text()
  try {
    data = JSON.parse(text)
  } catch {
    data = text
  }

  return { data, status: res.status }
}

// ─── Twitter/X Analytics Fetcher ──────────────────────────────────────────────

async function fetchTwitterAnalytics(
  apiKey: string,
  apiSecret: string,
  accessToken: string,
  accessTokenSecret: string,
  handle?: string | null
): Promise<PlatformResult> {
  const emptyResult: PlatformResult = {
    platform: 'twitter',
    connected: true,
    profileName: '',
    profileHandle: handle || '',
    followers: 0,
    totalPosts: 0,
    engagement: { likes: 0, comments: 0, shares: 0, impressions: 0 },
    recentPosts: [],
  }

  try {
    // 1. Get authenticated user info
    const meRes = await twitterApiRequest(
      '/users/me',
      'GET',
      apiKey,
      apiSecret,
      accessToken,
      accessTokenSecret,
      { 'user.fields': 'public_metrics,profile_image_url,description,name,username' }
    )

    if (meRes.status !== 200) {
      const errData = meRes.data as { title?: string; detail?: string }
      return {
        ...emptyResult,
        connected: true,
        error: errData?.title || errData?.detail || `Twitter API error (${meRes.status})`,
      }
    }

    const meData = meRes.data as {
      data: {
        id: string
        name: string
        username: string
        profile_image_url?: string
        public_metrics: {
          followers_count: number
          following_count: number
          tweet_count: number
          listed_count: number
        }
      }
    }

    const user = meData.data
    const metrics = user.public_metrics

    // 2. Get recent tweets with metrics
    const tweetsRes = await twitterApiRequest(
      `/users/${user.id}/tweets`,
      'GET',
      apiKey,
      apiSecret,
      accessToken,
      accessTokenSecret,
      {
        'tweet.fields': 'public_metrics,created_at',
        max_results: '10',
      }
    )

    let recentPosts: PlatformResult['recentPosts'] = []
    if (tweetsRes.status === 200) {
      const tweetsData = tweetsRes.data as {
        data?: Array<{
          id: string
          text: string
          created_at: string
          public_metrics: {
            like_count: number
            reply_count: number
            retweet_count: number
            impression_count: number
            bookmark_count: number
          }
        }>
      }

      if (tweetsData.data) {
        recentPosts = tweetsData.data.map((t) => ({
          id: t.id,
          text: t.text,
          createdAt: t.created_at,
          metrics: {
            likes: t.public_metrics.like_count,
            comments: t.public_metrics.reply_count,
            shares: t.public_metrics.retweet_count,
            impressions: t.public_metrics.impression_count,
          },
        }))
      }
    }

    const totalLikes = recentPosts.reduce((s, p) => s + p.metrics.likes, 0)
    const totalComments = recentPosts.reduce((s, p) => s + p.metrics.comments, 0)
    const totalShares = recentPosts.reduce((s, p) => s + p.metrics.shares, 0)
    const totalImpressions = recentPosts.reduce((s, p) => s + p.metrics.impressions, 0)

    return {
      platform: 'twitter',
      connected: true,
      profileName: user.name,
      profileHandle: `@${user.username}`,
      profileAvatar: user.profile_image_url,
      profileUrl: `https://x.com/${user.username}`,
      followers: metrics.followers_count,
      following: metrics.following_count,
      totalPosts: metrics.tweet_count,
      engagement: { likes: totalLikes, comments: totalComments, shares: totalShares, impressions: totalImpressions },
      recentPosts,
    }
  } catch (err) {
    return {
      ...emptyResult,
      error: err instanceof Error ? err.message : 'Failed to fetch Twitter analytics',
    }
  }
}

// ─── LinkedIn Analytics Fetcher ───────────────────────────────────────────────

async function fetchLinkedInAnalytics(
  token: string,
  pageId?: string | null,
  profileUrl?: string | null
): Promise<PlatformResult> {
  const emptyResult: PlatformResult = {
    platform: 'linkedin',
    connected: true,
    profileName: '',
    profileHandle: profileUrl || '',
    followers: 0,
    totalPosts: 0,
    engagement: { likes: 0, comments: 0, shares: 0, impressions: 0 },
    recentPosts: [],
  }

  try {
    const headers = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'LinkedIn-Version': '202401',
    }

    // 1. Get user profile
    const profileRes = await fetch('https://api.linkedin.com/v2/userinfo', { headers })
    let profileName = 'LinkedIn User'
    let profileHandle = ''

    if (profileRes.ok) {
      const profileData = (await profileRes.json()) as {
        name?: string
        given_name?: string
        family_name?: string
        sub?: string
      }
      profileName = profileData.name || `${profileData.given_name || ''} ${profileData.family_name || ''}`.trim() || 'LinkedIn User'
      profileHandle = profileData.sub || ''
    }

    // 2. Fetch organization page statistics
    let followers = 0
    let recentPosts: PlatformResult['recentPosts'] = []
    let orgUrn = ''
    if (pageId) {
      orgUrn = pageId.startsWith('urn:li:organization:') ? pageId : `urn:li:organization:${pageId}`
    }

    if (orgUrn) {
      try {
        const followerRes = await fetch(
          `https://api.linkedin.com/rest/organizationalEntityFollowerStatistics?q=organizationalEntity&organizationalEntity=${encodeURIComponent(orgUrn)}&timeIntervals=(P1M)`,
          { headers }
        )
        if (followerRes.ok) {
          const followerData = (await followerRes.json()) as {
            elements?: Array<{
              organicFollowerValues?: Array<{ value: number }>
              paidFollowerValues?: Array<{ value: number }>
            }>
          }
          if (followerData.elements?.[0]) {
            const organic = followerData.elements[0].organicFollowerValues?.[0]?.value || 0
            const paid = followerData.elements[0].paidFollowerValues?.[0]?.value || 0
            followers = organic + paid
          }
        }
      } catch { /* follower stats may not be available */ }

      try {
        const shareRes = await fetch(
          `https://api.linkedin.com/rest/organizationalEntityShareStatistics?q=organizationalEntity&organizationalEntity=${encodeURIComponent(orgUrn)}&timeIntervals=(P1M)`,
          { headers }
        )
        if (shareRes.ok) {
          const shareData = (await shareRes.json()) as {
            elements?: Array<{
              shareCount?: number
              likeCount?: number
              commentCount?: number
              impressionCount?: number
            }>
          }
          if (shareData.elements?.[0]) {
            const el = shareData.elements[0]
            recentPosts = [
              {
                id: 'linkedin-summary',
                text: 'Aggregated LinkedIn Page Stats (last 30 days)',
                createdAt: new Date().toISOString(),
                metrics: {
                  likes: el.likeCount || 0,
                  comments: el.commentCount || 0,
                  shares: el.shareCount || 0,
                  impressions: el.impressionCount || 0,
                },
              },
            ]
          }
        }
      } catch { /* share stats may not be available */ }
    }

    return {
      platform: 'linkedin',
      connected: true,
      profileName,
      profileHandle,
      profileUrl: profileUrl || undefined,
      followers,
      totalPosts: recentPosts.length > 0 ? -1 : 0,
      engagement: {
        likes: recentPosts.reduce((s, p) => s + p.metrics.likes, 0),
        comments: recentPosts.reduce((s, p) => s + p.metrics.comments, 0),
        shares: recentPosts.reduce((s, p) => s + p.metrics.shares, 0),
        impressions: recentPosts.reduce((s, p) => s + p.metrics.impressions, 0),
      },
      recentPosts,
    }
  } catch (err) {
    return {
      ...emptyResult,
      error: err instanceof Error ? err.message : 'Failed to fetch LinkedIn analytics',
    }
  }
}

// ─── Instagram Analytics Fetcher (Graph API) ──────────────────────────────────

async function fetchInstagramAnalytics(
  token: string,
  accountId?: string | null
): Promise<PlatformResult> {
  const emptyResult: PlatformResult = {
    platform: 'instagram',
    connected: true,
    profileName: '',
    profileHandle: '',
    followers: 0,
    totalPosts: 0,
    engagement: { likes: 0, comments: 0, shares: 0, impressions: 0 },
    recentPosts: [],
  }

  try {
    let resolvedAccountId = accountId

    if (!resolvedAccountId) {
      const meRes = await fetch(
        `https://graph.facebook.com/v19.0/me/accounts?fields=id,name,access_token&access_token=${token}`
      )
      if (!meRes.ok) return { ...emptyResult, error: `Instagram/Facebook API error: ${meRes.status}` }
      const meData = (await meRes.json()) as {
        data?: Array<{ id: string; name: string; access_token: string }>
      }
      for (const acct of meData.data || []) {
        const igRes = await fetch(
          `https://graph.facebook.com/v19.0/${acct.id}?fields=instagram_business_account&access_token=${acct.access_token}`
        )
        if (igRes.ok) {
          const igData = (await igRes.json()) as { instagram_business_account?: { id: string } }
          if (igData.instagram_business_account) {
            resolvedAccountId = igData.instagram_business_account.id
            break
          }
        }
      }
    }

    if (!resolvedAccountId) {
      return { ...emptyResult, error: 'No Instagram Business Account found. Connect your Facebook Page to an Instagram Business/Creator account.' }
    }

    const fields = 'id,name,username,followers_count,follows_count,media_count,profile_picture_url'
    const userRes = await fetch(
      `https://graph.facebook.com/v19.0/${resolvedAccountId}?fields=${fields}&access_token=${token}`
    )
    if (!userRes.ok) return { ...emptyResult, error: `Instagram API error: ${userRes.status}` }

    const userData = (await userRes.json()) as {
      name: string
      username: string
      followers_count: number
      follows_count: number
      media_count: number
      profile_picture_url?: string
    }

    const mediaRes = await fetch(
      `https://graph.facebook.com/v19.0/${resolvedAccountId}/media?fields=id,caption,timestamp,like_count,comments_count,impressions,shares&limit=10&access_token=${token}`
    )

    let recentPosts: PlatformResult['recentPosts'] = []
    if (mediaRes.ok) {
      const mediaData = (await mediaRes.json()) as {
        data?: Array<{
          id: string
          caption?: string
          timestamp: string
          like_count: number
          comments_count: number
          impressions?: number
          shares?: number
        }>
      }
      if (mediaData.data) {
        recentPosts = mediaData.data.map((m) => ({
          id: m.id,
          text: m.caption || '(No caption)',
          createdAt: m.timestamp,
          metrics: {
            likes: m.like_count || 0,
            comments: m.comments_count || 0,
            shares: m.shares || 0,
            impressions: m.impressions || 0,
          },
        }))
      }
    }

    return {
      platform: 'instagram',
      connected: true,
      profileName: userData.name,
      profileHandle: `@${userData.username}`,
      profileAvatar: userData.profile_picture_url,
      profileUrl: `https://instagram.com/${userData.username}`,
      followers: userData.followers_count,
      following: userData.follows_count,
      totalPosts: userData.media_count,
      engagement: {
        likes: recentPosts.reduce((s, p) => s + p.metrics.likes, 0),
        comments: recentPosts.reduce((s, p) => s + p.metrics.comments, 0),
        shares: recentPosts.reduce((s, p) => s + p.metrics.shares, 0),
        impressions: recentPosts.reduce((s, p) => s + p.metrics.impressions, 0),
      },
      recentPosts,
    }
  } catch (err) {
    return { ...emptyResult, error: err instanceof Error ? err.message : 'Failed to fetch Instagram analytics' }
  }
}

// ─── Facebook Analytics Fetcher (Graph API) ───────────────────────────────────

async function fetchFacebookAnalytics(
  token: string,
  pageId?: string | null
): Promise<PlatformResult> {
  const emptyResult: PlatformResult = {
    platform: 'facebook',
    connected: true,
    profileName: '',
    profileHandle: '',
    followers: 0,
    totalPosts: 0,
    engagement: { likes: 0, comments: 0, shares: 0, impressions: 0 },
    recentPosts: [],
  }

  try {
    const pagesRes = await fetch(
      `https://graph.facebook.com/v19.0/me/accounts?fields=id,name,fan_count,followers_count,access_token&access_token=${token}`
    )
    if (!pagesRes.ok) return { ...emptyResult, error: `Facebook API error: ${pagesRes.status}` }

    const pagesData = (await pagesRes.json()) as {
      data?: Array<{ id: string; name: string; fan_count?: number; followers_count?: number; access_token: string }>
    }

    const page = pageId
      ? pagesData.data?.find((p) => p.id === pageId) || pagesData.data?.[0]
      : pagesData.data?.[0]

    if (!page) return { ...emptyResult, error: 'No Facebook Page found.' }

    const postsRes = await fetch(
      `https://graph.facebook.com/v19.0/${page.id}/posts?fields=id,message,created_time,likes.limit(0).summary(true),comments.limit(0).summary(true),shares&limit=10&access_token=${page.access_token}`
    )

    let recentPosts: PlatformResult['recentPosts'] = []
    if (postsRes.ok) {
      const postsData = (await postsRes.json()) as {
        data?: Array<{
          id: string
          message?: string
          created_time: string
          likes?: { summary?: { total_count: number } }
          comments?: { summary?: { total_count: number } }
          shares?: { count: number }
        }>
      }
      if (postsData.data) {
        recentPosts = postsData.data.map((p) => ({
          id: p.id,
          text: p.message || '(No text)',
          createdAt: p.created_time,
          metrics: {
            likes: p.likes?.summary?.total_count || 0,
            comments: p.comments?.summary?.total_count || 0,
            shares: p.shares?.count || 0,
            impressions: 0,
          },
        }))
      }
    }

    return {
      platform: 'facebook',
      connected: true,
      profileName: page.name,
      profileHandle: page.name,
      profileUrl: `https://facebook.com/${page.id}`,
      followers: page.followers_count || page.fan_count || 0,
      totalPosts: recentPosts.length,
      engagement: {
        likes: recentPosts.reduce((s, p) => s + p.metrics.likes, 0),
        comments: recentPosts.reduce((s, p) => s + p.metrics.comments, 0),
        shares: recentPosts.reduce((s, p) => s + p.metrics.shares, 0),
        impressions: recentPosts.reduce((s, p) => s + p.metrics.likes + p.metrics.comments, 0),
      },
      recentPosts,
    }
  } catch (err) {
    return { ...emptyResult, error: err instanceof Error ? err.message : 'Failed to fetch Facebook analytics' }
  }
}

// ─── Main Route Handler ───────────────────────────────────────────────────────

// POST /api/analytics — fetch analytics from all connected platforms
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { platform } = body // optional: 'twitter' | 'linkedin' | 'instagram' | 'facebook' | undefined (all)

    const settings = await db.integrationSettings.findFirst()
    if (!settings) {
      return NextResponse.json({
        success: true,
        data: { twitter: null, linkedin: null, instagram: null, facebook: null, lastFetched: new Date().toISOString() },
      })
    }

    const results: Record<string, PlatformResult | null> = {
      twitter: null,
      linkedin: null,
      instagram: null,
      facebook: null,
    }

    const fetchPromises: Promise<void>[] = []

    // Twitter/X
    if ((!platform || platform === 'twitter') && settings.twitterApiKey && settings.twitterApiSecret && settings.twitterAccessToken && settings.twitterAccessTokenSecret) {
      fetchPromises.push(
        fetchTwitterAnalytics(
          settings.twitterApiKey,
          settings.twitterApiSecret,
          settings.twitterAccessToken,
          settings.twitterAccessTokenSecret,
          settings.twitterHandle
        ).then((r) => {
          results.twitter = r
          return db.socialAnalytics.create({
            data: {
              platform: 'twitter',
              dataType: 'full',
              rawData: JSON.stringify(r),
              summary: JSON.stringify({ followers: r.followers, totalPosts: r.totalPosts, engagement: r.engagement }),
            },
          })
        })
      )
    }

    // LinkedIn
    if ((!platform || platform === 'linkedin') && settings.linkedinToken) {
      fetchPromises.push(
        fetchLinkedInAnalytics(settings.linkedinToken, settings.linkedinPageId, settings.linkedinProfileUrl)
          .then((r) => {
            results.linkedin = r
            return db.socialAnalytics.create({
              data: {
                platform: 'linkedin',
                dataType: 'full',
                rawData: JSON.stringify(r),
                summary: JSON.stringify({ followers: r.followers, engagement: r.engagement }),
              },
            })
          })
      )
    }

    // Instagram
    if ((!platform || platform === 'instagram') && settings.instagramToken) {
      fetchPromises.push(
        fetchInstagramAnalytics(settings.instagramToken, settings.instagramAccountId)
          .then((r) => {
            results.instagram = r
            return db.socialAnalytics.create({
              data: {
                platform: 'instagram',
                dataType: 'full',
                rawData: JSON.stringify(r),
                summary: JSON.stringify({ followers: r.followers, totalPosts: r.totalPosts, engagement: r.engagement }),
              },
            })
          })
      )
    }

    // Facebook
    if ((!platform || platform === 'facebook') && settings.facebookToken) {
      fetchPromises.push(
        fetchFacebookAnalytics(settings.facebookToken, settings.facebookPageId)
          .then((r) => {
            results.facebook = r
            return db.socialAnalytics.create({
              data: {
                platform: 'facebook',
                dataType: 'full',
                rawData: JSON.stringify(r),
                summary: JSON.stringify({ followers: r.followers, totalPosts: r.totalPosts, engagement: r.engagement }),
              },
            })
          })
      )
    }

    await Promise.allSettled(fetchPromises)

    // Log activity
    const fetchedPlatforms = Object.entries(results).filter(([, v]) => v !== null).map(([k]) => k)
    if (fetchedPlatforms.length > 0) {
      await db.activityLog.create({
        action: 'analytics_fetched',
        description: `Fetched analytics from ${fetchedPlatforms.join(', ')}`,
        metadata: JSON.stringify({ platforms: fetchedPlatforms }),
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        ...results,
        lastFetched: new Date().toISOString(),
      },
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to fetch analytics' },
      { status: 500 }
    )
  }
}

// GET /api/analytics — get cached analytics from DB
export async function GET() {
  try {
    const allAnalytics = await db.socialAnalytics.findMany({
      orderBy: { fetchedAt: 'desc' },
      take: 20,
    })

    const grouped: Record<string, (typeof allAnalytics)[0]> = {}
    for (const entry of allAnalytics) {
      if (!grouped[entry.platform]) grouped[entry.platform] = entry
    }

    const results: Record<string, PlatformResult | null> = {
      twitter: null,
      linkedin: null,
      instagram: null,
      facebook: null,
    }

    for (const [platform, entry] of Object.entries(grouped)) {
      try {
        results[platform] = JSON.parse(entry.rawData) as PlatformResult
      } catch { /* skip malformed */ }
    }

    const settings = await db.integrationSettings.findFirst()
    const connectionStatus = {
      twitter: !!(settings?.twitterApiKey && settings?.twitterAccessToken),
      linkedin: !!settings?.linkedinToken,
      instagram: !!settings?.instagramToken,
      facebook: !!settings?.facebookToken,
    }

    return NextResponse.json({
      success: true,
      data: results,
      connectionStatus,
      lastFetched: grouped[Object.keys(grouped)[0]]?.fetchedAt?.toISOString() || null,
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to load analytics' },
      { status: 500 }
    )
  }
}