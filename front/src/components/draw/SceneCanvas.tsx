import { FC, Fragment, useRef, useState } from "react";
import { Box } from "@mui/material";
import {
  Stage,
  Layer,
  Image as KonvaImage,
  Circle,
  Line,
  Arrow,
  Text,
  Rect,
} from "react-konva";
import useImage from "use-image";

import type { Point, Polygon, TrajectoryPoint } from "./scene.types";

const STAGE_WIDTH = 1100;
const STAGE_HEIGHT = 700;

const TAXON_POINT_RADIUS = 8;
const BASE_RADIUS = 4;
interface SceneCanvasProps {
  imageData: { imageUrl: string };

  points?: Point[];
  obstacles?: Polygon[];
  trajectoryData?: any;

  showPoints?: boolean;
  showObstacles?: boolean;
  showTaxons?: boolean;

  frameWidthPx: number;
  frameHeightPx: number;

  applyPointBasedStoryboard: boolean;
  applyRecommendedStoryboard: boolean;
  applyOptimalStoryboard: boolean;

  isSelecting: boolean;

  activeType: any;

  width_m: number;
  height_m: number;
}

const SceneCanvas: FC<SceneCanvasProps> = ({
  imageData,
  points = [],
  obstacles = [],
  trajectoryData,
  showPoints = true,
  showObstacles = true,
  showTaxons = true,
  frameWidthPx,
  frameHeightPx,
  applyPointBasedStoryboard,
  applyRecommendedStoryboard,
  applyOptimalStoryboard,
  isSelecting,
  activeType,
  width_m,
  height_m
}) => {
  const stageRef = useRef<any>(null);
  const [image] = useImage(imageData.imageUrl);

  const [scale] = useState(1);
  const [position] = useState({ x: 0, y: 0 });

  const scaleToFit = image
    ? Math.min(
        1,
        (STAGE_WIDTH / image.width) * 0.9,
        (STAGE_HEIGHT / image.height) * 0.9,
      )
    : 1;

  const imageX = image ? (STAGE_WIDTH - image.width * scaleToFit) / 2 : 0;
  const imageY = image ? (STAGE_HEIGHT - image.height * scaleToFit) / 2 : 0;

  const [isClickSelecting, setIsClickSelecting] = useState(false);
  const [selection, setSelection] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);

  const handleMouseDown = (e: any) => {
    console.error(applyRecommendedStoryboard);
    if (!isSelecting || activeType != "recommended") return;

    const stage = e.target.getStage();
    const pointer = stage.getRelativePointerPosition();

    if (!pointer) return;

    setIsClickSelecting(true);
    setSelection({
      x: pointer.x,
      y: pointer.y,
      width: 0,
      height: 0,
    });
  };

  const handleMouseMove = (e: any) => {
    if (!isSelecting) return;

    if (!isClickSelecting || !selection) return;

    const stage = e.target.getStage();
    const pointer = stage.getRelativePointerPosition();
    if (!pointer) return;
    console.error("move");
    setSelection({
      ...selection,
      width: pointer.x - selection.x,
      height: pointer.y - selection.y,
    });
  };

  const handleMouseUp = () => {
    if (!isSelecting) return;

    setIsClickSelecting(false);
  };

  const handleRectClick = (i: number) => {
    // console.info(i)
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
    if (!length) return [from.x, from.y, to.x, to.y];

    const ux = dx / length;
    const uy = dy / length;

    return [
      from.x + ux * fromRadius,
      from.y + uy * fromRadius,
      to.x - ux * toRadius,
      to.y - uy * toRadius,
    ];
  };

  const generateGridInSelection = () => {
    if (!selection) return [];

    const scaledFrameWidth = frameWidthPx * scaleToFit;
    const scaledFrameHeight = frameHeightPx * scaleToFit;

    const stepX = scaledFrameWidth; // шаг по ширине
    const stepY = scaledFrameHeight; // шаг по высоте

    const points: { x: number; y: number }[] = [];

    // Начинаем с левого нижнего угла
    const startX = selection.x + scaledFrameWidth / 2;
    const endX = selection.x + selection.width;
    let currentY = selection.y + selection.height - scaledFrameHeight / 2;
    let rowIndex = 0; // Индекс для отслеживания направления движения

    // Пока текущая строка не выйдет за пределы области
    while (
      currentY >=
      selection.y + scaledFrameHeight / 2 - scaledFrameHeight / 2
    ) {
      const row: { x: number; y: number }[] = [];
      let currentX = startX;

      // Заполняем строки
      while (currentX <= endX) {
        row.push({ x: currentX, y: currentY });
        currentX += stepX; // Двигаемся по ширине
      }

      // Если нечётная строка — разворачиваем
      if (rowIndex % 2 !== 0) {
        row.reverse();
      }

      points.push(...row); // Добавляем строку в итоговый массив

      currentY -= stepY; // Двигаемся вверх на новый ряд
      rowIndex++;
    }

    return points;
  };

  const gridPoints =
    applyRecommendedStoryboard && selection ? generateGridInSelection() : [];
  // const generateRecommendedGrid = () => {
  //   const recommendedYStep = frameHeightPx + 150; // шаг по высоте (в px)
  //   const recommendedXStep = frameWidthPx - 250; // шаг по ширине (в px)

  //   if (!image || !recommendedYStep || !recommendedXStep) return [];

  //   const rows: { x: number; y: number }[][] = [];

  //   const scaledFrameWidth = frameWidthPx * scaleToFit;
  //   const scaledFrameHeight = frameHeightPx * scaleToFit;
  //   const stepY = recommendedYStep * scaleToFit;
  //   const stepX = recommendedXStep * scaleToFit;

  //   const imgWidth = image.width * scaleToFit;
  //   const imgHeight = image.height * scaleToFit;

  //   let currentY = imageY + imgHeight - scaledFrameHeight / 2;
  //   let rowIndex = 0;

  //   // Пока currentY больше верхней границы, продолжаем создавать строки
  //   while (currentY >= imageY + scaledFrameHeight / 2) {
  //     const row: { x: number; y: number }[] = [];

  //     let currentX = imageX + scaledFrameWidth / 2;

  //     // Заполняем горизонтальные точки с шагом по X
  //     while (currentX <= imageX + imgWidth - scaledFrameWidth / 2) {
  //       row.push({ x: currentX, y: currentY });
  //       currentX += stepX; // Шаг по X
  //     }

  //     // Если нечётный ряд, разворачиваем его
  //     if (rowIndex % 2 !== 0) {
  //       row.reverse();
  //     }

  //     rows.push(row);

  //     currentY -= stepY; // Шаг по Y
  //     rowIndex++;
  //   }

  //   // Превращаем массив рядов в плоский массив точек
  //   return rows.flat();
  // };
  const renderSnakePath = (gridPoints: { x: number; y: number }[]) => {
    const arrows = [];

    for (let i = 0; i < gridPoints.length - 1; i++) {
      const start = gridPoints[i];
      const end = gridPoints[i + 1];

      // Рисуем стрелки между точками
      arrows.push(
        <Arrow
          key={`arrow-${i}`}
          points={getArrowPoints(
            start,
            end,
            TAXON_POINT_RADIUS,
            TAXON_POINT_RADIUS,
          )}
          stroke="blue"
          fill="blue"
          strokeWidth={2}
          pointerLength={8}
          pointerWidth={8}
        />,
      );
    }

    return arrows;
  };

  return (
    <Box boxShadow={3} bgcolor="#fff">
      <Stage
        ref={stageRef}
        width={STAGE_WIDTH}
        height={STAGE_HEIGHT}
        scaleX={scale}
        scaleY={scale}
        x={position.x}
        y={position.y}
        draggable={!isSelecting}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
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

          {selection && activeType === "recommended" && (
            <Rect
              x={selection.x}
              y={selection.y}
              width={selection.width}
              height={selection.height}
              stroke="orange"
              strokeWidth={2}
              dash={[6, 4]}
              fill="#FF800022"
            />
          )}
          {/* Пользовательские точки */}
          {showPoints &&
            points.map((p, i) => {
              const x = p.x * scaleToFit + imageX;
              const y = p.y * scaleToFit + imageY;
              const scaledFrameWidth = frameWidthPx * scaleToFit;
              const scaledFrameHeight = frameHeightPx * scaleToFit;

              return (
                <Fragment key={`p-${i}`}>
                  {applyPointBasedStoryboard && (
                    <Rect
                      x={x - scaledFrameWidth / 2}
                      y={y - scaledFrameHeight / 2}
                      width={scaledFrameWidth}
                      height={scaledFrameHeight}
                      stroke="black"
                      strokeWidth={2}
                      fill="#d83b3b22"
                      onClick={() => handleRectClick(i)}
                    />
                  )}

                  <Circle x={x} y={y} radius={10} fill="blue" />

                  <Text
                    x={x - 4}
                    y={y - 6}
                    text={`${i + 1}`}
                    fontSize={12}
                    fill="white"
                  />
                </Fragment>
              );
            })}

          {/* Линии между точками */}
          {showPoints &&
            points.length > 1 &&
            points.map((p, i) => {
              if (i === 0) return null;
              const prev = points[i - 1];

              return (
                <Arrow
                  key={`arrow-${i}`}
                  points={getArrowPoints(
                    {
                      x: prev.x * scaleToFit + imageX,
                      y: prev.y * scaleToFit + imageY,
                    },
                    {
                      x: p.x * scaleToFit + imageX,
                      y: p.y * scaleToFit + imageY,
                    },
                    TAXON_POINT_RADIUS,
                    TAXON_POINT_RADIUS,
                  )}
                  stroke="red"
                  fill="red"
                  strokeWidth={2}
                />
              );
            })}

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

          {/* Recommended storyboard grid */}
          {applyRecommendedStoryboard &&
            gridPoints.length > 0 &&
            gridPoints.map((r, i, arr) => (
              <Fragment key={`grid-${i}`}>
                <Rect
                  x={r.x - (frameWidthPx * scaleToFit) / 2}
                  y={r.y - (frameHeightPx * scaleToFit) / 2}
                  width={frameWidthPx * scaleToFit}
                  height={frameHeightPx * scaleToFit}
                  stroke="#000000"
                  strokeWidth={2}
                  fill="#2ef36f22"
                />
                <Circle
                  x={r.x}
                  y={r.y}
                  radius={TAXON_POINT_RADIUS}
                  fill="red"
                />
              </Fragment>
            ))}

          {applyRecommendedStoryboard && renderSnakePath(gridPoints)}

          {showTaxons &&
            image &&
            trajectoryData?.B?.map((taxon: any, idx: number) => {
              const color = taxon.color;

              const meterPerPixelX = width_m / image.width;
              const meterPerPixelY = height_m / image.height;

              // База
              const baseX = taxon.base[0] / meterPerPixelX;
              const baseY = image.height - taxon.base[1] / meterPerPixelY;

              // Точки таксона
              const taxonPoints: TrajectoryPoint[] = taxon.points.map(
                (p: [number, number], i: number) => ({
                  x: p[0] / meterPerPixelX,
                  y: image.height - p[1] / meterPerPixelY,
                  color,
                  number: i + 1,
                }),
              );

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

                  {/* Точки таксона и номера */}
                  {taxonPoints.map((p, i) => (
                    <Fragment key={`taxon-point-${idx}-${i}`}>
                      <Circle
                        x={p.x * scaleToFit + imageX}
                        y={p.y * scaleToFit + imageY}
                        radius={10}
                        fill={p.color}
                        // stroke="black"
                        // strokeWidth={0.1}
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
        </Layer>
      </Stage>
    </Box>
  );
};

export default SceneCanvas;
