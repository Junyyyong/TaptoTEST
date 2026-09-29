/** Never silently replace unreadable saves with a new game. */
export class StorageNotice {
  private readonly panel = document.createElement("section");
  private readonly message = document.createElement("p");
  private readonly retry = document.createElement("button");
  constructor() {
    this.panel.id = "storage-notice";
    this.panel.className = "storage-notice";
    this.panel.hidden = true;
    this.panel.setAttribute("role", "alert");
    this.retry.textContent = "Retry";
    this.panel.append(this.message, this.retry);
    document.body.append(this.panel);
  }
  show(blocking: boolean, action: () => Promise<void>): void {
    this.panel.hidden = false;
    this.panel.classList.toggle("storage-blocking", blocking);
    document.getElementById("app")!.inert = blocking;
    this.message.textContent = blocking
      ? "Unable to load saved progress.\nYour data has not been reset.\nPlease retry."
      : "Progress not saved yet.\nKeep the app open and retry.";
    this.retry.onclick = async () => {
      this.retry.disabled = true;
      try { await action(); } catch { /* Keep the notice and original data. */ }
      finally { this.retry.disabled = false; }
    };
    if (blocking) this.retry.focus();
  }
  hide(): void {
    this.panel.hidden = true;
    this.panel.classList.remove("storage-blocking");
    document.getElementById("app")!.inert = false;
  }
}
