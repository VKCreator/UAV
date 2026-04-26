import * as React from "react";
import {
  Stepper,
  Step,
  StepLabel,
  Button,
  Typography,
  Paper,
  Box,
  TextField,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  CircularProgress,
  Badge,
  Fab,
  Zoom,
} from "@mui/material";

import EditIcon from "@mui/icons-material/Edit";
import KeyboardArrowLeftIcon from "@mui/icons-material/KeyboardArrowLeft";
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import VisibilityIcon from "@mui/icons-material/Visibility";

import { useDialogs } from "../../../hooks/useDialogs/useDialogs";
import { useNavigate, useBlocker } from "react-router";
import useNotifications from "../../../hooks/useNotifications/useNotifications";

import ImageUploadStep from "./ImageUploadStep";
import BuildTrajectoryStep from "./BuildTrajectoryStep";
import OptimizationTrajectoryStep from "./OptimizationTrajectoryStep";
import CompareOptimizationMethodsStep from "./CompareOptimizationMethodsStep";
import FlightSchemaPage from "../../../pages/FlightSchemaPage";

import type { ExifData } from "../../../types/common.types";
import type { Point, Polygon } from "../../../types/scene.types";
import type { DroneParams, Weather } from "../../../types/uav.types";
import type { Opt1TrajectoryData } from "../../../types/optTrajectory.types";
import type { Storyboards } from "../../../types/storyboards.types";

import { dronesApi } from "../../../api/drones.api";
import { weatherApi } from "../../../api/weather.api";
import { schemasApi } from "../../../api/schemas.api";

import type { Drone } from "../../uav/types/uav.types";

import { getUserFromStorage } from "../../../utils/auth";
import { useDocumentTitle } from "../../../hooks/useDocumentTitle/useDocumentTitle";

import { keyframes } from "@mui/system";

const pulse = keyframes`
  0% { transform: scale(1); opacity: 1; }
  50% { transform: scale(2); opacity: 0; }
  100% { transform: scale(1); opacity: 0; }
`;

const glowPulse = keyframes`
  0%   { box-shadow: 0 0 0 0 rgba(3, 53, 103, 0.7); }
  70%  { box-shadow: 0 0 0 8px rgba(102, 187, 106, 0); }
  100% { box-shadow: 0 0 0 0 rgba(102, 187, 106, 0); }
`;


// ─── Константы ───────────────────────────────────────────────────────────────

const DEFAULT_SCHEMA_NAME = "Объект. Здание. Фасад";
const DRONES_CACHE_KEY = "drones-cache-v1";
const SCHEMA_NAME_MAX_LENGTH = 50;

const INITIAL_DRONE_PARAMS: DroneParams = {
  selectedDroneId: undefined,
  frameHeightBase: 0,
  frameWidthBase: 0,
  frameHeightPlanned: 0,
  frameWidthPlanned: 0,
  distance: 75,
  plannedDistance: 15,
  considerObstacles: true,
  uavCameraParams: {
    fov: 77,
    resolutionWidth: 5472,
    resolutionHeight: 3648,
    useFromReference: true,
  },
  speed: 5,
  batteryTime: 30,
  hoverTime: 5,
  windResistance: 15,
  model: "unknown",
};

const INITIAL_WEATHER: Weather = {
  windSpeed: 10,
  windDirection: 180,
  useWeatherApi: true,
  isUse: false,
  position: {
    lat: 53.4260327, // ММК
    lon: 59.0531761,
  },
};

const EMPTY_STORYBOARD_ENTRY = {
  count_frames: null,
  disk_space: null,
  total_flight_time: null,
  applied: false,
};

const INITIAL_STORYBOARDS: Storyboards = {
  point: { ...EMPTY_STORYBOARD_ENTRY },
  recommended: { ...EMPTY_STORYBOARD_ENTRY },
  optimal: { ...EMPTY_STORYBOARD_ENTRY },
  optimal_big_density: { ...EMPTY_STORYBOARD_ENTRY },
  optimal_combi: { ...EMPTY_STORYBOARD_ENTRY },
};

const STEPS = [
  "Загрузка базового слоя",
  "Построение траектории",
  "Оптимизация траектории",
  "Сравнение траекторий",
];

// ─── Утилиты ─────────────────────────────────────────────────────────────────
// Функция конвертации направления ветра из строки в градусы
const convertWindDirectionToDegrees = (windDir) => {
  const directions = {
    'n': 0,
    'nne': 22.5,
    'ne': 45,
    'ene': 67.5,
    'e': 90,
    'ese': 112.5,
    'se': 135,
    'sse': 157.5,
    's': 180,
    'ssw': 202.5,
    'sw': 225,
    'wsw': 247.5,
    'w': 270,
    'wnw': 292.5,
    'nw': 315,
    'nnw': 337.5,
    'c': null // штиль
  };

  return directions[windDir] !== undefined ? directions[windDir] : null;
};

/**
 * Вычисляет размер кадра по расстоянию и углу обзора камеры.
 * Вынесена за пределы компонента — чистая функция, не зависит от состояния.
 */
const calculateFrameSize = (distance: number, fovDeg: number): number => {
  const fovRad = (fovDeg * Math.PI) / 180;
  return 2 * distance * Math.tan(fovRad / 2);
};

/**
 * Вычисляет размеры кадра (высоту и ширину) по параметрам камеры и расстоянию.
 */
const computeFrameDimensions = (
  distance: number,
  fov: number,
  resolutionWidth: number,
  resolutionHeight: number,
): { height: number; width: number } => {
  const height = calculateFrameSize(distance, fov);
  const width = height * (resolutionWidth / resolutionHeight);
  return { height, width };
};


// ─── Компонент ───────────────────────────────────────────────────────────────

