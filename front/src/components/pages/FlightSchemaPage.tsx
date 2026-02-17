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
} from "@mui/material";
import { IconButton, Tooltip } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

import PageContainer from "../PageContainer";
import { ExifData } from "../steps/common.types";
import { DroneParams, Weather } from "../../types/uav.types";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import SceneShower from "../draw/SceneShower";
import { Point, Polygon } from "../draw/scene.types";
import { Opt1TrajectoryData } from "../../types/optTrajectory.types";
import SceneViewer from "../draw/SceneStoryboardViewer";
import { Storyboards } from "../../types/storyboards.types";
import { HelpIconTooltip } from "../ui-widgets/HelpIconTooltip";
import StoryboardTimeline from "../draw/StoryboardTimeline";

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

interface Props {
  imageData: any; //  'any' на тип данных
  exifData: ExifData[];
  onClose: () => void;

  droneParams: DroneParams;
  weatherConditions: Weather;

  points: Point[]; // Тип данных для точек
  obstacles: Polygon[]; // Тип данных для препятствий
  trajectoryData: Opt1TrajectoryData | null; // Тип данных для траектории

  pointsRecommended?: Point[]; // Рекомендуемые точки (если есть)
  pointsOptimal?: Point[]; // Оптимальные точки (если есть)

  frameWidthPx: number;
  frameHeightPx: number;

  storyboardsData: Storyboards;

  framesUrlsPointBased?: string[]; // URL-ы кадров, если есть
}

