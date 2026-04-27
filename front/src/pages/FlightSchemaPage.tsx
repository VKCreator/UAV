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
} from "@mui/material";
import { IconButton, Tooltip } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import FavoriteIcon from '@mui/icons-material/Favorite';

import PageContainer from "../components/layout/PageContainer";
import { ExifData } from "../types/common.types";
import { DroneParams, Weather } from "../types/uav.types";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import SceneShower from "../features/trajectory/components/SceneShower";
import { Point, Polygon } from "../types/scene.types";
import { Opt1TrajectoryData } from "../types/optTrajectory.types";
import SceneViewer from "../features/storyboard/components/SceneStoryboardViewer";
import { Storyboards } from "../types/storyboards.types";
import { HelpIconTooltip } from "../components/ui/HelpIconTooltip";
import StoryboardTimeline from "../features/storyboard/components/StoryboardTimeline";

import { DateToPrettyLocalDateTime } from "../utils/dateUtils";

import ScenePreview from "../features/trajectory/components/ScenePreview";
import useImage from "use-image";
import { getMethodFullRussianFromEnglish } from "../utils/optNames";
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

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
        border: "1px dashed",
        borderColor: "divider",
        borderRadius: 1,
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
  const s = Math.round(sec % 60);
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

// Цвета таксонов (должны совпадать со SceneEditor)
const TAXON_COLORS = [
  "#65b9f7",
  "#ff6b6b",
  "#66a9ff",
  "#ffdd57",
  "#9e69c4",
  "#64f3f1",
  "#f59fe1",
  "#f4e24d",
  "#e38b5a",
  "#7a9f60",
];

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

  // ── Хелпер для выбора данных оптимизации ────────────────────────────────
  const getOptimizationData = (tab: number): Opt1TrajectoryData | null => {
    if (tab === 0) return trajectoryData;
    if (tab === 1) return trajectoryData2;
    if (tab === 2) return trajectoryData3;
    return null;
  };

  const currentOptimizationData = getOptimizationData(optimizationTab);
  const comparisonData = getOptimizationData(comparisonTab);

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

  const [expanded, setExpanded] = React.useState<string | false>('panel1');

  const handleChange =
    (panel: string) => (event: React.SyntheticEvent, newExpanded: boolean) => {
      setExpanded(newExpanded ? panel : false);
    };

