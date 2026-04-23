import { FC, useEffect, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  Box,
  TextField,
  Checkbox,
  FormControlLabel,
  Button,
  Divider,
  InputAdornment,
  Tooltip,
  Typography,
  Link,
  CircularProgress,
  Alert
} from "@mui/material";

import SpeedIcon from "@mui/icons-material/Speed";
import BatteryChargingFullIcon from "@mui/icons-material/BatteryChargingFull";
import AirIcon from "@mui/icons-material/Air";
import ExploreIcon from "@mui/icons-material/Explore";
import HourglassBottomIcon from "@mui/icons-material/HourglassBottom";
import ShieldIcon from "@mui/icons-material/Shield";
import PlaceIcon from "@mui/icons-material/Place";
import CloseIcon from "@mui/icons-material/Close";

import IconButton from "@mui/material/IconButton";

import { weatherApi } from "../../../api/weather.api";
import { LocationPickerDialog } from "./LocationPickerDialog";
import type { FlightSettings } from "../../../types/uav.types";

import { FloatInput } from "../../../components/ui/FloatInput";

import useNotifications from "../../../hooks/useNotifications/useNotifications";

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
    'c': null // штиль - нет направления
  };

  return directions[windDir] !== undefined ? directions[windDir] : null;
};

interface Props {
  open: boolean;
  data: FlightSettings;
  onClose: () => void;
  onSave: (data: FlightSettings) => void;
}

