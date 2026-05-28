import { Notice, PluginSettingTab, Setting, TFile } from "obsidian";
import type MobileVerticalReaderPlugin from "./main";

export class VerticalReaderSettingTab extends PluginSettingTab {
  constructor(private readonly plugin: MobileVerticalReaderPlugin) {
    super(plugin.app, plugin);
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "Mobile Vertical Reader" });

    new Setting(containerEl)
      .setName("Desktop open behavior")
      .setDesc("Mobile always opens in a new tab. Desktop can optionally open in a right split.")
      .addDropdown((dropdown) =>
        dropdown
          .addOption("new-tab", "New tab")
          .addOption("split-right", "Split right")
          .setValue(this.plugin.settings.openBehavior.desktop)
          .onChange(async (value) => {
            this.plugin.settings.openBehavior.desktop =
              value === "split-right" ? "split-right" : "new-tab";
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName("Reuse existing reader tab")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.openBehavior.reuseExistingReaderTab)
          .onChange(async (value) => {
            this.plugin.settings.openBehavior.reuseExistingReaderTab = value;
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName("Font size")
      .setDesc("Reader body font size in pixels.")
      .addSlider((slider) =>
        slider
          .setLimits(14, 28, 1)
          .setDynamicTooltip()
          .setValue(this.plugin.settings.typography.fontSize)
          .onChange(async (value) => {
            this.plugin.settings.typography.fontSize = value;
            await this.plugin.saveSettingsAndRefreshViews();
          }),
      );

    new Setting(containerEl)
      .setName("Line height")
      .addSlider((slider) =>
        slider
          .setLimits(1.4, 2.4, 0.1)
          .setDynamicTooltip()
          .setValue(this.plugin.settings.typography.lineHeight)
          .onChange(async (value) => {
            this.plugin.settings.typography.lineHeight = value;
            await this.plugin.saveSettingsAndRefreshViews();
          }),
      );

    new Setting(containerEl)
      .setName("Built-in theme")
      .addDropdown((dropdown) =>
        dropdown
          .addOption("system", "System")
          .addOption("warm-book", "Warm book")
          .addOption("dark-book", "Dark book")
          .addOption("high-contrast", "High contrast")
          .setValue(this.plugin.settings.theme.builtInTheme)
          .onChange(async (value) => {
            this.plugin.settings.theme.builtInTheme = toBuiltInTheme(value);
            await this.plugin.saveSettingsAndRefreshViews();
          }),
      );

    new Setting(containerEl)
      .setName("Custom CSS text")
      .setDesc("Applied inside the reader view after the built-in styles.")
      .addTextArea((text) => {
        text.inputEl.rows = 6;
        text
          .setPlaceholder(".vreader-root { ... }")
          .setValue(this.plugin.settings.theme.customCssText)
          .onChange(async (value) => {
            this.plugin.settings.theme.customCssText = value;
            await this.plugin.saveSettingsAndRefreshViews();
          });
      });

    new Setting(containerEl)
      .setName("Custom CSS vault path")
      .setDesc("Example: Vertical Reader Themes/warm-book.css")
      .addText((text) =>
        text
          .setPlaceholder("Vertical Reader Themes/theme.css")
          .setValue(this.plugin.settings.theme.customCssVaultPath ?? "")
          .onChange(async (value) => {
            this.plugin.settings.theme.customCssVaultPath = value.trim() || null;
            await this.plugin.saveSettingsAndRefreshViews();
          }),
      )
      .addButton((button) =>
        button.setButtonText("Test").onClick(async () => {
          const path = this.plugin.settings.theme.customCssVaultPath;
          const file = path ? this.app.vault.getAbstractFileByPath(path) : null;
          new Notice(file instanceof TFile ? "CSS file found." : "CSS file not found.");
        }),
      );

    new Setting(containerEl)
      .setName("Aozora ruby")
      .setDesc("Render ｜base《ruby》 markup. Disabled by default.")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.content.renderAozoraRuby)
          .onChange(async (value) => {
            this.plugin.settings.content.renderAozoraRuby = value;
            await this.plugin.saveSettingsAndRefreshViews();
          }),
      );
  }
}

function toBuiltInTheme(value: string): "system" | "warm-book" | "dark-book" | "high-contrast" {
  if (value === "warm-book" || value === "dark-book" || value === "high-contrast") {
    return value;
  }

  return "system";
}
