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
import CircularProgress from "@mui/material/CircularProgress";
import Box from "@mui/material/Box";
import { api } from "./api/client";
import DashboardsPage from "./components/pages/DashboardsPage";
import ProfilePage from "./components/pages/ProfilePage";

// -------- ProtectedRoute --------
function ProtectedRoute({ children }: { children: JSX.Element }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const verifyToken = async () => {
      // Быстрая проверка — если токена нет, сразу редиректим
      const token = localStorage.getItem("token");
      if (!token) {
        setIsAuthenticated(false);
        return;
      }

      // Токен есть — пускаем сразу, проверяем в фоне
      setIsAuthenticated(true);
      navigate("/dashboards");

      try {
        const result = await api.auth.check();
        if (!result) {
          localStorage.removeItem("token");
          setIsAuthenticated(false);
        }
      } catch {
        localStorage.removeItem("token");
        setIsAuthenticated(false);
      }
    };

    verifyToken();
  }, [navigate]);

  if (isAuthenticated === null) {
    return null; // Вместо спиннера — просто пустой экран (мгновенно)
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

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
      {
        path: "/profile",
        Component: ProfilePage        
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
