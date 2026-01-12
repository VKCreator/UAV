"use client";
import * as React from "react";
import { styled } from "@mui/material/styles";
import Box from "@mui/material/Box";
import Container, { ContainerProps } from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

const StepperContentHeader = styled("div")(({ theme }) => ({
  display: "flex",
  flexDirection: "row",
  justifyContent: "space-between",
  gap: theme.spacing(2),
}));

const StepperHeaderToolbar = styled("div")(({ theme }) => ({
  display: "flex",
  flexDirection: "row",
  gap: theme.spacing(1),
  // Ensure the toolbar is always on the right side, even after wrapping
  marginLeft: "auto",
}));

export interface StepperContainerProps extends ContainerProps {
  children?: React.ReactNode;
  title?: string;
  actions?: React.ReactNode;
  centerContent?: boolean;
}

export default function StepperContainer(props: StepperContainerProps) {
  const { children, title, actions = null, centerContent = false } = props;

  return (
    <Container
      maxWidth={false}
      sx={{ display: "flex", flexDirection: "column" }}
    >
      <Stack sx={{ flex: 1, my: 2 }} spacing={1}>
        <Stack>
          <StepperContentHeader>
            <Box
              sx={{
                width: "100%",
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 2,
                "@media (max-width: 600px)": {
                  flexDirection: "column",
                  alignItems: "flex-start",
                  gap: 1,
                },
              }}
            >
              {title ? <Typography variant="h4">{title}</Typography> : null}
              <StepperHeaderToolbar>{actions}</StepperHeaderToolbar>
            </Box>
          </StepperContentHeader>
        </Stack>
        <Box sx={{ flex: 1, display: "flex", flexDirection: "column" }}>
          {children}
        </Box>
      </Stack>
    </Container>
  );
}
