import * as React from "react";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import Box from "@mui/material/Box";
import { Outlet } from "react-router";
import DashboardSidebar from "./DashboardSidebar";
import AppIcon from "../icons/AppIcon";
import { useNavigate, useLocation } from "react-router";
import { authApi } from "../../api/auth.api";
import useNotifications from "../../hooks/useNotifications/useNotifications";

export default function DashboardLayout() {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const notifications = useNotifications();

  const [isDesktopNavigationExpanded, setIsDesktopNavigationExpanded] =
    React.useState(() => {
      try {
        const stored = localStorage.getItem("sidebar-expanded");
        return stored !== null ? (JSON.parse(stored) as boolean) : true;
      } catch {
        return true;
      }
    });
  const [isMobileNavigationExpanded, setIsMobileNavigationExpanded] =
    React.useState(false);

  const isOverMdViewport = useMediaQuery(theme.breakpoints.up("md"));

  const isNavigationExpanded = isOverMdViewport
    ? isDesktopNavigationExpanded
    : isMobileNavigationExpanded;

  const setIsNavigationExpanded = React.useCallback(
    (newExpanded: boolean) => {
      if (isOverMdViewport) {
        setIsDesktopNavigationExpanded(newExpanded);
        localStorage.setItem("sidebar-expanded", JSON.stringify(newExpanded)); // <- добавить
      } else {
        setIsMobileNavigationExpanded(newExpanded);
      }
    },
    [isOverMdViewport],
  );

  const handleToggleHeaderMenu = React.useCallback(
    (isExpanded: boolean) => {
      setIsNavigationExpanded(isExpanded);
    },
    [setIsNavigationExpanded],
  );

  const layoutRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const verifyToken = async () => {
      try {
        const result = await authApi.check();
        if (!result) {
          navigate("/login");
          notifications.show("Сессия истекла. Повторно выполните вход", {
            severity: "error",
            autoHideDuration: 3000,
          });
        }
      } catch {
        authApi.logout();
        navigate("/login");
      }
    };

    verifyToken();
  }, [location.pathname]); // перепроверяем при каждом переходе

  return (
    <Box
      ref={layoutRef}
      sx={{
        position: "relative",
        display: "flex",
        overflow: "hidden",
        height: "100%",
        width: "100%",
      }}
    >
      {/* <DashboardHeader
        logo={isOverMdViewport ? <AppIcon /> : null}
        title=""
        menuOpen={isNavigationExpanded}
        onToggleMenu={handleToggleHeaderMenu}
      /> */}
      <DashboardSidebar
        logo={<AppIcon />}
        expanded={isNavigationExpanded}
        setExpanded={setIsNavigationExpanded}
        container={layoutRef?.current ?? undefined}
        menuOpen={isNavigationExpanded}
        onToggleMenu={handleToggleHeaderMenu}
      />
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          minWidth: 0,
        }}
      >
        {/* <Toolbar sx={{ displayPrint: "none" }} /> */}
        <Box
          component="main"
          sx={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            overflow: "auto",
          }}
        >
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
