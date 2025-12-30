import { pgTable, uuid, text, timestamp, decimal, integer } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").unique().notNull(),
  gmailAccessToken: text("gmail_access_token"),
  gmailRefreshToken: text("gmail_refresh_token"),
  tokenExpiresIn: integer("token_expires_in"),
  tokenRefreshedAt: timestamp("token_refreshed_at", { withTimezone: true }),
  gmailLabelId: text("gmail_label_id"),
  followupAction: text("followup_action").default("draft"), // draft | send
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const requests = pgTable("requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  recipientEmail: text("recipient_email").notNull(),
  recipientName: text("recipient_name"),
  subject: text("subject"),
  amount: decimal("amount", { precision: 10, scale: 2 }),
  originalEmailId: text("original_email_id"),
  threadId: text("thread_id"),
  status: text("status").default("active"), // active | closed | cancelled
  followupInterval: integer("followup_interval").default(7),
  context: text("context"),
  tone: text("tone").default("assistant"), // assistant | accountant | attorney | asshole
  initialRequestAt: timestamp("initial_request_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const followups = pgTable("followups", {
  id: uuid("id").primaryKey().defaultRandom(),
  requestId: uuid("request_id").references(() => requests.id, { onDelete: "cascade" }),
  emailId: text("email_id"),
  sentAt: timestamp("sent_at", { withTimezone: true }).defaultNow(),
  followupNumber: integer("followup_number"),
  mode: text("mode").default("draft"), // draft | sent
});

export const voices = pgTable("voices", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").unique().notNull(), // assistant, accountant, attorney, asshole
  label: text("label").notNull(), // Display name in UI
  description: text("description").notNull(), // Prompt description for AI
  examples: text("examples"), // Example phrases or sample output
  color: text("color"), // For UI badges (e.g., "blue", "green", "#4285F4")
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Request = typeof requests.$inferSelect;
export type NewRequest = typeof requests.$inferInsert;
export type Followup = typeof followups.$inferSelect;
export type NewFollowup = typeof followups.$inferInsert;
export type Voice = typeof voices.$inferSelect;
export type NewVoice = typeof voices.$inferInsert;
