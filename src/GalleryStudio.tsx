import { useEffect, useRef, useState } from "react";
import { customerApi as api, ApiError } from "./customer-api";
import { galleryText } from "./gallery-i18n";
import {
  GALLERY_CONSENT,
  type GalleryPost,
  type PrivateGalleryPost,
  type GalleryPage,
  type GalleryReason,
} from "./gallery-types";
import { prepareGalleryImage } from "./gallery-image";
import type { Locale } from "./core/types";
function Post({
  post,
  locale,
  children,
}: {
  post: GalleryPost;
  locale: Locale;
  children?: React.ReactNode;
}) {
  const t = (k: Parameters<typeof galleryText>[1]) => galleryText(locale, k);
  return (
    <article
      className="card"
      data-testid="gallery-post"
      data-gallery-id={post.id}
      style={{ overflowWrap: "anywhere" }}
    >
      <h3>{post.title}</h3>
      <p>{post.alias}</p>
      {post.thumbnail && (
        <img
          alt={post.title}
          src={"data:image/png;base64," + post.thumbnail}
          style={{ width: 240, maxWidth: "100%", height: "auto" }}
        />
      )}
      {post.review && (
        <>
          <p>
            {t("rating")}: {post.rating}/5
          </p>
          <p style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
            {post.review}
          </p>
        </>
      )}
      {children}
    </article>
  );
}
function ImageView({
  image,
  onClose,
  locale,
}: {
  image: string;
  onClose: () => void;
  locale: Locale;
}) {
  useEffect(() => {
    const hide = () => {
      if (document.hidden) onClose();
    };
    document.addEventListener("visibilitychange", hide);
    return () => document.removeEventListener("visibilitychange", hide);
  }, [onClose]);
  if (!image) return null;
  return (
    <div className="card" data-testid="gallery-large-image">
      <button onClick={onClose}>{galleryText(locale, "close")}</button>
      <img
        alt={galleryText(locale, "larger")}
        src={"data:image/png;base64," + image}
        style={{ width: "100%", maxHeight: 700, objectFit: "contain" }}
      />
    </div>
  );
}
export default function GalleryStudio({
  locale,
  onAccount,
}: {
  locale: Locale;
  onAccount: () => void;
}) {
  const [feed, setFeed] = useState<GalleryPage>({
      items: [],
      next: null,
      total: 0,
      averageRating: null,
    }),
    [mine, setMine] = useState<PrivateGalleryPost[]>([]),
    [canSubmit, setCanSubmit] = useState(false),
    [session, setSession] = useState(api.session?.id ?? ""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [image, setImage] = useState(""),
    [large, setLarge] = useState(""),
    [title, setTitle] = useState(""),
    [alias, setAlias] = useState(""),
    [review, setReview] = useState(""),
    [rating, setRating] = useState(5),
    [finished, setFinished] = useState(false),
    [rights, setRights] = useState(false),
    [consent, setConsent] = useState(false);
  const epoch = useRef(0),
    lock = useRef(false),
    attempt = useRef<{ signature: string; key: string }>(undefined),
    t = (k: Parameters<typeof galleryText>[1]) => galleryText(locale, k);
  useEffect(() => {
    const change = () => setSession(api.session?.id ?? "");
    api.sessionChanged.add(change);
    change();
    return () => {
      api.sessionChanged.delete(change);
      epoch.current++;
    };
  }, []);
  async function run(fn: (e: number) => Promise<void>) {
    if (lock.current) return;
    const e = epoch.current;
    lock.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await fn(e);
    } catch (err) {
      if (epoch.current === e)
        setError(
          t(
            err instanceof ApiError && err.status === 409
              ? "conflict"
              : err instanceof ApiError && err.status === 429
                ? "limited"
                : "error",
          ),
        );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function refresh(e: number, after?: string) {
    const [page, privatePage] = await Promise.all([
      api.request<GalleryPage>(
        "/gallery" + (after ? "?after=" + encodeURIComponent(after) : ""),
        undefined,
        "",
      ),
      api.session
        ? api
            .request<{ canSubmit: boolean; items: PrivateGalleryPost[] }>(
              "/gallery/mine",
            )
            .catch((err) => {
              if (err instanceof ApiError && err.status === 401)
                return { canSubmit: false, items: [] };
              throw err;
            })
        : Promise.resolve({ canSubmit: false, items: [] }),
    ]);
    if (e !== epoch.current) return;
    setFeed((old) => ({
      ...page,
      items: after
        ? [
            ...old.items,
            ...page.items.filter((p) => !old.items.some((q) => p.id === q.id)),
          ]
        : page.items,
    }));
    setMine(privatePage.items);
    setCanSubmit(privatePage.canSubmit);
  }
  useEffect(() => {
    epoch.current++;
    setMine([]);
    setCanSubmit(false);
    setImage("");
    setLarge("");
    setTitle("");
    setAlias("");
    setReview("");
    setFinished(false);
    setRights(false);
    setConsent(false);
    attempt.current = undefined;
    const e = epoch.current;
    void refresh(e).catch(() => {
      if (epoch.current === e) setError(t("error"));
    });
  }, [session]);
  async function bigger(path: string, e: number) {
    const value = await api.request<{ image: string }>(
      path,
      undefined,
      path.includes("/mine/") ? api.session?.token : "",
    );
    if (e === epoch.current) setLarge(value.image);
  }
  return (
    <section className="card" data-testid="gallery-studio">
      <h2>{t("title")}</h2>
      <p>{t("intro")}</p>
      <p>
        {t("count")}: {feed.total}
        {feed.averageRating !== null
          ? ` · ${t("average")}: ${feed.averageRating.toFixed(1)}/5`
          : ""}
      </p>
      {error && <p role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      <button disabled={busy} onClick={() => void run((e) => refresh(e))}>
        {t("refresh")}
      </button>
      <ImageView image={large} onClose={() => setLarge("")} locale={locale} />
      <div data-testid="public-gallery">
        {!feed.items.length && <p>{t("empty")}</p>}
        {feed.items.map((p) => (
          <Post key={p.id} post={p} locale={locale}>
            <button
              disabled={busy}
              onClick={() =>
                void run((e) => bigger(`/gallery/${p.id}/image`, e))
              }
            >
              {t("larger")}
            </button>
          </Post>
        ))}
      </div>
      {feed.next && (
        <button
          disabled={busy}
          onClick={() => void run((e) => refresh(e, feed.next!))}
        >
          {t("more")}
        </button>
      )}
      {!canSubmit ? (
        <>
          <p>{t("account")}</p>
          <button onClick={onAccount}>{t("openAccount")}</button>
        </>
      ) : (
        <>
          <h3>{t("share")}</h3>
          <p>{t("photoHelp")}</p>
          <p>{t("retention")}</p>
          <fieldset disabled={busy}>
            <label>
              {t("photo")}
              <input
                type="file"
                accept="image/jpeg,image/png"
                aria-label={t("photo")}
                onChange={(event) => {
                  const f = event.currentTarget.files?.[0];
                  event.currentTarget.value = "";
                  if (f)
                    void run(async (e) => {
                      setImage("");
                      setFinished(false);
                      setRights(false);
                      setConsent(false);
                      attempt.current = undefined;
                      try {
                        const prepared = await prepareGalleryImage(f);
                        if (e === epoch.current) setImage(prepared);
                      } catch {
                        if (e === epoch.current) setError(t("imageError"));
                      }
                    });
                }}
              />
            </label>
            {image && (
              <img
                alt={t("photo")}
                src={"data:image/png;base64," + image}
                style={{
                  maxWidth: "100%",
                  maxHeight: 320,
                  objectFit: "contain",
                }}
              />
            )}
            <label>
              {t("name")}
              <input
                aria-label={t("name")}
                value={title}
                maxLength={80}
                onChange={(e) => setTitle(e.target.value)}
              />
            </label>
            <label>
              {t("alias")}
              <input
                aria-label={t("alias")}
                value={alias}
                maxLength={40}
                onChange={(e) => setAlias(e.target.value)}
              />
            </label>
            <label>
              {t("review")}
              <textarea
                aria-label={t("review")}
                value={review}
                maxLength={800}
                onChange={(e) => setReview(e.target.value)}
              />
            </label>
            {review.trim() && (
              <label>
                {t("rating")}
                <select
                  aria-label={t("rating")}
                  value={rating}
                  onChange={(e) => setRating(Number(e.target.value))}
                >
                  {[1, 2, 3, 4, 5].map((v) => (
                    <option key={v} value={v}>
                      {v}/5
                    </option>
                  ))}
                </select>
              </label>
            )}
            {(
              [
                ["finished", finished, setFinished],
                ["rights", rights, setRights],
                ["consent", consent, setConsent],
              ] as const
            ).map(([key, value, set]) => (
              <label key={key} className="check-label">
                <input
                  type="checkbox"
                  checked={value}
                  onChange={(e) => set(e.target.checked)}
                />
                {t(key)}
              </label>
            ))}
            <button
              disabled={
                !image ||
                !title.trim() ||
                !alias.trim() ||
                !finished ||
                !rights ||
                !consent
              }
              onClick={() =>
                void run(async (e) => {
                  const data = {
                      title: title.trim(),
                      alias: alias.trim(),
                      review: review.trim(),
                      rating: review.trim() ? rating : 0,
                      image,
                      finished,
                      rights,
                      consent,
                      publish: consent,
                      consentVersion: GALLERY_CONSENT,
                    },
                    signature = JSON.stringify(data);
                  if (attempt.current?.signature !== signature)
                    attempt.current = { signature, key: crypto.randomUUID() };
                  const response = await api.request<PrivateGalleryPost>(
                    "/gallery/submit",
                    { ...data, requestKey: attempt.current.key },
                  );
                  if (e !== epoch.current) return;
                  setImage("");
                  setFinished(false);
                  setRights(false);
                  setConsent(false);
                  attempt.current = undefined;
                  await refresh(e);
                  if (e === epoch.current)
                    setNotice(
                      t(response.state === "deleted" ? "deleted" : "submitted"),
                    );
                })
              }
            >
              {t("share")}
            </button>
          </fieldset>
          <h3>{t("mine")}</h3>
          <p>{t("withdrawHelp")}</p>
          <div data-testid="my-gallery">
            {mine.map((p) => (
              <Post key={p.id} post={p} locale={locale}>
                <p>
                  {t(p.state)} · {t("expires")}:{" "}
                  {new Date(p.expiresAt).toLocaleDateString(locale)}
                </p>
                {p.reason && (
                  <p>{t(p.reason === "rights" ? "rightsReason" : p.reason)}</p>
                )}
                <button
                  disabled={busy}
                  onClick={() =>
                    void run((e) => bigger(`/gallery/mine/${p.id}/image`, e))
                  }
                >
                  {t("larger")}
                </button>
                <button
                  disabled={busy}
                  onClick={() =>
                    void run(async (e) => {
                      await api.request(`/gallery/${p.id}/withdraw`, {
                        revision: p.revision,
                      });
                      if (e === epoch.current) setLarge("");
                      await refresh(e);
                    })
                  }
                >
                  {t("withdraw")}
                </button>
              </Post>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
export function GalleryModeration({
  locale,
  token,
}: {
  locale: Locale;
  token: string;
}) {
  const [items, setItems] = useState<PrivateGalleryPost[]>([]),
    [next, setNext] = useState<string | null>(null),
    [state, setState] = useState("pending"),
    [reason, setReason] = useState<GalleryReason>("privacy"),
    [large, setLarge] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    epoch = useRef(0),
    lock = useRef(false),
    t = (k: Parameters<typeof galleryText>[1]) => galleryText(locale, k);
  async function refresh(e: number, after?: string) {
    const r = await api.request<{
      items: PrivateGalleryPost[];
      next: string | null;
    }>(
      "/admin/gallery?state=" +
        state +
        (after ? "&after=" + encodeURIComponent(after) : ""),
      undefined,
      token,
    );
    if (e === epoch.current) {
      setItems((old) =>
        after
          ? [...old, ...r.items.filter((p) => !old.some((q) => q.id === p.id))]
          : r.items,
      );
      setNext(r.next);
    }
  }
  useEffect(() => {
    const e = ++epoch.current;
    setItems([]);
    setLarge("");
    setError("");
    void refresh(e).catch(() => {
      if (e === epoch.current) setError(t("error"));
    });
    return () => {
      epoch.current++;
    };
  }, [state, token]);
  async function run(fn: (e: number) => Promise<void>) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    const e = epoch.current;
    try {
      await fn(e);
    } catch (err) {
      if (e === epoch.current)
        setError(
          t(
            err instanceof ApiError && err.status === 409
              ? "conflict"
              : "error",
          ),
        );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <section
      className="card"
      id="admin-gallery"
      data-testid="gallery-moderation"
    >
      <h2>{t("moderation")}</h2>
      <p>{t("moderateHelp")}</p>
      <label>
        {t("filter")}
        <select
          aria-label={t("filter")}
          disabled={busy}
          value={state}
          onChange={(e) => setState(e.target.value)}
        >
          {(["pending", "approved", "rejected"] as const).map((s) => (
            <option key={s} value={s}>
              {t(s)}
            </option>
          ))}
        </select>
      </label>
      <label>
        {t("reason")}
        <select
          aria-label={t("reason")}
          value={reason}
          onChange={(e) => setReason(e.target.value as GalleryReason)}
        >
          {(["privacy", "not-finished", "rights", "other"] as const).map(
            (s) => (
              <option key={s} value={s}>
                {t(s === "rights" ? "rightsReason" : s)}
              </option>
            ),
          )}
        </select>
      </label>
      <button disabled={busy} onClick={() => void run((e) => refresh(e))}>
        {t("refresh")}
      </button>
      {error && <p role="alert">{error}</p>}
      <ImageView image={large} onClose={() => setLarge("")} locale={locale} />
      {items.map((p) => (
        <Post key={p.id} post={p} locale={locale}>
          <p>{t(p.state)}</p>
          <div className="grid-actions">
            <button
              disabled={busy}
              onClick={() =>
                void run(async (e) => {
                  const r = await api.request<{ image: string }>(
                    `/admin/gallery/${p.id}/image`,
                    undefined,
                    token,
                  );
                  if (e === epoch.current) setLarge(r.image);
                })
              }
            >
              {t("larger")}
            </button>
            {(["approved", "rejected"] as const)
              .filter((s) => s !== p.state)
              .map((s) => (
                <button
                  key={s}
                  disabled={busy}
                  onClick={() =>
                    void run(async (e) => {
                      await api.request(
                        `/admin/gallery/${p.id}/moderate`,
                        {
                          revision: p.revision,
                          state: s,
                          reason: s === "approved" ? null : reason,
                        },
                        token,
                      );
                      if (e === epoch.current) setLarge("");
                      await refresh(e);
                    })
                  }
                >
                  {t(s === "approved" ? "approve" : "reject")}
                </button>
              ))}
          </div>
        </Post>
      ))}
      {next && (
        <button
          disabled={busy}
          onClick={() => void run((e) => refresh(e, next))}
        >
          {t("more")}
        </button>
      )}
    </section>
  );
}
