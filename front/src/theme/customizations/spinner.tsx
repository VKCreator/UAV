import { Theme, Components } from "@mui/material/styles";

export const spinnerCustomizations: Components<Theme> = {
  MuiCircularProgress: {
    styleOverrides: {
      root: {
        color: "#004e9e",
      },

      indeterminate: {
        animationDuration: "1.2s",
      },

      determinate: {
        transition: "stroke-dashoffset 0.3s ease",
      },

      circle: {
        strokeLinecap: "round",
      },
    },
  },
  MuiLinearProgress: {
    styleOverrides: {
      root: {
        backgroundColor: "#cce0f5", // цвет фона (светлая полоска)
      },
      bar: {
        backgroundColor: "#004e9e", // цвет самой движущейся полоски
      },
    },
  },
};
