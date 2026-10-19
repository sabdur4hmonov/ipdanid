import { hash, deepFreeze } from "./engine";
import { TUTORIALS, type TutorialId } from "./tutorial-content";
import type { Point3, Triangle } from "./solid-geometry";
export { TUTORIALS, type TutorialId };
export type TutorialPlan = {
  schema: "iprasm.workshop/1";
  revision: "original-lessons/1";
  id: TutorialId;
  sequenceHash: string;
};
export const tutorialIds = Object.keys(TUTORIALS) as TutorialId[];
export async function makeTutorial(id: TutorialId): Promise<TutorialPlan> {
  if (!tutorialIds.includes(id)) throw Error("tutorial/id");
  const value = {
    schema: "iprasm.workshop/1" as const,
    revision: "original-lessons/1" as const,
    id,
  };
  return deepFreeze({ ...value, sequenceHash: await hash(value) });
}
export async function validateTutorial(value: TutorialPlan) {
  if (
    !value ||
    JSON.stringify(value).length > 500 ||
    Object.keys(value).sort().join(",") !== "id,revision,schema,sequenceHash"
  )
    throw Error("tutorial/format");
  const expected = await makeTutorial(value.id);
  if (
    value.schema !== expected.schema ||
    value.revision !== expected.revision ||
    value.sequenceHash !== expected.sequenceHash
  )
    throw Error("tutorial/integrity");
  return expected;
}
export type Draw =
  | {
      type: "line";
      points: [number, number][];
      color: string;
      closed?: boolean;
      fill?: string;
      dash?: boolean;
    }
  | {
      type: "ellipse";
      x: number;
      y: number;
      rx: number;
      ry: number;
      color: string;
    }
  | { type: "text"; x: number; y: number; text: string };
