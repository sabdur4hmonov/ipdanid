import { AnalyticsDriver } from "./analytics-driver";
import { customerApi as api } from "./customer-api";
import type { AnalyticsPreferences } from "./analytics-types";
import type { Instruction, Progress } from "./core/types";
export const analyticsClient = new AnalyticsDriver({
  identity: () => api.session?.token ?? null,
  preferences: (token) =>
    api.request<AnalyticsPreferences>(
      "/analytics/preferences",
      undefined,
      token,
    ),
  guides: async (token) =>
    (
      await api.request<{ unlocks: { sequence_hash: string }[] }>(
        "/builds/account",
        undefined,
        token,
      )
    ).unlocks.map((u) => u.sequence_hash),
  send: (event, token) => api.request("/analytics/events", event, token),
});
export function recordManualMilestone(
  instruction: Instruction,
  progress: Progress,
  correction = false,
) {
  if (progress.sequenceHash !== instruction.sequenceHash) return;
  void analyticsClient.manual(
    {
      kind: "assembly-confirmed",
      sequenceHash: instruction.sequenceHash,
      revision: progress.revision,
      confirmed: progress.confirmed,
      total: instruction.metrics.lines,
    },
    correction,
  );
}
export function startAnalyticsRuntime() {
  let live = true;
  const refresh = () => {
      if (live) void analyticsClient.refresh();
    },
    guides = () => {
      if (live) void analyticsClient.refreshGuides();
    };
  api.sessionChanged.add(refresh);
  window.addEventListener("online", refresh);
  window.addEventListener("iprasm-build-access", guides);
  void api
    .restore()
    .then(refresh)
    .catch(() => {});
  return () => {
    live = false;
    api.sessionChanged.delete(refresh);
    window.removeEventListener("online", refresh);
    window.removeEventListener("iprasm-build-access", guides);
    analyticsClient.pause();
  };
}
