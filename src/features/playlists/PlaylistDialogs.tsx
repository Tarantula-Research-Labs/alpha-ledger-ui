"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Button, Dialog, inputClass } from "@/core/ui";
import { errorText } from "./playlists";
import pl from "./playlists.module.css";

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  label: string;
  placeholder?: string;
  hint?: string;
  /** What is in the box when the dialog opens (Rename starts with the current name). */
  initial?: string;
  submit: string;
  /** Shown on the button while the server works (reading a playlist from YouTube takes a few seconds). */
  busyText: string;
  /** Does the work with what was typed. Throw to show an error; return to close the dialog. */
  onSubmit: (value: string) => Promise<void>;
}

// One box and one button: used to add a playlist by link, make a playlist, rename it, and add a video by link.
export function TextDialog({ open, onClose, title, label, placeholder, hint, initial = "", submit, busyText, onSubmit }: Props) {
  const [value, setValue] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setValue(initial);
      setError(null);
    }
  }, [open, initial]);

  async function send(e: FormEvent) {
    e.preventDefault();
    if (!value.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await onSubmit(value.trim());
      onClose();
    } catch (err) {
      setError(errorText(err, "That didn't work. Try again."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onClose={busy ? () => {} : onClose} title={title}>
      <form className={pl.form} onSubmit={(e) => void send(e)}>
        <label className={pl.field}>
          {label}
          <input className={inputClass} value={value} onChange={(e) => setValue(e.target.value)} placeholder={placeholder} disabled={busy} autoComplete="off" autoFocus />
        </label>
        {hint && <p className={pl.hint}>{hint}</p>}
        {error && (
          <p className={pl.hint} data-failed role="alert">
            {error}
          </p>
        )}
        <div className={pl.dialogActions}>
          <Button variant="quiet" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={busy || !value.trim()}>
            {busy ? busyText : submit}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