const TrajectoryStepper = () => {
  const navigate = useNavigate();
  const notifications = useNotifications();
  const { confirm } = useDialogs();
  useDocumentTitle("Создание карты | SkyPath Service");

  // ── UI-состояние ──────────────────────────────────────────────────────────
  const [activeStep, setActiveStep] = React.useState(0);
  const [openPreviewPage, setPreviewPage] = React.useState(false);
  const [isCreating, setIsCreating] = React.useState(false);
  const [isFadingOut, setIsFadingOut] = React.useState(false);
  const [isDirty, setIsDirty] = React.useState(true);

  // ── Название схемы ────────────────────────────────────────────────────────

  const [schemaName, setSchemaName] = React.useState(DEFAULT_SCHEMA_NAME);
  const [isNameDialogOpen, setIsNameDialogOpen] = React.useState(false);
  const [nameDialogValue, setNameDialogValue] = React.useState("");
  const [nameDialogError, setNameDialogError] = React.useState("");
  const isDefaultName = schemaName === DEFAULT_SCHEMA_NAME;

  // ── Шаг 1: изображение ───────────────────────────────────────────────────

  const [files, setFiles] = React.useState<File[]>([]);
  const [exifData, setExifData] = React.useState<ExifData[]>([]);
  const [imageUrl, setImageUrl] = React.useState("");

  const imageData = React.useMemo(
    () => ({
      imageUrl,
      fileName: files[0]?.name ?? "",
      width: exifData[0]?.width ?? 0,
      height: exifData[0]?.height ?? 0,
    }),
    [imageUrl, files, exifData],
  );

  // ── Шаг 2: схема полётов ─────────────────────────────────────────────────

  const [points, setPoints] = React.useState<Point[]>([]);
  const [obstacles, setObstacles] = React.useState<Polygon[]>([]);
  const [flightLineY, setFlightLineY] = React.useState<number>(0);
  const [droneParams, setDroneParams] =
    React.useState<DroneParams>(INITIAL_DRONE_PARAMS);
  const [drones, setDrones] = React.useState<Drone[]>([]);
  const [uavLineConfigured, setUavLineConfigured] = React.useState(false);

  // ── Шаг 3: оптимизация ───────────────────────────────────────────────────

  const [opt1TrajectoryData, setOpt1TrajectoryData] =
    React.useState<Opt1TrajectoryData | null>(null);

  const [opt2TrajectoryData, setOpt2TrajectoryData] =
    React.useState<Opt1TrajectoryData | null>(null);

  const [opt3TrajectoryData, setOpt3TrajectoryData] =
    React.useState<Opt1TrajectoryData | null>(null);

  const [weatherConditions, setWeatherConditions] =
    React.useState<Weather>(INITIAL_WEATHER);

  const [selection, setSelection] = React.useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);

  const [optimizationState, setOptimizationState] = React.useState({
    small: {
      flag: true,
      status: 'idle',
      isLoading: false
    },
    large: {
      flag: true,
      status: 'idle',
      isLoading: false
    },
    combi: {
      flag: true,
      status: 'idle',
      isLoading: false
    }
  });

  const updateOptimization = (type, updates) => {
    setOptimizationState(prev => ({
      ...prev,
      [type]: { ...prev[type], ...updates }
    }));
  };
  const isAnyRunning = React.useMemo(() => {
    return Object.entries(optimizationState).some(([key, item]) => item.status === 'running');
  }, [optimizationState]);

  // ── Раскадровки ──────────────────────────────────────────────────────────

  const [storyboardsData, setStoryboardsData] =
    React.useState<Storyboards>(INITIAL_STORYBOARDS);

  const [framesUrlsPointBased, setFramesUrlsPointBased] = React.useState<
    string[]
  >([]);

  const [framesUrlsRecommended, setFramesUrlsRecommended] = React.useState<
    string[]
  >([]);

  const [framesUrlsOptimal, setFramesUrlsOptimal] = React.useState<string[]>(
    [],
  );

  const [framesUrlsOptimal2, setFramesUrlsOptimal2] = React.useState<string[]>(
    [],
  );

  const [framesUrlsOptimal3, setFramesUrlsOptimal3] = React.useState<string[]>(
    [],
  );
  
  const [pointsRecommended, setPointsRecommended] = React.useState<Point[]>([]);

  // ── Очистка раскадровок ───────────────────────────────────────────────────
  //
  // Функции обёрнуты в useCallback, чтобы иметь стабильные ссылки
  // и не вызывать лишних срабатываний useEffect, которые их используют.

  const clearPointBasedStoryboards = React.useCallback(() => {
    setStoryboardsData((prev) => ({
      ...prev,
      point: {
        ...EMPTY_STORYBOARD_ENTRY
      },
    }));
    setFramesUrlsPointBased((prev) => {
      prev.forEach((url) => URL.revokeObjectURL(url));
      return [];
    });
  }, []);

  const clearRecommendedStoryboards = React.useCallback(() => {
    setStoryboardsData((prev) => ({
      ...prev,
      recommended: {
        ...EMPTY_STORYBOARD_ENTRY,
        step_x: prev.recommended.step_x,
        step_y: prev.recommended.step_y,
      },
    }));
    setFramesUrlsRecommended((prev) => {
      prev.forEach((url) => URL.revokeObjectURL(url));
      return [];
    });
    setPointsRecommended([]);
    setSelection(null);
  }, []);

  const clearOptimalStoryboards = React.useCallback(() => {
    setStoryboardsData((prev) => ({
      ...prev,
      optimal: { ...EMPTY_STORYBOARD_ENTRY },
    }));
    setFramesUrlsOptimal((prev) => {
      prev.forEach((url) => URL.revokeObjectURL(url));
      return [];
    });

    setStoryboardsData((prev) => ({
      ...prev,
      optimal_big_density: { ...EMPTY_STORYBOARD_ENTRY },
    }));
    setFramesUrlsOptimal2((prev) => {
      prev.forEach((url) => URL.revokeObjectURL(url));
      return [];
    });

    setStoryboardsData((prev) => ({
      ...prev,
      optimal_combi: { ...EMPTY_STORYBOARD_ENTRY },
    }));
    setFramesUrlsOptimal3((prev) => {
      prev.forEach((url) => URL.revokeObjectURL(url));
      return [];
    });
  }, []);

  const clearAllStoryboards = React.useCallback(() => {
    clearPointBasedStoryboards();
    clearRecommendedStoryboards();
    clearOptimalStoryboards();
  }, [
    clearPointBasedStoryboards,
    clearRecommendedStoryboards,
    clearOptimalStoryboards,
  ]);

  React.useEffect(() => {
    return () => {
      framesUrlsPointBased.forEach((url) => URL.revokeObjectURL(url));
      framesUrlsRecommended.forEach((url) => URL.revokeObjectURL(url));
      framesUrlsOptimal.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  // ── Сброс состояния сцены ─────────────────────────────────────────────────

  const resetSceneState = React.useCallback(() => {
    setPoints([]);
    setObstacles([]);
    setOpt1TrajectoryData(null);
    setOpt2TrajectoryData(null);
    setOpt3TrajectoryData(null);
    clearAllStoryboards();
  }, [clearAllStoryboards]);

  // ── Управление URL изображения ────────────────────────────────────────────
  //
  // URL создаётся и отзывается только в одном месте — этом useEffect.
  // handleImageUpload и handleImageDelete больше не трогают imageUrl напрямую,
  // чтобы избежать двойного revokeObjectURL.

  React.useEffect(() => {
    if (files.length === 0) {
      setImageUrl("");
      return;
    }

    const url = URL.createObjectURL(files[0]);
    setImageUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [files]);

  React.useEffect(() => {
    setFlightLineY(imageData.height);
  }, [imageData]);

  // ── Обработчики изображения ───────────────────────────────────────────────

  const handleImageUpload = React.useCallback(
    (newFiles: File[], newExif: ExifData[]) => {
      setFiles(newFiles);
      setExifData(newExif);
      resetSceneState();
    },
    [resetSceneState],
  );

  const handleImageDelete = React.useCallback(() => {
    setFiles([]);
    setExifData([]);
    resetSceneState();
  }, [resetSceneState]);

  // ── Пересчёт размеров кадра при смене параметров дрона/расстояния ─────────
  //
  // Два отдельных эффекта для базового и планируемого расстояния.
  // calculateFrameSize вынесена за компонент — не нужна в deps.

  React.useEffect(() => {
    const { distance, uavCameraParams } = droneParams;
    if (!distance || !uavCameraParams) return;

    const { height, width } = computeFrameDimensions(
      distance,
      uavCameraParams.fov,
      uavCameraParams.resolutionWidth,
      uavCameraParams.resolutionHeight,
    );

    setDroneParams((prev) => ({
      ...prev,
      frameHeightBase: height,
      frameWidthBase: width,
    }));
  }, [droneParams.distance, droneParams.uavCameraParams]);

  React.useEffect(() => {
    const { plannedDistance, uavCameraParams } = droneParams;
    if (!plannedDistance || !uavCameraParams) return;

    const { height, width } = computeFrameDimensions(
      plannedDistance,
      uavCameraParams.fov,
      uavCameraParams.resolutionWidth,
      uavCameraParams.resolutionHeight,
    );

    setDroneParams((prev) => ({
      ...prev,
      frameHeightPlanned: height,
      frameWidthPlanned: width,
    }));
  }, [droneParams.plannedDistance, droneParams.uavCameraParams]);

  // Сброс результатов при изменении параметров кадра 
  //
  // Разделён на два эффекта по зонам ответственности:
  // один следит за размерами кадра, другой — за остальными параметрами дрона.

  const prevFrameRef = React.useRef({
    frameHeightBase: droneParams.frameHeightBase,
    frameWidthBase: droneParams.frameWidthBase,
    frameHeightPlanned: droneParams.frameHeightPlanned,
    frameWidthPlanned: droneParams.frameWidthPlanned,
  });

  React.useEffect(() => {
    const prev = prevFrameRef.current;
    const {
      frameHeightBase,
      frameWidthBase,
      frameHeightPlanned,
      frameWidthPlanned,
    } = droneParams;

    const frameChanged =
      prev.frameHeightBase !== frameHeightBase ||
      prev.frameWidthBase !== frameWidthBase ||
      prev.frameHeightPlanned !== frameHeightPlanned ||
      prev.frameWidthPlanned !== frameWidthPlanned;

    if (!frameChanged) return;

    prevFrameRef.current = {
      frameHeightBase,
      frameWidthBase,
      frameHeightPlanned,
      frameWidthPlanned,
    };

    const hasAppliedStoryboards =
      storyboardsData.point.applied ||
      storyboardsData.optimal.applied ||
      storyboardsData.optimal_big_density.applied ||
      storyboardsData.optimal_combi.applied ||
      storyboardsData.recommended.applied;

    if (opt1TrajectoryData !== null || opt2TrajectoryData !== null || opt3TrajectoryData !== null) {
      setOpt1TrajectoryData(null);
      setOpt2TrajectoryData(null);
      setOpt3TrajectoryData(null);

      updateOptimization("small", { status: "idle" })
      updateOptimization("large", { status: "idle" })
      updateOptimization("combi", { status: "idle" })

      notifications.show(
        "Изменены параметры съёмки. Результаты оптимизации очищены.",
        { severity: "info", autoHideDuration: 5000 },
      );
    }

    if (hasAppliedStoryboards) {
      clearAllStoryboards();
      notifications.show(
        "Изменены параметры БПЛА. Результаты раскадровок очищены.",
        { severity: "info", autoHideDuration: 5000 },
      );
    }
    // storyboardsData намеренно не в deps — читаем через ref-снимок при входе в эффект
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    droneParams.frameHeightBase,
    droneParams.frameWidthBase,
    droneParams.frameHeightPlanned,
    droneParams.frameWidthPlanned,
  ]);

  const isFirstRender = React.useRef(true);

  React.useEffect(() => {
    // Пропускаем первый рендер — на маунте сбрасывать нечего
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    if (opt1TrajectoryData !== null || opt2TrajectoryData !== null || opt3TrajectoryData !== null) {
      setOpt1TrajectoryData(null);
      setOpt2TrajectoryData(null);
      setOpt3TrajectoryData(null);

      updateOptimization("small", { status: "idle" })
      updateOptimization("large", { status: "idle" })
      updateOptimization("combi", { status: "idle" })

      notifications.show(
        "Изменены параметры полёта. Результаты оптимизации очищены.",
        { severity: "info", autoHideDuration: 5000 },
      );
    }

    const hasAppliedStoryboards =
      storyboardsData.point.applied ||
      storyboardsData.optimal.applied ||
      storyboardsData.recommended.applied;

    if (hasAppliedStoryboards) {
      clearAllStoryboards();
      notifications.show(
        "Изменены параметры полёта. Результаты раскадровок очищены.",
        { severity: "info", autoHideDuration: 5000 },
      );
    }
  }, [
    // Параметры дрона, влияющие на расчёт траектории
    droneParams.speed,
    droneParams.batteryTime,
    droneParams.hoverTime,
    droneParams.windResistance,
    droneParams.considerObstacles,
    // Погодные условия
    weatherConditions.windSpeed,
    weatherConditions.windDirection,
    weatherConditions.isUse
  ]);

  // ── Сброс раскадровок при смене точек и траектории ───────────────────────

  React.useEffect(() => {
    clearPointBasedStoryboards();
    clearOptimalStoryboards();

    if (opt1TrajectoryData !== null || opt2TrajectoryData !== null) {
      setOpt1TrajectoryData(null);
      setOpt2TrajectoryData(null);
      setOpt3TrajectoryData(null);

      updateOptimization("small", { status: "idle" });
      updateOptimization("large", { status: "idle" });
      updateOptimization("combi", { status: "idle" });

      notifications.show(
        "Изменены точки съёмки. Результаты оптимизации очищены.",
        { severity: "info", autoHideDuration: 5000 },
      );
    }
    // points — массив, сравнение по ссылке корректно: setPoints всегда даёт новый массив
  }, [points, clearPointBasedStoryboards, clearOptimalStoryboards]);

  React.useEffect(() => {
    clearOptimalStoryboards();
  }, [opt1TrajectoryData, clearOptimalStoryboards]);

  // Загрузка дронов

  React.useEffect(() => {
    let isMounted = true;

    const fetchDrones = async () => {
      try {
        const cached = sessionStorage.getItem(DRONES_CACHE_KEY);
        let dronesData: Drone[];

        if (cached) {
          dronesData = JSON.parse(cached);
        } else {
          dronesData = await dronesApi.getAll();
          sessionStorage.setItem(DRONES_CACHE_KEY, JSON.stringify(dronesData));
        }

        if (!isMounted || !dronesData.length) return;

        setDrones(dronesData);

        const requestedId = Number(droneParams?.selectedDroneId);
        const selectedDrone = Number.isFinite(requestedId)
          ? dronesData.find((d) => d.drone_id === requestedId) ?? dronesData[0]
          : dronesData[0];

        if (!selectedDrone) return;

        const newCameraParams = {
          fov: selectedDrone.default_vertical_fov,
          resolutionWidth: selectedDrone.default_resolution_width,
          resolutionHeight: selectedDrone.default_resolution_height,
          useFromReference: true,
        };

        const baseFrame = computeFrameDimensions(
          INITIAL_DRONE_PARAMS.distance,
          newCameraParams.fov,
          newCameraParams.resolutionWidth,
          newCameraParams.resolutionHeight,
        );

        const plannedFrame = computeFrameDimensions(
          INITIAL_DRONE_PARAMS.plannedDistance,
          newCameraParams.fov,
          newCameraParams.resolutionWidth,
          newCameraParams.resolutionHeight,
        );

        setDroneParams((prev) => ({
          ...prev,
          selectedDroneId: String(selectedDrone.drone_id),
          uavCameraParams: newCameraParams,
          speed: selectedDrone.min_speed + 5,
          batteryTime: selectedDrone.max_battery_life ?? 0,
          windResistance: selectedDrone.max_wind_resistance ?? 0,
          model: selectedDrone.model,
          frameHeightBase: baseFrame.height,
          frameWidthBase: baseFrame.width,
          frameHeightPlanned: plannedFrame.height,
          frameWidthPlanned: plannedFrame.width,
        }));
      } catch {
        if (!isMounted) return;
        notifications.show("Не удалось загрузить список БПЛА", {
          severity: "error",
          autoHideDuration: 3000,
        });
      }
    };

    fetchDrones();

    return () => {
      isMounted = false;
    };
    // Запускается один раз при монтировании
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Загрузка погоды ───────────────────────────────────────────────────────

  React.useEffect(() => {
    if (!weatherConditions.position) return;

    const fetchWeather = async () => {
      try {
        const data = await weatherApi.getCurrent(
          weatherConditions.position.lat,
          weatherConditions.position.lon,
        );
        setWeatherConditions((prev) => ({
          ...prev,
          windSpeed: data.current_weather.windspeed / 3.6, // из км/ч в м/с
          windDirection: data.current_weather.winddirection, // в градусах
        }));
      } catch (alternativeError) {
        // Если Weatherbit недоступен, пробуем Яндекс Погоду
        try {
          const yandexData = await weatherApi.getYandex(
            weatherConditions.position.lat,
            weatherConditions.position.lon,
          );

          // Конвертируем направление ветра из строки в градусы
          const windDirectionDegrees = convertWindDirectionToDegrees(yandexData.fact.wind_dir);

          setWeatherConditions((prev) => ({
            ...prev,
            windSpeed: yandexData.fact.wind_speed, // уже в м/с
            windDirection: windDirectionDegrees,
          }));
        } catch (yandexError) {
          // Если Яндекс Погода недоступна, пробуем Open-meteo
          try {
            // Пробуем альтернативный сервис (Weatherbit) сначала
            const alternativeData = await weatherApi.getCurrentAlternative(
              weatherConditions.position.lat,
              weatherConditions.position.lon,
            );
            const weather = alternativeData["data"][0];
            setWeatherConditions((prev) => ({
              ...prev,
              windSpeed: weather['wind_spd'], // уже в м/с
              windDirection: weather['wind_dir'], // в градусах
            }));

          } catch {
            notifications.show("Не удалось получить данные о погоде.", {
              severity: "error",
              autoHideDuration: 5000,
            });
          }
        }
      }
    };

    fetchWeather();
    // Запускается один раз при монтировании
  }, []);

  React.useEffect(() => {
    setStoryboardsData((prev) => {
      // if (
      //   prev.recommended?.step_x !== undefined &&
      //   prev.recommended?.step_x !== null
      // ) {
      //   return prev;
      // }

      return {
        ...prev,
        recommended: {
          ...prev.recommended,
          step_x: droneParams.frameWidthPlanned,
        },
      };
    });
  }, [droneParams.frameWidthPlanned]);

  React.useEffect(() => {
    setStoryboardsData((prev) => {
      // // Если step_y уже есть, не трогаем его
      // if (
      //   prev.recommended?.step_y !== undefined &&
      //   prev.recommended?.step_y !== null
      // ) {
      //   return prev;
      // }

      return {
        ...prev,
        recommended: {
          ...prev.recommended,
          step_y: droneParams.frameHeightPlanned,
        },
      };
    });
  }, [droneParams.frameHeightPlanned]);

  // ── Навигация по шагам ────────────────────────────────────────────────────

  const handleNext = React.useCallback(() => {
    setActiveStep((prev) => Math.min(prev + 1, STEPS.length - 1));
  }, []);

  const handleBack = React.useCallback(async () => {
    if (activeStep > 0) {
      setActiveStep((prev) => prev - 1);
      return;
    }

    navigate("/trajectories");
    
  }, [activeStep, confirm, navigate]);

  // ── Создание схемы ────────────────────────────────────────────────────────
  const handleCreateSchema = React.useCallback(async () => {
    if (!files[0]) {
      notifications.show("Не выбрано изображение", { severity: "error" });
      return;
    }

    if (isDefaultName) {
      const confirmed = await confirm(
        "Название полётной карты задано по умолчанию. Вы действительно желаете создать карту?",
        { title: "Предупреждение", okText: "Да", cancelText: "Нет" },
      );
      if (!confirmed) return;
    }

    const formData = new FormData();

    // ── 1. FlightSchema (основное) ──────────────────────────────────
    formData.append("map_name", schemaName);

    // ── 2. BaseImage ────────────────────────────────────────────────
    formData.append("image", files[0]);
    // EXIF как JSON-строку
    formData.append("exif_data", JSON.stringify(exifData[0] ?? null));

    // ── 3. DroneParams ──────────────────────────────────────────────
    formData.append("drone_id", String(droneParams.selectedDroneId ?? ""));
    formData.append("base_distance", String(droneParams.distance));
    formData.append("planned_distance", String(droneParams.plannedDistance));
    formData.append("speed", String(droneParams.speed));
    formData.append("battery_time", String(droneParams.batteryTime));
    formData.append("hover_time", String(droneParams.hoverTime));
    formData.append("wind_resistance", String(droneParams.windResistance));
    formData.append(
      "consider_obstacles",
      String(droneParams.considerObstacles),
    );

    // CameraParams (если useFromReference=false — пользователь задал вручную)
    formData.append("camera_fov", String(droneParams.uavCameraParams.fov));
    formData.append(
      "camera_resolution_width",
      String(droneParams.uavCameraParams.resolutionWidth),
    );
    formData.append(
      "camera_resolution_height",
      String(droneParams.uavCameraParams.resolutionHeight),
    );
    formData.append(
      "camera_use_from_reference",
      String(droneParams.uavCameraParams.useFromReference),
    );

    // ── 4. TrajectoriesShapes ───────────────────────────────────────
    formData.append("points", JSON.stringify(points));
    formData.append("obstacles", JSON.stringify(obstacles));
    formData.append("flight_line_y", String(flightLineY ?? ""));

    // ── 5. LocalWeather ─────────────────────────────────────────────
    formData.append("wind_speed", String(weatherConditions.windSpeed));
    formData.append("wind_direction", String(weatherConditions.windDirection));
    formData.append("use_weather_api", String(weatherConditions.useWeatherApi));
    formData.append("use_weather", String(weatherConditions.isUse));
    formData.append("weather_lat", String(weatherConditions.position.lat));
    formData.append("weather_lon", String(weatherConditions.position.lon));

    // ── 6. Optimization Results (opt1, opt2, opt3) ─────────────────
    
    // Маппинг ID методов к их pretty_name (эти имена должны быть в БД в таблице opt_methods)
    const methodNamesMap: Record<number, string> = {
        1: "METHOD_1",
        2: "METHOD_2",
        3: "METHOD_3",
    };

    const opt_variants = [
        { prefix: "opt1", method_id: 1 },
        { prefix: "opt2", method_id: 2 },
        { prefix: "opt3", method_id: 3 },
    ];

    let priorityMethodName = null;

    opt_variants.forEach((v) => {
        // Получаем данные траектории для текущего варианта
        const trajectoryData = 
            v.prefix === "opt1" ? opt1TrajectoryData :
            v.prefix === "opt2" ? opt2TrajectoryData : 
                                  opt3TrajectoryData;

        if (trajectoryData) {
            // Вычисляем полное время полета
            const totalTime = trajectoryData.B.reduce(
            (sum, taxon) => sum + (taxon.time_sec ?? 0),
            0,
            );

            // Добавляем данные для текущего варианта
            formData.append(`${v.prefix}_taxons`, JSON.stringify(trajectoryData));
            formData.append(`${v.prefix}_total_flight_time`, String(totalTime));
            
            // Передаем ID метода (если бэкенд ожидает ID)
            formData.append(`${v.prefix}_method_id`, String(v.method_id));
            
            // Передаем имя метода (если бэкенд ищет по имени, как в прошлом примере)
            formData.append(`${v.prefix}_method_name`, methodNamesMap[v.method_id]);

            // Запоминаем первый найденный метод как приоритетный
            if (!priorityMethodName) {
                priorityMethodName = methodNamesMap[v.method_id];
            }
        }
    });

    if (priorityMethodName) {
        priorityMethodName = "METHOD_1"; // Заглушка
        formData.append("priority_opt_method", String(priorityMethodName));
    }

    // ── 7. Storyboards — если применены ────────────────────────────
    
    // Point Based
    if (storyboardsData.point.applied) {
      formData.append(
        "storyboard_point",
        JSON.stringify(storyboardsData.point),
      );
    }

    // Recommended
    if (storyboardsData.recommended.applied) {
      const recommendedPayload = {
          ...storyboardsData.recommended,
          points: pointsRecommended // В recommended точки приходят отдельным массивом
      };
      formData.append(
        "storyboard_recommended",
        JSON.stringify(recommendedPayload),
      );
    }

    // Optimal
    if (storyboardsData.optimal.applied) {
      formData.append(
        "storyboard_optimal",
        JSON.stringify(storyboardsData.optimal),
      );
    }

    // Optimal Big Density
    if (storyboardsData.optimal_big_density.applied) {
      formData.append(
        "storyboard_optimal_big_density",
        JSON.stringify(storyboardsData.optimal_big_density),
      );
    }

    // Optimal Combi
    if (storyboardsData.optimal_combi.applied) {
      formData.append(
        "storyboard_optimal_combi",
        JSON.stringify(storyboardsData.optimal_combi),
      );
    }

    setIsCreating(true);

    try {
      const data = await schemasApi.createFull(formData); // POST /api/schemas
      setIsDirty(false);

      setIsFadingOut(true);
      setTimeout(() => {
        notifications.show("Схема полётов создана", {
          severity: "success",
          autoHideDuration: 3000,
        });
        setIsCreating(false);
        navigate(`/trajectories?newSchemaId=${data.map_id}`);
      }, 1000);
    } catch (err) {
      setIsDirty(true);
      setIsCreating(false);
      setIsFadingOut(false);
      notifications.show(
        `Не удалось создать карту. Причина: ${(err as Error).message}`,
        { severity: "error", autoHideDuration: 5000 },
      );
    }
  }, [
    opt1TrajectoryData,
    files,
    exifData,
    isDefaultName,
    schemaName,
    points,
    obstacles,
    flightLineY,
    droneParams,
    weatherConditions,
    storyboardsData,
    confirm,
    notifications,
    navigate,
  ]);

  // ── Диалог переименования схемы ───────────────────────────────────────────

  const handleOpenNameDialog = React.useCallback(() => {
    setNameDialogValue(schemaName);
    setNameDialogError("");
    setIsNameDialogOpen(true);
  }, [schemaName]);

  const handleCloseNameDialog = React.useCallback(() => {
    setIsNameDialogOpen(false);
    setNameDialogError("");
  }, []);

  const handleSaveSchemaName = React.useCallback(() => {
    const trimmed = nameDialogValue.trim();
    if (!trimmed) {
      setNameDialogError("Название карты обязательно");
      return;
    }
    if (trimmed.length > SCHEMA_NAME_MAX_LENGTH) {
      setNameDialogError(
        `Название не должно превышать ${SCHEMA_NAME_MAX_LENGTH} символов`,
      );
      return;
    }
    setSchemaName(trimmed);
    handleCloseNameDialog();
  }, [nameDialogValue, handleCloseNameDialog]);

  // ── Кнопка «Далее»: состояние блокировки и подсказка ─────────────────────

  const { isNextDisabled, nextTooltip } = React.useMemo(() => {
    if (activeStep === 0 && !imageUrl) {
      return {
        isNextDisabled: true,
        nextTooltip: "Для шага 2 нужно загрузить базовый слой",
      };
    }
    if (activeStep === 1 && (points.length === 0 || drones.length === 0)) {
      return {
        isNextDisabled: true,
        nextTooltip:
          "Для шага 3 требуется построение пользовательской траектории",
      };
    }
    if (activeStep === 2 && opt1TrajectoryData === null && opt2TrajectoryData === null) {
      return {
        isNextDisabled: true,
        nextTooltip:
          "Для шага 4 требуется оптимизация пользовательской траектории",
      };
    } 

    if (activeStep === 2 && isAnyRunning) {
      return {
        isNextDisabled: true,
        nextTooltip:
          "Для шага 4 дождитесь завершения оптимизаций",
      };
    } 

    return { isNextDisabled: false, nextTooltip: "" };
  }, [activeStep, imageUrl, points.length, drones.length, opt1TrajectoryData, opt2TrajectoryData, isAnyRunning]);

  // ── Содержимое шага ───────────────────────────────────────────────────────

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <ImageUploadStep
            onUpload={handleImageUpload}
            onDelete={handleImageDelete}
            initialFiles={files}
            initialExifData={exifData}
            initialImageUrl={imageUrl}
          />
        );
      case 1:
        return (
          <BuildTrajectoryStep
            imageData={imageData}
            points={points}
            setPoints={setPoints}
            obstacles={obstacles}
            setObstacles={setObstacles}
            trajectoryData={opt1TrajectoryData}
            setTrajectoryData={setOpt1TrajectoryData}
            flightLineY={flightLineY}
            setFlightLineY={setFlightLineY}
            droneParams={droneParams}
            setDroneParams={setDroneParams}
            drones={drones}
            uavLineConfigured={uavLineConfigured}
            setUavLineConfigured={setUavLineConfigured}
          />
        );
      case 2:
        return (
          <OptimizationTrajectoryStep
            imageData={imageData}
            points={points}
            setPoints={setPoints}
            obstacles={obstacles}
            setObstacles={setObstacles}
            droneParams={droneParams}
            setDroneParams={setDroneParams}
            trajectoryData={opt1TrajectoryData}
            setTrajectoryData={setOpt1TrajectoryData}
            trajectoryData2={opt2TrajectoryData}
            setTrajectoryData2={setOpt2TrajectoryData}
            trajectoryData3={opt3TrajectoryData}
            setTrajectoryData3={setOpt3TrajectoryData}
            optimizationState={optimizationState}
            setOptimizationState={setOptimizationState}
            weatherConditions={weatherConditions}
            setWeatherConditions={setWeatherConditions}
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
        );
      case 3:
        return (
          <CompareOptimizationMethodsStep trajectoryData={opt1TrajectoryData} trajectoryData2={opt2TrajectoryData} trajectoryData3={opt3TrajectoryData}/>
        );
      default:
        return null;
    }
  };

  // ── Кнопка «Наверх» в диалоге предпросмотра ───────────────────────────────

  const containerRef = React.useRef<HTMLDivElement>(null);

  const handleScrollToTop = React.useCallback(() => {
    containerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, []);


  const blocker = useBlocker(isDirty);

React.useEffect(() => {
  if (blocker.state === "blocked") {
    confirm(
      "Вы действительно хотите выйти из режима создания карты полёта?",
      {
        title: "Подтверждение",
        okText: "Да",
        cancelText: "Нет",
      }
    ).then((confirmed) => {
      if (confirmed) {
        blocker.proceed();
      } else {
        blocker.reset();
      }
    });
  }
}, [blocker, confirm]);

// Перехватываем закрытие вкладки/обновление (Браузер)
React.useEffect(() => {
  const handleBeforeUnload = (e: BeforeUnloadEvent) => {
    if (isDirty) {
      e.preventDefault();
      e.returnValue = "";
    }
  };

  window.addEventListener("beforeunload", handleBeforeUnload);
  return () => window.removeEventListener("beforeunload", handleBeforeUnload);
}, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <Box
      sx={{
        width: "100%",
        display: "flex",
        flexDirection: "column",
        height: "calc(100vh - 90px)",
        overflow: "hidden",
        position: "relative",
      }}
    >

      {/* Оверлей загрузки при создании схемы */}
      {isCreating && (
        <Box
          sx={{
            position: "fixed", 
            inset: 0,         
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "rgba(255, 255, 255, 0.85)", // Чуть увеличил прозрачность для надежности
            zIndex: 9999,        // Гарантирует, что поверх хедеров и меню
            opacity: isFadingOut ? 0 : 1,
            transition: "opacity 1s ease",
          }}
        >
          <CircularProgress />
          <Typography
            variant="h6"
            sx={{ mt: 2, color: "#014488", fontWeight: 500 }}
          >
            Пожалуйста, подождите...
          </Typography>
        </Box>
      )}

      {/* Заголовок: название схемы */}
      <Box
        sx={{ display: "flex", alignItems: "center", gap: 1, pl: 3, pt: 0.2 }}
      >
        <Typography variant="h6" sx={{ fontWeight: 500 }}>
          Название:
        </Typography>
        <Typography variant="h6" sx={{ fontWeight: 300 }}>
          {schemaName}
        </Typography>
        <Tooltip title="Изменить">
          <Badge
            color="warning"
            variant="dot"
            overlap="circular"
            invisible={!isDefaultName}
            sx={{
              "& .MuiBadge-dot": {},
              "& .MuiBadge-dot::after": {
                content: '""',
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                borderRadius: "50%",
                backgroundColor: "warning.main",
                animation: `${pulse} 1.5s ease-out infinite`,
              },
            }}
          >
            <IconButton
              size="small"
              onClick={handleOpenNameDialog}
              sx={{ opacity: 0.6, "&:hover": { opacity: 1 } }}
            >
              <EditIcon fontSize="small" />
            </IconButton>
          </Badge>
        </Tooltip>
      </Box>

      {/* Степпер */}
      <Box sx={{ pt: 2, flexShrink: 0, overflow: "auto" }}>
        <Stepper
          activeStep={activeStep}
          alternativeLabel
          sx={{
            "& .MuiStepIcon-root": {
              "&.Mui-active": { color: "#014488" },
              "&.Mui-completed": { color: "#014488" },
            },
            borderBottom: "1px solid #e0e0e0",
            pb: 2,
          }}
        >
          {STEPS.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
      </Box>

      {/* Контент шага */}
      <Box sx={{ flex: 1, overflowY: "auto", p: 1 }}>{renderStepContent()}</Box>

      {/* Навигационные кнопки */}
      <Box
        sx={{
          p: 2,
          flexShrink: 0,
          display: "flex",
          justifyContent: "space-between",
          borderTop: "1px solid #e0e0e0",
        }}
      >
        <Button
          onClick={handleBack}
          variant="outlined"
          startIcon={<KeyboardArrowLeftIcon />}
        >
          Назад
        </Button>

        <Box display="flex" alignItems="center" gap={1.5}>
          {activeStep === STEPS.length - 1 && (
            <Button
              variant="outlined"
              color="primary"
              onClick={() => setPreviewPage(true)}
              startIcon={<VisibilityIcon />}
            >
              Просмотр карты
            </Button>
          )}

          <Tooltip
            title={nextTooltip}
            arrow
            disableHoverListener={!isNextDisabled}
          >
            <span>
              <Button
                onClick={
                  activeStep === STEPS.length - 1
                    ? handleCreateSchema
                    : handleNext
                }
                variant="contained"
                color="primary"
                endIcon={<KeyboardArrowRightIcon />}
                disabled={isNextDisabled}
                sx={
                  !isNextDisabled
                    ? {
                      animation: `${glowPulse} 1.5s ease-out infinite`,
                      // опционально — чуть усилить сам цвет кнопки
                      // backgroundColor: "success.main",
                      // "&:hover": { backgroundColor: "success.dark" },
                    }
                    : {}
                }
              >
                {activeStep === STEPS.length - 1 ? "Создать" : "Далее"}
              </Button>
            </span>
          </Tooltip>
        </Box>
      </Box>

      {/* Диалог: переименование схемы */}
      <Dialog
        open={isNameDialogOpen}
        onClose={(_, reason) => {
          if (reason !== "backdropClick") handleCloseNameDialog();
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Изменить название карты</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Название карты"
            type="text"
            fullWidth
            variant="outlined"
            value={nameDialogValue}
            onChange={(e) => {
              const value = e.target.value;
              setNameDialogValue(value);
              
              // Валидация формата Объект.Элемент.Компонент
              // Функция для экранирования спецсимволов
              function escapeRegex(string: string) {
                return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
              }

              const allowedChars = 'A-Za-zА-Яа-я0-9!@#$%^№&*()_+=[\]{};:\'"\\|,.<>/?~` -';
              const escapedChars = escapeRegex(allowedChars);
              const formatRegex = new RegExp(`^[${escapedChars}]+\\. ?[${escapedChars}]+\\. ?[${escapedChars}]+$`);
              const isValid = formatRegex.test(value);

              if (!value.trim()) {
                setNameDialogError("Название карты обязательно");
              } else if (!isValid) {
                setNameDialogError("Формат: Объект. Элемент. Компонент (например, ММК. ЛПЦ. Крыша)");
              } else {
                setNameDialogError("");
              }
            }}
            error={!!nameDialogError}
            helperText={nameDialogError}
            inputProps={{ maxLength: SCHEMA_NAME_MAX_LENGTH }}
            placeholder="Объект. Элемент. Компонент"
            required
          />
          {!nameDialogError && (
            <Typography variant="caption" color="textSecondary" sx={{ pl: "14px" }}>
              Количество символов: {nameDialogValue.length}/{SCHEMA_NAME_MAX_LENGTH}
            </Typography>
          )}
            {/* <Typography variant="caption" color="textSecondary" sx={{ pl: "14px", display: "block", mt: 1, mb: 0, pb: 0 }}>
              Пример: ММК. ПТЛ. Крыша 
            </Typography> */}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseNameDialog} variant="outlined">
            Отмена
          </Button>
          <Button
            onClick={handleSaveSchemaName}
            variant="contained"
            color="primary"
            disabled={!!nameDialogError}
          >
            Сохранить
          </Button>
        </DialogActions>
      </Dialog>

      {/* Диалог: полноэкранный предпросмотр схемы */}
      <Dialog
        fullScreen
        open={openPreviewPage}
        onClose={() => setPreviewPage(false)}
      >
        <Box
          sx={{ height: "100%", overflow: "auto", maxHeight: "100%" }}
          ref={containerRef}
        >
          <FlightSchemaPage
            imageData={imageData}
            exifData={exifData}
            onClose={() => setPreviewPage(false)}
            weatherConditions={weatherConditions}
            droneParams={droneParams}
            points={points}
            obstacles={obstacles}
            trajectoryData={opt1TrajectoryData}
            pointsRecommended={pointsRecommended}
            frameWidthPx={
              imageData.width /
              (droneParams.frameWidthBase / droneParams.frameWidthPlanned)
            }
            frameHeightPx={
              imageData.height /
              (droneParams.frameHeightBase / droneParams.frameHeightPlanned)
            }
            storyboardsData={storyboardsData}
            framesUrlsPointBased={framesUrlsPointBased}
            framesUrlsRecommended={framesUrlsRecommended}
            framesUrlsOptimal={framesUrlsOptimal}
            flightLineY={flightLineY}
            schemaName={schemaName}
            author={getUserFromStorage()}
            createdAt={""}
          />

          <Zoom in>
            <Box
              onClick={handleScrollToTop}
              role="presentation"
              sx={{ position: "fixed", bottom: 24, right: 32, zIndex: 1000 }}
            >
              <Tooltip title="Наверх" arrow>
                <Fab
                  size="small"
                  aria-label="Наверх"
                  sx={{
                    bgcolor: "#004E9E",
                    "&:hover": { bgcolor: "#004E9E" },
                  }}
                >
                  <KeyboardArrowUpIcon sx={{ fill: "white" }} />
                </Fab>
              </Tooltip>
            </Box>
          </Zoom>
        </Box>
      </Dialog>
    </Box>
  );
};

export default TrajectoryStepper;
