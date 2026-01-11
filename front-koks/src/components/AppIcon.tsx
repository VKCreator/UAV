import * as React from "react";
import { Box, Typography } from "@mui/material";
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
  width = 500,
  height = 48,
  fontSize = "medium",
}) => {
  return (
    <Box
      className={className}
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1.5,
        width,
        height,
        padding: "6px 12px",
        ...style,
      }}
    >
      {/* Синий квадрат с белой иконкой Route */}
      <Box
        sx={{
          width: 40,
          height: 40,
          backgroundColor: "#014488ff", // синий цвет как в примере
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
            width: 24,
            height: 24,
          }}
        />
      </Box>

      <Typography
        variant="h6"
        component="span"
        sx={{
          color: "#014488ff", // тот же синий
          fontWeight: 600,
          fontFamily: "Roboto, Arial, sans-serif",
          fontSize: "18px",
          letterSpacing: "0.3px",
          whiteSpace: "nowrap",
        }}
      >
        SkyPath UAV Service
      </Typography>
    </Box>
  );
};

export default AppIcon;