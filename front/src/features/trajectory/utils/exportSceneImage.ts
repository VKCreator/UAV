import Konva from "konva";
import { buildSafeZoneForDownload } from "./Geometry.ts"

// Типы для входных данных (упрощенные для примера, при желании можно импортировать из типов проекта)
interface Point {
  x: number;
  y: number;
}

interface Polygon {
  id: string;
  points: Point[];
  color: string;
  safeZone?: number;
}

interface Segment {
  p_from: [number, number];
  p_to: [number, number];
  TC: number | { parsedValue?: number; source?: number }; // True Course
  TA: number; // True Airspeed angle
  GS: number; // Ground Speed
  TAS: number; // True Airspeed
  wind_speed: number;
  wind_dir_deg: number;
}

interface TrajectoryData {
  B?: any[]; // Таксоны
  C?: [number, number][]; // Недостижимые точки
  segments?: Segment[]; // Сегменты для нав. треугольников
}

interface ExportSceneParams {
  image: HTMLImageElement;
  width_m: number;
  height_m: number;
  GRID_COLS: number;
  GRID_ROWS: number;

  // Данные сцены
  flightLineY: number | null;
  obstacles: Polygon[];
  points: Point[];
  trajectoryData: TrajectoryData | null;

  // Флаги видимости
  showGrid: boolean;
  showObstacles: boolean;
  showUserTrajectory: boolean;
  showTaxonTrajectory: boolean;
  showNavTriangles: boolean;

  // Размеры превью для расчета пропорций UI
  PREVIEW_WIDTH: number;
  PREVIEW_HEIGHT: number;

  // Колбеки
  setLoading: (loading: boolean) => void;
}

