"use client";

import Link from "next/link";
import type { SectionMeta } from "@/core/sections";
import { StatusMark, VersionTicks, identClass } from "@/core/ui";
import { LedgerMark } from "@/core/ui/LedgerMark";
import { CodeIcon, LineageIcon, LockIcon, SectionIcon, TrendIcon, VersionsIcon } from "@/core/ui/icons";
import { AccountMenu, AutoOpenAuth, LogInButton, OpenAppButton, SignUpButtonLedger, SignedIn, SignedOut } from "@/features/auth/AuthActions";
import l from "./landing.module.css";

const KEEPS = [
  {
    Icon: () => <SectionIcon name="database" />,
    title: "Frozen snapshots",
    text: "Data is pulled from your datalake once and frozen. Every later stage reads the snapshot, never the live data, so reruns give the same answer.",
  },
  {
    Icon: VersionsIcon,
    title: "Features and labels, kept apart",
    text: "One dataset per feature group, labels on their own, joined only when you load them. Adding a feature group never touches the others.",
  },
  {
    Icon: TrendIcon,
    title: "MLflow results in one place",
    text: "Run baselines and models locally, then push mlflow.db and the artifacts. Runs, settings and scores appear in the app.",
  },
  {
    Icon: LineageIcon,
    title: "Lineage for every version",
    text: "Each version records what it was built from, its settings and the git commit, so any result traces back to its data and code.",
  },
  {
    Icon: LockIcon,
    title: "A sealed final test",
    text: "A test period set aside at the start and locked until the model is final, so the last check stays honest. Coming with the later sections.",
  },
  {
    Icon: CodeIcon,
    title: "Snippets, not libraries",
    text: "Plain Python calls to one server. Nothing to install in your notebooks, and the snippet never mentions a version number.",
  },
];

const STEPS = [
  {
    title: "Copy a snippet once",
    text: "Each section gives you a short Python snippet. Paste it into your notebook once; it names the experiment and dataset, never a version.",
  },
  {
    title: "Every run saves a new version",
    text: "Run the cell again and the next version is saved: v1, v2, v3. Nothing is ever overwritten, so earlier results stay reproducible.",
  },
  {
    title: "Trace and compare",
    text: "Open any version to see what it was built from and what was built from it. Compare models trained on exactly the same data.",
  },
];

