// Look of each tile in the homepage "Shop by category" grid. Categories themselves come from the database;
// this only decorates them. Unknown categories fall back to FALLBACK_TILE, so new ones always appear.
//
// c1 -> c2: the tile's gradient. a: deep accent used inside the drawing. p: the drawing's "pop" colour.
// photo: optional path to a licensed photo in /public (e.g. "/categories/vitamins.webp", square, ~600px).
//        When set, it replaces the drawing for that tile. Leave unset to use the built-in illustration.
// badge: optional small label in the top-left corner (e.g. "New").

export type TileStyle = { c1: string; c2: string; a: string; p: string; photo?: string; badge?: string };

export const FALLBACK_TILE: TileStyle = { c1: "#7dd3c0", c2: "#14a38b", a: "#0b6b5b", p: "#ffd166" };

export const CATEGORY_TILES: Record<string, TileStyle> = {
  "pain-relief": { c1: "#ff8a8a", c2: "#e8414a", a: "#a3142a", p: "#ff5d6c" },
  "cold-cough": { c1: "#7fd8f7", c2: "#3b8fe8", a: "#1c4f9c", p: "#ff8f5a" },
  "infection-care": { c1: "#ffd77a", c2: "#f59e2c", a: "#b45309", p: "#2fb67c" },
  "respiratory-care": { c1: "#b7aefe", c2: "#7158e6", a: "#3f2ba8", p: "#ffb347" },
  "diabetes-care": { c1: "#7ff0c9", c2: "#16b88a", a: "#0b7255", p: "#ff6b81" },
  "heart-care": { c1: "#ffa3b8", c2: "#ef4766", a: "#a8173a", p: "#ff2e55" },
  vitamins: { c1: "#ffd166", c2: "#fb8c1e", a: "#b4530b", p: "#ff9f1c" },
  "brain-nerve": { c1: "#a5c8ff", c2: "#5b6ee8", a: "#2f3a9e", p: "#ffd23f" },
  "digestive-care": { c1: "#ffc7a6", c2: "#f7823a", a: "#b44a12", p: "#ff6f3c" },
  "eye-ear": { c1: "#8fd0ff", c2: "#2f8fe0", a: "#155a9c", p: "#3dc1ff" },
  "skin-care": { c1: "#ffc4d6", c2: "#f0789f", a: "#b02a5c", p: "#ff9ec0" },
  "baby-care": { c1: "#9eeeff", c2: "#22c5e3", a: "#0b7f95", p: "#ffcd3c" },
  "womens-care": { c1: "#f8b4e0", c2: "#d65fd8", a: "#8a2794", p: "#ff6fb5" },
  "hormones-steroids": { c1: "#9ff5e2", c2: "#18b4a0", a: "#0b6f63", p: "#7c5cff" },
  devices: { c1: "#c9d3ff", c2: "#6c74f0", a: "#323aa6", p: "#ff6b6b" },
};
