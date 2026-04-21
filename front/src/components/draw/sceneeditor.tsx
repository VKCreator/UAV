import { FC, Fragment, useState, useRef, type JSX, useEffect, useCallback, useMemo } from "react";
import {
  Box,
  Button,
  Divider,
  Stack,
  Typography,
  Checkbox,
  ToggleButton,
  ToggleButtonGroup,
  FormControlLabel
} from "@mui/material";
import {
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
} from "@mui/material";

import {
  Stage,
  Image as KonvaImage,
  Line,
  Rect
} from "react-konva";
import useImage from "use-image";

import PanToolIcon from "@mui/icons-material/PanTool";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import ChangeHistoryIcon from "@mui/icons-material/ChangeHistory";
import HorizontalRuleIcon from "@mui/icons-material/HorizontalRule";
import CheckIcon from "@mui/icons-material/Check";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";

import Tooltip from "@mui/material/Tooltip";
import { DeleteButton } from "../ui-widgets/DeleteButton";

import { AppBar, Toolbar, IconButton } from "@mui/material";

import { v4 as uuidv4 } from "uuid";

import type { Point, Polygon, ImageData, TrajectoryPoint } from "./scene.types";
import { Weather } from "../../types/uav.types";

import { useLocalStorage } from "../../hooks/useLocalStorage/useLocalStorage";

import FlightSchemaLegendDialog from "../ui-widgets/FlightSchemaLegendDialog";
import { StaticLayer, UserPointsLayer, ObstaclesLayer, TrajectoryLayer, UILayer } from "./SceneLayers";

