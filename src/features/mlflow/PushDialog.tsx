"use client";

import { CodeBlock, Dialog } from "@/core/ui";
import { pushMlflowSnippet } from "@/features/snippets/snippets";
import m from "./mlflow.module.css";

export function PushDialog({
  open,
  onClose,
  experiment,
  section,
  finalModel,
}: {
  open: boolean;
  onClose: () => void;
  experiment: string;
  section: string;
  finalModel: boolean;
}) {
  return (
    <Dialog open={open} onClose={onClose} title="Push MLflow results" wide>
      <p className={m.dialogText}>
        Run this from the folder with your mlflow.db once the stage is done. It sends mlflow.db and the artifacts folder together
        as the next version, along with the walk-forward windows you used
        {finalModel ? ", which run is the final model, and how many Optuna trials ran" : ""}.
      </p>
      <CodeBlock code={pushMlflowSnippet(experiment, section, finalModel)} />
    </Dialog>
  );
}
