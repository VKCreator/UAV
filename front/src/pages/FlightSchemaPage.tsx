// src/components/FlightSchemaPage.tsx
import * as React from "react";
import {
  Box,
  Stack,
  Tabs,
  Tab,
  Typography,
  Divider,
  Paper,
  Grid,
  Chip,
  Card,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Checkbox,
  ToggleButton
} from "@mui/material";
import { IconButton, Tooltip } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import DownloadIcon from '@mui/icons-material/Download';
import GridOnIcon from '@mui/icons-material/GridOn';
import PageContainer from "../components/layout/PageContainer";
import { ExifData } from "../types/common.types";
import { DroneParams, Weather } from "../types/uav.types";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { Point, Polygon } from "../types/scene.types";
import { Opt1TrajectoryData } from "../types/optTrajectory.types";
import SceneViewer from "../features/storyboard/components/SceneStoryboardViewer";
import { Storyboards } from "../types/storyboards.types";
import { HelpIconTooltip } from "../components/ui/HelpIconTooltip";
import StoryboardTimeline from "../features/storyboard/components/StoryboardTimeline";

import ChangeHistoryIcon from '@mui/icons-material/ChangeHistory';

import { DateToPrettyLocalDateTime } from "../utils/dateUtils";

import ScenePreview from "../features/trajectory/components/ScenePreview";
import useImage from "use-image";
import { getMethodFullRussianFromEnglish } from "../utils/optNames";
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { downloadScene } from "../features/trajectory/utils/exportSceneImage";
import { trajectoryApi } from "../api/trajectory.api";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";

// ─── Вспомогательные компоненты ──────────────────────────────────────────────

function Placeholder({ label }: { label: string }) {
  return (
    <Box
      sx={{
        // border: "1px dashed",
        // borderColor: "divider",
        // borderRadius: 1,
        height: "100%",
        minHeight: 160,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "text.secondary",
        fontSize: 14,
      }}
    >
      {label}
    </Box>
  );
}

/** Карточка-метрика: подпись + крупное значение */
function MetricCard({
  label,
  value,
  tooltip,
}: {
  label: string;
  value: React.ReactNode;
  tooltip?: string;
}) {
  return (
    <Card
      variant="outlined"
      sx={{ p: 2, height: "100%", backgroundColor: "transparent" }}
    >
      <Typography
        variant="body2"
        color="text.secondary"
        display="flex"
        alignItems="center"
        gap={0.5}
        gutterBottom
      >
        {label}
        {tooltip && <HelpIconTooltip title={tooltip} />}
      </Typography>
      <Typography variant="h6" fontWeight={600} component="div">
        {value}
      </Typography>
    </Card>
  );
}

/** Строка «label — value» для погодной панели */
function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Box display="flex" justifyContent="space-between" alignItems="center">
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2" fontWeight={500} component="div">
        {value}
      </Typography>
    </Box>
  );
}

// ─── Утилиты ─────────────────────────────────────────────────────────────────

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
};

