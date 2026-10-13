import { useState, type ComponentProps } from "react";
import { RegionEditor } from "./RegionEditor";
import { portraitHelp } from "./portrait-help-i18n";
import { subjectText } from "./subject-i18n";
import type { Locale, PortraitSettings } from "./core/types";
import { changeRegion } from "./core/coordinates";
import {
  peopleEntries,
  withPeople,
  addPerson,
  movePerson,
} from "./core/people-edit";
export function PeopleRegionEditor(
  props: ComponentProps<typeof RegionEditor> & {
    locale: Locale;
    canAddPeople?: boolean;
  },
) {
  const [selectedId, setSelectedId] = useState("");
  const faces = peopleEntries(props.portrait),
    found = faces.findIndex((f) => f.id === selectedId),
    index = found < 0 ? 0 : found;
  const selected = faces[index],
    view: PortraitSettings = {
      ...props.portrait,
      people: undefined,
      personId: selected.id,
      ...selected,
    };
  const t = (key: Parameters<typeof subjectText>[1]) =>
    subjectText(props.locale, key);
  return (
    <div data-testid="people-region-editor" data-count={faces.length}>
      <p className="fineprint">{t("thirdHint")}</p>
      <label>
        {portraitHelp(props.locale, "person")}{" "}
        <select
          aria-label={portraitHelp(props.locale, "person")}
          value={index}
          onChange={(e) => setSelectedId(faces[+e.target.value].id!)}
        >
          {faces.map((f, k) => (
            <option key={f.id} value={k}>
              {k + 1}
            </option>
          ))}
        </select>
      </label>
      <p data-testid="person-review" data-person-id={selected.id}>
        {t("personCount")}: {faces.length} ·{" "}
        {selected.regions.placement === "manual"
          ? t("reviewed")
          : t("needsReview")}
      </p>
      <div className="preset-row">
        <button
          type="button"
          className="outline"
          data-testid="add-person"
          disabled={
            faces.length >= 3 ||
            props.canAddPeople === false ||
            (props.resolution ?? 160) > 192
          }
          onClick={() => {
            const id = crypto.randomUUID();
            props.setPortrait((p) => addPerson(p, id));
            setSelectedId(id);
          }}
        >
          {t("add")}
        </button>
        <button
          type="button"
          className="outline"
          data-testid="remove-person"
          disabled={faces.length <= 1}
          onClick={() => {
            const id = selected.id;
            props.setPortrait((p) =>
              withPeople(
                p,
                peopleEntries(p).filter((f) => f.id !== id),
              ),
            );
            setSelectedId(faces.find((f) => f.id !== id)!.id!);
          }}
        >
          {t("remove")}
        </button>
      </div>
      {(["left", "top", "width", "height"] as const).map((key) => (
        <label className="range-label" key={key}>
          <span>
            {props.t("face")} · {props.t(key)}
          </span>
          <input
            type="number"
            min={key === "width" || key === "height" ? 0.1 : 0}
            max={1}
            step=".005"
            value={Number(view.face[key].toFixed(5))}
            aria-label={`${portraitHelp(props.locale, "person")} ${index + 1} ${props.t("face")} ${props.t(key)}`}
            onChange={(e) => {
              const value = +e.target.value;
              if (!Number.isFinite(value)) return;
              const safe =
                key === "width" || key === "height"
                  ? Math.max(0.1, value)
                  : value;
              props.setPortrait((p) =>
                withPeople(
                  p,
                  peopleEntries(p).map((f) => {
                    if (f.id !== selected.id) return f;
                    const box = changeRegion(
                      f.face,
                      key === "left"
                        ? safe - f.face.left
                        : key === "width"
                          ? safe - f.face.width
                          : 0,
                      key === "top"
                        ? safe - f.face.top
                        : key === "height"
                          ? safe - f.face.height
                          : 0,
                      key === "width" || key === "height",
                    );
                    return movePerson(f, box);
                  }),
                ),
              );
            }}
          />
        </label>
      ))}
      <RegionEditor
        {...props}
        portrait={view}
        setPortrait={(change) =>
          props.setPortrait((current) => {
            const entries = peopleEntries(current),
              at = entries.findIndex((f) => f.id === selected.id);
            if (at < 0) return current;
            const before = {
                ...current,
                people: undefined,
                personId: entries[at].id,
                ...entries[at],
              },
              next = typeof change === "function" ? change(before) : change;
            if (!next.regions)
              return withPeople(
                current,
                entries.map((f) => ({
                  ...f,
                  regions: { ...f.regions, placement: "proportional-estimate" },
                })),
              );
            return withPeople(
              current,
              entries.map((f, k) =>
                k === at
                  ? {
                      ...f,
                      face: next.face,
                      regions: {
                        ...next.regions!,
                        placement:
                          entries.length > 1
                            ? "proportional-estimate"
                            : next.regions!.placement,
                      },
                    }
                  : f,
              ),
            );
          })
        }
      />
      <button
        type="button"
        className="outline"
        data-testid="review-person"
        onClick={() =>
          props.setPortrait((p) =>
            withPeople(
              p,
              peopleEntries(p).map((f) =>
                f.id === selected.id
                  ? { ...f, regions: { ...f.regions, placement: "manual" } }
                  : f,
              ),
            ),
          )
        }
      >
        {t("review")}
      </button>
    </div>
  );
}
