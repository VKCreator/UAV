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
  Rect
} from "react-konva";
import useImage from "use-image";

import type { Point, Polygon, TrajectoryPoint } from "./scene.types";

const STAGE_WIDTH = 1100;
const STAGE_HEIGHT = 700;

const TAXON_POINT_RADIUS = 10;
const BASE_RADIUS = 4;
const POINT_RECT_WIDTH = 150;   // ширина рамки
const POINT_RECT_HEIGHT = 75;  // высота рамки
interface SceneCanvasProps {
  imageData: { imageUrl: string };

  points?: Point[];
  obstacles?: Polygon[];
  trajectoryData?: any;

  showPoints?: boolean;
  showObstacles?: boolean;
  showTaxons?: boolean;
}

const colors = [
  "#65b9f7", // яркий голубой
  "#ff6b6b", // яркий красный
  "#66a9ff", // яркий синий
  "#ffdd57", // ярко-жёлто-оранжевый
  "#9e69c4", // ярко-фиолетовый
  "#64f3f1", // яркий циановый
  "#f59fe1", // яркий лавандовый
  "#f4e24d", // ярко-жёлтый
  "#e38b5a", // тёплый бежевый
  "#5e4a3a", // насыщенный коричневый
  "#7a9f60", // ярко-зелёно-коричневый
  "#a2b9d1", // светло-голубой
  "#d1d1d1", // светло-серый
  "#b8a25b", // жёлто-коричневый
];

const SceneCanvas: FC<SceneCanvasProps> = ({
  imageData,
  points = [],
  obstacles = [],
  trajectoryData,
  showPoints = true,
  showObstacles = true,
  showTaxons = true,
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
        draggable
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

          {/* Пользовательские точки */}
          {showPoints &&
            points.map((p, i) => {
              const x = p.x * scaleToFit + imageX;
              const y = p.y * scaleToFit + imageY;

              return (
                <Fragment key={`p-${i}`}>
                  <Rect
                    x={x - POINT_RECT_WIDTH / 2} // смещаем, чтобы точка была в центре
                    y={y - POINT_RECT_HEIGHT / 2}
                    width={POINT_RECT_WIDTH}
                    height={POINT_RECT_HEIGHT}
                    stroke="black" // рамка
                    strokeWidth={2}
                    fill="#ff000022" // прозрачный фон
                    cornerRadius={0}
                  />
                  <Circle
                    x={x}
                    y={y}
                    radius={10} // точка в центре прямоугольника
                    fill="blue"
                  />
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
        </Layer>
      </Stage>
    </Box>
  );
};

export default SceneCanvas;
