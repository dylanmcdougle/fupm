import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export type Tone = "professional" | "friendly" | "firm" | "aggressive";

const toneDescriptions: Record<Tone, string> = {
  professional:
    "Polite and business-like. Neutral tone, matter-of-fact. Simply checking in on the status.",
  friendly:
    "Super casual and warm, like texting a friend. Light-hearted, maybe even a bit playful. No pressure at all - just a gentle nudge. Use casual language like 'hey' or 'just wanted to check in'. Keep it SHORT.",
  firm: "Direct and assertive. Makes it clear this is important and needs attention, without being rude.",
  aggressive:
    "Very direct and urgent. Emphasizes consequences and the need for immediate action. This is serious.",
};

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
  tone: Tone;
  followupNumber: number;
  daysSinceInitial: number;
  originalSubject?: string | null;
}): Promise<string> {
  const prompt = `You are helping someone follow up on an unpaid invoice or payment request.

Context about the request:
- Recipient: ${recipientName || "the recipient"}
- Amount owed: ${amount ? `$${amount}` : "amount not specified"}
- Original request subject: ${originalSubject || "Invoice/Payment Request"}
- Additional context: ${context || "None provided"}
- This is follow-up #${followupNumber}
- It has been ${daysSinceInitial} days since the initial request

Tone: ${tone} - ${toneDescriptions[tone]}

${followupNumber > 1 && tone !== "friendly" ? `This is follow-up #${followupNumber}, so the urgency should naturally escalate. ` : ""}
${followupNumber > 3 && tone !== "friendly" ? "This has been outstanding for a while, so be more direct about needing resolution. " : ""}
${followupNumber > 1 && tone === "friendly" ? `This is follow-up #${followupNumber}, but keep it light and friendly regardless. ` : ""}

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
