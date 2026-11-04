// All UI strings live here so other languages (e.g. Italian) can be added later.
export const strings = {
  appName: "Kakitai",
  tabs: {
    home: "Home",
    learn: "Learn",
    review: "Review",
    write: "Write",
    settings: "Settings",
  },
  home: {
    greeting: "書きたい",
    subtitle: "Learn Japanese by writing it.",
    due: (n: number) => `${n} due`,
    start: "Start",
  },
  placeholder: "Coming soon.",
} as const;
