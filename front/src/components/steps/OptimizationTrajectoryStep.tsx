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
  DialogContent
} from "@mui/material";

import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import VisibilityIcon from "@mui/icons-material/Visibility";
import DownloadIcon from "@mui/icons-material/Download";
import ViewListIcon from "@mui/icons-material/ViewList";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import DeleteIcon from "@mui/icons-material/Delete";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";

import SceneShower from "../draw/SceneShower";

import type { Point, Polygon, ImageData } from "../draw/scene.types";

import { DeleteButton } from "../ui-widgets/DeleteButton";
import useImage from "use-image";
import SceneEditor from "../draw/SceneEditor";

interface OptimizationTrajectoryStepProps {
  imageData: ImageData;

  points: Point[];
  setPoints: React.Dispatch<React.SetStateAction<Point[]>>;

  obstacles: Polygon[];
  setObstacles: React.Dispatch<React.SetStateAction<Polygon[]>>;

  droneParams: any;
  setDroneParams: (params: any) => void;

  trajectoryData: any;
  setTrajectoryData: (data: any) => void;
}

const OptimizationTrajectoryStep: React.FC<OptimizationTrajectoryStepProps> = ({
  imageData,
  points,
  obstacles,
  droneParams,
  trajectoryData,
  setTrajectoryData,
}) => {
  const [activeImage, setActiveImage] = React.useState(0);
  const [image] = useImage(imageData.imageUrl);
  const [isLoadingOptimization, setLoadingOptimization] = React.useState(false);
  const [showView, setShowView] = React.useState(false);

  const [optimizationMethod, setOptimizationMethod] = React.useState<
    "small" | "large"
  >("small");

  const [windSpeed, setWindSpeed] = React.useState("");
  const [windDirection, setWindDirection] = React.useState("");
  const [useWeatherApi, setUseWeatherApi] = React.useState(false);

  const sceneUserTrajectoryShower = useRef<{ handleDownload: () => void }>(
    null,
  );

  const width_m = droneParams.frameWidthBase; // длина изображения в метрах
  const height_m = droneParams.frameHeightBase; // высота изображения в метрах

  const getPoints = () => {
    if (activeImage == 0)
      return points;
    
    return [];
  }

  const getTrajectoryData = () => {
    if (activeImage == 1)
      return trajectoryData;

    return null;
  }
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
      points: pointsInMeters,
    };

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
      setTrajectoryData(data);
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
    console.log("Раскадровка");
  };

  const trajectoryTitles = [
    "Пользовательская",
    "Оптимизированная (МКТ)",
    "Оптимизированная (БКТ)",
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
            showView={() => {}}
            ref={sceneUserTrajectoryShower}
            showGrid={true}
            showUserTrajectory={true}
            showObstacles={true}
            showTaxonTrajectory={false}
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
            showView={() => {}}
            ref={sceneUserTrajectoryShower}
            showGrid={true}
            showUserTrajectory={false}
            showObstacles={true}
            showTaxonTrajectory={true}
            isLoadingOptimization={isLoadingOptimization}
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
            showView={() => {}}
            ref={sceneUserTrajectoryShower}
            showGrid={true}
            showUserTrajectory={false}
            showObstacles={true}
            showTaxonTrajectory={false}
            isLoadingOptimization={isLoadingOptimization}
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
                <Tooltip title="Просмотр" enterDelay={500}>
                  <IconButton color="primary" onClick={() => setShowView(true)}>
                    <VisibilityIcon />
                  </IconButton>
                </Tooltip>

                <Tooltip title="Скачать" enterDelay={500}>
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

                  <Tooltip
                    title="На этом этапе выполняется оптимизация траектории, заданной пользователем, двумя методами."
                    arrow
                    enterDelay={400}
                  >
                    <IconButton
                      size="small"
                      component="span"
                      sx={{ m: 0, p: 0, ml: 1 }}
                    >
                      <HelpOutlineIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
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

              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  mt: 2,
                  border: "1px solid #e0e0e0",
                  borderRadius: 1,
                }}
              >
                <Typography fontWeight={600} sx={{ pb: 2 }}>
                  Погодные условия
                </Typography>

                <TextField
                  label="Скорость ветра, м/с"
                  fullWidth
                  size="small"
                  value={windSpeed}
                  onChange={(e) => setWindSpeed(e.target.value)}
                  sx={{ mb: 1.5 }}
                />

                <TextField
                  label="Направление ветра, °"
                  fullWidth
                  size="small"
                  value={windDirection}
                  onChange={(e) => setWindDirection(e.target.value)}
                  sx={{ mb: 1.5 }}
                />

                <FormControlLabel
                  control={
                    <Checkbox
                      checked={useWeatherApi}
                      onChange={(e) => setUseWeatherApi(e.target.checked)}
                    />
                  }
                  label="Получать данные о погоде со стороннего ресурса"
                />
              </Paper>

              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
                mt={2}
              >
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

                <DeleteButton
                  onClick={handleClearTrajectoryData}
                  disabled={trajectoryData == null}
                  tooltip="Очистить оптимизированные траектории"
                />
              </Box>
            </AccordionDetails>
          </Accordion>

          {/* 2. Раскадровка */}
          <Accordion>
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              sx={{ flexDirection: "row-reverse", gap: 1 }}
            >
              <Typography fontWeight={600}>2. Раскадровка</Typography>
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
          />
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default OptimizationTrajectoryStep;
