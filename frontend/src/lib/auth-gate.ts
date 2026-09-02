import type { AuthScope } from "@/lib/auth-session";

type GateState = {
  ready: boolean;
  waiters: Array<() => void>;
};

const gates: Record<AuthScope, GateState> = {
  customer: { ready: false, waiters: [] },
  admin: { ready: false, waiters: [] },
};

/** Called when a session scope begins initialization (page load). */
export function markAuthInitStart(scope: AuthScope): void {
  gates[scope].ready = false;
}

/** Called when a session scope finishes initialization (success or failure). */
export function markAuthInitComplete(scope: AuthScope): void {
  gates[scope].ready = true;
  for (const resolve of gates[scope].waiters) {
    resolve();
  }
  gates[scope].waiters = [];
}

/** Block authenticated API calls until auth initialization for this scope completes. */
export function waitForAuthReady(scope: AuthScope): Promise<void> {
  if (gates[scope].ready) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    gates[scope].waiters.push(resolve);
  });
}

export function isAuthReady(scope: AuthScope): boolean {
  return gates[scope].ready;
}
