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
};
