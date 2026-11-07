// Clerk's sign-in and sign-up popups, and the user menu, dressed in Alpha Ledger's theme.
export const clerkAppearance = {
  variables: {
    colorPrimary: "#3b6cf6",
    colorPrimaryForeground: "#ffffff",
    colorBackground: "#0b1222",
    colorForeground: "#e8edf7",
    colorMuted: "#111c33",
    colorMutedForeground: "#8a95ab",
    colorInput: "#070c18",
    colorInputForeground: "#e8edf7",
    colorNeutral: "#e8edf7",
    colorBorder: "rgba(92, 136, 235, 0.38)",
    colorRing: "#5b8bff",
    colorDanger: "#f0505a",
    colorSuccess: "#2fd27a",
    colorWarning: "#e3b341",
    colorShadow: "rgba(0, 0, 0, 0.6)",
    colorModalBackdrop: "rgba(2, 4, 10, 0.72)",
    fontFamily: "Poppins, system-ui, sans-serif",
    fontFamilyButtons: "Poppins, system-ui, sans-serif",
    fontFamilyMono: "'IBM Plex Mono', ui-monospace, monospace",
    borderRadius: "8px",
  },
  elements: {
    cardBox: {
      border: "1px solid rgba(92, 136, 235, 0.38)",
      boxShadow: "0 30px 80px rgba(0, 0, 0, 0.7), 0 0 24px rgba(59, 108, 246, 0.25)",
    },
    formButtonPrimary: {
      background: "linear-gradient(180deg, #4877ff, #2f5ce8)",
      boxShadow: "0 0 18px rgba(59, 108, 246, 0.35)",
    },
  },
};

// The user menu inside the app when the graphite (light) theme is on.
export const clerkGraphiteAppearance = {
  variables: {
    colorPrimary: "#4b5561",
    colorPrimaryForeground: "#eef1f4",
    colorBackground: "#1f2226",
    colorForeground: "#e4e7eb",
    colorMuted: "#2b2f34",
    colorMutedForeground: "#9aa1a9",
    colorInput: "#17191c",
    colorInputForeground: "#e4e7eb",
    colorNeutral: "#e4e7eb",
    colorBorder: "#34383e",
    colorRing: "#9fb3cc",
    colorDanger: "#e5675f",
    colorSuccess: "#4cc38a",
    colorShadow: "rgba(0, 0, 0, 0.5)",
    fontFamily: "Inter, system-ui, sans-serif",
    fontFamilyButtons: "Inter, system-ui, sans-serif",
    borderRadius: "8px",
  },
  elements: {
    userButtonPopoverCard: { border: "1px solid #34383e", boxShadow: "0 18px 50px rgba(0, 0, 0, 0.55)" },
  },
};

// The user menu inside the app when the dark theme is on.
export const clerkDarkAppearance = {
  variables: {
    ...clerkGraphiteAppearance.variables,
    colorPrimary: "#5d6c7d",
    colorBackground: "#0d0f12",
    colorMuted: "#16191d",
    colorInput: "#08090b",
    colorBorder: "rgba(255, 255, 255, 0.14)",
    colorRing: "#8fb4dc",
  },
  elements: {
    userButtonPopoverCard: { border: "1px solid rgba(255, 255, 255, 0.14)", boxShadow: "0 18px 50px rgba(0, 0, 0, 0.7)" },
  },
};
