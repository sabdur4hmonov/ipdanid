import { useState } from "react";
import { customerApi as api } from "./customer-api";
import { customerText } from "./customer-i18n";
import { STAFF_ROLES, type StaffAccess, type StaffRole } from "./admin-types";
import type { Locale } from "./core/types";
export function StaffAccessPanel({
  locale,
  token,
  run,
}: {
  locale: Locale;
  token: string;
  run: (fn: () => Promise<void>) => Promise<void>;
}) {
  const t = (key: Parameters<typeof customerText>[1]) =>
    customerText(locale, key);
  const [staff, setStaff] = useState<StaffAccess[]>([]),
    [name, setName] = useState(""),
    [role, setRole] = useState<StaffRole>("support"),
    [days, setDays] = useState(7),
    [issued, setIssued] = useState("");
  async function refresh() {
    setStaff(
      await api.request<StaffAccess[]>("/admin/access", undefined, token),
    );
  }
  return (
    <section className="card" data-testid="staff-access">
      <h2>{t("staffAccess")}</h2>
      <p>{t("staffNotice")}</p>
      <label>
        {t("staffName")}
        <input
          maxLength={80}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </label>
      <label>
        {t("staffRole")}
        <select
          aria-label={t("staffRole")}
          value={role}
          onChange={(e) => setRole(e.target.value as StaffRole)}
        >
          {STAFF_ROLES.map((r) => (
            <option key={r} value={r}>
              {t(
                r === "fulfillment"
                  ? "staffFulfillment"
                  : r === "manager"
                    ? "staffManager"
                    : r === "catalog"
                      ? "products"
                      : r === "finance"
                        ? "staffFinance"
                        : r === "codes"
                          ? "codes"
                          : "support",
              )}
            </option>
          ))}
        </select>
      </label>
      <label>
        {t("staffDays")}
        <input
          type="number"
          min={1}
          max={30}
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
        />
      </label>
      <button
        disabled={
          !name.trim() || !Number.isInteger(days) || days < 1 || days > 30
        }
        onClick={() =>
          void run(async () => {
            const grant = await api.request<StaffAccess & { token: string }>(
              "/admin/access",
              { name, role, days },
              token,
            );
            setIssued(grant.token);
            setName("");
            await refresh();
          })
        }
      >
        {t("staffIssue")}
      </button>
      <button className="outline" onClick={() => void run(refresh)}>
        {t("refresh")}
      </button>
      {issued && (
        <div className="recovery-key">
          <p>{t("staffCopyOnce")}</p>
          <code data-testid="issued-staff-token">{issued}</code>
          <button className="outline" onClick={() => setIssued("")}>
            {t("staffHide")}
          </button>
        </div>
      )}
      {staff.map((s) => (
        <article className="customer-item" key={s.id}>
          <strong>{s.name}</strong>
          <p>
            {t(
              s.role === "fulfillment"
                ? "staffFulfillment"
                : s.role === "manager"
                  ? "staffManager"
                  : s.role === "catalog"
                    ? "products"
                    : s.role === "finance"
                      ? "staffFinance"
                      : s.role === "codes"
                        ? "codes"
                        : "support",
            )}{" "}
            · {new Date(s.expiresAt).toLocaleString(locale)} ·{" "}
            {s.revoked
              ? t("staffRevoked")
              : s.expiresAt <= Date.now()
                ? t("staffExpired")
                : t("active")}
          </p>
          {!s.revoked && (
            <button
              className="outline"
              onClick={() =>
                void run(async () => {
                  await api.request(`/admin/access/${s.id}/revoke`, {}, token);
                  await refresh();
                })
              }
            >
              {t("staffRevoke")}
            </button>
          )}
        </article>
      ))}
    </section>
  );
}
