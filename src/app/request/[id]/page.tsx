import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requests, followups } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { RequestClient } from "./client";

export default async function RequestPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/");
  }

  const { id } = await params;

  const request = await db
    .select()
    .from(requests)
    .where(and(eq(requests.id, id), eq(requests.userId, session.user.id)))
    .limit(1);

  if (!request.length) {
    notFound();
  }

  const requestFollowups = await db
    .select()
    .from(followups)
    .where(eq(followups.requestId, id))
    .orderBy(desc(followups.sentAt));

  return (
    <RequestClient request={request[0]} followups={requestFollowups} />
  );
}
