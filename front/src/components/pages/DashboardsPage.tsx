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
} from "@mui/material";
import { Link } from "react-router";

import { format } from "date-fns";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import PageContainer from "../PageContainer";

import SearchIcon from "@mui/icons-material/Search";
import AddIcon from "@mui/icons-material/Add";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import AirIcon from "@mui/icons-material/Air";
import FlightIcon from "@mui/icons-material/Flight";
import RouteIcon from "@mui/icons-material/Route";
import ScheduleIcon from "@mui/icons-material/Schedule";
import TuneIcon from "@mui/icons-material/Tune";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";

import { useEffect, useState, useMemo } from "react";
import { CircularProgress } from "@mui/material";
import { api, Drone } from "../../api/client";

const flightPlanMetrics = {
  totalPlans: 25,
  avgFlightTime: "1 час",
  popularOptimizationMethod: "low-d",
};

const flightPlans = [
  {
    name: "Схема полета 1",
    date: "2022-10-20",
    detailsLink: "/trajectories/1",
  },
  {
    name: "Схема полета 2",
    date: "2022-11-15",
    detailsLink: "/trajectories/2",
  },
  {
    name: "Схема полета 3",
    date: "2022-12-01",
    detailsLink: "/trajectories/3",
  },
];

// Компонент для отображения карточек с метриками
const MetricCard = ({
  title,
  value,
  icon,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
}) => (
  <Card variant="outlined">
    <Box display="flex" alignItems="center" gap={2}>
      <Box
        sx={{
          bgcolor: "white",
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
  </Card>
);

// Компонент для отображения карточек с объектами (БПЛА и схемы)
const CardWithDetails = ({ title, link }: { title: string; link: string }) => (
  <Card
    variant="outlined"
    // sx={{
    //   p: 2,
    //   height: "100%",
    //   backgroundColor: "transparent",
    // }}
  >
    <CardContent>
      <Box
        display="flex"
        flexDirection="row"
        alignItems="center"
        justifyContent="space-between"
      >
        <Box>
          <Typography variant="body2" color="text.secondary">
            Название
          </Typography>
          <Typography variant="h6" fontWeight={600}>
            {title}
          </Typography>
        </Box>
        <IconButton size="small" color="primary" component={Link} to={link}>
          <ChevronRightIcon />
        </IconButton>
      </Box>
    </CardContent>
  </Card>
);

const DashboardsPage = () => {
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

  useEffect(() => {
    const fetchDrones = async () => {
      try {
        // Читаем из кэша
        const cached = localStorage.getItem("drones-cache-v1");
        if (cached) {
          setDrones(JSON.parse(cached));
          setDronesLoading(false);
        }

        // Всё равно запрашиваем свежие данные
        const response = await api.drones.getAll();
        setDrones(response);
        localStorage.setItem("drones-cache-v1", JSON.stringify(response));
      } catch (error) {
        console.error("Ошибка загрузки квадрокоптеров:", error);
      } finally {
        setDronesLoading(false);
      }
    };

    fetchDrones();
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
            <Grid container spacing={2} alignItems="center">
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
                drones.slice(0, 3).map((drone, index) => (
                  <Grid
                    size={{ xs: 12, sm: 6, md: 4, lg: 4 }}
                    key={drone.id ?? index}
                  >
                    <CardWithDetails title={drone.model} link={`/drones`} />
                  </Grid>
                ))
              )}
            </Grid>

            <Box display="flex" justifyContent="center" sx={{ mt: 2 }}>
              <Button
                component={Link}
                to="/drones"
                endIcon={<ChevronRightIcon />}
                variant="text"
                size="small"
              >
                Показать все квадрокоптеры ({drones.length})
              </Button>
            </Box>
          </Card>
        </Box>

        <Box sx={{ marginTop: 4 }}>
          <Card
            variant="outlined"
            // sx={{
            //   p: 2,
            //   height: "100%",
            //   backgroundColor: "transparent",
            // }}
          >
            <Typography variant="h5" sx={{ mb: 2 }}>
              Схемы полётов
            </Typography>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6, md: 4, lg: 4 }}>
                <MetricCard
                  title="Количество схем"
                  value={flightPlanMetrics.totalPlans}
                  icon={<RouteIcon fontSize="large" />}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4, lg: 4 }}>
                <MetricCard
                  title="Среднее время полёта"
                  value={flightPlanMetrics.avgFlightTime}
                  icon={<ScheduleIcon fontSize="large" />}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4, lg: 4 }}>
                <MetricCard
                  title="Популярный метод оптимизации"
                  value={flightPlanMetrics.popularOptimizationMethod}
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
                    Последние созданные схемы
                  </Typography>
                  <Tooltip title="Список последних созданных схем полётов">
                    <InfoOutlinedIcon
                      fontSize="small"
                      sx={{ color: "text.secondary", cursor: "pointer" }}
                    />
                  </Tooltip>
                </Box>
              </Grid>
              <Grid>
                <Tooltip title="Просмотреть все">
                  <IconButton component={Link} to="/trajectories">
                    <SearchIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Создать схему">
                  <IconButton
                    color="primary"
                    component={Link}
                    to="/trajectories/new"
                  >
                    <AddIcon />
                  </IconButton>
                </Tooltip>
              </Grid>
            </Grid>

            <Grid container spacing={2}>
              {flightPlans.map((plan, index) => (
                <Grid size={{ xs: 12, sm: 6, md: 4, lg: 4 }} key={index}>
                  <CardWithDetails title={plan.name} link={plan.detailsLink} />
                </Grid>
              ))}
            </Grid>
            <Box display="flex" justifyContent="center" sx={{ mt: 2 }}>
              <Button
                component={Link}
                to="/trajectories"
                endIcon={<ChevronRightIcon />}
                variant="text"
                size="small"
              >
                Показать все схемы ({flightPlanMetrics.totalPlans})
              </Button>
            </Box>
          </Card>
        </Box>
      </Box>
    </PageContainer>
  );
};

export default DashboardsPage;
