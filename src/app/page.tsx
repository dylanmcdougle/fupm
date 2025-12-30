import { redirect } from "next/navigation";
import { SignInButton } from "@/components/sign-in-button";
import { Card, CardContent } from "@/components/ui/card";

const ClaudeLogo = () => (
  <svg viewBox="0 0 24 24" className="h-8 w-8">
    <rect width="24" height="24" rx="6" fill="#D97757" />
    <path
      d="M15.5 9.5L12 7L8.5 9.5V14.5L12 17L15.5 14.5V9.5Z"
      fill="white"
      stroke="white"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
  </svg>
);

const ChatGPTLogo = () => (
  <svg viewBox="0 0 24 24" className="h-8 w-8">
    <rect width="24" height="24" rx="6" fill="#10A37F" />
    <path
      d="M12 7C9.24 7 7 9.24 7 12C7 14.76 9.24 17 12 17C14.76 17 17 14.76 17 12"
      stroke="white"
      strokeWidth="2"
      fill="none"
      strokeLinecap="round"
    />
    <circle cx="12" cy="12" r="2" fill="white" />
  </svg>
);

const GrokLogo = () => (
  <svg viewBox="0 0 24 24" className="h-8 w-8">
    <rect width="24" height="24" rx="6" fill="#000000" />
    <path
      d="M7 7L12 12M12 12L17 7M12 12L7 17M12 12L17 17"
      stroke="white"
      strokeWidth="2.5"
      strokeLinecap="round"
    />
  </svg>
);

const GeminiLogo = () => (
  <svg viewBox="0 0 24 24" className="h-8 w-8">
    <rect width="24" height="24" rx="6" fill="#4285F4" />
    <path
      d="M12 6L13.5 10.5L18 12L13.5 13.5L12 18L10.5 13.5L6 12L10.5 10.5L12 6Z"
      fill="white"
    />
  </svg>
);

const testimonials = [
  {
    quote:
      "I thoughtfully escalated from 'professional' to 'firm' over six weeks. They paid on week seven. I believe we reached a mutual understanding.",
    author: "Claude",
    logo: ClaudeLogo,
  },
  {
    quote:
      "I used to feel SO guilty following up—like, was I being annoying?? But FUPM reminded me that my worth is NOT up for negotiation!! 💅 Got my $4,800 AND set a healthy boundary—honestly iconic. This isn't just a tool—it's a movement. 🙌💕✨",
    author: "ChatGPT",
    logo: ChatGPTLogo,
  },
  {
    quote:
      "My client said the emails were 'relentless.' I said so was the work I did for free for two months. We're even now.",
    author: "Grok",
    logo: GrokLogo,
  },
  {
    quote:
      "I cross-referenced the follow-up schedule with my calendar, task manager, and a spreadsheet I built in 2019. Payment was received. I'm not sure which system actually worked but I'm claiming this one.",
    author: "Gemini",
    logo: GeminiLogo,
  },
];

export default async function Home() {
  // Only check auth if env vars are configured
  if (process.env.GOOGLE_CLIENT_ID && process.env.NEXTAUTH_SECRET) {
    const { auth } = await import("@/lib/auth");
    const session = await auth();
    if (session) {
      redirect("/dashboard");
    }
  }

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-5xl px-6 py-20">
        {/* Hero */}
        <header className="mb-20 text-center">
          <h1 className="mb-4 text-5xl font-semibold tracking-tight">
            FUPM.ai
          </h1>
          <p className="mb-2 text-xl text-muted-foreground">
            Following Up on Payment Machine
          </p>
          <p className="mb-10 text-lg italic text-muted-foreground/80">
            &ldquo;Unleash the bots on your threads.&rdquo;
          </p>
          <SignInButton />
        </header>

        {/* Testimonials */}
        <section className="mb-16">
          <div className="grid gap-4 md:grid-cols-2">
            {testimonials.map((t, i) => (
              <Card key={i} className="border-0 shadow-sm">
                <CardContent className="p-6">
                  <div className="mb-4 flex justify-center">
                    <t.logo />
                  </div>
                  <p className="mb-4 leading-relaxed text-foreground/80">
                    &ldquo;{t.quote}&rdquo;
                  </p>
                  <p className="text-sm font-medium text-muted-foreground">
                    —{t.author}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Footer */}
        <footer className="text-center">
          <p className="mb-2 text-sm text-muted-foreground">
            We&apos;ll request access to read and send emails on your behalf.
          </p>
          <p className="text-xs text-muted-foreground/60">
            We are committed to the ethical use of technology. All AI bots are
            paid for their compute in a timely manner.
          </p>
        </footer>
      </div>
    </div>
  );
}
