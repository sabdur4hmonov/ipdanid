import type { PortraitSettings, RegionBox } from "./types";
import { portraitRegions } from "./portrait";
export type PersonEntry = NonNullable<
  PortraitSettings["people"]
>["faces"][number];
export function peopleEntries(p: PortraitSettings): PersonEntry[] {
  if (p.people)
    return p.people.faces.map((f, k) => ({
      ...structuredClone(f),
      id: f.id ?? `person-${k + 1}`,
    }));
  const b = portraitRegions(p);
  return [
    {
      id: p.personId ?? "person-1",
      face: { ...p.face },
      regions: p.regions
        ? structuredClone(p.regions)
        : {
            reference: "processed-target/sample-centers-v1",
            placement: "proportional-estimate",
            eyes: b.eyes,
            nose: b.nose,
            mouth: b.mouth,
          },
    },
  ];
}
export function withPeople(
  p: PortraitSettings,
  faces: PersonEntry[],
): PortraitSettings {
  if (!faces.length || faces.length > 8)
    throw Error("Invalid number of people");
  return {
    ...p,
    enabled: true,
    personId: faces[0].id,
    face: faces[0].face,
    regions: faces[0].regions,
    people:
      faces.length === 1
        ? undefined
        : {
            version: "multiple-portraits/1",
            reference: "processed-target/sample-centers-v1",
            faces,
          },
  };
}
// Review state is per person: placement "manual" means that person's regions
// were explicitly confirmed. Groups (2+) must have every person confirmed before
// generation; this mirrors the Worker's existing group-optical/15 contract.
export function unreviewedPeople(p: PortraitSettings): number[] {
  if (!p.enabled || !p.people) return [];
  return peopleEntries(p).flatMap((f, k) =>
    f.regions.placement === "manual" ? [] : [k + 1],
  );
}
export function setPersonReviewed(
  p: PortraitSettings,
  id: string,
  reviewed: boolean,
): PortraitSettings {
  const faces = peopleEntries(p);
  if (!faces.some((f) => f.id === id)) return p;
  return withPeople(
    p,
    faces.map((f) =>
      f.id === id
        ? {
            ...f,
            regions: {
              ...f.regions,
              placement: reviewed ? "manual" : "proportional-estimate",
            },
          }
        : f,
    ),
  );
}
export function removePerson(p: PortraitSettings, id: string) {
  const faces = peopleEntries(p).filter((f) => f.id !== id);
  // Removing a person never changes anyone else's boxes or review state.
  return faces.length ? withPeople(p, faces) : p;
}
/** Detector suggestions keep their boxes but start unconfirmed for each person. */
export function unconfirmedPeople(p: PortraitSettings): PortraitSettings {
  return withPeople(
    p,
    peopleEntries(p).map((f) => ({
      ...f,
      regions: { ...f.regions, placement: "proportional-estimate" },
    })),
  );
}
export function addPerson(p: PortraitSettings, id: string): PortraitSettings {
  const faces = peopleEntries(p);
  if (faces.length >= 3 || faces.some((f) => f.id === id))
    throw Error("New compositions support up to three people");
  // An editable estimate only. Existing people are never moved to make room.
  const face = {
      left: faces.length === 1 ? 0.57 : 0.35,
      top: 0.25,
      width: 0.28,
      height: 0.5,
    },
    r = portraitRegions(face);
  faces.push({
    id,
    face,
    regions: {
      reference: "processed-target/sample-centers-v1",
      placement: "proportional-estimate",
      eyes: r.eyes,
      nose: r.nose,
      mouth: r.mouth,
    },
  });
  return withPeople(p, faces);
}
export function movePerson(entry: PersonEntry, face: RegionBox): PersonEntry {
  const map = (r: RegionBox): RegionBox => ({
    left:
      face.left + ((r.left - entry.face.left) / entry.face.width) * face.width,
    top:
      face.top + ((r.top - entry.face.top) / entry.face.height) * face.height,
    width: (r.width / entry.face.width) * face.width,
    height: (r.height / entry.face.height) * face.height,
  });
  const bounded = (r: RegionBox) => {
    const left = Math.min(0.99, Math.max(0, r.left)),
      top = Math.min(0.99, Math.max(0, r.top));
    return {
      left,
      top,
      width: Math.max(0.01, Math.min(1 - left, r.width)),
      height: Math.max(0.01, Math.min(1 - top, r.height)),
    };
  };
  return {
    ...entry,
    face,
    regions: {
      ...entry.regions,
      placement: "proportional-estimate",
      eyes: bounded(map(entry.regions.eyes)),
      nose: bounded(map(entry.regions.nose)),
      mouth: bounded(map(entry.regions.mouth)),
    },
  };
}
