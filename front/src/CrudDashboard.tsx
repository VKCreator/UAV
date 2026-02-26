import CssBaseline from "@mui/material/CssBaseline";
// import { createHashRouter, RouterProvider, Navigate } from "react-router";
import DashboardLayout from "./components/DashboardLayout";
import { type JSX, useState, useEffect } from "react";

import {
  createHashRouter,
  RouterProvider,
  Navigate,
  useNavigate,
} from "react-router";

import TrajectoriesList from "./components/steps/TrajectoryList";
import TrajectoryCreate from "./components/steps/TrajectoryCreate";
import DronesList from "./components/steps/DronesList";
import TrajectoryDetails from "./components/pages/TrajectoryDetails";

import LoginPage from "./components/pages/LoginPage";

import NotificationsProvider from "./hooks/useNotifications/NotificationsProvider";
import DialogsProvider from "./hooks/useDialogs/DialogsProvider";
import AppTheme from "./theme/AppTheme";
import { datePickersCustomizations } from "./theme/customizations";
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';
import { api } from "./api/client";
import DashboardsPage from "./components/pages/DashboardsPage";

// -------- ProtectedRoute --------
function ProtectedRoute({ children }: { children: JSX.Element }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const navigate = useNavigate();

  // Асинхронная проверка токена
  useEffect(() => {
    const verifyToken = async () => {
      try {
        const result = await api.auth.check(); // Проверка токена через api.auth.check()
        setIsAuthenticated(!!result); // Если результат существует, токен валиден
      } catch (error) {
        // В случае ошибки (например, токен невалидный), удаляем токен и ставим false
        localStorage.removeItem("token");
        setIsAuthenticated(false);
      }
    };

    verifyToken();
  }, [navigate]); // Добавляем navigate в зависимости, чтобы проверка происходила при каждом переходе

  // Пока идет проверка токена, показываем загрузку
  if (isAuthenticated === null) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh", // Центрирует по вертикали
        }}
      >
        <CircularProgress size={60} />
      </Box>
    );
  }

  // Если токен невалиден или отсутствует, редиректим на страницу логина
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Если токен валиден, рендерим дочерние компоненты
  return children;
}

// -------- Router --------
const router = createHashRouter([
  // свободный маршрут для входа
  {
    path: "/login",
    Component: LoginPage,
  },
  // защищённые маршруты внутри DashboardLayout
  {
    Component: () => (
      <ProtectedRoute>
        <DashboardLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        path: "/trajectories",
        Component: TrajectoriesList,
      },
      {
        path: "/trajectories/new",
        Component: TrajectoryCreate,
      },
      {
        path: "/trajectories/:id",
        Component: TrajectoryDetails,
      },
      {
        path: "/drones",
        Component: DronesList,
      },
      {
        path: "/dashboards",
        Component: DashboardsPage,
      },
      // fallback для внутренних маршрутов Dashboard
      {
        path: "*",
        Component: DashboardsPage,
      },
    ],
  },
  // редирект всех неизвестных путей на /login
  {
    path: "*",
    Component: () => <Navigate to="/login" replace />,
  },
]);

// -------- Theme настройки --------
const themeComponents = {
  ...datePickersCustomizations,
};

export default function CrudDashboard(props: { disableCustomTheme?: boolean }) {
  return (
    <AppTheme {...props} themeComponents={themeComponents}>
      <CssBaseline enableColorScheme />
      <NotificationsProvider>
        <DialogsProvider>
          <RouterProvider router={router} />
        </DialogsProvider>
      </NotificationsProvider>
    </AppTheme>
  );
}
