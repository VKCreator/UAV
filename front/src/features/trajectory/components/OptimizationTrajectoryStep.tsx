import React, { useRef } from "react";
import {
  Box,
  Typography,
  Paper,
  Grid,
  IconButton,
  Divider,
  Tooltip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  RadioGroup,
  FormControlLabel,
  Radio,
  TextField,
  Checkbox,
  Button,
  Tabs,
  Tab,
  Chip,
  Dialog,
  DialogContent,
  Alert,
  CircularProgress,
  LinearProgress
} from "@mui/material";

import { Menu, MenuItem, ListItemText, ListItemIcon } from '@mui/material';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import GridOnIcon from '@mui/icons-material/GridOn';
import CropOriginalIcon from '@mui/icons-material/CropOriginal';

import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import VisibilityIcon from "@mui/icons-material/Visibility";
import DownloadIcon from "@mui/icons-material/Download";
import ViewListIcon from "@mui/icons-material/ViewList";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import DeleteIcon from "@mui/icons-material/Delete";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import SettingsIcon from "@mui/icons-material/Settings";
import ManageSearchIcon from "@mui/icons-material/ManageSearch";
import InfoIcon from "@mui/icons-material/Info";
import FlightSchemaLegendDialog from "./FlightSchemaLegendDialog";
import BrushIcon from '@mui/icons-material/Brush';

import type { Point, Polygon, ImageData } from "../../../types/scene.types";
import type {
  Weather,
  DroneParams,
  FlightSettings,
} from "../../../types/uav.types";
import type { Storyboard, Storyboards } from "../../../types/storyboards.types";

import { HelpIconTooltip } from "../../../components/ui/HelpIconTooltip";
import { DeleteButton } from "../../../components/ui/DeleteButton";
import FlightSettingsDialog from "./FlightSettingsDialog";
import OptimizationDetailDialog from "./OptimizationDetailDialog";

import useImage from "use-image";
import useNotifications from "../../../hooks/useNotifications/useNotifications";

import SceneEditor from "./SceneEditor";
import StoryboardEditor from "./StoryboardEditor";
import ScenePreview from "./ScenePreview";
import { downloadScene } from "../utils/exportSceneImage";

import { trajectoryApi } from "../../../api/trajectory.api";
import { useDialogs } from '../../../hooks/useDialogs/useDialogs';
import { SettingsDialog } from "./SettingsSceneDialog";
interface OptimizationTrajectoryStepProps {
  imageData: ImageData;

  points: Point[];
  setPoints: React.Dispatch<React.SetStateAction<Point[]>>;

  obstacles: Polygon[];
  setObstacles: React.Dispatch<React.SetStateAction<Polygon[]>>;

  droneParams: DroneParams;
  setDroneParams: React.Dispatch<React.SetStateAction<DroneParams>>;

  trajectoryData: any;
  setTrajectoryData: (data: any) => void;

  trajectoryData2: any;
  setTrajectoryData2: (data: any) => void;

  trajectoryData3: any;
  setTrajectoryData3: (data: any) => void;

  weatherConditions: Weather;
  setWeatherConditions: (data: Weather) => void;

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

  showNavTriangles: any;
  setShowNavTriangles: React.Dispatch<React.SetStateAction<any>>;

  flightLineY: number;

  optimizationState: any;
  setOptimizationState: (data: any) => void;
}

// 50 таксонов и повтор
const colors = [
  "#65b9f7",
  "#ff6b6b",
  "#66a9ff",
  "#ffdd57",
  "#9e69c4",
  "#64f3f1",
  "#f59fe1",
  "#f4e24d",
  "#e38b5a",
  "#ecb385",
  "#7a9f60",
  "#a2b9d1",
  "#d1d1d1",
  "#b8a25b",
  "#4ecdc4",
  "#ff8c42",
  "#6c5ce7",
  "#fd79a8",
  "#00b894",
  "#e17055",
  "#74b9ff",
  "#fdcb6e",
  "#a29bfe",
  "#e84393",
  "#55efc4",
  "#fab1a0",
  "#81ecec",
  "#ff7675",
  "#dfe6e9",
  "#636e72",
  "#f8a5c2",
  "#7ed6df",
  "#f0932b",
  "#eb4d4b",
  "#22a6b3",
  "#be2edd",
  "#bfb6fd",
  "#aaabbf",
  "#badc58",
  "#c7ecee",
  "#dff9fb",
  "#f6e58d",
  "#ffbe76",
  "#ff7979",
  "#7ed56f",
  "#3d7ea6",
  "#e056a0",
  "#b33771",
  "#58b19f",
  "#9b59b6"
];

