import { Notice, Platform, Plugin, TFile, WorkspaceLeaf, normalizePath } from "obsidian";
import { AnnotationStore } from "./AnnotationStore";
import { VerticalReaderSettingTab } from "./SettingTab";
import { SelectionController } from "./SelectionController";
import { VerticalReaderView, VIEW_TYPE_VERTICAL_READER } from "./VerticalReaderView";
import { DEFAULT_SETTINGS, type VerticalReaderSettings } from "./settings";

export default class MobileVerticalReaderPlugin extends Plugin {
  settings: VerticalReaderSettings = DEFAULT_SETTINGS;
  readonly annotations = new AnnotationStore();
  readonly selection = new SelectionController();

  async onload(): Promise<void> {
    await this.loadSettings();

    this.registerView(
      VIEW_TYPE_VERTICAL_READER,
      (leaf) => new VerticalReaderView(leaf, this),
    );

    this.addCommand({
      id: "open-current-note-in-vertical-reader",
      name: "Open current note in vertical reader",
      checkCallback: (checking) => {
        const file = this.app.workspace.getActiveFile();
        const canOpen = file instanceof TFile && file.extension === "md";
        if (checking) {
          return canOpen;
        }

        if (!canOpen || !file) {
          new Notice("Open a Markdown note first.");
          return false;
        }

        void this.openFile(file);
        return true;
      },
    });

    this.registerEvent(
      this.app.workspace.on("file-menu", (menu, file) => {
        if (!(file instanceof TFile) || file.extension !== "md") {
          return;
        }

        menu.addItem((item) => {
          item
            .setTitle("Read vertically")
            .setIcon("book-open")
            .onClick(() => {
              void this.openFile(file);
            });
        });
      }),
    );

    this.addSettingTab(new VerticalReaderSettingTab(this));
  }

  async openFile(file: TFile): Promise<void> {
    const path = normalizePath(file.path);
    const existing = this.findExistingLeaf(path);
    if (existing) {
      this.app.workspace.setActiveLeaf(existing, { focus: true });
      return;
    }

    const leaf = this.getTargetLeaf();
    await leaf.setViewState({
      type: VIEW_TYPE_VERTICAL_READER,
      state: { filePath: path },
      active: true,
    });
    this.app.workspace.setActiveLeaf(leaf, { focus: true });
  }

  async loadSettings(): Promise<void> {
    this.settings = mergeSettings(DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  async saveSettingsAndRefreshViews(): Promise<void> {
    await this.saveSettings();
    for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE_VERTICAL_READER)) {
      const view = leaf.view;
      if (view instanceof VerticalReaderView) {
        await view.refresh();
      }
    }
  }

  async loadCustomThemeCss(): Promise<string> {
    const inlineCss = this.settings.theme.customCssText;
    const cssPath = this.settings.theme.customCssVaultPath;
    if (!cssPath) {
      return inlineCss;
    }

    const file = this.app.vault.getAbstractFileByPath(normalizePath(cssPath));
    if (!(file instanceof TFile)) {
      return inlineCss;
    }

    const fileCss = await this.app.vault.cachedRead(file);
    return `${inlineCss}\n${fileCss}`;
  }

  private findExistingLeaf(filePath: string): WorkspaceLeaf | null {
    if (!this.settings.openBehavior.reuseExistingReaderTab) {
      return null;
    }

    return (
      this.app.workspace
        .getLeavesOfType(VIEW_TYPE_VERTICAL_READER)
        .find((leaf) => {
          const state = leaf.getViewState().state as { filePath?: string } | undefined;
          return state?.filePath === filePath;
        }) ?? null
    );
  }

  private getTargetLeaf(): WorkspaceLeaf {
    if (!Platform.isMobile && this.settings.openBehavior.desktop === "split-right") {
      return this.app.workspace.getLeaf("split", "vertical");
    }

    return this.app.workspace.getLeaf("tab");
  }
}

function mergeSettings(
  defaults: VerticalReaderSettings,
  loaded: Partial<VerticalReaderSettings> | null,
): VerticalReaderSettings {
  return {
    ...defaults,
    ...loaded,
    openBehavior: {
      ...defaults.openBehavior,
      ...loaded?.openBehavior,
    },
    reading: {
      ...defaults.reading,
      ...loaded?.reading,
    },
    typography: {
      ...defaults.typography,
      ...loaded?.typography,
    },
    content: {
      ...defaults.content,
      ...loaded?.content,
    },
    theme: {
      ...defaults.theme,
      ...loaded?.theme,
    },
    annotations: {
      ...defaults.annotations,
      ...loaded?.annotations,
    },
    progressByFile: {
      ...defaults.progressByFile,
      ...loaded?.progressByFile,
    },
  };
}
