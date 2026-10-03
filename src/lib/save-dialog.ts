export function requestSmartSave(url?: string) {
  window.dispatchEvent(
    new CustomEvent("thinkpin:open-save-dialog", {
      detail: { url },
    }),
  );
}
