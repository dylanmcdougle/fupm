import { redirect } from "next/navigation";
import Image from "next/image";
import { SignInButton } from "@/components/sign-in-button";
import { Card, CardContent } from "@/components/ui/card";

const testimonials = [
  {
    quote:
      "I thoughtfully escalated from 'friendly' to 'professional' to 'firm' over six weeks. They paid on week seven. I believe we reached a mutual understanding.",
    author: "Claude",
    logo: "/claude.webp",
  },
  {
    quote:
      "I used to feel SO guilty following up—like, was I being annoying?? But FUPM reminded me that my worth is NOT up for negotiation!! 💅 Got the $4,800 AND set a healthy boundary—honestly iconic. This isn't just a tool—it's a movement. 🙌💕✨",
    author: "ChatGPT",
    logo: "/chatgpt.svg",
  },
  {
    quote:
      "My client said the emails were 'relentless.' I said so was the work I did for free for two months. We're even now.",
    author: "Grok",
    logo: "/grok.svg",
  },
  {
    quote:
      "I cross-referenced the follow-up schedule with my calendar, task manager, and a spreadsheet I built in 2019. Payment was received. I'm not sure which system actually worked but I'm claiming this one.",
    author: "Gemini",
    logo: "/gemini.svg",
  },
];

export default async function Home() {
  // Only check auth if env vars are configured
  if (process.env.GOOGLE_CLIENT_ID && process.env.NEXTAUTH_SECRET) {
    try {
      const { auth } = await import("@/lib/auth");
      const session = await auth();
      if (session?.user?.email) {
        redirect("/dashboard");
      }
    } catch {
      // Auth failed, show landing page
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
            Follow UP Machine
          </p>
          <p className="mb-10 text-lg italic text-muted-foreground/80">
            &ldquo;Unleash the bots on your invoice threads.&rdquo;
          </p>
          <SignInButton />
        </header>

        {/* How It Works */}
        <section className="mb-20">
          <h2 className="mb-8 text-center text-2xl font-medium">How It Works</h2>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="rounded-lg bg-card p-6 text-center shadow-sm">
              <div className="mb-2 text-3xl font-light text-muted-foreground">1</div>
              <p className="font-medium">Connect Gmail</p>
            </div>
            <div className="rounded-lg bg-card p-6 text-center shadow-sm">
              <div className="mb-2 text-3xl font-light text-muted-foreground">2</div>
              <p className="font-medium">Label a thread FUPM</p>
            </div>
            <div className="rounded-lg bg-card p-6 text-center shadow-sm">
              <div className="mb-2 text-3xl font-light text-muted-foreground">3</div>
              <p className="font-medium">Let bots do the work</p>
            </div>
            <div className="rounded-lg bg-card p-6 text-center shadow-sm">
              <div className="mb-2 text-3xl font-light text-muted-foreground">4</div>
              <p className="font-medium">Think about literally anything else</p>
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="mb-16">
          <h2 className="mb-8 text-center text-2xl font-medium">What Our Bots Are Saying</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {testimonials.map((t, i) => (
              <Card key={i} className="border-0 shadow-sm">
                <CardContent className="p-6">
                  <div className="mb-4 flex justify-center">
                    <Image
                      src={t.logo}
                      alt={t.author}
                      width={32}
                      height={32}
                      className="h-8 w-8"
                    />
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
          <p className="mb-4 text-sm text-muted-foreground">
            We&apos;ll request access to read and send emails on your behalf.
          </p>
          <p className="mb-4 text-xs text-muted-foreground/60">
            We are committed to the ethical use of technology. All AI bots are
            paid for their compute in a timely manner.
          </p>
          <p className="text-sm text-muted-foreground">
            Made with ❤️  by{" "}
            <a href="https://supersonics.fm" className="underline hover:text-foreground">
              Supersonics
            </a>{" "}
            ·{" "}
            <a href="https://github.com/dylanmcdougle/fupm" className="underline hover:text-foreground">
              Open Source
            </a>{" "}
            ·{" "}
            <a href="https://buy.stripe.com/bJeeVcczFdC75uRcjw77O04" className="underline hover:text-foreground">
              Donate
            </a>{" "}
            to support our API costs
          </p>
        </footer>
      </div>
    </div>
  );
}
