import CssBaseline from "@mui/material/CssBaseline";
import { createHashRouter, RouterProvider } from "react-router";
import DashboardLayout from "./components/DashboardLayout";

import TrajectoriesList from "./components/reports/TrajectoryList";
import TrajectoryCreate from "./components/reports/TrajectoryCreate";
import DronesList from "./components/reports/DronesList";

import NotificationsProvider from "./hooks/useNotifications/NotificationsProvider";
import DialogsProvider from "./hooks/useDialogs/DialogsProvider";
import AppTheme from "./theme/AppTheme";
import {
  // dataGridCustomizations,
  datePickersCustomizations,
  // sidebarCustomizations,
  // formInputCustomizations,
} from "./theme/customizations";

const router = createHashRouter([
  {
    Component: DashboardLayout,
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
        path: "/drones",
        Component: DronesList,
      },
      // Fallback route for the example routes in dashboard sidebar items
      {
        path: "*",
        Component: TrajectoriesList,
      },
    ],
  },
]);

const themeComponents = {
  // ...dataGridCustomizations,
  ...datePickersCustomizations,
  // ...sidebarCustomizations,
  // ...formInputCustomizations,
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
