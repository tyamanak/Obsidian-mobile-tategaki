import {
  ItemView,
  MarkdownRenderer,
  Notice,
  TFile,
  ViewStateResult,
  WorkspaceLeaf,
  normalizePath,
} from "obsidian";
import type MobileVerticalReaderPlugin from "./main";
import { splitFrontmatter } from "./frontmatter";
import { PagingController } from "./paging";
import { preprocessMarkdown } from "./preprocessMarkdown";

export const VIEW_TYPE_VERTICAL_READER = "mobile-vertical-reader-view";

interface VerticalReaderState extends Record<string, unknown> {
  filePath?: string;
}

export class VerticalReaderView extends ItemView {
  private filePath: string | null = null;
  private rootEl: HTMLDivElement | null = null;
  private scrollerEl: HTMLDivElement | null = null;
  private contentElRef: HTMLElement | null = null;
  private titleEl: HTMLDivElement | null = null;
  private metaEl: HTMLDivElement | null = null;
  private progressEl: HTMLDivElement | null = null;
  private customStyleEl: HTMLStyleElement | null = null;
  private paging: PagingController | null = null;
  private uiVisible = true;

  constructor(
    leaf: WorkspaceLeaf,
    private readonly plugin: MobileVerticalReaderPlugin,
  ) {
    super(leaf);
  }

  getViewType(): string {
    return VIEW_TYPE_VERTICAL_READER;
  }

  getDisplayText(): string {
    const file = this.getFile();
    return file ? `Vertical Reader: ${file.basename}` : "Vertical Reader";
  }

  getIcon(): string {
    return "book-open";
  }

  async setState(state: Record<string, unknown>, result: ViewStateResult): Promise<void> {
    await super.setState(state, result);
    this.filePath = typeof state.filePath === "string" ? normalizePath(state.filePath) : null;

    if (this.rootEl) {
      await this.render();
    }
  }

  getState(): Record<string, unknown> {
    return {
      ...super.getState(),
      filePath: this.filePath ?? undefined,
    };
  }

  async onOpen(): Promise<void> {
    try {
      this.buildShell();
    } catch (error) {
      this.showFatalShellError(error);
      return;
    }

    this.registerVaultEvents();
    await this.render();
  }

  async onClose(): Promise<void> {
    this.paging?.destroy();
    this.paging = null;
  }

  async refresh(): Promise<void> {
    await this.render();
  }

  private buildShell(): void {
    const container = this.contentEl;
    container.empty();
    container.addClass("vreader-view-content");

    this.rootEl = container.createDiv({
      cls: "vreader-root",
      attr: {
        "data-theme": this.plugin.settings.theme.builtInTheme,
        "data-ui": "visible",
      },
    });

    this.applyCssVariables();

    const topbar = this.rootEl.createDiv({ cls: "vreader-topbar" });
    const backButton = topbar.createEl("button", {
      cls: "vreader-button vreader-back-button",
      attr: { "aria-label": "Back" },
      text: "Back",
    });
    this.titleEl = topbar.createDiv({ cls: "vreader-title" });
    const settingsButton = topbar.createEl("button", {
      cls: "vreader-button vreader-settings-button",
      attr: { "aria-label": "Settings" },
      text: "Settings",
    });

    const stage = this.rootEl.createDiv({ cls: "vreader-stage" });
    this.scrollerEl = stage.createDiv({ cls: "vreader-scroller" });
    this.contentElRef = this.scrollerEl.createEl("article", {
      cls: "vreader-content markdown-rendered",
    });

    const bottombar = this.rootEl.createDiv({ cls: "vreader-bottombar" });
    const prevButton = bottombar.createEl("button", {
      cls: "vreader-button vreader-prev",
      attr: { "aria-label": "Previous page" },
      text: "Prev",
    });
    this.progressEl = bottombar.createDiv({ cls: "vreader-progress", text: "0%" });
    const nextButton = bottombar.createEl("button", {
      cls: "vreader-button vreader-next",
      attr: { "aria-label": "Next page" },
      text: "Next",
    });
    this.metaEl = this.rootEl.createDiv({ cls: "vreader-meta" });

    this.registerDomEvent(backButton, "click", () => this.leaf.detach());
    this.registerDomEvent(settingsButton, "click", () => {
      const appWithSettings = this.app as typeof this.app & {
        setting?: { open(): void; openTabById(id: string): void };
      };
      appWithSettings.setting?.open();
      appWithSettings.setting?.openTabById(this.plugin.manifest.id);
    });
    this.registerDomEvent(prevButton, "click", () => this.paging?.previous());
    this.registerDomEvent(nextButton, "click", () => this.paging?.next());

    this.paging = new PagingController(this.scrollerEl, this.plugin.settings, {
      onProgressChange: (progress) => this.saveProgress(progress),
      onUiToggle: () => this.toggleUi(),
    });

    this.registerDomEvent(this.scrollerEl, "click", (event) => {
      const target = event.target;
      if (
        event.defaultPrevented ||
        (target instanceof Element && target.closest("a, button, input, textarea, select"))
      ) {
        return;
      }
      this.paging?.handleTap(event.clientX);
    });
    this.registerDomEvent(this.scrollerEl, "touchstart", (event) => this.paging?.handleTouchStart(event));
    this.registerDomEvent(this.scrollerEl, "touchend", (event) => this.paging?.handleTouchEnd(event));
    this.registerDomEvent(this.scrollerEl, "scroll", () => this.paging?.handleScroll());
    this.registerDomEvent(window, "resize", () => this.paging?.handleResize());
  }

