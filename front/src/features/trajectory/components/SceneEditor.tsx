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
  FormControlLabel,
  TextField
} from "@mui/material";
import {
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
} from "@mui/material";


import useImage from "use-image";

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

import Konva from "konva";

import PanToolIcon from "@mui/icons-material/PanTool";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import ChangeHistoryIcon from "@mui/icons-material/ChangeHistory";
import HorizontalRuleIcon from "@mui/icons-material/HorizontalRule";
import CheckIcon from "@mui/icons-material/Check";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";

import Tooltip from "@mui/material/Tooltip";
import { DeleteButton } from "../../../components/ui/DeleteButton";

import { AppBar, Toolbar, IconButton } from "@mui/material";

import { v4 as uuidv4 } from "uuid";

import type { Point, Polygon, ImageData, TrajectoryPoint } from "../../../types/scene.types";
import { Weather } from "../../../types/uav.types";

import { useLocalStorage } from "../../../hooks/useLocalStorage/useLocalStorage";
import { FloatInput } from "../../../components/ui/FloatInput";

import FlightSchemaLegendDialog from "./FlightSchemaLegendDialog";
import { StaticLayer, UserPointsLayer, ObstaclesLayer, TrajectoryLayer, UILayer } from "./SceneLayers";
import DownloadIcon from '@mui/icons-material/Download';
import UndoIcon from "@mui/icons-material/Undo";
import { convexHull, outwardUnitNormal } from "../utils/Geometry";

