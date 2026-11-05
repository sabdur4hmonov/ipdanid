import { useEffect, useState } from "react";
import type { Locale } from "./core/types";
import { customerApi } from "./customer-api";
import { websiteText } from "./website-i18n";
export function CustomerAccountLink({
  locale,
  onLogin,
  onWorks,
}: {
  locale: Locale;
  onLogin: () => void;
  onWorks: () => void;
}) {
  const [account, setAccount] = useState<{
    durable?: boolean;
    credits: number;
  }>();
  useEffect(() => {
    let live = true,
      epoch = 0;
    const reload = () => {
      const ticket = ++epoch;
      setAccount(undefined);
      void (async () => {
        await customerApi.restore();
        const token = customerApi.session?.token;
        if (!token) return;
        const a = await customerApi.request<{
          durable?: boolean;
          credits: number;
        }>("/account", undefined, token);
        if (live && ticket === epoch && token === customerApi.session?.token)
          setAccount(a);
      })().catch(() => {});
    };
    customerApi.sessionChanged.add(reload);
    reload();
    return () => {
      live = false;
      epoch++;
      customerApi.sessionChanged.delete(reload);
    };
  }, []);
  return (
    <button
      data-testid="customer-account-link"
      className="customer-account-link"
      onClick={account?.durable ? onWorks : onLogin}
    >
      {websiteText(locale, account?.durable ? "works" : "login")}
      {account && (
        <small>
          {" "}
          · {websiteText(locale, "remaining")}: {account.credits}
        </small>
      )}
    </button>
  );
}
