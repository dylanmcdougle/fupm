"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { User, Request, Followup } from "@/lib/db/schema";

type RequestWithFollowup = Request & {
  lastFollowup: Followup | null;
  followupCount: number;
};

export function DashboardClient({
  user,
  requests,
  userEmail,
}: {
  user: User;
  requests: RequestWithFollowup[];
  userEmail: string;
}) {
  const [syncing, setSyncing] = useState(false);
  const [followupAction, setFollowupAction] = useState(user.followupAction || "draft");

  const handleSync = async () => {
    setSyncing(true);
    try {
      await fetch("/api/sync", { method: "POST" });
      window.location.reload();
    } catch (error) {
      console.error("Sync failed:", error);
    } finally {
      setSyncing(false);
    }
  };

  const handleFollowupActionChange = async (value: string) => {
    setFollowupAction(value);
    await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ followupAction: value }),
    });
  };

  const activeRequests = requests.filter((r) => r.status === "active");
  const closedRequests = requests.filter((r) => r.status !== "active");

  const getNextFollowupDate = (req: RequestWithFollowup) => {
    const lastDate = req.lastFollowup?.sentAt || req.createdAt;
    if (!lastDate) return null;
    const next = new Date(lastDate);
    next.setDate(next.getDate() + (req.followupInterval || 7));
    return next;
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const formatAmount = (amount: string | null) => {
    if (!amount) return null;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(parseFloat(amount));
  };

  return (
    <div className="min-h-screen">
      <header className="border-b">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <Link href="/dashboard" className="text-lg font-light">
            FUPM.ai
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{userEmail}</span>
            <Button variant="ghost" size="sm" onClick={() => signOut({ callbackUrl: "/" })}>
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-light">Requests</h1>
            <Button variant="outline" size="sm" onClick={handleSync} disabled={syncing}>
              {syncing ? "Syncing..." : "Sync Gmail"}
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Follow-ups:</span>
            <Select value={followupAction} onValueChange={handleFollowupActionChange}>
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="send">Auto-send</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {requests.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-muted-foreground">
              No requests yet. Label an email thread with &quot;FUPM&quot; in Gmail, then sync.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {activeRequests.length > 0 && (
              <section>
                <h2 className="mb-4 text-sm font-medium text-muted-foreground">Active</h2>
                <div className="space-y-2">
                  {activeRequests.map((req) => (
                    <Link
                      key={req.id}
                      href={`/request/${req.id}`}
                      className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/50"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate font-medium">
                            {req.recipientName || req.recipientEmail}
                          </span>
                          {req.amount && (
                            <span className="text-sm text-muted-foreground">
                              {formatAmount(req.amount)}
                            </span>
                          )}
                        </div>
                        <p className="truncate text-sm text-muted-foreground">
                          {req.subject || "No subject"}
                        </p>
                      </div>
                      <div className="ml-4 flex items-center gap-4 text-sm">
                        <div className="text-right">
                          <div className="text-muted-foreground">
                            {req.followupCount} sent
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Next: {formatDate(getNextFollowupDate(req))}
                          </div>
                        </div>
                        <Badge variant="outline" className="capitalize">
                          {req.tone}
                        </Badge>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {closedRequests.length > 0 && (
              <section>
                <Separator className="mb-8" />
                <h2 className="mb-4 text-sm font-medium text-muted-foreground">Closed</h2>
                <div className="space-y-2">
                  {closedRequests.map((req) => (
                    <Link
                      key={req.id}
                      href={`/request/${req.id}`}
                      className="flex items-center justify-between rounded-lg border p-4 opacity-60 transition-colors hover:bg-muted/50"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate font-medium">
                            {req.recipientName || req.recipientEmail}
                          </span>
                          {req.amount && (
                            <span className="text-sm text-muted-foreground">
                              {formatAmount(req.amount)}
                            </span>
                          )}
                        </div>
                        <p className="truncate text-sm text-muted-foreground">
                          {req.subject || "No subject"}
                        </p>
                      </div>
                      <Badge variant="secondary" className="capitalize">
                        {req.status}
                      </Badge>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
