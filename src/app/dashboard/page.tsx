import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requests, followups, users } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { DashboardClient } from "./client";

export default async function Dashboard() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/");
  }

  const user = await db
    .select()
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  const userRequests = await db
    .select()
    .from(requests)
    .where(eq(requests.userId, session.user.id))
    .orderBy(desc(requests.createdAt));

  // Get latest followup for each request
  const requestsWithFollowups = await Promise.all(
    userRequests.map(async (req) => {
      const latestFollowup = await db
        .select()
        .from(followups)
        .where(eq(followups.requestId, req.id))
        .orderBy(desc(followups.sentAt))
        .limit(1);

      const followupCount = await db
        .select()
        .from(followups)
        .where(eq(followups.requestId, req.id));

      return {
        ...req,
        lastFollowup: latestFollowup[0] || null,
        followupCount: followupCount.length,
      };
    })
  );

  return (
    <DashboardClient
      user={user[0]}
      requests={requestsWithFollowups}
      userEmail={session.user.email!}
    />
  );
}
