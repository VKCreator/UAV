import { FC, Fragment, useRef, type JSX } from "react";
import { Box, Typography } from "@mui/material";
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

import type { Point, Polygon, ImageData, TrajectoryPoint } from "./scene.types";

const STAGE_WIDTH = 500;
const STAGE_HEIGHT = 400;

const GRID_COLS = 6.67;
const GRID_ROWS = 6.75;

const colors = [
  "#ff0000",
  "#0000ff",
  "#008000",
  "#ffa500",
  "#800080",
  "#00ffff",
  "#ff00ff",
  "#ffff00",
];

interface SceneShowerProps {
  imageData: ImageData;
  sceneTitle?: string;

  points: Point[];
  obstacles: Polygon[];
  trajectoryData: any;

  showGrid?: boolean;
  showUserTrajectory?: boolean;
  showTaxonTrajectory?: boolean;
  showObstacles?: boolean;

  showView: () => void;
}

const SceneShower: FC<SceneShowerProps> = ({
  imageData,
  sceneTitle,

  points,
  obstacles,
  trajectoryData,

  showGrid = true,
  showUserTrajectory = true,
  showTaxonTrajectory = true,
  showObstacles = true,

  showView,
}) => {
  const stageRef = useRef<any>(null);
  const [image] = useImage(imageData.imageUrl);

  const width_m = 238.63;
  const height_m = 159.09;
  const meterPerPixelX = width_m / 5472;
  const meterPerPixelY = height_m / 3648;

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

  return (
    <Tooltip
      title="Просмотр схемы"
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
                    align="center"
                    fontSize={18}
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
                  return (
                    <Arrow
                      key={`arrow-${i}`}
                      points={[
                        prev.x * scaleToFit + imageX,
                        prev.y * scaleToFit + imageY,
                        point.x * scaleToFit + imageX,
                        point.y * scaleToFit + imageY,
                      ]}
                      pointerLength={10}
                      pointerWidth={10}
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
            </Layer>
          </Stage>
        </Box>
      </Box>
    </Tooltip>
  );
};

export default SceneShower;
