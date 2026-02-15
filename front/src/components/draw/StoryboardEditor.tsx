import { FC, useState, JSX, useEffect } from "react";
import {
  Box,
  Typography,
  Divider,
  Button,
  IconButton,
  Stack,
  CircularProgress,
  TextField,
  ToggleButton,
  Paper,
  Alert,
} from "@mui/material";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";

import CircleIcon from "@mui/icons-material/Circle";
import RecommendIcon from "@mui/icons-material/Recommend";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import DeleteIcon from "@mui/icons-material/Delete";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { CheckCircle as CheckCircleIcon } from "@mui/icons-material";
import CheckIcon from "@mui/icons-material/Check";
import HighlightAltIcon from "@mui/icons-material/HighlightAlt";

import SceneCanvas from "./SceneCanvas";
import StoryboardTimeline from "./StoryboardTimeline";
import { DroneParams } from "../../types/uav.types";
import { Storyboards } from "../../types/storyboards.types";
import useImage from "use-image";
import { ImageData } from "./scene.types";
import Konva from "konva";

interface StoryboardEditorProps {
  onClose: () => void;

  imageData: ImageData;
  points: any[];
  obstacles: any[];
  trajectoryData?: any;

  droneParams: DroneParams;

  storyboardsData: Storyboards;
  setStoryboardsData: React.Dispatch<React.SetStateAction<Storyboards>>;

  framesUrlsPointBased: string[];
  setFramesUrlsPointBased: React.Dispatch<React.SetStateAction<string[]>>;
}

type StoryboardType = "point" | "recommended" | "optimal";

const typeConfigs: Record<
  StoryboardType,
  { label: string; icon: JSX.Element; description: string }
> = {
  point: {
    label: "Точечная",
    icon: <CircleIcon fontSize="small" />,
    description:
      "Создаёт раскадровку только по отдельным точкам пользовательского маршрута.",
  },
  recommended: {
    label: "Рекомендуемая",
    icon: <RecommendIcon fontSize="small" />,
    description:
      "Формируется на основе всей площади поверхности исследуемого объекта.",
  },
  optimal: {
    label: "Оптимальная",
    icon: <AutoAwesomeIcon fontSize="small" />,
    description:
      "Строится на основе направления оптимальной траектории полёта.",
  },
};