const FlightSettingsDialog: FC<Props> = ({ open, data, onClose, onSave }) => {
  const notifications = useNotifications();

  const [tab, setTab] = useState(0);
  const [form, setForm] = useState(data);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [mapOpen, setMapOpen] = useState(false);
  const [isLoadingWeather, setLoadingWeather] = useState(false);

  const [weatherNotification, setWeatherNotification] = useState<{
    message: string;
    severity: 'success' | 'error';
  } | null>(null);

  useEffect(() => {
    if (!open) return;

    setForm(data);
    setErrors({});

    const fetchWeather = async () => {
      await loadWeather(data.lat, data.lon);
    };

    if (data.useWeatherApi) fetchWeather();
  }, [data, open]);

  const handleDialogClose = (
    _: unknown,
    reason?: "backdropClick" | "escapeKeyDown",
  ) => {
    if (reason === "escapeKeyDown" || reason === "backdropClick") return;
    onClose();
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (form.windDirection < 0 || form.windDirection > 360)
      newErrors.windDirection = "Допустимый диапазон: 0–360°";

    if (form.flightSpeed <= 0)
      newErrors.flightSpeed = "Скорость должна быть больше 0";

    if (form.batteryTime <= 0)
      newErrors.batteryTime = "Время аккумулятора должно быть больше 0";

    if (form.windSpeed < 0)
      newErrors.windSpeed = "Скорость ветра не может быть отрицательной";

    if (form.hoverTime < 0)
      newErrors.hoverTime = "Время зависания не может быть отрицательным";

    if (form.windResistance <= 0)
      newErrors.windResistance = "Сопротивляемость ветру должна быть больше 0";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    onSave(form);
    onClose();
  };

  const num =
    (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm({ ...form, [field]: Number(e.target.value) });

  const loadWeather = async (lat: number, lon: number) => {
    try {
      setLoadingWeather(true);

      // Пробуем Open-meteo
      try {
        const data = await weatherApi.getCurrent(lat, lon);

        setForm((prev) => {
          if (!prev.useWeatherApi) return prev; // Если выключил - не обновляем

          setWeatherNotification({
            message: "Данные о погоде обновлены (Open-meteo)",
            severity: "success"
          });

          return {
            ...prev,
            windSpeed: data.current_weather.windspeed / 3.6,
            windDirection: data.current_weather.winddirection,
            lat,
            lon,
          };
        });
        return;

      } catch (openMeteoError) {
        console.warn('Open-meteo failed, trying Yandex:', openMeteoError);
      }

      // Пробуем Яндекс
      try {
        const yandexData = await weatherApi.getYandex(lat, lon);
        const windDirectionDegrees = convertWindDirectionToDegrees(yandexData.fact.wind_dir);

        setForm((prev) => {
          if (!prev.useWeatherApi) return prev;

          setWeatherNotification({
            message: "Данные о погоде обновлены (Яндекс.Погода)",
            severity: "success"
          });

          return {
            ...prev,
            windSpeed: yandexData.fact.wind_speed,
            windDirection: windDirectionDegrees,
            lat,
            lon,
          };
        });
        return;

      } catch (yandexError) {
        console.warn('Yandex failed, trying Weatherbit:', yandexError);
      }

      // Пробуем Weatherbit
      try {
        const alternativeData = await weatherApi.getCurrentAlternative(lat, lon);
        const weather = alternativeData["data"][0];

        setForm((prev) => {
          if (!prev.useWeatherApi) return prev;

          setWeatherNotification({
            message: "Данные о погоде обновлены (Weatherbit)",
            severity: "success"
          });

          return {
            ...prev,
            windSpeed: weather['wind_spd'],
            windDirection: weather['wind_dir'],
            lat,
            lon,
          };
        });

      } catch (weatherbitError) {
        // Все сервисы недоступны
        setForm((prev) => {
          if (!prev.useWeatherApi) return prev;

          setWeatherNotification({
            message: "Не удалось получить данные о погоде",
            severity: "error"
          });

          return {
            ...prev,
            useWeatherApi: false, // Выключаем чекбокс
          };
        });
      }

    } finally {
      setLoadingWeather(false);
    }
  };

  useEffect(() => {
    if (weatherNotification) {
      notifications.show(weatherNotification.message, {
        severity: weatherNotification.severity,
        autoHideDuration: 2000,
      });
      setWeatherNotification(null);
    }
  }, [weatherNotification]);

  return (
    <Dialog open={open} onClose={handleDialogClose} maxWidth="sm" fullWidth PaperProps={{
      sx: { minHeight: 560 }
    }}>
      <DialogTitle sx={{ pr: 5 }}>
        Параметры и условия полёта БПЛА
        <IconButton
          aria-label="Закрыть"
          onClick={onClose}
          sx={{
            position: "absolute",
            right: 8,
            top: 8,
            color: (theme) => theme.palette.grey[500],
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <Divider />

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ px: 2 }}>
        <Tab label="Параметры полёта" />
        <Tab label="Погодные условия" />
      </Tabs>

      <DialogContent dividers>
        {tab === 0 && (
          <Box>
            <Typography
              // variant="h6"
              sx={{
                // fontWeight: "bold",
                mb: 3,
                color: "text.secondary", // Цвет по умолчанию
              }}
            >
              Выбран БПЛА: {form.model}
            </Typography>{" "}
            <FloatInput
              label="Рабочая скорость, м/с"
              fullWidth
              value={form.flightSpeed}
              onChange={(val) => num("flightSpeed")({ target: { value: String(val) } } as any)}
              error={!!errors.flightSpeed}
              helperText={errors.flightSpeed}
              sx={{ mb: 1.5 }}
              InputProps={{
                startAdornment: <InputAdornment position="start"><SpeedIcon /></InputAdornment>,
              }}
            />
            <FloatInput
              label="Время работы аккумулятора, мин"
              fullWidth
              value={form.batteryTime}
              onChange={(val) => num("batteryTime")({ target: { value: String(val) } } as any)}
              error={!!errors.batteryTime}
              helperText={errors.batteryTime}
              sx={{ mb: 1.5 }}
              InputProps={{
                startAdornment: <InputAdornment position="start"><BatteryChargingFullIcon /></InputAdornment>,
              }}
            />
            <FloatInput
              label="Время зависания для фото, сек"
              fullWidth
              value={form.hoverTime}
              onChange={(val) => num("hoverTime")({ target: { value: String(val) } } as any)}
              error={!!errors.hoverTime}
              helperText={errors.hoverTime}
              sx={{ mb: 1.5 }}
              InputProps={{
                startAdornment: <InputAdornment position="start"><HourglassBottomIcon /></InputAdornment>,
              }}
            />
            <FloatInput
              label="Сопротивляемость ветру, м/с"
              fullWidth
              value={form.windResistance}
              onChange={(val) => num("windResistance")({ target: { value: String(val) } } as any)}
              error={!!errors.windResistance}
              helperText={errors.windResistance}
              sx={{ mb: 1.5 }}
              InputProps={{
                startAdornment: <InputAdornment position="start"><ShieldIcon /></InputAdornment>,
              }}
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={form.considerObstacles}
                  onChange={(e) => {
                    setForm({
                      ...form,
                      considerObstacles: e.target.checked,
                    });
                  }}
                />
              }
              label="Учитывать препятствия"
            />
            <Alert severity="info" sx={{ mt: 1, alignItems: "center" }}>
              Если кнопка «Применить» недоступна, дождитесь обновления данных о погоде.
            </Alert>
          </Box>
        )}

        {tab === 1 && (
          <Box>
            <Typography
              // variant="h6"
              sx={{
                // fontWeight: "bold",
                mb: 3,
                color: "text.secondary", // Цвет по умолчанию
              }}
            >
              Установите значение скорости ветра и направления ветра вручную или получите данные о погоде со сторонних сервисов.
            </Typography>{" "}
            <FloatInput
              label="Скорость ветра, м/с"
              fullWidth
              value={form.windSpeed}
              onChange={(val) => num("windSpeed")({ target: { value: String(val) } } as any)}
              error={!!errors.windSpeed}
              helperText={errors.windSpeed}
              disabled={form.useWeatherApi}
              sx={{ mb: 1.5 }}
              InputProps={{
                startAdornment: <InputAdornment position="start"><AirIcon /></InputAdornment>,
                endAdornment: isLoadingWeather && (
                  <InputAdornment position="end"><CircularProgress color="inherit" size={20} /></InputAdornment>
                ),
              }}
            />
            <FloatInput
              label="Направление ветра, °"
              fullWidth
              value={form.windDirection}
              onChange={(val) => num("windDirection")({ target: { value: String(val) } } as any)}
              error={!!errors.windDirection}
              helperText={errors.windDirection}
              disabled={form.useWeatherApi}
              sx={{ mb: 1.5 }}
              InputProps={{
                startAdornment: <InputAdornment position="start"><ExploreIcon /></InputAdornment>,
                endAdornment: isLoadingWeather && (
                  <InputAdornment position="end"><CircularProgress color="inherit" size={20} /></InputAdornment>
                ),
              }}
            />
            <TextField
              label="Местоположение"
              fullWidth
              size="small"
              value={`${form.lat.toFixed(5)}, ${form.lon.toFixed(5)}`}
              InputProps={{
                readOnly: true,
                endAdornment: (
                  <InputAdornment position="end">
                    <Tooltip title={"Выбрать координаты на карте"}>
                      <span>
                        <IconButton
                          disabled={false}
                          onClick={() => setMapOpen(true)}
                        >
                          <PlaceIcon />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </InputAdornment>
                ),
              }}
            />

            <FormControlLabel
              sx={{
                pt: 2,
              }}
              control={
                <Checkbox
                  checked={form.useWeatherApi}
                  onChange={(e) => {
                    setForm({
                      ...form,
                      useWeatherApi: e.target.checked,
                    });

                    if (e.target.checked) {
                      loadWeather(form.lat, form.lon);
                    }
                    else {
                      setLoadingWeather(false);
                    }
                  }}
                />
              }
              label="Получать данные о погоде со стороннего сервиса по местоположению"
            />
            <Box>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ ml: 0.5 }}
              >
                Для получения данных используются сервисы{" "}
                <Link
                  href="https://open-meteo.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  underline="hover"
                >
                  Open-Meteo.com
                </Link>
                {", "}
                <Link
                  href="https://www.weatherbit.io"
                  target="_blank"
                  rel="noopener noreferrer"
                  underline="hover"
                >
                  Weatherbit.io
                </Link>
                {", "}
                <Link
                  href="https://yandex.ru/pogoda/"
                  target="_blank"
                  rel="noopener noreferrer"
                  underline="hover"
                >
                  Yandex.ru
                </Link>
              </Typography>
            </Box>
            <Alert severity="info" sx={{ mt: 2, alignItems: "center" }}>
              Нажмите «Применить» после обновления данных.
            </Alert>
          </Box>
        )}
      </DialogContent>

      {/* <Divider /> */}
      <DialogActions>
        <Button variant="outlined" onClick={onClose}>
          Отмена
        </Button>
        <Button variant="contained" onClick={handleSave} disabled={isLoadingWeather}>
          Применить
        </Button>
      </DialogActions>

      <LocationPickerDialog
        open={mapOpen}
        onClose={() => setMapOpen(false)}
        lat={form.lat}
        lon={form.lon}
        onSelect={(lat, lon) => {
          setForm((prev) => ({
            ...prev,
            lat,
            lon,
          }));

          if (form.useWeatherApi) {
            loadWeather(lat, lon);
          }
        }}
      />
    </Dialog>
  );
};

export default FlightSettingsDialog;
