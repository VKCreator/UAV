import Konva from "konva";
import { Point, Polygon } from "../../../types/scene.types";
import { buildSafeZoneForDownload } from "./Geometry.ts";

// ─── Интерфейсы ────────────────────────────────
interface ExportStoryboardParams {
  image: HTMLImageElement;
  width_m: number;
  height_m: number;
  GRID_COLS: number;
  GRID_ROWS: number;

  // Раскадровка
  points: Point[];
  pointsRecommended: Point[];
  obstacles: Polygon[];
  trajectoryData: any;

  // Размеры кадров (в пикселях исходного изображения — приходят уже корректные)
  frameWidthPx: number;
  frameHeightPx: number;

  // Линия БПЛА
  flightLineY: number; // координата линии в пикселях изображения (сверху)

  // Флаги видимости
  showGrid: boolean;
  showObstacles: boolean;
  showPoints: boolean;
  showRecommended: boolean;
  showOptimal: boolean;
  showUAVLine: boolean;

  // Apply: рисовать ли рамки кадров для оптимальной траектории
  applyOptimal: boolean;
  applyPoint: boolean;
  applyRecommended: boolean;

  setLoading?: (loading: boolean) => void;
}

// ─── Утилиты ───────────────────────────────────

const CHUNK_SIZE = 500;

const yieldToBrowser = (): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, 0));

/**
 * Обрабатывает массив чанками, отдавая управление браузеру между чанками.
 */
const processInChunks = async <T>(
  items: T[],
  chunkSize: number,
  processor: (item: T, index: number) => void,
): Promise<void> => {
  for (let i = 0; i < items.length; i += chunkSize) {
    const end = Math.min(i + chunkSize, items.length);
    for (let j = i; j < end; j++) {
      processor(items[j], j);
    }
    if (end < items.length) {
      await yieldToBrowser();
    }
  }
}

const getArrowPoints = (
  from: { x: number; y: number },
  to: { x: number; y: number },
  fromRadius: number,
  toRadius: number,
) => {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.sqrt(dx * dx + dy * dy);
  if (length === 0) return [from.x, from.y, to.x, to.y];
  const ux = dx / length;
  const uy = dy / length;
  return [
    from.x + ux * fromRadius,
    from.y + uy * fromRadius,
    to.x - ux * toRadius,
    to.y - uy * toRadius,
  ];
};

const createCircle = (
  x: number,
  y: number,
  radius: number,
  fill: string,
  extra: any = {},
) =>
  new Konva.Circle({
    x,
    y,
    radius,
    fill,
    listening: false,
    ...extra,
  });

