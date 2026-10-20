"use client";

import { useState } from "react";
import { promoteToOperator } from "./actions";

export function PromoteForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  async function handleSubmit() {
    setError(null);
    setDone(null);
    setLoading(true);
    const result = await promoteToOperator(email);
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setDone(result.email);
    setEmail("");
  }

  return (
    <div className="rounded-lg border border-line bg-surface p-4">
      <p className="text-sm font-medium">Add an operator</p>
      <p className="mt-1 text-xs text-ink-muted">
        They need to have signed in at least once already (any page, via the normal email link) — this elevates
        their existing account, it doesn&apos;t create a new one.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
        className="mt-3 flex flex-wrap gap-2"
      >
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="colleague@example.com"
          className="min-w-0 flex-1 rounded-md border border-line bg-bg px-3 py-2 text-sm"
        />
        <button type="submit" disabled={loading} className="rounded-md bg-sea px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:text-bg">
          {loading ? "Adding…" : "Make operator"}
        </button>
      </form>
      {error && <p className="mt-2 text-sm text-missing">{error}</p>}
      {done && <p className="mt-2 text-sm text-covered">{done} is now an operator.</p>}
    </div>
  );
}
