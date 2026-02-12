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
} from "@mui/material";
import { IconButton, Tooltip } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

import PageContainer from "../PageContainer";
import { ExifData } from "../steps/common.types";

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
}

const FlightSchemaPage: React.FC<Props> = ({
  imageData,
  exifData,
  onClose,
}) => {
  const [userTrajectoryTab, setUserTrajectoryTab] = React.useState(0);
  const [optimizationTab, setOptimizationTab] = React.useState(0);
  const [storyboardTab, setStoryboardTab] = React.useState(0);

  return (
    <PageContainer
      title="Схема полёта"
      actions={
        <Tooltip title="Закрыть">
          <IconButton color="primary" onClick={onClose} aria-label="close" component="span">
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
              {/* <img
                src={imageData.imageUrl}
                alt="Фото базового слоя"
                style={{
                  width: "100%", // Ширина будет на 100% от контейнера
                  height: "100%", // Высота будет на 100% от контейнера
                  objectFit: "contain", // Масштабируем изображение пропорционально
                }}
              /> */}
            </Box>
            <Box flex={1}>
              <Paper
                elevation={1}
                variant="outlined"
                sx={{ padding: 2, borderRadius: 1, height: "100%" }}
              >
                <Stack spacing={2} height="100%">
                  <Typography variant="h6">Метаданные изображения</Typography>
                  {/* <Grid container spacing={2} height="100%">
                    <Grid size={{ xs: 6 }}>
                      <Box
                        display="flex"
                        flexDirection="column"
                        justifyContent="space-between"
                        height="100%"
                      >
                        <Typography variant="body2">
                          <strong>Фото:</strong> {exifData[0].fileName}
                        </Typography>
                        <Typography variant="body2">
                          <strong>Размер:</strong> {exifData[0].fileSize}
                        </Typography>
                        {exifData[0].width && (
                          <Typography variant="body2">
                            <strong>Ширина:</strong> {exifData[0].width} px
                          </Typography>
                        )}
                        {exifData[0].height && (
                          <Typography variant="body2">
                            <strong>Высота:</strong> {exifData[0].height} px
                          </Typography>
                        )}
                        {exifData[0].dateTime && (
                          <Typography variant="body2">
                            <strong>Дата/время:</strong>{" "}
                            {exifData[0].dateTime.toString()}
                          </Typography>
                        )}
                      </Box>
                    </Grid>

                    <Grid size={{ xs: 6 }}>
                      <Box
                        display="flex"
                        flexDirection="column"
                        justifyContent="space-between"
                        height="100%"
                      >
                        {exifData[0].make && (
                          <Typography variant="body2">
                            <strong>Производитель:</strong> {exifData[0].make}
                          </Typography>
                        )}
                        {exifData[0].model && (
                          <Typography variant="body2">
                            <strong>Модель:</strong> {exifData[0].model}
                          </Typography>
                        )}
                        <Typography variant="body2">
                          <strong>Фокусное расстояние:</strong>{" "}
                          {exifData[0].focalLength} мм
                        </Typography>
                        <Typography variant="body2">
                          <strong>Фокусное расстояние в 35мм формате:</strong>{" "}
                          {exifData[0].focalLengthIn35mmFormat} мм
                        </Typography>
                        {exifData[0].latitude && (
                          <Typography variant="body2">
                            <strong>Широта:</strong> {exifData[0].latitude}
                          </Typography>
                        )}
                        {exifData[0].longitude && (
                          <Typography variant="body2">
                            <strong>Долгота:</strong> {exifData[0].longitude}
                          </Typography>
                        )}
                      </Box>
                    </Grid>
                  </Grid> */}
                </Stack>
              </Paper>
            </Box>
          </Stack>
        </Stack>

        <Divider />

        {/* Характеристики БПЛА */}
        <Stack spacing={2}>
          <Typography variant="h6">Характеристики БПЛА</Typography>
          <Placeholder label="Модель, параметры, характеристики и т.д." />
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
