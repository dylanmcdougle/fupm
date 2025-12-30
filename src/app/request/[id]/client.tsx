"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Request, Followup } from "@/lib/db/schema";

const tones = [
  { value: "professional", label: "Professional" },
  { value: "friendly", label: "Friendly" },
  { value: "firm", label: "Firm" },
  { value: "aggressive", label: "Aggressive" },
];

export function RequestClient({
  request,
  followups,
}: {
  request: Request;
  followups: Followup[];
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [sendingFollowup, setSendingFollowup] = useState(false);
  const [form, setForm] = useState({
    recipientName: request.recipientName || "",
    recipientEmail: request.recipientEmail,
    amount: request.amount || "",
    tone: request.tone || "professional",
    followupInterval: request.followupInterval || 7,
    context: request.context || "",
    status: request.status || "active",
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch(`/api/requests/${request.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      router.refresh();
    } catch (error) {
      console.error("Save failed:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleSendFollowup = async () => {
    setSendingFollowup(true);
    try {
      await fetch(`/api/requests/${request.id}/followup`, {
        method: "POST",
      });
      router.refresh();
    } catch (error) {
      console.error("Followup failed:", error);
    } finally {
      setSendingFollowup(false);
    }
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
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
          <Link
            href="/dashboard"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Back to dashboard
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-light">
              {request.recipientName || request.recipientEmail}
            </h1>
            <p className="text-sm text-muted-foreground">
              {request.subject || "No subject"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant={request.status === "active" ? "default" : "secondary"}
              className="capitalize"
            >
              {request.status}
            </Badge>
            {request.amount && (
              <span className="font-medium">{formatAmount(request.amount)}</span>
            )}
          </div>
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          <section className="space-y-4">
            <h2 className="text-sm font-medium text-muted-foreground">Details</h2>

            <div className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="recipientName">Recipient Name</Label>
                <Input
                  id="recipientName"
                  value={form.recipientName}
                  onChange={(e) =>
                    setForm({ ...form, recipientName: e.target.value })
                  }
                  placeholder="John Doe"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="recipientEmail">Recipient Email</Label>
                <Input
                  id="recipientEmail"
                  value={form.recipientEmail}
                  onChange={(e) =>
                    setForm({ ...form, recipientEmail: e.target.value })
                  }
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="amount">Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="tone">Tone</Label>
                <Select
                  value={form.tone}
                  onValueChange={(v) => setForm({ ...form, tone: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {tones.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="interval">Follow-up Interval (days)</Label>
                <Input
                  id="interval"
                  type="number"
                  min="1"
                  max="90"
                  value={form.followupInterval}
                  onChange={(e) =>
                    setForm({ ...form, followupInterval: parseInt(e.target.value) || 7 })
                  }
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="context">Context for AI</Label>
                <Textarea
                  id="context"
                  value={form.context}
                  onChange={(e) => setForm({ ...form, context: e.target.value })}
                  placeholder="Additional context to help generate better follow-ups..."
                  rows={3}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) => setForm({ ...form, status: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="closed">Closed (Paid)</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2 pt-2">
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleSendFollowup}
                  disabled={sendingFollowup || form.status !== "active"}
                >
                  {sendingFollowup ? "Sending..." : "Send Follow-up Now"}
                </Button>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-sm font-medium text-muted-foreground">
              Follow-up History ({followups.length})
            </h2>

            {followups.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No follow-ups sent yet.
              </p>
            ) : (
              <div className="space-y-3">
                {followups.map((f) => (
                  <div
                    key={f.id}
                    className="rounded-lg border p-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        Follow-up #{f.followupNumber}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(f.sentAt)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <Separator />

            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                <span className="font-medium">Initial request:</span>{" "}
                {formatDate(request.initialRequestAt)}
              </p>
              <p>
                <span className="font-medium">Created:</span>{" "}
                {formatDate(request.createdAt)}
              </p>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
