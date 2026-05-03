import Konva from "konva";
import { buildSafeZoneForDownload } from "./Geometry.ts";

// ─── Интерфейсы ────────────────────────────────
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
  TC: number | { parsedValue?: number; source?: number };
  TA: number;
  GS: number;
  TAS: number;
  wind_speed: number;
  wind_dir_deg: number;
}

interface TrajectoryData {
  B?: any[];
  C?: [number, number][];
  segments?: Segment[];
}

interface ExportSceneParams {
  image: HTMLImageElement;
  width_m: number;
  height_m: number;
  GRID_COLS: number;
  GRID_ROWS: number;
  flightLineY: number | null;
  obstacles: Polygon[];
  points: Point[];
  trajectoryData: TrajectoryData | null;
  showGrid: boolean;
  showObstacles: boolean;
  showUserTrajectory: boolean;
  showTaxonTrajectory: boolean;
  showNavTriangles: boolean;
  showFullNavTriangles?: boolean;
  setLoading?: (loading: boolean) => void;
}

// ─── Утилиты для асинхронности ──────────────────────────────────────────────

/**
 * Отдаёт управление браузеру, чтобы он мог обработать рендер DOM (спиннер) и события.
 * setTimeout(0) надёжнее MessageChannel, и его достаточно между чанками.
 */
// const yieldToBrowser = (): Promise<void> =>
//   new Promise((resolve) => setTimeout(resolve, 0));

const yieldToBrowser = (): Promise<void> => {
  if (typeof (globalThis as any).scheduler?.yield === "function") {
    return (globalThis as any).scheduler.yield();
  }
  return new Promise((resolve) => setTimeout(resolve, 0));
};
/**
 * Двойной requestAnimationFrame — гарантирует, что предыдущий setState
 * (например, setLoading(true)) реально отрисовался, прежде чем мы заблокируем поток.
 */
const waitForPaint = (): Promise<void> =>
  new Promise((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
  );

/**
 * Размер чанка для тяжёлых циклов. Подобрано так, чтобы один чанк
 * занимал ~16мс на средней машине — кадр анимации спиннера не пропускается.
 */
const CHUNK_SIZE = 500;

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
};

// ─── 1. Асинхронная отрисовка сцены ────────────────────────────────────────

/**
 * Создаёт Konva Stage, рисует на нём все элементы и возвращает объект Stage.
 * Работает асинхронно: между этапами и внутри тяжёлых циклов отдаёт управление браузеру,
 * чтобы UI (спиннер) оставался отзывчивым.
 */
