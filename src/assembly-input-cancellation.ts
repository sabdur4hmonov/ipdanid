// Tiny synchronous fence shared by manual navigation and lazy experimental tools.
const listeners = new Set<() => void>();
export function registerAssemblyInput(cancel: () => void) {
  listeners.add(cancel);
  return () => {
    listeners.delete(cancel);
  };
}
export function cancelAssemblyInputs() {
  for (const cancel of [...listeners]) {
    try {
      cancel();
    } catch {}
  }
}