const FlightSchemaPage: React.FC<Props> = ({
  imageData,
  exifData,
  onClose,
  droneParams,
  weatherConditions,
  points,
  obstacles,
  trajectoryData,
  pointsRecommended,
  pointsOptimal,
  frameWidthPx,
  frameHeightPx,
  storyboardsData,
  framesUrlsPointBased,
}) => {
  const [userTrajectoryTab, setUserTrajectoryTab] = React.useState(0);
  const [optimizationTab, setOptimizationTab] = React.useState(0);
  const [storyboardTab, setStoryboardTab] = React.useState(0);
  const [droneTab, setDroneTab] = React.useState(0);

  const hasExifData = exifData && exifData.length > 0;
  const hasImageData = !!imageData;

  const getWindDirectionLabel = (deg: number) => {
    const directions = [
      "Север",
      "Северо-восток",
      "Восток",
      "Юго-восток",
      "Юг",
      "Юго-запад",
      "Запад",
      "Северо-запад",
    ];

    const index = Math.round(deg / 45) % 8;
    return directions[index];
  };

  const renderValue = (value: any, suffix?: string) => {
    if (value === null || value === undefined || value === "") {
      return "—";
    }
    return suffix ? `${value} ${suffix}` : value;
  };

  return (
    <PageContainer
      title="Схема полёта"
      actions={
        <Tooltip title="Закрыть">
          <IconButton
            color="primary"
            onClick={onClose}
            aria-label="close"
            component="span"
          >
            <CloseIcon />
          </IconButton>
        </Tooltip>
      }
    >
      <Stack spacing={4}>
        {/* Информация о базовом слое */}
        <Stack spacing={2}>
          <Typography variant="h6">Информация о базовом слое</Typography>
          <Stack direction="row" spacing={2}>
            <Box
              flex={1}
              sx={{
                borderRadius: 1,
                height: 300, // Установи нужную высоту контейнера
                width: "100%", // Ширина будет на 100% от доступного пространства
                backgroundColor: "#D3D3D399", // Для отладки можно поставить цвет фона, если изображение не загружено
              }}
            >
              {imageData && hasImageData ? (
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
                sx={{ padding: 2, borderRadius: 1, height: "100%" }}
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
        </Stack>

        <Divider />

        {/* Характеристики БПЛА */}

        <Stack spacing={2}>
          <Typography variant="h6">
            Характеристики БПЛА и параметры съёмки
          </Typography>

          <Tabs value={droneTab} onChange={(_, v) => setDroneTab(v)}>
            <Tab label="Общие" />
            <Tab label="Камера" />
            <Tab label="Съёмка" />
          </Tabs>

          <Box minHeight={160} sx={{ mt: 2 }}>
            {/* ----------------- Общие ----------------- */}
            {droneTab === 0 && droneParams && (
              <Stack spacing={1}>
                <Typography>
                  <Box component="span" fontWeight={600}>
                    Модель:
                  </Box>{" "}
                  {droneParams.model || "Не задана"}
                </Typography>
                <Typography>
                  <Box component="span" fontWeight={600}>
                    Рабочая скорость:
                  </Box>{" "}
                  {droneParams.speed.toFixed(2)} м/с
                </Typography>
                <Typography>
                  <Box component="span" fontWeight={600}>
                    Время работы батареи:
                  </Box>{" "}
                  {droneParams.batteryTime.toFixed(2)} мин
                </Typography>
                <Typography>
                  <Box component="span" fontWeight={600}>
                    Время зависания для фото:
                  </Box>{" "}
                  {droneParams.hoverTime.toFixed(2)} с
                </Typography>
                <Typography>
                  <Box component="span" fontWeight={600}>
                    Устойчивость к ветру:
                  </Box>{" "}
                  {droneParams.windResistance.toFixed(2)} м/с
                </Typography>
                <Stack
                  direction="row"
                  spacing={1}
                  flexWrap="wrap"
                  alignItems="center"
                >
                  <Box component="span" fontWeight={600}>
                    Учитывать препятствия при оптимизации:
                  </Box>
                  <Chip
                    size="small"
                    variant="outlined"
                    label={droneParams.considerObstacles ? "Да" : "Нет"}
                    color={droneParams.considerObstacles ? "success" : "error"}
                  />
                </Stack>
              </Stack>
            )}

            {/* ----------------- Камера ----------------- */}
            {droneTab === 1 && droneParams && (
              <Stack spacing={1}>
                <Typography>
                  <Box component="span" fontWeight={600}>
                    Вертикальный угол обзора (FOV):
                  </Box>{" "}
                  {droneParams.uavCameraParams.fov.toFixed(2)}°
                </Typography>
                <Typography>
                  <Box component="span" fontWeight={600}>
                    Разрешение по ширине:
                  </Box>{" "}
                  {droneParams.uavCameraParams.resolutionWidth.toFixed(2)} px
                </Typography>
                <Typography>
                  <Box component="span" fontWeight={600}>
                    Разрешение по высоте:
                  </Box>{" "}
                  {droneParams.uavCameraParams.resolutionHeight.toFixed(2)} px
                </Typography>
                <Stack
                  direction="row"
                  spacing={1}
                  flexWrap="wrap"
                  alignItems="center"
                >
                  <Box component="span" fontWeight={600}>
                    Данные взяты из справочника:
                  </Box>
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
                </Stack>
              </Stack>
            )}

            {/* ----------------- Съёмка ----------------- */}
            {droneTab === 2 && droneParams && (
              <Stack spacing={1}>
                <Typography>
                  <Box component="span" fontWeight={600}>
                    Расстояние от камеры до объекта на базовом слое:
                  </Box>{" "}
                  {droneParams.distance.toFixed(2)} м
                </Typography>
                <Typography>
                  <Box component="span" fontWeight={600}>
                    Планируемое расстояние от камеры до объекта:
                  </Box>{" "}
                  {droneParams.plannedDistance.toFixed(2)} м
                </Typography>
                <Typography>
                  <Box component="span" fontWeight={600}>
                    Базовая ширина кадра:
                  </Box>{" "}
                  {droneParams.frameWidthBase.toFixed(2)} м
                </Typography>
                <Typography>
                  <Box component="span" fontWeight={600}>
                    Базовая высота кадра:
                  </Box>{" "}
                  {droneParams.frameHeightBase.toFixed(2)} м
                </Typography>
                <Typography>
                  <Box component="span" fontWeight={600}>
                    Планируемая ширина кадра:
                  </Box>{" "}
                  {droneParams.frameWidthPlanned.toFixed(2)} м
                </Typography>
                <Typography>
                  <Box component="span" fontWeight={600}>
                    Планируемая высота кадра:
                  </Box>{" "}
                  {droneParams.frameHeightPlanned.toFixed(2)} м
                </Typography>
              </Stack>
            )}
          </Box>
        </Stack>

        <Divider />

        {/* Пользовательская траектория */}
        <Stack spacing={2}>
          <Typography variant="h6">Пользовательская траектория</Typography>

          <Stack direction="row" spacing={2}>
            {/* ---------------- Фото / схема траектории ---------------- */}
            <Box
              flex={1}
              minHeight={300} /* задаём минимальную высоту для SceneShower */
              sx={{ borderRadius: 2 }}
            >
              {imageData ? (
                <SceneShower
                  imageData={imageData}
                  droneParams={droneParams}
                  points={points}
                  obstacles={obstacles}
                  trajectoryData={trajectoryData}
                  showView={() => {}}
                  ref={null}
                  showGrid={true}
                  showUserTrajectory={true}
                  showObstacles={true}
                  showTaxonTrajectory={false}
                />
              ) : (
                <Placeholder label="Фото / схема траектории" />
              )}
            </Box>

            {/* ---------------- Панель вкладок ---------------- */}
            <Box flex={1} display="flex" flexDirection="column" height="100%">
              <Tabs
                value={userTrajectoryTab}
                onChange={(_, v) => setUserTrajectoryTab(v)}
                sx={{ mb: 2 }}
              >
                <Tab label="Препятствия" />
                <Tab label="Линия взлёта" />
                <Tab label="Точки" />
              </Tabs>

              {/* Контейнер с прокруткой на всю оставшуюся высоту */}
              <Box flex={1} overflow="auto" maxHeight={335}>
                {userTrajectoryTab === 0 ? (
                  <Stack spacing={1} p={1}>
                    <Typography variant="body2" fontWeight={600}>
                      Количество препятствий: {obstacles?.length || 0} шт.
                    </Typography>

                    {obstacles?.map((obstacle, idx) => (
                      <Card key={obstacle.id} variant="outlined" sx={{ p: 1 }}>
                        <Stack direction="row" spacing={1} alignItems="center">
                          {/* Цветной кружок */}
                          <Box
                            sx={{
                              width: 12,
                              height: 12,
                              borderRadius: "50%",
                              bgcolor: obstacle.color,
                            }}
                          />
                          <Typography fontWeight={600}>
                            Препятствие №{idx + 1}
                          </Typography>
                          <Typography color="text.secondary" ml={1}>
                            {obstacle.points.length} точ.
                          </Typography>
                        </Stack>
                      </Card>
                    ))}
                  </Stack>
                ) : userTrajectoryTab === 1 ? (
                  <Placeholder label="Линия взлёта" />
                ) : (
                  <Placeholder label="Точки" />
                )}
              </Box>
            </Box>
          </Stack>
        </Stack>
        <Divider />

        {/* Место и погодные условия полёта */}
        <Stack spacing={2}>
          <Typography variant="h6">Место и погодные условия полёта</Typography>

          <Stack direction="row" spacing={2}>
            {/* Карта */}
            <Box flex={1} height={300}>
              {weatherConditions?.position.lat &&
              weatherConditions?.position.lon ? (
                <MapContainer
                  center={[
                    weatherConditions.position.lat,
                    weatherConditions.position.lon,
                  ]}
                  zoom={14}
                  style={{ height: "100%", width: "100%", borderRadius: 8 }}
                  scrollWheelZoom={true}
                >
                  <TileLayer
                    attribution="&copy; OpenStreetMap contributors"
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <Marker
                    position={[
                      weatherConditions.position.lat,
                      weatherConditions.position.lon,
                    ]}
                  >
                    <Popup>
                      Координаты полёта <br />
                      {weatherConditions.position.lat},{" "}
                      {weatherConditions.position.lon}
                    </Popup>
                  </Marker>
                </MapContainer>
              ) : (
                // <Placeholder label="Нет координат" />
                <MapContainer
                  center={[53, 59]}
                  zoom={14}
                  style={{ height: "100%", width: "100%", borderRadius: 8 }}
                  scrollWheelZoom={true}
                >
                  <TileLayer
                    attribution="&copy; OpenStreetMap contributors"
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <Marker position={[53, 59]}>
                    <Popup>
                      Координаты полёта <br />
                      {53}, {59}
                    </Popup>
                  </Marker>
                </MapContainer>
              )}
            </Box>

            {/* Погода */}
            <Box
              flex={1}
              component={Paper}
              elevation={1}
              variant="outlined"
              sx={{ p: 2 }}
            >
              <Stack spacing={1.5}>
                <Typography variant="subtitle1">Погодные условия</Typography>
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    Скорость ветра
                  </Typography>
                  <Typography variant="body2" fontWeight={500}>
                    {weatherConditions?.windSpeed ?? "—"} м/с
                  </Typography>
                </Box>

                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    Направление ветра
                  </Typography>
                  <Typography variant="body2" fontWeight={500}>
                    {weatherConditions?.windDirection ?? "—"}°
                    {weatherConditions?.windDirection !== undefined &&
                      ` (${getWindDirectionLabel(weatherConditions.windDirection)})`}
                  </Typography>
                </Box>

                <Divider />

                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    Координаты
                  </Typography>
                  <Typography variant="body2" fontWeight={500}>
                    {weatherConditions?.position
                      ? `${weatherConditions.position.lat}, ${weatherConditions.position.lon}`
                      : "—"}
                  </Typography>
                </Box>

                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    Источник данных
                  </Typography>
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
                      ? "Open-meteo.com"
                      : "Введено вручную"}
                  </Typography>
                </Box>
                <Divider />

                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    Погода при оптимизации
                  </Typography>
                  <Chip
                    size="small"
                    label={
                      weatherConditions?.useWeatherApi
                        ? "Учитывается"
                        : "Не учитывается"
                    }
                    color={
                      weatherConditions?.useWeatherApi ? "success" : "default"
                    }
                    variant={
                      weatherConditions?.useWeatherApi ? "outlined" : "outlined"
                    }
                  />{" "}
                </Box>
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    Сопротивляемость БПЛА ветру
                  </Typography>

                  <Chip
                    size="small"
                    label={weatherConditions?.useWeatherApi ? "Да" : "Нет"}
                    color={
                      weatherConditions?.useWeatherApi ? "success" : "error"
                    }
                    variant="outlined"
                  />
                </Box>
              </Stack>
            </Box>
          </Stack>
        </Stack>
        <Divider />

        {/* Оптимизация траектории */}
        <Stack spacing={2}>
          <Typography variant="h6">Оптимизация траектории</Typography>

          <Tabs
            value={optimizationTab}
            onChange={(_, v) => setOptimizationTab(v)}
          >
            <Tab label="Метод 1" />
            <Tab label="Метод 2" />
          </Tabs>

          <Stack direction="row" spacing={2}>
            <Box flex={1}>
              <Placeholder label="Фото оптимизации" />
            </Box>
            <Box flex={1}>
              <Placeholder
                label={
                  optimizationTab === 0
                    ? "Описание метода 1"
                    : "Описание метода 2"
                }
              />
            </Box>
          </Stack>
        </Stack>

        <Divider />

        {/* Раскадровка */}
        <Stack spacing={2}>
          <Typography variant="h6">Раскадровка</Typography>

          <Tabs value={storyboardTab} onChange={(_, v) => setStoryboardTab(v)}>
            <Tab label="Точечная" />
            <Tab label="Рекомендуемая" />
            <Tab label="Оптимальная" />
          </Tabs>

          <Box flex={1} minHeight={400} maxHeight={400}>
            {storyboardTab === 0 && (
              <Box display="flex" flexDirection="row" height="100%" gap={2}>
                {/* Левая панель: SceneViewer */}
                <Box
                  flex={0.5}
                  minHeight={400}
                  maxHeight={400}
                  sx={{ background: "lightgray" }}
                >
                  <SceneViewer
                    imageData={imageData}
                    points={points}
                    obstacles={obstacles}
                    trajectoryData={trajectoryData}
                    showPoints={true}
                    showObstacles={false}
                    showTaxons={false}
                    frameWidthPx={frameWidthPx}
                    frameHeightPx={frameHeightPx}
                    applyPointBasedStoryboard={true}
                    applyRecommendedStoryboard={false}
                    applyOptimalStoryboard={false}
                    width_m={droneParams?.frameWidthBase || 0}
                    height_m={droneParams?.frameHeightBase || 0}
                  />
                </Box>

                {/* Правая панель: placeholder / инфо */}
                <Box
                  flex={1}
                  p={2}
                  borderRadius={1}
                  component={Paper}
                  elevation={1}
                  variant="outlined"
                  display="flex"
                  flexDirection="column"
                  justifyContent={"space-between"}
                  overflow="auto"
                >
                  <Stack spacing={1.5}>
                    <Typography variant="subtitle1">
                      Свойства раскадровки
                    </Typography>

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
                        {storyboardsData?.point.count_frames
                          ? `${storyboardsData.point.count_frames} шт.`
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
                        {storyboardsData?.point.disk_space
                          ? `${formatFileSize(storyboardsData.point.disk_space)}`
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
                        {storyboardsData?.point.total_flight_time
                          ? `${storyboardsData.point.total_flight_time.toFixed(2)} с.`
                          : "—"}
                      </Typography>
                    </Box>
                  </Stack>
                  <Box
                    sx={{overflowX: "auto", overflowY: "hidden"}} // добавляем горизонтальный скролл
                  >
                    <Box>
                      <StoryboardTimeline frames={framesUrlsPointBased} />
                    </Box>
                  </Box>
                </Box>
              </Box>
            )}

            {storyboardTab === 1 && (
              <SceneViewer
                imageData={imageData}
                pointsRecommended={pointsRecommended}
                obstacles={obstacles}
                trajectoryData={trajectoryData}
                showPoints={true}
                showObstacles={false}
                showTaxons={false}
                frameWidthPx={frameWidthPx}
                frameHeightPx={frameHeightPx}
                applyPointBasedStoryboard={false}
                applyRecommendedStoryboard={true}
                applyOptimalStoryboard={false}
                width_m={droneParams?.frameWidthBase || 0}
                height_m={droneParams?.frameHeightBase || 0}
              />
            )}

            {storyboardTab === 2 && (
              <SceneViewer
                imageData={imageData}
                pointsOptimal={[]}
                obstacles={obstacles}
                trajectoryData={trajectoryData}
                showPoints={true}
                showObstacles={false}
                showTaxons={true}
                frameWidthPx={frameWidthPx}
                frameHeightPx={frameHeightPx}
                applyPointBasedStoryboard={false}
                applyRecommendedStoryboard={false}
                applyOptimalStoryboard={true}
                width_m={droneParams?.frameWidthBase || 0}
                height_m={droneParams?.frameHeightBase || 0}
              />
            )}
          </Box>
        </Stack>

        <Divider />

        {/* Сравнение оптимизаций */}
        <Stack spacing={2} pb={5}>
          <Typography variant="h6">Сравнение оптимизаций</Typography>

          <Stack direction="row" spacing={2}>
            <Box flex={1}>
              <Placeholder label="График 1" />
            </Box>
            <Box flex={1}>
              <Placeholder label="График 2" />
            </Box>
          </Stack>
        </Stack>
      </Stack>
    </PageContainer>
  );
};

export default FlightSchemaPage;
