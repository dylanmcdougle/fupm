import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requests, followups, users } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { generateFollowupEmail, Tone } from "@/lib/anthropic";
import { createDraft, sendEmail } from "@/lib/gmail";

// Verify cron secret to prevent unauthorized access
const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: Request) {
  // Verify authorization
  const authHeader = request.headers.get("authorization");
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get all active requests
    const activeRequests = await db
      .select()
      .from(requests)
      .where(eq(requests.status, "active"));

    const results = {
      processed: 0,
      skipped: 0,
      errors: 0,
    };

    for (const request of activeRequests) {
      try {
        // Get latest followup for this request
        const latestFollowup = await db
          .select()
          .from(followups)
          .where(eq(followups.requestId, request.id))
          .orderBy(desc(followups.sentAt))
          .limit(1);

        // Determine if followup is due
        const lastDate = latestFollowup[0]?.sentAt || request.createdAt;
        if (!lastDate) {
          results.skipped++;
          continue;
        }

        const daysSinceLast = Math.floor(
          (Date.now() - new Date(lastDate).getTime()) / (1000 * 60 * 60 * 24)
        );

        const interval = request.followupInterval || 7;

        if (daysSinceLast < interval) {
          results.skipped++;
          continue;
        }

        // Get user settings
        const user = await db
          .select()
          .from(users)
          .where(eq(users.id, request.userId!))
          .limit(1);

        if (!user.length || !user[0].gmailAccessToken) {
          results.errors++;
          continue;
        }

        // Count existing followups
        const existingFollowups = await db
          .select()
          .from(followups)
          .where(eq(followups.requestId, request.id));

        const followupNumber = existingFollowups.length + 1;

        // Calculate days since initial request
        const initialDate = request.initialRequestAt || request.createdAt;
        const daysSinceInitial = initialDate
          ? Math.floor(
              (Date.now() - new Date(initialDate).getTime()) /
                (1000 * 60 * 60 * 24)
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

        if (user[0].followupAction === "send") {
          // Auto-send
          const sent = await sendEmail(
            user[0].id,
            request.threadId!,
            request.recipientEmail,
            subject,
            emailBody
          );
          emailId = sent.id || undefined;
        } else {
          // Create draft
          const draft = await createDraft(
            user[0].id,
            request.threadId!,
            request.recipientEmail,
            subject,
            emailBody
          );
          emailId = draft.id || undefined;
        }

        // Record followup
        const mode = user[0].followupAction === "send" ? "sent" : "draft";
        await db.insert(followups).values({
          requestId: request.id,
          emailId,
          followupNumber,
          mode,
        });

        results.processed++;
      } catch (error) {
        console.error(`Error processing request ${request.id}:`, error);
        results.errors++;
      }
    }

    return NextResponse.json({
      success: true,
      ...results,
      total: activeRequests.length,
    });
  } catch (error) {
    console.error("Cron error:", error);
    return NextResponse.json(
      { error: "Cron job failed" },
      { status: 500 }
    );
  }
}
