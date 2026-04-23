import React from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  Avatar,
  IconButton,
  Tooltip,
  CardActionArea,
} from "@mui/material";
import { Link } from "react-router";

import { format } from "date-fns";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import PageContainer from "../components/layout/PageContainer";

import SearchIcon from "@mui/icons-material/Search";
import AddIcon from "@mui/icons-material/Add";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import AirIcon from "@mui/icons-material/Air";
import FlightIcon from "@mui/icons-material/Flight";
import RouteIcon from "@mui/icons-material/Route";
import ScheduleIcon from "@mui/icons-material/Schedule";
import TuneIcon from "@mui/icons-material/Tune";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import RefreshIcon from "@mui/icons-material/Refresh";

import { useEffect, useState, useMemo } from "react";
import { CircularProgress } from "@mui/material";
import { schemasApi } from "../api/schemas.api";
import type { TrajectorySchema } from "../features/flight/types/schema.types";
import type { Drone } from "../features/uav/types/uav.types";

import { useDocumentTitle } from "../hooks/useDocumentTitle/useDocumentTitle";
import useNotifications from "../hooks/useNotifications/useNotifications";

import { API_BASE_URL } from "../api/config";

const formatDate = (isoString: string) => {
  if (!isoString) return "";
  const date = new Date(isoString);
  return date.toLocaleString("ru-RU", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// Компонент для отображения карточек с метриками
const MetricCard = ({
  title,
  value,
  icon,
}: {
  title: string;
  value: string | number | null;
  icon: React.ReactNode;
}) => (
  <Card
    variant="outlined"
    sx={{
      // p: 2,
      height: "100%", 
      backgroundColor: "action.hover", 
      // border: "none"
      // backgroundColor: "transparent",
    }}
  >
    <CardContent sx={{ height: "100%" }}>
      <Box display="flex" alignItems="center" gap={2} sx={{ height: "100%" }}>
        <Box
          sx={{
            // bgcolor: "white",
            bgcolor: "transparent",
            borderRadius: "50%",
            width: 40,
            height: 40,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            color: "#014488",
          }}
        >
          {icon}
        </Box>
        <Box>
          <Typography variant="body2" color="text.secondary">
            {title}
          </Typography>
          <Typography variant="h6" fontWeight={600}>
            {value}
          </Typography>
        </Box>
      </Box>
    </CardContent>
  </Card>
);

// Компонент для отображения карточек с объектами (БПЛА и схемы)
const CardWithDetails = ({
  title,
  link,
  created_date,
  image_url,
}: {
  title: string;
  link: string;
  created_date: string | null;
  image_url?: string;
}) => (
  <Card variant="outlined" sx={{ p: 0, height: "100%" }}>
    <CardActionArea
      component={Link}
      to={link}
      sx={{ height: "100%", "&:hover .chevron": { transform: "translateX(4px)" } }}
    >
      <CardContent sx={{ height: "100%" }}>
        <Box
          display="flex"
          flexDirection="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ height: "100%", p: 2 }}
        >
          <Box display="flex" alignItems="center" gap={1.5}>
            {image_url && (
              <Avatar
                src={image_url}
                variant="rounded"
                sx={{ width: 40, height: 40, flexShrink: 0 }}
              />
            )}
            <Box>
              <Typography variant="h6" fontWeight={600}>
                {title}
              </Typography>
              {created_date && (
                <Typography variant="caption" color="text.disabled">
                  {created_date}
                </Typography>
              )}
            </Box>
          </Box>
          <ChevronRightIcon
            className="chevron"
            sx={{ color: "#014488", transition: "transform 0.15s", flexShrink: 0 }}
          />
        </Box>
      </CardContent>
    </CardActionArea>
  </Card>
);

const DashboardsPage = () => {
  useDocumentTitle("Главная | SkyPath Service");
  const notifications = useNotifications();

  // Получаем текущее время и форматируем сообщение в зависимости от времени суток
  const currentTime = new Date();
  const greeting =
    Number(format(currentTime, "HH")) < 12
      ? "Доброе утро"
      : Number(format(currentTime, "HH")) < 18
      ? "Добрый день"
      : "Добрый вечер";

  let data = null;
  try {
    data = JSON.parse(localStorage.getItem("userData") || "null");
  } catch {
    data = null;
  }

  const username = data ? data.first_name : "Username";

  const [drones, setDrones] = useState<Drone[]>([]);
  const [dronesLoading, setDronesLoading] = useState(true);

  const [schemas, setSchemas] = useState<TrajectorySchema[]>([]);
  const [schemasLoading, setSchemasLoading] = useState(true);

  const fetchDrones = async () => {
    try {
      // Читаем из кэша
      const cached = localStorage.getItem("drones-cache-v1");
      if (cached) {
        setDrones(JSON.parse(cached));
        setDronesLoading(false);
      }

      // Всё равно запрашиваем свежие данные
      const response = await dronesApi.getAll();
      setDrones(response);
      localStorage.setItem("drones-cache-v1", JSON.stringify(response));
    } catch (error) {
      console.error("Ошибка загрузки квадрокоптеров:", error);
      notifications.show("Ошибка загрузки квадрокоптеров", {
        severity: "error",
        autoHideDuration: 3000,
      });
    } finally {
      setDronesLoading(false);
    }
  };

  const fetchSchemas = async () => {
    try {
      // Читаем из кэша
      const cached = localStorage.getItem("schemas-cache-v1");
      if (cached) {
        setSchemas(JSON.parse(cached));
        setSchemasLoading(false);
      }

      // Всё равно запрашиваем свежие данные
      const response = await schemasApi.getAllFull();
      setSchemas(response);
      localStorage.setItem("schemas-cache-v1", JSON.stringify(response));
    } catch (error) {
      console.error("Ошибка загрузки карт:", error);
      notifications.show("Ошибка загрузки карт", {
        severity: "error",
        autoHideDuration: 3000,
      });
    } finally {
      setSchemasLoading(false);
    }
  };

  useEffect(() => {
    fetchDrones();
    fetchSchemas();
  }, []);

  const avgBatteryTime = useMemo(() => {
    if (drones.length === 0) return 0;
    return Math.round(
      drones.reduce((sum, drone) => sum + (drone.battery_life ?? 0), 0) /
        drones.length,
    );
  }, [drones]);

  const avgWindResistance = useMemo(() => {
    if (drones.length === 0) return 0;
    return Math.round(
      drones.reduce((sum, drone) => sum + (drone.max_wind_resistance ?? 0), 0) /
        drones.length,
    );
  }, [drones]);

  const avgFlightTime = useMemo(() => {
    if (!schemas.length) return 0;
    return Math.round(
      schemas.reduce((sum, schema) => sum + (schema.flightTime ?? 0), 0) /
        schemas.length,
    );
  }, [schemas]);

  const getMethodLabel = React.useCallback((type: string) => {
    switch (type) {
      case "METHOD_1":
        return "low-d";
      case "METHOD_2":
        return "high-d";
      default:
        return "user";
    }
  }, []);

  const popularMethod = useMemo(() => {
    // 1. Проверка на пустой массив
    if (!schemas || !schemas.length) return null;

    // 2. Подсчет вхождений каждого methodType
    const methodCounts = schemas.reduce((acc, schema) => {
      const method = schema.methodType;
      if (method) {
        acc[method] = (acc[method] || 0) + 1;
      }
      return acc;
    }, {});

    // 3. Поиск метода с максимальным счетом
    let maxCount = 0;
    let mostPopular = null;

    for (const [method, count] of Object.entries(methodCounts)) {
      if (count > maxCount) {
        maxCount = count;
        mostPopular = method;
      }
    }

    return getMethodLabel(mostPopular);
  }, [schemas]);

  return (
    <PageContainer
      title={
        <Grid container spacing={2} alignItems="center">
          <Grid sx={{ xs: 10 }}>
            <Typography variant="h4">
              {greeting}, <strong>{username}</strong>!
            </Typography>
          </Grid>
          <Grid sx={{ xs: 2 }} textAlign="right">
            <Avatar sx={{ bgcolor: "#014488" }}>
              {" "}
              {username?.charAt(0).toUpperCase() ?? "U"}
            </Avatar>
          </Grid>
        </Grid>
      }
      actions={null}
      pr={25}
      pl={25}
    >
      <Box>
        <Box>
          <Card
            variant="outlined"
            // sx={{
            //   p: 2,
            //   height: "100%",
            //   backgroundColor: "transparent",
            // }}
          >
            <Typography variant="h5" sx={{ mb: 2 }}>
              Квадрокоптеры
            </Typography>
            <Grid container spacing={2} alignItems="stretch">
              <Grid size={{ xs: 12, sm: 6, md: 4, lg: 4 }}>
                <MetricCard
                  title="Количество БПЛА"
                  value={drones.length}
                  icon={<FlightIcon fontSize="large" />}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4, lg: 4 }}>
                <MetricCard
                  title="Среднее время работы аккумулятора"
                  value={avgBatteryTime ? `${avgBatteryTime} мин` : "—"}
                  icon={<AccessTimeIcon fontSize="large" />}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4, lg: 4 }}>
                <MetricCard
                  title="Средняя сопротивляемость ветру"
                  value={avgWindResistance ? `${avgWindResistance} м/c` : "—"}
                  icon={<AirIcon fontSize="large" />}
                />
              </Grid>
            </Grid>
            <Grid
              container
              alignItems="center"
              justifyContent="space-between"
              sx={{ marginTop: 4, mb: 1 }}
            >
              <Grid>
                <Box display="flex" alignItems="center" gap={1}>
                  <Typography variant="h6">
                    Справочник квадрокоптеров
                  </Typography>
                  <Tooltip title="Список всех доступных квадрокоптеров">
                    <InfoOutlinedIcon
                      fontSize="small"
                      sx={{ color: "text.secondary", cursor: "pointer" }}
                    />
                  </Tooltip>
                </Box>
              </Grid>
              <Grid>
                <Tooltip title="Просмотреть все">
                  <IconButton component={Link} to="/drones">
                    <SearchIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Обновить данные" placement="bottom" arrow>
                  <IconButton size="small" color="primary" onClick={() => {
                    setDronesLoading(true); 
                    fetchDrones();           
                    notifications.show("Данные обновлены", {
                        severity: "success",
                        autoHideDuration: 3000,
                    });
                  }}>
                    <RefreshIcon />
                  </IconButton>
                </Tooltip>
              </Grid>
            </Grid>
            <Grid container spacing={2}>
              {dronesLoading ? (
                <Grid size={{ xs: 12 }}>
                  <Box display="flex" justifyContent="center" py={2}>
                    <CircularProgress size={24} />
                  </Box>
                </Grid>
              ) : drones.length === 0 ? (
                <Grid size={{ xs: 12 }}>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    textAlign="center"
                  >
                    Квадрокоптеры не найдены
                  </Typography>
                </Grid>
              ) : (
                drones.slice(0, 6).map((drone, index) => (
                  <Grid
                    size={{ xs: 12, sm: 6, md: 4, lg: 4 }}
                    key={drone.id ?? index}
                  >
                    <CardWithDetails
                      title={drone.model}
                      link={`/drones`}
                      created_date={null}
                      image_url={
                        drone.image_name
                          ? `${API_BASE_URL}/uploads/thumbs/${drone.image_name}`
                          : undefined
                      }
                    />
                  </Grid>
                ))
              )}
            </Grid>

            <Box display="flex" justifyContent="center" sx={{ mt: 2 }}>
              <Button
                component={Link}
                to="/drones"
                // endIcon={<ChevronRightIcon />}
                variant="text"
                size="small"
              >
                Показать все квадрокоптеры ({drones.length})...
              </Button>
            </Box>
          </Card>
        </Box>

        <Box sx={{ marginTop: 4, mb: 4 }}>
          <Card
            variant="outlined"
            // sx={{
            //   p: 2,
            //   height: "100%",
            //   backgroundColor: "transparent",
            // }}
          >
            <Typography variant="h5" sx={{ mb: 2 }}>
              Полётные карты
            </Typography>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6, md: 4, lg: 4 }}>
                <MetricCard
                  title="Количество карт"
                  value={schemas.length}
                  icon={<RouteIcon fontSize="large" />}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4, lg: 4 }}>
                <MetricCard
                  title="Среднее время полёта"
                  value={(() => {
                    const minutes = Math.floor(avgFlightTime / 60);
                    const seconds = Math.floor(avgFlightTime % 60);
                    return seconds > 0
                      ? `${minutes} мин ${seconds} сек`
                      : `${minutes} мин`;
                  })()}
                  icon={<ScheduleIcon fontSize="large" />}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4, lg: 4 }}>
                <MetricCard
                  title="Популярный метод оптимизации"
                  value={popularMethod || "-"}
                  icon={<TuneIcon fontSize="large" />}
                />
              </Grid>
            </Grid>

            <Grid
              container
              alignItems="center"
              justifyContent="space-between"
              sx={{ marginTop: 4, mb: 1 }}
            >
              <Grid>
                <Box display="flex" alignItems="center" gap={1}>
                  <Typography variant="h6">
                    Последние созданные карты
                  </Typography>
                  <Tooltip title="Список последних созданных карт полётов">
                    <InfoOutlinedIcon
                      fontSize="small"
                      sx={{ color: "text.secondary", cursor: "pointer" }}
                    />
                  </Tooltip>
                </Box>
              </Grid>
              <Grid>
                 <Tooltip title="Создать карту">
                  <IconButton
                    color="primary"
                    component={Link}
                    to="/trajectories/new"
                  >
                    <AddIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Просмотреть все">
                  <IconButton component={Link} to="/trajectories">
                    <SearchIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Обновить данные" placement="bottom" arrow>
                  <IconButton size="small" color="primary" onClick={() => {
                      setSchemasLoading(true);
                      fetchSchemas();
                      notifications.show("Данные обновлены", {
                        severity: "success",
                        autoHideDuration: 3000,
                      });
                    }}>
                    <RefreshIcon />
                  </IconButton>
                </Tooltip>
              </Grid>
            </Grid>

            <Grid container spacing={2}>
              {schemasLoading ? (
                <Grid size={{ xs: 12 }}>
                  <Box display="flex" justifyContent="center" py={2}>
                    <CircularProgress size={24} />
                  </Box>
                </Grid>
              ) : schemas.length === 0 ? (
                <Grid size={{ xs: 12 }}>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    textAlign="center"
                  >
                    Схемы не найдены
                  </Typography>
                </Grid>
              ) : (
                schemas.slice(0, 6).map((plan, index) => (
                  <Grid size={{ xs: 12, sm: 6, md: 4, lg: 4 }} key={index}>
                  <CardWithDetails
                    title={plan.schemaName}
                    link={`/trajectories/${plan.id}`}
                    created_date={formatDate(plan.createdAt)}
                    image_url={
                      plan.schemaImage
                        ? `${API_BASE_URL}/uploads/thumbs/${plan.schemaImage.replace(/\\/g, "/").split("/").pop()}`
                        : undefined
                    }
                  />
                  </Grid>
                ))
              )}
            </Grid>
            <Box display="flex" justifyContent="center" sx={{ mt: 2 }}>
              <Button
                component={Link}
                to="/trajectories"
                // endIcon={<ChevronRightIcon />}
                variant="text"
                size="small"
              >
                Показать все карты ({schemas.length})...
              </Button>
            </Box>
          </Card>
        </Box>
      </Box>
    </PageContainer>
  );
};

export default DashboardsPage;
