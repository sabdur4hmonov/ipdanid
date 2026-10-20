import { Capacitor } from "@capacitor/core";
import { Preferences } from "@capacitor/preferences";
import { customerApi as api, customerCacheNamespace } from "./customer-api";
import { RecoveryOrder } from "./recovery-order";
import { validDigitalAttempt, type DigitalAttempt } from "./digital-attempt";
const queue = new RecoveryOrder();
let epoch = 0,
  started = false,
  closingToken: string | undefined;
const key = (id: string) => customerCacheNamespace + ":digital-pending:" + id;
async function remove(id: string) {
  if (Capacitor.isNativePlatform()) await Preferences.remove({ key: key(id) });
  else localStorage.removeItem(key(id));
}
export function startDigitalPendingLifecycle() {
  if (started) return;
  started = true;
  api.beforeLogout.add(async () => {
    ++epoch;
    closingToken = api.session?.token;
    const id = api.session?.id;
    if (id) await queue.run(() => remove(id));
  });
  api.sessionChanged.add(() => {
    ++epoch;
    if (api.session?.token !== closingToken) closingToken = undefined;
  });
}
export async function readDigitalPending(credential = api.session?.token) {
  startDigitalPendingLifecycle();
  const ticket = epoch,
    id = api.session?.id,
    token = api.session?.token;
  if (!id || !token || credential !== token || token === closingToken)
    return null;
  const raw = Capacitor.isNativePlatform()
    ? (await Preferences.get({ key: key(id) })).value
    : localStorage.getItem(key(id));
  if (ticket !== epoch || token !== api.session?.token) return null;
  if (!raw) return null;
  try {
    const value = JSON.parse(raw);
    if (validDigitalAttempt(value)) return value;
  } catch {
    /* Optional recovery cannot break local art. */
  }
  await queue.run(async () => {
    if (ticket === epoch && token === api.session?.token) await remove(id);
  });
  return null;
}
export async function saveDigitalPending(
  attempt: DigitalAttempt | null,
  credential: string,
) {
  startDigitalPendingLifecycle();
  if (attempt && !validDigitalAttempt(attempt))
    throw Error("Invalid digital attempt");
  const ticket = epoch,
    id = api.session?.id,
    token = api.session?.token;
  if (!id || !token || credential !== token || token === closingToken)
    throw Error("Account required");
  return queue.run(async () => {
    if (
      ticket !== epoch ||
      token !== api.session?.token ||
      token === closingToken
    )
      throw Error("Purchase account changed");
    if (attempt) {
      const value = JSON.stringify(attempt);
      if (Capacitor.isNativePlatform())
        await Preferences.set({ key: key(id), value });
      else localStorage.setItem(key(id), value);
    } else await remove(id);
    if (ticket !== epoch || token !== api.session?.token)
      throw Error("Purchase account changed");
  });
}
