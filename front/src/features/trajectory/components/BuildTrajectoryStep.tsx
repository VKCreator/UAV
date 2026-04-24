import React, { useRef, useState } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Grid,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Divider,
  Alert,
  Tooltip
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
  Group
} from "react-konva";

import Konva from "konva";

import DeleteIcon from "@mui/icons-material/Delete";
import VisibilityIcon from "@mui/icons-material/Visibility";
import DownloadIcon from "@mui/icons-material/Download";
import FlightPlanningAccordion from "./FlightPlanningAccordion";
import SceneEditor from "./SceneEditor";
import SceneShower from "./SceneShower";

import ModeEditIcon from "@mui/icons-material/ModeEdit";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import InfoIcon from "@mui/icons-material/Info";
import FlightSchemaLegendDialog from "./FlightSchemaLegendDialog";

import type { Point, Polygon, ImageData } from "../../../types/scene.types";
import useNotifications from "../../../hooks/useNotifications/useNotifications";
import { useDialogs } from "../../../hooks/useDialogs/useDialogs";
import { Drone } from "../../uav/types/uav.types";
import useImage from "use-image";
import { SceneStage } from "./SceneStage";
import { convexHull, outwardUnitNormal } from "../utils/Geometry";

interface BuildTrajectoryStepProps {
  imageData: ImageData;

  points: Point[];
  setPoints: React.Dispatch<React.SetStateAction<Point[]>>;

  obstacles: Polygon[];
  setObstacles: React.Dispatch<React.SetStateAction<Polygon[]>>;

  trajectoryData: any;
  setTrajectoryData: React.Dispatch<React.SetStateAction<any>>;

  droneParams: any;
  setDroneParams: (params: any) => void;

  drones: Drone[];

  flightLineY: number;
  setFlightLineY: (flightLineY: any) => void;

  uavLineConfigured?: boolean;
  setUavLineConfigured?: (f: boolean) => void;
}

