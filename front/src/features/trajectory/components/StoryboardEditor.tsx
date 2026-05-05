import { FC, useState, JSX, useEffect, useMemo, useRef } from "react";
import {
  Box,
  Typography,
  Button,
  IconButton,
  Stack,
  CircularProgress,
  ToggleButton,
  Alert,
  Tooltip,
} from "@mui/material";
import {
  Rect
} from "react-konva";

import CircleIcon from "@mui/icons-material/Circle";
import RecommendIcon from "@mui/icons-material/Recommend";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import DeleteIcon from "@mui/icons-material/Delete";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import HighlightAltIcon from "@mui/icons-material/HighlightAlt";
import DownloadIcon from "@mui/icons-material/Download";

import StoryboardTimeline from "../../storyboard/components/StoryboardTimeline";
import { DroneParams } from "../../../types/uav.types";
import { Storyboards } from "../../../types/storyboards.types";
import useImage from "use-image";
import { ImageData, Point } from "../../../types/scene.types";
import Konva from "konva";

import useNotifications from "../../../hooks/useNotifications/useNotifications";
import { HelpIconTooltip } from "../../../components/ui/HelpIconTooltip";
import { trajectoryApi } from "../../../api/trajectory.api";
import { FloatInput } from "../../../components/ui/FloatInput";
import { SceneStoryboardStage } from "./SceneStoryboardStage";
import { downloadStoryboard } from "../utils/SceneStoryboardExport";

interface StoryboardEditorProps {
  onClose: () => void;
  imageData: ImageData;
  points: any[];
  obstacles: any[];
  trajectoryData?: any;
  trajectoryData2?: any;
  trajectoryData3?: any;
  droneParams: DroneParams;
  storyboardsData: Storyboards;
  setStoryboardsData: React.Dispatch<React.SetStateAction<Storyboards>>;
  framesUrlsPointBased: string[];
  setFramesUrlsPointBased: React.Dispatch<React.SetStateAction<string[]>>;
  framesUrlsRecommended: string[];
  setFramesUrlsRecommended: React.Dispatch<React.SetStateAction<string[]>>;
  framesUrlsOptimal: string[];
  setFramesUrlsOptimal: React.Dispatch<React.SetStateAction<string[]>>;
  framesUrlsOptimal2: string[];
  setFramesUrlsOptimal2: React.Dispatch<React.SetStateAction<string[]>>;
  framesUrlsOptimal3: string[];
  setFramesUrlsOptimal3: React.Dispatch<React.SetStateAction<string[]>>;
  pointsRecommended: Point[];
  setPointsRecommended: React.Dispatch<React.SetStateAction<Point[]>>;
  selection: any;
  setSelection: React.Dispatch<React.SetStateAction<any>>;
  flightLineY: number;
}

type StoryboardType =
  | "point"
  | "recommended"
  | "optimal"
  | "optimal_big_density"
  | "optimal_combi";

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
    label: "Оптимальная (НПТ)",
    icon: <AutoAwesomeIcon fontSize="small" />,
    description:
      "Строится на основе направления оптимальной траектории полёта по методу низкой плотности точек.",
  },
  optimal_big_density: {
    label: "Оптимальная (ВПТ)",
    icon: <AutoAwesomeIcon fontSize="small" />,
    description:
      "Строится на основе направления оптимальной траектории полёта по методу высокой плотности точек.",
  },
  optimal_combi: {
    label: "Оптимальная (СПТ)",
    icon: <AutoAwesomeIcon fontSize="small" />,
    description:
      "Строится на основе направления оптимальной траектории полёта по методу смешанной плотности точек.",
  },
};

