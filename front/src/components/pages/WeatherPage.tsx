import * as React from "react";
import {
  Box,
  Typography,
  Paper,
  Grid,
  Divider,
  Alert,
  IconButton,
  Tooltip,
  Skeleton,
  Chip,
  TextField,
  Button,
  CircularProgress,
  Stack
} from "@mui/material";

import RefreshIcon from "@mui/icons-material/Refresh";
import AirIcon from "@mui/icons-material/Air";
import ExploreIcon from "@mui/icons-material/Explore";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import MyLocationIcon from '@mui/icons-material/MyLocation';
import PlaceIcon from "@mui/icons-material/Place";

import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";

// Fix default marker icon for Leaflet + Webpack
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

import { api } from "../../api/client";
import useNotifications from "../../hooks/useNotifications/useNotifications";
import { useDocumentTitle } from "../../hooks/useDocumentTitle/useDocumentTitle";
import PageContainer from "../PageContainer";


const ACCENT = "#014488";

const DIRECTION_LABELS = ["С", "СВ", "В", "ЮВ", "Ю", "ЮЗ", "З", "СЗ"];

function degToCompass(deg: number): string {
  return DIRECTION_LABELS[Math.round(deg / 45) % 8];
}

function convertWindDirectionToDegrees(dir: string): number {
  const map: Record<string, number> = {
    n: 0, ne: 45, e: 90, se: 135,
    s: 180, sw: 225, w: 270, nw: 315, c: 0,
  };
  return map[dir?.toLowerCase()] ?? 0;
}

// Types

interface Coords {
  lat: number;
  lon: number;
}

type ServiceStatus = "idle" | "loading" | "ok" | "error";

interface ServiceState {
  status: ServiceStatus;
  windSpeed: number | null;   // м/с
  windDirection: number | null; // градусы
  error: string | null;
}

const initialService = (): ServiceState => ({
  status: "idle",
  windSpeed: null,
  windDirection: null,
  error: null,
});

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Invisible component that handles map click events */
const MapClickHandler: React.FC<{ onCoords: (c: Coords) => void }> = ({ onCoords }) => {
  useMapEvents({
    click(e) {
      onCoords({
        lat: parseFloat(e.latlng.lat.toFixed(5)),
        lon: parseFloat(e.latlng.lng.toFixed(5)),
      });
    },
  });
  return null;
};

interface ServiceCardProps {
  title: string;
  priority: number;
  state: ServiceState;
  onRefresh: () => void;
  disabled: boolean;
}

