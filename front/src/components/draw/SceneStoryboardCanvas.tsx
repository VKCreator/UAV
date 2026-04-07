import { FC, Fragment, useEffect, useRef, useState } from "react";
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

const STAGE_WIDTH = 1000;
const STAGE_HEIGHT = 600;

const TAXON_POINT_RADIUS = 10;
const BASE_RADIUS = 4;

interface SceneCanvasProps {
  imageData: { imageUrl: string };

  points?: Point[];
  pointsRecommended?: Point[];
  pointsOptimal?: Point[];
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

  selection: any;
  setSelection: React.Dispatch<React.SetStateAction<any>>;
  droneParams: any;
}

const getOffsetX = (num: number) => {
  if (num < 10) return 4;
  if (num < 100) return 7;
  return 10;
};
const SceneCanvas: FC<SceneCanvasProps> = ({
  imageData,
  points = [],
  pointsRecommended = [],
  pointsOptimal = [],
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
  selection,
  setSelection,
  droneParams
}) => {
  const stageRef = useRef<any>(null);
  const [image] = useImage(imageData.imageUrl);

  // const [scale] = useState(1);
  // const [position] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const scaleToFit = image
    ? Math.min(
        1,
        (STAGE_WIDTH / image.width) * 0.9,
        (STAGE_HEIGHT / image.height) * 0.9,
      )
    : 1;

  const imageX = image ? (STAGE_WIDTH - image.width * scaleToFit) / 2 : 0;
  const imageY = image ? (STAGE_HEIGHT - image.height * scaleToFit) / 2 : 0;

  const GRID_COLS = droneParams.frameWidthBase / droneParams.frameWidthPlanned;
  const GRID_ROWS =
      droneParams.frameHeightBase / droneParams.frameHeightPlanned;

    const width_m = droneParams.frameWidthBase;
    const height_m = droneParams.frameHeightBase;

  const [isClickSelecting, setIsClickSelecting] = useState(false);

  const handleMouseDown = (e: any) => {
    if (!isSelecting || activeType != "recommended") return;

    const stage = e.target.getStage();
    const pointer = stage.getRelativePointerPosition();

    if (!pointer) return;

    const imageXCoord = (pointer.x - imageX) / scaleToFit;
    const imageYCoord = (pointer.y - imageY) / scaleToFit;

    setIsClickSelecting(true);
    setSelection({
      x: imageXCoord,
      y: imageYCoord,
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

    const imageXCoord = (pointer.x - imageX) / scaleToFit;
    const imageYCoord = (pointer.y - imageY) / scaleToFit;

    setSelection({
      ...selection,
      width: imageXCoord - selection.x,
      height: imageYCoord - selection.y,
    });
  };

  const handleMouseUp = () => {
    if (!isSelecting) return;

    setIsClickSelecting(false);
  };

  const handleDragMove = (e: any) => {
    const stage = e.target;
    setPosition({
      x: stage.x(),
      y: stage.y(),
    });
  };

  const handleRectClick = (i: number) => {
    // console.info(i)
  };

    const handleWheel = (e: any) => {
    e.evt.preventDefault();

    const scaleBy = 1.1;
    const stage = e.target.getStage();
    const oldScale = scale;

    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const mousePointTo = {
      x: (pointer.x - position.x) / oldScale,
      y: (pointer.y - position.y) / oldScale,
    };

    const direction = e.evt.deltaY > 0 ? -1 : 1;
    const newScale = direction > 0 ? oldScale * scaleBy : oldScale / scaleBy;

    setScale(newScale);
    setPosition({
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    });
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

  const renderSnakePath = (gridPoints: { x: number; y: number }[]) => {
    const arrows = [];

    for (let i = 0; i < gridPoints.length - 1; i++) {
      const start = {
        x: gridPoints[i].x * scaleToFit + imageX,
        y: gridPoints[i].y * scaleToFit + imageY,
      };
      const end = {
        x: gridPoints[i + 1].x * scaleToFit + imageX,
        y: gridPoints[i + 1].y * scaleToFit + imageY,
      };

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


    // Генерация линий сетки
    const renderGrid = () => {
      if (!image) return null;
      const lines: JSX.Element[] = [];
      const imgWidth = image.width * scaleToFit;
      const imgHeight = image.height * scaleToFit;

      // Вертикальные линии
      for (let i = 1; i < GRID_COLS; i++) {
        const x = imageX + (imgWidth / GRID_COLS) * i;
        lines.push(
          <Line
            key={`v-${i}`}
            points={[x, imageY, x, imageY + imgHeight]}
            stroke="rgba(255,255,255,0.6)"
            strokeWidth={2}
          />,
        );
      }
  
      // Горизонтальные линии
      for (let i = 1; i < GRID_ROWS; i++) {
        const y = imageY + imgHeight - (imgHeight / GRID_ROWS) * i;
        lines.push(
          <Line
            key={`h-${i}`}
            points={[imageX, y, imageX + imgWidth, y]}
            stroke="rgba(255,255,255,0.6)"
            strokeWidth={2}
          />,
        );
      }
  
      return lines;
    };

  useEffect(() => {
    const container = stageRef.current?.container();
    if (!container) return;

    container.style.cursor = isSelecting ? "pointer" : "grab";
  }, [isSelecting]);

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
        onWheel={handleWheel}
        style={{cursor: "grab"}}
        draggable={!isSelecting}
        onDragMove={handleDragMove}
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

          {renderGrid()}

          {selection && activeType === "recommended" && (
            <Rect
              x={selection.x * scaleToFit + imageX}
              y={selection.y * scaleToFit + imageY}
              width={selection.width * scaleToFit}
              height={selection.height * scaleToFit}
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
            pointsRecommended.length > 0 &&
            pointsRecommended.map((r, i, arr) => (
              <Fragment key={`grid-${i}`}>
                <Rect
                  x={
                    r.x * scaleToFit + imageX - (frameWidthPx * scaleToFit) / 2
                  }
                  y={
                    r.y * scaleToFit + imageY - (frameHeightPx * scaleToFit) / 2
                  }
                  width={frameWidthPx * scaleToFit}
                  height={frameHeightPx * scaleToFit}
                  stroke="#000000"
                  strokeWidth={2}
                  fill="#2ef36f22"
                />
                <Circle
                  x={r.x * scaleToFit + imageX}
                  y={r.y * scaleToFit + imageY}
                  radius={TAXON_POINT_RADIUS}
                  fill="red"
                />
                <Text
                  x={r.x * scaleToFit + imageX - getOffsetX(i + 1)}
                  y={r.y * scaleToFit + imageY - 6}
                  text={`${i + 1}`}
                  fontSize={12}
                  fill="white"
                />
              </Fragment>
            ))}

          {applyRecommendedStoryboard && renderSnakePath(pointsRecommended)}

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
                      {applyOptimalStoryboard && (
                        <Rect
                          x={
                            p.x * scaleToFit +
                            imageX -
                            (frameWidthPx * scaleToFit) / 2
                          }
                          y={
                            p.y * scaleToFit +
                            imageY -
                            (frameHeightPx * scaleToFit) / 2
                          }
                          width={frameWidthPx * scaleToFit}
                          height={frameHeightPx * scaleToFit}
                          stroke="#000000"
                          strokeWidth={2}
                          fill="#3a5cf322"
                        />
                      )}
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