const cropFrameKonva = (
  image: HTMLImageElement,
  centerX: number,
  centerY: number,
  frameWidth: number,
  frameHeight: number,
): Promise<Blob> => {
  return new Promise((resolve) => {
    const stage = new Konva.Stage({
      width: frameWidth,
      height: frameHeight,
      container: document.createElement("div"), // временный контейнер
    });

    const layer = new Konva.Layer();
    stage.add(layer);

    const konvaImage = new Konva.Image({
      image,
      x: -centerX + frameWidth / 2,
      y: -centerY + frameHeight / 2,
    });

    layer.add(konvaImage);
    layer.draw();

    stage.toCanvas().toBlob(
      (blob: any) => {
        if (blob) resolve(blob);
      },
      "image/jpeg",
      1,
    ); // or png?
  });
};

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) {
    return `${bytes} B`;
  } else if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(2)} KB`;
  } else if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  } else {
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }
};

const StoryboardEditor: FC<StoryboardEditorProps> = ({
  onClose,
  imageData,
  points,
  obstacles,
  trajectoryData,
  droneParams,
  storyboardsData,
  setStoryboardsData,
  framesUrlsPointBased,
  setFramesUrlsPointBased,
}) => {
  const [activeType, setActiveType] = useState<StoryboardType | null>("point");
  const [selectedFrame, setSelectedFrame] = useState(0);

  const [loading, setLoading] = useState(false);

  const [applyPointBasedStoryboard, setApplyPointBasedStoryboard] =
    useState<boolean>(false);
  const [applyRecommendedStoryboard, setApplyRecommendedStoryboard] =
    useState<boolean>(false);
  const [applyOptimalStoryboard, setApplyOptimalStoryboard] =
    useState<boolean>(false);
  const [isSelecting, setIsSelecting] = useState(false); // Управление режимом выбора области
  const handleSelectAreaClick = () => {
    setIsSelecting(!isSelecting); // Переключаем режим выбора области
  };

  const frameWidthPx =
    imageData.width /
    (droneParams.frameWidthBase / droneParams.frameWidthPlanned);
  const frameHeightPx =
    imageData.height /
    (droneParams.frameHeightBase / droneParams.frameHeightPlanned);

  const [img] = useImage(imageData.imageUrl);

  const extractFrames = async () => {
    console.error(img);
    if (!img) return;

    const blobs = await Promise.all(
      points.map((p) =>
        cropFrameKonva(img, p.x, p.y, frameWidthPx, frameHeightPx),
      ),
    );

    const totalBytes = blobs.reduce((sum, b) => sum + b.size, 0);

    console.log("Размер одного кадра (пример):", blobs[0]?.size, "байт");
    console.log("Общий размер:", totalBytes, "байт");
    console.log("Общий размер (MB):", (totalBytes / 1024 / 1024).toFixed(2));

    setStoryboardsData((prev) => ({
      ...prev,
      point_based: {
        ...prev.point_based,
        disk_space: totalBytes,
        count_frames: blobs.length,
      },
    }));

    const urls = blobs.map((b) => {
      return URL.createObjectURL(b);
    });
    setFramesUrlsPointBased(urls);
    return urls;
  };

  const toggleType = (type: StoryboardType) => {
    setActiveType((prev) => (prev === type ? null : type));
  };

  const handleApply = async () => {
    console.error(activeType);
    if (activeType === "point") {
      setLoading(true);
      try {
        await extractFrames();
        setApplyPointBasedStoryboard(true);
        storyboardsData.point_based.applied = true;
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    } else if (activeType == "recommended") setApplyRecommendedStoryboard(true);
    else if (activeType == "optimal") setApplyOptimalStoryboard(true);
  };

  const handleResetInterestArea = () => {};

  const handleReset = () => {
    framesUrlsPointBased.map((u: string) => URL.revokeObjectURL(u));

    setFramesUrlsPointBased([]);

    if (activeType == "point") {
      setApplyPointBasedStoryboard(false);
      setStoryboardsData((prev) => ({
        ...prev,
        point_based: {
          ...prev.point_based,
          applied: false,
          count_frames: null,
          disk_space: null,
        },
      }));
    }

    console.log("Сброс параметров для:", activeType);
  };

  useEffect(() => {
    console.error(storyboardsData.point_based);
    // if (storyboardsData.point_based.applied) handleApply();

    return () => {
      // framesUrlsPointBased.map((u: string) => URL.revokeObjectURL(u));
      // setFramesUrlsPointBased([]);
    };
  }, [img]);

  return (
    <Box display="flex" flexDirection="column" height="100%" width="100%">
      {/* Спиннер */}
      {loading && (
        <Box
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "rgba(255, 255, 255, 0.7)", // Полупрозрачный фон
            zIndex: 9999, // Спиннер будет поверх всего контента
            flexDirection: "column",
          }}
        >
          <CircularProgress />
          <Typography
            variant="h6"
            sx={{ mt: 2, color: "#014488ff", fontWeight: 500 }} // отступ сверху, цвет и жирность
          >
            Пожалуйста, подождите...
          </Typography>
        </Box>
      )}
      {/* Header */}
      <Box
        display="flex"
        alignItems="center"
        gap={1}
        p={1}
        borderBottom="1px solid"
        borderColor="divider"
        bgcolor="background.paper"
      >
        <IconButton size="small" onClick={onClose}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h6" fontWeight="medium">
          Редактор раскадровки
        </Typography>
      </Box>

      <Box display="flex" flex={1} overflow="hidden">
        {/* Левая панель — вертикальное меню */}
        <Box
          width={120}
          borderRight="1px solid"
          borderColor="divider"
          p={1}
          display="flex"
          flexDirection="column"
          gap={1}
        >
          {(Object.keys(typeConfigs) as StoryboardType[]).map((type) => {
            const config = typeConfigs[type];
            const isActive = activeType === type;
            return (
              <Box
                key={type}
                onClick={() => toggleType(type)}
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  cursor: "pointer",
                  userSelect: "none",
                  // bgcolor: isActive ? "primary.dark" : "transparent",
                  color: isActive ? "primary.dark" : "text.primary",
                  borderRadius: 2,
                  py: 1,
                  px: 0.5,
                  "&:hover": {
                    color: isActive ? "primary.dark" : "text.primary", // при наведении тоже меняем цвет текста
                    bgcolor: isActive
                      ? "transparent"
                      : "          rgba(0, 78, 158, 0.08)",
                  },
                }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    toggleType(type);
                    e.preventDefault();
                  }
                }}
              >
                <IconButton
                  size="large"
                  sx={{
                    color: "inherit",
                    p: 0,
                    mb: 0.5,
                    pointerEvents: "none",
                  }}
                  aria-label={config.label}
                  tabIndex={-1}
                >
                  {config.icon}
                </IconButton>
                <Typography
                  variant="caption"
                  sx={{ fontSize: "12px" }}
                  component="span"
                  align="center"
                >
                  {config.label}
                </Typography>
              </Box>
            );
          })}
        </Box>

        {/* Панель инструментов для выбранного типа */}
        {activeType && (
          <Box
            width={350}
            borderRight="1px solid"
            borderColor="divider"
            p={2}
            display="flex"
            flexDirection="column"
            gap={2}
            overflow="auto"
          >
            <Typography variant="subtitle1" fontWeight={600}>
              {typeConfigs[activeType].label}
            </Typography>

            <Typography variant="body2" color="text.secondary">
              {typeConfigs[activeType].description}
            </Typography>

            {/* ---------------- Размер кадра ---------------- */}
            <Box
              sx={{
                p: 2,
                borderRadius: 2,
                bgcolor: "background.paper",
                border: "1px solid",
                borderColor: "divider",
              }}
            >
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ textTransform: "uppercase", letterSpacing: 0.5 }}
              >
                Размер кадра
              </Typography>

              <Stack spacing={1} mt={1}>
                <Typography color="text.secondary" fontWeight={600}>
                  {droneParams.frameWidthPlanned.toFixed(2)} ×{" "}
                  {droneParams.frameHeightPlanned.toFixed(2)} м
                </Typography>
                <Typography color="text.secondary" fontWeight={600}>
                  {frameWidthPx.toFixed(2)} × {frameHeightPx.toFixed(2)} px
                </Typography>
              </Stack>
            </Box>

            {activeType === "recommended" && (
              <Box
                sx={{
                  p: 2,
                  borderRadius: 2,
                  bgcolor: "background.paper",
                  border: "1px solid",
                  borderColor: "divider",
                }}
              >
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ textTransform: "uppercase", letterSpacing: 0.5 }}
                  gutterBottom
                >
                  Параметры
                </Typography>

                <Stack spacing={1.5} mt={1}>
                  <Box
                    display="flex"
                    justifyContent="space-between"
                    alignItems="center"
                  >
                    <Typography variant="body2" color="text.secondary">
                      Шаг по ширине, м
                    </Typography>
                    <TextField
                      type="number"
                      value={storyboardsData?.recommended?.step_x || ""}
                      onChange={(e) =>
                        setStoryboardsData((prev) => ({
                          ...prev,
                          recommended: {
                            ...prev.recommended,
                            step_x: Number(e.target.value),
                          },
                        }))
                      }
                      variant="outlined" // variant для оформления (outlined, filled, etc.)
                      size="small" // Размер поля
                      sx={{ width: 120, textAlign: "right" }} // Стиль: задаём размер и выравнивание
                      InputProps={{
                        inputMode: "numeric", // Для мобильных устройств, чтобы показывалась клавиатура для ввода чисел
                      }}
                    />
                  </Box>
                  <Box
                    display="flex"
                    justifyContent="space-between"
                    alignItems="center"
                  >
                    <Typography variant="body2" color="text.secondary">
                      Шаг по высоте, м
                    </Typography>
                    <TextField
                      type="number"
                      value={storyboardsData?.recommended?.step_y || ""}
                      onChange={(e) =>
                        setStoryboardsData((prev) => ({
                          ...prev,
                          recommended: {
                            ...prev.recommended,
                            step_y: Number(e.target.value),
                          },
                        }))
                      }
                      variant="outlined" // variant для оформления (outlined, filled, etc.)
                      size="small" // Размер поля
                      sx={{ width: 120, textAlign: "right" }} // Стиль: задаём размер и выравнивание
                      InputProps={{
                        inputMode: "numeric", // Для мобильных устройств, чтобы показывалась клавиатура для ввода чисел
                      }}
                    />
                  </Box>

                  {/* Кнопки снизу */}
                  <Stack direction="row" spacing={2} alignItems="center" mt={2}>
                    {/* Кнопка для выбора области */}
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ color: isSelecting ? "green" : "text.secondary" }}
                    >
                      {isSelecting
                        ? "Режим выбора области включен"
                        : "Выбор области исследования"}
                    </Typography>
                    <ToggleButton
                      value="check"
                      selected={isSelecting}
                      onChange={() => {
                        setIsSelecting((prevSelected) => !prevSelected);

                        setApplyRecommendedStoryboard(false);
                      }}
                    >
                      <HighlightAltIcon />
                    </ToggleButton>

                    {/* Кнопка сброса */}
                    <IconButton color="error" onClick={handleResetInterestArea}>
                      <DeleteIcon />
                    </IconButton>
                  </Stack>

                  {/* Текст инструкции при включенном режиме выбора */}

                  {isSelecting && (
                    <Alert
                      severity="info"
                      sx={{
                        mt: 3,
                        fontSize: "0.7rem", // мелкий текст
                        borderRadius: 1,
                        p: 1.5, // паддинг
                        alignItems: "center",
                      }}
                    >
                      Нажмите на изображение и, удерживая мышь, протяните
                      область выделения.
                    </Alert>
                  )}
                </Stack>
              </Box>
            )}

            {/* ---------------- Свойства раскадровки ---------------- */}
            <Box
              sx={{
                p: 2,
                borderRadius: 2,
                bgcolor: "background.paper",
                border: "1px solid",
                borderColor: "divider",
              }}
            >
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ textTransform: "uppercase", letterSpacing: 0.5 }}
                gutterBottom
              >
                Свойства раскадровки
              </Typography>

              <Stack spacing={1.5} mt={1}>
                <Box
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                  gap={1}
                >
                  <Box display="flex" alignItems="center" gap={2}>
                    <Box
                      sx={{
                        width: 10,
                        height: 10,
                        borderRadius: "50%",
                        bgcolor: "#004e9e",
                      }}
                    />
                    <Typography variant="body2" color="text.secondary">
                      Количество кадров
                    </Typography>
                  </Box>
                  <Typography variant="body2" fontWeight={500}>
                    {storyboardsData?.point_based.count_frames
                      ? `${storyboardsData?.point_based.count_frames} шт.`
                      : "—"}
                  </Typography>
                </Box>

                <Box
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                  gap={1}
                >
                  <Box display="flex" alignItems="center" gap={2}>
                    <Box
                      sx={{
                        width: 10,
                        height: 10,
                        borderRadius: "50%",
                        bgcolor: "#004e9e",
                      }}
                    />
                    <Typography variant="body2" color="text.secondary">
                      Объём памяти
                    </Typography>
                  </Box>
                  <Typography variant="body2" fontWeight={500}>
                    {storyboardsData?.point_based.disk_space
                      ? `${formatFileSize(storyboardsData.point_based.disk_space)}`
                      : "—"}
                  </Typography>
                </Box>

                <Box
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                  gap={1}
                >
                  <Box display="flex" alignItems="center" gap={2}>
                    <Box
                      sx={{
                        width: 10,
                        height: 10,
                        borderRadius: "50%",
                        bgcolor: "#004e9e",
                      }}
                    />
                    <Typography variant="body2" color="text.secondary">
                      Время полёта
                    </Typography>
                  </Box>

                  <Typography variant="body2" fontWeight={500}>
                    {storyboardsData?.point_based.total_flight_time
                      ? `${storyboardsData.point_based.total_flight_time} сек`
                      : "—"}
                  </Typography>
                </Box>
              </Stack>
            </Box>

            {/* ---------------- Кнопки ---------------- */}
            <Stack
              direction="row"
              // spacing={2}
              alignItems="center"
              justifyContent="space-between"
            >
              <Button
                size="small"
                variant="contained"
                // fullWidth
                onClick={handleApply}
                disabled={activeType == "recommended" && isSelecting}
              >
                Применить
              </Button>

              <IconButton color="error" onClick={handleReset}>
                <DeleteIcon />
              </IconButton>
            </Stack>
          </Box>
        )}

        {/* Правая панель — сцена + таймлайн */}
        <Box
          flex={1}
          display="flex"
          flexDirection="column"
          bgcolor="#f4f6f8"
          overflow="auto"
          alignItems="center"
          justifyContent="space-between"
          gap={2}
          pt={2}
        >
          <SceneCanvas
            imageData={imageData}
            points={points}
            obstacles={obstacles}
            trajectoryData={trajectoryData}
            frameWidthPx={frameWidthPx}
            frameHeightPx={frameHeightPx}
            showPoints={activeType == "point"}
            showObstacles
            showTaxons={activeType == "optimal"}
            applyPointBasedStoryboard={
              applyPointBasedStoryboard && activeType == "point"
            }
            applyRecommendedStoryboard={
              applyRecommendedStoryboard && activeType == "recommended"
            }
            applyOptimalStoryboard={
              applyOptimalStoryboard && activeType == "optimal"
            }
            isSelecting={isSelecting}
            activeType={activeType}
            width_m={droneParams.frameWidthBase}
            height_m={droneParams.frameHeightBase}
          />

          <StoryboardTimeline
            frames={framesUrlsPointBased}
            selectedIndex={selectedFrame}
            onSelect={setSelectedFrame}
          />
        </Box>
      </Box>
    </Box>
  );
};

export default StoryboardEditor;