export function LandingPage({ sections }: { sections: SectionMeta[] }) {
  return (
    <div className={l.page}>
      <a href="#main" className={l.skip}>
        Skip to content
      </a>
      <header className={l.bar}>
        <div className={l.barInner}>
          <Link href="/" className={l.brand}>
            <LedgerMark size={30} />
            <span>Alpha Ledger</span>
          </Link>
          <nav className={l.anchors} aria-label="On this page">
            <a href="#how">How it works</a>
            <a href="#keeps">What it keeps</a>
            <a href="#pipeline">Pipeline</a>
          </nav>
          <div className={l.auth}>
            <SignedOut>
              <LogInButton />
              <SignUpButtonLedger />
            </SignedOut>
            <SignedIn>
              <OpenAppButton />
              <AccountMenu />
            </SignedIn>
          </div>
        </div>
      </header>

      <main id="main">
        {/* ---------- Hero ---------- */}
        <section className={l.hero}>
          <div className={l.heroInner}>
            <div className={l.heroText}>
              <h1 className={l.h1}>Every version of your research, and what it was built from.</h1>
              <p className={l.lead}>
                Alpha Ledger keeps each stage of your ML trading research, from frozen data to features, labels, baselines and
                models, as numbered versions linked together. Any result traces back to the exact data and code that made it.
              </p>
              <div className={l.ctas}>
                <SignedOut>
                  <SignUpButtonLedger className={l.ctaMain}>Get started</SignUpButtonLedger>
                  <LogInButton variant="default" className={l.ctaAlt} />
                </SignedOut>
                <SignedIn>
                  <OpenAppButton className={l.ctaLink}>Open your experiments</OpenAppButton>
                </SignedIn>
              </div>
              <p className={l.small}>Your notebooks do the computing. Alpha Ledger keeps the record.</p>
            </div>

            <HeroPreview />
          </div>
        </section>

        {/* ---------- How it works ---------- */}
        <section id="how" className={l.section}>
          <h2 className={l.h2}>How it works</h2>
          <p className={l.sub}>Three steps, and the plumbing disappears from your notebooks.</p>
          <ol className={l.steps}>
            {STEPS.map((s, i) => (
              <li key={s.title} className={l.step}>
                <span className={l.stepNum} aria-hidden="true">
                  {i + 1}
                </span>
                <h3 className={l.h3}>{s.title}</h3>
                <p className={l.text}>{s.text}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* ---------- What it keeps ---------- */}
        <section id="keeps" className={l.section}>
          <h2 className={l.h2}>What it keeps for you</h2>
          <p className={l.sub}>Built for honest research: same data for every model, nothing overwritten, nothing untraceable.</p>
          <div className={l.keeps}>
            {KEEPS.map(({ Icon, title, text }) => (
              <div key={title} className={l.keep}>
                <span className={l.keepIcon}>
                  <Icon />
                </span>
                <h3 className={l.h3}>{title}</h3>
                <p className={l.text}>{text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ---------- Pipeline ---------- */}
        <section id="pipeline" className={l.section}>
          <h2 className={l.h2}>Follows your research pipeline</h2>
          <p className={l.sub}>Every experiment has the same sections, in order. Each one stands alone, so replacing one never breaks another.</p>
          <ol className={l.pipeline}>
            {sections.map((s) => (
              <li key={s.folder} className={l.stage} data-active={s.active}>
                <span className={l.stageTop}>
                  <span className={l.stageNum}>{s.number}</span>
                  <SectionIcon name={s.icon} />
                </span>
                <span className={l.stageTitle}>{s.title}</span>
                <span className={l.stageNote}>{s.active ? `${s.blurb.split(". ")[0].replace(/\.$/, "")}.` : "Skipped for now."}</span>
              </li>
            ))}
          </ol>
        </section>

        {/* ---------- Closing ---------- */}
        <section className={l.section}>
          <div className={l.closing}>
            <div>
              <h2 className={l.h2}>Start with your first experiment</h2>
              <p className={l.text}>Create an experiment, choose where its data comes from, and save your first snapshot from a notebook.</p>
            </div>
            <SignedOut>
              <SignUpButtonLedger className={l.ctaMain}>Get started</SignUpButtonLedger>
            </SignedOut>
            <SignedIn>
              <OpenAppButton className={l.ctaLink}>Open your experiments</OpenAppButton>
            </SignedIn>
          </div>
        </section>
      </main>

      <footer className={l.footer}>
        <span className={l.brandSmall}>
          <LedgerMark size={20} />
          Alpha Ledger
        </span>
        <span>Versioned, traceable ML trading research.</span>
      </footer>

      <AutoOpenAuth />
    </div>
  );
}

// A still picture of the product: a notebook save, the version history it adds to, and its lineage.
function HeroPreview() {
  const rows = [
    { v: 4, status: "complete" as const, when: "Just now", from: "snapshot v2, universe_pit v1" },
    { v: 3, status: "complete" as const, when: "22 Oct 2026", from: "snapshot v2, universe_pit v1" },
    { v: 2, status: "complete" as const, when: "21 Oct 2026", from: "snapshot v2, universe_pit v1" },
    { v: 1, status: "complete" as const, when: "15 Oct 2026", from: "snapshot v1, universe_pit v1" },
  ];
  return (
    <div className={l.preview} aria-label="Example: saving a new version of features_momentum" role="img">
      <div className={l.cell}>
        <span className={l.cellLabel}>In [12]</span>
        <code className={l.cellCode}>
          save_features_momentum(df, settings={"{"}&quot;lookback_days&quot;: [5, 21, 63]{"}"})
        </code>
        <code className={l.cellOut}>Saved features_momentum version 4</code>
      </div>

      <div className={l.ledger}>
        <div className={l.ledgerHead}>
          <span className={`${l.ledgerName} ${identClass}`}>features_momentum</span>
          <VersionTicks versions={rows.map((r) => ({ version: r.v, status: r.status })).reverse()} />
        </div>
        <ul className={l.ledgerRows}>
          {rows.map((r) => (
            <li key={r.v} data-new={r.v === 4}>
              <span className={l.ver}>v{r.v}</span>
              <StatusMark status={r.status} />
              <span className={l.when}>{r.when}</span>
              <span className={`${l.from} ${identClass}`}>{r.from}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className={l.chain}>
        <span className={`${l.chip} ${identClass}`}>snapshot v2</span>
        <span className={l.arrow} aria-hidden="true" />
        <span className={`${l.chip} ${l.chipOn} ${identClass}`}>features_momentum v4</span>
        <span className={l.arrow} aria-hidden="true" />
        <span className={`${l.chip} ${identClass}`}>baseline mlflow v2</span>
      </div>
    </div>
  );
}
