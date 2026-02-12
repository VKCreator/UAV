// src/components/CoalReceiptList.tsx
import * as React from "react";
import {
  Alert,
  Box,
  Button,
  IconButton,
  Stack,
  Tooltip,
  TextField,
  InputAdornment,
  Typography,
  Chip,
} from "@mui/material";
import {
  DataGrid,
  GridColDef,
  GridPaginationModel,
  gridClasses,
} from "@mui/x-data-grid";
import {
  Add as AddIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  Visibility as VisibilityIcon,
  Delete as DeleteIcon,
} from "@mui/icons-material";
import { useNavigate, useSearchParams } from "react-router";

import PageContainer from "../PageContainer";
import { TrajectorySchema } from "../../api/client";
import { russianLocale } from "../../constants";
import useNotifications from "../../hooks/useNotifications/useNotifications";

export default function TrajectoryList() {
  const navigate = useNavigate();
  const notifications = useNotifications();
  const [searchParams, setSearchParams] = useSearchParams();

  const [searchText, setSearchText] = React.useState("");
  const page = Number(searchParams.get("page") ?? 0);
  const pageSize = Number(searchParams.get("pageSize") ?? 25);
  const [paginationModel, setPaginationModel] =
    React.useState<GridPaginationModel>({
      page,
      pageSize,
    });

  const [rowsState, setRowsState] = React.useState<{
    rows: TrajectorySchema[];
    rowCount: number;
  }>({ rows: [], rowCount: 0 });

  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);

  // Маппинг метода на читабельный label
  const getMethodLabel = React.useCallback((type: string) => {
    switch (type) {
      case "METHOD_1":
        return "Метод 1";
      case "METHOD_2":
        return "Метод 2";
      default:
        return "Не указан";
    }
  }, []);

  // Фильтрация строк по searchText
  const filteredRows = React.useMemo(() => {
    if (!searchText) return rowsState.rows;

    const lowerSearch = searchText.toLowerCase();

    return rowsState.rows.filter((row) => {
      const methodLabel = getMethodLabel(row.methodType).toLowerCase();
      return (
        row.schemaName.toLowerCase().includes(lowerSearch) ||
        String(row.pointCount).toLowerCase().includes(lowerSearch) ||
        String(row.distanceToCamera).toLowerCase().includes(lowerSearch) ||
        methodLabel.includes(lowerSearch)
      );
    });
  }, [rowsState.rows, searchText, getMethodLabel]);

  // Подсветка совпадений текста
  const highlightText = React.useCallback((text: string, query: string) => {
    if (!query) return text;

    const regex = new RegExp(`(${query})`, "gi");
    return text.split(regex).map((part, index) =>
      regex.test(part) ? (
        <mark
          key={index}
          style={{
            backgroundColor: "#fff176",
            padding: 0,
            borderRadius: 2,
          }}
        >
          {part}
        </mark>
      ) : (
        part
      ),
    );
  }, []);

  // Загрузка данных (тестовые данные)
  const loadData = React.useCallback(async () => {
    setError(null);
    setIsLoading(true);
    try {
      const testRows: TrajectorySchema[] = Array.from(
        { length: 100 },
        (_, i) => ({
          id: String(i + 1),
          schemaName: `Тестовая схема облёта №${i + 1}`,
          schemaImage: `https://placehold.co/${300 + i * 10}x200`,
          pointCount: 20 + i,
          distanceToCamera: 10 + i * 1.5,
          methodType: i % 2 === 0 ? "METHOD_1" : "METHOD_2",
        }),
      );

      setRowsState({ rows: testRows, rowCount: testRows.length });
    } catch (fetchError) {
      setError(fetchError as Error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = React.useCallback(() => {
    if (!isLoading) loadData();
  }, [isLoading, loadData]);

  const handleCreateClick = React.useCallback(() => {
    navigate("/trajectories/new");
  }, [navigate]);

  const handleView = React.useCallback(
    (id: string) => {
      navigate(
        `/trajectories/${id}?page=${paginationModel.page}&pageSize=${paginationModel.pageSize}`,
      );
    },
    [navigate, paginationModel],
  );

  // Колонки таблицы
  const columns: GridColDef[] = React.useMemo(
    () => [
      {
        field: "schemaName",
        headerName: "Имя схемы",
        width: 300,
        minWidth: 180,
        renderCell: (params) => (
          <span>{highlightText(params.value as string, searchText)}</span>
        ),
      },
      {
        field: "schemaImage",
        headerName: "Изображение",
        width: 160,
        sortable: false,
        align: "center",
        headerAlign: "center",
        renderCell: ({ value }) =>
          value ? (
            <Box
              component="img"
              src={value}
              alt="Схема"
              sx={{
                width: "100%",
                height: 80,
                objectFit: "contain",
                borderRadius: 1,
              }}
            />
          ) : (
            <Typography variant="body2" color="text.secondary">
              —
            </Typography>
          ),
      },
      {
        field: "pointCount",
        headerName: "Точки, шт",
        type: "number",
        width: 150,
        align: "right",
        headerAlign: "right",
        renderCell: (params) => (
          <span>{highlightText(String(params.value), searchText)}</span>
        ),
      },
      {
        field: "distanceToCamera",
        headerName: "Расстояние, м",
        type: "number",
        width: 200,
        align: "right",
        headerAlign: "right",
        renderCell: (params) => (
          <span>{highlightText(String(params.value), searchText)}</span>
        ),
      },
      {
        field: "methodType",
        headerName: "Тип метода",
        minWidth: 150,
        flex: 0.6,
        sortable: true,
        align: "center",
        headerAlign: "center",
        renderCell: (params) => {
          const value = params.row.methodType;
          const chip = {
            label: getMethodLabel(value),
            color: value === "METHOD_1" ? "info" : "secondary",
          };
          return (
            <Chip
              size="small"
              label={highlightText(chip.label, searchText)}
              color={chip.color}
              variant="filled"
              sx={{ fontWeight: 500, minWidth: 90 }}
            />
          );
        },
      },
      {
        field: "actions",
        headerName: "",
        width: 120,
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
        align: "center",
        renderCell: (params) => {
          const id = params.id.toString();
          return (
            <Box className="actions-wrapper" sx={{ display: "flex", gap: 1 }}>
              <Tooltip title="Просмотр" arrow>
                <IconButton
                  size="medium"
                  color="primary"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleView(id);
                  }}
                >
                  <VisibilityIcon fontSize="medium" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Удалить" arrow>
                <IconButton
                  size="medium"
                  color="error"
                  onClick={(e) => e.stopPropagation()}
                  disabled={true}
                >
                  <DeleteIcon fontSize="medium" />
                </IconButton>
              </Tooltip>
            </Box>
          );
        },
      },
    ],
    [highlightText, searchText, handleView, getMethodLabel],
  );

  return (
    <PageContainer
      title="Схемы полётов"
      actions={
        <Stack direction="row" alignItems="center" spacing={1} mb={0}>
          <TextField
            size="small"
            placeholder="Поиск..."
            variant="outlined"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            sx={{ width: 300 }}
          />
          <Tooltip title="Обновить данные" placement="bottom" arrow>
            <IconButton size="small" color="primary" onClick={handleRefresh}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreateClick}
          >
            Создать
          </Button>
        </Stack>
      }
    >
      <Box sx={{ width: "100%", height: "calc(100vh - 200px)" }}>
        {error ? (
          <Alert severity="error">{error.message}</Alert>
        ) : (
          <DataGrid
            rows={filteredRows}
            columns={columns}
            loading={isLoading}
            pagination
            paginationModel={paginationModel}
            onPaginationModelChange={(model) => {
              setPaginationModel(model);
              setSearchParams({
                page: model.page.toString(),
                pageSize: model.pageSize.toString(),
              });
            }}
            disableColumnFilter
            disableColumnMenu
            disableDensitySelector
            pageSizeOptions={[5, 10, 25]}
            rowHeight={96}
            localeText={russianLocale}
            onRowClick={(params, event) => {
              if ((event.target as HTMLElement).closest("button")) return;
              handleView(params.id.toString());
            }}
            sx={{
              [`& .${gridClasses.columnHeader}, & .${gridClasses.cell}`]: {
                outline: "transparent",
              },
              [`& .${gridClasses.columnHeader}:focus-within, & .${gridClasses.cell}:focus-within`]:
                { outline: "none" },
              [`& .${gridClasses.row}:hover`]: { cursor: "pointer" },
              [`& .${gridClasses.cell}`]: {
                whiteSpace: "normal",
                wordBreak: "break-word",
                lineHeight: 1.4,
                padding: "8px",
                minHeight: 48,
                display: "flex",
                alignItems: "center",
                "& .actions-wrapper": {
                  opacity: 0,
                  transition: "opacity 0.2s",
                },
              },
              "& .MuiDataGrid-row:hover .actions-wrapper": { opacity: 1 },
              "& .MuiDataGrid-columnHeaders": {
                position: "sticky",
                top: 0,
                zIndex: 10,
                backgroundColor: "background.paper",
              },
            }}
          />
        )}
      </Box>
    </PageContainer>
  );
}
