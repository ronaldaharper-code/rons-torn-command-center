"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CaptureSnapshotButton() {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "saving" | "done" | "error">("idle");

  async function handleCapture() {
    setStatus("saving");
    try {
      const response = await fetch("/api/snapshot", { method: "POST" });
      if (!response.ok) {
        setStatus("error");
        return;
      }
      setStatus("done");
      router.refresh();
    } catch {
      setStatus("error");
    }
  }

  const label =
    status === "saving" ? "Capturing…" : status === "done" ? "Captured ✓" : status === "error" ? "Failed — try again" : "Capture Snapshot";

  return (
    <button
      type="button"
      onClick={handleCapture}
      disabled={status === "saving"}
      className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-300 transition hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {label}
    </button>
  );
}
