"use client";
import * as React from "react";
import { styled } from "@mui/material/styles";
import Box from "@mui/material/Box";
import Breadcrumbs, { breadcrumbsClasses } from "@mui/material/Breadcrumbs";
import Container, { ContainerProps } from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

const PageContentHeader = styled("div")(({ theme }) => ({
  display: "flex",
  flexDirection: "row",
  justifyContent: "space-between",
  gap: theme.spacing(2),
}));

const PageHeaderBreadcrumbs = styled(Breadcrumbs)(({ theme }) => ({
  margin: theme.spacing(1, 0),
  [`& .${breadcrumbsClasses.separator}`]: {
    color: (theme.vars || theme).palette.action.disabled,
    margin: 1,
  },
  [`& .${breadcrumbsClasses.ol}`]: {
    alignItems: "center",
  },
}));

const PageHeaderToolbar = styled("div")(({ theme }) => ({
  display: "flex",
  flexDirection: "row",
  gap: theme.spacing(1),
  // Ensure the toolbar is always on the right side, even after wrapping
  marginLeft: "auto",
}));

export interface Breadcrumb {
  title: string;
  path?: string;
}
export interface PageContainerProps extends ContainerProps {
  children?: React.ReactNode;
  title?: string;
  breadcrumbs?: Breadcrumb[];
  actions?: React.ReactNode;
  centerContent?: boolean;
  pr?: number;
  pl?: number;
}

export default function PageContainer(props: PageContainerProps) {
  const {
    children,
    breadcrumbs,
    title,
    actions = null,
    centerContent = false,
    pr = 10,
    pl = 10,
  } = props;

  return (
    <Container
      maxWidth={false}
      sx={{ height: "100%", display: "flex", flexDirection: "column" }}
    >
      <Stack
        sx={{
          flex: 1,
          pt: 5,
          pl: { xs: 0, sm: 0, md: 3, lg: pl },
          pr: { xs: 0, sm: 0, md: 3, lg: pr },
        }}
        spacing={2}
      >
        <Stack>
          {/* <PageHeaderBreadcrumbs
            aria-label="breadcrumb"
            separator={<NavigateNextRoundedIcon fontSize="small" />}
          >
            {breadcrumbs
              ? breadcrumbs.map((breadcrumb, index) => {
                  return breadcrumb.path ? (
                    <MuiLink
                      key={index}
                      component={Link}
                      underline="hover"
                      color="inherit"
                      to={breadcrumb.path}
                    >
                      {breadcrumb.title}
                    </MuiLink>
                  ) : (
                    <Typography
                      key={index}
                      sx={{ color: "text.primary", fontWeight: 600 }}
                    >
                      {breadcrumb.title}
                    </Typography>
                  );
                })
              : null}
          </PageHeaderBreadcrumbs> */}
          <PageContentHeader>
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
                  {/* <MapRoundedIcon fontSize="medium" /> */}
                  <Typography variant="h4" fontWeight={600} component="h1">
                    {title}
                  </Typography>
                </Stack>
              ) : null}
              <PageHeaderToolbar>{actions}</PageHeaderToolbar>
            </Box>
          </PageContentHeader>
        </Stack>
        <Box sx={{ flex: 1, display: "flex", flexDirection: "column" }}>
          {children}
        </Box>
      </Stack>
    </Container>
  );
}
