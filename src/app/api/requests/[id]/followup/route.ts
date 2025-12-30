import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { requests, followups, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { generateFollowupEmail, Tone } from "@/lib/anthropic";
import { createDraft, sendEmail } from "@/lib/gmail";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;

    // Get request with ownership check
    const req = await db
      .select()
      .from(requests)
      .where(and(eq(requests.id, id), eq(requests.userId, session.user.id)))
      .limit(1);

    if (!req.length) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const request = req[0];

    if (request.status !== "active") {
      return NextResponse.json(
        { error: "Request is not active" },
        { status: 400 }
      );
    }

    // Get user settings
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);

    // Count existing followups
    const existingFollowups = await db
      .select()
      .from(followups)
      .where(eq(followups.requestId, id));

    const followupNumber = existingFollowups.length + 1;

    // Calculate days since initial request
    const initialDate = request.initialRequestAt || request.createdAt;
    const daysSinceInitial = initialDate
      ? Math.floor(
          (Date.now() - new Date(initialDate).getTime()) / (1000 * 60 * 60 * 24)
        )
      : 0;

    // Generate email content
    const emailBody = await generateFollowupEmail({
      recipientName: request.recipientName,
      amount: request.amount,
      context: request.context,
      tone: (request.tone as Tone) || "professional",
      followupNumber,
      daysSinceInitial,
      originalSubject: request.subject,
    });

    const subject = request.subject?.startsWith("Re:")
      ? request.subject
      : `Re: ${request.subject || "Follow-up"}`;

    let emailId: string | undefined;

    if (user[0]?.followupAction === "send") {
      // Auto-send
      const sent = await sendEmail(
        session.user.id,
        request.threadId!,
        request.recipientEmail,
        subject,
        emailBody
      );
      emailId = sent.id || undefined;
    } else {
      // Create draft
      const draft = await createDraft(
        session.user.id,
        request.threadId!,
        request.recipientEmail,
        subject,
        emailBody
      );
      emailId = draft.id || undefined;
    }

    // Record followup
    await db.insert(followups).values({
      requestId: id,
      emailId,
      followupNumber,
    });

    return NextResponse.json({
      success: true,
      mode: user[0]?.followupAction || "draft",
    });
  } catch (error) {
    console.error("Followup error:", error);
    return NextResponse.json(
      { error: "Failed to create followup" },
      { status: 500 }
    );
  }
}
