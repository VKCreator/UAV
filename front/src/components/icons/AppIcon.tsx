// AppIcon.tsx
import * as React from "react";
import { Box, Typography } from "@mui/material";
import { Link } from "react-router";
import RouteIcon from "@mui/icons-material/Route";

interface AppIconProps {
  className?: string;
  style?: React.CSSProperties;
  width?: string | number;
  height?: string | number;
  fontSize?: "small" | "medium" | "large";
}

const AppIcon: React.FC<AppIconProps> = ({
  className = "",
  style = {},
  width = 215,
  height = 48,
  fontSize = "medium",
}) => {
  return (
    // Оборачиваем в Link → кликабельный переход
    <Link
      to="/dashboards"
      style={{
        textDecoration: "none", // убираем подчёркивание
        display: "inline-block",
        ...style,
      }}
      className={className}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          width,
          height,
          padding: "6px 0px",
          cursor: "pointer",
        }}
      >
        {/* Синий квадрат с белой иконкой Route */}
        <Box
          sx={{
            width: 36,
            height: 36,
            backgroundColor: "#014488ff",
            borderRadius: "8px",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <RouteIcon
            fontSize={fontSize}
            sx={{
              color: "white",
              width: 20,
              height: 20,
            }}
          />
        </Box>

        <Typography
          variant="h6"
          component="span"
          sx={{
            color: "#014488ff",
            fontWeight: 600,
            // fontFamily: "Roboto, Arial, sans-serif",
            fontSize: "20px",
            letterSpacing: "0.3px",
            whiteSpace: "nowrap",
          }}
        >
          SkyPath Service
        </Typography>
      </Box>
    </Link>
  );
};

export default AppIcon;