  private async render(): Promise<void> {
    if (!this.rootEl || !this.contentElRef || !this.titleEl) {
      return;
    }

    try {
      this.applyCssVariables();
      await this.injectCustomCss();

      const file = this.getFile();
      this.contentElRef.empty();

      if (!file) {
        this.titleEl.setText("No Markdown file");
        this.contentElRef.createDiv({
          cls: "vreader-empty",
          text: "Open a Markdown note, then run the vertical reader command again.",
        });
        return;
      }

      const raw = await this.app.vault.cachedRead(file);
      const parsed = splitFrontmatter(raw);
      const markdown = preprocessMarkdown(
        this.plugin.settings.content.hideFrontmatter ? parsed.body : raw,
        {
          renderAozoraRuby: this.plugin.settings.content.renderAozoraRuby,
          renderExplicitTcy: this.plugin.settings.content.renderExplicitTcy,
        },
      );
      const title = parsed.data.title || file.basename;

      this.titleEl.setText(title);
      this.renderMeta(parsed.data);
      await MarkdownRenderer.render(this.app, markdown, this.contentElRef, file.path, this);

      if (!this.contentElRef.textContent?.trim() && markdown.trim()) {
        this.renderPlainTextFallback(markdown);
      }

      this.postprocessRenderedHtml();

      const progress = this.plugin.settings.reading.restoreProgress
        ? this.plugin.settings.progressByFile[file.path] ?? 0
        : 0;
      this.paging?.restore(progress);
    } catch (error) {
      this.showRenderError(error);
    }
  }

  private renderMeta(frontmatter: Record<string, string>): void {
    if (!this.metaEl) {
      return;
    }

    this.metaEl.empty();
    if (!this.plugin.settings.content.showSourceUrl) {
      return;
    }

    const source = frontmatter.source || frontmatter.url;
    if (!source) {
      return;
    }

    this.metaEl.createEl("a", {
      cls: "vreader-source",
      text: source,
      href: source,
    });
  }

  private postprocessRenderedHtml(): void {
    if (!this.contentElRef) {
      return;
    }

    this.contentElRef.toggleClass(
      "vreader-horizontal-code",
      this.plugin.settings.content.horizontalCodeBlocks,
    );
    this.contentElRef.toggleClass(
      "vreader-horizontal-tables",
      this.plugin.settings.content.horizontalTables,
    );

    for (const image of this.contentElRef.querySelectorAll("img")) {
      image.setAttribute("loading", "lazy");
    }
  }

