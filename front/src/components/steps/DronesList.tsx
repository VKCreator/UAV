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
import { TextField, InputAdornment } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";

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

  const [searchQuery, setSearchQuery] = React.useState("");

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

  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);

  // Загрузка данных
  const loadData = React.useCallback(async () => {
    setError(null);

    // Читаем из кэша
    const cached = localStorage.getItem("drones-cache-v1");
    if (cached) {
      const parsed = JSON.parse(cached);
      setRowsState({ rows: parsed, rowCount: parsed.length });
    } else {
      setIsLoading(true);
    }

    try {
      const response = await api.drones.getAll();
      const data = response || [];
      setRowsState({ rows: data, rowCount: data.length });
      localStorage.setItem("drones-cache-v1", JSON.stringify(data));
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
      localStorage.removeItem("drones-cache-v1");
      setIsLoading(true);
      loadData();
    }
  }, [isLoading, loadData]);

  const handleCreateClick = React.useCallback(() => {
    navigate("/drones/new");
  }, [navigate]);

  const filteredRows = React.useMemo(() => {
    if (!searchQuery.trim()) return rowsState.rows;
    return rowsState.rows.filter((row) =>
      row.model?.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [rowsState.rows, searchQuery]);

  const HighlightedCell = ({
    value,
    query,
  }: {
    value: string;
    query: string;
  }) => {
    if (!query.trim() || !value) return <span>{value}</span>;

    const index = value.toLowerCase().indexOf(query.toLowerCase());
    if (index === -1) return <span>{value}</span>;

    return (
      <span>
        {value.slice(0, index)}
        <span style={{ backgroundColor: "#fff176", borderRadius: 2 }}>
          {value.slice(index, index + query.length)}
        </span>
        {value.slice(index + query.length)}
      </span>
    );
  };

  // Колонки таблицы
  const columns = React.useMemo<GridColDef[]>(
    () => [
      {
        field: "model",
        headerName: "Модель",
        minWidth: 150,
        flex: 0.5,
        sortable: true,
        renderCell: (params) => (
          <HighlightedCell value={params.value ?? ""} query={searchQuery} />
        ),
      },
      {
        field: "fov_vertical",
        headerName: "Вертикальный угол обзора, °",
        type: "number",
        minWidth: 120,
        flex: 0.2,
        sortable: true,
        valueFormatter: (value) => `${Number(value).toFixed(1)}°`,
      },
      {
        field: "resolution",
        headerName: "Разрешение",
        minWidth: 140,
        type: "number",

        flex: 0.3,
        sortable: false,
        valueGetter: (_, row: Drone) =>
          row.resolution_width && row.resolution_height
            ? `${row.resolution_width} × ${row.resolution_height}`
            : "—",
      },
      {
        field: "max_wind_resistance",
        headerName: "Ветроустойчивость, м/с",
        type: "number",
        minWidth: 120,
        flex: 0.5,
        sortable: true,
        valueFormatter: (value) =>
          value != null ? Number(value).toFixed(1) : "—",
      },
      {
        field: "speedRange",
        headerName: "Диапазон скорости, м/с",
        type: "number",
        minWidth: 160,
        flex: 0.5,
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
        headerName: "Время полёта, мин",
        type: "number",
        minWidth: 100,
        flex: 0.4,
        sortable: true,
        valueFormatter: (value) =>
          value != null ? Number(value).toFixed(0) : "—",
      },
      // {
      //   field: "actions",
      //   headerName: "",
      //   minWidth: 50,
      //   flex: 0.2,
      //   sortable: false,
      //   filterable: false,
      //   disableColumnMenu: true,
      //   renderCell: (params) => {
      //     return (
      //       <Box sx={{ display: "flex", gap: 0.5 }}>
      //         {/* <Tooltip title="Редактировать" placement="top">
      //           <IconButton size="small" color="primary">
      //             <EditIcon fontSize="small" />
      //           </IconButton>
      //         </Tooltip>
      //         <Tooltip title="Удалить" placement="top">
      //           <IconButton size="small" color="error">
      //             <DeleteIcon fontSize="small" />
      //           </IconButton>
      //         </Tooltip>
      //         <Tooltip title="Просмотреть" placement="top">
      //           <IconButton size="small" color="info">
      //             <VisibilityIcon fontSize="small" />
      //           </IconButton>
      //         </Tooltip> */}
      //       </Box>
      //     );
      //   },
      // },
    ],
    [searchQuery],
  );

  const pageTitle = "Квадрокоптеры";

  return (
    <PageContainer
      title={pageTitle}
      actions={
        <Stack direction="row" alignItems="center" spacing={1}>
          <TextField
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            size="small"
            placeholder="Поиск по модели..."
            variant="outlined"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
              endAdornment: searchQuery && (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setSearchQuery("")}>
                    <ClearIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ),
            }}
            sx={{ width: 300 }}
          />
          <Tooltip title="Обновить данные" placement="bottom" enterDelay={1000}>
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
            disabled
          >
            Добавить
          </Button>
        </Stack>
      }
    >
      <Box
        sx={{ width: "100%", overflow: "auto", height: "calc(100vh - 200px)" }}
      >
        {error ? (
          <Box sx={{ flexGrow: 1 }}>
            <Alert severity="error">{error.message}</Alert>
          </Box>
        ) : (
          <DataGrid
            rows={filteredRows}
            columns={columns}
            pagination
            paginationModel={paginationModel}
            onPaginationModelChange={setPaginationModel}
            disableRowSelectionOnClick
            disableColumnFilter
            loading={isLoading}
            pageSizeOptions={[5, 10, 25]}
            // getRowHeight={() => "auto"}
            rowHeight={50}
            // columnHeaderHeight={80}
            localeText={russianLocale}
            sx={{
              [`& .${gridClasses.columnHeader}, & .${gridClasses.cell}`]: {
                outline: "transparent",
              },
              [`& .${gridClasses.columnHeader}:focus-within, & .${gridClasses.cell}:focus-within`]:
                {
                  outline: "none",
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
                lineHeight: "1.3",
                padding: "8px",
              },
              [`& .MuiDataGrid-columnHeaderTitle`]: {
                whiteSpace: "normal",
                wordBreak: "break-word",
                // textAlign: "center",
                lineHeight: "1.3",
              },

              "& .MuiDataGrid-row:nth-of-type(odd)": {
                backgroundColor: "#f5f5f5", // Цвет для нечетных строк
              },
              "& .MuiDataGrid-row:nth-of-type(even)": {
                backgroundColor: "#ffffff", // Цвет для четных строк
              },
              [`& .${gridClasses.row}:hover`]: {
                backgroundColor: "#337EFF11",
                cursor: "pointer",
              },
              [`& .${gridClasses.row}`]: {
                transition: "background-color 0.3s ease", // Плавный переход для фона
              },
            }}
            slotProps={{
              loadingOverlay: {
                variant: "linear-progress",
                noRowsVariant: "circular-progress",
              },
            }}
          />
        )}
      </Box>
    </PageContainer>
  );
}
