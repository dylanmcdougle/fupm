import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { requests, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  ensureFupmLabel,
  getThreadsWithLabel,
  getThreadDetails,
  parseEmailHeaders,
  extractEmailBody,
} from "@/lib/gmail";
import { extractThreadContext, checkIfPaid } from "@/lib/anthropic";

export async function POST() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Ensure FUPM label exists
    const labelId = await ensureFupmLabel(session.user.id);

    // Get threads with FUPM label
    const threads = await getThreadsWithLabel(session.user.id, labelId);

    // Get existing request thread IDs
    const existingRequests = await db
      .select({ threadId: requests.threadId })
      .from(requests)
      .where(eq(requests.userId, session.user.id));

    const existingThreadIds = new Set(existingRequests.map((r) => r.threadId));

    // Process new threads
    const newRequests = [];
    for (const thread of threads) {
      if (!thread.id || existingThreadIds.has(thread.id)) {
        continue;
      }

      const threadDetails = await getThreadDetails(session.user.id, thread.id);
      const messages = threadDetails.messages || [];

      if (messages.length === 0) continue;

      // Get headers from first message
      const firstMessage = messages[0];
      const headers = parseEmailHeaders(firstMessage.payload?.headers || []);

      // Extract body from all messages for context
      const bodies = messages.map((m) =>
        extractEmailBody(m.payload || {})
      );

      // Use AI to extract context
      const context = await extractThreadContext(bodies);

      // Determine recipient (the person we're chasing)
      // If we sent the first email, recipient is in "To"
      // Otherwise, it's the "From"
      const user = await db
        .select()
        .from(users)
        .where(eq(users.id, session.user.id))
        .limit(1);

      const userEmail = user[0]?.email?.toLowerCase();
      const fromEmail = headers.from.toLowerCase();
      const isUserSender = fromEmail.includes(userEmail || "");

      const recipientEmail = isUserSender
        ? headers.to.replace(/.*<(.+)>.*/, "$1").trim()
        : headers.from.replace(/.*<(.+)>.*/, "$1").trim();

      const recipientName = isUserSender
        ? headers.to.replace(/<.+>/, "").trim()
        : headers.from.replace(/<.+>/, "").trim();

      newRequests.push({
        userId: session.user.id,
        recipientEmail: recipientEmail || "unknown",
        recipientName: context.recipientName || recipientName || null,
        subject: headers.subject,
        amount: context.amount,
        originalEmailId: firstMessage.id,
        threadId: thread.id,
        context: context.context,
        initialRequestAt: headers.date ? new Date(headers.date) : new Date(),
      });
    }

    if (newRequests.length > 0) {
      await db.insert(requests).values(newRequests);
    }

    // Check existing active requests for payment confirmation
    const activeRequests = await db
      .select()
      .from(requests)
      .where(eq(requests.userId, session.user.id));

    let autoCompleted = 0;
    for (const req of activeRequests) {
      if (req.status !== "active" || !req.threadId) continue;

      try {
        const threadDetails = await getThreadDetails(session.user.id, req.threadId);
        const messages = threadDetails.messages || [];
        const bodies = messages.map((m) => extractEmailBody(m.payload || {}));

        const isPaid = await checkIfPaid(bodies);
        if (isPaid) {
          await db
            .update(requests)
            .set({ status: "closed" })
            .where(eq(requests.id, req.id));
          autoCompleted++;
        }
      } catch (e) {
        console.error(`Error checking payment for request ${req.id}:`, e);
      }
    }

    return NextResponse.json({
      synced: newRequests.length,
      autoCompleted,
      total: threads.length,
    });
  } catch (error) {
    console.error("Sync error:", error);
    return NextResponse.json(
      { error: "Failed to sync" },
      { status: 500 }
    );
  }
}