const BuildTrajectoryStep: React.FC<BuildTrajectoryStepProps> = ({
  imageData,
  points,
  setPoints,
  obstacles,
  setObstacles,
  trajectoryData,
  setTrajectoryData,
  droneParams,
  setDroneParams,
  drones,
  flightLineY,
  setFlightLineY,
  uavLineConfigured = false,
  setUavLineConfigured
}) => {
  const { confirm } = useDialogs();
  const notifications = useNotifications();

  const [isEditorOpen, setEditorOpen] = React.useState(false);
  const [isViewerOpen, setViewerOpen] = React.useState(false);
  const [editorMode, setEditorMode] = React.useState<string>("pan");
  const [isLegendOpen, setIsLegendOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  const scenePreviewRef = useRef<any>(null);

  const openEditor = (mode: string = "pan") => {
    setEditorMode(mode);
    setEditorOpen(true);
  };
  const closeEditor = () => setEditorOpen(false);

  const openViewer = () => setViewerOpen(true);
  const closeViewer = () => setViewerOpen(false);

  const clearScene = async () => {
    const confirmed = await confirm("Вы действительно хотите очистить схему?", {
      title: "Подтверждение",
      okText: "Да",
      cancelText: "Нет",
    });

    if (!confirmed) return;

    setPoints([]);
    setObstacles([]);
    setTrajectoryData(null);
    setFlightLineY(imageData.height);
  };

  const isResolutionMatch =
    droneParams.uavCameraParams.resolutionWidth === imageData.width &&
    droneParams.uavCameraParams.resolutionHeight === imageData.height;


  const [previewScale, setPreviewScale] = useState(1);
  const [previewPosition, setPreviewPosition] = useState({ x: 0, y: 0 });
  const [image] = useImage(imageData.imageUrl);

  // Размеры для превью (как указано в условии)
  const PREVIEW_WIDTH = 480;
  const PREVIEW_HEIGHT = 280;

  // Вычисляем масштаб, чтобы изображение вписалось в 500x400
  const scaleToFit = image
    ? Math.min(
      1,
      (PREVIEW_WIDTH / image.width) * 0.9,
      (PREVIEW_HEIGHT / image.height) * 0.9,
    )
    : 1;

  // Центрируем изображение
  const imageX = image ? (PREVIEW_WIDTH - image.width * scaleToFit) / 2 : 0;
  const imageY = image ? (PREVIEW_HEIGHT - image.height * scaleToFit) / 2 : 0;

  // Параметры для сетки (упрощенно, берем из droneParams)
  const width_m = droneParams.frameWidthBase;
  const height_m = droneParams.frameHeightBase;
  const pxPerMeterX = image ? image.width / width_m : 1;
  const pxPerMeterY = image ? image.height / height_m : 1;
  const GRID_COLS = droneParams.frameWidthBase / droneParams.frameWidthPlanned;
  const GRID_ROWS =
    droneParams.frameHeightBase / droneParams.frameHeightPlanned;

  // Если вам нужна сетка в превью, нужно сгенерировать gridLines.
  // Если сетка не критична или сложна для переноса, можно передать null.
  // Для примера передаем null, или можно перенести логику useMemo из SceneEditor.
  const gridLines = React.useMemo(() => {
    if (!image) return null;

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
  }, [image, GRID_COLS, GRID_ROWS, imageX, imageY, scaleToFit]);


  const buildSafeZoneForDownload = (poly: Polygon, metersToExpand: number): Point[] => {
    if (!poly.points || poly.points.length < 3) return poly.points ?? [];

    if (!image) return [];

    // Используем те же pxPerMeterX и pxPerMeterY, что и в ObstaclesLayer
    const pxPerMeterX = image.width / width_m
    const pxPerMeterY = image.height / height_m;

    const inMeters: Point[] = poly.points.map((p) => ({
      x: p.x / pxPerMeterX,
      y: p.y / pxPerMeterY,
    }));

    const hull = convexHull(inMeters);
    if (hull.length < 3 || !metersToExpand) {
      return hull.map((p) => ({
        x: p.x * pxPerMeterX,
        y: p.y * pxPerMeterY,
      }));
    }

    const centroid: Point = {
      x: hull.reduce((s, p) => s + p.x, 0) / hull.length,
      y: hull.reduce((s, p) => s + p.y, 0) / hull.length,
    };

    const n = hull.length;
    const expanded: Point[] = hull.map((v, i) => {
      const prev = hull[(i - 1 + n) % n];
      const next = hull[(i + 1) % n];
      const nIn = outwardUnitNormal(prev, v, centroid);
      const nOut = outwardUnitNormal(v, next, centroid);
      const denom = 1 + nIn.x * nOut.x + nIn.y * nOut.y;
      if (Math.abs(denom) < 1e-9) {
        return {
          x: v.x + metersToExpand * nIn.x,
          y: v.y + metersToExpand * nIn.y,
        };
      }
      const factor = metersToExpand / denom;
      return {
        x: v.x + factor * (nIn.x + nOut.x),
        y: v.y + factor * (nIn.y + nOut.y),
      };
    });

    return expanded.map((p) => ({
      x: p.x * pxPerMeterX,
      y: p.y * pxPerMeterY,
    }));
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
    const uiScale = Math.min(image.width / PREVIEW_WIDTH, image.height / PREVIEW_HEIGHT) * 0.5;

    const POINT_R_USER = 14 * uiScale;   // радиус пользовательской точки
    const ARROW_PTR_LEN = 14 * uiScale;
    const ARROW_PTR_WID = 10 * uiScale;
    const STROKE_W = 3 * uiScale;
    const FONT_USER = 16 * uiScale;

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
    if (true) {
      const cellW = image.width / GRID_COLS;
      const cellH = image.height / GRID_ROWS;
      const lineWidth = 2 * uiScale;
      const lineHeight = 2 * uiScale;

      // Вертикальные линии (прямоугольники)
      for (let i = 1; i < GRID_COLS; i++) {
        layer.add(new Konva.Rect({
          x: cellW * i - lineWidth / 2,
          y: 0,
          width: lineWidth,
          height: image.height,
          fill: "rgba(255, 255, 255, 0.8)",
          stroke: "rgba(0, 0, 0, 1)",
          strokeWidth: 0.1 * uiScale,
        }));
      }

      // Горизонтальные линии (прямоугольники)
      for (let i = 1; i < GRID_ROWS; i++) {
        const y = image.height - cellH * i;
        layer.add(new Konva.Rect({
          x: 0,
          y: y - lineHeight / 2,
          width: image.width,
          height: lineHeight,
          fill: "rgba(255, 255, 255, 0.8)",
          stroke: "rgba(0, 0, 0, 1)",
          strokeWidth: 0.1 * uiScale,
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
    // if (showObstacles) {
    //   obstacles.forEach((poly) => {
    //     layer.add(new Konva.Line({
    //       points: poly.points.flatMap((p) => [p.x, p.y]),
    //       closed: true,
    //       fill: `${poly.color}30`,
    //       stroke: poly.color,
    //       strokeWidth: STROKE_W,
    //     }));
    //   });
    // }

    // ── Препятствия ───────────────────────────────────────────────────
    if (true) {
      obstacles.forEach((poly) => {
        // Безопасная зона (если задана)
        if (poly.safeZone > 0) {
          const safeZonePoints = buildSafeZoneForDownload(poly, poly.safeZone);
          layer.add(new Konva.Line({
            points: safeZonePoints.flatMap((p) => [p.x, p.y]),
            closed: true,
            fill: "#E0F4FF",
            stroke: "#4FC3F7",
            strokeWidth: STROKE_W,
            dash: [8 * uiScale, 4 * uiScale],
            opacity: 0.8,
          }));
        }

        // Основной полигон препятствия
        layer.add(new Konva.Line({
          points: poly.points.flatMap((p) => [p.x, p.y]),
          closed: true,
          fill: `${poly.color}20`,
          stroke: poly.color,
          strokeWidth: STROKE_W,
        }));

        // Вершины препятствия
        poly.points.forEach((point) => {
          layer.add(new Konva.Circle({
            x: point.x,
            y: point.y,
            radius: 3 * uiScale,
            fill: poly.color,
          }));
        });

        // Номер препятствия в центре
        const centerX = poly.points.reduce((s, p) => s + p.x, 0) / poly.points.length;
        const centerY = poly.points.reduce((s, p) => s + p.y, 0) / poly.points.length;

        const labelText = (obstacles.indexOf(poly) + 1).toString();
        const labelRadius = 12 * uiScale;
        const labelFontSize = 14 * uiScale;

        layer.add(new Konva.Circle({
          x: centerX,
          y: centerY,
          radius: labelRadius,
          fill: "rgba(0,0,0,0.55)",
          listening: false,
        }));

        layer.add(new Konva.Text({
          x: centerX - labelFontSize * 0.3 * labelText.length,
          y: centerY - labelFontSize * 0.55,
          text: labelText,
          fontSize: labelFontSize,
          fontStyle: "bold",
          fill: "#fff",
          listening: false,
        }));
      });
    }

    // ── Пользовательская траектория ───────────────────────────────────
    if (true) {
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


  return (
    <Box sx={{ p: 2 }}>
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper
            elevation={0}
            sx={{
              p: 2,
              border: "1px solid #e0e0e0",
              borderRadius: 1,
              display: "flex",
              flexDirection: "column",
              width: "100%",
            }}
          >
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 1,
                mb: 1,
              }}
            >
              <Typography variant="h6">Схема полёта</Typography>

              <Box sx={{ display: "flex", gap: 0.5 }}>
                <Tooltip title="Редактировать схему" enterDelay={500}>
                  <IconButton
                    color="primary"
                    onClick={() => openEditor()}
                    aria-label="Редактор схемы"
                  >
                    <ModeEditIcon fontSize="small" />
                  </IconButton>
                </Tooltip>

                <Tooltip title="Просмотр схемы" enterDelay={500}>
                  <IconButton
                    color="primary"
                    onClick={openViewer}
                    aria-label="Просмотр схемы"
                  >
                    <VisibilityIcon fontSize="small" />
                  </IconButton>
                </Tooltip>

                {/* Легенда */}
                <Tooltip title="Легенда схемы" enterDelay={500}>
                  <IconButton
                    color="primary"
                    onClick={() => setIsLegendOpen(true)}
                    aria-label="Легенда"
                  >
                    <InfoIcon fontSize="small" />
                  </IconButton>
                </Tooltip>

                <Tooltip title="Очистить схему" enterDelay={500}>
                  <span>
                    <IconButton
                      color="error"
                      onClick={clearScene}
                      aria-label="Очистить схему"
                      disabled={points.length === 0 && obstacles.length === 0}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>

                <Tooltip title="Скачать схему" enterDelay={500}>
                  <span>
                    <IconButton
                      onClick={handleDownload}
                      color="primary"
                      aria-label="Скачать схему"
                    // disabled={points.length === 0}
                    >
                      <DownloadIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
              </Box>
            </Box>

            <Divider />
            <Box
              sx={{
                width: "100%",
                maxHeight: "400px",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                mt: 1,
                position: "relative",
                overflow: "hidden"
              }}
            >
              <Tooltip
                title="Нажмите для просмотра"
                arrow
                placement="top"
                followCursor
              >
                <Box
                  sx={{
                    cursor: "pointer",
                    width: 'fit-content',
                    mb: 1,
                    mt: 1
                  }}
                  // Сохраняем функцию показа полного просмотра при клике на превью
                  onClick={() => setViewerOpen(true)}
                >
                  <SceneStage
                    // Ref для доступа к stage (если нужен)
                    ref={scenePreviewRef}
                    draggable={false}
                    // Размеры сцены
                    STAGE_WIDTH={PREVIEW_WIDTH}
                    STAGE_HEIGHT={PREVIEW_HEIGHT}

                    // Трансформация
                    scale={previewScale}
                    position={previewPosition}
                    imageX={imageX}
                    imageY={imageY}
                    scaleToFit={scaleToFit}

                    // Изображение
                    image={image}
                    gridLines={gridLines}

                    // Данные
                    points={points}
                    obstacles={obstacles}
                    trajectoryData={trajectoryData}
                    flightLineY={flightLineY}
                    showUserTrajectory={true}
                    showObstacles={true}
                    showTaxonTrajectory={false}
                    showUavLine={true} // Показываем линию, так как передан flightLineY
                    colors={[]} // Можно передать пустой массив или дефолтные цвета, если не используются

                    // Параметры препятствий (чтобы корректно отобразились)
                    pxPerMeterX={pxPerMeterX}
                    pxPerMeterY={pxPerMeterY}
                    width_m={width_m}
                    height_m={height_m}

                    // Загрузка
                    loading={false || loading}

                    // Состояние интерактивности (для превью обычно только панорамирование)
                    toolMode="pan"
                    lineY={null}
                    currentPolygon={[]}
                    weatherConditions={null}

                    // Ховеры и стейт (для превью можно упростить)
                    hoveredObstacleId={null}
                    setHoveredObstacleId={() => { }}

                    // Обработчики событий
                    handleWheel={(e) => e.evt.preventDefault()}
                    handleDragMove={() => { }}
                    getCursor={() => "pointer"}
                    handleMouseMove={() => { }}
                    handleStageClick={(e) => {
                      // Предотвращаем всплытие, чтобы клик по stage не триггерил клик по Box сразу же, если нужно
                      e.cancelBubble = true;
                    }}
                    handleClick={() => { }}
                    setPoints={() => { }} // Заглушка, так как в превью не редактируем
                  />
                </Box>
              </Tooltip>
            </Box>
            <Box display="flex" alignItems="center" sx={{ mt: 2, ml: 1 }}>
              <Typography color="text.secondary">
                Разрешение базового слоя: {imageData?.width} x{" "}
                {imageData?.height} px
              </Typography>

              <Tooltip
                title="Базовый слой не должен быть обрезанным изображением или после преобразований. Разрешения фотокамеры должны совпадать с разрешениями базового слоя."
                arrow
                enterDelay={400}
              >
                <IconButton size="small" sx={{ m: 0, p: 0, ml: 1 }}>
                  <HelpOutlineIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>

            {!isResolutionMatch && (
              <Alert severity="warning" sx={{ alignItems: "center", mt: 2 }}>
                Обратите внимание, что разрешение камеры выбранного БПЛА не
                совпадает с разрешением базового слоя. Выберите другую модель БПЛА или настройте параметры камеры.
              </Alert>
            )}
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Typography variant="h6" sx={{ mb: 1, textAlign: "left" }}>
            Порядок построения траектории
          </Typography>

          <Box sx={{ mt: 1 }}>
            <FlightPlanningAccordion
              imageData={imageData}
              points={points}
              drones={drones}
              obstacles={obstacles}
              onClearObstacles={() => {
                setObstacles([]);
              }}
              onClearUserTrajectory={() => {
                setPoints([]);
              }}
              onEditObstacles={() => {
                setEditorOpen(true);
                setEditorMode("polygons");
              }}
              onEditUserTrajectory={() => {
                setEditorOpen(true);
                setEditorMode("points");
              }}
              onEditLine={
                () => {
                  setEditorOpen(true);
                  setEditorMode("line");
                }
              }
              onResetLine={
                () => {
                  setFlightLineY(imageData.height);
                }
              }
              setDroneParams={setDroneParams}
              droneParams={droneParams}
              flightLineY={flightLineY}
            />
          </Box>
        </Grid>
      </Grid>

      <Dialog
        open={isEditorOpen}
        onClose={closeEditor}
        fullScreen
        disableEscapeKeyDown
      >
        <DialogContent sx={{ p: 0 }}>
          <SceneEditor
            onClose={closeEditor}
            mode={editorMode}
            imageData={imageData}
            droneParams={droneParams}
            sceneTitle="Редактор схемы полёта"
            points={points}
            setPoints={setPoints}
            obstacles={obstacles}
            setObstacles={setObstacles}
            trajectoryData={null}
            setTrajectoryData={setTrajectoryData}
            flightLineY={flightLineY}
            setFlightLineY={setFlightLineY}
            uavLineConfigured={uavLineConfigured}
            setUavLineConfigured={setUavLineConfigured}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={isViewerOpen} onClose={closeViewer} fullScreen>
        <DialogContent sx={{ p: 0 }}>
          <SceneEditor
            onClose={closeViewer}
            imageData={imageData}
            droneParams={droneParams}
            sceneTitle="Просмотр схемы полёта"
            points={points}
            setPoints={setPoints}
            obstacles={obstacles}
            setObstacles={setObstacles}
            trajectoryData={null}
            setTrajectoryData={setTrajectoryData}
            flightLineY={flightLineY}
            setFlightLineY={setFlightLineY}
          />
        </DialogContent>
      </Dialog>

      <FlightSchemaLegendDialog
        open={isLegendOpen}
        onClose={() => setIsLegendOpen(false)}
      />
    </Box>
  );
};

export default BuildTrajectoryStep;
