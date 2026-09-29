import { el } from "../dom";

/** Local static documents: no external navigation, consent gate or save changes. */
export class LegalDocuments {
  private readonly dialog = el<HTMLDialogElement>("legal-dialog");
  private readonly frame = el<HTMLIFrameElement>("legal-frame");
  private readonly title = el<HTMLHeadingElement>("legal-title");
  private opener: HTMLButtonElement | null = null;
  get isOpen(): boolean { return this.dialog.open; }

  constructor() {
    const close = () => this.dialog.close();
    el<HTMLButtonElement>("btn-legal-close").addEventListener("click", close);
    this.dialog.addEventListener("close", () => {
      // A queued close event must not blank a document that was just reopened.
      if (this.dialog.open) return;
      this.frame.removeAttribute("src");
      this.opener?.focus();
    });
    // Escape inside an iframe does not bubble to the parent dialog.
    this.frame.addEventListener("load", () => {
      this.frame.contentDocument?.addEventListener("keydown", event => {
        if (event.key === "Escape") { event.preventDefault(); close(); }
      });
    });
    for (const [id, url, title] of [
      ["btn-privacy", "./privacy.html", "Privacy policy"],
      ["btn-licenses", "./licenses.html", "Open-source licenses"],
    ] as const) {
      const button = el<HTMLButtonElement>(id);
      button.addEventListener("click", () => {
        this.opener = button;
        this.title.textContent = title;
        this.frame.title = title;
        this.frame.src = url;
        this.dialog.showModal();
      });
    }
  }
}
