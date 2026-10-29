type Listener = (completed: boolean) => void;

const listeners = new Set<Listener>();
let completed = false;

function notify() {
  for (const listener of listeners) listener(completed);
}

export function isOnboardingCompleted() {
  return completed;
}

export function completeOnboarding() {
  completed = true;
  notify();
}

export function resetOnboarding() {
  completed = false;
  notify();
}

export function subscribeOnboardingState(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
