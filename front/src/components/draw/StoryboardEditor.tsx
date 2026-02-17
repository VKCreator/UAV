import { FC, useState, JSX, useEffect, useMemo, use } from "react";
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
  Tooltip,
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
import HelpIcon from "@mui/icons-material/Help";

import SceneCanvas from "./SceneStoryboardCanvas";
import StoryboardTimeline from "./StoryboardTimeline";
import { DroneParams } from "../../types/uav.types";
import { Storyboards } from "../../types/storyboards.types";
import useImage from "use-image";
import { ImageData, Point } from "./scene.types";
import Konva from "konva";

import useNotifications from "../../hooks/useNotifications/useNotifications";
import { HelpIconTooltip } from "../ui-widgets/HelpIconTooltip";
import { api } from "../../api/client";

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

  framesUrlsRecommended: string[];
  setFramesUrlsRecommended: React.Dispatch<React.SetStateAction<string[]>>;

  framesUrlsOptimal: string[];
  setFramesUrlsOptimal: React.Dispatch<React.SetStateAction<string[]>>;

  pointsRecommended: Point[];
  setPointsRecommended: React.Dispatch<React.SetStateAction<Point[]>>;

  selection: any;
  setSelection: React.Dispatch<React.SetStateAction<any>>;
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
  framesUrlsRecommended,
  setFramesUrlsRecommended,
  framesUrlsOptimal,
  setFramesUrlsOptimal,
  pointsRecommended,
  setPointsRecommended,
  selection,
  setSelection,
}) => {
  const notifications = useNotifications();

  const [activeType, setActiveType] = useState<StoryboardType | null>("point");
  const [loading, setLoading] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false); // Управление режимом выбора области

  const [needUpdateRecommended, setIsNeedUpdateRecommended] = useState(false);

  const frameWidthPx =
    imageData.width /
    (droneParams.frameWidthBase / droneParams.frameWidthPlanned);
  const frameHeightPx =
    imageData.height /
    (droneParams.frameHeightBase / droneParams.frameHeightPlanned);
  const metersToPxWidth = imageData.width / droneParams.frameWidthBase;
  const metersToPxHeight = imageData.height / droneParams.frameHeightBase;

  const isRecommended = activeType === "recommended";
  const isOptimal = activeType === "optimal";
  const isPointBased = activeType === "point";

  const activeStoryboardData = activeType
    ? storyboardsData?.[activeType]
    : null;

  const [img] = useImage(imageData.imageUrl);

  const extractFrames = async () => {
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
      point: {
        ...prev.point,
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

  const extractRecommendedFrames = async () => {
    // console.error(img);
    if (!img) return;

    if (pointsRecommended.length === 0) {
      notifications.show(
        "Кадры сформировать не удалось. Укажите область большего размера.",
        {
          severity: "error",
          autoHideDuration: 5000,
        },
      );
    }

    const blobs = await Promise.all(
      pointsRecommended.map((p) =>
        cropFrameKonva(img, p.x, p.y, frameWidthPx, frameHeightPx),
      ),
    );

    const totalBytes = blobs.reduce((sum, b) => sum + b.size, 0);

    console.log("Размер одного кадра (пример):", blobs[0]?.size, "байт");
    console.log("Общий размер:", totalBytes, "байт");
    console.log("Общий размер (MB):", (totalBytes / 1024 / 1024).toFixed(2));

    setStoryboardsData((prev) => ({
      ...prev,
      recommended: {
        ...prev.recommended,
        disk_space: totalBytes,
        count_frames: blobs.length,
      },
    }));

    const urls = blobs.map((b) => {
      return URL.createObjectURL(b);
    });
    setFramesUrlsRecommended(urls);
  };

  const extractOptimalFrames = async () => {
    // console.error(img);
    if (!img || !trajectoryData) return;

    const metersToPxWidth = imageData.width / droneParams.frameWidthBase;
    const metersToPxHeight = imageData.height / droneParams.frameHeightBase;

    // Получаем все точки из всех объектов в массиве B и переводим в пиксели
    const pointsFromB = trajectoryData?.B.flatMap((bItem: any) =>
      bItem.points.map((point: any) => ({
        x: point[0] * metersToPxWidth,
        y: imageData.height - point[1] * metersToPxHeight,
      })),
    );
    setPointsOptimal(pointsFromB);

    const blobs = await Promise.all(
      pointsFromB.map((p: any) =>
        cropFrameKonva(img, p.x, p.y, frameWidthPx, frameHeightPx),
      ),
    );

    const totalBytes = blobs.reduce((sum, b) => sum + b.size, 0);

    console.log("Размер одного кадра (пример):", blobs[0]?.size, "байт");
    console.log("Общий размер:", totalBytes, "байт");
    console.log("Общий размер (MB):", (totalBytes / 1024 / 1024).toFixed(2));

    setStoryboardsData((prev) => ({
      ...prev,
      optimal: {
        ...prev.optimal,
        disk_space: totalBytes,
        count_frames: blobs.length,
      },
    }));

    const urls = blobs.map((b) => {
      return URL.createObjectURL(b);
    });
    setFramesUrlsOptimal(urls);
  };

  const toggleType = (type: StoryboardType) => {
    setActiveType(type);
  };

  const handleApply = async () => {
    if (isPointBased) {
      framesUrlsPointBased.map((u: string) => URL.revokeObjectURL(u));
      setFramesUrlsPointBased([]);
      setLoading(true);
      try {
        await extractFrames();

        const pointsArray = points.map((p: any) => {
          const xMeters = p.x / metersToPxWidth;

          // инвертируем Y и переводим в метры
          const yMeters = (imageData.height - p.y) / metersToPxHeight;

          return [xMeters, yMeters];
        });

        const flightTime = await api.trajectory.getFlightTime(
          pointsArray,
          droneParams.speed,
          droneParams.hoverTime,
        );

        setStoryboardsData((prev) => ({
          ...prev,
          point: {
            ...prev.point,
            applied: true,
            total_flight_time: flightTime ? flightTime.flight_time_sec : null,
          },
        }));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    } else if (isRecommended) {
      framesUrlsRecommended.map((u: string) => URL.revokeObjectURL(u));
      setFramesUrlsRecommended([]);
      setIsSelecting(false);
      setLoading(true);
      try {
        await extractRecommendedFrames();

        const pointsArray = pointsRecommended.map((p: any) => {
          const xMeters = p.x / metersToPxWidth;

          // // инвертируем Y и переводим в метры
          const yMeters = (imageData.height - p.y) / metersToPxHeight;

          return [xMeters, yMeters];
        });

        const flightTime = await api.trajectory.getFlightTime(
          pointsArray,
          droneParams.speed,
          droneParams.hoverTime,
        );

        setStoryboardsData((prev) => ({
          ...prev,
          recommended: {
            ...prev.recommended,
            applied: true,
            total_flight_time: flightTime ? flightTime.flight_time_sec : null,
          },
        }));

        setIsNeedUpdateRecommended(false);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    } else if (isOptimal) {
      framesUrlsOptimal.map((u: string) => URL.revokeObjectURL(u));
      setFramesUrlsOptimal([]);
      setLoading(true);
      try {
        await extractOptimalFrames();

        const pointsArray = trajectoryData.B[0].points.map((p: any) => {
          // const xMeters = p.x / metersToPxWidth;

          // // инвертируем Y и переводим в метры
          // const yMeters = (imageData.height - p.y) / metersToPxHeight;

          return [p[0], p[1]];
        });

        const flightTime = await api.trajectory.getFlightTime(
          pointsArray,
          droneParams.speed,
          droneParams.hoverTime,
        );

        setStoryboardsData((prev) => ({
          ...prev,
          optimal: {
            ...prev.optimal,
            applied: true,
            total_flight_time: flightTime ? flightTime.flight_time_sec : null,
          },
        }));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
  };

  const getFrames = () => {
    if (isPointBased && activeStoryboardData?.applied)
      return framesUrlsPointBased;
    else if (isRecommended && activeStoryboardData?.applied)
      return framesUrlsRecommended;
    else if (isOptimal && activeStoryboardData?.applied)
      return framesUrlsOptimal;

    return [];
  };

  const handleResetInterestArea = () => {
    if (isPointBased) {
      framesUrlsPointBased.map((u: string) => URL.revokeObjectURL(u));
      setFramesUrlsPointBased([]);

      setStoryboardsData((prev) => ({
        ...prev,
        point: {
          ...prev.point,
          applied: false,
          count_frames: null,
          disk_space: null,
          total_flight_time: null,
        },
      }));
    } else if (isRecommended) {
      setSelection(null);

      framesUrlsRecommended.map((u: string) => URL.revokeObjectURL(u));
      setFramesUrlsRecommended([]);

      setStoryboardsData((prev) => ({
        ...prev,
        recommended: {
          ...prev.recommended,
          applied: false,
          count_frames: null,
          disk_space: null,
          total_flight_time: null,
        },
      }));
    } else if (isOptimal) {
      framesUrlsOptimal.map((u: string) => URL.revokeObjectURL(u));
      setFramesUrlsOptimal([]);

      setStoryboardsData((prev) => ({
        ...prev,
        optimal: {
          ...prev.optimal,
          applied: false,
          count_frames: null,
          disk_space: null,
          total_flight_time: null,
        },
      }));
    }
  };

  useEffect(() => {
    setStoryboardsData((prev) => {
      if (
        prev.recommended?.step_x !== undefined &&
        prev.recommended?.step_x !== null
      ) {
        return prev;
      }

      return {
        ...prev,
        recommended: {
          ...prev.recommended,
          step_x: droneParams.frameWidthPlanned,
        },
      };
    });
  }, [droneParams.frameWidthPlanned]);

  useEffect(() => {
    setStoryboardsData((prev) => {
      // Если step_y уже есть, не трогаем его
      if (
        prev.recommended?.step_y !== undefined &&
        prev.recommended?.step_y !== null
      ) {
        return prev;
      }

      return {
        ...prev,
        recommended: {
          ...prev.recommended,
          step_y: droneParams.frameHeightPlanned,
        },
      };
    });
  }, [droneParams.frameHeightPlanned]);

  // useEffect(() => {
  //   console.error("useEffect");
  //   // if (storyboardsData.point_based.applied) handleApply();
  //   setPointsRecommended(generateRecommendedGridInSelection());

  //   return () => {
  //     // framesUrlsPointBased.map((u: string) => URL.revokeObjectURL(u));
  //     // setFramesUrlsPointBased([]);
  //   };
  // }, [img, selection]);

  // Рекомендуемый метод
  const generateRecommendedGridInSelection = (selection: {
    x: number;
    y: number;
    width: number;
    height: number;
  }): Point[] => {
    const scaledFrameWidth = frameWidthPx;
    const scaledFrameHeight = frameHeightPx;

    const stepX =
      (frameWidthPx * storyboardsData?.recommended?.step_x!) /
      droneParams.frameWidthPlanned;
    const stepY =
      (frameHeightPx * storyboardsData?.recommended?.step_y!) /
      droneParams.frameHeightPlanned;

    const points: Point[] = [];

    const startX = selection.x + scaledFrameWidth / 2;
    const endX = selection.x + selection.width;
    let currentY = selection.y + selection.height - scaledFrameHeight / 2;

    let rowIndex = 0;

    while (currentY >= selection.y) {
      const row: Point[] = [];
      let currentX = startX;

      while (currentX <= endX) {
        row.push({ x: currentX, y: currentY });
        currentX += stepX;
      }

      if (rowIndex % 2 !== 0) {
        row.reverse();
      }

      points.push(...row);

      currentY -= stepY;
      rowIndex++;
    }

    console.warn("Generated recommended grid points:", points);
    return points;
  };

  const normalizeSelection = (sel: typeof selection) => {
    if (!sel) return null;

    const x = sel.width < 0 ? sel.x + sel.width : sel.x;
    const y = sel.height < 0 ? sel.y + sel.height : sel.y;

    const width = Math.abs(sel.width);
    const height = Math.abs(sel.height);

    return { x, y, width, height };
  };

  const [pointsOptimal, setPointsOptimal] = useState<Point[]>([]);

  useEffect(() => {
    if (!selection) {
      // setPointsRecommended([]);
      return;
    }

    const normalizedSelection = normalizeSelection(selection);
    if (!normalizedSelection) {
      // setPointsRecommended([]);
      return;
    }

    const points = generateRecommendedGridInSelection(normalizedSelection);
    setPointsRecommended(points);
  }, [
    selection,
    frameWidthPx,
    frameHeightPx,
    storyboardsData?.recommended?.step_x,
    storyboardsData?.recommended?.step_y,
  ]);

  useEffect(() => {
    if (isSelecting || pointsRecommended.length != framesUrlsRecommended.length)
      setIsNeedUpdateRecommended(true);
  }, [selection, framesUrlsRecommended.length]);

  // const pointsRecommended = useMemo(() => {
  //   if (!selection) return [];

  //   const normalizedSelection = normalizeSelection(selection);
  //   if (!normalizedSelection) return [];

  //   return generateRecommendedGridInSelection(normalizedSelection);
  // }, [
  //   selection,
  //   frameWidthPx,
  //   frameHeightPx,
  //   storyboardsData?.recommended?.step_x,
  //   storyboardsData?.recommended?.step_y,
  // ]);

  const isDisabledApplyButton = () => {
    if (isRecommended) {
      return !selection;
    } else if (isOptimal) {
      return !trajectoryData;
    }
  };

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
            <Box
              sx={{
                overflowY: "auto",
                pr: 1, // чтобы скролл не прилипал к контенту
              }}
              // flex={1}
              display="flex"
              flexDirection="column"
              gap={2}
            >
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
                  Размер кадра (ширина × высота)
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
                        value={
                          storyboardsData?.recommended?.step_x?.toFixed(2) || ""
                        }
                        onChange={(e) => {
                          setIsNeedUpdateRecommended(true);
                          setStoryboardsData((prev) => ({
                            ...prev,
                            recommended: {
                              ...prev.recommended,
                              step_x: Number(e.target.value),
                            },
                          }));
                        }}
                        variant="outlined" // variant для оформления (outlined, filled, etc.)
                        size="small" // Размер поля
                        sx={{ width: 120, textAlign: "right" }} // Стиль: задаём размер и выравнивание
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
                        value={
                          storyboardsData?.recommended?.step_y?.toFixed(2) || ""
                        }
                        onChange={(e) => {
                          setIsNeedUpdateRecommended(true);
                          setStoryboardsData((prev) => ({
                            ...prev,
                            recommended: {
                              ...prev.recommended,
                              step_y: Number(e.target.value),
                            },
                          }));
                        }}
                        variant="outlined" // variant для оформления (outlined, filled, etc.)
                        size="small" // Размер поля
                        sx={{ width: 120, textAlign: "right" }} // Стиль: задаём размер и выравнивание
                      />
                    </Box>

                    {/* Кнопки снизу */}
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      spacing={2}
                      alignItems="center"
                      mt={2}
                    >
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
                      <Tooltip
                        title={
                          isSelecting
                            ? "Отключить режим выделения"
                            : "Выбрать исследуемую область"
                        }
                      >
                        <span>
                          <ToggleButton
                            value="check"
                            selected={isSelecting}
                            onChange={() => {
                              setIsSelecting((prev) => !prev);

                              // setStoryboardsData((prev) => ({
                              //   ...prev,
                              //   recommended: {
                              //     ...prev.recommended,
                              //     applied: false,
                              //   },
                              // }));
                            }}
                          >
                            <HighlightAltIcon />
                          </ToggleButton>
                        </span>
                      </Tooltip>

                      {/* Кнопка сброса */}
                      {/* <Tooltip title="Очистить область">
                      <IconButton
                        color="error"
                        onClick={handleResetInterestArea}
                        disabled={!selection}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip> */}
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
                      {activeStoryboardData?.count_frames
                        ? `${activeStoryboardData.count_frames} шт.`
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
                      {activeStoryboardData?.disk_space
                        ? `${formatFileSize(activeStoryboardData.disk_space)}`
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
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        display="flex"
                        alignItems="center"
                      >
                        Время полёта
                        <HelpIconTooltip title="Время полёта от кадра к кадру с зависанием." />
                        {/* <Tooltip title="Время от кадра к кадру" arrow>
                        <HelpIcon fontSize="small" sx={{ cursor: "help" }} />
                      </Tooltip> */}
                      </Typography>
                    </Box>

                    <Typography variant="body2" fontWeight={500}>
                      {activeStoryboardData?.total_flight_time
                        ? `${activeStoryboardData.total_flight_time.toFixed(2)} с.`
                        : "—"}
                    </Typography>
                  </Box>
                </Stack>
              </Box>

              {/* ---------------- Параметры БПЛА ---------------- */}
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
                  Параметры БПЛА
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
                          bgcolor: "#009e2f",
                        }}
                      />
                      <Typography variant="body2" color="text.secondary">
                        Рабочая скорость
                      </Typography>
                    </Box>
                    <Typography variant="body2" fontWeight={500}>
                      {droneParams?.speed
                        ? `${droneParams.speed.toFixed(2)} м/с`
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
                          bgcolor: "#009e2f",
                        }}
                      />
                      <Typography variant="body2" color="text.secondary">
                        Время зависания
                      </Typography>
                    </Box>
                    <Typography variant="body2" fontWeight={500}>
                      {droneParams?.hoverTime
                        ? `${droneParams.hoverTime.toFixed(2)} с.`
                        : "—"}
                    </Typography>
                  </Box>
                </Stack>
              </Box>

              {!isSelecting && !selection && isRecommended && (
                <Alert
                  severity="info"
                  sx={{
                    fontSize: "0.7rem", // мелкий текст
                    borderRadius: 1,
                    p: 1.5, // паддинг
                    alignItems: "center",
                  }}
                >
                  Выберите область исследования и нажмите «Применить», чтобы
                  выполнить раскадровку.
                </Alert>
              )}

              {selection &&
                isRecommended &&
                needUpdateRecommended &&
                storyboardsData.recommended.applied && (
                  <Alert
                    severity="warning"
                    sx={{
                      fontSize: "0.7rem", // мелкий текст
                      borderRadius: 1,
                      p: 1.5, // паддинг
                      alignItems: "center",
                    }}
                  >
                    Нажмите «Применить» для обновления коллекции кадров.
                  </Alert>
                )}

              {isOptimal && !trajectoryData && (
                <Alert
                  severity="warning"
                  sx={{
                    fontSize: "0.7rem", // мелкий текст
                    borderRadius: 1,
                    p: 1.5, // паддинг
                    alignItems: "center",
                  }}
                >
                  Для раскадровки необходимо сначала выполнить оптимизацию
                  траектории.
                </Alert>
              )}
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
                disabled={isDisabledApplyButton()}
              >
                Применить
              </Button>

              {/* Кнопка сброса */}
              <Tooltip title="Очистить раскадровку">
                <IconButton
                  color="error"
                  onClick={handleResetInterestArea}
                  disabled={
                    (!selection && isRecommended) ||
                    (isPointBased && framesUrlsPointBased.length === 0) ||
                    (isOptimal && framesUrlsOptimal.length === 0)
                  }
                  component="span"
                >
                  <DeleteIcon />
                </IconButton>
              </Tooltip>
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
            pointsRecommended={pointsRecommended}
            pointsOptimal={pointsOptimal}
            obstacles={obstacles}
            trajectoryData={trajectoryData}
            frameWidthPx={frameWidthPx}
            frameHeightPx={frameHeightPx}
            showPoints={isPointBased}
            showObstacles={true}
            showTaxons={activeType == "optimal"}
            applyPointBasedStoryboard={
              (activeStoryboardData?.applied || false) && activeType == "point"
            }
            applyRecommendedStoryboard={
              (activeStoryboardData?.applied || false) && isRecommended
            }
            applyOptimalStoryboard={
              (activeStoryboardData?.applied || false) &&
              activeType == "optimal"
            }
            isSelecting={isSelecting}
            activeType={activeType}
            width_m={droneParams.frameWidthBase}
            height_m={droneParams.frameHeightBase}
            selection={selection}
            setSelection={setSelection}
          />

          <StoryboardTimeline frames={getFrames()} />
        </Box>
      </Box>
    </Box>
  );
};

export default StoryboardEditor;
