// src/components/CoalReceiptList.tsx
import * as React from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import AddIcon from "@mui/icons-material/Add";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
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
import RefreshIcon from "@mui/icons-material/Refresh";
import { useNavigate } from "react-router";
import useNotifications from "../../hooks/useNotifications/useNotifications";
import { useContext } from "react";

import PageContainer from "../PageContainer";
import { api, TrajectorySchema } from "../../api/client";

import * as XLSX from "xlsx-js-style";
import { DateToPrettyLocalDateTime } from "../../utils/dateUtils";

import { russianLocale } from "../../constants";

export default function TrajectoryList() {
  const navigate = useNavigate();
  const notifications = useNotifications();

  const [isExportDialogOpen, setIsExportDialogOpen] = React.useState(false);

  const [paginationModel, setPaginationModel] =
    React.useState<GridPaginationModel>({
      page: 0,
      pageSize: 25,
    });

  const [rowsState, setRowsState] = React.useState<{
    rows: TrajectorySchema[];
    rowCount: number;
  }>({
    rows: [],
    rowCount: 0,
  });

  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);

  // Функция загрузки данных с сервера
  const loadData = React.useCallback(async () => {
    setError(null);
    setIsLoading(true);

    try {
      // const data = await api.coalReceipts.getAll();
      const data = { data: [] };

      setRowsState({
        rows: data.data || [],
        rowCount: (data.data || []).length,
      });
    } catch (fetchError) {
      // setError(fetchError as Error);
    }

    setIsLoading(false);
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = React.useCallback(() => {
    if (!isLoading) {
      loadData();
    }
  }, [isLoading, loadData]);

  const handleCreateClick = React.useCallback(() => {
    navigate("/trajectories/new");
  }, [navigate]);

  // Определяем колонки таблицы
  const columns = React.useMemo<GridColDef[]>(
    () => [
      {
        field: "schemaName",
        headerName: "Имя схемы",
        minWidth: 100,
        flex: 0.5,
        sortable: true,
      },
      {
        field: "schemaImage",
        headerName: "Изображение схемы",
        minWidth: 200,
        flex: 0.9,
        renderCell: (params) => {
          const imageUrl = params.value; // предполагаем, что это URL изображения
          return imageUrl ? (
            <img
              src={imageUrl}
              alt="Схема"
              style={{
                width: "100%",
                height: "auto",
                maxHeight: "80px",
                objectFit: "contain",
                borderRadius: "4px",
              }}
            />
          ) : (
            <span>Нет изображения</span>
          );
        },
      },
      {
        field: "pointCount",
        headerName: "Количество точек",
        type: "number",
        minWidth: 150,
        flex: 0.4,
        sortable: true,
        valueFormatter: (value) => Number(value).toFixed(0),
      },
      {
        field: "distanceToCamera",
        headerName: "Расстояние до объекта",
        type: "number",
        minWidth: 180,
        flex: 0.9,
        sortable: true,
        valueFormatter: (value) => `${Number(value).toFixed(2)} м`,
      },
      // {
      //   field: "cameraAngle",
      //   headerName: "Угол раскрытия камеры",
      //   type: "number",
      //   minWidth: 160,
      //   flex: 0.7,
      //   sortable: true,
      //   valueFormatter: (value) => `${Number(value).toFixed(1)}°`,
      // },
      {
        field: "methodType",
        headerName: "Тип метода",
        minWidth: 150,
        flex: 0.6,
        sortable: true,
        valueGetter: (value, row) => row.methodType || "Не указан",
      },
      // Столбец с действиями — последний
      {
        field: "actions",
        headerName: "",
        minWidth: 50,
        flex: 0.2,
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
        renderCell: (params) => {
          return (
            <Box sx={{ display: "flex", gap: 0.5 }}>
              <IconButton size="small" color="primary">
                <EditIcon fontSize="small" />
              </IconButton>
              <IconButton size="small" color="error">
                <DeleteIcon fontSize="small" />
              </IconButton>
              <IconButton size="small" color="info">
                <VisibilityIcon fontSize="small" />
              </IconButton>
            </Box>
          );
        },
      },
    ],
    []
  );

  const pageTitle = "Схемы полётов";

  return (
    <PageContainer
      title={pageTitle}
      actions={
        <Stack direction="row" alignItems="center" spacing={1}>
          <TextField
            size="small"
            placeholder="Поиск..."
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
          >
            Создать
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
            initialState={{
              sorting: {
                sortModel: [{ field: "receiptDate", sort: "desc" }],
              },
            }}
            sx={{
              [`& .${gridClasses.columnHeader}, & .${gridClasses.cell}`]: {
                outline: "transparent",
              },
              [`& .${gridClasses.columnHeader}:focus-within, & .${gridClasses.cell}:focus-within`]:
                {
                  outline: "none",
                },
              [`& .${gridClasses.row}:hover`]: {
                cursor: "arrow",
              },
              ["& .MuiDataGrid-columnHeaders"]: {
                position: "sticky",
                top: 0,
                zIndex: 10,
                backgroundColor: "background.paper",
              },
              ["& .MuiDataGrid-virtualScroller"]: {
                marginTop: "0 !important",
              },
              [`& .${gridClasses.cell}`]: {
                whiteSpace: "normal",
                wordBreak: "break-word",
                lineHeight: "1.4",
                padding: "8px",
                minHeight: "48px",
                display: "flex",
                alignItems: "center",
                // fontFamily: "monospace",
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