const OptimizationTrajectoryStep: React.FC<OptimizationTrajectoryStepProps> = ({
  imageData,
  points,
  obstacles,
  droneParams,
  setDroneParams,
  trajectoryData,
  setTrajectoryData,
  trajectoryData2,
  setTrajectoryData2,
  trajectoryData3,
  setTrajectoryData3,
  weatherConditions,
  setWeatherConditions,
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
  flightLineY,
  optimizationState,
  setOptimizationState,
  showNavTriangles,
  setShowNavTriangles
}) => {
  const { confirm } = useDialogs();
  const notifications = useNotifications();
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = React.useState({ width: 550, height: 400 });
  // Размеры для превью (как указано в условии)
  const PREVIEW_WIDTH = containerSize.width;
  const PREVIEW_HEIGHT = containerSize.height;

  const [activeImage, setActiveImage] = React.useState(0);
  const [image] = useImage(imageData.imageUrl);
  const [showView, setShowView] = React.useState(false);
  const [showStoryboardEditor, setShowStoryboardEditor] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const [openOptimizationDetailDialog, setOpenOptimizationDetailDialog] =
    React.useState(false);

  const [isLegendOpen, setIsLegendOpen] = React.useState(false);
  const [isLoadingUserScene, setLoadingUserScene] = React.useState(false);

  const [openSettings, setOpenSettings] = React.useState(false);

  const updateOptimization = (type, updates) => {
    setOptimizationState(prev => ({
      ...prev,
      [type]: { ...prev[type], ...updates }
    }));
  };

  const isAllNotCompleted = React.useMemo(() => {
    return Object.entries(optimizationState).every(([key, item]) => item.status !== 'completed');
  }, [optimizationState]);

  const isAllCompleted = React.useMemo(() => {
    return Object.entries(optimizationState).every(([key, item]) => item.status === 'completed');
  }, [optimizationState]);

  const isAnyCompleted = React.useMemo(() => {
    return Object.entries(optimizationState).some(([key, item]) => item.status === 'completed');
  }, [optimizationState]);

  const isAnyRunning = React.useMemo(() => {
    return Object.entries(optimizationState).some(([key, item]) => item.status === 'running');
  }, [optimizationState]);

  const isAnyOptimizationSelected = Object.values(optimizationState).some(item => item.flag);

  const { isAllStoryboardCompleted, isAllStoryboardNotCompleted } = React.useMemo(() => {
    // Определяем маппинг ключей
    const mappings = [
      { optKey: 'small', sbKey: 'optimal' },             // Метод 1 (НПТ)
      { optKey: 'large', sbKey: 'optimal_big_density' }, // Метод 2 (ВПТ)
      { optKey: 'combi', sbKey: 'optimal_combi' },        // Метод 3 (СПТ)
    ];

    // 1. Проверка: Все ВЫПОЛНЕННЫЕ оптимизации имеют раскадровки
    const allCompleted = mappings.every(({ optKey, sbKey }) => {
      const optStatus = optimizationState[optKey].status;

      // Если оптимизация еще не выполнена, она не учитывается в "All"
      if (optStatus !== 'completed') return true;

      // Если оптимизация выполнена, проверяем наличие раскадровки
      return storyboardsData[sbKey].applied === true;
    });

    // 2. Проверка: Все ВЫПОЛНЕННЫЕ оптимизации НЕ имеют раскадровок
    const allNotCompleted = mappings.every(({ optKey, sbKey }) => {
      const optStatus = optimizationState[optKey].status;

      // Если оптимизация еще не выполнена, она не учитывается
      if (optStatus !== 'completed') return true;

      // Если оптимизация выполнена, проверяем ОТСУТСТВИЕ раскадровки
      return storyboardsData[sbKey].applied === false;
    });

    return {
      isAllStoryboardCompleted: allCompleted,
      isAllStoryboardNotCompleted: allNotCompleted,
    };
  }, [optimizationState, storyboardsData]);


  const [isConsiderWeather, setConsiderWeather] = React.useState(weatherConditions.isUse);

  const [flightSettings, setFlightSettings] = React.useState<FlightSettings>({
    flightSpeed: droneParams.speed,
    batteryTime: droneParams.batteryTime,
    hoverTime: droneParams.hoverTime,
    windResistance: droneParams.windResistance,
    considerObstacles: droneParams.considerObstacles,
    windSpeed: weatherConditions.windSpeed,
    windDirection: weatherConditions.windDirection,
    useWeatherApi: weatherConditions.useWeatherApi,
    lat: weatherConditions.position.lat,
    lon: weatherConditions.position.lon,
    model: droneParams.model,
  });

  const sceneUserTrajectoryShower = useRef<any>(
    null,
  );

  const width_m = droneParams.frameWidthBase; // длина изображения в метрах
  const height_m = droneParams.frameHeightBase; // высота изображения в метрах

  const getPoints = () => {
    if (activeImage == 0) return points;

    return [];
  };

  const getTrajectoryData = () => {
    if (activeImage == 1) return trajectoryData;
    if (activeImage == 2) return trajectoryData2;
    if (activeImage == 3) return trajectoryData3;

    return null;
  };

  const setLoading = (loading: boolean) => {
    if (activeImage == 0)
      setLoadingUserScene(loading);
    if (activeImage == 1)
      updateOptimization("small", { isLoading: loading });
    if (activeImage == 2)
      updateOptimization("large", { isLoading: loading });
    if (activeImage == 3)
      updateOptimization("combi", { isLoading: loading });
  }

  const isAnyLoading = React.useMemo(() => {
    return (
      isLoadingUserScene ||
      optimizationState.small.isLoading ||
      optimizationState.large.isLoading ||
      optimizationState.combi.isLoading
    );
  }, [
    isLoadingUserScene,
    optimizationState.small.isLoading,
    optimizationState.large.isLoading,
    optimizationState.combi.isLoading,
  ]);

  const handleClearTrajectoryData = async () => {

    const confirmed = await confirm("Вы действительно хотите очистить результаты оптимизаций?", {
      title: "Подтверждение",
      okText: "Да",
      cancelText: "Нет",
    });

    if (!confirmed) return;

    setTrajectoryData(null);
    setTrajectoryData2(null);
    setTrajectoryData3(null);

    updateOptimization("small", { isLoading: false, status: "idle" });
    updateOptimization("large", { isLoading: false, status: "idle" });
    updateOptimization("combi", { isLoading: false, status: "idle" });
  };

  const handleRunOptimization = async () => {
    if (!image || points.length === 0) return;

    const meterPerPixelX = width_m / image.width;
    const meterPerPixelY = height_m / image.height;
    const GRID_COLS = droneParams.frameWidthBase / droneParams.frameWidthPlanned;
    const GRID_ROWS = droneParams.frameHeightBase / droneParams.frameHeightPlanned;

    const pointsInMeters = points.map((p) => ({
      x: p.x * meterPerPixelX,
      y: (image.height - p.y) * meterPerPixelY,
    }));

    // Создаём массив промисов для запуска
    const promises = [];

    if (optimizationState.small.flag) {
      const payload = {
        width_m,
        height_m,
        lineY: (image.height - flightLineY) * meterPerPixelY,
        points: pointsInMeters,
        speed: droneParams.speed,
        hoverTime: droneParams.hoverTime,
        batteryTime: droneParams.batteryTime,
        obstacles: [],
        windResistance: droneParams.windResistance,
        windSpeed: weatherConditions.windSpeed,
        windDirection: weatherConditions.windDirection,
        isUseWeather: weatherConditions.isUse
      };
      let isError = false;

      // Запускаем small оптимизацию
      const smallPromise = (async () => {
        try {
          setActiveImage(1);
          setActiveTrajectory(1);

          // setOptimizationStatus(prev => ({ ...prev, small: 'running' }));
          // setLoadingOptimization(prev => ({ ...prev, small: true }));

          updateOptimization("small", { isLoading: true, status: "running" });

          const data = await trajectoryApi.calculateMethod1(payload);
          console.log("Ответ API (small):", data);

          const preparedData = {
            ...data,
            B: data.B.map((taxon: any, index: any) => ({
              ...taxon,
              color: colors[index % colors.length],
            })),
            C: data.C,
          };

          setTrajectoryData(preparedData);
        } catch (err) {
          console.error("Ошибка small оптимизации:", err);
          notifications.show(`Ошибка оптимизации НПТ: ${err}`, { severity: "error", autoHideDuration: 3000 });
          updateOptimization("small", { isLoading: false, status: "error" });
          isError = true;
        } finally {
          // setOptimizationStatus(prev => ({ ...prev, small: 'completed' }));
          // setLoadingOptimization(prev => ({ ...prev, small: false }));

          // if (optimizationState.small.status != "idle")
          if (!isError)
            updateOptimization("small", { isLoading: false, status: "completed" });

          setActiveImage(1);
          setActiveTrajectory(1);

        }
      })();

      promises.push(smallPromise);
    }

    if (optimizationState.large.flag) {
      const payload = {
        width_m,
        height_m,
        n_cols: GRID_COLS,
        n_rows: GRID_ROWS,
        lineY: (image.height - flightLineY) * meterPerPixelY,
        points: pointsInMeters,
        speed: droneParams.speed,
        hoverTime: droneParams.hoverTime,
        batteryTime: droneParams.batteryTime,
        obstacles: [],
        windResistance: droneParams.windResistance,
        windSpeed: weatherConditions.windSpeed,
        windDirection: weatherConditions.windDirection,
        isUseWeather: weatherConditions.isUse
      };

      let isError = false;
      // Запускаем large оптимизацию
      const largePromise = (async () => {
        try {
          setActiveImage(2);
          setActiveTrajectory(2);

          // setOptimizationStatus(prev => ({ ...prev, large: 'running' }));
          // setLoadingOptimization(prev => ({ ...prev, large: true }));
          updateOptimization("large", { isLoading: true, status: "running" });

          const data = await trajectoryApi.calculateMethod2(payload);
          console.log("Ответ API (large):", data);

          const preparedData = {
            ...data,
            B: data.B.map((taxon: any, index: any) => ({
              ...taxon,
              color: colors[index % colors.length],
            })),
            C: data.C,
          };

          setTrajectoryData2(preparedData);
        } catch (err) {
          console.error("Ошибка large оптимизации:", err);
          notifications.show(`Ошибка оптимизации ВПТ: ${err}`, { severity: "error", autoHideDuration: 3000 });
          updateOptimization("large", { isLoading: false, status: "error" });
          isError = true;
        } finally {

          if (!isError)
            updateOptimization("large", { isLoading: false, status: "completed" });

          // setOptimizationStatus(prev => ({ ...prev, large: 'completed' }));
          // setLoadingOptimization(prev => ({ ...prev, large: false }));
          setActiveImage(2);
          setActiveTrajectory(2);

        }
      })();

      promises.push(largePromise);
    }

    if (optimizationState.combi.flag) {
      const payload = {
        width_m,
        height_m,
        n_cols: GRID_COLS,
        n_rows: GRID_ROWS,
        lineY: (image.height - flightLineY) * meterPerPixelY,
        points: pointsInMeters,
        speed: droneParams.speed,
        hoverTime: droneParams.hoverTime,
        batteryTime: droneParams.batteryTime,
        obstacles: [],
        windResistance: droneParams.windResistance,
        windSpeed: weatherConditions.windSpeed,
        windDirection: weatherConditions.windDirection,
        isUseWeather: weatherConditions.isUse
      };

      let isError = false;
      // Запускаем large оптимизацию
      const combiPromise = (async () => {
        try {
          setActiveImage(3);
          setActiveTrajectory(3);

          // setOptimizationStatus(prev => ({ ...prev, large: 'running' }));
          // setLoadingOptimization(prev => ({ ...prev, large: true }));
          updateOptimization("combi", { isLoading: true, status: "running" });

          const data = await trajectoryApi.calculateMethod3(payload);
          console.log("Ответ API (combi):", data);

          const preparedData = {
            ...data,
            B: data.B.map((taxon: any, index: any) => ({
              ...taxon,
              color: colors[index % colors.length],
            })),
            C: data.C,
          };

          setTrajectoryData3(preparedData);
        } catch (err) {
          console.error("Ошибка combi оптимизации:", err);
          notifications.show(`Ошибка оптимизации СПТ: ${err}`, { severity: "error", autoHideDuration: 3000 });
          updateOptimization("combi", { isLoading: false, status: "error" });
          isError = true;
        } finally {

          if (!isError)
            updateOptimization("combi", { isLoading: false, status: "completed" });

          setActiveImage(3);
          setActiveTrajectory(3);

        }
      })();

      promises.push(combiPromise);
    }

    // Ждём завершения всех запущенных оптимизаций
    await Promise.all(promises);
  };

  const handleStoryboard = () => {
    setShowStoryboardEditor(true);
  };

  const trajectoryTitles = [
    "Пользовательская",
    "Оптимум (НПТ)",
    "Оптимум (ВПТ)",
    "Оптимум (СПТ)"
  ];


  const [activeTrajectory, setActiveTrajectory] = React.useState(0);

  const handleNext = () => {
    setActiveTrajectory((prev) => {
      const next = (prev + 1) % trajectoryTitles.length;
      return next;
    });
    setActiveImage((prev) => (prev + 1) % trajectoryTitles.length);
  };

  const handlePrev = () => {
    setActiveTrajectory((prev) => {
      const prev_ = (prev - 1 + trajectoryTitles.length) % trajectoryTitles.length;
      return prev_;
    });
    setActiveImage((prev) => (prev - 1 + trajectoryTitles.length) % trajectoryTitles.length);
  };

  const [anchorEl, setAnchorEl] = React.useState(null);
  const openMenu = Boolean(anchorEl);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleDownloadScene = async () => {
    setLoading(true);

    let params = {
      image: image!,
      width_m: droneParams.frameWidthBase,
      height_m: droneParams.frameHeightBase,
      GRID_COLS: droneParams.frameWidthBase / droneParams.frameWidthPlanned,
      GRID_ROWS: droneParams.frameHeightBase / droneParams.frameHeightPlanned,

      flightLineY: flightLineY,
      obstacles: obstacles,
      points: points,
      trajectoryData: getTrajectoryData(),

      showGrid: true,
      showObstacles: true,
      showUserTrajectory: activeImage == 0,
      showTaxonTrajectory: true,
      showNavTriangles: true, // Включаем треугольники
      showFullNavTriangles: showNavTriangles,

      PREVIEW_WIDTH: 500,  // Размер вашего превью
      PREVIEW_HEIGHT: 400,
    }

    await downloadScene(
      { ...params, setLoading },
      "trajectory_schema.jpeg",
    );
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

      setLoading(true);

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

      notifications.show("Тепловая карта сформирована", {
        severity: "success",
        autoHideDuration: 3000,
      })
    } catch (e) {
      console.error("Ошибка при получении тепловой карты:", e);
      notifications.show("Ошибка построения тепловой карты", {
        severity: "error",
        autoHideDuration: 3000,
      })
      // здесь можно показать toast/alert юзеру
    }
    finally {
      setLoading(false);
    }
  };

  const handleDownload = (type) => {
    // Логика скачивания в зависимости от type
    if (type === 'schema') {
      handleDownloadScene()
    } else if (type === 'heatmap') {
      handleDownloadHeatmap()
    }
    handleClose();
  };

  const getChipProps = (status) => {
    switch (status) {
      case 'running':
        return { label: 'В процессе', color: 'warning', icon: <CircularProgress size={12} /> };
      case 'completed':
        return { label: 'Выполнено', color: 'success' };
      case 'error':
        return { label: 'Ошибка', color: 'error' };
      default:
        return { label: 'Не запущено', color: 'error' };
    }
  };


  const renderImage = (index: number) => {
    // Общие параметры для всех вариантов
    const commonProps = {
      imageData,
      droneParams,
      points,
      obstacles,
      flightLineY,
      weatherConditions,
      onShowView: () => setShowView(true),
      stageRef: sceneUserTrajectoryShower, // Передаем общий ref (если логика позволяет)
      // Переменные отрисовки (должны быть определены в родительском компоненте)
      image,
    };

    switch (index) {
      case 1:
        return (
          <ScenePreview
            {...commonProps}
            trajectoryData={null}
            showUserTrajectory={true}
            showTaxonTrajectory={false}
            isLoading={isLoadingUserScene}
            PREVIEW_WIDTH={PREVIEW_WIDTH - 20}
            PREVIEW_HEIGHT={PREVIEW_HEIGHT - 20}
          />
        );
      case 2:
        return (
          <ScenePreview
            {...commonProps}
            trajectoryData={trajectoryData}
            showUserTrajectory={false}
            showTaxonTrajectory={true}
            isLoading={optimizationState.small.isLoading}
            PREVIEW_WIDTH={PREVIEW_WIDTH - 20}
            PREVIEW_HEIGHT={PREVIEW_HEIGHT - 20}
            showNavigationTriangles={showNavTriangles}

          />
        );
      case 3:
        return (
          <ScenePreview
            {...commonProps}
            trajectoryData={trajectoryData2}
            showUserTrajectory={false}
            showTaxonTrajectory={true}
            isLoading={optimizationState.large.isLoading}
            PREVIEW_WIDTH={PREVIEW_WIDTH - 20}
            PREVIEW_HEIGHT={PREVIEW_HEIGHT - 20}
            showNavigationTriangles={showNavTriangles}

          />
        );
      case 4:
        return (
          <ScenePreview
            {...commonProps}
            trajectoryData={trajectoryData3}
            showUserTrajectory={false}
            showTaxonTrajectory={true}
            isLoading={optimizationState.combi.isLoading}
            PREVIEW_WIDTH={PREVIEW_WIDTH - 20}
            PREVIEW_HEIGHT={PREVIEW_HEIGHT - 20}
            showNavigationTriangles={showNavTriangles}

          />
        );
      default:
        return <Typography>Контент для изображения {index}</Typography>;
    }
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

  return (
    <Box sx={{ p: 2 }}>
      <Grid container spacing={3}>
        {/* Левая часть — схема */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper
            elevation={0}
            sx={{
              p: 2,
              border: "1px solid #e0e0e0",
              borderRadius: 1,
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Заголовок */}
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                mb: 1,
              }}
            >
              <Typography variant="h6">
                {trajectoryTitles[activeImage]}
              </Typography>

              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <Tooltip title="Просмотр схемы" enterDelay={500}>
                  <IconButton color="primary" onClick={() => setShowView(true)}>
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

                {/* <Tooltip title="Скачать схему" enterDelay={500}>
                  <IconButton color="primary" onClick={handleDownloadScene}>
                    <DownloadIcon />
                  </IconButton>
                </Tooltip> */}

                <>
                  <Tooltip title="Скачать" enterDelay={500}>
                    <IconButton
                      color="primary"
                      onClick={handleClick}
                      sx={{ gap: 0.5 }}
                    >
                      <DownloadIcon fontSize="small" />
                      <ArrowDropDownIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>

                  <Menu
                    anchorEl={anchorEl}
                    open={openMenu}
                    onClose={handleClose}
                    anchorOrigin={{
                      vertical: 'bottom',
                      horizontal: 'center',
                    }}
                    transformOrigin={{
                      vertical: 'top',
                      horizontal: 'center',
                    }}
                  >
                    <MenuItem onClick={() => handleDownload('schema')}>
                      <ListItemIcon>
                        <CropOriginalIcon fontSize="small" />
                      </ListItemIcon>
                      <ListItemText>Схема</ListItemText>
                    </MenuItem>
                    {(activeImage == 0 || activeImage == 3) && (
                      <MenuItem onClick={() => handleDownload('heatmap')} disabled={activeImage == 3 && trajectoryData3 == null}>
                        <ListItemIcon>
                          <GridOnIcon fontSize="small" />
                        </ListItemIcon>
                        <ListItemText>Тепловая карта</ListItemText>
                      </MenuItem>
                    )}
                  </Menu>
                </>

                <Divider orientation="vertical" flexItem />
                {/* Настройки отображения */}
                <Tooltip title="Настройки отображения" enterDelay={500}>
                  <IconButton
                    color="primary"
                    onClick={() => setOpenSettings(true)}
                    aria-label="Настройки"
                  >
                    <BrushIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <SettingsDialog
                  open={openSettings}
                  onClose={() => setOpenSettings(false)}
                  showNavigationTriangles={showNavTriangles}
                  setShowNavigationTriangles={setShowNavTriangles}
                />
              </Box>
            </Box>

            <Divider />

            {/* Контент */}
            <Box
              ref={containerRef}
              sx={{
                width: "100%",
                height: "100%",
                maxHeight: "500px",
                minHeight: "300px",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                mt: 1,
                position: "relative",
                overflow: "hidden",
              }}
            >
              <Box
                sx={{
                  cursor: "pointer",
                  width: "100%",
                  height: "100%",
                  p: "10px"
                }}
              >
                {renderImage(activeImage + 1)}
              </Box>
            </Box>

            {(isAnyLoading && <LinearProgress sx={{ ml: "10px", mr: "10px" }} color="primary" aria-label="Loading…" />)}

            {/* Добавьте этот блок после контейнера со сценой */}
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: 2,
                mt: 1,
                px: 2,
              }}
            >
              {/* Кнопка "Назад" */}
              <IconButton
                onClick={handlePrev}
                // disabled={activeTrajectory === 0}
                size="small"
                color="primary"

                sx={{
                  // border: "1px solid",
                  // borderColor: "divider",
                  "&:hover": {
                    backgroundColor: "action.hover",
                  },
                }}
              >
                <Typography sx={{ fontSize: "18px", lineHeight: 1 }}>❮</Typography>
              </IconButton>

              {/* Информация о текущей траектории */}
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  minWidth: "130px",
                  justifyContent: "center",
                }}
              >
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ whiteSpace: "nowrap", minWidth: "120px" }}
                >
                  Траектория: {activeTrajectory + 1} / {trajectoryTitles.length}
                </Typography>

              </Box>

              {/* Кнопка "Вперед" */}
              <IconButton
                onClick={handleNext}
                // disabled={activeTrajectory === trajectoryTitles.length - 1}
                size="small"
                color="primary"
                sx={{
                  // border: "1px solid",
                  // borderColor: "divider",
                  "&:hover": {
                    backgroundColor: "action.hover",
                  },
                }}
              >
                <Typography sx={{ fontSize: "18px", lineHeight: 1 }}>❯</Typography>
              </IconButton>
            </Box>
          </Paper>
        </Grid>

        {/* Правая часть — аккордеон */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Typography variant="h6" sx={{ mb: 1 }}>
            Порядок оптимизации траектории
          </Typography>

          {/* 1. Оптимизация */}
          <Accordion defaultExpanded>
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              sx={{ flexDirection: "row-reverse", gap: 1 }}
            >
              <Box
                display="flex"
                alignItems="center"
                justifyContent="space-between"
                width="100%"
              >
                {/* Левая часть: заголовок + help */}
                <Box display="flex" alignItems="center">
                  <Typography fontWeight={600}>
                    1. Оптимизация пользовательской траектории
                  </Typography>
                  <HelpIconTooltip title="На этом этапе выполняется оптимизация траектории, заданной пользователем, тремя методами." />
                </Box>

                {/* Правая часть: статус */}
                <Chip
                  label={
                    isAllCompleted ? "Выполнено"
                      : isAnyRunning ? "В процессе"
                        : isAnyCompleted ? "Частично"
                          : "Не запущено"
                  }
                  size="small"
                  color={
                    isAllCompleted ? "success"
                      : isAnyRunning ? "info"
                        : isAnyCompleted ? "warning"
                          : "error"
                  }
                  variant="outlined"
                  icon={isAnyRunning ? <CircularProgress size={12} /> : undefined}
                  sx={isAnyRunning ? { pl: 0.5 } : undefined}
                />
              </Box>
            </AccordionSummary>

            <AccordionDetails>
              <Typography variant="body2" color="text.secondary" mb={1.5}>
                Выберите один или несколько методов оптимизации.
              </Typography>

              <Paper
                variant="outlined"
                sx={{
                  p: 2,
                  bgcolor: 'background.default',
                  borderRadius: 2
                }}
              >

                <Typography variant="subtitle2" gutterBottom>
                  Методы оптимизации
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={optimizationState.small.flag}
                          onChange={(e) => {
                            updateOptimization('small', { flag: e.target.checked });
                          }}
                        />
                      }
                      label="Низкая плотность точек"
                      disabled={isAnyRunning}
                    />
                    <Tooltip title="Показать схему" arrow placement="left">

                      <Chip
                        {...getChipProps(optimizationState.small.status)}
                        size="small"
                        variant="outlined"
                        onClick={() => { setActiveImage(1); setActiveTrajectory(1); }}
                        sx={{
                          cursor: 'pointer',
                          ...(optimizationState.small.status == "running" ? { pl: 0.5 } : undefined)
                        }}
                      />
                    </Tooltip>

                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={optimizationState.large.flag}
                          onChange={(e) => updateOptimization('large', { flag: e.target.checked })}
                        />
                      }
                      label="Высокая плотность точек"
                      disabled={isAnyRunning}

                    />
                    <Tooltip title="Показать схему" arrow placement="left">

                      <Chip
                        {...getChipProps(optimizationState.large.status)}
                        size="small"
                        variant="outlined"
                        onClick={() => {
                          setActiveImage(2); setActiveTrajectory(2);
                        }}
                        sx={{
                          cursor: 'pointer',
                          ...(optimizationState.large.status == "running" ? { pl: 0.5 } : undefined)
                        }}
                      />
                    </Tooltip>

                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={optimizationState.combi.flag}
                          onChange={(e) => updateOptimization('combi', { flag: e.target.checked })}
                        />
                      }
                      label="Смешанная плотность точек"
                      disabled={isAnyRunning}

                    />
                    <Tooltip title="Показать схему" arrow placement="left">
                      <Chip
                        {...getChipProps(optimizationState.combi.status)}
                        size="small"
                        variant="outlined"
                        onClick={() => {
                          setActiveImage(3); setActiveTrajectory(3);
                        }}
                        sx={{
                          cursor: 'pointer',
                          ...(optimizationState.combi.status == "running" ? { pl: 0.5 } : undefined)
                        }}
                      />
                    </Tooltip>
                  </Box>
                </Box>
              </Paper>

              <FormControlLabel
                control={
                  <Checkbox
                    checked={isConsiderWeather}
                    onChange={(e) => {
                      setConsiderWeather(e.target.checked);
                      setWeatherConditions((prev: Weather) => ({
                        ...prev,
                        isUse: e.target.checked,
                      }));
                    }}
                  />
                }
                label="Учитывать погодные условия при построении маршрута"
                sx={{ mt: 1 }}
                disabled={isAnyRunning}
              />

              {weatherConditions.isUse && (
                weatherConditions.windSpeed > droneParams.windResistance ? (
                  <Alert severity="warning" sx={{ alignItems: "center", mt: 0.5, mb: 1.5 }}>
                    Скорость ветра ({weatherConditions.windSpeed.toFixed(1)} м/с) превышает максимальную
                    ветроустойчивость БПЛА ({droneParams.windResistance} м/с). Полёт может быть небезопасен.
                  </Alert>
                ) : (
                  <Alert severity="success" sx={{ alignItems: "center", mt: 0.5, mb: 1.5 }}>
                    Скорость ветра ({weatherConditions.windSpeed.toFixed(1)} м/с) в пределах нормы при
                    ветроустойчивости БПЛА {droneParams.windResistance} м/с.
                  </Alert>
                )
              )}

              {weatherConditions.isUse && weatherConditions.windSpeed >= droneParams.speed && (
                <Alert severity="warning" sx={{ alignItems: "center", mt: 1, mb: 1.5 }}>
                  Скорость ветра ({(weatherConditions.windSpeed).toFixed(1)} м/с) больше или равна установленной рабочей скорости БПЛА ({droneParams.speed} м/с). Точки могут быть недостижимы.
                </Alert>
              )}

              <Typography variant="body2" color="text.secondary" mt={1} mb={2}>
                Перед запуском оптимизации настройте параметры полёта.
              </Typography>


              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
                mt={1}
              >
                <Box display="flex" gap={1}>
                  {/* Левая кнопка: Запустить */}
                  <Button
                    variant="contained"
                    startIcon={<PlayArrowIcon />}
                    onClick={handleRunOptimization}
                    size="small"
                    sx={{
                      minWidth: 120,
                      textTransform: "none",
                    }}
                    disabled={!isAnyOptimizationSelected || isAnyRunning}
                  >
                    Запустить
                  </Button>

                  <Button
                    variant="outlined"
                    startIcon={<ManageSearchIcon />}
                    onClick={() => setOpenOptimizationDetailDialog(true)}
                    size="small"
                    sx={{
                      textTransform: "none",
                    }}
                    disabled={trajectoryData == null && trajectoryData2 == null && trajectoryData3 == null}
                  >
                    Детали оптимизации
                  </Button>
                </Box>

                <Box>
                  <Tooltip title="Параметры полёта">
                    <IconButton onClick={() => setOpen(true)} size="small"
                      disabled={isAnyRunning}
                    >
                      <SettingsIcon />
                    </IconButton>
                  </Tooltip>

                  <DeleteButton
                    onClick={handleClearTrajectoryData}
                    disabled={!isAnyCompleted || isAnyRunning}
                    tooltip="Очистить оптимизированные траектории"
                  />
                </Box>
              </Box>
            </AccordionDetails>
          </Accordion>

          {/* 2. Раскадровка */}
          <Accordion expanded={true}>
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              sx={{ flexDirection: "row-reverse", gap: 1 }}
            >
              <Box
                display="flex"
                alignItems="center"
                justifyContent="space-between"
                width="100%"
              >
                {/* Левая часть: заголовок + help */}
                <Box display="flex" alignItems="center">
                  <Typography fontWeight={600}>2. Раскадровка</Typography>
                </Box>


                {/* Правая часть: статус ЗДЕСЬ СДЕЛАТЬ ПРОВЕРКУ ВЫПОЛНЕНО НЕ ВЫПОЛНЕНО ЧАСТИЧНО и в кнопку далее тоже добавить запрет если нет раскадровки выполненной*/}
                <Chip
                  label={
                    isAllStoryboardCompleted && !isAllNotCompleted && !isAnyRunning ? "Выполнено"
                      : isAllStoryboardNotCompleted ? "Не выполнено"
                        : "Частично"
                  }
                  size="small"
                  color={
                    isAllStoryboardCompleted && !isAllNotCompleted && !isAnyRunning ? "success"
                      : isAllStoryboardNotCompleted ? "error"
                        : "warning"
                  }
                  variant="outlined"
                />
              </Box>
            </AccordionSummary>

            <AccordionDetails>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Раскадровка позволяет сформировать последовательность кадров
                полёта на основе выбранного типа раскадровки и траекторий.
              </Typography>

              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<ViewListIcon />}
                  onClick={handleStoryboard}
                  disabled={isAnyRunning}
                >
                  Раскадровать
                </Button>

                <Typography variant="caption" color="text.secondary">
                  Откроется полноэкранный режим
                </Typography>
              </Box>
            </AccordionDetails>
          </Accordion>
        </Grid>
      </Grid>

      <Dialog open={showView} onClose={() => setShowView(false)} fullScreen>
        <DialogContent sx={{ p: 0 }}>
          <SceneEditor
            onClose={() => setShowView(false)}
            imageData={imageData}
            droneParams={droneParams}
            sceneTitle="Просмотр схемы полёта"
            points={getPoints()}
            setPoints={() => { }}
            obstacles={obstacles}
            setObstacles={() => { }}
            trajectoryData={getTrajectoryData()}
            setTrajectoryData={setTrajectoryData}
            flightLineY={flightLineY}
            weatherConditions={weatherConditions}
          />
        </DialogContent>
      </Dialog>

      <Dialog
        open={showStoryboardEditor}
        onClose={() => setShowStoryboardEditor(false)}
        fullScreen
      >
        <DialogContent sx={{ p: 0 }}>
          <StoryboardEditor
            onClose={() => setShowStoryboardEditor(false)}
            imageData={imageData}
            points={points}
            obstacles={obstacles}
            trajectoryData={trajectoryData}
            trajectoryData2={trajectoryData2}
            trajectoryData3={trajectoryData3}
            droneParams={droneParams}
            storyboardsData={storyboardsData}
            setStoryboardsData={setStoryboardsData}
            framesUrlsPointBased={framesUrlsPointBased}
            setFramesUrlsPointBased={setFramesUrlsPointBased}
            framesUrlsRecommended={framesUrlsRecommended}
            setFramesUrlsRecommended={setFramesUrlsRecommended}
            framesUrlsOptimal={framesUrlsOptimal}
            setFramesUrlsOptimal={setFramesUrlsOptimal}
            framesUrlsOptimal2={framesUrlsOptimal2}
            setFramesUrlsOptimal2={setFramesUrlsOptimal2}
            framesUrlsOptimal3={framesUrlsOptimal3}
            setFramesUrlsOptimal3={setFramesUrlsOptimal3}
            pointsRecommended={pointsRecommended}
            setPointsRecommended={setPointsRecommended}
            selection={selection}
            setSelection={setSelection}
            flightLineY={flightLineY}
          />
        </DialogContent>
      </Dialog>

      <FlightSettingsDialog
        open={open}
        onClose={() => setOpen(false)}
        data={flightSettings}
        onSave={(form) => {
          setFlightSettings(form);

          setDroneParams((prev: DroneParams) => ({
            ...prev,
            speed: form.flightSpeed,
            batteryTime: form.batteryTime,
            hoverTime: form.hoverTime,
            windResistance: form.windResistance,
            considerObstacles: form.considerObstacles,
          }));

          setWeatherConditions({
            position: {
              lat: form.lat,
              lon: form.lon,
            },
            windSpeed: form.windSpeed,
            windDirection: form.windDirection,
            useWeatherApi: form.useWeatherApi,
            isUse: isConsiderWeather
          });

          // setConsiderWeather(form.windSpeed > form.windResistance);
        }}
      />
      <OptimizationDetailDialog
        open={openOptimizationDetailDialog}
        onClose={() => setOpenOptimizationDetailDialog(false)}
        trajectoryData={trajectoryData}
        trajectoryData2={trajectoryData2}
        trajectoryData3={trajectoryData3}
      />
      <FlightSchemaLegendDialog
        open={isLegendOpen}
        onClose={() => setIsLegendOpen(false)}
      />
    </Box>
  );
};

export default OptimizationTrajectoryStep;