export const exportSceneImage = ({
  image,
  width_m,
  height_m,
  GRID_COLS,
  GRID_ROWS,
  flightLineY,
  obstacles,
  points,
  trajectoryData,
  showGrid,
  showObstacles,
  showUserTrajectory,
  showTaxonTrajectory,
  showNavTriangles,
  PREVIEW_WIDTH,
  PREVIEW_HEIGHT,
  setLoading,
}: ExportSceneParams) => {
  if (!image) return;
  setLoading(true);

  const container = document.createElement("div");
  const downloadStage = new Konva.Stage({
    container,
    width: image.width,
    height: image.height,
  });

  const layer = new Konva.Layer();
  downloadStage.add(layer);

  // PREVIEW_WIDTH = 1100;
  // PREVIEW_HEIGHT = 700;

  // Масштабный коэффициент UI (чтобы стрелки и текст выглядели так же, как на 500x400)
  const uiScale = Math.min(image.width / PREVIEW_WIDTH, image.height / PREVIEW_HEIGHT) * 0.5;

  const POINT_R_USER = 14 * uiScale;
  const POINT_R_TAXON = 14 * uiScale;
  const BASE_R_DL = 6 * uiScale;
  const ARROW_PTR_LEN = 14 * uiScale;
  const ARROW_PTR_WID = 10 * uiScale;
  const STROKE_W = 3 * uiScale;
  const FONT_USER = 16 * uiScale;
  const FONT_TAXON = 14 * uiScale;

  // Вспомогательная функция для точек стрелки
  const arrowPts = (
    from: { x: number; y: number },
    to: { x: number; y: number },
    fromR: number,
    toR: number,
  ) => {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len === 0) return [from.x, from.y, to.x, to.y];
    const ux = dx / len, uy = dy / len;
    return [
      from.x + ux * fromR, from.y + uy * fromR,
      to.x - ux * toR, to.y - uy * toR,
    ];
  };

  // ── 1. Фоновое изображение ────────────────────────────────
  layer.add(new Konva.Image({
    image,
    x: 0, y: 0,
    width: image.width, height: image.height,
  }));

  // ── 2. Сетка ──────────────────────────────────────────────
  if (showGrid) {
    const cellW = image.width / GRID_COLS;
    const cellH = image.height / GRID_ROWS;
    const lineWidth = 2 * uiScale;
    const lineHeight = 2 * uiScale;

    for (let i = 1; i < GRID_COLS; i++) {
      layer.add(new Konva.Rect({
        x: cellW * i - lineWidth / 2, y: 0,
        width: lineWidth, height: image.height,
        fill: "rgba(255, 255, 255, 0.8)", stroke: "rgba(0, 0, 0, 1)", strokeWidth: 0.1 * uiScale,
      }));
    }
    for (let i = 1; i < GRID_ROWS; i++) {
      const y = image.height - cellH * i;
      layer.add(new Konva.Rect({
        x: 0, y: y - lineHeight / 2,
        width: image.width, height: lineHeight,
        fill: "rgba(255, 255, 255, 0.8)", stroke: "rgba(0, 0, 0, 1)", strokeWidth: 0.1 * uiScale,
      }));
    }
  }

  // ── 3. Линия полёта ──────────────────────────────────────
  if (flightLineY !== null) {
    layer.add(new Konva.Line({
      points: [0, flightLineY, image.width, flightLineY],
      stroke: "orange", strokeWidth: STROKE_W,
    }));
    layer.add(new Konva.Rect({
      x: 0, y: flightLineY,
      width: image.width, height: image.height - flightLineY,
      fill: "rgba(128,128,128,0.3)", listening: false,
    }));
    if (flightLineY < image.height - 0.01) {
      layer.add(new Konva.Text({
        x: 0, y: flightLineY + (image.height - flightLineY) / 2 - FONT_USER * 1.5,
        width: image.width,
        text: "Неинформативная зона", align: "center",
        fontSize: FONT_USER * 1.5, fill: "rgba(255,255,255,0.85)", listening: false,
      }));
    }
  }

  // ── 4. Препятствия ────────────────────────────────────────
  if (showObstacles) {
    obstacles.forEach((poly) => {
      // Безопасная зона
      if (poly.safeZone && poly.safeZone > 0) {
        const safeZonePoints = buildSafeZoneForDownload(poly, poly.safeZone, image, width_m, height_m);
        layer.add(new Konva.Line({
          points: safeZonePoints.flatMap((p) => [p.x, p.y]),
          closed: true, fill: "#E0F4FF", stroke: "#4FC3F7",
          strokeWidth: STROKE_W, dash: [8 * uiScale, 4 * uiScale], opacity: 0.8,
        }));
      }

      // Основной полигон
      layer.add(new Konva.Line({
        points: poly.points.flatMap((p) => [p.x, p.y]),
        closed: true, fill: `${poly.color}20`, stroke: poly.color, strokeWidth: STROKE_W,
      }));

      // Вершины
      poly.points.forEach((point) => {
        layer.add(new Konva.Circle({
          x: point.x, y: point.y,
          radius: 3 * uiScale, fill: poly.color,
        }));
      });

      // Номер
      const centerX = poly.points.reduce((s, p) => s + p.x, 0) / poly.points.length;
      const centerY = poly.points.reduce((s, p) => s + p.y, 0) / poly.points.length;
      const labelText = (obstacles.indexOf(poly) + 1).toString();
      const labelRadius = 12 * uiScale;

      layer.add(new Konva.Circle({
        x: centerX, y: centerY, radius: labelRadius,
        fill: "rgba(0,0,0,0.55)", listening: false,
      }));
      layer.add(new Konva.Text({
        x: centerX - labelRadius * 0.8 * labelText.length * 0.5, // Приблизительно центрируем
        y: centerY - FONT_USER * 0.55,
        text: labelText, fontSize: FONT_USER, fontStyle: "bold", fill: "#fff", listening: false,
      }));
    });
  }

  // ── 5. Пользовательская траектория ─────────────────────────
  if (showUserTrajectory) {
    points.forEach((point, i) => {
      if (i === 0) return;
      const prev = points[i - 1];
      layer.add(new Konva.Arrow({
        points: arrowPts(prev, point, POINT_R_USER, POINT_R_USER),
        pointerLength: ARROW_PTR_LEN, pointerWidth: ARROW_PTR_WID,
        fill: "red", stroke: "red", strokeWidth: STROKE_W,
      }));
    });
    points.forEach((point, i) => {
      layer.add(new Konva.Circle({
        x: point.x, y: point.y, radius: POINT_R_USER, fill: "blue",
      }));
      layer.add(new Konva.Text({
        x: point.x - POINT_R_USER * 0.45, y: point.y - FONT_USER * 0.55,
        text: (i + 1).toString(), fontSize: FONT_USER, fontStyle: "bold", fill: "white",
      }));
    });
  }

  // ── 6a. Стрелки таксонов и базы (без точек/номеров) ────────
  if (showTaxonTrajectory && trajectoryData) {
    const meterPerPixelX = width_m / image.width;
    const meterPerPixelY = height_m / image.height;

    if (trajectoryData.B) {
      trajectoryData.B.forEach((taxon: any) => {
        const color = taxon.color;
        const baseX = taxon.base[0] / meterPerPixelX;
        const baseY = image.height - taxon.base[1] / meterPerPixelY;

        const taxonPoints = taxon.points.map((p: [number, number]) => ({
          x: p[0] / meterPerPixelX,
          y: image.height - p[1] / meterPerPixelY,
        }));

        // Стрелки к точкам
        if (taxonPoints.length > 0) {
          layer.add(new Konva.Arrow({
            points: arrowPts({ x: baseX, y: baseY }, taxonPoints[0], BASE_R_DL, POINT_R_TAXON),
            pointerLength: ARROW_PTR_LEN, pointerWidth: ARROW_PTR_WID,
            fill: color, stroke: color, strokeWidth: STROKE_W,
          }));
          layer.add(new Konva.Arrow({
            points: arrowPts(taxonPoints[taxonPoints.length - 1], { x: baseX, y: baseY }, POINT_R_TAXON, BASE_R_DL),
            pointerLength: ARROW_PTR_LEN, pointerWidth: ARROW_PTR_WID,
            fill: color, stroke: color, strokeWidth: STROKE_W,
          }));

          taxonPoints.forEach((p: any, i: number) => {
            if (i > 0) {
              const prev = taxonPoints[i - 1];
              layer.add(new Konva.Arrow({
                points: arrowPts(prev, p, POINT_R_TAXON, POINT_R_TAXON),
                pointerLength: ARROW_PTR_LEN, pointerWidth: ARROW_PTR_WID,
                fill: color, stroke: color, strokeWidth: STROKE_W,
              }));
            }
          });
        }

        // База (треугольник) — рисуется со стрелками, под точками
        layer.add(new Konva.Line({
          points: [
            baseX - BASE_R_DL * 1.5, baseY - BASE_R_DL * 1.5,
            baseX + BASE_R_DL * 1.5, baseY,
            baseX - BASE_R_DL * 1.5, baseY + BASE_R_DL * 1.5,
          ],
          fill: color, closed: true,
        }));
      });
    }
  }

  // ── 7. Навигационные треугольники (поверх стрелок, под точками) ─
  if (showNavTriangles && trajectoryData?.B) {
    const meterPerPixelX = width_m / image.width;
    const meterPerPixelY = height_m / image.height;

    const exportScale = Math.min(image.width / PREVIEW_WIDTH, image.height / PREVIEW_HEIGHT);
    const previewScaleToFit = Math.min(PREVIEW_WIDTH / image.width, PREVIEW_HEIGHT / image.height);

    const navAngleToCanvasVec = (angleDeg: number, magnitude: number, distMeters: number) => {
      const rad = angleDeg * Math.PI / 180;
      const dirX = Math.sin(rad);
      const dirY = -Math.cos(rad);
      const rawSizePxX = (distMeters / meterPerPixelX) * previewScaleToFit;
      const rawSizePxY = (distMeters / meterPerPixelY) * previewScaleToFit;
      const rawMagnitude = Math.hypot(rawSizePxX, rawSizePxY);
      const MIN_PX = 10;
      const MAX_PX = 15;
      const clampedMagnitude = Math.min(Math.max(rawMagnitude, MIN_PX), MAX_PX);
      const scale = clampedMagnitude / (rawMagnitude || 1);
      return {
        x: dirX * magnitude * rawSizePxX * scale,
        y: dirY * magnitude * rawSizePxY * scale,
      };
    };

    trajectoryData.B.forEach((taxon: any) => {
      if (!taxon?.segments) return;

      taxon.segments.forEach((segment: Segment) => {
        const pFrom = segment.p_from;

        let TC = segment.TC;
        if (typeof TC === 'object' && TC !== null) {
          TC = TC.parsedValue ?? TC.source ?? 0;
        }
        const TA = segment.TA;
        const GS = segment.GS;
        const TAS = segment.TAS;
        const windSpeed = segment.wind_speed;
        const windDirDeg = segment.wind_dir_deg;
        const windTo = (windDirDeg + 180) % 360;
        const distMeters = Math.hypot(segment.p_to[0] - pFrom[0], segment.p_to[1] - pFrom[1]);

        const triStartX = pFrom[0] / meterPerPixelX;
        const triStartY = image.height - pFrom[1] / meterPerPixelY;

        const gsVec = navAngleToCanvasVec(TC as number, GS, distMeters);
        const tasVec = navAngleToCanvasVec(TA, TAS, distMeters);
        const windVec = navAngleToCanvasVec(windTo, windSpeed, distMeters);

        const gsX = gsVec.x * exportScale, gsY = gsVec.y * exportScale;
        const tasX = tasVec.x * exportScale, tasY = tasVec.y * exportScale;
        const windX = windVec.x * exportScale, windY = windVec.y * exportScale;

        layer.add(new Konva.Arrow({
          points: [triStartX, triStartY, triStartX + gsX, triStartY + gsY],
          pointerLength: 8 * exportScale, pointerWidth: 5 * exportScale,
          fill: "red", stroke: "red", strokeWidth: 1.5 * exportScale, opacity: 0.9,
        }));
        layer.add(new Konva.Arrow({
          points: [triStartX, triStartY, triStartX + tasX, triStartY + tasY],
          pointerLength: 8 * exportScale, pointerWidth: 5 * exportScale,
          fill: "blue", stroke: "blue", strokeWidth: 2.5 * exportScale, opacity: 0.9,
        }));
        layer.add(new Konva.Arrow({
          points: [triStartX, triStartY, triStartX + windX, triStartY + windY],
          pointerLength: 8 * exportScale, pointerWidth: 5 * exportScale,
          fill: "green", stroke: "green", strokeWidth: 2.5 * exportScale, opacity: 0.8,
        }));

        layer.add(new Konva.Line({
          points: [
            triStartX + windX, triStartY + windY,
            triStartX + windX + tasX, triStartY + windY + tasY,
          ],
          stroke: "blue", strokeWidth: 1.5 * exportScale,
          dash: [6 * exportScale, 4 * exportScale], opacity: 1,
        }));
        layer.add(new Konva.Line({
          points: [
            triStartX + tasX, triStartY + tasY,
            triStartX + tasX + windX, triStartY + tasY + windY,
          ],
          stroke: "green", strokeWidth: 1.5 * exportScale,
          dash: [6 * exportScale, 4 * exportScale], opacity: 1,
        }));
      });
    });
  }

  // ── 6b. Точки таксонов и недостижимые точки (поверх всего) ──
  if (showTaxonTrajectory && trajectoryData) {
    const meterPerPixelX = width_m / image.width;
    const meterPerPixelY = height_m / image.height;

    if (trajectoryData.B) {
      trajectoryData.B.forEach((taxon: any) => {
        const color = taxon.color;
        const taxonPoints = taxon.points.map((p: [number, number]) => ({
          x: p[0] / meterPerPixelX,
          y: image.height - p[1] / meterPerPixelY,
        }));

        taxonPoints.forEach((p: any, i: number) => {
          layer.add(new Konva.Circle({
            x: p.x, y: p.y, radius: POINT_R_TAXON, fill: color,
          }));
          layer.add(new Konva.Text({
            x: p.x - POINT_R_TAXON * 0.45, y: p.y - FONT_TAXON * 0.55,
            text: (i + 1).toString(), fontSize: FONT_TAXON, fontStyle: "bold", fill: "black",
          }));
        });
      });
    }

    if (trajectoryData.C) {
      const crossR = 7 * uiScale;
      trajectoryData.C.forEach((point: [number, number]) => {
        const cx = point[0] / meterPerPixelX;
        const cy = image.height - point[1] / meterPerPixelY;

        layer.add(new Konva.Circle({
          x: cx, y: cy, radius: crossR,
          fill: "rgba(255,107,53,0.15)", stroke: "#FF6B35", strokeWidth: STROKE_W * 0.8,
        }));
        layer.add(new Konva.Line({
          points: [cx - crossR * 0.6, cy - crossR * 0.6, cx + crossR * 0.6, cy + crossR * 0.6],
          stroke: "#FF6B35", strokeWidth: STROKE_W,
        }));
        layer.add(new Konva.Line({
          points: [cx + crossR * 0.6, cy - crossR * 0.6, cx - crossR * 0.6, cy + crossR * 0.6],
          stroke: "#FF6B35", strokeWidth: STROKE_W,
        }));
      });
    }
  }

  layer.batchDraw();

  downloadStage.toCanvas().toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "trajectory_map.png";
    link.click();
    URL.revokeObjectURL(url);
    downloadStage.destroy();
    setLoading(false);
  });
};