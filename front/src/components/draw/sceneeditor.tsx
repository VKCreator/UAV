import { FC, Fragment, useState, useRef, type JSX } from "react";
import {
  Box,
  Button,
  Divider,
  Stack,
  Typography,
  Checkbox,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import {
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
} from "@mui/material";

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
import Konva from "konva";

import PanToolIcon from "@mui/icons-material/PanTool";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import ChangeHistoryIcon from "@mui/icons-material/ChangeHistory";
import Tooltip from "@mui/material/Tooltip";
import { DeleteButton } from "../ui-widgets/DeleteButton";

import { AppBar, Toolbar, IconButton } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

import { v4 as uuidv4 } from "uuid";
import DeleteIcon from "@mui/icons-material/Delete";
import CheckIcon from "@mui/icons-material/Check";

import type { Point, Polygon, ImageData, TrajectoryPoint } from "./scene.types";

import { useLocalStorage } from "../../hooks/useLocalStorage/useLocalStorage";

const STAGE_WIDTH = 1100;
const STAGE_HEIGHT = 700;

interface SceneEditorProps {
  onClose: () => void;
  mode?: string;
  imageData: ImageData;
  droneParams: any;
  sceneTitle: string;

  points: Point[];
  setPoints: React.Dispatch<React.SetStateAction<Point[]>>;

  obstacles: Polygon[];
  setObstacles: React.Dispatch<React.SetStateAction<Polygon[]>>;

  trajectoryData: any;
  setTrajectoryData: (data: any) => void;
}

const TAXON_POINT_RADIUS = 10;
const BASE_RADIUS = 4;

const SceneEditor: FC<SceneEditorProps> = ({
  onClose,
  mode,
  imageData,
  sceneTitle,
  points,
  setPoints,
  obstacles,
  setObstacles,
  trajectoryData,
  setTrajectoryData,
  droneParams,
}) => {
  const [showGrid, setShowGrid] = useLocalStorage<boolean>("isShowGrid", true);
  const [showUserTrajectory, setShowUserTrajectory] = useLocalStorage<boolean>(
    "isShowUserTrajectory",
    true,
  );
  const [showObstacles, setShowObstacles] = useLocalStorage<boolean>(
    "isShowObstacles",
    true,
  );
  const [showTaxonTrajectory, setShowTaxonTrajectory] =
    useLocalStorage<boolean>("isShowTaxonTrajectory", true);

  const handleClose = () => {
    onClose();
  };

  const [sceneMode, setSceneMode] = useState<string>(sceneTitle);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [image] = useImage(imageData.imageUrl);
  const [currentPolygon, setCurrentPolygon] = useState<Point[]>([]);

  const [loading, setLoading] = useState(false);
  const [hoveredObstacleId, setHoveredObstacleId] = useState<string | null>(
    null,
  );

  const stageRef = useRef<any>(null);

  const colors = [
    "#65b9f7", // яркий голубой
    "#ff6b6b", // яркий красный
    "#66a9ff", // яркий синий
    "#ffdd57", // ярко-жёлто-оранжевый
    "#65b9f7", // яркий голубой
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

  const getNextPolygonColor = () => colors[obstacles.length % colors.length];

  type ToolMode = "pan" | "points" | "polygons";

  const [toolMode, setToolMode] = useState<string>(
    mode === undefined ? "pan" : mode,
  );
  const getCursor = () => {
    switch (toolMode) {
      case "pan":
        return "grab";
      case "points":
        return "crosshair";
      case "polygons":
        return "cell";
      default:
        return "default";
    }
  };

  const GRID_COLS = droneParams.frameWidthBase / droneParams.frameWidthPlanned;
  const GRID_ROWS =
    droneParams.frameHeightBase / droneParams.frameHeightPlanned;

  const width_m = droneParams.frameWidthBase; // длина изображения в метрах
  const height_m = droneParams.frameHeightBase; // высота изображения в метрах

  const cellWidth_m = width_m / GRID_COLS;
  const cellHeight_m = height_m / GRID_ROWS;

  // Масштаб, чтобы изображение вписалось в Stage
  const scaleToFit = image
    ? Math.min(
        1,
        (STAGE_WIDTH / image.width) * 0.9,
        (STAGE_HEIGHT / image.height) * 0.9,
      )
    : 1;

  // Позиция изображения для центрирования
  const imageX = image ? (STAGE_WIDTH - image.width * scaleToFit) / 2 : 0;
  const imageY = image ? (STAGE_HEIGHT - image.height * scaleToFit) / 2 : 0;

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

  const handleClick = (e: any) => {
    if (!image) return;
    if (toolMode == "pan") return;

    if (toolMode === "points") setShowUserTrajectory(true);

    if (toolMode === "polygons") setShowObstacles(true);

    if (e.evt.button !== 0) return; // Только левая кнопка мыши

    const stage = e.target.getStage();
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const xOnStage = (pointer.x - position.x) / scale;
    const yOnStage = (pointer.y - position.y) / scale;

    const xOnImage = (xOnStage - imageX) / scaleToFit;
    const yOnImage = (yOnStage - imageY) / scaleToFit;

    if (
      xOnImage < 0 ||
      xOnImage > image.width ||
      yOnImage < 0 ||
      yOnImage > image.height
    ) {
      console.log("Click outside image");
      return;
    }

    const newPoint = { x: xOnImage, y: yOnImage };
    if (toolMode === "points") {
      setPoints([...points, newPoint]);
      setTrajectoryData(null);
    }

    if (toolMode === "polygons") {
      setCurrentPolygon((prev) => [...prev, newPoint]);
    }
  };

  const handleClearPoints = () => {
    setPoints([]);
  };

  const handleClearTaxonTrajectory = () => {
    setTrajectoryData(null);
    setShowUserTrajectory(true);
  };

  const clearObstacles = () => {
    setObstacles([]);
    setCurrentPolygon([]);
  };

  const handleDeleteObstacle = (id: string) => {
    setObstacles((prev) => prev.filter((o) => o.id !== id));
  };

  const handleDragMove = (e: any) => {
    const stage = e.target;
    setPosition({
      x: stage.x(),
      y: stage.y(),
    });
  };

  // Генерация линий сетки
  const renderGrid = () => {
    if (!image || !showGrid) return null;
    const lines: JSX.Element[] = [];
    const imgWidth = image.width * scaleToFit;
    const imgHeight = image.height * scaleToFit;
    // const imgWidth = droneParams.uavParams.resolutionWidth * scaleToFit;
    // const imgHeight = droneParams.uavParams.resolutionHeight * scaleToFit;
    // Вертикальные линии
    for (let i = 1; i < GRID_COLS; i++) {
      const x = imageX + (imgWidth / GRID_COLS) * i;
      lines.push(
        <Line
          key={`v-${i}`}
          points={[x, imageY, x, imageY + imgHeight]}
          stroke="rgba(255,255,255,0.9)"
          strokeWidth={1}
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
          stroke="rgba(255,255,255,0.9)"
          strokeWidth={1}
        />,
      );
    }

    return lines;
  };

  const handleCalculateTrajectory = async () => {
    if (!image || points.length === 0) return;
    setLoading(true);

    const meterPerPixelX = width_m / image.width;
    const meterPerPixelY = height_m / image.height;

    const pointsInMeters = points.map((p) => ({
      x: p.x * meterPerPixelX,
      y: (image.height - p.y) * meterPerPixelY,
    }));

    const payload = {
      width_m,
      height_m,
      points: pointsInMeters,
    };

    try {
      const response = await fetch(
        "http://nmstuvtip.ddns.net:5000/api/calculate-trajectory",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const data = await response.json();
      console.log("Ответ API:", data);
      setTrajectoryData(data);
      setShowUserTrajectory(false);
    } catch (err) {
      console.error("Ошибка запроса:", err);
    } finally {
      setLoading(false);
    }
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

  return (
    <Box display="flex" flexDirection="column" height="100%" width="100%">
      <Box
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        p={1}
        borderBottom="1px solid"
        borderColor="divider"
        bgcolor="background.paper"
      >
        <Box display="flex" alignItems="center" gap={1}>
          <IconButton
            size="small"
            onClick={() => handleClose()}
            aria-label="назад"
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" fontWeight="medium">
            {sceneMode ? `${sceneMode}` : ""}
          </Typography>
        </Box>
        <Box />
      </Box>
      <Box display="flex" flex={1} overflow="auto">
        {/* Левая панель */}
        <Box
          overflow="auto"
          width={350}
          borderRight="1px solid"
          borderColor="divider"
          p={2}
          sx={{
            display: sceneMode == "Редактор схемы полётов" ? "block" : "none",
          }}
        >
          <Stack spacing={2}>
            <Box>
              <Typography variant="subtitle1" gutterBottom>
                Режим работы
              </Typography>

              <ToggleButtonGroup
                value={toolMode}
                exclusive
                fullWidth
                onChange={(_, v) => v && setToolMode(v)}
                size="small"
                color="primary"
              >
                <Tooltip title="Панорамирование" arrow>
                  <ToggleButton value="pan">
                    <PanToolIcon />
                  </ToggleButton>
                </Tooltip>

                <Tooltip title="Расстановка препятствий" arrow>
                  <ToggleButton value="polygons">
                    <ChangeHistoryIcon />
                  </ToggleButton>
                </Tooltip>

                <Tooltip title="Расстановка точек съёмки" arrow>
                  <ToggleButton value="points">
                    <RadioButtonUncheckedIcon />
                  </ToggleButton>
                </Tooltip>
              </ToggleButtonGroup>
            </Box>

            <Divider />

            <Box>
              <Box
                display="flex"
                alignItems="center"
                justifyContent="space-between"
                mb={1}
              >
                <Typography variant="subtitle1">Масштабная сетка</Typography>
                <Tooltip title="Показывать масштабную сетку" arrow>
                  <Checkbox
                    checked={showGrid}
                    onChange={(e) => setShowGrid(e.target.checked)}
                    size="small"
                  />
                </Tooltip>
              </Box>

              <Box sx={{ display: "flex", gap: 2, mb: 1.5 }}>
                <Box>
                  <Typography variant="body2" color="text.secondary" noWrap>
                    Ширина ячейки:
                  </Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {cellWidth_m.toFixed(2)}&nbsp;м
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary" noWrap>
                    Высота ячейки:
                  </Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {cellHeight_m.toFixed(2)}&nbsp;м
                  </Typography>
                </Box>
              </Box>
            </Box>

            <Divider />
            <Box>
              <Box
                display="flex"
                alignItems="center"
                justifyContent="space-between"
                mb={0}
              >
                <Typography variant="subtitle1">Препятствия</Typography>
                <Checkbox
                  checked={showObstacles}
                  onChange={(e) => setShowObstacles(e.target.checked)}
                  size="small"
                  disabled={obstacles.length === 0}
                />
              </Box>

              {/* Список препятствий */}
              {obstacles.length > 0 && (
                <List dense sx={{ maxHeight: 200, overflowY: "auto", mb: 2 }}>
                  {obstacles.map((obstacle, index) => (
                    <ListItem
                      key={obstacle.id}
                      sx={{
                        pl: 1,
                        borderLeft: `4px solid ${obstacle.color}`,
                      }}
                      secondaryAction={
                        <DeleteButton
                          onClick={() => handleDeleteObstacle(obstacle.id)}
                          tooltip="Удалить препятствие"
                        />
                      }
                    >
                      <ListItemText
                        primary={`Препятствие ${index + 1}`}
                        secondary={`Точек: ${obstacle.points.length}`}
                      />
                      {/* <ListItemSecondaryAction>
                        <DeleteButton
                          onClick={() => handleDeleteObstacle(obstacle.id)}
                          tooltip="Удалить препятствие"
                        />
                      </ListItemSecondaryAction> */}
                    </ListItem>
                  ))}
                </List>
              )}

              <Typography variant="body2" mb={1} color="text.secondary">
                Всего:{" "}
                <Box component="span" fontWeight="bold">
                  {obstacles.length}
                </Box>{" "}
                шт.
              </Typography>

              <Stack direction="row" spacing={1} justifyContent="space-between">
                <Button
                  size="small"
                  variant="contained"
                  disabled={currentPolygon.length < 3}
                  onClick={() => {
                    setObstacles([
                      ...obstacles,
                      {
                        id: uuidv4(),
                        points: currentPolygon,
                        color: getNextPolygonColor(),
                      },
                    ]);
                    setCurrentPolygon([]);
                  }}
                  startIcon={<CheckIcon />}
                >
                  Замкнуть
                </Button>

                <IconButton
                  size="small"
                  color="error"
                  onClick={clearObstacles}
                  disabled={obstacles.length === 0}
                >
                  <DeleteIcon />
                </IconButton>
              </Stack>
            </Box>

            <Divider />
            <Box>
              <Box
                display="flex"
                alignItems="center"
                justifyContent="space-between"
              >
                <Typography variant="subtitle1">
                  {" "}
                  Пользовательская траектория
                </Typography>
                <Tooltip title="Показывать пользовательскую траекторию" arrow>
                  <Checkbox
                    checked={showUserTrajectory}
                    onChange={(e) => {
                      setShowUserTrajectory(e.target.checked);
                    }}
                    size="small"
                    disabled={points.length === 0}
                  />
                </Tooltip>
              </Box>

              <Stack
                direction="row"
                spacing={1}
                justifyContent="space-between"
                alignItems="center"
              >
                <Typography variant="body2" mb={1} color="text.secondary">
                  Всего точек:{" "}
                  <Box
                    component="span"
                    color="text.secondary"
                    fontWeight="bold"
                  >
                    {points.length}
                  </Box>{" "}
                  шт.
                </Typography>
                <IconButton
                  size="small"
                  color="error"
                  onClick={handleClearPoints}
                  disabled={points.length === 0}
                >
                  <DeleteIcon />
                </IconButton>
              </Stack>
            </Box>

            <Divider />

            {/* <Box>
              <Box
                display="flex"
                alignItems="center"
                justifyContent="space-between"
              >
                <Typography variant="subtitle1">
                  Оптимизированная траектория
                </Typography>
                <Tooltip title="Показывать оптимизированную траекторию" arrow>
                  <Checkbox
                    checked={showTaxonTrajectory}
                    onChange={(e) => setShowTaxonTrajectory(e.target.checked)}
                    size="small"
                    disabled={!trajectoryData || trajectoryData.B.length === 0}
                  />
                </Tooltip>
              </Box>

              <Stack
                direction="row"
                spacing={1}
                justifyContent="space-between"
                alignItems="center"
              >
                <Typography variant="body2" color="text.secondary">
                  Всего таксонов:{" "}
                  <Box
                    component="span"
                    fontWeight="bold"
                    color="text.secondary"
                  >
                    {trajectoryData ? trajectoryData.B.length : 0}
                  </Box>{" "}
                  шт.
                </Typography>

                <IconButton
                  size="small"
                  color="error"
                  onClick={handleClearTaxonTrajectory}
                  disabled={!trajectoryData || trajectoryData.B.length === 0}
                >
                  <DeleteIcon />
                </IconButton>
              </Stack>

              <Button
                size="small"
                variant="contained"
                onClick={handleCalculateTrajectory}
                disabled={points.length === 0}
                sx={{ mt: 1 }}
              >
                Оптимизировать траекторию
              </Button>
            </Box> */}

            {/* <Divider /> */}

            {/* <Stack spacing={1}>
              <Button
                variant="contained"
                color="success"
                onClick={handleDownload}
                disabled={!image}
              >
                Скачать схему
              </Button>
            </Stack> */}
          </Stack>
        </Box>

        {/* Правая сцена */}
        <Box
          flex={1}
          display="flex"
          justifyContent="center"
          alignItems="center"
          bgcolor="#f4f6f8"
          flexDirection="column"
        >
          <Box
            boxShadow={3}
            bgcolor="#fff"
            minWidth={STAGE_WIDTH}
            minHeight={STAGE_HEIGHT}
          >
            <Stage
              ref={stageRef}
              width={STAGE_WIDTH}
              height={STAGE_HEIGHT}
              scaleX={scale}
              scaleY={scale}
              x={position.x}
              y={position.y}
              draggable
              onDragMove={handleDragMove}
              onWheel={handleWheel}
              style={{ cursor: getCursor() }}
            >
              <Layer>
                {image && (
                  <KonvaImage
                    image={image}
                    x={imageX}
                    y={imageY}
                    scaleX={scaleToFit}
                    scaleY={scaleToFit}
                    onClick={handleClick}
                    onContextMenu={(e) => {
                      e.evt.preventDefault();
                    }}
                  />
                )}

                {!image && (
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
                      y={STAGE_HEIGHT / 2 - 10}
                      text="Загрузка..."
                      fontSize={20}
                      fill="black"
                      align="center"
                      verticalAlign="middle"
                    />
                  </>
                )}

                {renderGrid()}

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

                    const arrowPoints = getArrowPoints(
                      from,
                      to,
                      TAXON_POINT_RADIUS,
                      TAXON_POINT_RADIUS,
                    ); // 10 = radius circle

                    return (
                      <Arrow
                        key={`arrow-${i}`}
                        points={arrowPoints}
                        pointerLength={10}
                        pointerWidth={7}
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
                        radius={10}
                        fill="blue"
                        onContextMenu={(e) => {
                          e.evt.preventDefault();

                          if (toolMode === "points")
                            setPoints(points.filter((_, idx) => idx !== i));
                        }}
                        onMouseEnter={(e) => {
                          const stage = e.target.getStage();
                          stage!.container().style.cursor = "pointer";
                        }}
                        onMouseLeave={(e) => {
                          const stage = e.target.getStage();
                          stage!.container().style.cursor = getCursor();
                        }}
                      />
                      <Text
                        x={point.x * scaleToFit + imageX - 6} // Смещение по X на половину размера текста
                        y={point.y * scaleToFit + imageY - 6} // Смещение по Y на половину размера текста
                        text={(i + 1).toString()}
                        fontSize={12}
                        fill="white"
                        onContextMenu={(e) => {
                          e.evt.preventDefault();

                          if (toolMode === "points")
                            setPoints(points.filter((_, idx) => idx !== i));
                        }}
                        onMouseEnter={(e) => {
                          const stage = e.target.getStage();
                          stage!.container().style.cursor = "pointer";
                        }}
                        onMouseLeave={(e) => {
                          const stage = e.target.getStage();
                          stage!.container().style.cursor = getCursor();
                        }}
                      />
                    </Fragment>
                  ))}

                {showTaxonTrajectory &&
                  image &&
                  trajectoryData?.B?.map((taxon: any, idx: number) => {
                    const color = colors[idx % colors.length];

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

                {showObstacles &&
                  obstacles.map((poly) => {
                    const isHovered = hoveredObstacleId === poly.id;

                    return (
                      <Line
                        key={poly.id}
                        points={poly.points.flatMap((p) => [
                          p.x * scaleToFit + imageX,
                          p.y * scaleToFit + imageY,
                        ])}
                        closed
                        fill={isHovered ? `${poly.color}55` : `${poly.color}20`}
                        stroke={poly.color}
                        strokeWidth={isHovered ? 3 : 2}
                        onMouseEnter={(e) => {
                          const stage = e.target.getStage();
                          stage!.container().style.cursor = "pointer";
                          setHoveredObstacleId(poly.id);
                        }}
                        onMouseLeave={(e) => {
                          const stage = e.target.getStage();
                          stage!.container().style.cursor = getCursor();
                          setHoveredObstacleId(null);
                        }}
                        onContextMenu={(e) => {
                          e.evt.preventDefault();
                        }}
                      />
                    );
                  })}

                {toolMode === "polygons" && currentPolygon.length > 0 && (
                  <>
                    <Line
                      points={currentPolygon.flatMap((p) => [
                        p.x * scaleToFit + imageX,
                        p.y * scaleToFit + imageY,
                      ])}
                      stroke="orange"
                      strokeWidth={2}
                      dash={[6, 4]}
                    />

                    {currentPolygon.map((p, i) => (
                      <Circle
                        key={i}
                        x={p.x * scaleToFit + imageX}
                        y={p.y * scaleToFit + imageY}
                        radius={6}
                        fill="orange"
                      />
                    ))}
                  </>
                )}

                {loading && (
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
                      y={STAGE_HEIGHT / 2 - 10}
                      text="Загрузка..."
                      fontSize={20}
                      fill="black"
                      align="center"
                      verticalAlign="middle"
                    />
                  </>
                )}
              </Layer>
            </Stage>
          </Box>
          {toolMode === "pan" && (
            <Box
              position="absolute"
              bottom="20px"
              sx={{
                bgcolor: "rgba(0,0,0,0.6)",
                color: "white",
                p: 1.5,
                borderRadius: 1,
                fontSize: 14,
                textAlign: "center",
                pointerEvents: "none",
              }}
            >
              Используйте колесо мыши для масштабирования изображения
            </Box>
          )}

          {toolMode === "polygons" && (
            <Box
              position="absolute"
              bottom="20px"
              sx={{
                bgcolor: "rgba(0,0,0,0.6)",
                color: "white",
                p: 1.5,
                borderRadius: 1,
                fontSize: 14,
                textAlign: "center",
                pointerEvents: "none",
              }}
            >
              Установите точки на сцене и нажмите кнопку «Замкнуть» для
              формирования полигона
            </Box>
          )}

          {toolMode === "points" && (
            <Box
              position="absolute"
              bottom="20px"
              sx={{
                bgcolor: "rgba(0,0,0,0.6)",
                color: "white",
                p: 1.5,
                borderRadius: 1,
                fontSize: 14,
                textAlign: "center",
                pointerEvents: "none",
              }}
            >
              Установите точки съёмки на сцене для формирования траектории: ЛКМ
              - добавить точку, ПКМ - удалить точку
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default SceneEditor;