const line = (
  points: [number, number][],
  color = "#202c25",
  dash = false,
): Draw => ({ type: "line", points, color, dash });
const rect = (
  x: number,
  y: number,
  w: number,
  h: number,
  fill: string,
): Draw => ({
  type: "line",
  points: [
    [x, y],
    [x + w, y],
    [x + w, y + h],
    [x, y + h],
  ],
  color: "#202c25",
  closed: true,
  fill,
});
export const TRAY_NET: [number, number][] = [
  [14, 0],
  [76, 0],
  [76, 20],
  [90, 20],
  [90, 70],
  [76, 70],
  [76, 90],
  [14, 90],
  [14, 70],
  [0, 70],
  [0, 20],
  [14, 20],
];
export const TRAY_CREASES: [number, number][][] = [
  [
    [20, 20],
    [70, 20],
  ],
  [
    [70, 20],
    [70, 70],
  ],
  [
    [70, 70],
    [20, 70],
  ],
  [
    [20, 70],
    [20, 20],
  ],
  [
    [20, 0],
    [20, 20],
  ],
  [
    [70, 0],
    [70, 20],
  ],
  [
    [20, 70],
    [20, 90],
  ],
  [
    [70, 70],
    [70, 90],
  ],
];
export function tutorialDiagram(
  id: TutorialId,
  step: number,
): { width: number; height: number; commands: Draw[] } {
  if (
    !tutorialIds.includes(id) ||
    !Number.isSafeInteger(step) ||
    step < 1 ||
    step > TUTORIALS[id].steps.length
  )
    throw Error("tutorial/step");
  if (id === "paper")
    return {
      width: 210,
      height: 150,
      commands: [
        rect(0, 0, 210, 150, "#fffaf0"),
        ...Array.from({ length: 13 }, (_, i) =>
          line(
            [
              [15 * (i + 1), 0],
              [15 * (i + 1), 150],
            ],
            step === 3 && i === 0 ? "#b83232" : "#28628c",
            true,
          ),
        ),
        ...[15, 30, 195].map((x) => ({
          type: "text" as const,
          x: x + 1,
          y: 8,
          text: String(x),
        })),
        { type: "text", x: 90, y: 145, text: "210 x 150 mm" },
      ],
    };
  if (id === "cardboard")
    return {
      width: 90,
      height: 90,
      commands: [
        {
          type: "line",
          points: TRAY_NET,
          color: "#202c25",
          closed: true,
          fill: "#f7e4bc",
        },
        ...TRAY_CREASES.map((p) =>
          line(p as [number, number][], "#28628c", true),
        ),
        { type: "text", x: 26, y: 48, text: "50 x 50 mm" },
        { type: "text", x: 26, y: 10, text: "20 mm" },
        ...[14, 70].flatMap((x) =>
          [0, 70].map((y) => ({
            type: "text" as const,
            x: x + 1,
            y: y + 12,
            text: "6",
          })),
        ),
      ],
    };
  const commands: Draw[] = [rect(0, 0, 210, 150, "#e4f1f4")];
  if (step >= 2)
    for (let i = 0; i < (step === 2 ? 1 : 9); i++) {
      const x = 23 + ((i * 61) % 165),
        y = 23 + ((i * 41) % 105),
        r = step === 2 ? 12 : 17;
      commands.push({
        type: "ellipse",
        x,
        y,
        rx: r,
        ry: r * 0.8,
        color: "#306f9a",
      });
      if (step >= 4)
        commands.push({
          type: "ellipse",
          x: x + 2,
          y: y - 1,
          rx: r * 0.48,
          ry: r * 0.38,
          color: "#c85d4f",
        });
    }
  if (step === 5)
    commands.push({
      type: "line",
      points: [
        [8, 8],
        [202, 8],
        [202, 142],
        [8, 142],
      ],
      color: "#202c25",
      closed: true,
    });
  if (step >= 6)
    commands.push(
      line(
        [
          [8, 135],
          [195, 15],
        ],
        "#b83232",
      ),
    );
  if (step === 7) commands.push(rect(2, 60, 206, 10, "#fffaf0"));
  return { width: 210, height: 150, commands };
}
export function tutorialSvg(id: TutorialId, step: number) {
  const d = tutorialDiagram(id, step),
    escape = (s: string) =>
      s.replace(
        /[<>&"']/g,
        (c) =>
          ({
            "<": "&lt;",
            ">": "&gt;",
            "&": "&amp;",
            '"': "&quot;",
            "'": "&apos;",
          })[c]!,
      );
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${d.width + 20}mm" height="${d.height + 35}mm" viewBox="-10 -10 ${d.width + 20} ${d.height + 35}"><rect x="-10" y="-10" width="${d.width + 20}" height="${d.height + 35}" fill="white"/>` +
    d.commands
      .map((c) =>
        c.type === "line"
          ? `<path d="${c.points.map((p, i) => (i ? "L" : "M") + p.join(" ")).join(" ")}${c.closed ? " Z" : ""}" stroke="${c.color}" fill="${c.fill ?? "none"}" stroke-width=".3"${c.dash ? ' stroke-dasharray="2 1"' : ""}/>`
          : c.type === "ellipse"
            ? `<ellipse cx="${c.x}" cy="${c.y}" rx="${c.rx}" ry="${c.ry}" fill="${c.color}"/>`
            : `<text x="${c.x}" y="${c.y}" font-family="sans-serif" font-size="3">${escape(c.text)}</text>`,
      )
      .join("") +
    `<path data-calibration-mm="50" d="M 0 ${d.height + 10} h 50 m -50 -2 v 4 m 50 -4 v 4" fill="none" stroke="black" stroke-width=".3"/><text x="20" y="${d.height + 18}" font-family="sans-serif" font-size="3">50 mm</text></svg>`
  );
}
function quad(points: [Point3, Point3, Point3, Point3], part: number) {
  return [
    { triangle: [points[0], points[1], points[2]] as Triangle, part },
    { triangle: [points[0], points[2], points[3]] as Triangle, part },
  ];
}
// Surface models of the actual paper panels, not printable solids. Paper has
// exactly fourteen 15 x 150 mm panels; tray panels match its measured net.
export function tutorialMesh(
  id: TutorialId,
): { triangle: Triangle; part: number }[] {
  if (id === "paper") {
    let x = 0,
      y = 0;
    return Array.from({ length: 14 }, (_, i) => {
      const nx = x + 15 / Math.sqrt(2),
        ny = y + ((i % 2 ? -1 : 1) * 15) / Math.sqrt(2);
      const q = quad(
        [
          [x, y, 0],
          [nx, ny, 0],
          [nx, ny, 150],
          [x, y, 150],
        ],
        1,
      );
      x = nx;
      y = ny;
      return q;
    }).flat();
  }
  if (id === "cardboard")
    return [
      ...quad(
        [
          [0, 0, 0],
          [50, 0, 0],
          [50, 50, 0],
          [0, 50, 0],
        ],
        1,
      ),
      ...quad(
        [
          [0, 0, 0],
          [50, 0, 0],
          [50, 0, 20],
          [0, 0, 20],
        ],
        1,
      ),
      ...quad(
        [
          [50, 50, 0],
          [0, 50, 0],
          [0, 50, 20],
          [50, 50, 20],
        ],
        1,
      ),
      ...quad(
        [
          [0, 50, 0],
          [0, 0, 0],
          [0, 0, 20],
          [0, 50, 20],
        ],
        1,
      ),
      ...quad(
        [
          [50, 0, 0],
          [50, 50, 0],
          [50, 50, 20],
          [50, 0, 20],
        ],
        1,
      ),
      // Four tabs folded against the inside of the side walls. A small drawing
      // offset avoids coplanar z-fighting and is not a fabrication tolerance.
      ...[0.2, 49.8].flatMap((x) =>
        [0, 44].flatMap((y) =>
          quad(
            [
              [x, y, 0],
              [x, y + 6, 0],
              [x, y + 6, 20],
              [x, y, 20],
            ],
            1,
          ),
        ),
      ),
    ];
  return [];
}
