import type { Point } from "../../../types/scene.types";

// Выпуклая оболочка (алгоритм Эндрю)
export const convexHull = (points: Point[]): Point[] => {
  if (points.length < 3) return [...points];
  const sorted = [...points].sort((a, b) => a.x - b.x || a.y - b.y);
  const cross = (O: Point, A: Point, B: Point) =>
    (A.x - O.x) * (B.y - O.y) - (A.y - O.y) * (B.x - O.x);

  const lower: Point[] = [];
  for (const p of sorted) {
    while (
      lower.length >= 2 &&
      cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0
    ) {
      lower.pop();
    }
    lower.push(p);
  }

  const upper: Point[] = [];
  for (let i = sorted.length - 1; i >= 0; i--) {
    const p = sorted[i];
    while (
      upper.length >= 2 &&
      cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0
    ) {
      upper.pop();
    }
    upper.push(p);
  }

  lower.pop();
  upper.pop();
  return [...lower, ...upper];
};

// Внешняя единичная нормаль ребра (from -> to) относительно центроида
export const outwardUnitNormal = (from: Point, to: Point, centroid: Point): Point => {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0) return { x: 0, y: 0 };
  const n = { x: dy / len, y: -dx / len };
  const midToCentroidX = centroid.x - (from.x + to.x) / 2;
  const midToCentroidY = centroid.y - (from.y + to.y) / 2;
  if (n.x * midToCentroidX + n.y * midToCentroidY > 0) {
    return { x: -n.x, y: -n.y };
  }
  return n;
};