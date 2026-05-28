export class SelectionController {
  getSelectedText(): string {
    return window.getSelection()?.toString().trim() ?? "";
  }
}
