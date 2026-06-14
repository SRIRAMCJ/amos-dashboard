import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const platform = searchParams.get('platform') || '';

    const where: Record<string, unknown> = {};
    if (platform) {
      where.platform = platform;
    }

    const posts = await db.socialPost.findMany({
      where: Object.keys(where).length > 0 ? where : undefined,
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(posts);
  } catch (error) {
    console.error('Error fetching social posts:', error);
    return NextResponse.json({ error: 'Failed to fetch social posts' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { platform, content } = body;

    if (!platform || !content) {
      return NextResponse.json(
        { error: 'platform and content are required' },
        { status: 400 }
      );
    }

    const post = await db.socialPost.create({
      data: { platform, content },
    });

    await db.activityLog.create({
      data: {
        action: 'post_created',
        description: `Social post created for ${platform}`,
        metadata: JSON.stringify({ postId: post.id, platform }),
      },
    });

    return NextResponse.json(post, { status: 201 });
  } catch (error) {
    console.error('Error creating social post:', error);
    return NextResponse.json({ error: 'Failed to create social post' }, { status: 500 });
  }
}