  private registerVaultEvents(): void {
    this.registerEvent(
      this.app.vault.on("modify", (file) => {
        if (file instanceof TFile && file.path === this.filePath) {
          void this.render();
        }
      }),
    );

    this.registerEvent(
      this.app.vault.on("rename", (file, oldPath) => {
        if (oldPath === this.filePath && file instanceof TFile && file.extension === "md") {
          this.filePath = file.path;
          void this.leaf.setViewState({
            type: VIEW_TYPE_VERTICAL_READER,
            state: { filePath: file.path },
            active: true,
          });
          void this.render();
        }
      }),
    );

    this.registerEvent(
      this.app.vault.on("delete", (file) => {
        if (file.path === this.filePath) {
          new Notice("The source note was deleted.");
          void this.leaf.detach();
        }
      }),
    );
  }

  private saveProgress(progress: number): void {
    const file = this.getFile();
    if (!file) {
      return;
    }

    this.plugin.settings.progressByFile[file.path] = progress;
    this.progressEl?.setText(`${Math.round(progress * 100)}%`);
    void this.plugin.saveSettings();
  }

  private toggleUi(): void {
    this.uiVisible = !this.uiVisible;
    this.rootEl?.setAttribute("data-ui", this.uiVisible ? "visible" : "hidden");
  }

  private applyCssVariables(): void {
    if (!this.rootEl) {
      return;
    }

    const { typography, reading, theme } = this.plugin.settings;
    this.rootEl.setAttribute("data-theme", theme.builtInTheme);
    this.rootEl.style.setProperty("--vreader-font-family", typography.fontFamily);
    this.rootEl.style.setProperty("--vreader-font-size", `${typography.fontSize}px`);
    this.rootEl.style.setProperty("--vreader-line-height", String(typography.lineHeight));
    this.rootEl.style.setProperty("--vreader-letter-spacing", `${typography.letterSpacing}em`);
    this.rootEl.style.setProperty("--vreader-paragraph-indent", typography.paragraphIndent);
    this.rootEl.style.setProperty("--vreader-paragraph-spacing", typography.paragraphSpacing);
    this.rootEl.style.setProperty("--vreader-writing-mode", reading.writingMode);
  }

  private async injectCustomCss(): Promise<void> {
    if (!this.rootEl) {
      return;
    }

    this.customStyleEl?.remove();
    this.customStyleEl = null;

    const css = await this.plugin.loadCustomThemeCss();
    if (!css.trim()) {
      return;
    }

    this.customStyleEl = this.rootEl.createEl("style", {
      attr: { "data-vreader-user-theme": "true" },
      text: css,
    });
  }

  private renderPlainTextFallback(markdown: string): void {
    if (!this.contentElRef) {
      return;
    }

    this.contentElRef.empty();
    for (const paragraph of markdown.split(/\n{2,}/)) {
      const text = paragraph.trim();
      if (text) {
        this.contentElRef.createEl("p", { text });
      }
    }
  }

  private showRenderError(error: unknown): void {
    if (!this.contentElRef || !this.titleEl) {
      return;
    }

    const message = error instanceof Error ? error.message : String(error);
    this.titleEl.setText("Vertical Reader error");
    this.contentElRef.empty();
    this.contentElRef.createDiv({
      cls: "vreader-error",
      text: `Could not render this note: ${message}`,
    });
    console.error("Mobile Vertical Reader render failed", error);
  }

  private showFatalShellError(error: unknown): void {
    const message = error instanceof Error ? error.message : String(error);
    this.contentEl.empty();
    this.contentEl.addClass("vreader-view-content");
    this.contentEl.createDiv({
      cls: "vreader-root vreader-error-root",
      text: `Could not open Vertical Reader: ${message}`,
    });
    console.error("Mobile Vertical Reader failed to open", error);
  }

  private getFile(): TFile | null {
    if (!this.filePath) {
      return null;
    }

    const file = this.app.vault.getAbstractFileByPath(this.filePath);
    return file instanceof TFile && file.extension === "md" ? file : null;
  }
}
