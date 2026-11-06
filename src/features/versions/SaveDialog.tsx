"use client";

import { useState } from "react";
import { NAME_PATTERN } from "@/core/format";
import { CodeBlock, Dialog, Field, identClass, inputClass } from "@/core/ui";
import { saveTableSnippet } from "@/features/snippets/snippets";
import v from "./versions.module.css";

// The save snippet for a dataset. With no dataset given, asks for a new dataset name first.
export function SaveDialog({
  open,
  onClose,
  experiment,
  section,
  dataset,
}: {
  open: boolean;
  onClose: () => void;
  experiment: string;
  section: string;
  dataset?: string;
}) {
  const [name, setName] = useState("");
  const chosen = dataset ?? name.trim();
  const valid = NAME_PATTERN.test(chosen);

  return (
    <Dialog
      open={open}
      onClose={() => {
        setName("");
        onClose();
      }}
      title={dataset ? <>Save snippet for <span className={identClass}>{dataset}</span></> : "Save a new dataset"}
      wide
    >
      {!dataset && (
        <Field
          label="Dataset name"
          id="dataset-name"
          error={name && !valid ? "Use 3 to 63 characters: lowercase letters, digits and underscores, starting with a letter." : null}
          hint="One dataset per table, e.g. features_momentum or labels. It becomes a folder in S3."
        >
          <input
            id="dataset-name"
            className={inputClass}
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="off"
            spellCheck={false}
            aria-describedby="dataset-name-msg"
          />
        </Field>
      )}
      <p className={v.dialogText}>
        Paste this into your notebook once. It never mentions a version number: every run saves the next one and prints it.
        Anything you loaded with a load snippet is recorded as what this version was built from.
      </p>
      {valid ? <CodeBlock code={saveTableSnippet(experiment, section, chosen)} /> : <p className={v.muted}>Enter a dataset name to see the snippet.</p>}
    </Dialog>
  );
}
