import type { Page } from "@playwright/test";
import {
  generateClassicLeastSquares,
  leastSquaresProfile,
} from "../../src/core/classic-least-squares";
import {
  standardProfiles,
  DEFAULT_STANDARD_KIT,
} from "../../src/core/standard-kit";
import { DEFAULT_EDITS } from "../../src/core/types";
import { progressFor } from "../../src/core/validation";

export async function audioFixture(page: Page) {
  const instruction = await generateClassicLeastSquares({
    pixels: new Uint8Array(64 * 64 * 3).fill(140),
    profile: leastSquaresProfile(
      standardProfiles(structuredClone(DEFAULT_STANDARD_KIT))[0],
      true,
    ),
    resolution: 64,
    lines: 80,
    mode: "dark",
    accessPolicy: "kit-build/1",
  });
  const project = {
    id: "native-audio-test",
    name: "Audio sample",
    instruction,
    progress: progressFor(instruction),
    edits: { ...DEFAULT_EDITS },
  };
  await page.addInitScript(
    ({ project, api }) => {
      const w = window as any,
        listeners = new Map<
          string,
          { plugin: string; event: string; fn: (value: any) => void }
        >();
      let listenerId = 0,
        latest = 0,
        controller = "";
      w.__nativeAudioCalls = [];
      w.__visible = true;
      w.__nativeSpeech = [];
      w.__holdAudio = false;
      w.__audioState = undefined;
      w.__audioProgram = undefined;
      const emit = (plugin: string, event: string, value: any) => {
        if (!w.__visible && plugin === "IpRasmAssemblyAudio") return;
        for (const l of listeners.values())
          if (l.plugin === plugin && l.event === event)
            l.fn(structuredClone(value));
      };
      const checkpoint = () => {
        if (w.__audioProgram && w.__audioState)
          localStorage.setItem(
            "test.native-audio-checkpoint",
            JSON.stringify({
              projectId: w.__audioProgram.projectId,
              sequenceHash: w.__audioState.sequenceHash,
              current: w.__audioState.current,
              updatedAt: Date.now(),
            }),
          );
      };
      w.__nativeAudioStep = (current: number, playing = true) => {
        w.__audioState = {
          ...w.__audioState,
          current,
          playing,
          revision: w.__audioState.revision + 1,
        };
        checkpoint();
        emit("IpRasmAssemblyAudio", "change", w.__audioState);
      };
      w.__setVisible = (visible: boolean) => {
        w.__visible = visible;
        document.dispatchEvent(new Event("visibilitychange"));
        emit("App", "appStateChange", { isActive: visible });
      };
      Object.defineProperty(document, "hidden", {
        configurable: true,
        get: () => !w.__visible,
      });
      Object.defineProperty(document, "visibilityState", {
        configurable: true,
        get: () => (w.__visible ? "visible" : "hidden"),
      });
      w.CapacitorCustomPlatform = { name: "android" };
      const header = (name: string, names: string[]) => ({
        name,
        methods: names.map((name) => ({
          name,
          rtype: name === "addListener" ? "callback" : "promise",
        })),
      });
      w.Capacitor = {
        PluginHeaders: [
          header("CapacitorHttp", ["request"]),
          header("IpRasmSpeech", ["voices", "speak", "stop"]),
          header("IpRasmAssemblyAudio", [
            "capabilities",
            "start",
            "command",
            "stop",
            "status",
            "checkpoint",
            "clearCheckpoint",
            "addListener",
            "removeListener",
          ]),
          header("IpRasmAwake", ["set"]),
          header("App", ["addListener", "removeListener"]),
        ],
        nativeCallback: (plugin: string, method: string, o: any, fn: any) => {
          if (method !== "addListener") throw Error("Unexpected callback");
          const id = String(++listenerId);
          listeners.set(id, { plugin, event: o.eventName, fn });
          return id;
        },
        nativePromise: async (plugin: string, method: string, o: any) => {
          if (method === "removeListener") {
            listeners.delete(o.callbackId);
            return;
          }
          if (plugin === "CapacitorHttp") {
            if (!o.url.startsWith(api + "/"))
              throw Error("Unexpected external native API");
            const r = await fetch(o.url, {
              method: o.method,
              headers: o.headers,
              ...(o.data !== undefined ? { body: JSON.stringify(o.data) } : {}),
            });
            return {
              status: r.status,
              data: await r.json(),
              headers: {},
              url: o.url,
            };
          }
          if (plugin === "IpRasmAwake") return;
          if (plugin === "IpRasmSpeech") {
            if (method === "voices")
              return {
                voices: ["uz", "ru", "en"].map((lang) => ({
                  id: "offline-" + lang,
                  name: lang,
                  lang,
                })),
              };
            w.__nativeSpeech.push({ method, ...o });
            if (method === "speak" && w.__holdForegroundSpeech)
              return await new Promise((_resolve, reject) => {
                w.__releaseForegroundSpeech = () =>
                  reject(
                    Error(
                      "Offline speech initialization failed after cancellation",
                    ),
                  );
              });
            return method === "speak" ? { queued: true } : undefined;
          }
          if (plugin !== "IpRasmAssemblyAudio")
            throw Error("Unexpected native plugin");
          w.__nativeAudioCalls.push({ method, ...structuredClone(o ?? {}) });
          if (method === "capabilities") return { supported: true };
          if (method === "checkpoint") {
            const c = JSON.parse(
              localStorage.getItem("test.native-audio-checkpoint") ?? "{}",
            );
            return c.projectId === o.projectId &&
              c.sequenceHash === o.sequenceHash
              ? c
              : {};
          }
          if (method === "clearCheckpoint") {
            localStorage.removeItem("test.native-audio-checkpoint");
            return;
          }
          if (method === "status") return structuredClone(w.__audioState);
          if (controller !== o.controller) {
            controller = o.controller;
            latest = 0;
          }
          if (o.requestId <= latest) throw Error("Retired audio command");
          latest = o.requestId;
          if (method === "start") {
            w.__audioProgram = structuredClone(o.program);
            const s = {
              version: "assembly-audio-state/1",
              session: o.program.session,
              sequenceHash: o.program.sequenceHash,
              current: o.program.current,
              total: o.program.steps.length,
              revision: 1,
              active: true,
              playing: true,
              error: "",
            };
            const start = () => {
              if (o.requestId !== latest) throw Error("Cancelled audio start");
              w.__audioState = s;
              checkpoint();
              emit(plugin, "change", s);
              return structuredClone(s);
            };
            if (w.__holdAudio)
              return await new Promise((resolve, reject) => {
                w.__releaseAudio = () => {
                  try {
                    resolve(start());
                  } catch (e) {
                    reject(e);
                  }
                };
              });
            return start();
          }
          if (method === "stop") {
            if (w.__audioState) {
              w.__audioState = {
                ...w.__audioState,
                active: false,
                playing: false,
                revision: w.__audioState.revision + 1,
              };
              checkpoint();
              emit(plugin, "change", w.__audioState);
            }
            return;
          }
          if (method === "command") {
            if (
              !w.__audioState ||
              w.__audioState.session !== o.session ||
              w.__audioState.sequenceHash !== o.sequenceHash
            )
              throw Error("Wrong audio session");
            const step =
              w.__audioState.current +
              (o.command === "next" ? 1 : o.command === "previous" ? -1 : 0);
            const playing =
              o.command === "pause"
                ? false
                : o.command === "play"
                  ? true
                  : w.__audioState.playing;
            w.__nativeAudioStep(step, playing);
            return structuredClone(w.__audioState);
          }
          throw Error("Unexpected native audio method");
        },
      };
      localStorage.setItem("iprasm.debug-server.v1", api);
      localStorage.setItem("iprasm.locale", "en");
      if (!localStorage.getItem("CapacitorStorage.iprasm.projects.v1")) {
        localStorage.setItem(
          "CapacitorStorage.iprasm.projects.v1",
          JSON.stringify([project]),
        );
        localStorage.setItem(
          "CapacitorStorage.iprasm.assembly-session.v1",
          JSON.stringify({
            version: 1,
            projectId: project.id,
            sequenceHash: project.instruction.sequenceHash,
            current: 1,
            pace: 8,
          }),
        );
        localStorage.setItem("iprasm.guide.locale", "en");
      }
    },
    { project, api: process.env.IP_RASM_TEST_API_URL! + "/api" },
  );
  return instruction;
}
