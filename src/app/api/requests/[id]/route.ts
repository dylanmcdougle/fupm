import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { requests } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await request.json();

    const {
      recipientName,
      recipientEmail,
      amount,
      tone,
      followupInterval,
      context,
      status,
    } = body;

    // Verify ownership
    const existing = await db
      .select()
      .from(requests)
      .where(and(eq(requests.id, id), eq(requests.userId, session.user.id)))
      .limit(1);

    if (!existing.length) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await db
      .update(requests)
      .set({
        recipientName,
        recipientEmail,
        amount,
        tone,
        followupInterval,
        context,
        status,
      })
      .where(eq(requests.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update request error:", error);
    return NextResponse.json(
      { error: "Failed to update request" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;

    // Verify ownership
    const existing = await db
      .select()
      .from(requests)
      .where(and(eq(requests.id, id), eq(requests.userId, session.user.id)))
      .limit(1);

    if (!existing.length) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await db.delete(requests).where(eq(requests.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete request error:", error);
    return NextResponse.json(
      { error: "Failed to delete request" },
      { status: 500 }
    );
  }
}
