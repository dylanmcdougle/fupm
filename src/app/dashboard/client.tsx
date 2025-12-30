"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

  const handleMarkStatus = async (requestId: string, status: string) => {
    await fetch(`/api/requests/${requestId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    window.location.reload();
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
          <Button variant="default" size="sm" onClick={handleSync} disabled={syncing}>
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
              <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
              <path d="M16 16h5v5" />
            </svg>
            {syncing ? "Syncing..." : "Sync Gmail"}
          </Button>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Automatically:</span>
            <Select value={followupAction} onValueChange={handleFollowupActionChange}>
              <SelectTrigger className="w-36 bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white">
                <SelectItem value="draft">Create draft</SelectItem>
                <SelectItem value="send">Send for me</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {requests.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-muted-foreground">
              No requests yet. Label an email thread with &quot;FUPM.AI&quot; in Gmail, then sync.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {activeRequests.length > 0 && (
              <section>
                <h2 className="mb-4 text-sm font-medium text-muted-foreground">Active</h2>
                <div className="space-y-2">
                  {activeRequests.map((req) => (
                    <div
                      key={req.id}
                      className="flex items-center justify-between rounded-lg border bg-white p-4"
                    >
                      <Link href={`/request/${req.id}`} className="min-w-0 flex-1 hover:opacity-70">
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
                      </Link>
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
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">•••</Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleMarkStatus(req.id, "closed")}>
                              Mark as Paid
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleMarkStatus(req.id, "cancelled")}>
                              Cancel
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
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
                      className="flex items-center justify-between rounded-lg border bg-white p-4 opacity-60 transition-colors hover:bg-muted/50"
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
