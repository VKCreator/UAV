"use client";
import React, { useCallback } from 'react';
import { styled } from "@mui/material/styles";
import Box from "@mui/material/Box";
import Container, { ContainerProps } from "@mui/material/Container";
import { useNavigate } from "react-router";
import { Stack, Typography, IconButton } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { useDialogs } from '../../hooks/useDialogs/useDialogs'; 

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
  const navigate = useNavigate();
  const { confirm } = useDialogs();

  const handleBackClick = React.useCallback(async () => {
      navigate('/trajectories');
  }, [navigate, confirm]);

  return (
    <Container
      maxWidth={false}
      sx={{ height: "100%", display: "flex", flexDirection: "column" }}
    >
      <Stack
        sx={{
          flex: 1,
          pt: 5,
          pl: { xs: 0, sm: 0, md: 3, lg: 10 },
          pr: { xs: 0, sm: 0, md: 3, lg: 10 },
        }}
        spacing={1}
      >
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
              {title ? (
                <Stack direction="row" alignItems="center" spacing={1}>
                  <IconButton
                    onClick={handleBackClick}
                    sx={{
                      color: "text.secondary",
                      "&:hover": {
                        backgroundColor: "rgba(0, 0, 0, 0.04)",
                      },
                    }}
                    aria-label="Назад на главную"
                  >
                    <ArrowBackIcon fontSize="medium"  />
                  </IconButton>
                  <Typography variant="h4" fontWeight={600} component="h1">
                    {title}
                  </Typography>
                </Stack>
              ) : null}
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
