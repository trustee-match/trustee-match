"use client";

import { useState } from "react";
import { enterPreview } from "./actions";

export default function EnterPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setLoading(true);
    setError(false);
    const result = await enterPreview(password);
    // enterPreview redirects on success, so reaching here means it failed.
    if (!result.ok) {
      setLoading(false);
      setError(true);
    }
  }

  return (
    <div className="mx-auto max-w-sm space-y-6 pt-16">
      <div className="space-y-2 text-center">
        <p className="text-xs font-semibold uppercase tracking-wide text-gorse">Demo</p>
        <h1 className="font-serif text-2xl font-semibold">Trustee Match</h1>
        <p className="text-sm text-ink-muted">This is a private demo. Enter the password you were given.</p>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
        className="space-y-3"
      >
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoFocus
          className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm"
          placeholder="Password"
        />
        {error && <p className="text-sm text-missing">That password isn&apos;t right.</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-sea px-4 py-2.5 font-medium text-white disabled:opacity-50 dark:text-bg"
        >
          {loading ? "Checking…" : "Enter"}
        </button>
      </form>
    </div>
  );
}
