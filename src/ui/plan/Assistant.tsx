"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import { applyChange } from "@/core/changes";
import type { Profile } from "@/core/types";
import type { Turn } from "@/ai/contracts";
import { sendChat, type ChatResponse } from "../api";
import { useT } from "../useT";

interface Props {
  profile: Profile;
  onChange: (next: Profile) => void;
}

/** A conversation about the household's air. The assistant proposes changes; the person approves them. */
export function Assistant({ profile, onChange }: Props) {
  const { t } = useT();
  const uid = useId();
  const [history, setHistory] = useState<Turn[]>([]);
  const [proposals, setProposals] = useState<ChatResponse["changes"]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const field = useRef<HTMLInputElement>(null);

  async function ask(e: FormEvent) {
    e.preventDefault();
    const question = text.trim();
    if (!question || busy) return;
    const next: Turn[] = [...history, { role: "user", text: question }];
    setHistory(next);
    setText("");
    setBusy(true);
    setError(null);
    setProposals([]);
    try {
      const res = await sendChat(profile, next.slice(-10));
      setHistory([...next, { role: "assistant", text: res.reply }]);
      setProposals(res.changes);
    } catch {
      setError(t("chat.unavailable"));
    } finally {
      setBusy(false);
      field.current?.focus();
    }
  }

  function approve(index: number) {
    const proposal = proposals[index];
    const applied = proposal ? applyChange(profile, proposal.change) : null;
    if (applied) onChange(applied);
    setProposals((all) => all.filter((_, i) => i !== index));
  }

  return (
    <section id="ask" className="assistant" aria-labelledby={`${uid}-title`}>
      <h2 id={`${uid}-title`}>{t("chat.title")}</h2>
      <p className="hint">{t("chat.hint")}</p>

      <div className="log" role="log" aria-live="polite" aria-relevant="additions">
        {history.map((turn, i) => (
          <p key={i} className={turn.role === "user" ? "turn me" : "turn bot"}>
            {turn.text}
          </p>
        ))}
        {busy && <p className="turn bot">{t("chat.thinking")}</p>}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
      </div>

      {proposals.map((p, i) => (
        <div key={`${p.text}-${i}`} className="proposal">
          <p>
            <strong>{t("chat.propose")}:</strong> {p.text}
          </p>
          <div className="row">
            <button type="button" className="btn btn-primary" onClick={() => approve(i)}>
              {t("chat.approve")}
            </button>
            <button
              type="button"
              className="btn btn-quiet"
              onClick={() => setProposals((all) => all.filter((_, j) => j !== i))}
            >
              {t("chat.dismiss")}
            </button>
          </div>
        </div>
      ))}

      <form onSubmit={ask} className="ask">
        <label htmlFor={`${uid}-q`}>{t("chat.label")}</label>
        <div className="row">
          <input
            id={`${uid}-q`}
            ref={field}
            type="text"
            maxLength={500}
            value={text}
            onChange={(e) => setText(e.target.value)}
            autoComplete="off"
          />
          <button type="submit" className="btn btn-primary" disabled={busy || !text.trim()}>
            {t("chat.send")}
          </button>
        </div>
      </form>
    </section>
  );
}
