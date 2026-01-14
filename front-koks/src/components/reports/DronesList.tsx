// src/components/DronesList.tsx
import * as React from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import AddIcon from "@mui/icons-material/Add";
import RefreshIcon from "@mui/icons-material/Refresh";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import VisibilityIcon from "@mui/icons-material/Visibility";
import { TextField, InputAdornment } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";

import {
  DataGrid,
  GridColDef,
  GridPaginationModel,
  gridClasses,
} from "@mui/x-data-grid";
import { useNavigate } from "react-router";
import useNotifications from "../../hooks/useNotifications/useNotifications";

import PageContainer from "../PageContainer";
import { api, Drone } from "../../api/client";
import { russianLocale } from "../../constants";

export default function DronesList() {
  const navigate = useNavigate();
  const notifications = useNotifications();

  const [paginationModel, setPaginationModel] =
    React.useState<GridPaginationModel>({
      page: 0,
      pageSize: 25,
    });

  const [rowsState, setRowsState] = React.useState<{
    rows: Drone[];
    rowCount: number;
  }>({
    rows: [],
    rowCount: 0,
  });

  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);

  // Загрузка данных
  const loadData = React.useCallback(async () => {
    setError(null);
    setIsLoading(true);

    try {
      const response = await api.drones.getAll();

      setRowsState({
        rows: response || [],
        rowCount: (response || []).length,
      });
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Неизвестная ошибка"));
      notifications.show("Не удалось загрузить список дронов", {
        severity: "error",
        autoHideDuration: 3000,
      });
    } finally {
      setIsLoading(false);
    }
  }, [notifications]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = React.useCallback(() => {
    if (!isLoading) {
      loadData();
    }
  }, [isLoading, loadData]);

  const handleCreateClick = React.useCallback(() => {
    navigate("/drones/new");
  }, [navigate]);

  // Колонки таблицы
  const columns = React.useMemo<GridColDef[]>(
    () => [
      {
        field: "model",
        headerName: "Модель",
        minWidth: 180,
        flex: 1,
        sortable: true,
      },
      {
        field: "fov_vertical",
        headerName: "Угол обзора (°)",
        type: "number",
        minWidth: 140,
        flex: 0.7,
        sortable: true,
        valueFormatter: (value) => `${Number(value).toFixed(1)}°`,
      },
      {
        field: "resolution",
        headerName: "Разрешение",
        minWidth: 140,
        flex: 0.8,
        sortable: false,
        valueGetter: (_, row: Drone) =>
          row.resolution_width && row.resolution_height
            ? `${row.resolution_width} × ${row.resolution_height}`
            : "—",
      },
      {
        field: "max_wind_resistance",
        headerName: "Сопротивляемость ветру (м/с)",
        type: "number",
        minWidth: 180,
        flex: 0.9,
        sortable: true,
        valueFormatter: (value) =>
          value != null ? Number(value).toFixed(1) : "—",
      },
      {
        field: "speedRange",
        headerName: "Диапазон скорости (м/с)",
        minWidth: 160,
        flex: 0.9,
        sortable: false,
        valueGetter: (_, row: Drone) => {
          if (row.min_speed != null && row.max_speed != null) {
            return `${row.min_speed} – ${row.max_speed}`;
          }
          return "—";
        },
      },
      {
        field: "battery_life",
        headerName: "Время полёта (мин)",
        type: "number",
        minWidth: 140,
        flex: 0.7,
        sortable: true,
        valueFormatter: (value) =>
          value != null ? Number(value).toFixed(0) : "—",
      },
      {
        field: "actions",
        headerName: "",
        minWidth: 120,
        flex: 0.5,
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
        renderCell: (params) => {
          return (
            <Box sx={{ display: "flex", gap: 0.5 }}>
              <Tooltip title="Редактировать" placement="top">
                <IconButton size="small" color="primary">
                  <EditIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Удалить" placement="top">
                <IconButton size="small" color="error">
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Просмотреть" placement="top">
                <IconButton size="small" color="info">
                  <VisibilityIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          );
        },
      },
    ],
    []
  );

  const pageTitle = "Квадрокоптеры";

  return (
    <PageContainer
      title={pageTitle}
      actions={
        <Stack direction="row" alignItems="center" spacing={1}>
          <TextField
            size="small"
            placeholder="Поиск по модели..."
            variant="outlined"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            sx={{ width: 300 }}
          />
          <Tooltip title="Обновить данные" placement="right" enterDelay={1000}>
            <div>
              <IconButton
                size="small"
                aria-label="refresh"
                onClick={handleRefresh}
                color="primary"
              >
                <RefreshIcon />
              </IconButton>
            </div>
          </Tooltip>
          <Button
            variant="contained"
            onClick={handleCreateClick}
            startIcon={<AddIcon />}
          >
            Добавить
          </Button>
        </Stack>
      }
    >
      <Box sx={{ width: "100%", overflow: "auto", height: "calc(100vh - 200px)" }}>
        {error ? (
          <Box sx={{ flexGrow: 1 }}>
            <Alert severity="error">{error.message}</Alert>
          </Box>
        ) : (
          <DataGrid
            rows={rowsState.rows}
            columns={columns}
            pagination
            paginationModel={paginationModel}
            onPaginationModelChange={setPaginationModel}
            disableRowSelectionOnClick
            disableColumnFilter
            loading={isLoading}
            pageSizeOptions={[5, 10, 25]}
            getRowHeight={() => "auto"}
            localeText={russianLocale}
            sx={{
              [`& .${gridClasses.columnHeader}, & .${gridClasses.cell}`]: {
                outline: "transparent",
              },
              [`& .${gridClasses.columnHeader}:focus-within, & .${gridClasses.cell}:focus-within`]:
                {
                  outline: "none",
                },
              [`& .${gridClasses.row}:hover`]: {
                cursor: "pointer",
              },
              ["& .MuiDataGrid-columnHeaders"]: {
                position: "sticky",
                top: 0,
                zIndex: 10,
                backgroundColor: "background.paper",
              },
              [`& .${gridClasses.cell}`]: {
                whiteSpace: "normal",
                wordBreak: "break-word",
                lineHeight: "1.4",
                padding: "8px",
                minHeight: "48px",
                display: "flex",
                alignItems: "center",
              },
              [`& .${gridClasses.columnHeader}`]: {
                whiteSpace: "normal",
                wordBreak: "break-word",
                lineHeight: "1.4",
                padding: "8px",
              },
            }}
            slotProps={{
              loadingOverlay: {
                variant: "circular-progress",
                noRowsVariant: "circular-progress",
              },
            }}
          />
        )}
      </Box>
    </PageContainer>
  );
}