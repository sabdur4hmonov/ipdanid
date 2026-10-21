import {
  Capacitor,
  registerPlugin,
  type PluginListenerHandle,
} from "@capacitor/core";
import type {
  AssemblyAudioAdapter,
  AssemblyAudioSnapshot,
} from "./assembly-audio-driver";
export const assemblyAudioNative = registerPlugin<
  AssemblyAudioAdapter & {
    addListener(
      event: "change",
      fn: (value: AssemblyAudioSnapshot) => void,
    ): Promise<PluginListenerHandle>;
    checkpoint(o: {
      projectId: string;
      sequenceHash: string;
    }): Promise<unknown>;
    clearCheckpoint(): Promise<void>;
  }
>("IpRasmAssemblyAudio");
export const assemblyAudioAvailable = () =>
  Capacitor.getPlatform() === "android" &&
  Capacitor.isPluginAvailable("IpRasmAssemblyAudio");
