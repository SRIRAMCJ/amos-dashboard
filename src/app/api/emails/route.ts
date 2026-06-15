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

    const emails = await db.outreachEmail.findMany({
      where: Object.keys(where).length > 0 ? where : undefined,
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(emails);
  } catch (error) {
    console.error('Error fetching emails:', error);
    return NextResponse.json({ error: 'Failed to fetch emails' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { toName, toEmail, subject, body: emailBody, leadId } = body;

    if (!toName || !toEmail || !subject || !emailBody) {
      return NextResponse.json(
        { error: 'toName, toEmail, subject, and body are required' },
        { status: 400 }
      );
    }

    const email = await db.outreachEmail.create({
      data: {
        toName,
        toEmail,
        subject,
        body: emailBody,
        leadId: leadId || null,
      },
    });

    await db.activityLog.create({
      data: {
        action: 'email_created',
        description: `Email draft created: "${subject}" to ${toName} (${toEmail})`,
        metadata: JSON.stringify({ emailId: email.id, leadId, toEmail }),
      },
    });

    return NextResponse.json(email, { status: 201 });
  } catch (error) {
    console.error('Error creating email:', error);
    return NextResponse.json({ error: 'Failed to create email' }, { status: 500 });
  }
}