export const createKonvaScene = async (
  params: ExportSceneParams,
): Promise<Konva.Stage> => {
  const {
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
    showFullNavTriangles = false
  } = params;

  // Создаём контейнер и Stage в памяти
  const container = document.createElement("div");
  container.style.position = "absolute";
  container.style.left = "-9999px";
  container.style.visibility = "hidden";
  container.style.pointerEvents = "none";

  const downloadStage = new Konva.Stage({
    container,
    width: image.width,
    height: image.height,
    listening: false,
    draggable: false,
  });

  const layer = new Konva.Layer({ listening: false });
  downloadStage.add(layer);

  // Кешируем вычисления
  // const uiScale =
  //   Math.min(image.width / PREVIEW_WIDTH, image.height / PREVIEW_HEIGHT) * 0.5;
  const REFERENCE_SIZE = 900; // больше - меньше, меньше - крупнее
  const uiScale = Math.min(image.width, image.height) / REFERENCE_SIZE;

  // если что тут изменять
  const cache = {
    uiScale,
    POINT_R_USER: 18 * uiScale,
    POINT_R_TAXON: 18 * uiScale,
    BASE_R_DL: 6 * uiScale,
    ARROW_PTR_LEN: 16 * uiScale,
    ARROW_PTR_WID: 12 * uiScale,
    STROKE_W: 3 * uiScale,
    FONT_USER: 18 * uiScale,
    FONT_TAXON: 18 * uiScale,
    meterPerPixelX: width_m / image.width,
    meterPerPixelY: height_m / image.height,
  };

  // Вспомогательные функции
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
    const ux = dx / len;
    const uy = dy / len;
    return [
      from.x + ux * fromR,
      from.y + uy * fromR,
      to.x - ux * toR,
      to.y - uy * toR,
    ];
  };

  const createArrow = (pts: number[], color: string) =>
    new Konva.Arrow({
      points: pts,
      pointerLength: cache.ARROW_PTR_LEN,
      pointerWidth: cache.ARROW_PTR_WID,
      fill: color,
      stroke: color,
      strokeWidth: cache.STROKE_W,
      listening: false,
    });

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

  // ─── Этап 1: Фоновое изображение ─────────────────────────────────────────
  const backgroundShapes: Konva.Shape[] = [];
  backgroundShapes.push(
    new Konva.Image({
      image,
      x: 0,
      y: 0,
      width: image.width,
      height: image.height,
      listening: false,
    }),
  );
  layer.add(...backgroundShapes);
  // await yieldToBrowser();

  // ─── Этап 2: Сетка ────────────────────────────────────────────────────────
  if (showGrid) {
    const cellW = image.width / GRID_COLS;
    const cellH = image.height / GRID_ROWS;
    const lineWidth = 2 * cache.uiScale;
    const lineHeight = 2 * cache.uiScale;
    const gridShapes: Konva.Shape[] = [];

    for (let i = 1; i < GRID_COLS; i++) {
      gridShapes.push(
        new Konva.Rect({
          x: cellW * i - lineWidth / 2,
          y: 0,
          width: lineWidth,
          height: image.height,
          fill: "rgba(255,255,255,0.8)",
          stroke: "rgba(0,0,0,1)",
          strokeWidth: 0.1 * cache.uiScale,
          listening: false,
        }),
      );
    }
    for (let i = 1; i < GRID_ROWS; i++) {
      gridShapes.push(
        new Konva.Rect({
          x: 0,
          y: image.height - cellH * i - lineHeight / 2,
          width: image.width,
          height: lineHeight,
          fill: "rgba(255,255,255,0.8)",
          stroke: "rgba(0,0,0,1)",
          strokeWidth: 0.1 * cache.uiScale,
          listening: false,
        }),
      );
    }
    layer.add(...gridShapes);
    // await yieldToBrowser();
  }

  // ─── Этап 3: Линия полёта ─────────────────────────────────────────────────
  if (flightLineY !== null) {
    const flightShapes: Konva.Shape[] = [
      new Konva.Line({
        points: [0, flightLineY, image.width, flightLineY],
        stroke: "orange",
        strokeWidth: cache.STROKE_W,
        listening: false,
      }),
      new Konva.Rect({
        x: 0,
        y: flightLineY,
        width: image.width,
        height: image.height - flightLineY,
        fill: "rgba(128,128,128,0.3)",
        listening: false,
      }),
    ];

    if (flightLineY < image.height - 0.01) {
      flightShapes.push(
        new Konva.Text({
          x: 0,
          y:
            flightLineY +
            (image.height - flightLineY) / 2 -
            cache.FONT_USER * 1.5,
          width: image.width,
          text: "Неинформативная зона",
          align: "center",
          fontSize: cache.FONT_USER * 1.5,
          fill: "rgba(255,255,255,0.85)",
          listening: false,
        }),
      );
    }
    layer.add(...flightShapes);
    // await yieldToBrowser();
  }

  // ─── Этап 4: Препятствия (чанками) ────────────────────────────────────────
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
            strokeWidth: cache.STROKE_W,
            dash: [8 * cache.uiScale, 4 * cache.uiScale],
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
          strokeWidth: cache.STROKE_W,
          listening: false,
        }),
      );

      // Вершины
      poly.points.forEach((point) => {
        obstacleShapes.push(
          createCircle(point.x, point.y, 3 * cache.uiScale, poly.color),
        );
      });

      // Номер препятствия
      const centerX =
        poly.points.reduce((s, p) => s + p.x, 0) / poly.points.length;
      const centerY =
        poly.points.reduce((s, p) => s + p.y, 0) / poly.points.length;
      const labelText = (index + 1).toString();
      const labelRadius = 18 * cache.uiScale;

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

  // ─── Этап 5: Пользовательская траектория ──────────────────────────────────
  if (showUserTrajectory && points.length > 0) {
    const userShapes: Konva.Shape[] = [];

    points.forEach((point, i) => {
      if (i === 0) return;
      const prev = points[i - 1];
      userShapes.push(
        createArrow(
          arrowPts(prev, point, cache.POINT_R_USER, cache.POINT_R_USER),
          "red",
        ),
      );
    });

    points.forEach((point, i) => {
      userShapes.push(
        createCircle(point.x, point.y, cache.POINT_R_USER, "blue", { stroke: "white", strokeWidth: cache.STROKE_W * 0.5 }),
        new Konva.Text({
          x: point.x - cache.POINT_R_USER,
          y: point.y - cache.POINT_R_USER,
          width: cache.POINT_R_USER * 2,
          height: cache.POINT_R_USER * 2,
          text: (i + 1).toString(),
          fontSize: cache.FONT_USER,
          verticalAlign: "middle",
          align: "center",
          fontStyle: "bold",
          fill: "white",
          listening: false,
        }),
      );
    });
    layer.add(...userShapes);
    await yieldToBrowser();
  }

  // ─── Этап 6: Таксоны и траектории ─────────────────────────────────────────
  if (showTaxonTrajectory && trajectoryData) {
    // 6a. Стрелки таксонов и базы
    if (trajectoryData.B) {
      const taxonArrowShapes: Konva.Shape[] = [];

      await processInChunks(trajectoryData.B, 20, (taxon: any) => {
        const color = taxon.color;
        const baseX = taxon.base[0] / cache.meterPerPixelX;
        const baseY = image.height - taxon.base[1] / cache.meterPerPixelY;

        const taxonPoints = taxon.points.map((p: [number, number]) => ({
          x: p[0] / cache.meterPerPixelX,
          y: image.height - p[1] / cache.meterPerPixelY,
        }));

        if (taxonPoints.length > 0) {
          taxonArrowShapes.push(
            createArrow(
              arrowPts(
                { x: baseX, y: baseY },
                taxonPoints[0],
                cache.BASE_R_DL,
                cache.POINT_R_TAXON,
              ),
              color,
            ),
            createArrow(
              arrowPts(
                taxonPoints[taxonPoints.length - 1],
                { x: baseX, y: baseY },
                cache.POINT_R_TAXON,
                cache.BASE_R_DL,
              ),
              color,
            ),
          );

          taxonPoints.forEach((p: any, i: number) => {
            if (i > 0) {
              const prev = taxonPoints[i - 1];
              taxonArrowShapes.push(
                createArrow(
                  arrowPts(
                    prev,
                    p,
                    cache.POINT_R_TAXON,
                    cache.POINT_R_TAXON,
                  ),
                  color,
                ),
              );
            }
          });
        }

        // Маркер базы (треугольник)
        taxonArrowShapes.push(
          new Konva.Line({
            points: [
              baseX - cache.BASE_R_DL * 1.5,
              baseY - cache.BASE_R_DL * 1.5,
              baseX + cache.BASE_R_DL * 1.5,
              baseY,
              baseX - cache.BASE_R_DL * 1.5,
              baseY + cache.BASE_R_DL * 1.5,
            ],
            fill: color,
            closed: true,
            listening: false,
          }),
        );
      });

      layer.add(...taxonArrowShapes);
      await yieldToBrowser();
    }

    // 7. Навигационные треугольники — самый тяжёлый этап
    if (showNavTriangles && trajectoryData?.B) {
      const navAngleToCanvasVec = (
        angleDeg: number,
        magnitude: number,
        distMeters: number,
      ) => {
        const rad = (angleDeg * Math.PI) / 180;
        const dirX = Math.sin(rad);
        const dirY = -Math.cos(rad);

        // Размер сегмента в пикселях итогового изображения.
        const rawSizePxX = distMeters / cache.meterPerPixelX;
        const rawSizePxY = distMeters / cache.meterPerPixelY;
        const rawMagnitude = Math.hypot(rawSizePxX, rawSizePxY);

        // Ограничиваем длину треугольника в пикселях итогового изображения,
        // привязываясь к uiScale (то есть к REFERENCE_SIZE).
        const MIN_PX = 15 * cache.uiScale; // если что тут изменять!
        const MAX_PX = 30 * cache.uiScale;
        const clampedMagnitude = Math.min(
          Math.max(rawMagnitude, MIN_PX),
          MAX_PX,
        );
        const scale = clampedMagnitude / (rawMagnitude || 1);

        return {
          x: dirX * magnitude * rawSizePxX * scale,
          y: dirY * magnitude * rawSizePxY * scale,
        };
      };

      // Собираем все сегменты в один плоский массив для равномерного чанкинга.
      const allSegments: Array<{ taxon: any; segment: Segment }> = [];
      trajectoryData.B.forEach((taxon: any) => {
        if (!taxon?.segments) return;
        taxon.segments.forEach((segment: Segment) => {
          allSegments.push({ taxon, segment });
        });
      });

      const navShapes: Konva.Shape[] = [];

      // Толщина и наконечники — тоже через uiScale.
      const navStrokeThin = 1.5 * cache.uiScale;
      const navStrokeThick = 2.5 * cache.uiScale;
      const navPointerLen = 8 * cache.uiScale;
      const navPointerWid = 5 * cache.uiScale;
      const navDash = [6 * cache.uiScale, 4 * cache.uiScale];

      await processInChunks(allSegments, CHUNK_SIZE, ({ segment }) => {
        const pFrom = segment.p_from;

        let TC = segment.TC;
        if (typeof TC === "object" && TC !== null) {
          TC = TC.parsedValue ?? TC.source ?? 0;
        }
        const TA = segment.TA;
        const GS = segment.GS;
        const TAS = segment.TAS;
        const windSpeed = segment.wind_speed;
        const windDirDeg = segment.wind_dir_deg;
        const windTo = (windDirDeg + 180) % 360;
        const distMeters = Math.hypot(
          segment.p_to[0] - pFrom[0],
          segment.p_to[1] - pFrom[1],
        );

        const triStartX = pFrom[0] / cache.meterPerPixelX;
        const triStartY = image.height - pFrom[1] / cache.meterPerPixelY;

        const gsVec = navAngleToCanvasVec(TC as number, GS, distMeters);
        const tasVec = navAngleToCanvasVec(TA, TAS, distMeters);
        const windVec = navAngleToCanvasVec(windTo, windSpeed, distMeters);

        const gsX = gsVec.x;
        const gsY = gsVec.y;
        const tasX = tasVec.x;
        const tasY = tasVec.y;
        const windX = windVec.x;
        const windY = windVec.y;

        if (showFullNavTriangles) {
          navShapes.push(
            new Konva.Arrow({
              points: [triStartX, triStartY, triStartX + gsX, triStartY + gsY],
              pointerLength: navPointerLen,
              pointerWidth: navPointerWid,
              fill: "red",
              stroke: "red",
              strokeWidth: navStrokeThin,
              opacity: 0.9,
              listening: false,
            }),
            new Konva.Arrow({
              points: [triStartX, triStartY, triStartX + tasX, triStartY + tasY],
              pointerLength: navPointerLen,
              pointerWidth: navPointerWid,
              fill: "blue",
              stroke: "blue",
              strokeWidth: navStrokeThick,
              opacity: 0.9,
              listening: false,
            }),
            new Konva.Arrow({
              points: [
                triStartX,
                triStartY,
                triStartX + windX,
                triStartY + windY,
              ],
              pointerLength: navPointerLen,
              pointerWidth: navPointerWid,
              fill: "green",
              stroke: "green",
              strokeWidth: navStrokeThick,
              opacity: 0.8,
              listening: false,
            }),
            new Konva.Line({
              points: [
                triStartX + windX,
                triStartY + windY,
                triStartX + windX + tasX,
                triStartY + windY + tasY,
              ],
              stroke: "blue",
              strokeWidth: navStrokeThin,
              dash: navDash,
              opacity: 1,
              listening: false,
            }),
            new Konva.Line({
              points: [
                triStartX + tasX,
                triStartY + tasY,
                triStartX + tasX + windX,
                triStartY + tasY + windY,
              ],
              stroke: "green",
              strokeWidth: navStrokeThin,
              dash: navDash,
              opacity: 1,
              listening: false,
            }),
          );
        }
        else {
          navShapes.push(
            new Konva.Arrow({
              points: [triStartX, triStartY, triStartX + tasX, triStartY + tasY],
              pointerLength: navPointerLen,
              pointerWidth: navPointerWid,
              fill: "blue",
              stroke: "blue",
              strokeWidth: navStrokeThick,
              opacity: 0.9,
              listening: false,
            }))
        }
      });

      layer.add(...navShapes);
      await yieldToBrowser();
    }

    // 6b. Точки таксонов (поверх треугольников)
    if (trajectoryData.B) {
      const taxonPointShapes: Konva.Shape[] = [];

      await processInChunks(trajectoryData.B, 20, (taxon: any) => {
        const color = taxon.color;
        const taxonPoints = taxon.points.map((p: [number, number]) => ({
          x: p[0] / cache.meterPerPixelX,
          y: image.height - p[1] / cache.meterPerPixelY,
        }));

        taxonPoints.forEach((p: any, i: number) => {
          taxonPointShapes.push(
            createCircle(p.x, p.y, cache.POINT_R_TAXON, color, { stroke: "black", strokeWidth: cache.STROKE_W * 0.5 }),
            new Konva.Text({
              x: p.x - cache.POINT_R_TAXON,
              y: p.y - cache.POINT_R_TAXON,
              text: (i + 1).toString(),
              fontSize: cache.POINT_R_TAXON,
              fontStyle: "bold",
              fill: "black",
              listening: false,
              width: cache.POINT_R_TAXON * 2,
              height: cache.POINT_R_TAXON * 2,
              verticalAlign: "middle",
              align: "center"
            }),
          );
        });
      });

      layer.add(...taxonPointShapes);
      await yieldToBrowser();
    }

    // Недостижимые точки
    if (trajectoryData.C && trajectoryData.C.length > 0) {
      const crossR = 18 * cache.uiScale;
      const unreachShapes: Konva.Shape[] = [];

      await processInChunks(
        trajectoryData.C,
        CHUNK_SIZE,
        (point: [number, number]) => {
          const cx = point[0] / cache.meterPerPixelX;
          const cy = image.height - point[1] / cache.meterPerPixelY;

          unreachShapes.push(
            new Konva.Circle({
              x: cx,
              y: cy,
              radius: crossR,
              fill: "rgba(255,107,53,0.15)",
              stroke: "#FF6B35",
              strokeWidth: cache.STROKE_W * 0.8,
              listening: false,
            }),
            new Konva.Line({
              points: [
                cx - crossR * 0.6,
                cy - crossR * 0.6,
                cx + crossR * 0.6,
                cy + crossR * 0.6,
              ],
              stroke: "#FF6B35",
              strokeWidth: cache.STROKE_W,
              listening: false,
            }),
            new Konva.Line({
              points: [
                cx + crossR * 0.6,
                cy - crossR * 0.6,
                cx - crossR * 0.6,
                cy + crossR * 0.6,
              ],
              stroke: "#FF6B35",
              strokeWidth: cache.STROKE_W,
              listening: false,
            }),
          );
        },
      );

      layer.add(...unreachShapes);
      await yieldToBrowser();
    }
  }

  // Финальный рендер
  const canvas = layer.getCanvas();
  const ctx = canvas.getContext();
  if (ctx) {
    ctx.imageSmoothingEnabled = false;
  }

  layer.batchDraw();
  await yieldToBrowser();

  return downloadStage;
};

