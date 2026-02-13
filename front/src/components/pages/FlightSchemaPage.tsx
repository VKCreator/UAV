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
} from "@mui/material";
import { IconButton, Tooltip } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

import PageContainer from "../PageContainer";
import { ExifData } from "../steps/common.types";
import { Weather } from "../../types/uav.types";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";

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

interface Props {
  imageData: any; //  'any' на тип данных
  exifData: ExifData[];
  onClose: () => void;

  weatherConditions: Weather;
}

const FlightSchemaPage: React.FC<Props> = ({
  imageData,
  exifData,
  onClose,
  weatherConditions,
}) => {
  console.error(weatherConditions);
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
                borderRadius: 2,
                height: 300, // Установи нужную высоту контейнера
                width: "100%", // Ширина будет на 100% от доступного пространства
                backgroundColor: "lightgray", // Для отладки можно поставить цвет фона, если изображение не загружено
              }}
            >
              {hasImageData ? (
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
                            <strong>Производитель:</strong>{" "}
                            {renderValue(exifData[0]?.make)}
                          </Typography>

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
          <Typography variant="h6">Характеристики БПЛА</Typography>

          <Tabs value={droneTab} onChange={(_, v) => setDroneTab(v)}>
            <Tab label="Общие" />
            <Tab label="Камера" />
            <Tab label="Съёмка" />
          </Tabs>

          <Box minHeight={160}>
            <Placeholder
              label={
                droneTab === 0
                  ? "Общие характеристики БПЛА"
                  : droneTab === 1
                    ? "Параметры камеры"
                    : "Параметры съёмки"
              }
            />
          </Box>
        </Stack>

        <Divider />

        {/* Пользовательская траектория */}
        <Stack spacing={2}>
          <Typography variant="h6">Пользовательская траектория</Typography>

          <Stack direction="row" spacing={2}>
            <Box flex={1}>
              <Placeholder label="Фото / схема траектории" />
            </Box>

            <Box flex={1}>
              <Tabs
                value={userTrajectoryTab}
                onChange={(_, v) => setUserTrajectoryTab(v)}
                sx={{ mb: 2 }}
              >
                <Tab label="Препятствия" />
                <Tab label="Линия взлёта" />
                <Tab label="Точки" />
              </Tabs>

              <Box flex={1} minHeight={160}>
                <Placeholder
                  label={
                    userTrajectoryTab === 0
                      ? "Препятствия"
                      : userTrajectoryTab === 1
                        ? "Линия взлёта"
                        : "Точки"
                  }
                />
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
                      {53},{" "}
                      {59}
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

          <Placeholder
            label={
              storyboardTab === 0
                ? "Точечная раскадровка"
                : storyboardTab === 1
                  ? "Рекомендуемая раскадровка"
                  : "Оптимальная раскадровка"
            }
          />
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
