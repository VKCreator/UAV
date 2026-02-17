import * as React from "react";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import Box from "@mui/material/Box";
import Drawer from "@mui/material/Drawer";
import List from "@mui/material/List";
import Toolbar from "@mui/material/Toolbar";
import type {} from "@mui/material/themeCssVarsAugmentation";
import MapRoundedIcon from "@mui/icons-material/MapRounded";
import LocalAirportRoundedIcon from "@mui/icons-material/LocalAirportRounded";
import { matchPath, useLocation } from "react-router";
import DashboardSidebarContext from "../context/DashboardSidebarContext";
import { DRAWER_WIDTH, MINI_DRAWER_WIDTH } from "../constants";
import DashboardSidebarPageItem from "./DashboardSidebarPageItem";
import DashboardSidebarHeaderItem from "./DashboardSidebarHeaderItem";
import DashboardSidebarDividerItem from "./DashboardSidebarDividerItem";
import {
  getDrawerSxTransitionMixin,
  getDrawerWidthTransitionMixin,
} from "../mixins";

import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import MenuIcon from "@mui/icons-material/Menu";
import MenuOpenIcon from "@mui/icons-material/MenuOpen";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";

export interface DashboardSidebarProps {
  logo?: React.ReactNode;
  expanded?: boolean;
  setExpanded: (expanded: boolean) => void;
  disableCollapsibleSidebar?: boolean;
  container?: Element;
  menuOpen: boolean;
  onToggleMenu: (open: boolean) => void;
}