// ─── 2. Экспорт в Blob (асинхронный) ───────────────────────────────────────

export const exportSceneImage = async (
  stage: Konva.Stage,
  filename: string = "trajectory_schema.jpeg",
  setLoading?: (loading: boolean) => void,
  quality: number = 0.5,
): Promise<void> => {
  return new Promise((resolve) => {
    stage.toCanvas().toBlob(
      (blob) => {
        try {
          if (!blob) {
            resolve();
            return;
          }
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

// ─── 3. Экспорт в DataURL (для PDF) ────────────────────────────────────────

export const exportSceneImageToDataURL = (stage: Konva.Stage): string | null => {
  const dataUrl = stage.toDataURL({ quality: 0.5, pixelRatio: 1 });
  stage.destroy();
  return dataUrl;
};

// ─── 4. Высокоуровневая обёртка для удобного вызова ────────────────────────

/**
 * Полный цикл скачивания: показывает спиннер до того, как начнётся рендер,
 * строит сцену асинхронно, скачивает файл, прячет спиннер.
 *
 * Использование:
 *   await downloadScene(params, "map.png");
 */
export const downloadScene = async (
  params: ExportSceneParams,
  filename: string = "trajectory_schema.jpeg",
  quality: number = 0.5,
): Promise<void> => {
  const { setLoading } = params;

  if (setLoading) setLoading(true);

  await waitForPaint();

  try {
    const stage = await createKonvaScene(params);
    await exportSceneImage(stage, filename, setLoading, quality);
  } catch (err) {
    if (setLoading) setLoading(false);
    throw err;
  }
};
