import { google } from "googleapis";
import { db } from "./db";
import { users } from "./db/schema";
import { eq } from "drizzle-orm";

const FUPM_LABEL_NAME = "FUPM.ai";

export async function getGmailClient(userId: string) {
  const user = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user.length || !user[0].gmailAccessToken) {
    throw new Error("User not found or no access token");
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );

  // Calculate expiry date from tokenRefreshedAt + tokenExpiresIn
  let expiryDate: number | undefined;
  if (user[0].tokenRefreshedAt && user[0].tokenExpiresIn) {
    expiryDate = new Date(user[0].tokenRefreshedAt).getTime() + (user[0].tokenExpiresIn * 1000);
  }

  oauth2Client.setCredentials({
    access_token: user[0].gmailAccessToken,
    refresh_token: user[0].gmailRefreshToken,
    expiry_date: expiryDate,
  });

  // Handle token refresh
  oauth2Client.on("tokens", async (tokens) => {
    if (tokens.access_token) {
      await db
        .update(users)
        .set({
          gmailAccessToken: tokens.access_token,
          tokenExpiresIn: tokens.expiry_date
            ? Math.floor((tokens.expiry_date - Date.now()) / 1000)
            : 3600,
          tokenRefreshedAt: new Date(),
        })
        .where(eq(users.id, userId));
    }
  });

  // Proactively refresh if token expires in less than 5 minutes
  if (expiryDate && expiryDate - Date.now() < 5 * 60 * 1000) {
    try {
      const { credentials } = await oauth2Client.refreshAccessToken();
      oauth2Client.setCredentials(credentials);
    } catch (error) {
      console.error("Failed to proactively refresh token:", error);
      // Will fail on API call, triggering re-auth
    }
  }

  return google.gmail({ version: "v1", auth: oauth2Client });
}

export async function ensureFupmLabel(userId: string): Promise<string> {
  const user = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (user[0]?.gmailLabelId) {
    return user[0].gmailLabelId;
  }

  const gmail = await getGmailClient(userId);

  // Check if label exists
  const labels = await gmail.users.labels.list({ userId: "me" });
  const existingLabel = labels.data.labels?.find(
    (l) => l.name === FUPM_LABEL_NAME
  );

  if (existingLabel?.id) {
    await db
      .update(users)
      .set({ gmailLabelId: existingLabel.id })
      .where(eq(users.id, userId));
    return existingLabel.id;
  }

  // Create label
  const newLabel = await gmail.users.labels.create({
    userId: "me",
    requestBody: {
      name: FUPM_LABEL_NAME,
      labelListVisibility: "labelShow",
      messageListVisibility: "show",
    },
  });

  const labelId = newLabel.data.id!;
  await db
    .update(users)
    .set({ gmailLabelId: labelId })
    .where(eq(users.id, userId));

  return labelId;
}

export async function getThreadsWithLabel(userId: string, labelId: string) {
  const gmail = await getGmailClient(userId);

  const response = await gmail.users.threads.list({
    userId: "me",
    labelIds: [labelId],
    maxResults: 50,
  });

  return response.data.threads || [];
}

export async function getThreadDetails(userId: string, threadId: string) {
  const gmail = await getGmailClient(userId);

  const thread = await gmail.users.threads.get({
    userId: "me",
    id: threadId,
    format: "full",
  });

  return thread.data;
}

export async function createDraft(
  userId: string,
  threadId: string,
  to: string,
  subject: string,
  body: string
) {
  const gmail = await getGmailClient(userId);

  const message = [
    `To: ${to}`,
    `Subject: ${subject}`,
    "Content-Type: text/plain; charset=utf-8",
    "",
    body,
  ].join("\n");

  const encodedMessage = Buffer.from(message)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const draft = await gmail.users.drafts.create({
    userId: "me",
    requestBody: {
      message: {
        raw: encodedMessage,
        threadId,
      },
    },
  });

  return draft.data;
}

export async function sendEmail(
  userId: string,
  threadId: string,
  to: string,
  subject: string,
  body: string
) {
  const gmail = await getGmailClient(userId);

  const message = [
    `To: ${to}`,
    `Subject: ${subject}`,
    "Content-Type: text/plain; charset=utf-8",
    "",
    body,
  ].join("\n");

  const encodedMessage = Buffer.from(message)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const sent = await gmail.users.messages.send({
    userId: "me",
    requestBody: {
      raw: encodedMessage,
      threadId,
    },
  });

  return sent.data;
}

export function parseEmailHeaders(headers: { name?: string | null; value?: string | null }[]) {
  const getHeader = (name: string) =>
    headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value || "";

  return {
    from: getHeader("from"),
    to: getHeader("to"),
    subject: getHeader("subject"),
    date: getHeader("date"),
  };
}

export function extractEmailBody(payload: {
  body?: { data?: string | null } | null;
  parts?: Array<{ mimeType?: string | null; body?: { data?: string | null } | null; parts?: unknown[] }> | null;
} | null): string {
  if (!payload) return "";
  if (payload.body?.data) {
    return Buffer.from(payload.body.data, "base64").toString("utf-8");
  }

  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === "text/plain" && part.body?.data) {
        return Buffer.from(part.body.data, "base64").toString("utf-8");
      }
    }
    // Fallback to HTML if no plain text
    for (const part of payload.parts) {
      if (part.mimeType === "text/html" && part.body?.data) {
        const html = Buffer.from(part.body.data, "base64").toString("utf-8");
        return html.replace(/<[^>]*>/g, ""); // Basic HTML strip
      }
    }
  }

  return "";
}