const ServiceCard: React.FC<ServiceCardProps> = ({ title, priority, state, onRefresh, disabled }) => {
  const { status, windSpeed, windDirection, error } = state;

  const statusChip = () => {
    if (status === "idle")    return <Chip size="small" label="Ожидание" variant="outlined" />;
    if (status === "loading") return <Chip size="small" label="Загрузка…" color="warning" variant="outlined" icon={<CircularProgress size={12} sx={{ ml: "6px !important" }} />} />;
    if (status === "ok")      return <Chip size="small" label="Доступен" color="success" variant="outlined" icon={<CheckCircleIcon fontSize="small" />} />;
    return                           <Chip size="small" label="Недоступен" color="error" variant="outlined" icon={<CancelIcon fontSize="small" />} />;
  };

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2.5,
        border: "1px solid",
        borderColor:
          status === "ok"    ? "success.light" :
          status === "error" ? "error.light"   : "#e0e0e0",
        borderRadius: 2,
        transition: "border-color .25s",
      }}
    >
      {/* Header */}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Typography variant="subtitle2" fontWeight={600}>{title}</Typography>
          <Chip
            size="small"
            label={`приоритет ${priority}`}
            sx={{ fontSize: "0.65rem", height: 18, bgcolor: "#f5f5f5" }}
          />
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          {statusChip()}
          <Tooltip title="Обновить" enterDelay={500}>
            <span>
              <IconButton
                size="small"
                onClick={onRefresh}
                disabled={disabled || status === "loading"}
                color="primary"
              >
                <RefreshIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        </Box>
      </Box>

      <Divider sx={{ mb: 1.5 }} />

      {/* Content */}
      {status === "idle" && (
        <Typography variant="body2" color="text.secondary">
          Нет данных
        </Typography>
      )}

      {status === "loading" && (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          {[1, 2].map((i) => (
            <Box key={i} sx={{ display: "flex", gap: 2, py: 0.5 }}>
              <Skeleton variant="circular" width={20} height={20} />
              <Box sx={{ flex: 1 }}>
                <Skeleton variant="text" width="30%" height={14} />
                <Skeleton variant="text" width="50%" height={22} />
              </Box>
            </Box>
          ))}
        </Box>
      )}

      {status === "error" && (
        <Alert severity="error" variant="outlined" sx={{ py: 0.5, fontSize: "0.8rem" }}>
          {"Сервис недоступен"}
        </Alert>
      )}

    {status === "ok" && windSpeed !== null && windDirection !== null && (
    <Box sx={{ display: "flex", alignItems: "center", gap: 2, py: 1.5 }}>
        <Box sx={{ color: ACCENT, display: "flex" }}>
        <AirIcon fontSize="small" />
        </Box>
        <Box>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", lineHeight: 1.2, mb: 0.25 }}>
            Скорость ветра
        </Typography>
        <Typography variant="body1" fontWeight={500}>
            {windSpeed.toFixed(1)} м/с
            <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
            ({(windSpeed * 3.6).toFixed(1)} км/ч)
            </Typography>
        </Typography>
        </Box>

        <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />

        <Box sx={{ color: ACCENT, display: "flex" }}>
        <ExploreIcon fontSize="small" />
        </Box>
        <Box>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", lineHeight: 1.2, mb: 0.25 }}>
            Направление
        </Typography>
        <Typography variant="body1" fontWeight={500}>
            {degToCompass(windDirection)} — {windDirection}°
        </Typography>
        </Box>
    </Box>
    )}
    </Paper>
  );
};

// Page

const WeatherPage: React.FC = () => {
  const notifications = useNotifications();
  useDocumentTitle("Погода | SkyPath Service");

  const [coords, setCoords] = React.useState<Coords | null>(null);
  const [latInput, setLatInput] = React.useState("53.4260327");
  const [lonInput, setLonInput] = React.useState("59.0531761");
  const [flyTarget, setFlyTarget] = React.useState<Coords | null>(null);
  const [isFly, setFly] = React.useState<boolean>(false);

  const [services, setServices] = React.useState<Record<string, ServiceState>>({
    weatherbit: initialService(),
    yandex: initialService(),
    openmeteo: initialService(),
  });

  const hasCoords = coords !== null;

  // Apply coords from map or input 
  const applyCoords = React.useCallback((c: Coords) => {
    setCoords(c);
    setLatInput(String(c.lat));
    setLonInput(String(c.lon));
  }, []);

  const handleInputApply = () => {
    const lat = parseFloat(latInput);
    const lon = parseFloat(lonInput);
    if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      notifications.show("Введите корректные координаты", { severity: "warning", autoHideDuration: 3000 });
      return;
    }

    let c = { lat, lon };
    applyCoords(c);
    setFlyTarget(c);
    setFly(true);
  };

  const FlyHandler: React.FC<{ coords: Coords | null }> = ({ coords }) => {
    const map = useMap();
    const prevCoords = React.useRef<Coords | null>(null);

    React.useEffect(() => {
        if (!isFly) return;
        if (!coords) return;
        if (
        prevCoords.current?.lat === coords.lat &&
        prevCoords.current?.lon === coords.lon
        ) return;

        prevCoords.current = coords;
        map.flyTo([coords.lat, coords.lon], map.getZoom(), { duration: 0.5 });
        setFly(false);
    }, [coords]);

    return null;
    };

  React.useEffect(() => {
    const lat = parseFloat(latInput);
    const lon = parseFloat(lonInput);
    let c = { lat, lon };
    applyCoords(c);
  }, [])

