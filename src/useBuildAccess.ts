import { useEffect, useState } from "react";
import type { Instruction } from "./core/types";
import { buildAccess } from "./build-access";
export function useBuildAccess(instructions: Instruction[]) {
  const key = instructions
      .filter((i) => i.params.accessPolicy)
      .map((i) => i.sequenceHash)
      .sort()
      .join("|"),
    [allowed, setAllowed] = useState<Set<string>>(new Set()),
    [revision, setRevision] = useState(0);
  useEffect(() => {
    const refresh = () => setRevision((v) => v + 1);
    window.addEventListener("iprasm-build-access", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("iprasm-build-access", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);
  useEffect(() => {
    let live = true;
    Promise.all(
      instructions
        .filter((i) => i.params.accessPolicy)
        .map(
          async (i) => [i.sequenceHash, await buildAccess.allowed(i)] as const,
        ),
    ).then((rows) => {
      if (live) setAllowed(new Set(rows.filter((v) => v[1]).map((v) => v[0])));
    });
    return () => {
      live = false;
    };
  }, [key, revision]);
  return (i: Instruction) =>
    !i.params.accessPolicy || allowed.has(i.sequenceHash);
}