const formatPoint = (p: number[]) => `(${p[0].toFixed(1)} м, ${p[1].toFixed(1)} м)`;

  // ─────────────────────────────────────────────────────────────────────────

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
              {`Автор: ${author.last_name} ${author.first_name[0]}. ${author.middle_name[0]}.`}
            </Typography>
          </Box>
        </Box>
      </Box>

      <Stack spacing={4}>
        {/* ═══════════════════════════════════════════════════════════════════
            1. Информация о базовом слое
        ═══════════════════════════════════════════════════════════════════ */}
        <SectionBox title="Информация о базовом слое">
          <Stack direction="row" spacing={2}>
            <Box
              flex={1}
              sx={{
                borderRadius: 1,
                height: 300,
                backgroundColor: "#D3D3D399",
              }}
            >
              {imageData ? (
                <img
                  src={imageData.imageUrl}
                  alt="Фото базового слоя"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                  }}
                />
              ) : (
                <Placeholder label="Нет данных" />
              )}
            </Box>

            <Box flex={1}>
              <Paper
                elevation={1}
                variant="outlined"
                sx={{ p: 2, height: "100%", background: "transparent" }}
              >
                <Stack spacing={2} height="100%">
                  <Typography variant="subtitle1">
                    Метаданные изображения
                  </Typography>
                  {hasExifData ? (
                    <Grid container spacing={10} height="100%">
                      <Grid size={{ xs: 6 }}>
                        <Box
                          display="flex"
                          flexDirection="column"
                          height="100%"
                          justifyContent="space-between"
                          gap={1}
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
                        </Box>
                      </Grid>
                      <Grid size={{ xs: 6 }}>
                        <Box
                          display="flex"
                          flexDirection="column"
                          height="100%"
                          justifyContent="space-between"
                          gap={1}
                        >
                          <Typography variant="body2">
                            <strong>Модель:</strong>{" "}
                            {renderValue(exifData[0]?.model)}
                          </Typography>
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
                        </Box>
                      </Grid>
                    </Grid>
                  ) : (
                    <Placeholder label="Нет данных" />
                  )}
                </Stack>
              </Paper>
            </Box>
          </Stack>
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
        <SectionBox title="Пользовательская траектория">
          <Stack direction="row" spacing={2}>
            {/* Сцена */}
            <Box
              display="flex"
              flex={1}
              minHeight={340}
              sx={{ borderRadius: 2, overflow: "hidden", backgroundColor: "#F2F2F2", justifyContent: "center", alignItems: "center" }}
            >
              {imageData ? (
                <ScenePreview
                  {...commonProps}
                  trajectoryData={null}
                  showUserTrajectory={true}
                  showTaxonTrajectory={false}
                  isLoading={false}
                />
              ) : (
                <Placeholder label="Нет данных" />
              )}
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
              <Typography variant="h6">Оптимизация траектории</Typography>
              <Chip
                label={`Приоритетная траектория: ${getMethodFullRussianFromEnglish(priorityMethod) || 'Не выбран'}`}
                color="primary"
                variant="outlined"
                size="small"
              />
            </Box>
          }
        >
          <Tabs
            value={optimizationTab}
            onChange={(_, v) => setOptimizationTab(v)}
            sx={{ borderBottom: 1, borderColor: "divider" }}
          >
            <Tab label="Метод 1 (НПТ)" sx={{
              ...(priorityMethod === "low-d" && {
                color: "primary.dark",
                fontWeight: 700
              })
            }} />
            <Tab label="Метод 2 (ВПТ)" sx={{
              ...(priorityMethod === "high-d" && {
                color: "primary.dark",
                fontWeight: 700
              })
            }} />
            <Tab label="Метод 3 (СПТ)" sx={{
              ...(priorityMethod === "mixed-d" && {
                color: "primary.dark",
                fontWeight: 700
              })
            }} />
          </Tabs>

          <Box mt={2} minHeight={400} maxHeight={400}>
            {/* Отрисовка активной вкладки оптимизации */}
            {currentOptimizationData ? (
              <Stack direction="row" spacing={2}>
                {/* Сцена */}
                <Box
                  flex={1}
                  height={400}
                  sx={{ borderRadius: 2, overflow: "hidden" }}
                >
                  {imageData ? (
                    <SceneShower
                      imageData={imageData}
                      droneParams={droneParams}
                      points={points}
                      obstacles={obstacles}
                      trajectoryData={currentOptimizationData}
                      showView={() => { }}
                      ref={null}
                      showGrid={true}
                      showUserTrajectory={false}
                      showObstacles={true}
                      showTaxonTrajectory={true}
                      flightLineY={flightLineY ?? 0}
                      weatherConditions={weatherConditions}
                    />
                  ) : (
                    <Placeholder label="Нет изображения" />
                  )}
                </Box>

                {/* Метрики (логика та же, но берем из currentOptimizationData) */}
                <Box
                  flex={1}
                  component={Paper}
                  elevation={1}
                  variant="outlined"
                  sx={{
                    p: 2, background: "transparent", height: 400, // Фиксированная высота
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden'
                  }}
                >
                  <Stack spacing={1}> {/* Stack для отступа между двумя аккордеонами */}

                    {/* 1. Результаты оптимизации */}
                    <Accordion defaultExpanded={true} expanded={expanded === 'panel1'} onChange={handleChange('panel1')} elevation={0}
                      sx={{
                        mt: 1,
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
                        overflowY: 'scroll', // Включаем скролл
                        maxHeight: 230,   // Максимальная высота контента (подберите нужную цифру)
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
                        overflowY: 'scroll', // Включаем скролл
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

                  </Stack>


                </Box>
              </Stack>
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
                color="primary"
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
            <Tab label="Оптимальная (НПТ)" sx={{
              ...(priorityMethod === "low-d" && {
                color: "primary.dark",
                fontWeight: 700
              })
            }} />
            <Tab label="Оптимальная (ВПТ)" sx={{
              ...(priorityMethod === "high-d" && {
                color: "primary.dark",
                fontWeight: 700
              })
            }} />
            <Tab label="Оптимальная (СПТ)" sx={{
              ...(priorityMethod === "mixed-d" && {
                color: "primary.dark",
                fontWeight: 700
              })
            }} />
            {/* <Tab label="Точечная" disabled={!storyboardsData?.point?.applied} />
            <Tab label="Рекомендуемая" disabled={!storyboardsData?.recommended?.applied} />
            <Tab label="Оптимальная (НПТ)" disabled={!storyboardsData?.optimal?.applied} />
            <Tab label="Оптимальная (ВПТ)" disabled={!storyboardsData?.optimal_big_density?.applied} />
            <Tab label="Оптимальная (Комби)" disabled={!storyboardsData?.optimal_combi?.applied} /> */}
          </Tabs>

          <Box mt={2} height={400}>

            {/* ── Точечная ── */}
            {storyboardTab === 0 && storyboardsData?.point?.applied && (
              <Box display="flex" flexDirection="row" gap={2} height="100%">
                <Box flex={0.5} minHeight={400} maxHeight={400} minWidth={550} justifyContent="center" alignItems="center" display="flex" sx={{ background: "#D3D3D399", borderRadius: 1, overflow: "hidden" }}>
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
                <Box flex={1} p={2} borderRadius={1} component={Paper} variant="outlined" display="flex" flexDirection="column" justifyContent="space-between" overflow="auto" sx={{ background: "transparent" }}>
                  <Stack spacing={2}>
                    <Typography variant="subtitle1">Свойства раскадровки</Typography>
                    <StoryboardMetrics data={storyboardsData.point} />
                  </Stack>
                  <Box sx={{ overflowX: "auto", overflowY: "hidden", mt: 2 }}>
                    <StoryboardTimeline frames={framesUrlsPointBased ?? []} />
                  </Box>
                </Box>
              </Box>
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
          </Box>
        </SectionBox>

        <Divider />

        {/* ═══════════════════════════════════════════════════════════════════
            7. Сравнение оптимизаций
        ═══════════════════════════════════════════════════════════════════ */}
        <SectionBox title="Сравнение оптимизаций">
          <Tabs
            value={comparisonTab}
            onChange={(_, v) => setComparisonTab(v)}
            sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}
          >
            <Tab label="Метод 1 (НПТ)" />
            <Tab label="Метод 2 (ВПТ)" />
            <Tab label="Метод 3 (СПТ)" />
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