const COLORS = [
  "#65b9f7", "#ff6b6b", "#66a9ff", "#ffdd57", "#9e69c4", 
  "#64f3f1", "#f59fe1", "#f4e24d", "#e38b5a", "#5e4a3a", 
  "#7a9f60", "#a2b9d1", "#d1d1d1", "#b8a25b",
] as const;

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

  flightLineY: number;
  setFlightLineY: (y: any) => void;

  weatherConditions?: Weather;
}

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
  flightLineY,
  setFlightLineY,
  weatherConditions = null
}) => {
  const [isLegendOpen, setIsLegendOpen] = useState(false);

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

  const [hoveredObstacleId, setHoveredObstacleId] = useState<string | null>(
    null,
  );
  const [showUavLine, setShowUavLine] = useState(true); // галка отображения
  const [uavLineConfigured, setUavLineConfigured] = useState(false); // статус

  const [lineY, setLineY] = useState<number | null>(null);

  const stageRef = useRef<any>(null);
  const animationFrameRef = useRef<number | null>(null);

  const colors = COLORS;

  const getNextPolygonColor = () => colors[obstacles.length % colors.length];

 
  //  "pan" | "points" | "polygons";
  const [toolMode, setToolMode] = useState<string>(
    mode === undefined ? "pan" : mode,
  );

  const getCursor = useCallback(() => {
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
  }, [toolMode]);

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

  const handleClick = useCallback((e: any) => {
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

    let linePositionY = flightLineY!;

    // Проверяем, не в неинформативной ли зоне
    if (yOnImage >= linePositionY && yOnImage <= image.height) return;

    const newPoint = { x: xOnImage, y: yOnImage };
    if (toolMode === "points") {
      setPoints([...points, newPoint]);
      // setTrajectoryData(null);
    }

    if (toolMode === "polygons") {
      setCurrentPolygon((prev) => [...prev, newPoint]);
    }
  }, [image, toolMode, position, scale, imageX, scaleToFit, flightLineY, setPoints, points]);

  const handleClearPoints = () => {
    setPoints([]);
  };

  const clearObstacles = () => {
    setObstacles([]);
    setCurrentPolygon([]);
  };

  const handleDeleteObstacle = (id: string) => {
    setObstacles((prev) => prev.filter((o) => o.id !== id));
  };

  const handleDragMove = useCallback((e: any) => {
    const stage = e.target;
    setPosition({
      x: stage.x(),
      y: stage.y(),
    });
  }, []);

  const gridLines = useMemo(() => {
    if (!image || !showGrid) return null;

    const lines: JSX.Element[] = [];
    const imgWidth = image.width * scaleToFit;
    const imgHeight = image.height * scaleToFit;

    // Вертикальные линии
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
  }, [image, showGrid, GRID_COLS, GRID_ROWS, imageX, imageY, scaleToFit]);


  const handleMouseMove = useCallback((e: any) => {
    if (toolMode !== "line" || !image) return;

    const stage = e.target.getStage();
    const pointer = stage.getRelativePointerPosition();
    if (!pointer) return;

    const imageTop = imageY;
    const imageBottom = imageY + image.height * scaleToFit;
    const clampedY = Math.max(imageTop, Math.min(pointer.y, imageBottom));

    // Отменяем предыдущий запланированный фрейм
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    // Планируем обновление в следующем кадре анимации
    animationFrameRef.current = requestAnimationFrame(() => {
      setLineY(clampedY);
      animationFrameRef.current = null;
    });
  }, [toolMode, image, imageY, scaleToFit]);

  const handleStageClick = useCallback(() => {
    if (toolMode === "line" && lineY !== null) {
      setUavLineConfigured(true);
      setFlightLineY((lineY - imageY) / scaleToFit);
    }
  }, [toolMode, lineY, imageY, scaleToFit, setFlightLineY]);

  useEffect(() => {
    if (!image || !scaleToFit) return;

    if (!flightLineY) setFlightLineY(image.height);
  }, []);


  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

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
            onClick={handleClose}
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
          minWidth={350}
          borderRight="1px solid"
          borderColor="divider"
          p={2}
          sx={{
            display: sceneMode == "Редактор схемы полёта" ? "block" : "none",
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

                <Tooltip title="Установка линии взлёта/посадок" arrow>
                  <ToggleButton value="line">
                    <HorizontalRuleIcon />
                  </ToggleButton>
                </Tooltip>

                <Tooltip title="Размещение препятствий" arrow>
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
              >
                <Typography variant="subtitle1">
                  {" "}
                  Линия точек взлётов и посадок
                </Typography>
                <Tooltip title="Показывать линию" arrow>
                  <Checkbox
                    checked={showUavLine}
                    onChange={(e) => {
                      setShowUavLine(e.target.checked);
                    }}
                    size="small"
                    disabled={flightLineY == null}
                  />
                </Tooltip>
              </Box>

              <Stack
                direction="row"
                spacing={1}
                justifyContent="space-between"
                alignItems="center"
              >
                <Box display="flex" alignItems="center" gap={1}>
                  <Box
                    width={10}
                    height={10}
                    borderRadius="50%"
                    bgcolor={uavLineConfigured ? "green" : "gray"}
                  />
                  <Typography variant="body2">
                    {uavLineConfigured ? "Настроена" : "По умолчанию"}
                  </Typography>
                </Box>

                <Box mt={1} display="flex" gap={1}>
                  <IconButton
                    size="small"
                    onClick={() => {
                      setFlightLineY(image!.height);
                      setUavLineConfigured(false);
                    }}
                    aria-label="Сбросить"
                  >
                    <RestartAltIcon />
                  </IconButton>
                </Box>
              </Stack>
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

              <Stack
                direction="row"
                justifyContent="space-between"
                maxHeight="30px"
                sx={{ mt: 2 }}
              >
                <Button
                  size="small"
                  variant="outlined"
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

                <DeleteButton
                  onClick={clearObstacles}
                  disabled={obstacles.length === 0}
                  tooltip="Очистить все препятствия"
                ></DeleteButton>
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

                <DeleteButton
                  onClick={handleClearPoints}
                  disabled={points.length === 0}
                  tooltip="Очистить все точки"
                ></DeleteButton>
              </Stack>
            </Box>

            <Divider />
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <Button
                size="small"
                startIcon={<InfoOutlinedIcon />}
                onClick={() => setIsLegendOpen(true)}
                aria-label="Легенда"
              >
                Обозначения на схеме
              </Button>
            </Box>
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
              onMouseMove={handleMouseMove}
              onClick={handleStageClick}
            >
              <StaticLayer
                image={image}
                imageX={imageX}
                imageY={imageY}
                scaleToFit={scaleToFit}
                gridLines={gridLines}
                handleClick={handleClick}
                STAGE_WIDTH={STAGE_WIDTH}
                STAGE_HEIGHT={STAGE_HEIGHT}
              />

              <UserPointsLayer
                points={points}
                showUserTrajectory={showUserTrajectory}
                scaleToFit={scaleToFit}
                image={image}
                imageX={imageX}
                imageY={imageY}
                toolMode={toolMode}
                setPoints={setPoints}
                getCursor={getCursor}
              />

              <ObstaclesLayer
                obstacles={obstacles}
                showObstacles={showObstacles}
                scaleToFit={scaleToFit}
                image={image}
                imageX={imageX}
                imageY={imageY}
                hoveredObstacleId={hoveredObstacleId}
                setHoveredObstacleId={setHoveredObstacleId}
                getCursor={getCursor}
              />

              <TrajectoryLayer
                trajectoryData={trajectoryData}
                showTaxonTrajectory={showTaxonTrajectory}
                image={image}
                width_m={width_m}
                height_m={height_m}
                scaleToFit={scaleToFit}
                imageX={imageX}
                imageY={imageY}
                colors={colors}
              />

              <UILayer
                toolMode={toolMode}
                lineY={lineY}
                image={image}
                imageX={imageX}
                imageY={imageY}
                scaleToFit={scaleToFit}
                weatherConditions={weatherConditions}
                showUavLine={showUavLine}
                flightLineY={flightLineY}
                currentPolygon={currentPolygon}
                STAGE_WIDTH={STAGE_WIDTH}
                STAGE_HEIGHT={STAGE_HEIGHT}
              />


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

          {toolMode === "line" && (
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
              Нажмите ЛКМ на изображении для установки линии на позиции
            </Box>
          )}
        </Box>
      </Box>
      <FlightSchemaLegendDialog
        open={isLegendOpen}
        onClose={() => setIsLegendOpen(false)}
      />
    </Box>
  );
};

export default SceneEditor;
