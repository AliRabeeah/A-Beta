// A minimal event bus. Context files (TaskContext, NoteContext, etc.) call
// emitUndo() right after soft-deleting something; UndoSnackbarHost (mounted
// once near the root) is the only subscriber and renders the actual banner.
let listeners = [];

export function subscribeUndo(callback) {
  listeners.push(callback);
  return () => {
    listeners = listeners.filter((l) => l !== callback);
  };
}

export function emitUndo(payload) {
  listeners.forEach((l) => l(payload));
}
