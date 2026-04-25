import type { Point, Polygon } from "../../../types/scene.types";

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

export const buildSafeZoneForDownload = (poly: Polygon, metersToExpand: number, image: any, width_m: number, height_m: number): Point[] => {
    if (!poly.points || poly.points.length < 3) return poly.points ?? [];

    if (!image) return [];

    // Используем те же pxPerMeterX и pxPerMeterY, что и в ObstaclesLayer
    const pxPerMeterX = image.width / width_m
    const pxPerMeterY = image.height / height_m;

    const inMeters: Point[] = poly.points.map((p) => ({
      x: p.x / pxPerMeterX,
      y: p.y / pxPerMeterY,
    }));

    const hull = convexHull(inMeters);
    if (hull.length < 3 || !metersToExpand) {
      return hull.map((p) => ({
        x: p.x * pxPerMeterX,
        y: p.y * pxPerMeterY,
      }));
    }

    const centroid: Point = {
      x: hull.reduce((s, p) => s + p.x, 0) / hull.length,
      y: hull.reduce((s, p) => s + p.y, 0) / hull.length,
    };

    const n = hull.length;
    const expanded: Point[] = hull.map((v, i) => {
      const prev = hull[(i - 1 + n) % n];
      const next = hull[(i + 1) % n];
      const nIn = outwardUnitNormal(prev, v, centroid);
      const nOut = outwardUnitNormal(v, next, centroid);
      const denom = 1 + nIn.x * nOut.x + nIn.y * nOut.y;
      if (Math.abs(denom) < 1e-9) {
        return {
          x: v.x + metersToExpand * nIn.x,
          y: v.y + metersToExpand * nIn.y,
        };
      }
      const factor = metersToExpand / denom;
      return {
        x: v.x + factor * (nIn.x + nOut.x),
        y: v.y + factor * (nIn.y + nOut.y),
      };
    });

    return expanded.map((p) => ({
      x: p.x * pxPerMeterX,
      y: p.y * pxPerMeterY,
    }));
  };
