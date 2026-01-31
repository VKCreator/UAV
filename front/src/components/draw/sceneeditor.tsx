import { FC, Fragment, useState, useRef, type JSX } from "react";
import {
  Box,
  Button,
  Divider,
  Stack,
  Typography,
  FormControlLabel,
  Checkbox,
  ToggleButton,
  ToggleButtonGroup,
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
import mapImage from "../../assets/DJI_0370.JPG";
import Konva from "konva";

import PanToolIcon from "@mui/icons-material/PanTool";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import ChangeHistoryIcon from "@mui/icons-material/ChangeHistory";
import Tooltip from "@mui/material/Tooltip";

import { AppBar, Toolbar, IconButton } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

import { v4 as uuidv4 } from "uuid";
import DeleteIcon from "@mui/icons-material/Delete";
import CheckIcon from "@mui/icons-material/Check";

const STAGE_WIDTH = 1100;
const STAGE_HEIGHT = 700;

interface Point {
  x: number;
  y: number;
}

interface TrajectoryPoint {
  x: number;
  y: number;
  color: string;
}

interface Polygon {
  id: string;
  points: Point[];
  color: string;
}

interface ImageData {
  imageUrl: string;
  fileName: string;
  width?: number;
  height?: number;
}

const GRID_COLS = 6.67;
const GRID_ROWS = 6.75;

const SceneEditor: FC<{
  onClose: () => void;
  mode?: string;
  imageData: ImageData;
}> = ({ onClose, mode, imageData }) => {
  const handleClose = () => {
    onClose();
  };

  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [image] = useImage(imageData.imageUrl);
  const [points, setPoints] = useState<Point[]>([]); // список точек
  const [obstacles, setObstacles] = useState<Polygon[]>([]); // список препятствий
  const [currentPolygon, setCurrentPolygon] = useState<Point[]>([]);

  const [trajectoryPoints, setTrajectoryPoints] = useState<TrajectoryPoint[]>(
    [],
  );
  const [loading, setLoading] = useState(false);
  const [trajectoryData, setTrajectoryData] = useState<any>(null);
  const [showGrid, setShowGrid] = useState(true); // галочка "показывать сетку"
  const [showUserTrajectory, setShowUserTrajectory] = useState(true); // галочка пользовательской траектории
  const [showTaxonTrajectory, setShowTaxonTrajectory] = useState(true); // галочка траекторий таксонов
  const [showObstacles, setShowObstacles] = useState(true); // галочка препятствий

  const stageRef = useRef<any>(null);

  const colors = [
    "#ff0000", // red
    "#0000ff", // blue
    "#008000", // green
    "#ffa500", // orange
    "#800080", // purple
    "#00ffff", // cyan
    "#ff00ff", // magenta
    "#ffff00", // yellow
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

  const width_m = 238.63; // длина изображения в метрах
  const height_m = 159.09; // высота изображения в метрах
  const meterPerPixelX = width_m / 5472;
  const meterPerPixelY = height_m / 3648;

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

  // Zoom колесом мыши
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

  // Клик по изображению
  const handleClick = (e: any) => {
    if (!image) return;
    if (toolMode == "pan") return;

    if (toolMode === "points") setShowUserTrajectory(true);

    if (toolMode === "polygons") setShowObstacles(true);

    if (e.evt.button !== 0) return; // Только левая кнопка мыши

    const stage = e.target.getStage();
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    // Координаты относительно Stage с учётом drag и zoom
    const xOnStage = (pointer.x - position.x) / scale;
    const yOnStage = (pointer.y - position.y) / scale;

    // Координаты относительно изображения
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

  const handleDragMove = (e: any) => {
    const stage = e.target;
    setPosition({
      x: stage.x(),
      y: stage.y(),
    });
  };

  // Генерация линий сетки
  const renderGrid = () => {
    if (!image || !showGrid) return null; // учитываем галочку
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

    const width_m = 238.63;
    const height_m = 159.09;
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

    console.log("Payload для API:", payload);

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
      setTrajectoryData(data); // Сохраняем полный ответ для рендера
      setShowUserTrajectory(false);
      //   if (!data.B || data.B.length === 0) {
      //     console.log("Таксонов нет");
      //     return;
      //   }

      //   // Создадим массив цветов для таксонов
      //   const colors = [
      //     "red",
      //     "blue",
      //     "green",
      //     "orange",
      //     "purple",
      //     "cyan",
      //     "magenta",
      //     "yellow",
      //   ];

      //   // Преобразуем точки из метров в пиксели
      //   const pointsByTaxon = data.B.map((taxon: any, idx: number) => {
      //     const color = colors[idx % colors.length];
      //     const pixelPoints = taxon.points.map((p: [number, number]) => ({
      //       x: p[0] / meterPerPixelX,
      //       y: image.height - p[1] / meterPerPixelY, // обратно в левый верхний угол
      //       color,
      //     }));
      //     return pixelPoints;
      //   });

      //   // Объединим все точки в один массив для отображения
      //   const allPoints: TrajectoryPoint[] = [];
      //   pointsByTaxon.forEach((taxonPoints: TrajectoryPoint[]) =>
      //     allPoints.push(...taxonPoints),
      //   );

      //   // Сохраняем в state для рендера
      //   setTrajectoryPoints(allPoints);
    } catch (err) {
      console.error("Ошибка запроса:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!image) return;
    setLoading(true);

    // Создаем временный Stage с исходными размерами изображения
    const container = document.createElement("div"); // временный контейнер в памяти
    const downloadStage = new Konva.Stage({
      container, // добавляем этот временный контейнер
      width: image.width,
      height: image.height,
    });

    const layer = new Konva.Layer();
    downloadStage.add(layer);

    // Добавляем изображение
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
      trajectoryData.B.forEach((taxon: any, idx: number) => {
        const color = colors[idx % colors.length];

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
              radius: 8,
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

    layer.draw();

    // Генерируем PNG
    const dataURL = downloadStage.toDataURL({ pixelRatio: 1 });

    // Скачиваем
    const link = document.createElement("a");
    link.href = dataURL;
    link.download = "trajectory_map.png";
    link.click();

    // Чистим временный Stage
    downloadStage.destroy();

    setLoading(false);
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
            onClick={() => handleClose()} // или ваша функция навигации
            aria-label="назад"
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" fontWeight="medium">
            Редактор схемы
          </Typography>
        </Box>
        {/* Пустое место справа для баланса (можно добавить что-то позже) */}
        <Box />
      </Box>
      <Box display="flex" flex={1}>
        {/* Левая панель */}
        <Box width={350} borderRight="1px solid" borderColor="divider" p={2}>
          <Stack spacing={2}>
            {/* === РЕЖИМЫ РАБОТЫ === */}
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

            {/* === МАСШТАБНАЯ СЕТКА === */}
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
            {/* === ПРЕПЯТСТВИЯ === */}
            <Box>
              {/* Заголовок с чекбоксом рядом */}
              <Box
                display="flex"
                alignItems="center"
                justifyContent="space-between"
                mb={1}
              >
                <Typography variant="subtitle1">Препятствия</Typography>
                <Checkbox
                  checked={showObstacles}
                  onChange={(e) => setShowObstacles(e.target.checked)}
                  size="small"
                  disabled={obstacles.length === 0}
                />
              </Box>

              {/* Счетчик полигонов */}
              <Typography variant="body2" mb={1} color="text.secondary">
                Всего:{" "}
                <Box component="span" color="text.secondary" fontWeight="bold">
                  {obstacles.length}
                </Box>{" "}
                шт.
              </Typography>

              {/* Кнопки на одной строке */}
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
            {/* === ТРАЕКТОРИИ === */}
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
                    onChange={(e) => setShowUserTrajectory(e.target.checked)}
                    size="small"
                    disabled={points.length === 0}
                  />
                </Tooltip>
              </Box>

              {/* Кнопки на одной строке */}
              <Stack
                direction="row"
                spacing={1}
                justifyContent="space-between"
                alignItems="center"
              >
                {/* Счетчик точек */}
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

            <Box>
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

              {/* Счетчик таксонов и кнопка очистки */}
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

              {/* Кнопка оптимизации */}
              <Button
                size="small"
                variant="contained"
                onClick={handleCalculateTrajectory}
                disabled={points.length === 0}
                sx={{ mt: 1 }}
              >
                Оптимизировать траекторию
              </Button>
            </Box>

            <Divider />

            {/* === ДЕЙСТВИЯ === */}
            <Stack spacing={1}>
              <Button
                variant="contained"
                color="success"
                onClick={handleDownload}
                disabled={!image}
              >
                Скачать схему
              </Button>
            </Stack>
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
                  />
                )}

                {!image && (
                  <>
                    <Rect
                      x={0}
                      y={0}
                      width={STAGE_WIDTH}
                      height={STAGE_HEIGHT}
                      fill="rgba(255,255,255,0.7)" // полупрозрачный фон
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

                {/* Сетка */}
                {renderGrid()}

                {/* Соединяем точки стрелками */}
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

                {/* Рисуем точки с порядковым номером */}
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
                          setPoints(points.filter((_, idx) => idx !== i));
                        }}
                      />
                      <Text
                        x={point.x * scaleToFit + imageX - 5}
                        y={point.y * scaleToFit + imageY - 7}
                        text={(i + 1).toString()}
                        fontSize={12}
                        fill="white"
                        onContextMenu={(e) => {
                          e.evt.preventDefault();
                          setPoints(points.filter((_, idx) => idx !== i));
                        }}
                      />
                    </Fragment>
                  ))}
                {/* Trajectory Points для всех таксонов */}
                {showTaxonTrajectory &&
                  image &&
                  trajectoryData?.B?.map((taxon: any, idx: number) => {
                    const color = colors[idx % colors.length];

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

                        {/* Соединяем базу с первой и последней точкой таксона */}
                        {taxonPoints.length > 0 && (
                          <>
                            <Arrow
                              points={[
                                baseX * scaleToFit + imageX,
                                baseY * scaleToFit + imageY,
                                taxonPoints[0].x * scaleToFit + imageX,
                                taxonPoints[0].y * scaleToFit + imageY,
                              ]}
                              pointerLength={10}
                              pointerWidth={10}
                              fill={color}
                              stroke={color}
                              strokeWidth={2}
                            />
                            <Arrow
                              points={[
                                taxonPoints[taxonPoints.length - 1].x *
                                  scaleToFit +
                                  imageX,
                                taxonPoints[taxonPoints.length - 1].y *
                                  scaleToFit +
                                  imageY,
                                baseX * scaleToFit + imageX,
                                baseY * scaleToFit + imageY,
                              ]}
                              pointerLength={10}
                              pointerWidth={10}
                              fill={color}
                              stroke={color}
                              strokeWidth={2}
                            />
                          </>
                        )}

                        {/* Точки таксона и номера */}
                        {taxonPoints.map((p, i) => (
                          <Fragment key={`taxon-point-${idx}-${i}`}>
                            {/* Соединяем стрелками между точками */}
                            {i > 0 && (
                              <Arrow
                                points={[
                                  taxonPoints[i - 1].x * scaleToFit + imageX,
                                  taxonPoints[i - 1].y * scaleToFit + imageY,
                                  p.x * scaleToFit + imageX,
                                  p.y * scaleToFit + imageY,
                                ]}
                                pointerLength={10}
                                pointerWidth={10}
                                fill={color}
                                stroke={color}
                                strokeWidth={2}
                              />
                            )}
                            <Circle
                              x={p.x * scaleToFit + imageX}
                              y={p.y * scaleToFit + imageY}
                              radius={8}
                              fill={p.color}
                            />
                            <Text
                              x={p.x * scaleToFit + imageX - 5}
                              y={p.y * scaleToFit + imageY - 7}
                              text={`${i + 1}`}
                              fontSize={12}
                              fill="white"
                            />
                          </Fragment>
                        ))}
                      </Fragment>
                    );
                  })}

                {showObstacles &&
                  obstacles.map((poly) => (
                    <Line
                      key={poly.id}
                      points={poly.points.flatMap((p) => [
                        p.x * scaleToFit + imageX,
                        p.y * scaleToFit + imageY,
                      ])}
                      closed
                      fill={`${poly.color}20`}
                      stroke={poly.color}
                      strokeWidth={2}
                    />
                  ))}

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

                {/* Спиннер поверх всего Stage */}
                {loading && (
                  <>
                    <Rect
                      x={0}
                      y={0}
                      width={STAGE_WIDTH}
                      height={STAGE_HEIGHT}
                      fill="rgba(255,255,255,0.7)" // полупрозрачный фон
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
          {/* Вспомогательное сообщение поверх сцены */}
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
                pointerEvents: "none", // чтобы не мешало кликам
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
                pointerEvents: "none", // чтобы не мешало кликам
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