export default function DashboardSidebar({
  logo,
  expanded = true,
  setExpanded,
  disableCollapsibleSidebar = false,
  container,
  menuOpen,
  onToggleMenu,
}: DashboardSidebarProps) {
  const theme = useTheme();

  const { pathname } = useLocation();

  const [expandedItemIds, setExpandedItemIds] = React.useState<string[]>([
    "directories",
  ]);

  const isOverSmViewport = useMediaQuery(theme.breakpoints.up("sm"));
  const isOverMdViewport = useMediaQuery(theme.breakpoints.up("md"));

  const [isFullyExpanded, setIsFullyExpanded] = React.useState(expanded);
  const [isFullyCollapsed, setIsFullyCollapsed] = React.useState(!expanded);

  React.useEffect(() => {
    const newExpanded: string[] = ["directories"];

    if (pathname.startsWith("/directories")) {
      newExpanded.push("directories");

      if (pathname.startsWith("/directories/group-supply")) {
        newExpanded.push("group-supply");
      }

      if (pathname.startsWith("/directories/group-unloading")) {
        newExpanded.push("group-unloading");
      }

      if (pathname.startsWith("/directories/group-storage")) {
        newExpanded.push("group-storage");
      }

      if (pathname.startsWith("/directories/group-personnel")) {
        newExpanded.push("group-personnel");
      }
    }

    setExpandedItemIds(newExpanded);

    if (expanded) {
      const drawerWidthTransitionTimeout = setTimeout(() => {
        setIsFullyExpanded(true);
      }, theme.transitions.duration.enteringScreen);

      return () => clearTimeout(drawerWidthTransitionTimeout);
    }

    setIsFullyExpanded(false);

    return () => {};
  }, [expanded, theme.transitions.duration.enteringScreen, pathname]);

  React.useEffect(() => {
    if (!expanded) {
      const drawerWidthTransitionTimeout = setTimeout(() => {
        setIsFullyCollapsed(true);
      }, theme.transitions.duration.leavingScreen);

      return () => clearTimeout(drawerWidthTransitionTimeout);
    }

    setIsFullyCollapsed(false);

    return () => {};
  }, [expanded, theme.transitions.duration.leavingScreen]);

  const mini = !disableCollapsibleSidebar && !expanded;

  const handleSetSidebarExpanded = React.useCallback(
    (newExpanded: boolean) => () => {
      setExpanded(newExpanded);
    },
    [setExpanded]
  );

  const handlePageItemClick = React.useCallback(
    (itemId: string, hasNestedNavigation: boolean) => {
      if (hasNestedNavigation && !mini) {
        setExpandedItemIds((previousValue) =>
          previousValue.includes(itemId)
            ? previousValue.filter(
                (previousValueItemId) => previousValueItemId !== itemId
              )
            : [...previousValue, itemId]
        );
      } else if (!isOverSmViewport && !hasNestedNavigation) {
        setExpanded(false);
      }
    },
    [mini, setExpanded, isOverSmViewport]
  );

  const hasDrawerTransitions =
    isOverSmViewport && (!disableCollapsibleSidebar || isOverMdViewport);

  const getDrawerContent = React.useCallback(
    (viewport: "phone" | "tablet" | "desktop") => (
      <React.Fragment>
        {/* === НОВЫЙ БЛОК: ЛОГОТИП + КНОПКА МЕНЮ === */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: mini ? "center" : "space-between",
            p: mini ? 1 : 2,
            pr: "3px",
            height: 64, // высота как у AppBar
            borderBottom: "1px solid",
            borderColor: "divider",
          }}
        >
          {mini ? null : (
            <Stack direction="row" alignItems="center" spacing={1}>
              {logo ? (
                <Box sx={{ height: 40, display: "flex", alignItems: "center" }}>
                  {logo}
                </Box>
              ) : (
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 700,
                    color: "primary.main",
                    whiteSpace: "nowrap",
                  }}
                >
                  Ваш Логотип
                </Typography>
              )}
            </Stack>
          )}

          {!disableCollapsibleSidebar && (
            <Tooltip
              title={expanded ? "Свернуть меню" : "Показать меню"}
              enterDelay={1000}
            >
              <IconButton
                size="small"
                aria-label={
                  expanded
                    ? "Скрыть навигационное меню"
                    : "Показать навигационное меню"
                }
                onClick={() => setExpanded(!expanded)}
              >
                {expanded ? <MenuOpenIcon /> : <MenuIcon />}
              </IconButton>
            </Tooltip>
          )}
        </Box>

        {/* === ОСНОВНОЕ МЕНЮ === */}
        <Box
          component="nav"
          aria-label={`${viewport.charAt(0).toUpperCase()}${viewport.slice(1)}`}
          sx={{
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            overflow: "auto",
            scrollbarGutter: mini ? "stable" : "auto",
            overflowX: "hidden",
            pt: 0,
            ...(hasDrawerTransitions
              ? getDrawerSxTransitionMixin(isFullyExpanded, "padding")
              : {}),
          }}
        >
          <List
            dense
            sx={{
              padding: mini ? 0 : 0.5,
              mb: 4,
              width: mini ? MINI_DRAWER_WIDTH : "auto",
            }}
          >
            <DashboardSidebarHeaderItem>Полёты</DashboardSidebarHeaderItem>
            <DashboardSidebarPageItem
              id="coals-receipt"
              title="Схемы полётов"
              icon={<MapRoundedIcon />}
              href="/trajectories"
              selected={
                !!matchPath("/trajectories/*", pathname) || pathname === "/"
              }
            />
            <DashboardSidebarDividerItem />
            <DashboardSidebarHeaderItem>Справочники</DashboardSidebarHeaderItem>
            <DashboardSidebarPageItem
              id="natural-sheets"
              title="Квадрокоптеры"
              icon={<LocalAirportRoundedIcon />}
              href="/drones"
              selected={!!matchPath("/drones/*", pathname)}
            />
          </List>

          <Box
            sx={{
              mt: "auto",
              p: 2,
              textAlign: "center",
              justifyContent: mini ? "center" : "space-between",
              borderTop: "1px solid",
              borderColor: "divider",
              color: "text.secondary",
              fontSize: "0.75rem",
              fontWeight: 500,
              opacity: 0.7,
              display: "flex",
              flexDirection: "column",
              alignItems: mini ? "center" : "flex-start",
              gap: 0.5,
            }}
          >
            v17.02.2026
          </Box>
        </Box>
      </React.Fragment>
    ),
    [
      mini,
      hasDrawerTransitions,
      isFullyExpanded,
      expanded,
      setExpanded,
      disableCollapsibleSidebar,
      logo,
      pathname,
    ]
  );

  const getDrawerSharedSx = React.useCallback(
    (isTemporary: boolean) => {
      const drawerWidth = mini ? MINI_DRAWER_WIDTH : DRAWER_WIDTH;

      return {
        displayPrint: "none",
        width: drawerWidth,
        flexShrink: 0,
        ...getDrawerWidthTransitionMixin(expanded),
        ...(isTemporary ? { position: "absolute" } : {}),
        [`& .MuiDrawer-paper`]: {
          position: "absolute",
          width: drawerWidth,
          boxSizing: "border-box",
          backgroundImage: "none",
          ...getDrawerWidthTransitionMixin(expanded),
        },
      };
    },
    [expanded, mini]
  );

  const sidebarContextValue = React.useMemo(() => {
    return {
      onPageItemClick: handlePageItemClick,
      mini,
      fullyExpanded: isFullyExpanded,
      fullyCollapsed: isFullyCollapsed,
      hasDrawerTransitions,
    };
  }, [
    handlePageItemClick,
    mini,
    isFullyExpanded,
    isFullyCollapsed,
    hasDrawerTransitions,
  ]);

  return (
    <DashboardSidebarContext.Provider value={sidebarContextValue}>
      <Drawer
        container={container}
        variant="permanent"
        open={expanded}
        onClose={handleSetSidebarExpanded(false)}
        ModalProps={{
          keepMounted: true, // Better open performance on mobile.
        }}
        sx={{
          display: {
            xs: "block",
            sm: disableCollapsibleSidebar ? "block" : "none",
            md: "none",
          },
          ...getDrawerSharedSx(false),
        }}
      >
        {getDrawerContent("tablet")}
      </Drawer>
      <Drawer
        variant="permanent"
        sx={{
          display: {
            xs: "none",
            sm: disableCollapsibleSidebar ? "none" : "block",
            md: "none",
          },
          ...getDrawerSharedSx(false),
        }}
      >
        {getDrawerContent("tablet")}
      </Drawer>
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: "none", md: "block" },
          ...getDrawerSharedSx(false),
        }}
      >
        {getDrawerContent("desktop")}
      </Drawer>
    </DashboardSidebarContext.Provider>
  );
}