// ─── Основная функция ──────────────────────────
export const createStoryboardScene = async (
  params: ExportStoryboardParams,
): Promise<Konva.Stage> => {
  const {
    image,
    width_m,
    height_m,
    GRID_COLS,
    GRID_ROWS,
    points,
    pointsRecommended,
    obstacles,
    trajectoryData,
    frameWidthPx,
    frameHeightPx,
    flightLineY,
    showGrid,
    showObstacles,
    showPoints,
    showRecommended,
    showOptimal,
    showUAVLine,
    applyOptimal,
    applyPoint,
    applyRecommended
  } = params;

  // ─── REFERENCE_SIZE: все визуальные размеры пропорциональны изображению ──
  // При min(width, height) = REFERENCE_SIZE → uiScale = 1 (номинальные размеры).
  // На большой картинке всё крупнее в пикселях, на маленькой — мельче,
  // визуальная доля кадра остаётся той же.
  const REFERENCE_SIZE = 1000;
  const uiScale = Math.min(image.width, image.height) / REFERENCE_SIZE;

  // Радиусы и шрифты (номинал в "эталонных" пикселях)
  const POINT_R_USER = 18 * uiScale;
  const POINT_R_TAXON = 18 * uiScale;
  const BASE_R = 6 * uiScale;
  const FONT_USER = 18 * uiScale;
  const FONT_TAXON = 18 * uiScale;

  // Толщины и стрелки
  const STROKE_W = 2 * uiScale;
  const FRAME_STROKE = 2 * uiScale;
  const POINTER_LEN = 10 * uiScale;
  const POINTER_W = 7 * uiScale;
  const POINT_OUTLINE_W = 1 * uiScale;

  // База (треугольник)
  const BASE_TRI = 8 * uiScale;

  // Сетка
  const GRID_BAR_W = 2 * uiScale; // толщина "белой" полосы сетки
  const GRID_BORDER = 0.1 * uiScale;

  // Линия БПЛА
  const UAV_LINE_W = 2 * uiScale;
  const UAV_LABEL_FONT = 16 * uiScale;
  const UAV_LABEL_OFFSET = 10 * uiScale;

  const container = document.createElement("div");
  container.style.position = "absolute";
  container.style.left = "-9999px";
  container.style.visibility = "hidden";
  container.style.pointerEvents = "none";

  const stage = new Konva.Stage({
    container,
    width: image.width,
    height: image.height,
    listening: false,
    draggable: false,
  });

  const layer = new Konva.Layer({ listening: false });
  stage.add(layer);

  const meterPerPixelX = width_m / image.width;
  const meterPerPixelY = height_m / image.height;

  // ─── 1. Изображение ──────────────────────────
  layer.add(
    new Konva.Image({
      image,
      x: 0,
      y: 0,
      width: image.width,
      height: image.height,
      listening: false,
    }),
  );

  // ─── 2. Сетка ────────────────────────────────
  if (showGrid) {
    const cellW = image.width / GRID_COLS;
    const cellH = image.height / GRID_ROWS;

    for (let i = 1; i < GRID_COLS; i++) {
      layer.add(
        new Konva.Rect({
          x: cellW * i - GRID_BAR_W / 2,
          y: 0,
          width: GRID_BAR_W,
          height: image.height,
          fill: "rgba(255,255,255,0.8)",
          stroke: "rgba(0,0,0,1)",
          strokeWidth: GRID_BORDER,
          listening: false,
        }),
      );
    }
    for (let i = 1; i < GRID_ROWS; i++) {
      layer.add(
        new Konva.Rect({
          x: 0,
          y: image.height - cellH * i - GRID_BAR_W / 2,
          width: image.width,
          height: GRID_BAR_W,
          fill: "rgba(255,255,255,0.8)",
          stroke: "rgba(0,0,0,1)",
          strokeWidth: GRID_BORDER,
          listening: false,
        }),
      );
    }
  }

  // ─── 3. Линия БПЛА + неинформативная зона ────
  if (showUAVLine) {
    // Серая полупрозрачная зона ниже линии полёта
    if (flightLineY < image.height - 0.01) {
      layer.add(
        new Konva.Rect({
          x: 0,
          y: flightLineY,
          width: image.width,
          height: image.height - flightLineY,
          fill: "rgba(128, 128, 128, 0.3)",
          listening: false,
        }),
      );

      // Подпись "Неинформативная зона" в центре зоны
      layer.add(
        new Konva.Text({
          x: 0,
          y:
            flightLineY +
            (image.height - flightLineY) / 2 -
            UAV_LABEL_OFFSET,
          width: image.width,
          text: "Неинформативная зона",
          align: "center",
          fontSize: UAV_LABEL_FONT,
          fill: "rgba(255,255,255,0.8)",
          listening: false,
        }),
      );
    }

    // Сама оранжевая линия — поверх зоны
    layer.add(
      new Konva.Line({
        points: [0, flightLineY, image.width, flightLineY],
        stroke: "orange",
        strokeWidth: UAV_LINE_W,
        listening: false,
      }),
    );
  }

  // ─── 4. Препятствия ──────────────────────────
  if (showObstacles && obstacles.length > 0) {
    const obstacleShapes: Konva.Shape[] = [];

    await processInChunks(obstacles, CHUNK_SIZE, (poly, index) => {
      // Безопасная зона
      if (poly.safeZone && poly.safeZone > 0) {
        const safeZonePoints = buildSafeZoneForDownload(
          poly,
          poly.safeZone,
          image,
          width_m,
          height_m,
        );
        obstacleShapes.push(
          new Konva.Line({
            points: safeZonePoints.flatMap((p) => [p.x, p.y]),
            closed: true,
            fill: "#E0F4FF",
            stroke: "#4FC3F7",
            strokeWidth: STROKE_W,
            dash: [8 * uiScale, 4 * uiScale],
            opacity: 0.8,
            listening: false,
          }),
        );
      }

      // Основной полигон
      obstacleShapes.push(
        new Konva.Line({
          points: poly.points.flatMap((p) => [p.x, p.y]),
          closed: true,
          fill: `${poly.color}20`,
          stroke: poly.color,
          strokeWidth: STROKE_W,
          listening: false,
        }),
      );

      // Вершины
      poly.points.forEach((point) => {
        obstacleShapes.push(
          createCircle(point.x, point.y, 3 * uiScale, poly.color),
        );
      });

      // Номер препятствия
      const centerX =
        poly.points.reduce((s, p) => s + p.x, 0) / poly.points.length;
      const centerY =
        poly.points.reduce((s, p) => s + p.y, 0) / poly.points.length;
      const labelText = (index + 1).toString();
      const labelRadius = 18 * uiScale;

      obstacleShapes.push(
        createCircle(centerX, centerY, labelRadius, "rgba(0,0,0,0.8)"),
        new Konva.Text({
          x: centerX - labelRadius,
          y: centerY - labelRadius,
          text: labelText,
          fontSize: labelRadius,
          fontStyle: "bold",
          fill: "#fff",
          listening: false,
          width: labelRadius * 2,
          height: labelRadius * 2,
          verticalAlign: "middle",
          align: "center"
        }),
      );
    });

    layer.add(...obstacleShapes);
    await yieldToBrowser();
  }

  // ─── 5. Пользовательская раскадровка ─────────
  if (showPoints && points.length > 0) {
    // Стрелки между точками
    points.forEach((p, i) => {
      if (i === 0) return;
      const prev = points[i - 1];
      layer.add(
        new Konva.Arrow({
          points: getArrowPoints(prev, p, POINT_R_USER, POINT_R_USER),
          pointerLength: POINTER_LEN,
          pointerWidth: POINTER_W,
          fill: "red",
          stroke: "red",
          strokeWidth: STROKE_W,
          listening: false,
        }),
      );
    });

    // Точки и рамки кадров
    points.forEach((p, i) => {
      if (applyPoint) {

        // Рамка кадра — для пользовательской раскадровки рисуется всегда
        layer.add(
          new Konva.Rect({
            x: p.x - frameWidthPx / 2,
            y: p.y - frameHeightPx / 2,
            width: frameWidthPx,
            height: frameHeightPx,
            stroke: "black",
            strokeWidth: FRAME_STROKE,
            fill: "#e54d4d5e",
            listening: false,
          }),
        );
      }

      // Кружок
      layer.add(
        new Konva.Circle({
          x: p.x,
          y: p.y,
          radius: POINT_R_USER,
          fill: "blue",
          stroke: "white",
          strokeWidth: POINT_OUTLINE_W,
          listening: false,
        }),
      );

      // Номер
      layer.add(
        new Konva.Text({
          x: p.x - POINT_R_USER,
          y: p.y - POINT_R_USER,
          width: POINT_R_USER * 2,
          height: POINT_R_USER * 2,
          text: `${i + 1}`,
          fontSize: FONT_USER,
          fontStyle: "bold",
          fill: "white",
          verticalAlign: "middle",
          align: "center",
          listening: false,
        }),
      );
    });
  }

  // ─── 6. Рекомендуемая раскадровка ────────────
  if (showRecommended && applyRecommended && pointsRecommended.length > 0) {
    // Стрелки змейкой
    pointsRecommended.forEach((r, i) => {
      if (i === pointsRecommended.length - 1) return;
      const next = pointsRecommended[i + 1];
      layer.add(
        new Konva.Arrow({
          points: getArrowPoints(r, next, POINT_R_TAXON, POINT_R_TAXON),
          pointerLength: POINTER_LEN,
          pointerWidth: POINTER_W,
          fill: "blue",
          stroke: "blue",
          strokeWidth: STROKE_W,
          listening: false,
        }),
      );
    });

    // Точки и рамки — для рекомендуемой рисуются всегда
    pointsRecommended.forEach((r, i) => {
      layer.add(
        new Konva.Rect({
          x: r.x - frameWidthPx / 2,
          y: r.y - frameHeightPx / 2,
          width: frameWidthPx,
          height: frameHeightPx,
          stroke: "black",
          strokeWidth: FRAME_STROKE,
          fill: "#2ef37063",
          listening: false,
        }),
      );

      layer.add(
        new Konva.Circle({
          x: r.x,
          y: r.y,
          radius: POINT_R_TAXON,
          fill: "red",
          stroke: "white",
          strokeWidth: STROKE_W,
          listening: false,
        }),
      );

      layer.add(
        new Konva.Text({
          x: r.x - POINT_R_TAXON,
          y: r.y - POINT_R_TAXON,
          width: POINT_R_TAXON * 2,
          height: POINT_R_TAXON * 2,
          text: `${i + 1}`,
          fontSize: FONT_TAXON,
          fontStyle: "bold",
          fill: "white",
          verticalAlign: "middle",
          align: "center",
          listening: false,
        }),
      );
    });
  }

  // ─── 7. Оптимальная траектория ───────────────
  if (showOptimal && trajectoryData?.B) {
    trajectoryData.B.forEach((taxon: any) => {
      const color = taxon.color;
      const baseX = taxon.base[0] / meterPerPixelX;
      const baseY = image.height - taxon.base[1] / meterPerPixelY;

      const taxonPoints = taxon.points.map((p: [number, number]) => ({
        x: p[0] / meterPerPixelX,
        y: image.height - p[1] / meterPerPixelY,
      }));

      // База (треугольник)
      layer.add(
        new Konva.Line({
          points: [
            baseX - BASE_TRI,
            baseY - BASE_TRI,
            baseX + BASE_TRI,
            baseY,
            baseX - BASE_TRI,
            baseY + BASE_TRI,
          ],
          fill: color,
          closed: true,
          listening: false,
        }),
      );

      if (taxonPoints.length > 0) {
        // Стрелка база → первая точка
        layer.add(
          new Konva.Arrow({
            points: getArrowPoints(
              { x: baseX, y: baseY },
              taxonPoints[0],
              BASE_R,
              POINT_R_TAXON,
            ),
            pointerLength: POINTER_LEN,
            pointerWidth: POINTER_W,
            fill: color,
            stroke: color,
            strokeWidth: STROKE_W,
            listening: false,
          }),
        );

        // Стрелка последняя точка → база
        layer.add(
          new Konva.Arrow({
            points: getArrowPoints(
              taxonPoints[taxonPoints.length - 1],
              { x: baseX, y: baseY },
              POINT_R_TAXON,
              BASE_R,
            ),
            pointerLength: POINTER_LEN,
            pointerWidth: POINTER_W,
            fill: color,
            stroke: color,
            strokeWidth: STROKE_W,
            listening: false,
          }),
        );
      }

      // Стрелки между точками
      taxonPoints.forEach((p: any, i: number) => {
        if (i === 0) return;
        const prev = taxonPoints[i - 1];
        layer.add(
          new Konva.Arrow({
            points: getArrowPoints(prev, p, POINT_R_TAXON, POINT_R_TAXON),
            pointerLength: POINTER_LEN,
            pointerWidth: POINTER_W,
            fill: color,
            stroke: color,
            strokeWidth: STROKE_W,
            listening: false,
          }),
        );
      });

      // Точки и рамки
      taxonPoints.forEach((p: any, i: number) => {
        // Рамка кадра — ТОЛЬКО если applyOptimal=true
        if (applyOptimal) {
          layer.add(
            new Konva.Rect({
              x: p.x - frameWidthPx / 2,
              y: p.y - frameHeightPx / 2,
              width: frameWidthPx,
              height: frameHeightPx,
              stroke: "black",
              strokeWidth: FRAME_STROKE,
              fill: "#3a5cf34d",
              listening: false,
            }),
          );
        }

        layer.add(
          new Konva.Circle({
            x: p.x,
            y: p.y,
            radius: POINT_R_TAXON,
            fill: color,
            stroke: "#1a1a1a",
            strokeWidth: POINT_OUTLINE_W,
            listening: false,
          }),
        );

        layer.add(
          new Konva.Text({
            x: p.x - POINT_R_TAXON,
            y: p.y - POINT_R_TAXON,
            width: POINT_R_TAXON * 2,
            height: POINT_R_TAXON * 2,
            text: `${i + 1}`,
            fontSize: FONT_TAXON,
            fontStyle: "bold",
            fill: "black",
            verticalAlign: "middle",
            align: "center",
            listening: false,
          }),
        );
      });
    });
  }

  layer.draw();
  await yieldToBrowser();

  return stage;
};

// ─── Экспорт в Blob ────────────────────────────
export const exportStoryboardImage = async (
  stage: Konva.Stage,
  filename: string = "storyboard.jpeg",
  setLoading?: (loading: boolean) => void,
  quality: number = 0.8,
): Promise<void> => {
  return new Promise((resolve) => {
    stage.toCanvas().toBlob(
      (blob) => {
        try {
          if (!blob) return;
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = filename;
          link.click();
          URL.revokeObjectURL(url);
        } finally {
          stage.destroy();
          if (setLoading) setLoading(false);
          resolve();
        }
      },
      "image/jpeg",
      quality,
    );
  });
};

// ─── Высокоуровневая функция ───────────────────
export const downloadStoryboard = async (
  params: ExportStoryboardParams,
  filename: string = "storyboard.jpeg",
  quality: number = 0.8,
): Promise<void> => {
  const { setLoading } = params;

  if (setLoading) setLoading(true);
  await yieldToBrowser();

  try {
    const stage = await createStoryboardScene(params);
    await exportStoryboardImage(stage, filename, setLoading, quality);
  } catch (err) {
    if (setLoading) setLoading(false);
    throw err;
  }
};