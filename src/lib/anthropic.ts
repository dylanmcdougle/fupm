import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/lib/db";
import { voices } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

async function getVoiceDescription(voiceName: string): Promise<string> {
  const voice = await db
    .select()
    .from(voices)
    .where(eq(voices.name, voiceName))
    .limit(1);

  if (voice.length > 0) {
    return voice[0].description;
  }

  // Fallback descriptions if voice not found in DB
  const fallbacks: Record<string, string> = {
    assistant: "Polite and helpful, like a friendly assistant. Warm but professional.",
    accountant: "Business-like and matter-of-fact. Focused on numbers and dates.",
    attorney: "Formal and direct. References obligations and potential next steps.",
    asshole: "Blunt, impatient, and fed up. No pleasantries.",
  };

  return fallbacks[voiceName] || fallbacks.assistant;
}

export async function generateFollowupEmail({
  recipientName,
  amount,
  context,
  tone,
  followupNumber,
  daysSinceInitial,
  originalSubject,
}: {
  recipientName?: string | null;
  amount?: string | null;
  context?: string | null;
  tone: string;
  followupNumber: number;
  daysSinceInitial: number;
  originalSubject?: string | null;
}): Promise<string> {
  const voiceDescription = await getVoiceDescription(tone);

  const prompt = `You are helping someone follow up on an unpaid invoice or payment request.

Context about the request:
- Recipient: ${recipientName || "the recipient"}
- Amount owed: ${amount ? `$${amount}` : "amount not specified"}
- Original request subject: ${originalSubject || "Invoice/Payment Request"}
- Additional context: ${context || "None provided"}
- This is follow-up #${followupNumber}
- It has been ${daysSinceInitial} days since the initial request

Tone: ${tone} - ${voiceDescription}

${followupNumber > 1 && tone !== "assistant" ? `This is follow-up #${followupNumber}, so the urgency should naturally escalate. ` : ""}
${followupNumber > 3 && tone !== "assistant" ? "This has been outstanding for a while, so be more direct about needing resolution. " : ""}
${followupNumber > 1 && tone === "assistant" ? `This is follow-up #${followupNumber}, but keep it polite and helpful regardless. ` : ""}

Write a brief, effective follow-up email. Keep it concise (3-5 sentences). Don't include a subject line - just the body text. Don't include a formal greeting or signature - just the core message.`;

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 500,
    messages: [{ role: "user", content: prompt }],
  });

  const textBlock = response.content.find((block) => block.type === "text");
  return textBlock?.type === "text" ? textBlock.text : "";
}

export async function checkIfPaid(
  emailBodies: string[]
): Promise<boolean> {
  const combinedContent = emailBodies.join("\n\n---\n\n");

  const prompt = `Analyze this email thread and determine if payment has been made or confirmed.
Look for phrases like "payment sent", "paid", "transferred", "receipt attached", "thank you for your payment", etc.

Email thread:
${combinedContent}

Respond with only "true" or "false" (no other text).`;

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 10,
    messages: [{ role: "user", content: prompt }],
  });

  const textBlock = response.content.find((block) => block.type === "text");
  const text = textBlock?.type === "text" ? textBlock.text.toLowerCase().trim() : "false";
  return text === "true";
}

export async function extractThreadContext(
  emailBodies: string[]
): Promise<{
  recipientName: string | null;
  amount: string | null;
  context: string;
}> {
  const combinedContent = emailBodies.join("\n\n---\n\n");

  const prompt = `Analyze this email thread and extract:
1. The name of the person being asked to pay (if mentioned)
2. The amount owed (if mentioned)
3. A brief summary of what the payment is for

Email thread:
${combinedContent}

Respond in JSON format:
{
  "recipientName": "name or null",
  "amount": "number as string or null",
  "context": "brief summary of what the payment is for"
}`;

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 300,
    messages: [{ role: "user", content: prompt }],
  });

  const textBlock = response.content.find((block) => block.type === "text");
  let text = textBlock?.type === "text" ? textBlock.text : "{}";

  // Strip markdown code blocks if present
  text = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();

  try {
    const parsed = JSON.parse(text);
    return {
      recipientName: parsed.recipientName || null,
      amount: parsed.amount || null,
      context: parsed.context || "",
    };
  } catch (e) {
    console.error("Failed to parse context:", e, text);
    return { recipientName: null, amount: null, context: "" };
  }
}
