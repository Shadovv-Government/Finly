const TRANSACTIONS_CHANGED_EVENT = 'finly:transactions-changed';

export function emitTransactionsChanged() {
  window.dispatchEvent(new Event(TRANSACTIONS_CHANGED_EVENT));
}

export function subscribeToTransactionsChanged(callback: () => void) {
  window.addEventListener(TRANSACTIONS_CHANGED_EVENT, callback);
  return () => window.removeEventListener(TRANSACTIONS_CHANGED_EVENT, callback);
}
