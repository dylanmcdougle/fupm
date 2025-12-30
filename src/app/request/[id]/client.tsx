"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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
  { value: "assistant", label: "Assistant" },
  { value: "accountant", label: "Accountant" },
  { value: "attorney", label: "Attorney" },
  { value: "asshole", label: "Asshole" },
];

export function RequestClient({
  request,
  followups,
}: {
  request: Request;
  followups: Followup[];
}) {
  const router = useRouter();
  const [creatingDraft, setCreatingDraft] = useState(false);
  const [sending, setSending] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "">("");
  const [form, setForm] = useState({
    recipientName: request.recipientName || "",
    recipientEmail: request.recipientEmail,
    amount: request.amount || "",
    tone: request.tone || "assistant",
    followupInterval: request.followupInterval || 7,
    context: request.context || "",
    status: request.status || "active",
  });

  const isFirstRender = useRef(true);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const saveForm = useCallback(async (formData: typeof form) => {
    setSaveStatus("saving");
    try {
      await fetch(`/api/requests/${request.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus(""), 2000);
    } catch (error) {
      console.error("Save failed:", error);
      setSaveStatus("");
    }
  }, [request.id]);

  // Auto-save with debounce
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      saveForm(form);
    }, 500);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [form, saveForm]);

  const handleCreateDraft = async () => {
    setCreatingDraft(true);
    try {
      await fetch(`/api/requests/${request.id}/followup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "draft" }),
      });
      router.refresh();
    } catch (error) {
      console.error("Create draft failed:", error);
    } finally {
      setCreatingDraft(false);
    }
  };

  const handleCreateAndSend = async () => {
    setSending(true);
    try {
      await fetch(`/api/requests/${request.id}/followup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "send" }),
      });
      router.refresh();
    } catch (error) {
      console.error("Send failed:", error);
    } finally {
      setSending(false);
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

  const isActive = form.status === "active";

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

        {/* Settings & Context Section */}
        <section className="mb-8 space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground">Settings & Context</h2>

          <div className="grid gap-4 md:grid-cols-2">
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
              <Label htmlFor="tone">Voice</Label>
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
          </div>

          <div className="space-y-1">
            <Label htmlFor="context">Context</Label>
            <Textarea
              id="context"
              value={form.context}
              onChange={(e) => setForm({ ...form, context: e.target.value })}
              placeholder="Auto-generated from thread. Edit to refine follow-ups."
              rows={3}
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <Button
              variant="outline"
              onClick={handleCreateDraft}
              disabled={creatingDraft || !isActive}
            >
              {creatingDraft ? "Creating..." : "Create Draft"}
            </Button>
            <Button
              variant="default"
              onClick={handleCreateAndSend}
              disabled={sending || !isActive}
            >
              {sending ? "Sending..." : "Create and Send"}
            </Button>
            {saveStatus && (
              <span className="text-sm text-muted-foreground">
                {saveStatus === "saving" ? "Saving..." : "Saved"}
              </span>
            )}
          </div>
        </section>

        <Separator />

        {/* Follow-up History Section */}
        <section className="mt-8 space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground">
            Follow-up History ({followups.length})
          </h2>

          {followups.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No follow-ups yet.
            </p>
          ) : (
            <div className="space-y-3">
              {followups.map((f) => (
                <div
                  key={f.id}
                  className="rounded-lg border p-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        Follow-up #{f.followupNumber}
                      </span>
                      <Badge variant={f.mode === "sent" ? "default" : "secondary"} className="text-xs">
                        {f.mode === "sent" ? "Sent" : "Draft"}
                      </Badge>
                    </div>
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
      </main>
    </div>
  );
}
