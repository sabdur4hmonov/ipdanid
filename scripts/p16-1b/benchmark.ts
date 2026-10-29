// Frozen existing controls only. This module never discovers or uploads images.
export const benchmark = [
  {
    id: "portrait-01",
    folder: "combined-original-20261027-desktop-circle",
    source: "output/quality-original-20261026/source.jpg",
  },
  {
    id: "portrait-02",
    folder: "recheck-original-20261027-desktop-square",
    source: "output/quality-original-20261026/source.jpg",
  },
  {
    id: "portrait-03",
    folder: "combined-original-20261027-desktop-heart",
    source: "output/quality-original-20261026/source.jpg",
  },
  {
    id: "portrait-04",
    folder: "combined-regression-20261027-desktop-synthetic-1",
    source: "output/phase10/inputs/synthetic-1.png",
  },
  {
    id: "portrait-05",
    folder: "combined-regression-20261027-desktop-synthetic-2",
    source: "output/phase10/inputs/synthetic-2.png",
  },
  {
    id: "portrait-06",
    folder: "combined-regression-20261027-desktop-synthetic-3",
    source: "output/phase10/inputs/synthetic-3.png",
  },
  {
    id: "portrait-07",
    folder: "combined-regression-20261027-desktop-synthetic-pair-heart",
    source: "output/phase10/inputs/synthetic-1.png",
  },
  {
    id: "portrait-08",
    folder: "combined-regression-20261027-desktop-caption",
    source: "output/phase10/inputs/synthetic-1.png",
  },
] as const;
export const fixtureRoot = "output/quality-original-20261026/";
export const reviewRoot = "output/p16-1b-review";
