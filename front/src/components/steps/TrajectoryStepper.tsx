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
} from "@mui/material";

import EditIcon from "@mui/icons-material/Edit";
import KeyboardArrowLeftIcon from "@mui/icons-material/KeyboardArrowLeft";
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";
import VisibilityIcon from "@mui/icons-material/Visibility";

import { useDialogs } from "../../hooks/useDialogs/useDialogs";
import { useNavigate } from "react-router";
import useNotifications from "../../hooks/useNotifications/useNotifications";

import ImageUploadStep from "./ImageUploadStep";
import BuildTrajectoryStep from "./BuildTrajectoryStep";
import OptimizationTrajectoryStep from "./OptimizationTrajectoryStep";
import CompareOptimizationMethodsStep from "./CompareOptimizationMethodsStep";

import FlightSchemaPage from "../pages/FlightSchemaPage";

import type { ExifData } from "./common.types";
import type { Point, Polygon } from "../draw/scene.types";
import type { DroneParams, Weather } from "../../types/uav.types";
import type { Opt1TrajectoryData } from "../../types/optTrajectory.types";

import { Fab, Zoom, useScrollTrigger } from "@mui/material";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import { api } from "../../api/client";

const TrajectoryStepper: React.FC<{
  onSubmit: () => void;
  onReset: () => void;
}> = ({ onSubmit, onReset }) => {
  const navigate = useNavigate();
  const notifications = useNotifications();

  const { confirm } = useDialogs();

  const [activeStep, setActiveStep] = React.useState(0);
  const [schemaName, setSchemaName] = React.useState("Схема 1");
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [dialogValue, setDialogValue] = React.useState("");
  const [error, setError] = React.useState("");

  // Step 1
  const [files, setFiles] = React.useState<File[]>([]);
  const [exifData, setExifData] = React.useState<ExifData[]>([]);
  const [imageUrl, setImageUrl] = React.useState<string>("");

  const imageData = {
    imageUrl,
    fileName: files[0]?.name || "",
    width: exifData[0]?.width,
    height: exifData[0]?.height,
  };

  // Step 2
  const [points, setPoints] = React.useState<Point[]>([]);
  const [obstacles, setObstacles] = React.useState<Polygon[]>([]);
  const [droneParams, setDroneParams] = React.useState<DroneParams>({
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
  });

  console.info(droneParams);

  // Step 3
  const [opt1TrajectoryData, setOpt1TrajectoryData] =
    React.useState<Opt1TrajectoryData | null>(null);
  const [opt2TrajectoryData, setOpt2TrajectoryData] = React.useState<any>(null);

  const initWeather: Weather = {
    windSpeed: 10,
    windDirection: 180,
    useWeatherApi: true,
    position: {
      lat: 53.4260327, // ММК
      lon: 59.0531761,
    },
  };
  const [weatherConditions, setWeatherConditions] =
    React.useState<Weather>(initWeather);

  // Step 4
  const [openPreviewPage, setPreviewPage] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [fadeOut, setFadeOut] = React.useState(false); // Состояние для анимации

  const handleImageUpload = (newFiles: File[], newExif: ExifData[]) => {
    setFiles(newFiles);
    setExifData(newExif);
    setPoints([]);
    setObstacles([]);
    setOpt1TrajectoryData(null);

    if (imageUrl) {
      URL.revokeObjectURL(imageUrl);
      setImageUrl(String());
    }
  };

  const handleImageDelete = () => {
    setFiles([]);
    setExifData([]);
    setPoints([]);
    setObstacles([]);
    setOpt1TrajectoryData(null);

    if (imageUrl) {
      URL.revokeObjectURL(imageUrl);
      setImageUrl(String());
    }
  };

  const handleCreateSchema = React.useCallback(async () => {
    try {
      if (!files[0]) {
        notifications.show("Не выбрано изображение", {
          severity: "error",
        });
        return;
      }

      const formData = new FormData();

      formData.append("schemaName", schemaName);
      formData.append("image", files[0]); // сам файл
      formData.append("pointsCount", String(points.length));
      formData.append("distance", String(droneParams.distance));
      formData.append("flightTime", String(15));
      formData.append("method", "METHOD_1");
      formData.append("isWeatherConditions", String(true));

      setLoading(true); // Включаем спиннер

      await api.schemas.create(formData);

      setFadeOut(true);
      // Ждём окончания анимации, затем отключаем спиннер
      setTimeout(() => {
        setLoading(false); // Скрываем спиннер
        navigate("/trajectories"); // Переход на другую страницу
        notifications.show("Схема полётов создана", {
          severity: "success",
          autoHideDuration: 3000,
        });
      }, 1000); // Задержка перед навигацией (по времени, равному анимации)

      navigate("/trajectories");
    } catch (error) {
      setLoading(false); // Скрываем спиннер
      notifications.show(
        `Не удалось создать схему. Причина: ${(error as Error).message}`,
        {
          severity: "error",
          autoHideDuration: 5000,
        },
      );
    }
  }, [
    schemaName,
    files,
    points.length,
    droneParams.distance,
    navigate,
    notifications,
  ]);

  const steps = [
    "Загрузка базового слоя",
    "Построение траектории",
    "Оптимизация траектории",
    "Сравнение траекторий",
  ];

  const handleNext = () => {
    if (activeStep < steps.length - 1) {
      setActiveStep(activeStep + 1);
    }
  };

  const handleBack = () => {
    if (activeStep > 0) {
      setActiveStep(activeStep - 1);
    } else {
      handleBackClick();
    }
  };

  const handleBackClick = React.useCallback(async () => {
    const shouldNavigate = await confirm(
      "Вы хотите прервать создание схемы полетов?",
      {
        title: "Подтверждение", // Заголовок окна
        okText: "Да", // Кнопка подтверждения
        cancelText: "Нет", // Кнопка отмены
      },
    );

    if (shouldNavigate) {
      navigate("/trajectories");
    }
  }, [navigate, confirm]);

  const handleOpenDialog = () => {
    setDialogValue(schemaName);
    setError("");
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setError("");
  };

  const handleSaveSchemaName = () => {
    if (!dialogValue.trim()) {
      setError("Название схемы обязательно");
      return;
    }
    if (dialogValue.length > 50) {
      setError("Название не должно превышать 50 символов");
      return;
    }

    setSchemaName(dialogValue.trim());
    handleCloseDialog();
  };

  React.useEffect(() => {
    console.info("new image");
    if (files.length > 0) {
      const url = URL.createObjectURL(files[0]);
      setImageUrl(url);

      return () => {
        console.info("useEffect", "clear memory");
        URL.revokeObjectURL(url);
      };
    }
  }, [files]);

  const isDisabled =
    (activeStep === 0 && imageUrl === "") ||
    (activeStep === 1 && points.length === 0) ||
    (activeStep == 2 && opt1TrajectoryData == null);

  const tooltipTitle =
    activeStep === 0 && imageUrl === ""
      ? "Для шага 2 нужно загрузить базовый слой"
      : activeStep === 1 && points.length === 0
        ? "Для шага 3 требуется построение пользовательской траектории"
        : activeStep === 2 && opt1TrajectoryData === null
          ? "Для шага 4 требуется оптимизация пользовательской траектории"
          : "";

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
            droneParams={droneParams}
            setDroneParams={setDroneParams}
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
            weatherConditions={weatherConditions}
            setWeatherConditions={setWeatherConditions}
          />
        );
      case 3:
        return <CompareOptimizationMethodsStep />;

      default:
        return (
          <Paper sx={{ p: 3, height: "2000px" }}>
            <Typography variant="h6" gutterBottom>
              {steps[activeStep]}
            </Typography>
            <Typography>Содержимое шага {activeStep + 1}</Typography>
          </Paper>
        );
    }
  };

  const containerRef = React.useRef<HTMLDivElement>(null);
  const [triggerTarget, setTriggerTarget] = React.useState<HTMLElement | null>(
    null,
  );

  // Когда ref инициализируется, сохраняем его в state
  React.useEffect(() => {
    if (containerRef.current) {
      setTriggerTarget(containerRef.current);
    }
  }, []);

  // триггер будет работать только когда target !== null
  const trigger = useScrollTrigger({
    disableHysteresis: true,
    threshold: 100,
    target: triggerTarget || undefined,
  });

  const handleClick = () => {
    containerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <Box
      sx={{
        width: "100%",
        display: "flex",
        flexDirection: "column",
        height: "calc(100vh - 90px)",
        overflow: "hidden",
        // position: "relative",
      }}
    >
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
            opacity: fadeOut ? 0 : 1, // Плавное исчезновение
            transition: "opacity 1s ease", // Плавное исчезновение за 1 секунды
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

      <Box
        sx={{
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          gap: 1,
          pl: 2,
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 400 }}>
          Название:
        </Typography>
        <Typography variant="h6" sx={{ fontWeight: 300 }}>
          {schemaName}
        </Typography>
        <Tooltip title="Изменить">
          <IconButton size="small" onClick={handleOpenDialog}>
            <EditIcon fontSize="small" color="action" />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Степпер */}
      <Box sx={{ pt: 2, pb: 0, pl: 0, pr: 0, flexShrink: 0, overflow: "auto" }}>
        <Stepper
          activeStep={activeStep}
          alternativeLabel
          sx={{
            "& .MuiStepIcon-root": {
              "&.Mui-active": {
                color: "#014488ff", // активный шаг
              },
              "&.Mui-completed": {
                color: "#014488ff", // завершённый шаг
              },
            },
            borderBottom: "1px solid #e0e0e0",
            paddingBottom: 2,
          }}
        >
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
      </Box>

      <Box
        sx={{
          flex: 1,
          overflowY: "auto",
          p: 1,
        }}
      >
        {renderStepContent()}
      </Box>

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
          // disabled={activeStep === 0}
          onClick={handleBack}
          variant="outlined"
          startIcon={<KeyboardArrowLeftIcon />}
        >
          Назад
        </Button>

        <Box
          display="flex"
          alignItems="center"
          justifyContent="space-between"
          gap={1.5}
        >
          {/* Левая кнопка: Просмотр схемы */}
          {activeStep === 3 && (
            <Button
              variant="outlined"
              color="primary"
              onClick={() => {
                setPreviewPage(true);
              }} // функция для открытия полной схемы
              startIcon={<VisibilityIcon />}
            >
              Просмотр схемы
            </Button>
          )}

          {/* Правая кнопка: Далее/Создать */}
          <Tooltip
            title={isDisabled ? tooltipTitle : ""}
            arrow
            disableHoverListener={!isDisabled}
          >
            <span>
              <Button
                onClick={
                  activeStep === steps.length - 1
                    ? handleCreateSchema
                    : handleNext
                }
                variant="contained"
                color="primary"
                endIcon={<KeyboardArrowRightIcon />}
                disabled={isDisabled}
              >
                {activeStep === steps.length - 1 ? "Создать" : "Далее"}
              </Button>
            </span>
          </Tooltip>
        </Box>
      </Box>

      <Dialog
        open={isDialogOpen}
        onClose={(event, reason) => {
          if (reason !== "backdropClick") {
            handleCloseDialog();
          }
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Изменить название схемы</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Название схемы"
            type="text"
            fullWidth
            variant="outlined"
            value={dialogValue}
            onChange={(e) => {
              const newValue = e.target.value;
              setDialogValue(newValue);
              if (newValue.trim() !== "") {
                setError("");
              } else setError("Название схемы обязательно");
            }}
            error={!!error}
            helperText={error}
            inputProps={{
              maxLength: 50,
            }}
          />
          {!error && (
            <Typography
              variant="caption"
              color="textSecondary"
              align="right"
              sx={{ pl: "14px" }}
            >
              Количество символов: {dialogValue.length}/50
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} variant="outlined">
            Отмена
          </Button>
          <Button
            onClick={handleSaveSchemaName}
            variant="contained"
            color="primary"
            disabled={!!error}
          >
            Сохранить
          </Button>
        </DialogActions>
      </Dialog>

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
            onClose={() => {
              setPreviewPage(false);
            }}
            weatherConditions={weatherConditions}
          />
          <Zoom in={true}>
            <Box
              onClick={handleClick}
              role="presentation"
              sx={{
                position: "fixed",
                bottom: 24,
                right: 32,
                zIndex: 1000,
              }}
            >
              <Tooltip title="Наверх" arrow>
                <Fab
                  size="small"
                  aria-label="scroll back to top"
                  sx={{
                    bgcolor: "#004E9E", // фон кнопки
                    "&:hover": {
                      bgcolor: "#004E9E", // фон при наведении
                    },
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
