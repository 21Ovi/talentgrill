"use client";

import { Check, FileText, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { Button, Notice } from "@/components/ui";
import { api, errorMessage } from "@/lib/clientApi";
import { cue } from "@/lib/feedback";
import type { PublicState } from "@/lib/session";

type Resume = NonNullable<PublicState["resume"]>;

/** Optional resume before the interview; ResumeReaderAgent turns it into a profile. */
export function ResumeCard({ sessionId, initial }: { sessionId: string; initial: Resume | null }) {
  const [resume, setResume] = useState(initial);
  const [reading, setReading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  async function upload(file: File) {
    setReading(true);
    setError(null);
    const form = new FormData();
    form.append("file", file);
    try {
      const res = await api<{ resume: Resume }>(`/api/sessions/${sessionId}/resume`, form);
      setResume(res.resume);
      cue("success");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setReading(false);
      if (input.current) input.current.value = "";
    }
  }

  const picker = (
    <input
      ref={input}
      type="file"
      accept=".pdf,.txt,application/pdf,text/plain"
      className="sr-only"
      onChange={(e) => {
        const file = e.target.files?.[0];
        if (file) void upload(file);
      }}
    />
  );

  if (resume) {
    return (
      <div className="flex w-full flex-col gap-2.5 rounded-2xl bg-ok/10 p-4 text-left">
        {picker}
        <p className="flex items-center gap-2 text-[15px] font-semibold text-ok">
          <Check className="size-4 stroke-[2.5]" /> Resume read
        </p>
        <p className="text-[15px] leading-snug">{resume.headline}</p>
        {resume.skills.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {resume.skills.slice(0, 8).map((s) => (
              <span key={s} className="rounded-full bg-surface px-2.5 py-1 text-[13px] ring-1 ring-line ring-inset">
                {s}
              </span>
            ))}
          </div>
        )}
        {resume.talking_points[0] && (
          <p className="text-sm text-muted">Emma may ask about: {resume.talking_points[0]}</p>
        )}
        {error && <Notice>{error}</Notice>}
        <button
          type="button"
          onClick={() => input.current?.click()}
          disabled={reading}
          className="self-start text-sm font-semibold text-muted underline-offset-4 hover:text-ink hover:underline"
        >
          {reading ? "Reading your resume…" : "Replace resume"}
        </button>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-3 rounded-2xl p-4 text-left ring-1 ring-line ring-inset [border-style:dashed]">
      {picker}
      <div className="flex gap-3">
        <FileText className="mt-0.5 size-5 shrink-0 text-ember-text" />
        <div className="flex flex-col gap-1">
          <p className="text-[16px] font-semibold">Add your resume (optional)</p>
          <p className="text-sm leading-snug text-muted">
            Emma will ask about your own projects, and your feedback and course will take it into account. PDF or .txt,
            up to 2 MB. We keep a short summary, never the file or your contact details.
          </p>
        </div>
      </div>
      {error && <Notice>{error}</Notice>}
      <Button variant="secondary" onClick={() => input.current?.click()} loading={reading} className="w-full">
        {!reading && <Upload className="size-4" />}
        {reading ? "Reading your resume… about 15 seconds" : "Upload resume"}
      </Button>
    </div>
  );
}
