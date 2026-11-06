// 06 Model Development. Everything about this section lives in this folder.
import type { SectionDefinition } from "@/core/sections";
import { ModelDevelopmentPanel } from "./Panel";

export const section: SectionDefinition = {
  folder: "06_model_development",
  number: "06",
  title: "Model Development",
  active: true,
  blurb: "Grid search, Optuna tuning and the final model, run in MLflow and pushed here, with the final run marked for later sections.",
  Panel: ModelDevelopmentPanel,
};