const formatTime = (sec: number | null | undefined): string => {
  if (sec == null) return "—";
  if (sec < 60) return `${sec.toFixed(1)} с`;
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m} мин ${s} с`;
};

const getWindDirectionLabel = (deg: number) => {
  const dirs = [
    "Север",
    "Северо-восток",
    "Восток",
    "Юго-восток",
    "Юг",
    "Юго-запад",
    "Запад",
    "Северо-запад",
  ];
  return dirs[Math.round(deg / 45) % 8];
};

const renderValue = (value: any, suffix?: string) => {
  if (value === null || value === undefined || value === "") return "—";
  return suffix ? `${value} ${suffix}` : value;
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  imageData: any;
  exifData: ExifData[];
  onClose: () => void;

  droneParams: DroneParams;
  weatherConditions: Weather;

  points: Point[];
  obstacles: Polygon[];

  // Данные оптимизации
  trajectoryData: Opt1TrajectoryData | null;
  trajectoryData2: Opt1TrajectoryData | null;
  trajectoryData3: Opt1TrajectoryData | null;

  pointsRecommended?: Point[];
  pointsOptimal?: Point[];
  pointsOptimal2?: Point[];
  pointsOptimal3?: Point[];

  frameWidthPx: number;
  frameHeightPx: number;

  storyboardsData: Storyboards; // Предполагаем, что включает optimal_big_density и optimal_combi
  priorityMethod: string | null; // Добавлено для чипа

  framesUrlsPointBased?: string[];
  framesUrlsRecommended?: string[];
  framesUrlsOptimal?: string[];
  framesUrlsOptimal2?: string[];
  framesUrlsOptimal3?: string[];

  flightLineY?: number;
  schemaName: string;
  createdAt: string;
  author: any;
}

// ─── Компонент ───────────────────────────────────────────────────────────────

const FlightSchemaPage: React.FC<Props> = ({
  imageData,
  exifData,
  onClose,
  droneParams,
  weatherConditions,
  points,
  obstacles,
  trajectoryData,
  trajectoryData2,
  trajectoryData3,
  pointsRecommended,
  pointsOptimal,
  pointsOptimal2,
  pointsOptimal3,
  frameWidthPx,
  frameHeightPx,
  storyboardsData,
  priorityMethod,
  framesUrlsPointBased,
  framesUrlsRecommended,
  framesUrlsOptimal,
  framesUrlsOptimal2,
  framesUrlsOptimal3,
  flightLineY,
  schemaName,
  createdAt,
  author,
}) => {
  const [userTrajectoryTab, setUserTrajectoryTab] = React.useState(0);
  const [optimizationTab, setOptimizationTab] = React.useState(0);
  const [storyboardTab, setStoryboardTab] = React.useState(0);
  const [droneTab, setDroneTab] = React.useState(0);
  const [comparisonTab, setComparisonTab] = React.useState(0);

  const hasExifData = exifData && exifData.length > 0;

  const containerRef = React.useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = React.useState({ width: 550, height: 400 });
  const containerOptimizationRef = React.useRef<HTMLDivElement>(null);
  const [containerOptSize, setContainerOptSize] = React.useState({ width: 550, height: 400 });

  const containerLayerRef = React.useRef<HTMLDivElement>(null);
  const [containerLayerSize, setContainerLayerSize] = React.useState({ width: 550, height: 350 });

  const [showNavTriangles, setShowNavTriangles] = React.useState(false);

  // Размеры для превью (как указано в условии)
  const PREVIEW_WIDTH = containerSize.width;
  const PREVIEW_HEIGHT = containerSize.height;

  const PREVIEW_OPT_WIDTH = containerOptSize.width;
  const PREVIEW_OPT_HEIGHT = containerOptSize.height;

  const PREVIEW_LAYER_WIDTH = containerLayerSize.width;
  const PREVIEW_LAYER_HEIGHT = containerLayerSize.height;

  // Функция для безопасной проверки наличия данных оптимизации
  const hasValidOptimizationData = (data: Opt1TrajectoryData | null): boolean => {
    return !!(data && data.B && Array.isArray(data.B) && data.B.length > 0);
  };

  // ── Хелпер для выбора данных оптимизации ────────────────────────────────
  const getOptimizationData = (tab: number): Opt1TrajectoryData | null => {
    if (tab === 0) return trajectoryData;
    if (tab === 1) return trajectoryData2;
    if (tab === 2) return trajectoryData3;
    return null;
  };

  const currentOptimizationData = getOptimizationData(optimizationTab);
  const comparisonData = getOptimizationData(comparisonTab);


  // ── Хелпер для маппинга кода метода в индекс ─────────────────────────────
  const getMethodIndex = (method: string): number => {
    if (method === "METHOD_1" || method === "low-d") return 0;
    if (method === "METHOD_2" || method === "high-d") return 1;
    if (method === "METHOD_3" || method === "mixed-d") return 2;
    return 0; // По умолчанию Метод 1
  };

  // Отслеживаем реальный размер контейнера
  React.useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        setContainerSize({
          width: Math.floor(width),
          height: Math.floor(height)
        });
      }
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // Отслеживаем реальный размер контейнера
  React.useEffect(() => {
    if (!containerOptimizationRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setContainerOptSize({
            width: Math.floor(width),
            height: Math.floor(height)
          });
        }
      }
    });

    resizeObserver.observe(containerOptimizationRef.current);
    return () => resizeObserver.disconnect();
  }, [optimizationTab]);

  React.useEffect(() => {
    // Сбрасываем размеры контейнера при переключении вкладки
    // чтобы принудительно пересчитать их заново
    setContainerOptSize({ width: 0, height: 0 });

    // Небольшая задержка для пересчета
    const timer = setTimeout(() => {
      if (containerOptimizationRef.current) {
        const { width, height } = containerOptimizationRef.current.getBoundingClientRect();
        if (width > 0 && height > 0) {
          setContainerOptSize({
            width: Math.floor(width),
            height: Math.floor(height)
          });
        }
      }
    }, 50);

    return () => clearTimeout(timer);
  }, [optimizationTab]);


  React.useEffect(() => {
    if (!containerLayerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        setContainerLayerSize({
          width: Math.floor(width),
          height: Math.floor(height)
        });
      }
    });

    resizeObserver.observe(containerLayerRef.current);
    return () => resizeObserver.disconnect();
  }, []);


  // ── Данные для графиков сравнения ────────────────────────────────────────

  /** Для каждого таксона строим точки по времени */
  const taxonChartData = React.useMemo(() => {
    if (!comparisonData?.B) return [];
    return comparisonData.B.map((taxon: any, idx: number) => ({
      label: `Таксон ${idx + 1}`,
      color: taxon.color,
      // route: [[x, y, t], ...]
      data: (taxon.route ?? taxon.points ?? []).map(
        (pt: number[], ptIdx: number) => ({
          name: `T${ptIdx}`,
          time: typeof pt[2] === "number" ? +pt[2].toFixed(1) : 0,
        }),
      ),
    }));
  }, [comparisonData]);

  /** Сводная таблица по таксонам */
  const taxonSummary = React.useMemo(() => {
    if (!comparisonData?.B) return [];
    return comparisonData.B.map((taxon: any, idx: number) => {
      const pts = taxon.route ?? taxon.points ?? [];
      const lastPt = pts[pts.length - 1];
      return {
        idx: idx + 1,
        color: taxon.color,
        base: taxon.base
          ? `(${taxon.base[0]?.toFixed(1)}, ${taxon.base[1]?.toFixed(1)})`
          : "—",
        pointsCount: pts.length,
        timeSec: lastPt?.[2] ?? taxon.time_sec ?? null,
      };
    });
  }, [comparisonData]);

  /** Данные для барчарта сравнения времени таксонов */
  const taxonBarData = React.useMemo(
    () =>
      taxonSummary.map((t) => ({
        name: `Т${t.idx}`,
        time: t.timeSec ? +t.timeSec.toFixed(1) : 0,
      })),
    [taxonSummary],
  );

  // ── Вспомогательные панели раскадровки ──────────────────────────────────

  const StoryboardMetrics = ({
    data,
  }: {
    data: {
      count_frames: number | null;
      disk_space: number | null;
      total_flight_time: number | null;
    };
  }) => (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12, sm: 4 }}>
        <MetricCard
          label="Количество кадров"
          value={data.count_frames ? `${data.count_frames} шт.` : "—"}
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 4 }}>
        <MetricCard
          label="Объём памяти"
          value={data.disk_space ? formatFileSize(data.disk_space) : "—"}
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 4 }}>
        <MetricCard
          label="Время полёта"
          value={formatTime(data.total_flight_time)}
          tooltip="Время полёта от кадра к кадру с зависанием."
        />
      </Grid>
    </Grid>
  );

  // 1. Создаем ref
  const sceneUserTrajectoryShower = React.useRef<any>(null);

  // 2. Загружаем изображение
  const [image] = useImage(imageData?.imageUrl);

  // 3. Определяем общие пропсы
  const commonProps = {
    imageData,
    droneParams,
    points,
    obstacles,
    flightLineY,
    weatherConditions,
    onShowView: () => { },
    stageRef: sceneUserTrajectoryShower,
    image: image,
  };

React.useEffect(() => {
  // Принудительно обновляем размеры после загрузки изображения
  if (image && containerOptimizationRef.current) {
    const rect = containerOptimizationRef.current.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      setContainerOptSize({
        width: Math.floor(rect.width),
        height: Math.floor(rect.height)
      });
    }
  }
}, [image]);


  // ── Эффект для автоматического переключения ─────────────────────────────
  React.useEffect(() => {
    // Если приоритетный метод не задан, не переключаем
    if (!priorityMethod) return;

    const idx = getMethodIndex(priorityMethod);

    setOptimizationTab(idx);
    setComparisonTab(idx);
    // +2, потому что первые 2 вкладки раскадровки — это Точечная и Рекомендуемая
    setStoryboardTab(idx + 2);
  }, [priorityMethod]); // Срабатывает, когда priorityMethod загрузился или изменился

  const [expanded, setExpanded] = React.useState<string | false>('panel1');

  const [loadings, setLoadings] = React.useState<any>({
    userScene: false,
    optimal1Scene: false,
    optimal2Scene: false,
    optimal3Scene: false
  });

  const handleChange =
    (panel: string) => (event: React.SyntheticEvent, newExpanded: boolean) => {
      setExpanded(newExpanded ? panel : false);
    };

  const formatPoint = (p: number[]) => `(${p[0].toFixed(1)} м, ${p[1].toFixed(1)} м)`;

  // Функция для создания пропсов вкладки оптимизации
  // Возвращает объект { label: ..., sx: ... }
  const getPriorityTabProps = (
    label: string,
    methodCode: string, // "low-d", "high-d", "mixed-d"
    priorityMethod: string
  ) => {
    const isPriority = priorityMethod === methodCode;

    return {
      label: (
        isPriority
          ? "⭐ " + label
          : label
      ),
      sx: isPriority
        ? {
          color: "primary.dark",
          fontWeight: 700,
        }
        : {},
    };
  };

  const handleLoadingChange = (key: string, value: boolean) => {
    setLoadings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleDownloadHeatmap = async () => {
    // Защита: должны быть точки и параметры дрона
    if (!points || points.length === 0) {
      console.warn("Нет точек для построения тепловой карты");
      return;
    }

    const GRID_COLS = droneParams.frameWidthBase / droneParams.frameWidthPlanned;
    const GRID_ROWS = droneParams.frameHeightBase / droneParams.frameHeightPlanned;
    const width_m = droneParams.frameWidthBase;
    const height_m = droneParams.frameHeightBase;

    // На всякий случай — валидация (деление на 0, NaN)
    if (
      !Number.isFinite(GRID_COLS) || !Number.isFinite(GRID_ROWS) ||
      GRID_COLS <= 0 || GRID_ROWS <= 0 ||
      width_m <= 0 || height_m <= 0
    ) {
      console.warn("Некорректные параметры сетки", { GRID_COLS, GRID_ROWS, width_m, height_m });
      return;
    }

    try {
      // points в твоём формате — приводим к [[x, y], ...] на всякий случай
      const meterPerPixelX = width_m / imageData.width;
      const meterPerPixelY = height_m / imageData.height;

      const pointsPayload: number[][] = points.map((p: any) => [
        p.x * meterPerPixelX,
        (imageData.height - p.y) * meterPerPixelY,
      ]);

      handleLoadingChange("userScene", true);

      const blob = await trajectoryApi.getDensityHeatmap({
        points: pointsPayload,
        L: width_m,
        H: height_m,
        n_cols: GRID_COLS,
        n_rows: GRID_ROWS,
        density_k: 0.5,
        threshold_method: "median",
        dpi: 200,
      });

      // Триггерим скачивание
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `density_heatmap_${Date.now()}.jpeg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // notifications.show("Тепловая карта сформирована", {
      //   severity: "success",
      //   autoHideDuration: 3000,
      // })
    } catch (e) {
      console.error("Ошибка при получении тепловой карты:", e);
      // notifications.show("Ошибка построения тепловой карты", {
      //   severity: "error",
      //   autoHideDuration: 3000,
      // })
      // здесь можно показать toast/alert юзеру
    }
    finally {
      handleLoadingChange("userScene", false);
    }
  };

  const handleDownload = async () => {
    const setLoadingUser = (val: boolean) => setLoadings(prev => ({ ...prev, userScene: val }));

    setLoadingUser(true);

    let exportImage = image;
    if (imageData?.imageUrl) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = imageData.imageUrl;
      await new Promise((resolve, reject) => {
        img.onload = () => {
          exportImage = img;
          resolve(img);
        };
        img.onerror = reject;
      });
    }

    let params = {
      image: exportImage,
      width_m: droneParams.frameWidthBase,
      height_m: droneParams.frameHeightBase,
      GRID_COLS: droneParams.frameWidthBase / droneParams.frameWidthPlanned,
      GRID_ROWS: droneParams.frameHeightBase / droneParams.frameHeightPlanned,

      flightLineY: flightLineY,
      obstacles: obstacles,
      points: points,
      trajectoryData: null,

      showGrid: true,
      showObstacles: true,
      showUserTrajectory: true,
      showTaxonTrajectory: false,
      showNavTriangles: false,
    }

    await downloadScene(
      { ...params, setLoadingUser },
      "trajectory_schema.jpeg",
    );
  };

  const getOptimizationLoadingSetter = (tab: number) => {
    // tab 0 -> 'optimal1Scene'
    // tab 1 -> 'optimal2Scene'
    // tab 2 -> 'optimal3Scene'
    const key = `optimal${tab + 1}Scene`;

    return (val: boolean) => setLoadings(prev => ({
      ...prev,
      [key]: val // Обновляем нужный ключ
    }));
  };

  const getOptimizationLoading = (tab: number) => {
    // tab 0 -> 'optimal1Scene'
    // tab 1 -> 'optimal2Scene'
    // tab 2 -> 'optimal3Scene'
    const key = `optimal${tab + 1}Scene`;

    return loadings[key];
  };

  const handleDownloadOptSchema = async () => {
    const currentData = getOptimizationData(optimizationTab);

    if (!currentData) return; // Если данных нет, выходим

    // 2. Получаем сеттер лоадера для ЭТОЙ ЖЕ вкладки
    const setLoading = getOptimizationLoadingSetter(optimizationTab);

    setLoading(true); // Включаем лоадер (например, для optimal2Scene)

    let exportImage = image;
    if (imageData?.imageUrl) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = imageData.imageUrl;
      await new Promise((resolve, reject) => {
        img.onload = () => {
          exportImage = img;
          resolve(img);
        };
        img.onerror = reject;
      });
    }

    let params = {
      image: exportImage,
      width_m: droneParams.frameWidthBase,
      height_m: droneParams.frameHeightBase,
      GRID_COLS: droneParams.frameWidthBase / droneParams.frameWidthPlanned,
      GRID_ROWS: droneParams.frameHeightBase / droneParams.frameHeightPlanned,

      flightLineY: flightLineY,
      obstacles: obstacles,
      points: points,
      trajectoryData: currentOptimizationData,

      showGrid: true,
      showObstacles: true,
      showUserTrajectory: false,
      showTaxonTrajectory: true,
      showNavTriangles: true,
      showFullNavTriangles: showNavTriangles
    }

    await downloadScene(
      { ...params, setLoading },
      "opt_trajectory_schema.jpeg",
    );
  };

  return (
    <PageContainer
      title="Полётная карта"
      actions={
        <Tooltip title="Закрыть">
          <IconButton color="primary" onClick={onClose} aria-label="close">
            <CloseIcon />
          </IconButton>
        </Tooltip>
      }
      pr={25}
      pl={25}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          borderColor: "divider",
          borderWidth: 1,
          borderStyle: "solid",
          borderRadius: 1,
          p: 2,
          mb: 2,
        }}
      >
        <Box
          display="flex"
          flexDirection="row"
          justifyContent="space-between"
          alignItems="center"
          width="100%"
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography variant="h6">Название:</Typography>
            <Typography variant="h6" sx={{ fontWeight: 300 }}>
              {schemaName}
            </Typography>
          </Box>
          <Box sx={{ display: "flex", gap: 2, mt: 0.5 }}>
            <Typography variant="caption" color="text.secondary">
              {`Дата создания: ${DateToPrettyLocalDateTime(createdAt) || "-"}`}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {`Автор: ${author.last_name ?? ''} ${author.first_name?.[0] ?? ''}. ${author.middle_name?.[0] ?? ''}.`}
            </Typography>
          </Box>
        </Box>
      </Box>

      <Stack spacing={4}>
        {/* ═══════════════════════════════════════════════════════════════════
            1. Информация о базовом слое
        ═══════════════════════════════════════════════════════════════════ */}
        <SectionBox title="Информация о базовом слое">
          <Grid container spacing={2}>
            {/* Левая колонка: Сцена */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Box
                flex={1}
                sx={{
                  width: "100%",
                  minHeight: 350,
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  position: "relative",
                  overflow: "hidden"
                }}
                ref={containerLayerRef}
              >
                <Box
                  sx={{
                    cursor: "default",
                    width: "100%",
                    height: "100%",
                    p: "10px"
                  }}
                >
                  {imageData ? (
                    <ScenePreview
                      {...commonProps}
                      trajectoryData={null}
                      showUserTrajectory={false}
                      showTaxonTrajectory={false}
                      showObstacles={false}
                      showLine={false}
                      showGrid={false}
                      isLoading={false}
                      PREVIEW_WIDTH={PREVIEW_LAYER_WIDTH - 20}
                      PREVIEW_HEIGHT={PREVIEW_LAYER_HEIGHT - 20}
                      isShowView={false}
                      weatherConditions={null}
                    />
                  ) : (
                    <Placeholder label="Нет данных" />
                  )}
                </Box>
              </Box>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Paper
                elevation={1}
                variant="outlined"
                sx={{ p: 2, height: "100%", background: "transparent", display: 'flex', flexDirection: 'column' }}
              >
                <Typography variant="subtitle1" sx={{ mb: 2 }}>
                  Метаданные изображения
                </Typography>
                <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>
                  {hasExifData ? (
                    <Grid container spacing={2}>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <Box
                          display="flex"
                          flexDirection="column"
                          gap={2}
                        >
                          <Typography
                            variant="body2"
                            sx={{
                              whiteSpace: "normal",
                              wordBreak: "break-word",
                            }}
                          >
                            <strong>Фото:</strong>{" "}
                            {renderValue(exifData[0]?.fileName)}
                          </Typography>
                          <Typography variant="body2">
                            <strong>Размер:</strong>{" "}
                            {renderValue(exifData[0]?.fileSize)}
                          </Typography>
                          <Typography variant="body2">
                            <strong>Ширина:</strong>{" "}
                            {renderValue(exifData[0]?.width, "px")}
                          </Typography>
                          <Typography variant="body2">
                            <strong>Высота:</strong>{" "}
                            {renderValue(exifData[0]?.height, "px")}
                          </Typography>
                          <Typography variant="body2">
                            <strong>Дата/время:</strong>{" "}
                            {renderValue(
                              exifData[0]?.dateTime
                                ? new Date(
                                  exifData[0].dateTime,
                                ).toLocaleString()
                                : null,
                            )}
                          </Typography>
                          <Typography variant="body2">
                            <strong>Производитель:</strong>{" "}
                            {renderValue(exifData[0]?.make)}
                          </Typography>
                          <Typography variant="body2">
                            <strong>Модель:</strong>{" "}
                            {renderValue(exifData[0]?.model)}
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <Box
                          display="flex"
                          flexDirection="column"
                          gap={2}
                        >

                          <Typography variant="body2">
                            <strong>Фокусное расстояние:</strong>{" "}
                            {renderValue(exifData[0]?.focalLength, "мм")}
                          </Typography>
                          <Typography variant="body2">
                            <strong>Фокусное расстояние (35мм):</strong>{" "}
                            {renderValue(
                              exifData[0]?.focalLengthIn35mmFormat,
                              "мм",
                            )}
                          </Typography>
                          <Typography variant="body2">
                            <strong>Широта:</strong>{" "}
                            {renderValue(exifData[0]?.latitude)}
                          </Typography>
                          <Typography variant="body2">
                            <strong>Долгота:</strong>{" "}
                            {renderValue(exifData[0]?.longitude)}
                          </Typography>
                          <Typography variant="body2">
                            <strong>Ориентация:</strong>{" "}
                            {renderValue(exifData[0]?.orientation)}
                          </Typography>
                          <Typography variant="body2">
                            <strong>Относ. высота:</strong>{" "}
                            {renderValue(exifData[0]?.relativeAltitude, "м")}
                          </Typography>
                          <Typography variant="body2">
                            <strong>Расст. до объекта:</strong>{" "}
                            {renderValue(exifData[0]?.subjectDistance, "м")}
                          </Typography>
                        </Box>
                      </Grid>
                    </Grid>
                  ) : (
                    <Placeholder label="Нет данных" />
                  )}
                </Box>
              </Paper>
            </Grid>
          </Grid>
        </SectionBox>

        <Divider />

        {/* ═══════════════════════════════════════════════════════════════════
            2. Характеристики БПЛА
        ═══════════════════════════════════════════════════════════════════ */}
        <SectionBox title="Характеристики БПЛА и параметры съёмки">
          <Tabs
            value={droneTab}
            onChange={(_, v) => setDroneTab(v)}
            sx={{ borderBottom: 1, borderColor: "divider" }}
          >
            <Tab label="Общие" />
            <Tab label="Камера" />
            <Tab label="Съёмка" />
          </Tabs>

          <Box minHeight={160} sx={{ mt: 2 }}>
            {droneTab === 0 && (
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <MetricCard
                    label="Модель"
                    value={droneParams.model || "Не задана"}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <MetricCard
                    label="Рабочая скорость"
                    value={`${droneParams.speed?.toFixed(2)} м/с`}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <MetricCard
                    label="Время работы батареи"
                    value={`${droneParams.batteryTime?.toFixed(2)} мин`}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <MetricCard
                    label="Время зависания для фото"
                    value={`${droneParams.hoverTime?.toFixed(2)} с`}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <MetricCard
                    label="Устойчивость к ветру"
                    value={`${droneParams.windResistance?.toFixed(2)} м/с`}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <Card
                    variant="outlined"
                    sx={{
                      p: 2,
                      height: "100%",
                      backgroundColor: "transparent",
                    }}
                  >
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      gutterBottom
                    >
                      Учитывать препятствия
                    </Typography>
                    <Chip
                      size="small"
                      variant="outlined"
                      label={droneParams.considerObstacles ? "Да" : "Нет"}
                      color={
                        droneParams.considerObstacles ? "success" : "error"
                      }
                    />
                  </Card>
                </Grid>
              </Grid>
            )}

            {droneTab === 1 && (
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <MetricCard
                    label="Вертикальный угол обзора (FOV)"
                    value={`${droneParams.uavCameraParams.fov.toFixed(2)}°`}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <MetricCard
                    label="Разрешение по ширине"
                    value={`${droneParams.uavCameraParams.resolutionWidth} px`}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <MetricCard
                    label="Разрешение по высоте"
                    value={`${droneParams.uavCameraParams.resolutionHeight} px`}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <Card
                    variant="outlined"
                    sx={{
                      p: 2,
                      height: "100%",
                      backgroundColor: "transparent",
                    }}
                  >
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      gutterBottom
                    >
                      Данные взяты из справочника
                    </Typography>
                    <Chip
                      size="small"
                      variant="outlined"
                      label={
                        droneParams.uavCameraParams.useFromReference
                          ? "Да"
                          : "Нет"
                      }
                      color={
                        droneParams.uavCameraParams.useFromReference
                          ? "success"
                          : "error"
                      }
                    />
                  </Card>
                </Grid>
              </Grid>
            )}

            {droneTab === 2 && (
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <MetricCard
                    label="Расстояние до объекта (базовый слой)"
                    value={`${droneParams.distance.toFixed(2)} м`}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <MetricCard
                    label="Планируемое расстояние до объекта"
                    value={`${droneParams.plannedDistance.toFixed(2)} м`}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <MetricCard
                    label="Базовая ширина кадра"
                    value={`${droneParams.frameWidthBase.toFixed(2)} м`}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <MetricCard
                    label="Базовая высота кадра"
                    value={`${droneParams.frameHeightBase.toFixed(2)} м`}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <MetricCard
                    label="Планируемая ширина кадра"
                    value={`${droneParams.frameWidthPlanned.toFixed(2)} м`}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <MetricCard
                    label="Планируемая высота кадра"
                    value={`${droneParams.frameHeightPlanned.toFixed(2)} м`}
                  />
                </Grid>
              </Grid>
            )}
          </Box>
        </SectionBox>

        <Divider />

        {/* ═══════════════════════════════════════════════════════════════════
            3. Пользовательская траектория
        ═══════════════════════════════════════════════════════════════════ */}
        <SectionBox title={<Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
          <Box display="flex" alignItems="center" gap={1}>
            <Typography variant="h6">Пользовательская траектория</Typography>
            <Tooltip title="Скачать схему">
              <IconButton component="span" size="small" color="primary" onClick={handleDownload}>
                <DownloadIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
          <Button
            size="small"
            color="primary"
            startIcon={<GridOnIcon fontSize="small" />}
            onClick={handleDownloadHeatmap}
          >
            Скачать тепловую карту
          </Button>
        </Box>}>
          <Stack direction="row" spacing={2}>
            {/* Сцена */}
            <Box
              flex={1}
              ref={containerRef}
              sx={{
                width: "100%",
                height: "100%",
                maxHeight: "500px",
                minHeight: "340px",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                mt: 1,
                position: "relative",
                overflow: "hidden"
              }}
            >
              <Box
                sx={{
                  cursor: "default",
                  width: "100%",
                  height: "100%",
                  p: "10px"
                }}
              >
                {imageData ? (
                  <ScenePreview
                    {...commonProps}
                    trajectoryData={null}
                    showUserTrajectory={true}
                    showTaxonTrajectory={false}
                    isLoading={loadings.userScene}
                    PREVIEW_WIDTH={PREVIEW_WIDTH - 20}
                    PREVIEW_HEIGHT={PREVIEW_HEIGHT - 20}
                    isShowView={false}
                  />
                ) : (
                  <Placeholder label="Нет данных" />
                )}
              </Box>
            </Box>

            {/* Вкладки с деталями */}
            <Box flex={1} display="flex" flexDirection="column">
              <Tabs
                value={userTrajectoryTab}
                onChange={(_, v) => setUserTrajectoryTab(v)}
                sx={{ borderBottom: 1, borderColor: "divider", mb: 1 }}
              >
                <Tab label="Линия взлёта" />
                <Tab label={`Препятствия (${obstacles?.length ?? 0})`} />
                <Tab label={`Точки (${points?.length ?? 0})`} />
              </Tabs>

              <Box flex={1} overflow="auto" maxHeight={300}>
                {/* ── Препятствия ── */}
                {userTrajectoryTab === 1 && (
                  <Stack spacing={1} p={1}>
                    {obstacles?.length === 0 && (
                      <Typography variant="body2" color="text.secondary">
                        Препятствия не заданы.
                      </Typography>
                    )}
                    {obstacles?.map((obstacle, idx) => (
                      <Card
                        key={obstacle.id}
                        variant="outlined"
                        sx={{ p: 1.5, background: "transparent" }}
                      >
                        <Stack
                          direction="row"
                          spacing={1}
                          alignItems="center"
                          mb={0.5}
                        >
                          <Box
                            sx={{
                              width: 12,
                              height: 12,
                              borderRadius: "50%",
                              bgcolor: obstacle.color,
                              flexShrink: 0,
                            }}
                          />
                          <Typography fontWeight={600} variant="body2">
                            Препятствие №{idx + 1}
                          </Typography>
                          <Chip
                            size="small"
                            label={`${obstacle.points.length} точ.`}
                            variant="outlined"
                          />
                          <Chip
                            size="small"
                            label={`Зона: ${obstacle.safeZone} м`}
                            variant="outlined"
                          />
                        </Stack>
                        {/* Координаты вершин */}
                        <Box
                          sx={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: 0.5,
                            mt: 0.5,
                          }}
                        >
                          {obstacle.points
                            .slice(0, 6)
                            .map((pt: any, pi: number) => (
                              <Chip
                                key={pi}
                                size="small"
                                label={`(${Math.round(pt.x)}, ${Math.round(
                                  pt.y,
                                )})`}
                                sx={{ fontSize: 10 }}
                              />
                            ))}
                          {obstacle.points.length > 6 && (
                            <Chip
                              size="small"
                              label={`+${obstacle.points.length - 6}`}
                              variant="outlined"
                              sx={{ fontSize: 10 }}
                            />
                          )}
                        </Box>
                      </Card>
                    ))}
                  </Stack>
                )}

                {/* ── Линия взлёта ── */}
                {userTrajectoryTab === 0 && (
                  <Box p={2}>
                    {flightLineY != null ? (
                      <Stack spacing={1.5}>
                        <MetricCard
                          label="Позиция линии взлёта (Y, пиксели)"
                          value={`${Math.round(flightLineY)} px`}
                          tooltip="Координата Y линии взлёта/посадки на изображении."
                        />
                        <Typography variant="body2" color="text.secondary">
                          Линия взлёта определяет базовую позицию БПЛА перед
                          началом обхода точек съёмки.
                        </Typography>
                      </Stack>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        Линия взлёта не задана.
                      </Typography>
                    )}
                  </Box>
                )}

                {/* ── Точки съёмки ── */}
                {userTrajectoryTab === 2 && (
                  <Box p={1}>
                    {points?.length === 0 ? (
                      <Typography variant="body2" color="text.secondary">
                        Точки не заданы.
                      </Typography>
                    ) : (
                      <TableContainer
                        component={Paper}
                        variant="outlined"
                        sx={{ maxHeight: 280, background: "transparent" }}
                      >
                        <Table size="small" stickyHeader>
                          <TableHead>
                            <TableRow>
                              <TableCell>№</TableCell>
                              <TableCell>X, px</TableCell>
                              <TableCell>Y, px</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {points.map((pt, idx) => (
                              <TableRow key={idx} hover>
                                <TableCell>{idx + 1}</TableCell>
                                <TableCell>{Math.round(pt.x)}</TableCell>
                                <TableCell>{Math.round(pt.y)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    )}
                  </Box>
                )}
              </Box>
            </Box>
          </Stack>
        </SectionBox>

        <Divider />

        {/* ═══════════════════════════════════════════════════════════════════
            4. Место и погодные условия
        ═══════════════════════════════════════════════════════════════════ */}
        <SectionBox title="Место и погодные условия полёта">
          <Stack direction="row" spacing={2}>
            <Box flex={1} height={300}>
              <MapContainer
                center={
                  weatherConditions?.position?.lat
                    ? [
                      weatherConditions.position.lat,
                      weatherConditions.position.lon,
                    ]
                    : [53, 59]
                }
                zoom={14}
                style={{ height: "100%", width: "100%", borderRadius: 8 }}
                scrollWheelZoom={false}
              >
                <TileLayer
                  attribution="&copy; OpenStreetMap contributors"
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Marker
                  position={
                    weatherConditions?.position?.lat
                      ? [
                        weatherConditions.position.lat,
                        weatherConditions.position.lon,
                      ]
                      : [53, 59]
                  }
                >
                  <Popup>
                    Координаты полёта
                    <br />
                    {weatherConditions?.position?.lat ?? 53},{" "}
                    {weatherConditions?.position?.lon ?? 59}
                  </Popup>
                </Marker>
              </MapContainer>
            </Box>

            <Box
              flex={1}
              component={Paper}
              elevation={1}
              variant="outlined"
              sx={{ p: 2, background: "transparent" }}
            >
              <Stack spacing={1.5}>
                <Typography variant="subtitle1">Погодные условия</Typography>
                <InfoRow
                  label="Скорость ветра"
                  value={`${(weatherConditions?.windSpeed).toFixed(1) ?? "—"} м/с`}
                />
                <InfoRow
                  label="Направление ветра"
                  value={
                    weatherConditions?.windDirection != null
                      ? `${weatherConditions.windDirection
                      }° (${getWindDirectionLabel(
                        weatherConditions.windDirection,
                      )})`
                      : "—"
                  }
                />
                <Divider />
                <InfoRow
                  label="Координаты"
                  value={
                    weatherConditions?.position
                      ? `${weatherConditions.position.lat}, ${weatherConditions.position.lon}`
                      : "—"
                  }
                />
                <InfoRow
                  label="Источник данных"
                  value={
                    <Typography
                      variant="body2"
                      fontWeight={500}
                      color={
                        weatherConditions?.useWeatherApi
                          ? "success.main"
                          : "info.main"
                      }
                    >
                      {weatherConditions?.useWeatherApi
                        ? "Сервис погоды"
                        : "Введено вручную"}
                    </Typography>
                  }
                />
                <Divider />
                <InfoRow
                  label="Погода при оптимизации"
                  value={
                    <Chip
                      size="small"
                      label={
                        weatherConditions?.isUse
                          ? "Учитывается"
                          : "Не учитывается"
                      }
                      color={
                        weatherConditions?.isUse ? "success" : "default"
                      }
                      variant="outlined"
                    />
                  }
                />
                <InfoRow
                  label="Сопротивляемость БПЛА ветру"
                  value={`${droneParams.windResistance.toFixed(1)} м/с`}
                />
              </Stack>
            </Box>
          </Stack>
        </SectionBox>

        <Divider />

        {/* ═══════════════════════════════════════════════════════════════════
            5. Оптимизация траектории
        ═══════════════════════════════════════════════════════════════════ */}
        <SectionBox
          title={
            <Box display="flex" alignItems="center" justifyContent="space-between" width="100%">
              <Box display="flex" alignItems="center" gap={1}>
                <Typography variant="h6">Оптимизация траектории</Typography>
                {weatherConditions.isUse && currentOptimizationData && (<Tooltip title="Навигационные треугольники">
                  <ToggleButton
                    value="triangles"
                    selected={showNavTriangles}
                    onChange={() => setShowNavTriangles(!showNavTriangles)}
                    size="small"
                    sx={{
                      p: 0.5,
                      border: 'none', // Убираем рамку, чтобы выглядело как иконка
                      '&.Mui-selected': {
                        backgroundColor: 'primary.dark', // Подсветка при выборе (опционально)
                        color: 'white',
                      }
                    }}
                    disabled={!weatherConditions.isUse}
                  >
                    <ChangeHistoryIcon fontSize="small" />
                  </ToggleButton>
                </Tooltip>
                )}
                <Tooltip title="Скачать схему">
                  <IconButton component="span" size="small" color="primary" onClick={handleDownloadOptSchema} disabled={!currentOptimizationData}>
                    <DownloadIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>

              <Chip
                label={`Приоритетная траектория: ${getMethodFullRussianFromEnglish(priorityMethod) || 'Не выбран'}`}
                color="success"
                variant="outlined"
                size="small"
              />
            </Box>
          }
        >
          <Tabs
            value={optimizationTab}
            onChange={(_, v) => setOptimizationTab(v)}
            sx={{ borderBottom: 1, borderColor: "divider", overflowX: "auto" }}
          >
            {/* Оптимальная (НПТ) */}
            <Tab
              {...getPriorityTabProps("Метод 1 (НПТ)", "low-d", priorityMethod)}
            />

            {/* Оптимальная (ВПТ) */}
            <Tab
              {...getPriorityTabProps("Метод 2 (ВПТ)", "high-d", priorityMethod)}
            />

            {/* Оптимальная (СПТ) */}
            <Tab
              {...getPriorityTabProps("Метод 3 (СПТ)", "mixed-d", priorityMethod)}
            />

          </Tabs>

          <Box mt={2} minHeight={340}>
            {/* Отрисовка активной вкладки оптимизации */}
            {currentOptimizationData && image && hasValidOptimizationData(currentOptimizationData) ? (
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 6 }}>

                  <Box ref={containerOptimizationRef} flex={1}
                    sx={{
                      width: "100%",
                      minHeight: 400,
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      position: "relative",
                      overflow: "hidden"
                    }}>

                    {containerOptSize.width > 0 && containerOptSize.height > 0 ? (
                      <Box sx={{ width: "100%", height: "100%", p: "10px" }}>
                        <ScenePreview
                          {...commonProps}
                          trajectoryData={currentOptimizationData}
                          showUserTrajectory={false}
                          showTaxonTrajectory={true}
                          isLoading={getOptimizationLoading(optimizationTab)}
                          PREVIEW_WIDTH={PREVIEW_OPT_WIDTH - 20}
                          PREVIEW_HEIGHT={PREVIEW_OPT_HEIGHT - 20}
                          isShowView={false}
                          showNavigationTriangles={showNavTriangles}

                        />
                      </Box>
                    ) : (
                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'center',
                          alignItems: 'center',
                          height: '100%',
                          width: '100%'
                        }}
                      >
                        <Typography variant="body2" color="text.secondary">
                          Загрузка...
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </Grid>
                {/* Метрики (логика та же, но берем из currentOptimizationData) */}
                <Grid size={{ xs: 12, md: 6 }}>
                  <Box
                    sx={{
                      height: "100%",         // Занимает всю высоту ячейки Grid
                      display: "flex",
                      flexDirection: "column", // Аккордеоны друг под другом
                      overflow: "hidden",      // Важно: чтобы скролл был внутри, а не всей страницы
                    }}
                  >
                    {/* 1. Результаты оптимизации */}
                    <Accordion defaultExpanded={true} expanded={expanded === 'panel1'} onChange={handleChange('panel1')} elevation={0}
                      sx={{
                        '&:not(:last-of-type)': {
                          borderBottom: '1px solid',
                          borderColor: '#ddd',
                        },
                      }}>
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
                          Результаты оптимизации
                        </Typography>
                      </AccordionSummary>
                      <AccordionDetails sx={{
                        flex: 1,
                        overflowY: 'auto', // Включаем скролл
                        maxHeight: "250px"
                      }}>
                        {/* Ваш старый контент */}
                        <Stack spacing={2}>
                          <Grid container spacing={2}>
                            <Grid size={{ xs: 6 }}>
                              <MetricCard
                                label="Таксонов"
                                value={currentOptimizationData.B?.length ?? "—"}
                              />
                            </Grid>
                            <Grid size={{ xs: 6 }}>
                              <MetricCard
                                label="Охвачено точек"
                                value={
                                  currentOptimizationData.B
                                    ? currentOptimizationData.B.reduce(
                                      (s: number, t: any) =>
                                        s + (t.route ?? t.points ?? []).length - 2,
                                      0,
                                    )
                                    : "—"
                                }
                              />
                            </Grid>
                            <Grid size={{ xs: 6 }}>
                              <MetricCard
                                label="Недостижимых точек"
                                value={currentOptimizationData.C?.length ?? 0}
                                tooltip="Точки, которые не удалось включить ни в один таксон."
                              />
                            </Grid>
                            <Grid size={{ xs: 6 }}>
                              <MetricCard
                                label="Суммарное время"
                                value={formatTime(
                                  currentOptimizationData.B?.reduce((s: number, t: any) => {
                                    const pts = t.route ?? t.points ?? [];
                                    return (
                                      s +
                                      (pts[pts.length - 1]?.[2] ?? t.time_sec ?? 0)
                                    );
                                  }, 0),
                                )}
                              />
                            </Grid>
                          </Grid>

                          {/* Таблица по таксонам */}
                          <TableContainer
                            component={Paper}
                            variant="outlined"
                            sx={{ background: "transparent" }}
                          >
                            <Table size="small">
                              <TableHead>
                                <TableRow>
                                  <TableCell>Таксон</TableCell>
                                  <TableCell>База</TableCell>
                                  <TableCell align="center">Точек</TableCell>
                                  <TableCell align="right">Время</TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {currentOptimizationData.B.map((taxon: any, idx: number) => {
                                  const pts = taxon.route ?? taxon.points ?? [];
                                  const lastPt = pts[pts.length - 1];
                                  return (
                                    <TableRow key={idx} hover>
                                      <TableCell>
                                        <Stack
                                          direction="row"
                                          spacing={1}
                                          alignItems="center"
                                        >
                                          <Box
                                            sx={{
                                              width: 10,
                                              height: 10,
                                              borderRadius: "50%",
                                              bgcolor: taxon.color,
                                            }}
                                          />
                                          <span>{idx + 1}</span>
                                        </Stack>
                                      </TableCell>
                                      <TableCell>
                                        {taxon.base ? `(${taxon.base[0]?.toFixed(1)} м, ${taxon.base[1]?.toFixed(1)} м)` : "—"}
                                      </TableCell>
                                      <TableCell align="center">
                                        {pts.length > 0 ? pts.length - 2 : 0}
                                      </TableCell>
                                      <TableCell align="right">
                                        {formatTime(lastPt?.[2] ?? taxon.time_sec)}
                                      </TableCell>
                                    </TableRow>
                                  );
                                })}
                              </TableBody>
                            </Table>
                          </TableContainer>

                          {/* Недостижимые точки */}
                          {currentOptimizationData.C?.length > 0 && (
                            <Box>
                              <Typography
                                variant="body2"
                                color="warning.main"
                                fontWeight={600}
                                mb={0.5}
                              >
                                Недостижимые точки ({currentOptimizationData.C.length}):
                              </Typography>
                              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                                {currentOptimizationData.C.map((pt: number[], i: number) => (
                                  <Chip
                                    key={i}
                                    size="small"
                                    label={`(${pt[0]?.toFixed(1)}, ${pt[1]?.toFixed(
                                      1,
                                    )})`}
                                    color="warning"
                                    variant="outlined"
                                  />
                                ))}
                              </Box>
                            </Box>
                          )}
                        </Stack>
                      </AccordionDetails>
                    </Accordion>

                    {/* 2. Полный маршрут */}
                    <Accordion sx={{ flexShrink: 0 }} expanded={expanded === 'panel2'} onChange={handleChange('panel2')}>
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
                          Полный маршрут
                        </Typography>
                      </AccordionSummary>
                      <AccordionDetails sx={{
                        overflowY: 'auto', // Включаем скролл
                        maxHeight: 230,   // Максимальная высота контента (подберите нужную цифру)
                      }}>
                        <Stack spacing={2}>
                          {currentOptimizationData.B.map((taxon: any, idx: number) => (
                            <Box key={`taxon-route-${idx}`}>
                              {/* Заголовок таксона */}
                              <Stack direction="row" spacing={1} alignItems="center" mb={0.5}>
                                <Box
                                  sx={{
                                    width: 10,
                                    height: 10,
                                    borderRadius: "50%",
                                    bgcolor: taxon.color, // Цвет таксона
                                  }}
                                />
                                <Typography variant="subtitle2" fontWeight={600}>
                                  Таксон {idx + 1}
                                </Typography>
                              </Stack>

                              {/* Вывод маршрута */}
                              <Typography
                                variant="body2"
                                sx={{
                                  pl: 1.5, // Отступ, чтобы выровнять по тексту заголовка
                                  color: "text.secondary",
                                  wordBreak: "break-word", // На случай, если маршрут слишком длинный
                                }}
                              >
                                {taxon.route.map(formatPoint).join(" → ")}
                              </Typography>
                            </Box>
                          ))}
                        </Stack>
                      </AccordionDetails>
                    </Accordion>

                  </Box>
                </Grid>
              </Grid>
            ) : (
              <Placeholder label="Нет данных" />
            )}
          </Box>
        </SectionBox>

        <Divider />

        {/* ═══════════════════════════════════════════════════════════════════
            6. Раскадровка
        ═══════════════════════════════════════════════════════════════════ */}
        <SectionBox
          title={
            <Box display="flex" alignItems="center" justifyContent="space-between" width="100%">
              <Typography variant="h6">Раскадровка</Typography>
              <Chip
                label={`Приоритетная раскадровка: ${getMethodFullRussianFromEnglish(priorityMethod) || 'Не выбрана'}`}
                color="success"
                variant="outlined"
                size="small"
              />
            </Box>
          }
        >
          <Tabs
            value={storyboardTab}
            onChange={(_, v) => setStoryboardTab(v)}
            sx={{ borderBottom: 1, borderColor: "divider" }}
          >
            <Tab label="Точечная" />
            <Tab label="Рекомендуемая" />
            {/* Оптимальная (НПТ) */}
            <Tab
              {...getPriorityTabProps("Оптимальная (НПТ)", "low-d", priorityMethod)}
            />

            {/* Оптимальная (ВПТ) */}
            <Tab
              {...getPriorityTabProps("Оптимальная (ВПТ)", "high-d", priorityMethod)}
            />

            {/* Оптимальная (СПТ) */}
            <Tab
              {...getPriorityTabProps("Оптимальная (СПТ)", "mixed-d", priorityMethod)}
            />
            {/* <Tab label="Точечная" disabled={!storyboardsData?.point?.applied} />
            <Tab label="Рекомендуемая" disabled={!storyboardsData?.recommended?.applied} />
            <Tab label="Оптимальная (НПТ)" disabled={!storyboardsData?.optimal?.applied} />
            <Tab label="Оптимальная (ВПТ)" disabled={!storyboardsData?.optimal_big_density?.applied} />
            <Tab label="Оптимальная (Комби)" disabled={!storyboardsData?.optimal_combi?.applied} /> */}
          </Tabs>


          {/* ── Точечная ── */}
          {storyboardTab === 0 && storyboardsData?.point?.applied && (
            <Grid container spacing={2}>
              <Grid
                size={{ xs: 12, md: 6 }}
                sx={{ display: 'flex', flexDirection: 'column' }}
              >
                <Box sx={{
                  flexGrow: 1,
                  background: "#D3D3D399",
                  borderRadius: 1,
                  overflow: "hidden",
                  minHeight: { xs: 300, md: 400 }, // Адаптивная высота
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center"
                }}>
                  <SceneViewer
                    imageData={imageData}
                    points={points}
                    obstacles={obstacles}
                    trajectoryData={trajectoryData}
                    showPoints={true} showObstacles={false} showTaxons={false}
                    frameWidthPx={frameWidthPx} frameHeightPx={frameHeightPx}
                    applyPointBasedStoryboard={true}
                    applyRecommendedStoryboard={false}
                    applyOptimalStoryboard={false}
                    width_m={droneParams?.frameWidthBase || 0}
                    height_m={droneParams?.frameHeightBase || 0}
                  />

                </Box>
              </Grid>
              <Grid
                size={{ xs: 12, md: 6 }}
                sx={{ display: 'flex', flexDirection: 'column' }}
              >
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2,
                    borderRadius: 1,
                    background: "transparent",
                    height: { xs: 'auto', md: 400 }, // На десктопе фиксированная, на моб. авто
                    display: "flex",
                    flexDirection: "column",
                    overflow: "hidden"
                  }}
                >
                  <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>
                    <Stack spacing={2}>
                      <Typography variant="subtitle1">Свойства раскадровки</Typography>
                      <StoryboardMetrics data={storyboardsData.point} />
                    </Stack>
                  </Box>

                  <Box sx={{ mt: 2, pt: 1 }}>
                    <Box sx={{ overflowX: "auto", overflowY: "hidden" }}>
                      <StoryboardTimeline frames={framesUrlsPointBased ?? []} />
                    </Box>
                  </Box>
                </Paper>
              </Grid>
            </Grid>
          )}

          {/* ── Рекомендуемая ── */}
          {storyboardTab === 1 && storyboardsData?.recommended?.applied && (
            <Box display="flex" flexDirection="row" gap={2} height="100%">
              <Box flex={0.5} minHeight={400} maxHeight={400} sx={{ background: "#D3D3D399", borderRadius: 1, overflow: "hidden" }} minWidth={550} justifyContent="center" alignItems="center" display="flex">
                <SceneViewer
                  imageData={imageData}
                  pointsRecommended={pointsRecommended}
                  obstacles={obstacles}
                  trajectoryData={trajectoryData}
                  showPoints={true} showObstacles={false} showTaxons={false}
                  frameWidthPx={frameWidthPx} frameHeightPx={frameHeightPx}
                  applyPointBasedStoryboard={false}
                  applyRecommendedStoryboard={true}
                  applyOptimalStoryboard={false}
                  width_m={droneParams?.frameWidthBase || 0}
                  height_m={droneParams?.frameHeightBase || 0}
                />
              </Box>
              <Box flex={1} p={2} borderRadius={1} component={Paper} elevation={1} variant="outlined" display="flex" flexDirection="column" justifyContent="space-between" overflow="auto" sx={{ background: "transparent" }}>
                <Stack spacing={2}>
                  <Typography variant="subtitle1">Свойства раскадровки</Typography>
                  <StoryboardMetrics data={storyboardsData.recommended} />
                </Stack>
                <Box sx={{ overflowX: "auto", overflowY: "hidden", mt: 2 }}>
                  <StoryboardTimeline frames={framesUrlsRecommended ?? []} />
                </Box>
              </Box>
            </Box>
          )}

          {/* ── Оптимальная ── */}
          {storyboardTab === 2 && storyboardsData?.optimal?.applied && (
            <Box display="flex" flexDirection="row" gap={2} height="100%">
              <Box flex={0.5} minHeight={400} maxHeight={400} minWidth={550} sx={{ background: "#D3D3D399", borderRadius: 1, overflow: "hidden" }} justifyContent="center" alignItems="center" display="flex">
                <SceneViewer
                  imageData={imageData}
                  pointsOptimal={pointsOptimal ?? []}
                  obstacles={obstacles}
                  trajectoryData={trajectoryData}
                  showPoints={true} showObstacles={false} showTaxons={true}
                  frameWidthPx={frameWidthPx} frameHeightPx={frameHeightPx}
                  applyPointBasedStoryboard={false}
                  applyRecommendedStoryboard={false}
                  applyOptimalStoryboard={true}
                  width_m={droneParams?.frameWidthBase || 0}
                  height_m={droneParams?.frameHeightBase || 0}
                />
              </Box>
              <Box flex={1} p={2} borderRadius={1} component={Paper} elevation={1} variant="outlined" display="flex" flexDirection="column" justifyContent="space-between" overflow="auto" sx={{ background: "transparent" }}>
                <Stack spacing={2}>
                  <Typography variant="subtitle1">Свойства раскадровки (НПТ)</Typography>
                  <StoryboardMetrics data={storyboardsData.optimal} />
                </Stack>
                <Box sx={{ overflowX: "auto", overflowY: "hidden", mt: 2 }}>
                  <StoryboardTimeline frames={framesUrlsOptimal ?? []} />
                </Box>
              </Box>
            </Box>
          )}

          {/* ── Оптимальная (Плотная) ── */}
          {storyboardTab === 3 && storyboardsData?.optimal_big_density?.applied && (
            <Box display="flex" flexDirection="row" gap={2} height="100%">
              <Box flex={0.5} minHeight={400} maxHeight={400} minWidth={550} sx={{ background: "#D3D3D399", borderRadius: 1, overflow: "hidden" }} justifyContent="center" alignItems="center" display="flex">
                <SceneViewer
                  imageData={imageData}
                  pointsOptimal={pointsOptimal2 ?? []}
                  obstacles={obstacles}
                  trajectoryData={trajectoryData2} // Используем приоритетный или соответствующий
                  showPoints={true} showObstacles={false} showTaxons={true}
                  frameWidthPx={frameWidthPx} frameHeightPx={frameHeightPx}
                  applyPointBasedStoryboard={false}
                  applyRecommendedStoryboard={false}
                  applyOptimalStoryboard={true} // Флаг визуализации прямоугольников
                  width_m={droneParams?.frameWidthBase || 0}
                  height_m={droneParams?.frameHeightBase || 0}
                />
              </Box>
              <Box flex={1} p={2} borderRadius={1} component={Paper} elevation={1} variant="outlined" display="flex" flexDirection="column" justifyContent="space-between" overflow="auto" sx={{ background: "transparent" }}>
                <Stack spacing={2}>
                  <Typography variant="subtitle1">Свойства раскадровки (ВПТ)</Typography>
                  <StoryboardMetrics data={storyboardsData.optimal_big_density} />
                </Stack>
                <Box sx={{ overflowX: "auto", overflowY: "hidden", mt: 2 }}>
                  <StoryboardTimeline frames={framesUrlsOptimal2 ?? []} />
                </Box>
              </Box>
            </Box>
          )}

          {/* ── Оптимальная (Комби) ── */}
          {storyboardTab === 4 && storyboardsData?.optimal_combi?.applied && (
            <Box display="flex" flexDirection="row" gap={2} height="100%">
              <Box flex={0.5} minHeight={400} maxHeight={400} minWidth={550} sx={{ background: "#D3D3D399", borderRadius: 1, overflow: "hidden" }} justifyContent="center" alignItems="center" display="flex">
                <SceneViewer
                  imageData={imageData}
                  pointsOptimal={pointsOptimal3 ?? []}
                  obstacles={obstacles}
                  trajectoryData={trajectoryData3}
                  showPoints={true} showObstacles={false} showTaxons={true}
                  frameWidthPx={frameWidthPx} frameHeightPx={frameHeightPx}
                  applyPointBasedStoryboard={false}
                  applyRecommendedStoryboard={false}
                  applyOptimalStoryboard={true}
                  width_m={droneParams?.frameWidthBase || 0}
                  height_m={droneParams?.frameHeightBase || 0}
                />
              </Box>
              <Box flex={1} p={2} borderRadius={1} component={Paper} elevation={1} variant="outlined" display=" flex" flexDirection="column" justifyContent="space-between" overflow="auto" sx={{ background: "transparent" }}>
                <Stack spacing={2}>
                  <Typography variant="subtitle1">Свойства раскадровки (СПТ)</Typography>
                  <StoryboardMetrics data={storyboardsData.optimal_combi} />
                </Stack>
                <Box sx={{ overflowX: "auto", overflowY: "hidden", mt: 2 }}>
                  <StoryboardTimeline frames={framesUrlsOptimal3 ?? []} />
                </Box>
              </Box>

            </Box>
          )}

          {/* Placeholder if tab not active or no data */}
          {!(
            (storyboardTab === 0 && storyboardsData?.point?.applied) ||
            (storyboardTab === 1 && storyboardsData?.recommended?.applied) ||
            (storyboardTab === 2 && storyboardsData?.optimal?.applied) ||
            (storyboardTab === 3 && storyboardsData?.optimal_big_density?.applied) ||
            (storyboardTab === 4 && storyboardsData?.optimal_combi?.applied)
          ) && (
              <Placeholder label="Нет данных" />
            )}
        </SectionBox>

        <Divider />

        {/* ═══════════════════════════════════════════════════════════════════
            7. Сравнение оптимизаций
        ═══════════════════════════════════════════════════════════════════ */}
        <SectionBox title={
          <Box display="flex" alignItems="center" justifyContent="space-between" width="100%">
            <Typography variant="h6">Сравнение оптимизаций</Typography>
            <Chip
              label={`Приоритетная оптимизация: ${getMethodFullRussianFromEnglish(priorityMethod) || 'Не выбрана'}`}
              color="success"
              variant="outlined"
              size="small"
            />
          </Box>
        }>
          <Tabs
            value={comparisonTab}
            onChange={(_, v) => setComparisonTab(v)}
            sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}
          >
            <Tab
              {...getPriorityTabProps("Метод 1 (НПТ)", "low-d", priorityMethod)}
            />

            {/* Оптимальная (ВПТ) */}
            <Tab
              {...getPriorityTabProps("Метод 2 (ВПТ)", "high-d", priorityMethod)}
            />

            {/* Оптимальная (СПТ) */}
            <Tab
              {...getPriorityTabProps("Метод 3 (СПТ)", "mixed-d", priorityMethod)}
            />


          </Tabs>

          {comparisonData ? (
            <Stack spacing={3}>
              {/* График: Время маршрута по таксонам */}
              <Box>
                <Typography variant="subtitle2" mb={1} color="text.secondary">
                  Время маршрута по таксонам (Метод {comparisonTab + 1})
                </Typography>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart margin={{ top: 4, right: 24, left: 0, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="name"
                      type="category"
                      allowDuplicatedCategory={false}
                      label={{
                        value: "Точка маршрута",
                        position: "insideBottom",
                        offset: -2,
                      }}
                    />
                    <YAxis
                      label={{
                        value: "Время, с",
                        angle: -90,
                        position: "insideLeft",
                        offset: 10,
                      }}
                    />
                    <RechartsTooltip
                      formatter={(v: number) => [`${v} с`, ""]}
                    />
                    <Legend verticalAlign="top" />
                    {taxonChartData.map((t) => (
                      <Line
                        key={t.label}
                        data={t.data}
                        dataKey="time"
                        name={t.label}
                        stroke={t.color}
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        activeDot={{ r: 5 }}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            </Stack>
          ) : (
            <Placeholder label="Нет данных" />
          )}
        </SectionBox>

        <Box height="15px" />
      </Stack>
    </PageContainer >
  );
};

// ─── Обёртка секции ───────────────────────────────────────────────────────────

function SectionBox({
  title,
  children,
}: {
  title: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Stack
      spacing={2}
      sx={{
        borderColor: "divider",
        borderWidth: 1,
        borderStyle: "solid",
        borderRadius: 1,
        p: 2,
      }}
    >
      {typeof title === 'string' ? (
        <Typography variant="h6">{title}</Typography>
      ) : (
        title
      )}
      {children}
    </Stack>
  );
}

export default FlightSchemaPage;