"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button, Dialog, Field, inputClass } from "@/core/ui";
import { useLedger } from "@/data/LedgerProvider";
import x from "./experiments.module.css";

export function CreateExperimentDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const { createExperiment } = useLedger();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function close() {
    setName("");
    setDescription("");
    setError(null);
    onClose();
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    const problem = await createExperiment(name.trim(), description);
    setBusy(false);
    if (problem) {
      setError(problem);
      return;
    }
    const created = name.trim();
    close();
    // Next stop is the Data Pipeline, which asks where this experiment's data comes from.
    router.push(`/experiments/${created}/01_data_pipeline`);
  }

  return (
    <Dialog open={open} onClose={close} title="New experiment">
      <form onSubmit={submit}>
        <Field
          label="Name"
          id="exp-name"
          error={error}
          hint="Lowercase letters, digits and underscores. It becomes the experiment's folder in S3, e.g. mom12d_midcap150."
        >
          <input
            id="exp-name"
            className={inputClass}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError(null);
            }}
            autoComplete="off"
            spellCheck={false}
            aria-describedby="exp-name-msg"
            aria-invalid={error ? true : undefined}
            required
          />
        </Field>
        <Field label="Description" id="exp-desc" hint="What this experiment is testing. Optional.">
          <textarea id="exp-desc" className={inputClass} rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
        <p className={x.dialogNote}>
          Creates the experiment folder and all six section folders. Next, the Data Pipeline asks where its data comes from.
        </p>
        <div className={x.dialogActions}>
          <Button variant="quiet" onClick={close}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={busy}>
            {busy ? "Creating…" : "Create experiment"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