import { SceneStage } from "./SceneStage";
import { exportSceneImage } from "../utils/exportSceneImage";

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

  uavLineConfigured?: boolean;
  setUavLineConfigured?: (f: boolean) => void;

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
  uavLineConfigured = false,
  setUavLineConfigured,
  weatherConditions = null
}) => {
  const [isLegendOpen, setIsLegendOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [showGrid, setShowGrid] = useLocalStorage<boolean>("isShowGrid", true);
  const [showUserTrajectory, setShowUserTrajectory] = useLocalStorage<boolean>(
    "isShowUserTrajectory",
    true,
  );
  const [showObstacles, setShowObstacles] = useLocalStorage<boolean>(
    "isShowObstacles",
    true,
  );
  const [showUavLine, setShowUavLine] = useLocalStorage<boolean>(
    "isShowLine",
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

  const [lineY, setLineY] = useState<number | null>(null);

  const stageRef = useRef<any>(null);
  const animationFrameRef = useRef<number | null>(null);

  const colors = COLORS;

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

    if (toolMode === "line") setShowUavLine(true);

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

  const handleSafeZoneChange = (id, value: number) => {
    setObstacles(prev =>
      prev.map(ob => ob.id === id ? { ...ob, safeZone: value } : ob)
    );
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

    const cellWidth = imgWidth / GRID_COLS;
    const cellHeight = imgHeight / GRID_ROWS;
    const lineStyle = {
      width: 2,
      height: 2,
      fill: "rgba(255, 255, 255, 0.8)",
      stroke: "rgb(0, 0, 0, 1)",
      strokeWidth: 0.1
    };

    // Вертикальные линии
    for (let i = 1; i < GRID_COLS; i++) {
      const x = imageX + cellWidth * i;
      lines.push(
        <Rect
          key={`v-${i}`}
          x={x}
          y={imageY}
          width={lineStyle.width}
          height={imgHeight}
          fill={lineStyle.fill}
          stroke={lineStyle.stroke}
          strokeWidth={lineStyle.strokeWidth}
        />
      );
    }

    // Горизонтальные линии
    for (let i = 1; i < GRID_ROWS; i++) {
      const y = imageY + imgHeight - cellHeight * i;
      lines.push(
        <Rect
          key={`h-${i}`}
          x={imageX}
          y={y}
          width={imgWidth}
          height={lineStyle.height}
          fill={lineStyle.fill}
          stroke={lineStyle.stroke}
          strokeWidth={lineStyle.strokeWidth}
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

  useEffect(() => {
    // Устанавливаем нужный флаг в зависимости от режима
    switch (mode) {
      case "points":
        setShowUserTrajectory(true);
        break;
      case "polygons":
        setShowObstacles(true);
        break;
      case "line":
        setShowUavLine(true);
        break;
      case "pan":
        // Для pan отключаем всё
        break;
      default:
        break;
    }
  }, [mode]); // Зависимость от mode



  // const handleDownload = () => {
  //   if (!image) return;
  //   setLoading(true);

  //   const container = document.createElement("div");
  //   const downloadStage = new Konva.Stage({
  //     container,
  //     width: image.width,
  //     height: image.height,
  //   });

  //   const layer = new Konva.Layer();
  //   downloadStage.add(layer);

  //   // Масштабный коэффициент: элементы интерфейса должны выглядеть
  //   // пропорционально на полном разрешении так же, как на превью 500×400
  //   const uiScale = Math.min(image.width / STAGE_WIDTH, image.height / STAGE_HEIGHT) * 0.5;

  //   const POINT_R_USER = 14 * uiScale;   // радиус пользовательской точки
  //   const ARROW_PTR_LEN = 14 * uiScale;
  //   const ARROW_PTR_WID = 10 * uiScale;
  //   const STROKE_W = 3 * uiScale;
  //   const FONT_USER = 16 * uiScale;

  //   // Вспомогательная функция: стрелка начинается от края fromRadius окружности
  //   // и заканчивается у края toRadius окружности, не перекрывая кружки
  //   const arrowPts = (
  //     from: { x: number; y: number },
  //     to: { x: number; y: number },
  //     fromR: number,
  //     toR: number,
  //   ) => {
  //     const dx = to.x - from.x;
  //     const dy = to.y - from.y;
  //     const len = Math.sqrt(dx * dx + dy * dy);
  //     if (len === 0) return [from.x, from.y, to.x, to.y];
  //     const ux = dx / len, uy = dy / len;
  //     return [
  //       from.x + ux * fromR, from.y + uy * fromR,
  //       to.x - ux * toR, to.y - uy * toR,
  //     ];
  //   };

  //   // ── Фоновое изображение ────────────────────────────────────────────
  //   layer.add(new Konva.Image({
  //     image,
  //     x: 0, y: 0,
  //     width: image.width, height: image.height,
  //   }));

  //   // ── Сетка ─────────────────────────────────────────────────────────
  //   if (showGrid) {
  //     const cellW = image.width / GRID_COLS;
  //     const cellH = image.height / GRID_ROWS;
  //     const lineWidth = 2 * uiScale;
  //     const lineHeight = 2 * uiScale;

  //     // Вертикальные линии (прямоугольники)
  //     for (let i = 1; i < GRID_COLS; i++) {
  //       layer.add(new Konva.Rect({
  //         x: cellW * i - lineWidth / 2,
  //         y: 0,
  //         width: lineWidth,
  //         height: image.height,
  //         fill: "rgba(255, 255, 255, 0.8)",
  //         stroke: "rgba(0, 0, 0, 1)",
  //         strokeWidth: 0.1 * uiScale,
  //       }));
  //     }

  //     // Горизонтальные линии (прямоугольники)
  //     for (let i = 1; i < GRID_ROWS; i++) {
  //       const y = image.height - cellH * i;
  //       layer.add(new Konva.Rect({
  //         x: 0,
  //         y: y - lineHeight / 2,
  //         width: image.width,
  //         height: lineHeight,
  //         fill: "rgba(255, 255, 255, 0.8)",
  //         stroke: "rgba(0, 0, 0, 1)",
  //         strokeWidth: 0.1 * uiScale,
  //       }));
  //     }
  //   }

  //   // ── Линия полёта + неинформативная зона ───────────────────────────
  //   if (flightLineY !== null) {
  //     layer.add(new Konva.Line({
  //       points: [0, flightLineY, image.width, flightLineY],
  //       stroke: "orange",
  //       strokeWidth: STROKE_W,
  //     }));
  //     layer.add(new Konva.Rect({
  //       x: 0, y: flightLineY,
  //       width: image.width, height: image.height - flightLineY,
  //       fill: "rgba(128,128,128,0.3)",
  //       listening: false,
  //     }));
  //     if (flightLineY < image.height - 0.01) {
  //       layer.add(new Konva.Text({
  //         x: 0,
  //         y: flightLineY + (image.height - flightLineY) / 2 - FONT_USER * 1.5,
  //         width: image.width,
  //         text: "Неинформативная зона",
  //         align: "center",
  //         fontSize: FONT_USER * 1.5,
  //         fill: "rgba(255,255,255,0.85)",
  //         listening: false,
  //       }));
  //     }
  //   }

  //   // ── Препятствия ───────────────────────────────────────────────────
  //   // if (showObstacles) {
  //   //   obstacles.forEach((poly) => {
  //   //     layer.add(new Konva.Line({
  //   //       points: poly.points.flatMap((p) => [p.x, p.y]),
  //   //       closed: true,
  //   //       fill: `${poly.color}30`,
  //   //       stroke: poly.color,
  //   //       strokeWidth: STROKE_W,
  //   //     }));
  //   //   });
  //   // }

  //   // ── Препятствия ───────────────────────────────────────────────────
  //   if (showObstacles) {
  //     obstacles.forEach((poly) => {
  //       // Безопасная зона (если задана)
  //       if (poly.safeZone > 0) {
  //         const safeZonePoints = buildSafeZoneForDownload(poly, poly.safeZone);
  //         layer.add(new Konva.Line({
  //           points: safeZonePoints.flatMap((p) => [p.x, p.y]),
  //           closed: true,
  //           fill: "#E0F4FF",
  //           stroke: "#4FC3F7",
  //           strokeWidth: STROKE_W,
  //           dash: [8 * uiScale, 4 * uiScale],
  //           opacity: 0.8,
  //         }));
  //       }

  //       // Основной полигон препятствия
  //       layer.add(new Konva.Line({
  //         points: poly.points.flatMap((p) => [p.x, p.y]),
  //         closed: true,
  //         fill: `${poly.color}20`,
  //         stroke: poly.color,
  //         strokeWidth: STROKE_W,
  //       }));

  //       // Вершины препятствия
  //       poly.points.forEach((point) => {
  //         layer.add(new Konva.Circle({
  //           x: point.x,
  //           y: point.y,
  //           radius: 3 * uiScale,
  //           fill: poly.color,
  //         }));
  //       });

  //       // Номер препятствия в центре
  //       const centerX = poly.points.reduce((s, p) => s + p.x, 0) / poly.points.length;
  //       const centerY = poly.points.reduce((s, p) => s + p.y, 0) / poly.points.length;

  //       const labelText = (obstacles.indexOf(poly) + 1).toString();
  //       const labelRadius = 12 * uiScale;
  //       const labelFontSize = 14 * uiScale;

  //       layer.add(new Konva.Circle({
  //         x: centerX,
  //         y: centerY,
  //         radius: labelRadius,
  //         fill: "rgba(0,0,0,0.55)",
  //         listening: false,
  //       }));

  //       layer.add(new Konva.Text({
  //         x: centerX - labelFontSize * 0.3 * labelText.length,
  //         y: centerY - labelFontSize * 0.55,
  //         text: labelText,
  //         fontSize: labelFontSize,
  //         fontStyle: "bold",
  //         fill: "#fff",
  //         listening: false,
  //       }));
  //     });
  //   }

  //   // ── Пользовательская траектория ───────────────────────────────────
  //   if (showUserTrajectory) {
  //     // Сначала рисуем стрелки (они окажутся под кружками)
  //     points.forEach((point, i) => {
  //       if (i === 0) return;
  //       const prev = points[i - 1];
  //       layer.add(new Konva.Arrow({
  //         points: arrowPts(prev, point, POINT_R_USER, POINT_R_USER),
  //         pointerLength: ARROW_PTR_LEN, pointerWidth: ARROW_PTR_WID,
  //         fill: "red", stroke: "red", strokeWidth: STROKE_W,
  //       }));
  //     });
  //     // Затем кружки и номера поверх стрелок
  //     points.forEach((point, i) => {
  //       layer.add(new Konva.Circle({
  //         x: point.x, y: point.y,
  //         radius: POINT_R_USER, fill: "blue",
  //       }));
  //       layer.add(new Konva.Text({
  //         x: point.x - POINT_R_USER * 0.45,
  //         y: point.y - FONT_USER * 0.55,
  //         text: (i + 1).toString(),
  //         fontSize: FONT_USER,
  //         fontStyle: "bold",
  //         fill: "white",
  //       }));
  //     });
  //   }

  //   layer.batchDraw();

  //   downloadStage.toCanvas().toBlob((blob) => {
  //     if (!blob) return;
  //     const url = URL.createObjectURL(blob);
  //     const link = document.createElement("a");
  //     link.href = url;
  //     link.download = "trajectory_map.png";
  //     link.click();
  //     URL.revokeObjectURL(url);
  //     downloadStage.destroy();
  //     setLoading(false);
  //   });
  // };



  const handleDownload = () => {
    exportSceneImage({
      image: image!,
      width_m: droneParams.frameWidthBase,
      height_m: droneParams.frameHeightBase,
      GRID_COLS: droneParams.frameWidthBase / droneParams.frameWidthPlanned,
      GRID_ROWS: droneParams.frameHeightBase / droneParams.frameHeightPlanned,

      flightLineY: flightLineY,
      obstacles: obstacles,
      points: points,
      trajectoryData: trajectoryData,

      showGrid: showGrid,
      showObstacles: showObstacles,
      showUserTrajectory: showUserTrajectory,
      showTaxonTrajectory: showTaxonTrajectory,
      showNavTriangles: true, // Включаем треугольники

      PREVIEW_WIDTH: STAGE_WIDTH,
      PREVIEW_HEIGHT: STAGE_HEIGHT,

      setLoading: setLoading
    });
  }

  return (
    <Box display="flex" flexDirection="column" height="100%" width="100%">
      <Box
        display="flex"
        alignItems="center"
        p={1}
        borderBottom="1px solid"
        borderColor="divider"
        bgcolor="background.paper"
      >
        <Box display="flex" alignItems="center" gap={1}>
          <IconButton size="small" onClick={handleClose} aria-label="назад">
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" fontWeight="medium">
            {sceneMode ? `${sceneMode}` : ""}
          </Typography>
        </Box>

        {/* Пустой Box с flexGrow 1, который занимает всё свободное пространство */}
        <Box sx={{ flexGrow: 1 }} />
        <Button
          startIcon={<DownloadIcon />}
          onClick={handleDownload}
          aria-label="Скачать"
          color="primary"
        >
          Скачать схему
        </Button>
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
                  <Tooltip title="Сбросить" arrow>
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
                  </Tooltip>
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
                <Tooltip title="Показывать препятствия" arrow>
                  <Checkbox
                    checked={showObstacles}
                    onChange={(e) => setShowObstacles(e.target.checked)}
                    size="small"
                    disabled={obstacles.length === 0}
                  />
                </Tooltip>
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
                        <Stack direction="row" spacing={1} alignItems="center">
                          <FloatInput
                            label="Зона, м"
                            sx={{ width: 70 }}
                            value={obstacle.safeZone ?? ""}
                            onChange={(e) => {
                              handleSafeZoneChange(obstacle.id, e)
                            }
                            }
                            max={10}
                            min={0}
                          />
                          <DeleteButton
                            onClick={() => handleDeleteObstacle(obstacle.id)}
                            tooltip="Удалить препятствие"
                          />
                        </Stack>
                      }
                    >
                      <ListItemText
                        primary={`Препятствие ${index + 1}`}
                        secondary={`Точек: ${obstacle.points.length}`}
                      />
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
                alignItems="center"
                sx={{ mt: 2 }}
              >
                {/* Группа кнопок для текущего полигона */}
                <Stack direction="row" spacing={1}>
                  <Button
                    size="small"
                    variant="outlined"
                    disabled={currentPolygon.length === 0 || toolMode != "polygons"}
                    onClick={() => setCurrentPolygon(prev => prev.slice(0, -1))}
                    startIcon={<UndoIcon />}
                  >
                    Отмена
                  </Button>

                  <Button
                    size="small"
                    variant="outlined"
                    disabled={currentPolygon.length < 3 || toolMode != "polygons"}
                    onClick={() => {
                      setObstacles([
                        ...obstacles,
                        {
                          id: uuidv4(),
                          points: currentPolygon,
                          color: "#FF8F00",
                          safeZone: 1
                        },
                      ]);
                      setCurrentPolygon([]);
                    }}
                    startIcon={<CheckIcon />}
                  >
                    Замкнуть
                  </Button>
                </Stack>

                {/* Кнопка полной очистки всех препятствий */}
                <DeleteButton
                  onClick={clearObstacles}
                  disabled={obstacles.length === 0}
                  tooltip="Очистить все препятствия"
                />
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
          <SceneStage
            stageRef={stageRef}
            scale={scale}
            position={position}
            toolMode={toolMode}
            lineY={lineY}
            loading={loading}
            STAGE_WIDTH={STAGE_WIDTH}
            STAGE_HEIGHT={STAGE_HEIGHT}
            image={image}
            imageX={imageX}
            imageY={imageY}
            scaleToFit={scaleToFit}
            gridLines={gridLines}
            points={points}
            showUserTrajectory={showUserTrajectory}
            setPoints={setPoints}
            obstacles={obstacles}
            showObstacles={showObstacles}
            hoveredObstacleId={hoveredObstacleId}
            setHoveredObstacleId={setHoveredObstacleId}
            pxPerMeterX={(image?.width || 1) / width_m}
            pxPerMeterY={(image?.height || 1) / height_m}
            trajectoryData={trajectoryData}
            showTaxonTrajectory={showTaxonTrajectory}
            width_m={width_m}
            height_m={height_m}
            colors={colors}
            weatherConditions={weatherConditions}
            showUavLine={showUavLine}
            flightLineY={flightLineY}
            currentPolygon={currentPolygon}
            handleDragMove={handleDragMove}
            handleWheel={handleWheel}
            getCursor={getCursor}
            handleMouseMove={handleMouseMove}
            handleStageClick={handleStageClick}
            handleClick={handleClick}
          />

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
