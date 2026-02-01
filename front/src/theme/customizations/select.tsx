// src/theme/selectCustomizations.ts
import { Theme } from "@mui/material/styles";
import { Components } from "@mui/material/styles";

export const selectCustomizations: Components<Theme> = {
  MuiSelect: {
    styleOverrides: {
      select: {
        borderRadius: 8,
        fontWeight: 500,
        padding: "10px 14px",

        "&:focus": {
          backgroundColor: "transparent",
        },
      },
      icon: {
        color: "#004e9e",
      },
    },
  },

  MuiOutlinedInput: {
    styleOverrides: {
      root: {
        borderRadius: 8,
        transition: "all 0.3s ease",

        "& .MuiOutlinedInput-notchedOutline": {
          borderColor: "#004e9e",
        },

        "&:hover .MuiOutlinedInput-notchedOutline": {
          borderColor: "#014488ff",
        },

        "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
          borderColor: "#004e9e",
          borderWidth: 2,
        },

        "&.Mui-disabled .MuiOutlinedInput-notchedOutline": {
          borderColor: "#b0bec5",
        },

        "&.Mui-disabled": {
          color: "#b0bec5",
        },
      },
      input: {
        padding: "10px 14px",
      },
    },
  },

  MuiMenuItem: {
    styleOverrides: {
      root: {
        borderRadius: 6,
        margin: "4px 8px",
        transition: "all 0.2s ease",

        "&:hover": {
          backgroundColor: "rgba(0, 78, 158, 0.08)",
        },

        "&.Mui-selected": {
          backgroundColor: "rgba(0, 78, 158, 0.16)",
          color: "#004e9e",
          fontWeight: 600,

          "&:hover": {
            backgroundColor: "rgba(0, 78, 158, 0.24)",
          },
        },

        "&.Mui-disabled": {
          color: "#b0bec5",
        },
      },
    },
  },
};