const cropFrameKonva = (
  image: HTMLImageElement,
  centerX: number,
  centerY: number,
  frameWidth: number,
  frameHeight: number
): Promise<Blob> => {
  return new Promise((resolve) => {
    const stage = new Konva.Stage({
      width: frameWidth,
      height: frameHeight,
      container: document.createElement("div"),
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

    stage.toCanvas().toBlob((blob: any) => {
      if (blob) resolve(blob);
    }, "image/jpeg");
  });
};

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
};

// Вспомогательные функции для устранения дублирования

/** Конвертирует пиксельные координаты в метровые (инвертирует Y) */
const convertPointsToMeters = (
  points: Point[],
  imageData: ImageData,
  metersToPxWidth: number,
  metersToPxHeight: number
): number[][] => {
  return points.map((p) => {
    const xMeters = p.x / metersToPxWidth;
    const yMeters = (imageData.height - p.y) / metersToPxHeight;
    return [xMeters, yMeters];
  });
};

/** Вычисляет сумму времени полёта для всех сегментов оптимальной траектории */
const calculateOptimalFlightTime = async (
  trajectoryData: any,
  droneParams: DroneParams
): Promise<number> => {
  const flightTimes = await Promise.all(
    trajectoryData.B.map((bItem: any) => {
      const pointsArray = bItem.points.map((p: any) => [p[0], p[1]]);
      return trajectoryApi.getFlightTime(
        pointsArray,
        droneParams.speed,
        droneParams.hoverTime
      );
    })
  );

  return flightTimes.reduce(
    (sum, result) => sum + (result?.flight_time_sec ?? 0),
    0
  );
};

const STAGE_WIDTH = 1000;
const STAGE_HEIGHT = 600;

const StoryboardEditor: FC<StoryboardEditorProps> = ({
  onClose,
  imageData,
  points,
  obstacles,
  trajectoryData,
  trajectoryData2,
  trajectoryData3,
  droneParams,
  storyboardsData,
  setStoryboardsData,
  framesUrlsPointBased,
  setFramesUrlsPointBased,
  framesUrlsRecommended,
  setFramesUrlsRecommended,
  framesUrlsOptimal,
  setFramesUrlsOptimal,
  framesUrlsOptimal2,
  setFramesUrlsOptimal2,
  framesUrlsOptimal3,
  setFramesUrlsOptimal3,
  pointsRecommended,
  setPointsRecommended,
  selection,
  setSelection,
  flightLineY
}) => {
  const notifications = useNotifications();

  const [activeType, setActiveType] = useState<StoryboardType | null>("point");
  const [loading, setLoading] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);
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
  const isOptimal1Method = activeType === "optimal";
  const isOptimal2Method = activeType === "optimal_big_density";
  const isOptimal3Method = activeType === "optimal_combi";
  const isPointBased = activeType === "point";

  const activeStoryboardData = activeType
    ? storyboardsData?.[activeType]
    : null;

  const [img] = useImage(imageData.imageUrl);
  const [stepXInput, setStepXInput] = useState("");
  const [stepYInput, setStepYInput] = useState("");

  const stageRef = useRef<any>(null);

  // const [scale] = useState(1);
  // const [position] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const scaleToFit = img
    ? Math.min(
      1,
      (STAGE_WIDTH / img.width) * 0.9,
      (STAGE_HEIGHT / img.height) * 0.9,
    )
    : 1;

  const imageX = img ? (STAGE_WIDTH - img.width * scaleToFit) / 2 : 0;
  const imageY = img ? (STAGE_HEIGHT - img.height * scaleToFit) / 2 : 0;

  const GRID_COLS = droneParams.frameWidthBase / droneParams.frameWidthPlanned;
  const GRID_ROWS =
    droneParams.frameHeightBase / droneParams.frameHeightPlanned;

  const width_m = droneParams.frameWidthBase;
  const height_m = droneParams.frameHeightBase;

  const [isClickSelecting, setIsClickSelecting] = useState(false);

  const handleMouseDown = (e: any) => {
    if (!isSelecting || activeType != "recommended") return;

    const stage = e.target.getStage();
    const pointer = stage.getRelativePointerPosition();

    if (!pointer) return;

    const imageXCoord = (pointer.x - imageX) / scaleToFit;
    const imageYCoord = (pointer.y - imageY) / scaleToFit;

    setIsClickSelecting(true);
    setSelection({
      x: imageXCoord,
      y: imageYCoord,
      width: 0,
      height: 0,
    });
  };

  const handleMouseMove = (e: any) => {
    if (!isSelecting) return;

    if (!isClickSelecting || !selection) return;

    const stage = e.target.getStage();
    const pointer = stage.getRelativePointerPosition();

    if (!pointer) return;

    const imageXCoord = (pointer.x - imageX) / scaleToFit;
    const imageYCoord = (pointer.y - imageY) / scaleToFit;

    setSelection({
      ...selection,
      width: imageXCoord - selection.x,
      height: imageYCoord - selection.y,
    });
  };

  const handleMouseUp = () => {
    if (!isSelecting) return;

    setIsClickSelecting(false);
  };

  const handleDragMove = (e: any) => {
    const stage = e.target;
    setPosition({
      x: stage.x(),
      y: stage.y(),
    });
  };


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

  const gridLines = useMemo(() => {
    if (!img) return null;

    const lines: JSX.Element[] = [];
    const imgWidth = img.width * scaleToFit;
    const imgHeight = img.height * scaleToFit;

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
  }, [img, GRID_COLS, GRID_ROWS, imageX, imageY, scaleToFit]);

  useEffect(() => {
    if (storyboardsData?.recommended?.step_x) {
      setStepXInput(storyboardsData.recommended.step_x.toFixed(2));
    }
  }, [storyboardsData?.recommended?.step_x]);

  useEffect(() => {
    if (storyboardsData?.recommended?.step_y) {
      setStepYInput(storyboardsData.recommended.step_y.toFixed(2));
    }
  }, [storyboardsData?.recommended?.step_y]);

  //  Универсальные функции экстракции кадров 

  /** Общая функция нарезки кадров для точечной и рекомендуемой раскадровки */
  const extractFramesGeneric = async (
    pts: Point[],
    storyboardKey: StoryboardType,
    setFramesUrls: (urls: string[]) => void
  ): Promise<string[]> => {
    if (!img) return [];

    const blobs = await Promise.all(
      pts.map((p) => cropFrameKonva(img, p.x, p.y, frameWidthPx, frameHeightPx))
    );

    const totalBytes = blobs.reduce((sum, b) => sum + b.size, 0);

    setStoryboardsData((prev) => ({
      ...prev,
      [storyboardKey]: {
        ...prev[storyboardKey],
        disk_space: totalBytes,
        count_frames: blobs.length,
      },
    }));

    const urls = blobs.map((b) => URL.createObjectURL(b));
    setFramesUrls(urls);
    return urls;
  };

  /** Универсальная функция нарезки кадров для всех оптимальных методов */
  const extractOptimalFramesGeneric = async (
    trajectory: any,
    storyboardKey: StoryboardType,
    setFramesUrls: (urls: string[]) => void
  ): Promise<void> => {
    if (!img || !trajectory) return;

    const pointsFromB = trajectory.B.flatMap((bItem: any) =>
      bItem.points.map((point: any) => ({
        x: point[0] * metersToPxWidth,
        y: imageData.height - point[1] * metersToPxHeight,
      }))
    );

    const blobs = await Promise.all(
      pointsFromB.map((p: any) =>
        cropFrameKonva(img, p.x, p.y, frameWidthPx, frameHeightPx)
      )
    );

    const totalBytes = blobs.reduce((sum, b) => sum + b.size, 0);

    setStoryboardsData((prev) => ({
      ...prev,
      [storyboardKey]: {
        ...prev[storyboardKey],
        disk_space: totalBytes,
        count_frames: blobs.length,
      },
    }));

    const urls = blobs.map((b) => URL.createObjectURL(b));
    setFramesUrls(urls);
  };

  /** Сброс состояния раскадровки для любого типа */
  const resetStoryboard = (
    storyboardKey: StoryboardType,
    framesUrls: string[],
    setFramesUrls: (urls: string[]) => void,
    extraReset?: () => void
  ) => {
    framesUrls.forEach((u) => URL.revokeObjectURL(u));
    setFramesUrls([]);

    setStoryboardsData((prev) => ({
      ...prev,
      [storyboardKey]: {
        ...prev[storyboardKey],
        applied: false,
        count_frames: null,
        disk_space: null,
        total_flight_time: null,
      },
    }));

    extraReset?.();
  };

  //  Основные обработчики 

  const toggleType = (type: StoryboardType) => {
    setActiveType(type);
  };

const yieldToBrowser = (): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, 0));

  const handleApply = async () => {
    setLoading(true);

    await yieldToBrowser();
    try {
      // Точечная раскадровка
      if (isPointBased) {
        framesUrlsPointBased.forEach((u) => URL.revokeObjectURL(u));
        setFramesUrlsPointBased([]);

        await extractFramesGeneric(points, "point", setFramesUrlsPointBased);

        const pointsArray = convertPointsToMeters(
          points,
          imageData,
          metersToPxWidth,
          metersToPxHeight
        );

        const flightTime = await trajectoryApi.getFlightTime(
          pointsArray,
          droneParams.speed,
          droneParams.hoverTime
        );

        setStoryboardsData((prev) => ({
          ...prev,
          point: {
            ...prev.point,
            applied: true,
            total_flight_time: flightTime ? flightTime.flight_time_sec : null,
          },
        }));
      }
      // Рекомендуемая раскадровка
      else if (isRecommended) {
        framesUrlsRecommended.forEach((u) => URL.revokeObjectURL(u));
        setFramesUrlsRecommended([]);
        setIsSelecting(false);

        if (pointsRecommended.length === 0) {
          notifications.show(
            "Кадры сформировать не удалось. Укажите область большего размера.",
            { severity: "error", autoHideDuration: 5000 }
          );
          return;
        }

        await extractFramesGeneric(
          pointsRecommended,
          "recommended",
          setFramesUrlsRecommended
        );

        const pointsArray = convertPointsToMeters(
          pointsRecommended,
          imageData,
          metersToPxWidth,
          metersToPxHeight
        );

        const flightTime = await trajectoryApi.getFlightTime(
          pointsArray,
          droneParams.speed,
          droneParams.hoverTime
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
      }
      // Оптимальные методы — через карту конфигураций
      else {
        const optimalConfigs = [
          {
            check: isOptimal1Method,
            trajectoryData,
            storyboardKey: "optimal" as StoryboardType,
            setFramesUrls: setFramesUrlsOptimal,
            framesUrls: framesUrlsOptimal,
            setFramesUrlsClean: setFramesUrlsOptimal,
          },
          {
            check: isOptimal2Method,
            trajectoryData: trajectoryData2,
            storyboardKey: "optimal_big_density" as StoryboardType,
            setFramesUrls: setFramesUrlsOptimal2,
            framesUrls: framesUrlsOptimal2,
            setFramesUrlsClean: setFramesUrlsOptimal2,
          },
          {
            check: isOptimal3Method,
            trajectoryData: trajectoryData3,
            storyboardKey: "optimal_combi" as StoryboardType,
            setFramesUrls: setFramesUrlsOptimal3,
            framesUrls: framesUrlsOptimal3,
            setFramesUrlsClean: setFramesUrlsOptimal3,
          },
        ];

        const config = optimalConfigs.find((c) => c.check);
        if (config) {
          config.framesUrls.forEach((u: string) => URL.revokeObjectURL(u));
          config.setFramesUrlsClean([]);

          await extractOptimalFramesGeneric(
            config.trajectoryData,
            config.storyboardKey,
            config.setFramesUrls
          );

          const totalFlightTime = await calculateOptimalFlightTime(
            config.trajectoryData,
            droneParams
          );

          setStoryboardsData((prev) => ({
            ...prev,
            [config.storyboardKey]: {
              ...prev[config.storyboardKey],
              applied: true,
              total_flight_time: totalFlightTime > 0 ? totalFlightTime : null,
            },
          }));
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const frames = useMemo(() => {
    if (!activeStoryboardData?.applied) return [];

    const conditions = [
      { check: isPointBased, frames: framesUrlsPointBased },
      { check: isRecommended, frames: framesUrlsRecommended },
      { check: isOptimal1Method, frames: framesUrlsOptimal },
      { check: isOptimal2Method, frames: framesUrlsOptimal2 },
      { check: isOptimal3Method, frames: framesUrlsOptimal3 },
    ];

    return conditions.find((c) => c.check)?.frames ?? [];
  }, [
    activeStoryboardData?.applied,
    isPointBased,
    isRecommended,
    isOptimal1Method,
    isOptimal2Method,
    isOptimal3Method,
    framesUrlsPointBased,
    framesUrlsRecommended,
    framesUrlsOptimal,
    framesUrlsOptimal2,
    framesUrlsOptimal3,
  ]);

  const handleResetInterestArea = () => {
    const resetConfigs = [
      {
        check: isPointBased,
        framesUrls: framesUrlsPointBased,
        setFramesUrls: setFramesUrlsPointBased,
        storyboardKey: "point" as StoryboardType,
      },
      {
        check: isRecommended,
        framesUrls: framesUrlsRecommended,
        setFramesUrls: setFramesUrlsRecommended,
        storyboardKey: "recommended" as StoryboardType,
        extraReset: () => setSelection(null),
      },
      {
        check: isOptimal1Method,
        framesUrls: framesUrlsOptimal,
        setFramesUrls: setFramesUrlsOptimal,
        storyboardKey: "optimal" as StoryboardType,
      },
      {
        check: isOptimal2Method,
        framesUrls: framesUrlsOptimal2,
        setFramesUrls: setFramesUrlsOptimal2,
        storyboardKey: "optimal_big_density" as StoryboardType,
      },
      {
        check: isOptimal3Method,
        framesUrls: framesUrlsOptimal3,
        setFramesUrls: setFramesUrlsOptimal3,
        storyboardKey: "optimal_combi" as StoryboardType,
      },
    ];

    const config = resetConfigs.find((c) => c.check);
    if (config) {

      // Здесь задать вопрос?
      resetStoryboard(
        config.storyboardKey,
        config.framesUrls,
        config.setFramesUrls,
        config.extraReset
      );
    }
  };

  //  Вспомогательные функции для рекомендуемой раскадровки 

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

      if (rowIndex % 2 !== 0) row.reverse();
      points.push(...row);
      currentY -= stepY;
      rowIndex++;
    }

    return points;
  };

  const normalizeSelection = (sel: typeof selection) => {
    if (!sel) return null;
    return {
      x: sel.width < 0 ? sel.x + sel.width : sel.x,
      y: sel.height < 0 ? sel.y + sel.height : sel.y,
      width: Math.abs(sel.width),
      height: Math.abs(sel.height),
    };
  };

  //  Эффекты 

  useEffect(() => {
    if (!selection) return;
    const normalized = normalizeSelection(selection);
    if (!normalized) return;
    const pts = generateRecommendedGridInSelection(normalized);
    setPointsRecommended(pts);
  }, [
    selection,
    frameWidthPx,
    frameHeightPx,
    storyboardsData?.recommended?.step_x,
    storyboardsData?.recommended?.step_y,
  ]);

  useEffect(() => {
    if (isSelecting || pointsRecommended.length !== framesUrlsRecommended.length) {
      setIsNeedUpdateRecommended(true);
    }
  }, [selection, framesUrlsRecommended.length]);

  const isDisabledApplyButton = () => {
    if (isPointBased) return points.length === 0;
    if (isRecommended) return !selection;
    if (isOptimal1Method) return !trajectoryData || trajectoryData.B.length === 0;
    if (isOptimal2Method) return !trajectoryData2 || trajectoryData2.B.length === 0;
    if (isOptimal3Method) return !trajectoryData3 || trajectoryData3.B.length === 0;
    return true;
  };

  const activeTrajectoryData = useMemo(() => {
    if (isOptimal1Method) return trajectoryData;
    if (isOptimal2Method) return trajectoryData2;
    if (isOptimal3Method) return trajectoryData3;
    return null;
  }, [isOptimal1Method, isOptimal2Method, isOptimal3Method, trajectoryData, trajectoryData2, trajectoryData3]);

  // Инициализация значений шагов по умолчанию
  useEffect(() => {
    setStoryboardsData((prev) => ({
      ...prev,
      recommended: {
        ...prev.recommended,
        step_x: prev.recommended?.step_x || droneParams.frameWidthPlanned,
        step_y: prev.recommended?.step_y || droneParams.frameHeightPlanned,
      },
    }));
  }, []);

  const handleDownload = async () => {
    if (!img) return;

    // Определяем активную траекторию
    const activeTrajectoryData = isOptimal1Method
      ? trajectoryData
      : isOptimal2Method
        ? trajectoryData2
        : isOptimal3Method
          ? trajectoryData3
          : null;

    await downloadStoryboard(
      {
        image: img,
        width_m: droneParams.frameWidthBase,
        height_m: droneParams.frameHeightBase,
        GRID_COLS: droneParams.frameWidthBase / droneParams.frameWidthPlanned,
        GRID_ROWS: droneParams.frameHeightBase / droneParams.frameHeightPlanned,
        points,
        pointsRecommended,
        obstacles,
        trajectoryData: activeTrajectoryData,
        frameWidthPx,
        frameHeightPx,
        showGrid: true,
        showObstacles: true,
        showPoints: isPointBased,
        showRecommended: isRecommended,
        showOptimal: isOptimal1Method || isOptimal2Method || isOptimal3Method,
        showUAVLine: isOptimal1Method || isOptimal2Method || isOptimal3Method,
        flightLineY: flightLineY,
        applyOptimal: activeStoryboardData?.applied || false,
        setLoading,
      },
      `storyboard_${activeType}_${Date.now()}.jpeg`,
      0.5,
    );
  };

  //  Рендер 

  return (
    <Box display="flex" flexDirection="column" height="100%" width="100%">
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
            backgroundColor: "rgba(255, 255, 255, 0.7)",
            zIndex: 9999,
            flexDirection: "column",
          }}
        >
          <CircularProgress />
          <Typography
            variant="h6"
            sx={{ mt: 2, color: "#014488ff", fontWeight: 500 }}
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
        <Box display="flex" alignItems="center" gap={1}>

          <IconButton size="small" onClick={onClose}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" fontWeight="medium">
            Редактор раскадровки
          </Typography>
        </Box>

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
                  color: isActive ? "primary.dark" : "text.primary",
                  borderRadius: 2,
                  py: 1,
                  px: 0.5,
                  "&:hover": {
                    color: isActive ? "primary.dark" : "text.primary",
                    bgcolor: isActive
                      ? "transparent"
                      : "rgba(0, 78, 158, 0.08)",
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
              sx={{ overflowY: "auto", pr: 1 }}
              display="flex"
              flexDirection="column"
              gap={2}
            >
              {/* Размер кадра */}
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

              {/* Параметры рекомендуемой раскадровки */}
              {isRecommended && (
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
                      <FloatInput
                        value={
                          storyboardsData?.recommended?.step_x ??
                          droneParams.frameWidthPlanned
                        }
                        onChange={(val) => {
                          setIsNeedUpdateRecommended(true);
                          setStoryboardsData((prev) => ({
                            ...prev,
                            recommended: {
                              ...prev.recommended,
                              step_x: val,
                            },
                          }));
                        }}
                        min={0.1}
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
                      <FloatInput
                        value={
                          storyboardsData?.recommended?.step_y ??
                          droneParams.frameHeightPlanned
                        }
                        onChange={(val) => {
                          setIsNeedUpdateRecommended(true);
                          setStoryboardsData((prev) => ({
                            ...prev,
                            recommended: {
                              ...prev.recommended,
                              step_y: val,
                            },
                          }));
                        }}
                        min={0.1}
                      />
                    </Box>

                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      spacing={2}
                      alignItems="center"
                      mt={2}
                    >
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
                            onChange={() => setIsSelecting((prev) => !prev)}
                          >
                            <HighlightAltIcon />
                          </ToggleButton>
                        </span>
                      </Tooltip>
                    </Stack>

                    {isSelecting && (
                      <Alert
                        severity="info"
                        sx={{
                          mt: 3,
                          fontSize: "0.7rem",
                          borderRadius: 1,
                          p: 1.5,
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

              {/* Информационные предупреждения */}
              {!isSelecting && !selection && isRecommended && (
                <Alert
                  severity="info"
                  sx={{
                    fontSize: "0.7rem",
                    borderRadius: 1,
                    p: 1.5,
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
                      fontSize: "0.7rem",
                      borderRadius: 1,
                      p: 1.5,
                      alignItems: "center",
                    }}
                  >
                    Нажмите «Применить» для обновления коллекции кадров.
                  </Alert>
                )}

              {/* Свойства раскадровки */}
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
                  {[
                    {
                      label: "Количество кадров",
                      value: activeStoryboardData?.count_frames
                        ? `${activeStoryboardData.count_frames} шт.`
                        : "—",
                    },
                    {
                      label: "Объём памяти",
                      value: activeStoryboardData?.disk_space
                        ? formatFileSize(activeStoryboardData.disk_space)
                        : "—",
                    },
                    {
                      label: "Время полёта",
                      value: activeStoryboardData?.total_flight_time
                        ? `${activeStoryboardData.total_flight_time.toFixed(2)} с.`
                        : "—",
                      tooltip:
                        "Время полёта от кадра к кадру с зависанием без учёта погоды.",
                    },
                  ].map((item) => (
                    <Box
                      key={item.label}
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
                          {item.label}
                          {item.tooltip && (
                            <HelpIconTooltip title={item.tooltip} />
                          )}
                        </Typography>
                      </Box>
                      <Typography variant="body2" fontWeight={500}>
                        {item.value}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              </Box>

              {/* Параметры БПЛА и съёмки */}
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
                  Параметры БПЛА и съёмки
                </Typography>
                <Stack spacing={1.5} mt={1}>
                  {[
                    {
                      label: "Рабочая скорость",
                      value: droneParams?.speed
                        ? `${droneParams.speed.toFixed(2)} м/с`
                        : "—",
                    },
                    {
                      label: "Время зависания",
                      value: droneParams?.hoverTime
                        ? `${droneParams.hoverTime.toFixed(2)} с.`
                        : "—",
                    },
                    {
                      label: "Расстояние съёмки",
                      value: droneParams?.plannedDistance
                        ? `${droneParams.plannedDistance.toFixed(2)} м`
                        : "—",
                    },
                  ].map((item) => (
                    <Box
                      key={item.label}
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
                          {item.label}
                        </Typography>
                      </Box>
                      <Typography variant="body2" fontWeight={500}>
                        {item.value}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              </Box>

              {/* Предупреждения для оптимальных методов */}
              {isOptimal1Method && !trajectoryData && (
                <Alert
                  severity="warning"
                  sx={{
                    fontSize: "0.7rem",
                    borderRadius: 1,
                    p: 1.5,
                    alignItems: "center",
                  }}
                >
                  Для раскадровки необходимо сначала выполнить оптимизацию
                  траектории.
                </Alert>
              )}
              {isOptimal2Method && !trajectoryData2 && (
                <Alert
                  severity="warning"
                  sx={{
                    fontSize: "0.7rem",
                    borderRadius: 1,
                    p: 1.5,
                    alignItems: "center",
                  }}
                >
                  Для раскадровки необходимо сначала выполнить оптимизацию
                  траектории.
                </Alert>
              )}
              {isOptimal3Method && !trajectoryData3 && (
                <Alert
                  severity="warning"
                  sx={{
                    fontSize: "0.7rem",
                    borderRadius: 1,
                    p: 1.5,
                    alignItems: "center",
                  }}
                >
                  Для раскадровки необходимо сначала выполнить оптимизацию
                  траектории.
                </Alert>
              )}
            </Box>

            {/* Кнопки действий */}
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
            >
              <Button
                size="small"
                variant="contained"
                onClick={handleApply}
                disabled={isDisabledApplyButton()}
              >
                Применить
              </Button>
              <Tooltip title="Очистить раскадровку">
                <IconButton
                  color="error"
                  onClick={handleResetInterestArea}
                  disabled={
                    (!selection && isRecommended) ||
                    (isPointBased && framesUrlsPointBased.length === 0) ||
                    (isOptimal1Method && framesUrlsOptimal.length === 0) ||
                    (isOptimal2Method && framesUrlsOptimal2.length === 0) ||
                    (isOptimal3Method && framesUrlsOptimal3.length === 0)
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
          overflow="hidden"
        >
          <Box
            flex={1}
            overflow="auto"
            display="flex"
            alignItems="center"
            justifyContent="center"
            pt={2}
          >
            <SceneStoryboardStage
              stageRef={stageRef}
              STAGE_WIDTH={STAGE_WIDTH}
              STAGE_HEIGHT={STAGE_HEIGHT}
              scale={scale}
              position={position}
              image={img}
              imageX={imageX}
              imageY={imageY}
              scaleToFit={scaleToFit}
              gridLines={gridLines}
              points={points}
              pointsRecommended={pointsRecommended}
              obstacles={obstacles}
              trajectoryData={activeTrajectoryData} // или нужный из трёх
              showPoints={isPointBased}
              showObstacles={true}
              showTaxons={isOptimal1Method || isOptimal2Method || isOptimal3Method}
              frameWidthPx={frameWidthPx}
              frameHeightPx={frameHeightPx}
              applyPointBasedStoryboard={activeStoryboardData?.applied && activeType === "point"}
              applyRecommendedStoryboard={activeStoryboardData?.applied && isRecommended}
              applyOptimalStoryboard={activeStoryboardData?.applied && (isOptimal1Method || isOptimal2Method || isOptimal3Method)}
              droneParams={droneParams}
              isSelecting={isSelecting}
              selection={selection}
              pxPerMeterX={(img?.width || 1) / width_m}
              pxPerMeterY={(img?.height || 1) / height_m}
              handleDragMove={handleDragMove}
              handleWheel={handleWheel}
              handleMouseDown={handleMouseDown}
              handleMouseMove={handleMouseMove}
              handleMouseUp={handleMouseUp}
              handleClick={() => { }}
              showUavLine={isOptimal1Method || isOptimal2Method || isOptimal3Method}
              flightLineY={flightLineY}
            />
          </Box>
          <Box flexShrink={0}>
            <StoryboardTimeline frames={frames} />
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default StoryboardEditor;