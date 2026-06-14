import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || '';

    const where: Record<string, unknown> = {};
    if (status) {
      where.status = status;
    }

    const blogs = await db.blogPost.findMany({
      where: Object.keys(where).length > 0 ? where : undefined,
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(blogs);
  } catch (error) {
    console.error('Error fetching blog posts:', error);
    return NextResponse.json({ error: 'Failed to fetch blog posts' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, content, seoKeywords, vertical } = body;

    if (!title || !content) {
      return NextResponse.json(
        { error: 'title and content are required' },
        { status: 400 }
      );
    }

    const blog = await db.blogPost.create({
      data: {
        title,
        content,
        seoKeywords: seoKeywords || null,
        vertical: vertical || null,
      },
    });

    await db.activityLog.create({
      data: {
        action: 'blog_created',
        description: `Blog post created: "${title}"`,
        metadata: JSON.stringify({ blogId: blog.id, vertical, seoKeywords }),
      },
    });

    return NextResponse.json(blog, { status: 201 });
  } catch (error) {
    console.error('Error creating blog post:', error);
    return NextResponse.json({ error: 'Failed to create blog post' }, { status: 500 });
  }
}