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
import AddIcon from '@mui/icons-material/Add';

// Пример данных для метрик и БПЛА
const droneMetrics = {
  totalDrones: 10,
  avgBatteryTime: "40 минут",
  windResistance: "15 м/с",
};

const flightPlanMetrics = {
  totalPlans: 50,
  avgFlightTime: "1 час",
  popularOptimizationMethod: "low-d",
};

// Пример данных для БПЛА и схем полётов
const drones = [
  { name: "БПЛА 1", detailsLink: "/drones" },
  { name: "БПЛА 2", detailsLink: "/drones" },
  { name: "БПЛА 3", detailsLink: "/drones" },
];

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
}: {
  title: string;
  value: string | number;
}) => (
  <Card
    variant="outlined"
    // sx={{
    //   p: 2,
    //   height: "100%",
    //   backgroundColor: "transparent",
    // }}
  >
    <Typography variant="body2" color="text.secondary">
      {title}
    </Typography>
    <Typography variant="h6" fontWeight={600}>
      {value}
    </Typography>
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

  let data = JSON.parse(localStorage.getItem("userData") || "");

  const username = data ? data.first_name : "Username";

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
            <Avatar sx={{ bgcolor: "#014488" }}>U</Avatar>
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
                  value={droneMetrics.totalDrones}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4, lg: 4 }}>
                <MetricCard
                  title="Среднее время работы аккумулятора"
                  value={droneMetrics.avgBatteryTime}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4, lg: 4 }}>
                <MetricCard
                  title="Сопротивляемость ветру"
                  value={droneMetrics.windResistance}
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
                <Typography variant="h6">Справочник квадрокоптеров</Typography>
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
              {drones.map((drone, index) => (
                <Grid size={{ xs: 12, sm: 6, md: 4, lg: 4 }} key={index}>
                  <CardWithDetails
                    title={drone.name}
                    link={drone.detailsLink}
                  />
                </Grid>
              ))}
            </Grid>
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
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4, lg: 4 }}>
                <MetricCard
                  title="Среднее время полёта"
                  value={flightPlanMetrics.avgFlightTime}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4, lg: 4 }}>
                <MetricCard
                  title="Популярный метод оптимизации"
                  value={flightPlanMetrics.popularOptimizationMethod}
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
                <Typography variant="h6">Последние созданные схемы</Typography>
              </Grid>
              <Grid>
                <Tooltip title="Просмотреть все">
                  <IconButton component={Link} to="/trajectories">
                    <SearchIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Создать схему">
                  <IconButton color="primary" component={Link} to="/trajectories/new">
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
          </Card>
        </Box>
      </Box>
    </PageContainer>
  );
};

export default DashboardsPage;
