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
  CircularProgress
} from "@mui/material";

import { Menu, MenuItem, ListItemText } from '@mui/material';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';

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

import SceneEditor from "./SceneEditor";
import StoryboardEditor from "./StoryboardEditor";
import SceneShower from "./SceneShower";

import { api } from "../../../api/client";

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

  flightLineY: number;

  optimizationState: any;
  setOptimizationState: (data: any) => void;
}

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
  "#5e4a3a",
  "#7a9f60",
  "#a2b9d1",
  "#d1d1d1",
  "#b8a25b",
];

interface OptimizationFlags {
  small: boolean;
  large: boolean;
}

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
  setOptimizationState
}) => {
  const [activeImage, setActiveImage] = React.useState(0);
  const [image] = useImage(imageData.imageUrl);
  const [showView, setShowView] = React.useState(false);
  const [showStoryboardEditor, setShowStoryboardEditor] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const [openOptimizationDetailDialog, setOpenOptimizationDetailDialog] =
    React.useState(false);

  const [isLegendOpen, setIsLegendOpen] = React.useState(false);

  const updateOptimization = (type, updates) => {
    setOptimizationState(prev => ({
      ...prev,
      [type]: { ...prev[type], ...updates }
    }));
  };

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

  const sceneUserTrajectoryShower = useRef<{ handleDownload: () => void }>(
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

  const handleClearTrajectoryData = () => {
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

      // Запускаем small оптимизацию
      const smallPromise = (async () => {
        try {
          setActiveImage(1);
          // setOptimizationStatus(prev => ({ ...prev, small: 'running' }));
          // setLoadingOptimization(prev => ({ ...prev, small: true }));

          updateOptimization("small", { isLoading: true, status: "running" });

          const data = await api.trajectory.calculateMethod1(payload);
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
        } finally {
          // setOptimizationStatus(prev => ({ ...prev, small: 'completed' }));
          // setLoadingOptimization(prev => ({ ...prev, small: false }));

          updateOptimization("small", { isLoading: false, status: "completed" });

          setActiveImage(1);
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

      // Запускаем large оптимизацию
      const largePromise = (async () => {
        try {
          setActiveImage(2);
          // setOptimizationStatus(prev => ({ ...prev, large: 'running' }));
          // setLoadingOptimization(prev => ({ ...prev, large: true }));
          updateOptimization("large", { isLoading: true, status: "running" });

          const data = await api.trajectory.calculateMethod2(payload);
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
        } finally {
          updateOptimization("large", { isLoading: false, status: "completed" });

          // setOptimizationStatus(prev => ({ ...prev, large: 'completed' }));
          // setLoadingOptimization(prev => ({ ...prev, large: false }));
          setActiveImage(2);
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

      // Запускаем large оптимизацию
      const combiPromise = (async () => {
        try {
          setActiveImage(3);
          // setOptimizationStatus(prev => ({ ...prev, large: 'running' }));
          // setLoadingOptimization(prev => ({ ...prev, large: true }));
          updateOptimization("combi", { isLoading: true, status: "running" });

          const data = await api.trajectory.calculateMethod3(payload);
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
        } finally {
          updateOptimization("combi", { isLoading: false, status: "completed" });

          setActiveImage(3);
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
    "Оптимум (Комби)"
  ];

  const handleNext = () => {
    setActiveImage((prev) => (prev + 1) % trajectoryTitles.length);
  };

  const handleDownloadScene = () => {
    sceneUserTrajectoryShower.current?.handleDownload();
  };

  const [anchorEl, setAnchorEl] = React.useState(null);
  const openMenu = Boolean(anchorEl);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleDownload = (type) => {
    // Логика скачивания в зависимости от type
    if (type === 'schema') {
      sceneUserTrajectoryShower.current?.handleDownload();

      // handleDownloadScene()
    } else if (type === 'heatmap') {
      console.log('Скачиваем тепловую карту');
      // handleDownloadHeatmap()
    }
    handleClose();
  };

  const getChipProps = (status) => {
    switch (status) {
      case 'running':
        return { label: 'В процессе', color: 'warning', icon: <CircularProgress size={12} /> };
      case 'completed':
        return { label: 'Выполнено', color: 'success' };
      default:
        return { label: 'Не запущено', color: 'error' };
    }
  };

  const renderImage = (index: number) => {
    switch (index) {
      case 1:
        return (
          <SceneShower
            imageData={imageData}
            droneParams={droneParams}
            points={points}
            obstacles={obstacles}
            trajectoryData={null}
            showView={() => {
              setShowView(true);
            }}
            ref={sceneUserTrajectoryShower}
            showGrid={true}
            showUserTrajectory={true}
            showObstacles={true}
            showTaxonTrajectory={false}
            flightLineY={flightLineY}
            weatherConditions={weatherConditions}
          />
        );
      case 2:
        return (
          <SceneShower
            imageData={imageData}
            droneParams={droneParams}
            points={points}
            obstacles={obstacles}
            trajectoryData={trajectoryData}
            showView={() => {
              setShowView(true);
            }}
            ref={sceneUserTrajectoryShower}
            showGrid={true}
            showUserTrajectory={false}
            showObstacles={true}
            showTaxonTrajectory={true}
            isLoadingOptimization={optimizationState.small.isLoading}
            flightLineY={flightLineY}
            weatherConditions={weatherConditions}
          />
        );
      case 3:
        return (
          <SceneShower
            imageData={imageData}
            droneParams={droneParams}
            points={points}
            obstacles={obstacles}
            trajectoryData={trajectoryData2}
            showView={() => {
              setShowView(true);
            }}
            ref={sceneUserTrajectoryShower}
            showGrid={true}
            showUserTrajectory={false}
            showObstacles={true}
            showTaxonTrajectory={true}
            isLoadingOptimization={optimizationState.large.isLoading}
            flightLineY={flightLineY}
            weatherConditions={weatherConditions}
          />
        );
      case 4:
        return (
          <SceneShower
            imageData={imageData}
            droneParams={droneParams}
            points={points}
            obstacles={obstacles}
            trajectoryData={trajectoryData3}
            showView={() => {
              setShowView(true);
            }}
            ref={sceneUserTrajectoryShower}
            showGrid={true}
            showUserTrajectory={false}
            showObstacles={true}
            showTaxonTrajectory={true}
            isLoadingOptimization={optimizationState.combi.isLoading}
            flightLineY={flightLineY}
            weatherConditions={weatherConditions}
          />
        );
      default:
        return <Typography>Контент для изображения {index}</Typography>;
    }
  };

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
                      <ListItemText>Схема</ListItemText>
                    </MenuItem>
                    <MenuItem onClick={() => handleDownload('heatmap')}>
                      <ListItemText>Тепловая карта</ListItemText>
                    </MenuItem>
                  </Menu>
                </>

                {/* Вертикальная палочка */}
                <Divider
                  orientation="vertical"
                  flexItem
                  sx={{ mr: 1, ml: 1 }}
                />

                {/* Счётчик */}
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ whiteSpace: "nowrap", textAlign: "right" }}
                >
                  Траектория: {activeImage + 1} / {trajectoryTitles.length}
                </Typography>

                {/* Стрелка */}
                <IconButton
                  color="primary"
                  onClick={handleNext}
                  aria-label="Следующая траектория"
                  size="small"
                >
                  ❯
                </IconButton>
              </Box>
            </Box>

            <Divider />

            {/* Контент */}
            <Box
              sx={{
                mt: 2,
                width: "100%",
                maxHeight: "400px",
                // bgcolor: "#f4f6f8",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
                // borderRadius: 1,
              }}
            >
              {renderImage(activeImage + 1)}
              {/* <Typography color="text.secondary">
                Изображение #{activeImage + 1}
              </Typography> */}
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
                      label="Низкой плотности точек"
                    />
                    <Tooltip title="Показать схему" arrow placement="left">

                      <Chip
                        {...getChipProps(optimizationState.small.status)}
                        size="small"
                        variant="outlined"
                        onClick={() => setActiveImage(1)}
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
                      label="Высокой плотности точек"
                    />
                    <Tooltip title="Показать схему" arrow placement="left">

                      <Chip
                        {...getChipProps(optimizationState.large.status)}
                        size="small"
                        variant="outlined"
                        onClick={() => setActiveImage(2)}
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
                      label="Комбинированный"
                    />
                    <Tooltip title="Показать схему" arrow placement="left">
                      <Chip
                        {...getChipProps(optimizationState.combi.status)}
                        size="small"
                        variant="outlined"
                        onClick={() => setActiveImage(3)}
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
                    disabled={!isAnyOptimizationSelected}
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

                {/* Правая часть: статус */}
                <Chip
                  label={"Опционально"}
                  size="small"
                  // color={trajectoryData != null ? "success" : "error"}
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
      />
      <FlightSchemaLegendDialog
        open={isLegendOpen}
        onClose={() => setIsLegendOpen(false)}
      />
    </Box>
  );
};

export default OptimizationTrajectoryStep;
