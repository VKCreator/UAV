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
} from "react-konva";
import useImage from "use-image";
import Tooltip from "@mui/material/Tooltip";

import Konva from "konva";

import type { Point, Polygon, ImageData, TrajectoryPoint } from "./scene.types";

const STAGE_WIDTH = 500;
const STAGE_HEIGHT = 400;
const TAXON_POINT_RADIUS = 10;
const BASE_RADIUS = 4;

// const colors = [
//   "#65b9f7", // яркий голубой
//   "#ff6b6b", // яркий красный
//   "#66a9ff", // яркий синий
//   "#ffdd57", // ярко-жёлто-оранжевый
//   "#65b9f7", // яркий голубой
//   "#9e69c4", // ярко-фиолетовый
//   "#64f3f1", // яркий циановый
//   "#f59fe1", // яркий лавандовый
//   "#f4e24d", // ярко-жёлтый
//   "#e38b5a", // тёплый бежевый
//   "#5e4a3a", // насыщенный коричневый
//   "#7a9f60", // ярко-зелёно-коричневый
//   "#a2b9d1", // светло-голубой
//   "#d1d1d1", // светло-серый
//   "#b8a25b", // жёлто-коричневый
// ];

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
      flightLineY
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

    const width_m = droneParams.frameWidthBase; // длина изображения в метрах
    const height_m = droneParams.frameHeightBase; // высота изображения в метрах

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
          <Line
            key={`v-${i}`}
            points={[x, imageY, x, imageY + imgHeight]}
            stroke="rgba(255,255,255,0.8)"
            strokeWidth={1}
          />,
        );
      }

      for (let i = 1; i < GRID_ROWS; i++) {
        const y = imageY + imgHeight - (imgHeight / GRID_ROWS) * i;
        lines.push(
          <Line
            key={`h-${i}`}
            points={[imageX, y, imageX + imgWidth, y]}
            stroke="rgba(255,255,255,0.8)"
            strokeWidth={1}
          />,
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

      const konvaImage = new Konva.Image({
        image: image,
        x: 0,
        y: 0,
        width: image.width,
        height: image.height,
      });
      layer.add(konvaImage);

      // Добавляем сетку
      if (showGrid) {
        const cellWidth = image.width / GRID_COLS;
        const cellHeight = image.height / GRID_ROWS;

        for (let i = 1; i < GRID_COLS; i++) {
          const x = cellWidth * i;
          layer.add(
            new Konva.Line({
              points: [x, 0, x, image.height],
              stroke: "rgba(255,255,255,0.9)",
              strokeWidth: 1,
            }),
          );
        }

        for (let i = 1; i < GRID_ROWS; i++) {
          const y = image.height - cellHeight * i;
          layer.add(
            new Konva.Line({
              points: [0, y, image.width, y],
              stroke: "rgba(255,255,255,0.9)",
              strokeWidth: 1,
            }),
          );
        }
      }

      // Добавляем пользовательские точки и стрелки
      if (showUserTrajectory) {
        points.forEach((point, i) => {
          if (i > 0) {
            const prev = points[i - 1];
            layer.add(
              new Konva.Arrow({
                points: [prev.x, prev.y, point.x, point.y],
                pointerLength: 10,
                pointerWidth: 10,
                fill: "red",
                stroke: "red",
                strokeWidth: 2,
              }),
            );
          }
          layer.add(
            new Konva.Circle({
              x: point.x,
              y: point.y,
              radius: 10,
              fill: "blue",
            }),
          );
          layer.add(
            new Konva.Text({
              x: point.x - 5,
              y: point.y - 7,
              text: (i + 1).toString(),
              fontSize: 12,
              fill: "white",
            }),
          );
        });
      }

      // Добавляем траектории таксонов
      if (showTaxonTrajectory && trajectoryData?.B) {
        const meterPerPixelX = width_m / image.width;
        const meterPerPixelY = height_m / image.height;

        trajectoryData.B.forEach((taxon: any, idx: number) => {
          const color = taxon.color;

          const baseX = taxon.base[0] / meterPerPixelX;
          const baseY = image.height - taxon.base[1] / meterPerPixelY;

          const taxonPoints = taxon.points.map((p: [number, number]) => ({
            x: p[0] / meterPerPixelX,
            y: image.height - p[1] / meterPerPixelY,
          }));

          // База
          layer.add(
            new Konva.Line({
              points: [
                baseX - 8,
                baseY - 8,
                baseX + 8,
                baseY,
                baseX - 8,
                baseY + 8,
              ],
              fill: color,
              closed: true,
            }),
          );

          // Стрелки между базой и точками
          if (taxonPoints.length > 0) {
            layer.add(
              new Konva.Arrow({
                points: [baseX, baseY, taxonPoints[0].x, taxonPoints[0].y],
                pointerLength: 10,
                pointerWidth: 10,
                fill: color,
                stroke: color,
                strokeWidth: 2,
              }),
            );
            layer.add(
              new Konva.Arrow({
                points: [
                  taxonPoints[taxonPoints.length - 1].x,
                  taxonPoints[taxonPoints.length - 1].y,
                  baseX,
                  baseY,
                ],
                pointerLength: 10,
                pointerWidth: 10,
                fill: color,
                stroke: color,
                strokeWidth: 2,
              }),
            );
          }

          // Стрелки между точками таксона и кружки
          taxonPoints.forEach((p: any, i: any) => {
            if (i > 0) {
              const prev = taxonPoints[i - 1];
              layer.add(
                new Konva.Arrow({
                  points: [prev.x, prev.y, p.x, p.y],
                  pointerLength: 10,
                  pointerWidth: 10,
                  fill: color,
                  stroke: color,
                  strokeWidth: 2,
                }),
              );
            }
            layer.add(
              new Konva.Circle({
                x: p.x,
                y: p.y,
                radius: 15,
                fill: color,
              }),
            );
            layer.add(
              new Konva.Text({
                x: p.x - 5,
                y: p.y - 7,
                text: (i + 1).toString(),
                fontSize: 12,
                fill: "white",
              }),
            );
          });
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
                      fontSize={18} // чуть больше
                      fontStyle="bold" // полужирный
                      fill="#004E9E" // красивый синий
                      align="center"
                      verticalAlign="middle"
                      fontFamily="Inter"
                      offsetX={50} // смещение по центру (половина ширины текста, пример)
                      offsetY={10} // смещение по центру
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

                    const arrowPoints = getArrowPoints(from, to, 8, 8); // 10 = radius circle

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

                {showTaxonTrajectory &&
                  image &&
                  trajectoryData?.C?.map(
                    (point: [number, number], index: number) => {
                      const meterPerPixelX = width_m / image.width;
                      const meterPerPixelY = height_m / image.height;

                      // Преобразуем координаты в пиксели
                      let x = point[0] / meterPerPixelX;
                      let y = image.height - point[1] / meterPerPixelY;
                      const cx = x * scaleToFit + imageX;
                      const cy = y * scaleToFit + imageY;
                      const r = 7;

                      return (
                        <Fragment key={`unvisited-${index}`}>
                          {/* Круг-фон */}
                          <Circle
                            x={cx}
                            y={cy}
                            radius={r}
                            fill="rgba(255, 107, 53, 0.15)"
                            stroke="#FF6B35"
                            strokeWidth={1.5}
                          />
                          {/* Крестик внутри */}
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
                      fontSize={18} // чуть больше
                      fontStyle="bold" // полужирный
                      fill="#004E9E" // красивый синий
                      align="center"
                      verticalAlign="middle"
                      fontFamily="Inter"
                      offsetX={50} // смещение по центру (половина ширины текста, пример)
                      offsetY={10} // смещение по центру
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
