// src/theme/buttonCustomizations.ts
import { alpha, Theme } from "@mui/material/styles";
import { Components } from "@mui/material/styles";

export const buttonCustomizations: Components<Theme> = {
  MuiButton: {
    styleOverrides: {
      root: {
        textTransform: "none",
        fontWeight: 600,
        borderRadius: 8,
        boxShadow: "0px 2px 4px rgba(0, 0, 0, 0.1)",
        transition: "all 0.3s ease",
      },
      contained: {
        backgroundColor: "#004e9e",
        color: "white",
        "&:hover": {
          backgroundColor: "#014488ff",
          boxShadow: "0px 4px 8px rgba(0, 0, 0, 0.15)",
        },
        "&:active": {
          backgroundColor: "#013c76ff",
        },
        "&:disabled": {
          backgroundColor: "#b0bec5",
          color: "rgba(255, 255, 255, 0.7)",
        },
      },
      outlined: {
        borderColor: "#004e9e",
        color: "#004e9e",
        "&:hover": {
          backgroundColor: "rgba(76, 134, 175, 0.04)",
          borderColor: "#004e9e",
        },
        "&:active": {
          backgroundColor: "rgba(76, 134, 175, 0.08)",
        },
      },
      text: {
        color: "#004e9e",
        "&:hover": {
          backgroundColor: "rgba(76, 134, 175, 0.04)",
        },
        boxShadow: "0px 0px 0px 0px"
      },
    },
  },
  MuiIconButton: {
    styleOverrides: {
      root: {
        borderRadius: "50%",
        padding: "8px",
        transition: "all 0.2s ease",
        "&:disabled": {
          color: "#b0bec5",
          backgroundColor: "transparent",
        },
        border: "none",
      },
      colorPrimary: {
        color: "#004e9e",
        "&:hover": {
          backgroundColor: "rgba(0, 78, 158, 0.08)",
        },
        "&:active": {
          backgroundColor: "rgba(0, 78, 158, 0.12)",
        },
      },
      colorSecondary: {
        color: "#ffffffff",
        "&:hover": {
          backgroundColor: "rgba(0, 78, 158, 0.08)",
        },
        "&:active": {
          backgroundColor: "rgba(0, 78, 158, 0.12)",
        },
      },
      colorInherit: {
        "&:hover": {
          backgroundColor: "rgba(0, 0, 0, 0.04)",
        },
      },
    },
  },
  MuiToggleButton: {
    styleOverrides: {
      root: {
        textTransform: "none",
        fontWeight: 600,
        borderRadius: 8,
        border: "1px solid #004e9e",
        padding: "6px 12px",
        transition: "all 0.3s ease",
        color: "#004e9e",

        "&:hover": {
          backgroundColor: "rgba(0, 78, 158, 0.08)",
        },

        "&:disabled": {
          color: "#b0bec5",
          borderColor: "#b0bec5",
          backgroundColor: "transparent",
        },

        // <-- вот правильный способ для selected
        "&.Mui-selected": {
          backgroundColor: "#004e9e",
          color: "white",

          "&:hover": {
            backgroundColor: "#014488ff",
          },
          "&:active": {
            backgroundColor: "#013c76ff",
          },
        },
      },
    },
  },
  MuiDataGrid: {
    styleOverrides: {
      toolbarContainer: {
        MuiIconButton: {
          color: "#000000 !important",
        },
      },
    },
  },
};