//   const handleMyLocation = () => {
//     navigator.geolocation.getCurrentPosition(
//       (pos) => applyCoords({
//         lat: parseFloat(pos.coords.latitude.toFixed(5)),
//         lon: parseFloat(pos.coords.longitude.toFixed(5)),
//       }),
//       () => notifications.show("Геолокация недоступна", { severity: "error", autoHideDuration: 4000 }),
//     );
//   };

  // ── Fetch single service ───────────────────────────────────────────────────
  const setServiceState = (key: string, patch: Partial<ServiceState>) =>
    setServices((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));

  const fetchWeatherbit = React.useCallback(async (c: Coords) => {
    setServiceState("weatherbit", { status: "loading", error: null });
    try {
      const data = await api.weather.getCurrentAlternative(c.lat, c.lon);
      const w = data["data"][0];
      setServiceState("weatherbit", {
        status: "ok",
        windSpeed: w["wind_spd"],
        windDirection: w["wind_dir"],
      });
    } catch (e) {
      setServiceState("weatherbit", {
        status: "error",
        error: e instanceof Error ? e.message : "Ошибка запроса",
      });
    }
  }, []);

  const fetchYandex = React.useCallback(async (c: Coords) => {
    setServiceState("yandex", { status: "loading", error: null });
    try {
      const data = await api.weather.getYandexWeather(c.lat, c.lon);
      setServiceState("yandex", {
        status: "ok",
        windSpeed: data.fact.wind_speed,
        windDirection: convertWindDirectionToDegrees(data.fact.wind_dir),
      });
    } catch (e) {
      setServiceState("yandex", {
        status: "error",
        error: e instanceof Error ? e.message : "Ошибка запроса",
      });
    }
  }, []);

  const fetchOpenMeteo = React.useCallback(async (c: Coords) => {
    setServiceState("openmeteo", { status: "loading", error: null });
    try {
      const data = await api.weather.getCurrent(c.lat, c.lon);
      setServiceState("openmeteo", {
        status: "ok",
        windSpeed: data.current_weather.windspeed / 3.6,
        windDirection: data.current_weather.winddirection,
      });
    } catch (e) {
      setServiceState("openmeteo", {
        status: "error",
        error: e instanceof Error ? e.message : "Ошибка запроса",
      });
    }
  }, []);

  const fetchService = React.useCallback((key: string) => {
    if (!coords) return;
    if (key === "weatherbit") fetchWeatherbit(coords);
    else if (key === "yandex") fetchYandex(coords);
    else if (key === "openmeteo") fetchOpenMeteo(coords);
  }, [coords, fetchWeatherbit, fetchYandex, fetchOpenMeteo]);

  const fetchAll = () => {
    if (!coords) return;
    fetchWeatherbit(coords);
    fetchYandex(coords);
    fetchOpenMeteo(coords);
  };

  return (
    <PageContainer
        title={"Мониторинг погодных сервисов"}
        actions={
        <Stack direction="row" alignItems="center" spacing={1}>
            <Tooltip title="Обновить все" enterDelay={500}>
            <span>
                <IconButton
                onClick={fetchAll}
                disabled={!hasCoords}
                color="primary"
                size="small"
                >
                <RefreshIcon />
                </IconButton>
            </span>
            </Tooltip>
        </Stack>
        }
    >

    <Box sx={{ width: "100%", overflow: "auto", height: "calc(100vh - 200px)" }}>

      {/* <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 3 }}>
        <Typography variant="h5" fontWeight={600}>
          Мониторинг погодных сервисов
        </Typography>

      </Box> */}

      <Grid container spacing={3}>

        <Grid size={{ xs: 12, md: 5 }}>

          {/* Coords input */}
          <Paper elevation={0} sx={{ p: 2.5, border: "1px solid #e0e0e0", borderRadius: 2, mb: 2, background: "white" }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Координаты
          </Typography>

            {/* <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: "block", textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 600, mb: 1.5 }}
            >
              Координаты
            </Typography> */}

            <Box sx={{ display: "flex", gap: 1, mb: 1.5 }}>
              <TextField
                label="Широта"
                size="small"
                value={latInput}
                onChange={(e) => setLatInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter"}
                placeholder="55.7558"
                fullWidth
                inputProps={{ inputMode: "decimal" }}
              />
              <TextField
                label="Долгота"
                size="small"
                value={lonInput}
                onChange={(e) => setLonInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter"}
                placeholder="37.6176"
                fullWidth
                inputProps={{ inputMode: "decimal" }}
              />
            </Box>

            <Box sx={{ display: "flex", gap: 1 }}>
              <Button
                variant="outlined"
                size="small"
                startIcon={<PlaceIcon />}
                onClick={handleInputApply}
                fullWidth
              >
                Отобразить координаты на карте
              </Button>
              {/* <Button
                variant="outlined"
                size="small"
                startIcon={<MyLocationIcon />}
                onClick={handleMyLocation}
                fullWidth
              >
                Моя геолокация
              </Button> */}
            </Box>

            {/* {coords && (
              <Box sx={{ mt: 1.5, display: "flex", alignItems: "center", gap: 0.5 }}>
                <PlaceIcon sx={{ fontSize: 14, color: ACCENT }} />
                <Typography variant="caption" color="text.secondary" fontFamily="monospace">
                  {coords.lat}, {coords.lon}
                </Typography>
              </Box>
            )} */}
          </Paper>

          {/* Map */}
          <Paper elevation={0} sx={{ border: "1px solid #e0e0e0", borderRadius: 2, overflow: "hidden", mb: 2 }}>
            <Box sx={{ height: 300, "& .leaflet-container": { height: "100%", width: "100%" } }}>
              <MapContainer
                center={[53.4260327, 59.0531761]}
                zoom={12}
                style={{ height: "100%", width: "100%" }}
                scrollWheelZoom
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='© <a href="https://openstreetmap.org">OpenStreetMap</a>'
                />
                <MapClickHandler onCoords={applyCoords} />
                <FlyHandler coords={flyTarget} />
                {coords && <Marker position={[coords.lat, coords.lon]} />}
              </MapContainer>
            </Box>
            <Box sx={{ px: 2, py: 1, bgcolor: "#fafafa", borderTop: "1px solid #e0e0e0" }}>
              <Typography variant="caption" color="text.secondary">
                Нажмите на карте, чтобы выбрать координаты
              </Typography>
            </Box>
          </Paper>

          {/* Fetch all button */}
          <Button
            variant="contained"
            fullWidth
            disabled={!hasCoords}
            onClick={fetchAll}
            startIcon={<AirIcon />}
            sx={{ bgcolor: ACCENT, "&:hover": { bgcolor: "#013370" } }}
          >
            Получить данные о погоде
          </Button>
        </Grid>

        {/* ── RIGHT: service cards ──────────────────────────────────────── */}
        <Grid size={{ xs: 12, md: 7 }}>
          <Paper elevation={0} sx={{ p: 2.5, border: "1px solid #e0e0e0", borderRadius: 2, background: "white" }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
            Используемые сервисы погоды
        </Typography>
            {/* <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: "block", textTransform: "uppercase", fontWeight: 600, mb: 2 }}
            >
              Используемые сервисы погоды
            </Typography> */}

            {!hasCoords && (
              <Alert severity="info" sx={{ mb: 2, alignItems: "center" }}>
                Выберите координаты на карте или введите их вручную, чтобы запросить данные.
              </Alert>
            )}

            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <ServiceCard
                title="Weatherbit"
                priority={1}
                state={services.weatherbit}
                onRefresh={() => fetchService("weatherbit")}
                disabled={!hasCoords}
              />
              <ServiceCard
                title="Яндекс Погода"
                priority={2}
                state={services.yandex}
                onRefresh={() => fetchService("yandex")}
                disabled={!hasCoords}
              />
              <ServiceCard
                title="Open-Meteo"
                priority={3}
                state={services.openmeteo}
                onRefresh={() => fetchService("openmeteo")}
                disabled={!hasCoords}
              />
            </Box>
          </Paper>
        </Grid>

      </Grid>
    </Box>
    </PageContainer>
  );
};

export default WeatherPage;