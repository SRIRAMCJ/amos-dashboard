import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const [
      totalLeads,
      newLeads,
      totalEmails,
      sentEmails,
      totalPosts,
      publishedPosts,
      totalBlogs,
      totalActivities,
    ] = await Promise.all([
      db.lead.count(),
      db.lead.count({ where: { status: 'New' } }),
      db.outreachEmail.count(),
      db.outreachEmail.count({ where: { status: 'Sent' } }),
      db.socialPost.count(),
      db.socialPost.count({ where: { status: 'Published' } }),
      db.blogPost.count(),
      db.activityLog.count(),
    ]);

    return NextResponse.json({
      totalLeads,
      newLeads,
      totalEmails,
      sentEmails,
      totalPosts,
      publishedPosts,
      totalBlogs,
      totalActivities,
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: 'Failed to fetch stats', details: msg }, { status: 500 });
  }
}