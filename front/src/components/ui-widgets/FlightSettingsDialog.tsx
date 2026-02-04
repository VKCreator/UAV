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
  Tooltip
} from "@mui/material";

import SpeedIcon from "@mui/icons-material/Speed";
import BatteryChargingFullIcon from "@mui/icons-material/BatteryChargingFull";
import AirIcon from "@mui/icons-material/Air";
import ExploreIcon from "@mui/icons-material/Explore";
import HourglassBottomIcon from "@mui/icons-material/HourglassBottom";
import ShieldIcon from "@mui/icons-material/Shield";
import PlaceIcon from "@mui/icons-material/Place";
import IconButton from "@mui/material/IconButton";

import { api } from "../../api/client";
import { LocationPickerDialog } from "./LocationPickerDialog";
import { useOnlineStatus } from "../../hooks/useOnlineStatus/useOnlineStatus";

export interface FlightSettings {
  flightSpeed: number;
  batteryTime: number;
  hoverTime: number;
  windResistance: number;
  considerObstacles: boolean;
  windSpeed: number;
  windDirection: number;
  useWeatherApi: boolean;
}

interface Props {
  open: boolean;
  data: FlightSettings;
  onClose: () => void;
  onSave: (data: FlightSettings) => void;
}

const FlightSettingsDialog: FC<Props> = ({ open, data, onClose, onSave }) => {
  const isOnline = useOnlineStatus();

  const [tab, setTab] = useState(0);
  const [form, setForm] = useState(data);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [mapOpen, setMapOpen] = useState(false);
  const [lat, setLat] = useState(53.4260327);
  const [lon, setLon] = useState(59.0531761);

  useEffect(() => {
    setForm(data);
    setErrors({});
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

  const loadWeather = async () => {
    console.log("loadWeather");
    try {
      const data = await api.weather.getCurrent(lat, lon);

      setForm({
        ...form,
        windSpeed: data.current_weather.windspeed,
        windDirection: data.current_weather.winddirection,
        useWeatherApi: true,
      });
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <Dialog open={open} onClose={handleDialogClose} maxWidth="sm" fullWidth>
      <DialogTitle>Параметры и условия полёта БПЛА</DialogTitle>
      <Divider />

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ px: 2 }}>
        <Tab label="Параметры полёта" />
        <Tab label="Погодные условия" />
      </Tabs>

      <DialogContent dividers>
        {tab === 0 && (
          <Box>
            <TextField
              label="Рабочая скорость, м/с"
              fullWidth
              size="small"
              type="number"
              value={form.flightSpeed}
              onChange={num("flightSpeed")}
              error={!!errors.flightSpeed}
              helperText={errors.flightSpeed}
              sx={{ mb: 1.5 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SpeedIcon />
                  </InputAdornment>
                ),
              }}
            />

            <TextField
              label="Время работы аккумулятора, мин"
              fullWidth
              size="small"
              type="number"
              value={form.batteryTime}
              onChange={num("batteryTime")}
              error={!!errors.batteryTime}
              helperText={errors.batteryTime}
              sx={{ mb: 1.5 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <BatteryChargingFullIcon />
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              label="Время зависания для фото, сек"
              fullWidth
              size="small"
              type="number"
              value={form.hoverTime}
              onChange={num("hoverTime")}
              error={!!errors.hoverTime}
              helperText={errors.hoverTime}
              sx={{ mb: 1.5 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <HourglassBottomIcon />
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              label="Сопротивляемость ветру, м/с"
              fullWidth
              size="small"
              type="number"
              value={form.windResistance}
              onChange={num("windResistance")}
              error={!!errors.windResistance}
              helperText={errors.windResistance}
              sx={{ mb: 1.5 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <ShieldIcon />
                  </InputAdornment>
                ),
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
          </Box>
        )}

        {tab === 1 && (
          <Box>
            <TextField
              label="Скорость ветра, м/с"
              fullWidth
              size="small"
              type="number"
              value={form.windSpeed}
              onChange={num("windSpeed")}
              error={!!errors.windSpeed}
              helperText={errors.windSpeed}
              disabled={form.useWeatherApi}
              sx={{ mb: 1.5 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <AirIcon />
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              label="Направление ветра, °"
              fullWidth
              size="small"
              type="number"
              value={form.windDirection}
              onChange={num("windDirection")}
              error={!!errors.windDirection}
              helperText={errors.windDirection}
              disabled={form.useWeatherApi}
              sx={{ mb: 1.5 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <ExploreIcon />
                  </InputAdornment>
                ),
              }}
            />

            <TextField
              label="Местоположение"
              fullWidth
              size="small"
              value={`${lat.toFixed(5)}, ${lon.toFixed(5)}`}
              InputProps={{
                readOnly: true,
                endAdornment: (
                  <InputAdornment position="end">
                    <Tooltip
                      title={!isOnline ? "Нет подключения к интернету" : "Выбрать координаты на карте"}
                    >
                      <span>
                        <IconButton
                          disabled={!isOnline}
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
              control={
                <Checkbox
                  checked={form.useWeatherApi}
                  onChange={(e) => {
                    setForm({
                      ...form,
                      useWeatherApi: e.target.checked,
                    });

                    if (e.target.checked) {
                      loadWeather();
                    }
                  }}
                />
              }
              label="Получать данные со стороннего сервиса"
            />
          </Box>
        )}
      </DialogContent>

      <Divider />
      <DialogActions>
        <Button onClick={onClose}>Отмена</Button>
        <Button variant="contained" onClick={handleSave}>
          Применить
        </Button>
      </DialogActions>

      <LocationPickerDialog
        open={mapOpen}
        onClose={() => setMapOpen(false)}
        onSelect={(lat, lon) => {
          setLat(lat);
          setLon(lon);

          if (form.useWeatherApi) loadWeather();
        }}
      />
    </Dialog>
  );
};

export default FlightSettingsDialog;
