import { useEffect, useRef, useState } from "react";
import {
  Capacitor,
  registerPlugin,
  type PluginListenerHandle,
} from "@capacitor/core";
import { App } from "@capacitor/app";
import type { Locale } from "./core/types";
import {
  AssemblyCommandDriver,
  type AssemblyCommandAdapter,
  type CommandState,
} from "./assembly-command-driver";
import type { AssemblyCommand, CommandScope } from "./assembly-command-policy";
import { registerAssemblyInput } from "./assembly-input-cancellation";
import { assemblyExperimentText } from "./assembly-experiment-i18n";
const native = registerPlugin<
  AssemblyCommandAdapter & {
    addListener(
      event: "ready",
      fn: (value: { session: string }) => void,
    ): Promise<PluginListenerHandle>;
  }
>("IpRasmCommands");
const available = () =>
  Capacitor.getPlatform() === "android" &&
  Capacitor.isPluginAvailable("IpRasmCommands");
const adapter: AssemblyCommandAdapter = {
  capabilities: () =>
    available() ? native.capabilities() : Promise.resolve({ supported: false }),
  permission: (o) => native.permission(o),
  listen: (o) => native.listen(o),
  cancel: (o) => (available() ? native.cancel(o) : Promise.resolve()),
};
export default function AssemblyCommands(props: {
  locale: Locale;
  scope: CommandScope;
  pause: () => void;
  dispatch: (command: AssemblyCommand) => void;
}) {
  const [enabled, setEnabled] = useState(false),
    [state, setState] = useState<CommandState>("off"),
    [heard, setHeard] = useState<AssemblyCommand>();
  const latest = useRef({ ...props, enabled });
  latest.current = { ...props, enabled };
  const live = useRef(false),
    driver = useRef<AssemblyCommandDriver | undefined>(undefined);
  driver.current ??= new AssemblyCommandDriver(
    adapter,
    () =>
      latest.current.enabled && !document.hidden
        ? latest.current.scope
        : undefined,
    (c) => latest.current.dispatch(c),
    (s, c) => {
      if (live.current) {
        setState(s);
        if (c) setHeard(c);
      }
    },
  );
  const scopeKey = JSON.stringify([props.scope, enabled]);
  useEffect(() => {
    driver.current!.cancel();
  }, [scopeKey]);
  useEffect(() => {
    setHeard(undefined);
  }, [
    props.scope.projectId,
    props.scope.sequenceHash,
    props.scope.language,
    enabled,
  ]);
  useEffect(() => {
    live.current = true;
    let closed = false;
    const handles: PluginListenerHandle[] = [];
    const cancel = () => driver.current!.cancel(),
      unregister = registerAssemblyInput(cancel);
    const hide = () => {
      if (document.hidden) cancel();
    };
    document.addEventListener("visibilitychange", hide);
    if (available()) {
      void native
        .addListener("ready", (v) => {
          if (!closed && typeof v?.session === "string")
            driver.current!.ready(v.session);
        })
        .then((h) => {
          if (closed) void h.remove();
          else handles.push(h);
        })
        .catch(cancel);
      void App.addListener("appStateChange", (v) => {
        if (!v.isActive) cancel();
      })
        .then((h) => {
          if (closed) void h.remove();
          else handles.push(h);
        })
        .catch(cancel);
    }
    return () => {
      closed = true;
      live.current = false;
      unregister();
      cancel();
      document.removeEventListener("visibilitychange", hide);
      for (const h of handles) void h.remove().catch(() => {});
    };
  }, []);
  const t = (k: Parameters<typeof assemblyExperimentText>[1]) =>
      assemblyExperimentText(props.locale, k),
    busy = ["permission", "preparing", "listening"].includes(state);
  return (
    <section className="card" data-testid="assembly-commands">
      <h2>{t("title")}</h2>
      <label className="check-label">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => {
            driver.current!.cancel();
            setEnabled(e.target.checked);
          }}
        />
        {t("consent")}
      </label>
      {enabled && (
        <>
          <p>{t("help")}</p>
          <p role="status" data-testid="command-state" data-state={state}>
            {t(state === "heard" ? "off" : state)}
          </p>
          {heard && (
            <p data-testid="command-heard">
              {t("heard")}: {t(heard)}
            </p>
          )}
          <button
            className="outline"
            disabled={busy}
            onClick={() => {
              props.pause();
              setHeard(undefined);
              void driver.current!.listen();
            }}
          >
            {t("listen")}
          </button>
          {busy && (
            <button
              className="outline"
              onClick={() => driver.current!.cancel()}
            >
              {t("cancel")}
            </button>
          )}
        </>
      )}
    </section>
  );
}
