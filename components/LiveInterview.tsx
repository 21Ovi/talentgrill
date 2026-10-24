"use client";

import { ConversationProvider, useConversation } from "@elevenlabs/react";
import { Keyboard, Lightbulb, Mic, MicOff, PhoneOff, RotateCcw } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button, Notice, Orb } from "@/components/ui";
import { api, errorMessage } from "@/lib/clientApi";
import { cue } from "@/lib/feedback";

type StartResponse = {
  liveCallId: string;
  token: string;
  questionCount: number;
  dynamicVariables: Record<string, string>;
};

type Phase = "ready" | "connecting" | "live" | "saving" | "error";

type Props = {
  sessionId: string;
  roleLabel: string;
  questionCount: number;
  onDone: () => Promise<void>;
  onTypeInstead: () => void;
};

/** A live two-way voice interview with Emma, the ElevenLabs interviewer agent. */
export function LiveInterview(props: Props) {
  return (
    <ConversationProvider>
      <LiveCall {...props} />
    </ConversationProvider>
  );
}

function LiveCall({ sessionId, roleLabel, questionCount, onDone, onTypeInstead }: Props) {
  const [phase, setPhase] = useState<Phase>("ready");
  const [error, setError] = useState<string | null>(null);
  const [questionNumber, setQuestionNumber] = useState<number | null>(null);
  const [caption, setCaption] = useState<{ role: string; text: string } | null>(null);
  const call = useRef<{ liveCallId: string; conversationId: string | null } | null>(null);
  const finishing = useRef(false);
  const orb = useRef<HTMLSpanElement>(null);

  const finish = useCallback(async () => {
    const c = call.current;
    if (!c || finishing.current) return;
    finishing.current = true;
    if (!c.conversationId) {
      setError("The call didn't connect. Check that your microphone is allowed, then try again, or answer by typing.");
      setPhase("error");
      return;
    }
    setPhase("saving");
    try {
      await api(`/api/sessions/${sessionId}/live/finish`, { liveCallId: c.liveCallId, conversationId: c.conversationId });
      cue("success");
      await onDone();
    } catch (err) {
      setError(errorMessage(err));
      setPhase("error");
    }
  }, [sessionId, onDone]);

  const conversation = useConversation({
    onConnect: ({ conversationId }) => {
      if (call.current) call.current.conversationId = conversationId;
      setPhase("live");
      cue("start");
    },
    onDisconnect: () => void finish(),
    onMessage: ({ message, role }) => setCaption({ role, text: message }),
    onError: (message) => console.error("[live interview]", message),
    clientTools: {
      mark_question: ({ number }: { number?: number }) => {
        if (typeof number === "number") setQuestionNumber(number);
      },
      get_hint: async ({ number, said_so_far }: { number?: number; said_so_far?: string }) => {
        const liveCallId = call.current?.liveCallId;
        try {
          const { hint } = await api<{ hint: string }>(`/api/sessions/${sessionId}/live/hint`, {
            liveCallId,
            number,
            saidSoFar: said_so_far ?? "",
          });
          return hint;
        } catch {
          return "No hint is available right now. Encourage them to think out loud and take it one step at a time.";
        }
      },
    },
  });

  // Drive the orb from whoever is speaking, outside React's render loop.
  const audio = useRef(conversation);
  useEffect(() => {
    audio.current = conversation;
  });
  useEffect(() => {
    const el = orb.current;
    if (phase !== "live" || !el) return;
    let raf = 0;
    const frame = () => {
      const c = audio.current;
      const level = c.isSpeaking ? c.getOutputVolume() : c.isMuted ? 0 : c.getInputVolume();
      el.style.setProperty("--level", Math.min(1, level * 1.8).toFixed(3));
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      el.style.setProperty("--level", "0");
    };
  }, [phase]);

  async function start() {
    setPhase("connecting");
    setError(null);
    try {
      const res = await api<StartResponse>(`/api/sessions/${sessionId}/live/start`, {});
      call.current = { liveCallId: res.liveCallId, conversationId: null };
      finishing.current = false;
      if (conversation.isMuted) conversation.setMuted(false);
      conversation.startSession({
        conversationToken: res.token,
        connectionType: "webrtc",
        dynamicVariables: res.dynamicVariables,
      });
    } catch (err) {
      setError(errorMessage(err));
      setPhase("error");
    }
  }

  if (phase === "ready" || phase === "error") {
    return (
      <section className="arrive flex flex-col items-start gap-6 pt-2">
        <Orb state="idle" className="size-20" />
        <div className="flex flex-col gap-2">
          <h2 className="font-serif text-[30px] leading-tight">Meet Emma, your interviewer.</h2>
          <p className="text-[17px] leading-relaxed text-muted">
            A live voice conversation, about five minutes. She&apos;ll start with a quick hello, then ask you{" "}
            {questionCount} {questionCount === 1 ? "question" : "questions"} for the {roleLabel} role.
          </p>
          <p className="text-[15px] text-faint">Find a quiet spot, use headphones if you can, and think out loud.</p>
        </div>
        {error && <Notice>{error}</Notice>}
        <div className="flex w-full flex-col gap-3">
          <Button size="lg" className="w-full" onClick={start} cue="start">
            {phase === "error" ? <RotateCcw className="size-[18px]" /> : <Mic className="size-[18px]" />}
            {phase === "error" ? "Try the call again" : "Start interview"}
          </Button>
          <Button variant="quiet" className="w-full" onClick={onTypeInstead}>
            <Keyboard className="size-4" />
            Prefer typing? Answer one by one
          </Button>
        </div>
      </section>
    );
  }

  if (phase === "connecting" || phase === "saving") {
    return (
      <section className="arrive flex flex-1 flex-col items-center justify-center gap-5 pb-24 text-center">
        <Orb state="thinking" className="size-24" />
        <div className="flex flex-col gap-1">
          <h2 className="font-serif text-[26px] leading-tight">
            {phase === "connecting" ? "Connecting you to Emma…" : "Saving your interview…"}
          </h2>
          <p className="text-[15px] text-muted">
            {phase === "connecting"
              ? "Allow microphone access when your browser asks."
              : "Pulling your answers from the call. This takes a few seconds."}
          </p>
        </div>
      </section>
    );
  }

  const muted = conversation.isMuted;
  return (
    <section className="arrive flex flex-1 flex-col items-center gap-6 pb-10 pt-4 text-center">
      <span className="text-sm font-medium text-muted">
        {questionNumber ? `Question ${questionNumber} of ${questionCount}` : "Getting to know you"}
      </span>
      <Orb ref={orb} state="listening" className="size-40" />
      <p className="text-[15px] font-medium text-ember-text" aria-live="polite">
        {conversation.isSpeaking ? "Emma is speaking" : muted ? "You're muted" : "Listening…"}
      </p>
      <p className="min-h-[4.5rem] max-w-md font-serif text-[19px] leading-relaxed">
        {caption ? (caption.role === "user" ? <span className="text-muted">“{caption.text}”</span> : caption.text) : " "}
      </p>
      <div className="mt-auto flex w-full flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant={muted ? "primary" : "secondary"}
            size="lg"
            cue="toggle"
            aria-pressed={muted}
            aria-label={muted ? "Unmute your microphone" : "Mute your microphone"}
            onClick={() => conversation.setMuted(!muted)}
          >
            {muted ? <MicOff className="size-[18px]" /> : <Mic className="size-[18px]" />}
            {muted ? "Unmute" : "Mute"}
          </Button>
          <Button
            variant="secondary"
            size="lg"
            onClick={() => conversation.sendUserMessage("I'm stuck on this one. Could you give me a hint?")}
          >
            <Lightbulb className="size-[18px]" />
            I&apos;m stuck
          </Button>
        </div>
        <Button variant="quiet" className="w-full" cue="stop" onClick={() => conversation.endSession()}>
          <PhoneOff className="size-4" />
          End interview
        </Button>
      </div>
    </section>
  );
}
