import { config } from "dotenv";
config({ path: ".env.local" });

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { voices } from "./schema";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool);

const defaultVoices = [
  {
    name: "assistant",
    label: "Assistant",
    description: "Polite and helpful, like a friendly assistant. Warm but professional. Simply checking in on the status with a gentle reminder.",
    examples: "Just wanted to check in on the status of this. Let me know if there's anything I can help with to get this resolved.",
    color: "blue",
    sortOrder: 1,
  },
  {
    name: "accountant",
    label: "Accountant",
    description: "Business-like and matter-of-fact. Focused on numbers and dates. References invoice numbers, due dates, and payment terms. Neutral and transactional.",
    examples: "Per our records, invoice #1234 for $2,500 was due on January 15th. Please confirm payment status or expected remittance date.",
    color: "green",
    sortOrder: 2,
  },
  {
    name: "attorney",
    label: "Attorney",
    description: "Formal and direct. References obligations, agreements, and potential next steps. Professional but makes it clear this is a serious matter that requires attention.",
    examples: "This matter remains unresolved. Per our agreement, payment was due 30 days ago. Please advise on your intended course of action to avoid further escalation.",
    color: "purple",
    sortOrder: 3,
  },
  {
    name: "asshole",
    label: "Asshole",
    description: "Blunt, impatient, and fed up. No pleasantries. Makes it clear you're done waiting and this is unacceptable. Borderline rude but still professional enough to send.",
    examples: "This is the fourth time I'm following up. I did the work. You owe me money. Pay me.",
    color: "red",
    sortOrder: 4,
  },
];

async function seed() {
  console.log("Seeding voices...");

  for (const voice of defaultVoices) {
    await db
      .insert(voices)
      .values(voice)
      .onConflictDoUpdate({
        target: voices.name,
        set: {
          label: voice.label,
          description: voice.description,
          examples: voice.examples,
          color: voice.color,
          sortOrder: voice.sortOrder,
        },
      });
    console.log(`  ✓ ${voice.label}`);
  }

  console.log("Done!");
  await pool.end();
  process.exit(0);
}

seed().catch(async (err) => {
  console.error("Seed failed:", err);
  await pool.end();
  process.exit(1);
});
