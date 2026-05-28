export interface VerticalReaderSettings {
  openBehavior: {
    mobile: "new-tab";
    desktop: "new-tab" | "split-right";
    reuseExistingReaderTab: boolean;
  };
  reading: {
    writingMode: "vertical-rl" | "horizontal-tb";
    pageMode: "paged-scroll" | "continuous";
    tapToTurnPage: boolean;
    swipeToTurnPage: boolean;
    restoreProgress: boolean;
  };
  typography: {
    fontFamily: string;
    fontSize: number;
    lineHeight: number;
    letterSpacing: number;
    paragraphIndent: string;
    paragraphSpacing: string;
  };
  content: {
    hideFrontmatter: boolean;
    showTitleHeader: boolean;
    showSourceUrl: boolean;
    renderAozoraRuby: boolean;
    renderExplicitTcy: boolean;
    horizontalCodeBlocks: boolean;
    horizontalTables: boolean;
  };
  theme: {
    builtInTheme: "system" | "warm-book" | "dark-book" | "high-contrast";
    customCssText: string;
    customCssVaultPath: string | null;
  };
  annotations: {
    enabled: boolean;
    storeMode: "plugin-data";
    dailyNotePathFormat: string;
    extractTemplate: string;
  };
  progressByFile: Record<string, number>;
}

export const DEFAULT_SETTINGS: VerticalReaderSettings = {
  openBehavior: {
    mobile: "new-tab",
    desktop: "new-tab",
    reuseExistingReaderTab: true,
  },
  reading: {
    writingMode: "vertical-rl",
    pageMode: "paged-scroll",
    tapToTurnPage: true,
    swipeToTurnPage: true,
    restoreProgress: true,
  },
  typography: {
    fontFamily: "var(--font-text)",
    fontSize: 18,
    lineHeight: 1.9,
    letterSpacing: 0.03,
    paragraphIndent: "1em",
    paragraphSpacing: "0.75em",
  },
  content: {
    hideFrontmatter: true,
    showTitleHeader: true,
    showSourceUrl: true,
    renderAozoraRuby: false,
    renderExplicitTcy: true,
    horizontalCodeBlocks: true,
    horizontalTables: true,
  },
  theme: {
    builtInTheme: "system",
    customCssText: "",
    customCssVaultPath: null,
  },
  annotations: {
    enabled: false,
    storeMode: "plugin-data",
    dailyNotePathFormat: "Daily/{{YYYY-MM-DD}}.md",
    extractTemplate: "> {{selectedText}}\n\nSource: [[{{sourceFile}}]]\n{{#url}}URL: {{url}}\n{{/url}}Created: {{createdAt}}\n",
  },
  progressByFile: {},
};
