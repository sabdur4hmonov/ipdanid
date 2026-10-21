import { useEffect, useRef, useState } from "react";
import type { Instruction, Locale } from "./core/types";
import {
  assemblyAudioAvailable,
  assemblyAudioNative,
} from "./assembly-audio-client";
import {
  AssemblyAudioDriver,
  type AssemblyAudioSnapshot,
} from "./assembly-audio-driver";
import {
  assemblyAudioProgram,
  type AudioLanguage,
} from "./assembly-audio-program";
import { cancelGuideSpeech, type GuideVoice } from "./guide-speech";

export function useAssemblyAudio(options: {
  active: boolean;
  projectId?: string;
  instruction?: Instruction;
  voice?: GuideVoice;
  voiceEnabled: boolean;
  language: AudioLanguage;
  locale: Locale;
  rate: number;
  pace: number;
  onState: (state: AssemblyAudioSnapshot) => void;
  onPlaying: (playing: boolean) => void;
  onError: (error: string) => void;
}) {
  const [supported, setSupported] = useState(false),
    [enabled, setEnabled] = useState(false),
    [busy, setBusy] = useState(false),
    mode = useRef(false),
    ready = useRef(false),
    starting = useRef(false),
    job = useRef(0);
  const key = JSON.stringify([
    options.active,
    options.projectId,
    options.instruction?.sequenceHash,
    options.voice?.id,
    options.voiceEnabled,
    options.language,
    options.locale,
    options.rate,
    options.pace,
  ]);
  const latest = useRef({ ...options, key });
  latest.current = { ...options, key };
  const driver = useRef<AssemblyAudioDriver | undefined>(undefined);
  const failed = () => {
    mode.current = false;
    starting.current = false;
    setEnabled(false);
    setBusy(false);
    latest.current.onPlaying(false);
    latest.current.onError("assembly-audio/unavailable");
  };
  driver.current ??= new AssemblyAudioDriver(
    assemblyAudioNative,
    (s) => {
      latest.current.onState(s);
      if (s.error) {
        void driver.current!.stop();
        failed();
      }
    },
    failed,
  );
  const stop = () => {
    job.current++;
    starting.current = false;
    setBusy(false);
    latest.current.onPlaying(false);
    if (driver.current!.ownsSession) void driver.current!.stop();
  };
  useEffect(() => {
    let closed = false,
      remove: (() => Promise<void>) | undefined;
    if (assemblyAudioAvailable())
      void (async () => {
        try {
          const c = await assemblyAudioNative.capabilities();
          if (closed) return;
          ready.current = c.supported === true;
          setSupported(ready.current);
          if (ready.current) {
            const handle = await assemblyAudioNative.addListener(
              "change",
              (s) => driver.current!.accept(s),
            );
            if (closed) await handle.remove();
            else remove = () => handle.remove();
          }
        } catch {
          if (!closed) {
            ready.current = false;
            setSupported(false);
          }
        }
      })();
    return () => {
      closed = true;
      job.current++;
      if (driver.current!.ownsSession) void driver.current!.stop();
      void remove?.();
    };
  }, []);
  useEffect(() => {
    if (mode.current || driver.current!.ownsSession || starting.current) stop();
    mode.current = false;
    setEnabled(false);
  }, [key]);
  const eligible =
    supported &&
    options.active &&
    options.voiceEnabled &&
    !!options.voice &&
    (options.voice.native || !!options.voice.recorded);
  function enable(next: boolean) {
    stop();
    cancelGuideSpeech();
    mode.current = next && eligible;
    setEnabled(mode.current);
  }
  async function start(current: number, advance = true) {
    const source = latest.current,
      serial = ++job.current;
    if (
      !mode.current ||
      !ready.current ||
      !source.active ||
      !source.voiceEnabled ||
      !source.voice ||
      !source.instruction ||
      !source.projectId
    )
      return;
    cancelGuideSpeech();
    latest.current.onPlaying(false);
    starting.current = true;
    setBusy(true);
    try {
      if (driver.current!.ownsSession) await driver.current!.stop();
      if (
        serial !== job.current ||
        source.key !== latest.current.key ||
        !mode.current
      )
        return;
      const program = assemblyAudioProgram({
        instruction: source.instruction,
        projectId: source.projectId,
        voice: source.voice,
        language: source.language,
        locale: source.locale,
        rate: source.rate,
        pace: source.pace,
        current,
        advance,
      });
      await driver.current!.start(program);
    } catch {
      if (serial === job.current) failed();
    } finally {
      if (serial === job.current) {
        starting.current = false;
        setBusy(false);
      }
    }
  }
  return {
    supported,
    eligible,
    enabled,
    busy,
    enable,
    start,
    stop,
    owns: () => driver.current!.ownsSession,
    pause: () => {
      if (starting.current) stop();
      else void driver.current!.command("pause");
    },
    refresh: () => driver.current!.refresh(),
  };
}
