import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { voices } from "@/lib/db/schema";
import { asc } from "drizzle-orm";

export async function GET() {
  try {
    const allVoices = await db
      .select()
      .from(voices)
      .orderBy(asc(voices.sortOrder));

    return NextResponse.json(allVoices);
  } catch (error) {
    console.error("Failed to fetch voices:", error);
    return NextResponse.json({ error: "Failed to fetch voices" }, { status: 500 });
  }
}
