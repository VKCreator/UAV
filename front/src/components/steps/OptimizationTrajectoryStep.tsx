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
} from "@mui/material";

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
import FlightSchemaLegendDialog from "../ui-widgets/FlightSchemaLegendDialog";

import type { Point, Polygon, ImageData } from "../draw/scene.types";
import type {
  Weather,
  DroneParams,
  FlightSettings,
} from "../../types/uav.types";
import type { Storyboard, Storyboards } from "../../types/storyboards.types";

import { HelpIconTooltip } from "../ui-widgets/HelpIconTooltip";
import { DeleteButton } from "../ui-widgets/DeleteButton";
import FlightSettingsDialog from "../ui-widgets/FlightSettingsDialog";
import OptimizationDetailDialog from "../ui-widgets/OptimizationDetailDialog";

import useImage from "use-image";

import SceneEditor from "../draw/SceneEditor";
import StoryboardEditor from "../draw/StoryboardEditor";
import SceneShower from "../draw/SceneShower";

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

  pointsRecommended: Point[];
  setPointsRecommended: React.Dispatch<React.SetStateAction<Point[]>>;

  selection: any;
  setSelection: React.Dispatch<React.SetStateAction<any>>;

  flightLineY: number;
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

const OptimizationTrajectoryStep: React.FC<OptimizationTrajectoryStepProps> = ({
  imageData,
  points,
  obstacles,
  droneParams,
  setDroneParams,
  trajectoryData,
  setTrajectoryData,
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
  pointsRecommended,
  setPointsRecommended,
  selection,
  setSelection,
  flightLineY,
}) => {
  const [activeImage, setActiveImage] = React.useState(0);
  const [image] = useImage(imageData.imageUrl);
  const [isLoadingOptimization, setLoadingOptimization] = React.useState(false);
  const [showView, setShowView] = React.useState(false);
  const [showStoryboardEditor, setShowStoryboardEditor] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const [openOptimizationDetailDialog, setOpenOptimizationDetailDialog] =
    React.useState(false);

  const [isLegendOpen, setIsLegendOpen] = React.useState(false);

  const [optimizationMethod, setOptimizationMethod] = React.useState<
    "small" | "large"
  >("small");

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

    return null;
  };
  const handleClearTrajectoryData = () => {
    setTrajectoryData(null);
  };

  const handleRunOptimization = async () => {
    if (!image || points.length === 0) return;
    setActiveImage(1);
    setLoadingOptimization(true);

    // setLoading(true);

    const meterPerPixelX = width_m / image.width;
    const meterPerPixelY = height_m / image.height;

    const pointsInMeters = points.map((p) => ({
      x: p.x * meterPerPixelX,
      y: (image.height - p.y) * meterPerPixelY,
    }));

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
    };

    try {
      const response = await fetch(
        "http://nmstuvtip.ddnsking.com:5000/api/calculate-trajectory",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const data = await response.json();
      console.log("Ответ API:", data);

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
      console.error("Ошибка запроса:", err);
    } finally {
      // setLoading(false);
      setLoadingOptimization(false);
    }
  };

  // const handleRunOptimization = () => {
  //   console.log("Оптимизация запущена");
  // };

  const handleStoryboard = () => {
    setShowStoryboardEditor(true);
  };

  const trajectoryTitles = [
    "Пользовательская",
    "Оптимум (МКТ)",
    "Оптимум (БКТ)",
  ];

  const handleNext = () => {
    setActiveImage((prev) => (prev + 1) % trajectoryTitles.length);
  };

  const handleDownloadScene = () => {
    sceneUserTrajectoryShower.current?.handleDownload();
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
            isLoadingOptimization={isLoadingOptimization}
            flightLineY={flightLineY}
          />
        );
      case 3:
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
            showTaxonTrajectory={false}
            isLoadingOptimization={isLoadingOptimization}
            flightLineY={flightLineY}
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

              <Box sx={{ display: "flex", alignItems: "center", gap: 0 }}>
                <Tooltip title="Просмотр схемы" enterDelay={500}>
                  <IconButton color="primary" onClick={() => setShowView(true)}>
                    <VisibilityIcon />
                  </IconButton>
                </Tooltip>

                {/* Легенда */}
                <Tooltip title="Легенда схемы" enterDelay={500}>
                  <IconButton
                    color="primary"
                    onClick={() => setIsLegendOpen(true)}
                    aria-label="Легенда"
                  >
                    <InfoIcon />
                  </IconButton>
                </Tooltip>

                <Tooltip title="Скачать схему" enterDelay={500}>
                  <IconButton color="primary" onClick={handleDownloadScene}>
                    <DownloadIcon />
                  </IconButton>
                </Tooltip>

                {/* Вертикальная палочка */}
                <Divider
                  orientation="vertical"
                  flexItem
                  sx={{ mr: 2, ml: 1 }}
                />

                {/* Счётчик */}
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ whiteSpace: "nowrap" }}
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
                  <HelpIconTooltip title="На этом этапе выполняется оптимизация траектории, заданной пользователем, двумя методами." />
                </Box>

                {/* Правая часть: статус */}
                <Chip
                  label={trajectoryData != null ? "Выполнено" : "Не запущено"}
                  size="small"
                  color={trajectoryData != null ? "success" : "error"}
                  variant="outlined"
                />
              </Box>
            </AccordionSummary>

            <AccordionDetails>
              <Typography variant="subtitle2" gutterBottom>
                Метод оптимизации
              </Typography>

              <RadioGroup
                value={optimizationMethod}
                onChange={(e) => setOptimizationMethod(e.target.value as any)}
              >
                <FormControlLabel
                  value="small"
                  control={<Radio />}
                  label="Малое количество точек"
                />
                <FormControlLabel
                  value="large"
                  control={<Radio />}
                  label="Большое количество точек"
                  disabled
                />
              </RadioGroup>

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
                    disabled={trajectoryData == null}
                  >
                    Детали оптимизации
                  </Button>
                </Box>

                <Box>
                  <Tooltip title="Параметры полёта">
                    <IconButton onClick={() => setOpen(true)} size="small">
                      <SettingsIcon />
                    </IconButton>
                  </Tooltip>

                  <DeleteButton
                    onClick={handleClearTrajectoryData}
                    disabled={trajectoryData == null}
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
            sceneTitle="Просмотр схемы полётов"
            points={getPoints()}
            setPoints={() => {}}
            obstacles={obstacles}
            setObstacles={() => {}}
            trajectoryData={getTrajectoryData()}
            setTrajectoryData={setTrajectoryData}
            flightLineY={flightLineY}
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
            droneParams={droneParams}
            storyboardsData={storyboardsData}
            setStoryboardsData={setStoryboardsData}
            framesUrlsPointBased={framesUrlsPointBased}
            setFramesUrlsPointBased={setFramesUrlsPointBased}
            framesUrlsRecommended={framesUrlsRecommended}
            setFramesUrlsRecommended={setFramesUrlsRecommended}
            framesUrlsOptimal={framesUrlsOptimal}
            setFramesUrlsOptimal={setFramesUrlsOptimal}
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
          });
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
