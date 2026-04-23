import {
  FC,
  Fragment,
  useRef,
  type JSX,
  forwardRef,
  useImperativeHandle,
  useState,
} from "react";
import { Box, Typography, CircularProgress } from "@mui/material";
import {
  Stage,
  Layer,
  Image as KonvaImage,
  Circle,
  Text,
  Arrow,
  Line,
  Rect,
  Group
} from "react-konva";
import useImage from "use-image";
import Tooltip from "@mui/material/Tooltip";

import Konva from "konva";

import type { Point, Polygon, ImageData, TrajectoryPoint } from "./scene.types";
import { DroneParams, Weather } from "../../types/uav.types";

const STAGE_WIDTH = 500;
const STAGE_HEIGHT = 400;
const TAXON_POINT_RADIUS = 10;
const BASE_RADIUS = 4;

interface SceneShowerProps {
  imageData: ImageData;
  droneParams: any;

  points: Point[];
  obstacles: Polygon[];
  trajectoryData: any;

  showGrid?: boolean;
  showUserTrajectory?: boolean;
  showTaxonTrajectory?: boolean;
  showObstacles?: boolean;
  isLoadingOptimization?: boolean;

  showView: () => void;
  flightLineY: number;
  weatherConditions?: Weather;
}

const SceneShower = forwardRef<
  { handleDownload: () => void },
  SceneShowerProps
