import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { customerApi } from "./customer-api";
import { noFeatures, validFeatures } from "./feature-policy";
const Context = createContext(noFeatures());
export const useFeatures = () => useContext(Context);
export function FeatureProvider({ children }: { children: ReactNode }) {
  const [features, setFeatures] = useState(noFeatures);
  useEffect(() => {
    let alive = true, request = 0;
    const refresh = async () => {
      const ticket = ++request;
      try {
        const result = await customerApi.request<{version: string; features: unknown}>("/features", undefined, "");
        if (alive && ticket === request && result.version === "iprasm.features/1" && validFeatures(result.features)) setFeatures(result.features);
      } catch { if (alive && ticket === request) setFeatures(noFeatures()); }
    };
    void refresh();
    window.addEventListener("online", refresh);
    return () => { alive = false; window.removeEventListener("online", refresh); };
  }, []);
  return <Context.Provider value={features}>{children}</Context.Provider>;
}