>(
  (
    {
      imageData,
      droneParams,

      points,
      obstacles,
      trajectoryData,

      showGrid = true,
      showUserTrajectory = true,
      showTaxonTrajectory = true,
      showObstacles = true,
      isLoadingOptimization = false,

      showView,
      flightLineY,
      weatherConditions = {}
    },
    ref,
  ) => {
    const stageRef = useRef<any>(null);
    const [image] = useImage(imageData.imageUrl);
    const [loading, setLoading] = useState(false);

    const GRID_COLS =
      droneParams.frameWidthBase / droneParams.frameWidthPlanned;
    const GRID_ROWS =
      droneParams.frameHeightBase / droneParams.frameHeightPlanned;

    const width_m = droneParams.frameWidthBase;
    const height_m = droneParams.frameHeightBase;

    const scaleToFit = image
      ? Math.min(
        1,
        (STAGE_WIDTH / image.width) * 1,
        (STAGE_HEIGHT / image.height) * 1,
      )
      : 1;

    const imageX = image ? (STAGE_WIDTH - image.width * scaleToFit) / 2 : 0;
    const imageY = image ? (STAGE_HEIGHT - image.height * scaleToFit) / 2 : 0;

    const handleStageClick = (e: any) => {
      showView();
    };

    const renderGrid = (): JSX.Element[] | null => {
      if (!image || !showGrid) return null;

      const lines: JSX.Element[] = [];

      const imgWidth = image.width * scaleToFit;
      const imgHeight = image.height * scaleToFit;

      for (let i = 1; i < GRID_COLS; i++) {
        const x = imageX + (imgWidth / GRID_COLS) * i;
        lines.push(
          <Rect
            key={`v-${i}`}
            x={x}
            y={imageY}
            width={2}  // толщина линии
            height={imgHeight}
            fill="rgba(255, 255, 255, 0.8)"
            stroke="rgb(0, 0, 0, 1)"
            strokeWidth={0.1}
          />
        );
      }

      // Горизонтальные линии
      for (let i = 1; i < GRID_ROWS; i++) {
        const y = imageY + imgHeight - (imgHeight / GRID_ROWS) * i;
        lines.push(
          <Rect
            key={`h-${i}`}
            x={imageX}
            y={y}
            width={imgWidth} 
            height={2}
            fill="rgba(255, 255, 255, 0.8)"
            stroke="rgb(0, 0, 0, 1)"
            strokeWidth={0.1}
          />
        );
      }

      return lines;
    };

    const getArrowPoints = (
      from: { x: number; y: number },
      to: { x: number; y: number },
      fromRadius: number,
      toRadius: number,
    ) => {
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const length = Math.sqrt(dx * dx + dy * dy);

      if (length === 0) {
        return [from.x, from.y, to.x, to.y];
      }

      const ux = dx / length;
      const uy = dy / length;

      return [
        from.x + ux * fromRadius,
        from.y + uy * fromRadius,
        to.x - ux * toRadius,
        to.y - uy * toRadius,
      ];
    };

    const handleDownload = () => {
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

      // Масштабный коэффициент: элементы интерфейса должны выглядеть
      // пропорционально на полном разрешении так же, как на превью 500×400
      const uiScale = Math.min(image.width / STAGE_WIDTH, image.height / STAGE_HEIGHT) * 0.5;

      const POINT_R_USER = 14 * uiScale;   // радиус пользовательской точки
      const POINT_R_TAXON = 14 * uiScale;   // радиус точки таксона
      const BASE_R_DL = 6 * uiScale;   // «радиус» базы для отступа стрелок
      const ARROW_PTR_LEN = 14 * uiScale;
      const ARROW_PTR_WID = 10 * uiScale;
      const STROKE_W = 3 * uiScale;
      const FONT_USER = 16 * uiScale;
      const FONT_TAXON = 14 * uiScale;

      // Вспомогательная функция: стрелка начинается от края fromRadius окружности
      // и заканчивается у края toRadius окружности, не перекрывая кружки
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

      // ── Фоновое изображение ────────────────────────────────────────────
      layer.add(new Konva.Image({
        image,
        x: 0, y: 0,
        width: image.width, height: image.height,
      }));

      // ── Сетка ─────────────────────────────────────────────────────────
      if (showGrid) {
        const cellW = image.width / GRID_COLS;
        const cellH = image.height / GRID_ROWS;
        for (let i = 1; i < GRID_COLS; i++) {
          layer.add(new Konva.Line({
            points: [cellW * i, 0, cellW * i, image.height],
            stroke: "rgba(255,255,255,0.9)", strokeWidth: 1,
          }));
        }
        for (let i = 1; i < GRID_ROWS; i++) {
          const y = image.height - cellH * i;
          layer.add(new Konva.Line({
            points: [0, y, image.width, y],
            stroke: "rgba(255,255,255,0.9)", strokeWidth: 1,
          }));
        }
      }

      // ── Линия полёта + неинформативная зона ───────────────────────────
      if (flightLineY !== null) {
        layer.add(new Konva.Line({
          points: [0, flightLineY, image.width, flightLineY],
          stroke: "orange",
          strokeWidth: STROKE_W,
        }));
        layer.add(new Konva.Rect({
          x: 0, y: flightLineY,
          width: image.width, height: image.height - flightLineY,
          fill: "rgba(128,128,128,0.3)",
          listening: false,
        }));
        if (flightLineY < image.height - 0.01) {
          layer.add(new Konva.Text({
            x: 0,
            y: flightLineY + (image.height - flightLineY) / 2 - FONT_USER * 1.5,
            width: image.width,
            text: "Неинформативная зона",
            align: "center",
            fontSize: FONT_USER * 1.5,
            fill: "rgba(255,255,255,0.85)",
            listening: false,
          }));
        }
      }

      // ── Препятствия ───────────────────────────────────────────────────
      if (showObstacles) {
        obstacles.forEach((poly) => {
          layer.add(new Konva.Line({
            points: poly.points.flatMap((p) => [p.x, p.y]),
            closed: true,
            fill: `${poly.color}30`,
            stroke: poly.color,
            strokeWidth: STROKE_W,
          }));
        });
      }

      // ── Пользовательская траектория ───────────────────────────────────
      if (showUserTrajectory) {
        // Сначала рисуем стрелки (они окажутся под кружками)
        points.forEach((point, i) => {
          if (i === 0) return;
          const prev = points[i - 1];
          layer.add(new Konva.Arrow({
            points: arrowPts(prev, point, POINT_R_USER, POINT_R_USER),
            pointerLength: ARROW_PTR_LEN, pointerWidth: ARROW_PTR_WID,
            fill: "red", stroke: "red", strokeWidth: STROKE_W,
          }));
        });
        // Затем кружки и номера поверх стрелок
        points.forEach((point, i) => {
          layer.add(new Konva.Circle({
            x: point.x, y: point.y,
            radius: POINT_R_USER, fill: "blue",
          }));
          layer.add(new Konva.Text({
            x: point.x - POINT_R_USER * 0.45,
            y: point.y - FONT_USER * 0.55,
            text: (i + 1).toString(),
            fontSize: FONT_USER,
            fontStyle: "bold",
            fill: "white",
          }));
        });
      }

      // ── Траектории таксонов ───────────────────────────────────────────
      if (showTaxonTrajectory && trajectoryData?.B) {
        const meterPerPixelX = width_m / image.width;
        const meterPerPixelY = height_m / image.height;

        trajectoryData.B.forEach((taxon: any) => {
          const color = taxon.color;
          const baseX = taxon.base[0] / meterPerPixelX;
          const baseY = image.height - taxon.base[1] / meterPerPixelY;

          const taxonPoints = taxon.points.map((p: [number, number]) => ({
            x: p[0] / meterPerPixelX,
            y: image.height - p[1] / meterPerPixelY,
          }));

          // Стрелки (под кружками)
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
          }

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

          // База (треугольник) — поверх стрелок
          layer.add(new Konva.Line({
            points: [
              baseX - BASE_R_DL * 1.5, baseY - BASE_R_DL * 1.5,
              baseX + BASE_R_DL * 1.5, baseY,
              baseX - BASE_R_DL * 1.5, baseY + BASE_R_DL * 1.5,
            ],
            fill: color, closed: true,
          }));

          // Кружки и номера — самый верхний слой
          taxonPoints.forEach((p: any, i: number) => {
            layer.add(new Konva.Circle({
              x: p.x, y: p.y,
              radius: POINT_R_TAXON, fill: color,
            }));
            layer.add(new Konva.Text({
              x: p.x - POINT_R_TAXON * 0.45,
              y: p.y - FONT_TAXON * 0.55,
              text: (i + 1).toString(),
              fontSize: FONT_TAXON,
              fontStyle: "bold",
              fill: "black",
            }));
          });
        });
      }

      // ── Недостижимые точки (C) ────────────────────────────────────────
      if (showTaxonTrajectory && trajectoryData?.C) {
        const meterPerPixelX = width_m / image.width;
        const meterPerPixelY = height_m / image.height;
        const crossR = 7 * uiScale;

        trajectoryData.C.forEach((point: [number, number]) => {
          const cx = point[0] / meterPerPixelX;
          const cy = image.height - point[1] / meterPerPixelY;

          layer.add(new Konva.Circle({
            x: cx, y: cy,
            radius: crossR,
            fill: "rgba(255,107,53,0.15)",
            stroke: "#FF6B35",
            strokeWidth: STROKE_W * 0.8,
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

    useImperativeHandle(ref, () => ({
      handleDownload,
    }));

    return (
      <Tooltip
        title="Нажмите для просмотра"
        enterDelay={500}
        followCursor
        arrow
        placement="top"
        slotProps={{
          popper: {
            modifiers: [
              {
                name: "offset",
                options: {
                  offset: [0, -9],
                },
              },
            ],
          },
        }}
      >
        <Box
          flex={1}
          display="flex"
          justifyContent="center"
          alignItems="center"
          bgcolor="#f4f6f8"
          overflow="auto"
          sx={{ background: "#D3D3D399" }}
          borderRadius={1}
          style={{ cursor: "pointer" }}
          onClick={(e) => {
            handleStageClick(e);
          }}
        >
          <Box bgcolor="#fff">
            <Stage ref={stageRef} width={STAGE_WIDTH} height={STAGE_HEIGHT}>
              <Layer>
                {image && (
                  <KonvaImage
                    image={image}
                    x={imageX}
                    y={imageY}
                    scaleX={scaleToFit}
                    scaleY={scaleToFit}
                  />
                )}

                {!image && (
                  <>
                    <Rect
                      width={STAGE_WIDTH}
                      height={STAGE_HEIGHT}
                      fill="rgba(255,255,255,0.7)"
                    />
                    <Text
                      x={STAGE_WIDTH / 2}
                      y={STAGE_HEIGHT / 2}
                      text="Загрузка..."
                      fontSize={18}
                      fontStyle="bold"
                      fill="#004E9E"
                      align="center"
                      verticalAlign="middle"
                      fontFamily="Inter"
                      offsetX={50}
                      offsetY={10}
                    />
                  </>
                )}

                {renderGrid()}

                {/* Пользовательская траектория */}
                {showUserTrajectory &&
                  points.length > 1 &&
                  points.map((point, i) => {
                    if (i === 0) return null;
                    const prev = points[i - 1];
                    const from = {
                      x: prev.x * scaleToFit + imageX,
                      y: prev.y * scaleToFit + imageY,
                    };

                    const to = {
                      x: point.x * scaleToFit + imageX,
                      y: point.y * scaleToFit + imageY,
                    };

                    const arrowPoints = getArrowPoints(from, to, 8, 8);

                    return (
                      <Arrow
                        key={`arrow-${i}`}
                        points={arrowPoints}
                        pointerLength={5}
                        pointerWidth={3}
                        fill="red"
                        stroke="red"
                        strokeWidth={2}
                      />
                    );
                  })}

                {showUserTrajectory &&
                  points.map((point, i) => (
                    <Fragment key={`point-${i}`}>
                      <Circle
                        x={point.x * scaleToFit + imageX}
                        y={point.y * scaleToFit + imageY}
                        radius={8}
                        fill="blue"
                      />
                      <Text
                        x={point.x * scaleToFit + imageX - 5}
                        y={point.y * scaleToFit + imageY - 7}
                        text={(i + 1).toString()}
                        fontSize={12}
                        fill="white"
                      />
                    </Fragment>
                  ))}

                {/* Препятствия */}
                {showObstacles &&
                  obstacles.map((poly) => (
                    <Line
                      key={poly.id}
                      points={poly.points.flatMap((p) => [
                        p.x * scaleToFit + imageX,
                        p.y * scaleToFit + imageY,
                      ])}
                      closed
                      fill={`${poly.color}30`}
                      stroke={poly.color}
                      strokeWidth={2}
                    />
                  ))}

                {showTaxonTrajectory &&
                  image &&
                  trajectoryData?.B?.map((taxon: any, idx: number) => {
                    const color = taxon.color;

                    const meterPerPixelX = width_m / image.width;
                    const meterPerPixelY = height_m / image.height;

                    const baseX = taxon.base[0] / meterPerPixelX;
                    const baseY = image.height - taxon.base[1] / meterPerPixelY;

                    const taxonPoints: TrajectoryPoint[] = taxon.points.map(
                      (p: [number, number], i: number) => ({
                        x: p[0] / meterPerPixelX,
                        y: image.height - p[1] / meterPerPixelY,
                        color,
                        number: i + 1,
                      }),
                    );

                    const segments = taxon.segments || [];

                    return (
                      <Fragment key={`taxon-${idx}`}>
                        {/* База */}
                        <Line
                          points={[
                            baseX * scaleToFit + imageX - 8,
                            baseY * scaleToFit + imageY - 8,
                            baseX * scaleToFit + imageX + 8,
                            baseY * scaleToFit + imageY,
                            baseX * scaleToFit + imageX - 8,
                            baseY * scaleToFit + imageY + 8,
                          ]}
                          fill={color}
                          closed
                        />

                        {taxonPoints.length > 0 && (
                          <>
                            <Arrow
                              points={getArrowPoints(
                                {
                                  x: baseX * scaleToFit + imageX,
                                  y: baseY * scaleToFit + imageY,
                                },
                                {
                                  x: taxonPoints[0].x * scaleToFit + imageX,
                                  y: taxonPoints[0].y * scaleToFit + imageY,
                                },
                                BASE_RADIUS,
                                TAXON_POINT_RADIUS,
                              )}
                              pointerLength={10}
                              pointerWidth={7}
                              fill={color}
                              stroke={color}
                              strokeWidth={2}
                            />
                            <Arrow
                              points={getArrowPoints(
                                {
                                  x:
                                    taxonPoints[taxonPoints.length - 1].x *
                                    scaleToFit +
                                    imageX,
                                  y:
                                    taxonPoints[taxonPoints.length - 1].y *
                                    scaleToFit +
                                    imageY,
                                },
                                {
                                  x: baseX * scaleToFit + imageX,
                                  y: baseY * scaleToFit + imageY,
                                },
                                TAXON_POINT_RADIUS,
                                BASE_RADIUS,
                              )}
                              pointerLength={10}
                              pointerWidth={7}
                              fill={color}
                              stroke={color}
                              strokeWidth={2}
                            />
                          </>
                        )}

                        {taxonPoints.map((point, i) => {
                          if (i === 0) return null;

                          const prev = taxonPoints[i - 1];

                          const from = {
                            x: prev.x * scaleToFit + imageX,
                            y: prev.y * scaleToFit + imageY,
                          };

                          const to = {
                            x: point.x * scaleToFit + imageX,
                            y: point.y * scaleToFit + imageY,
                          };

                          const arrowPoints = getArrowPoints(
                            from,
                            to,
                            TAXON_POINT_RADIUS,
                            TAXON_POINT_RADIUS,
                          );

                          return (
                            <Arrow
                              key={`taxon-arrow-${i}`}
                              points={arrowPoints}
                              pointerLength={10}
                              pointerWidth={7}
                              fill={color}
                              stroke={color}
                              strokeWidth={2}
                            />
                          );
                        })}

                        {/* НАВИГАЦИОННЫЕ ТРЕУГОЛЬНИКИ*/}
                        {segments.map((segment: any, segIdx: number) => {

                          // Значение координат в метрах
                          const pFrom = segment.p_from;
                          const pTo = segment.p_to;

                          // Получаем углы (навигационная система: 0°=Север, по часовой)
                          let TC = segment.TC;
                          if (typeof TC === 'object' && TC !== null) {
                            TC = TC.parsedValue ?? TC.source ?? 0;
                          }
                          const TA = segment.TA;
                          const GS = segment.GS;
                          const TAS = segment.TAS;
                          const windSpeed = segment.wind_speed;
                          const windDirDeg = segment.wind_dir_deg;

                          // Ветер: "откуда" в "куда" (+180)
                          const windTo = (windDirDeg + 180) % 360;

                          // Угол линии пути (для отладки/валидации) — в навигационной системе
                          const dx_m = pTo[0] - pFrom[0]; // Восток +
                          const dy_m = pTo[1] - pFrom[1]; // Север +
                          const lineAngleNav = (Math.atan2(dx_m, dy_m) * 180 / Math.PI + 360) % 360;

                          // Валидация: сравнение угла линии и TC
                          const deltaAngle = Math.abs(lineAngleNav - TC);
                          const deltaNormalized = Math.min(deltaAngle, 360 - deltaAngle);
                          if (deltaNormalized > 2) {
                            console.warn(`Сегмент ${segIdx}: расхождение углов ${deltaNormalized.toFixed(1)}° (линия=${lineAngleNav.toFixed(1)}°, TC=${TC.toFixed(1)}°)`);
                          }

                          // Отрисовка
                          // Координаты старта в пикселях канваса
                          const fromX_px = pFrom[0] / meterPerPixelX;
                          const fromY_px = image.height - pFrom[1] / meterPerPixelY; // переворот Y
                          const triStartX = fromX_px * scaleToFit + imageX;
                          const triStartY = fromY_px * scaleToFit + imageY;

                          const distMeters = Math.hypot(pTo[0] - pFrom[0], pTo[1] - pFrom[1]);
                          const triangleScaleM = Math.min(Math.max(distMeters * 0.003, 0.5), 1); // метров на единицу величины

                          // const navAngleToCanvasVec = (angleDeg: number, magnitude: number) => {
                          //   const rad = angleDeg * Math.PI / 180;

                          //   // Вектор в метрах (изотропная система)
                          //   const metersX = magnitude * triangleScaleM * Math.sin(rad);   // Восток +
                          //   const metersY = -magnitude * triangleScaleM * Math.cos(rad);  // Север +, но минус для канваса Y↓

                          //   // Конвертация в пиксели канваса с учётом разного масштаба по осям
                          //   return {
                          //     x: metersX / meterPerPixelX * scaleToFit,
                          //     y: metersY / meterPerPixelY * scaleToFit
                          //   };
                          // };

                          const navAngleToCanvasVec = (angleDeg: number, magnitude: number) => {
                              const rad = angleDeg * Math.PI / 180;

                              const dirX = Math.sin(rad);
                              const dirY = -Math.cos(rad);

                              // Сначала считаем "сырой" вектор
                              const triangleSizeMeters = distMeters;
                              const rawSizePxX = (triangleSizeMeters / meterPerPixelX) * scaleToFit;
                              const rawSizePxY = (triangleSizeMeters / meterPerPixelY) * scaleToFit;

                              // Вычисляем скалярную величину (магнитуду) этого вектора
                              const rawMagnitude = Math.hypot(rawSizePxX, rawSizePxY);

                              // Ограничиваем магнитуду
                              const MIN_PX = 10;
                              const MAX_PX = 15;
                              const clampedMagnitude = Math.min(Math.max(rawMagnitude, MIN_PX), MAX_PX);

                              // Нормализуем и масштабируем
                              const scale = clampedMagnitude / (rawMagnitude || 1);

                              return {
                                x: dirX * magnitude * rawSizePxX * scale,
                                y: dirY * magnitude * rawSizePxY * scale
                              };
                          };

                          // Векторы для отрисовки
                          const gsVec = navAngleToCanvasVec(TC, GS);
                          const tasVec = navAngleToCanvasVec(TA, TAS);
                          const windVec = navAngleToCanvasVec(windTo, windSpeed);

                          return (
                            <Fragment key={`nav-triangle-${idx}-${segIdx}`}>
                              {/* Красная стрелка GS — теперь должна совпадать с линией пути */}
                              <Arrow
                                points={[triStartX, triStartY, triStartX + gsVec.x, triStartY + gsVec.y]}
                                pointerLength={8}
                                pointerWidth={5}
                                fill="red"
                                stroke="red"
                                strokeWidth={1.5}
                                opacity={0.9}
                              />

                              {/* Синяя стрелка TAS (курс) */}
                              <Arrow
                                points={[triStartX, triStartY, triStartX + tasVec.x, triStartY + tasVec.y]}
                                pointerLength={8}
                                pointerWidth={5}
                                fill="blue"
                                stroke="blue"
                                strokeWidth={2.5}
                                opacity={0.9}
                              />

                              {/* Зелёная стрелка ветра */}
                              <Arrow
                                points={[triStartX, triStartY, triStartX + windVec.x, triStartY + windVec.y]}
                                pointerLength={8}
                                pointerWidth={5}
                                fill="green"
                                stroke="green"
                                strokeWidth={2.5}
                                opacity={0.8}
                              />

                              {/* Пунктиры */}
                              <Line
                                points={[
                                  triStartX + windVec.x, triStartY + windVec.y,
                                  triStartX + windVec.x + tasVec.x, triStartY + windVec.y + tasVec.y,
                                ]}
                                stroke="blue"
                                strokeWidth={1.5}
                                dash={[6, 4]}
                                opacity={1}
                              />
                              <Line
                                points={[
                                  triStartX + tasVec.x, triStartY + tasVec.y,
                                  triStartX + tasVec.x + windVec.x, triStartY + tasVec.y + windVec.y,
                                ]}
                                stroke="green"
                                strokeWidth={1.5}
                                dash={[6, 4]}
                                opacity={1}
                              />

                              {/* <Circle
        x={triStartX + tasVecX}
        y={triStartY + tasVecY}
        radius={4}
        fill="cyan"
        opacity={0.8}
      /> */}
                            </Fragment>
                          );
                        })}

                        {/* Точки таксона и номера */}
                        {taxonPoints.map((p, i) => (
                          <Fragment key={`taxon-point-${idx}-${i}`}>
                            <Circle
                              x={p.x * scaleToFit + imageX}
                              y={p.y * scaleToFit + imageY}
                              radius={10}
                              fill={p.color}
                            />
                            <Text
                              x={p.x * scaleToFit + imageX - 5}
                              y={p.y * scaleToFit + imageY - 7}
                              text={`${i + 1}`}
                              fontSize={12}
                              fill="black"
                            />
                          </Fragment>
                        ))}
                      </Fragment>
                    );
                  })}

                        {/* Стрелка направления ветра */}
                        {!showUserTrajectory && weatherConditions && weatherConditions.isUse && weatherConditions.windSpeed > 0 && (
                          <Group>
                            {/* Подложка */}
                            <Rect
                              x={20} y={20}
                              width={90} height={90}
                              fill="rgba(0,0,0,0.45)"
                              cornerRadius={8}
                            />

                            {/* Стрелка — вращается по wind_dir_deg */}
                            {(() => {
                              const cx = 65, cy = 65;
                              const len = 15;
                              // ветер ДУЕТ В эту сторону (метеорологический = откуда, поэтому +180)
                              const rad = Math.PI * (weatherConditions.windDirection + 180) / 180;
                              const x2 = cx + len * Math.sin(rad);
                              const y2 = cy - len * Math.cos(rad);
                              const x1 = cx - len * Math.sin(rad);
                              const y1 = cy + len * Math.cos(rad);
                              return (
                                <Arrow
                                  points={[x1, y1, x2, y2]}
                                  pointerLength={8}
                                  pointerWidth={6}
                                  fill="#ff6b00"
                                  stroke="#ff6b00"
                                  strokeWidth={2}
                                />
                              );
                            })()}

                            <Text
                              x={20} y={24}
                              width={90}
                              text="ветер"
                              fontSize={10}
                              fill="white"
                              align="center"
                            />
                            <Text
                              x={20} y={88}
                              width={90}
                              text={`${weatherConditions.windSpeed.toFixed(1)} м/с`}
                              fontSize={10}
                              fill="#ff6b00"
                              align="center"
                            />
                          </Group>
                        )}

                {showTaxonTrajectory &&
                  image &&
                  trajectoryData?.C?.map(
                    (point: [number, number], index: number) => {
                      const meterPerPixelX = width_m / image.width;
                      const meterPerPixelY = height_m / image.height;

                      let x = point[0] / meterPerPixelX;
                      let y = image.height - point[1] / meterPerPixelY;
                      const cx = x * scaleToFit + imageX;
                      const cy = y * scaleToFit + imageY;
                      const r = 7;

                      return (
                        <Fragment key={`unvisited-${index}`}>
                          <Circle
                            x={cx}
                            y={cy}
                            radius={r}
                            fill="rgba(255, 107, 53, 0.15)"
                            stroke="#FF6B35"
                            strokeWidth={1.5}
                          />
                          <Line
                            points={[cx - 4, cy - 4, cx + 4, cy + 4]}
                            stroke="#FF6B35"
                            strokeWidth={2}
                          />
                          <Line
                            points={[cx + 4, cy - 4, cx - 4, cy + 4]}
                            stroke="#FF6B35"
                            strokeWidth={2}
                          />
                        </Fragment>
                      );
                    },
                  )}

                {flightLineY !== null && image && (
                  <Fragment key="line">
                    <Line
                      points={[
                        imageX,
                        flightLineY * scaleToFit + imageY,
                        imageX + image.width * scaleToFit,
                        flightLineY * scaleToFit + imageY,
                      ]}
                      stroke="orange"
                      strokeWidth={2}
                    />

                    <Rect
                      x={imageX}
                      y={flightLineY * scaleToFit + imageY}
                      width={image.width * scaleToFit}
                      height={(image.height - flightLineY) * scaleToFit}
                      fill="rgba(128, 128, 128, 0.3)"
                      listening={false}
                    />

                    {flightLineY < image.height - 0.01 && (
                      <Text
                        x={imageX}
                        y={
                          flightLineY * scaleToFit +
                          imageY +
                          ((image.height - flightLineY) * scaleToFit) / 2 -
                          10
                        }
                        width={image.width * scaleToFit}
                        text="Неинформативная зона"
                        align="center"
                        fontSize={16}
                        fill="rgba(255,255,255,0.8)"
                        listening={false}
                      />
                    )}
                  </Fragment>
                )}

                {(loading || isLoadingOptimization) && (
                  <>
                    <Rect
                      x={0}
                      y={0}
                      width={STAGE_WIDTH}
                      height={STAGE_HEIGHT}
                      fill="rgba(255,255,255,0.7)"
                    />
                    <Text
                      x={STAGE_WIDTH / 2}
                      y={STAGE_HEIGHT / 2}
                      text="Загрузка..."
                      fontSize={18}
                      fontStyle="bold"
                      fill="#004E9E"
                      align="center"
                      verticalAlign="middle"
                      fontFamily="Inter"
                      offsetX={50}
                      offsetY={10}
                    />
                  </>
                )}
              </Layer>
            </Stage>
          </Box>
        </Box>
      </Tooltip>
    );
  },
);

export default SceneShower;
