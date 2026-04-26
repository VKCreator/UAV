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
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import FiberManualRecordIcon from "@mui/icons-material/FiberManualRecord";
import ScatterPlotIcon from "@mui/icons-material/ScatterPlot";
import PersonIcon from "@mui/icons-material/Person";

import PageContainer from "../../../components/layout/PageContainer";
import type { TrajectorySchema } from "../../flight/types/schema.types";
import { russianLocale } from "../../../constants";
import useNotifications from "../../../hooks/useNotifications/useNotifications";
import { useDialogs } from "../../../hooks/useDialogs/useDialogs";

import { schemasApi } from "../../../api/schemas.api";
import ClearIcon from "@mui/icons-material/Clear";

import { DateToPrettyLocalDateTime } from "../../../utils/dateUtils";
import { useDocumentTitle } from "../../../hooks/useDocumentTitle/useDocumentTitle";
import { API_BASE_URL } from "../../../api/config";
import DownloadIcon from "@mui/icons-material/Download";
import html2pdf from "html2pdf.js";
interface MethodConfig {
  label: string;
  icon: React.ReactNode;
  color: "success" | "secondary" | "warning" | "default";
  tooltip: string;
}

export default function TrajectoryList() {
  const navigate = useNavigate();
  const notifications = useNotifications();
  const { confirm } = useDialogs();

  const [searchParams, setSearchParams] = useSearchParams();
  useDocumentTitle("Полётные карты | SkyPath Service");

  const [searchText, setSearchText] = React.useState("");
  const page = Number(searchParams.get("page") ?? 0);
  const pageSize = Number(searchParams.get("pageSize") ?? 10);
  const newSchemaId = Number(searchParams.get("newSchemaId") ?? undefined);

  const [paginationModel, setPaginationModel] =
    React.useState<GridPaginationModel>({
      page,
      pageSize,
    });

  const [rowsState, setRowsState] = React.useState<{
    rows: TrajectorySchema[];
    rowCount: number;
  }>({ rows: [], rowCount: 0 });

  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);

  const METHOD_CONFIG: Record<string, MethodConfig> = {
    "low-d": {
      label: "low-d",
      icon: <FiberManualRecordIcon fontSize="small" />,
      color: "success",
      tooltip: "Низкая плотность точек",
    },
    "high-d": {
      label: "high-d",
      icon: <ScatterPlotIcon fontSize="small" />,
      color: "secondary",
      tooltip: "Высокая плотность точек",
    },
    "combi": {
      label: "combi",
      icon: <ScatterPlotIcon fontSize="small" />,
      color: "warning",
      tooltip: "Комбинированный",
    },
    "user": {
      label: "user",
      icon: <PersonIcon fontSize="small" />,
      color: "default",
      tooltip: "Пользовательская траектория",
    },
  };

  const getMethodConfig = React.useCallback((type: string): MethodConfig => {
    return METHOD_CONFIG[type] ?? METHOD_CONFIG.default;
  }, []);

  // Маппинг метода на читабельный label
  const getMethodLabel = React.useCallback((type: string) => {
    switch (type) {
      case "METHOD_1":
        return "low-d";
      case "METHOD_2":
        return "high-d";
      default:
        return "user";
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
        (Number(row.flightTime) / 60)
          .toFixed(2)
          .toLowerCase()
          .includes(lowerSearch) ||
        String(DateToPrettyLocalDateTime(row.createdAt))
          .toLowerCase()
          .includes(lowerSearch) ||
        String(row.user.last_name).toLowerCase().includes(lowerSearch) ||
        methodLabel.includes(lowerSearch)
      );
    });
  }, [rowsState.rows, searchText, getMethodLabel, DateToPrettyLocalDateTime]);

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

    // Читаем из кэша
    const cached = localStorage.getItem("schemas-cache-v1");
    if (cached) {
      const parsed = JSON.parse(cached);
      setRowsState({ rows: parsed, rowCount: parsed.length });
    } else {
      setIsLoading(true);
    }

    try {
      // const response = await schemasApi.getAll();
      const response = await schemasApi.getAllFull();

      setRowsState({ rows: response, rowCount: response.length });
      localStorage.setItem("schemas-cache-v1", JSON.stringify(response));
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
    if (!isLoading) {
      localStorage.removeItem("schemas-cache-v1");
      setIsLoading(true);
      loadData();
    }
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

  const handleDownload = React.useCallback(
    (id: string, schemaName: string) => {
      // 1. Создаем временный невидимый div с нужным текстом
      const element = document.createElement("div");
      element.style.fontFamily = "Arial, sans-serif";
      element.style.padding = "40px";
      element.innerHTML = `
        <h1 style="margin: 0 0 15px 0; color: #333;">Полётная карта</h1>
        <h2 style="margin: 0; font-weight: normal; color: #555;">${schemaName}</h2>
      `;

      // 2. Настраиваем параметры PDF
      const opt = {
        margin: 10,
        filename: `${schemaName || 'Карта'}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 }, // Увеличиваем качество
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      // 3. Генерируем и скачаем
      html2pdf().set(opt).from(element).save();
    },
    [],
  );

  const handleDelete = () => {
    setIsLoading(true);
    loadData();
  };

  // Колонки таблицы
  const columns: GridColDef[] = React.useMemo(
    () => [
      {
        field: "schemaName",
        headerName: "Имя карты",
        width: 180,
        minWidth: 180,
        renderCell: (params) => {
          console.log(params.row.id)
          const isNew = !isNaN(newSchemaId) && newSchemaId === params.row.id;

          return (
            <Box sx={{ overflow: "hidden", width: "100%", maxHeight: "100%" }}>
              <Box>
                {isNew && (
                  <Chip
                    label="Новое"
                    size="small"
                    color="success"
                    component="span"
                    variant="outlined"
                    sx={{ height: 18, fontSize: "0.65rem", mr: 0.5 }}
                  />
                )}
                <span style={{ fontWeight: 500 }}>
                  {highlightText(params.value as string, searchText)}
                </span>
              </Box>
              <Box display="flex" flexDirection="column" sx={{ mt: 0.5 }}>
                <Typography color="text.secondary" variant="caption" noWrap>
                  {highlightText(
                    DateToPrettyLocalDateTime(params.row.createdAt) as string,
                    searchText,
                  )}
                </Typography>

                <Typography color="text.secondary" variant="caption" noWrap>
                  {highlightText(
                    params.row.user.last_name as string,
                    searchText,
                  )}
                  {` ${params.row.user.first_name[0]}. ${params.row.user.middle_name[0]}.`}
                </Typography>
              </Box>
            </Box>
          );
        },
      },
      {
        field: "schemaImage",
        headerName: "Базовый слой",
        width: 160,
        sortable: false,
        align: "center",
        headerAlign: "center",
        renderCell: ({ value }) => {
          if (!value) {
            return (
              <Typography variant="body2" color="text.secondary">
                —
              </Typography>
            );
          }

          const normalized = value.replace(/\\/g, "/");
          const fileName = normalized.split("/").pop();

          return (
            <Box
              component="img"
              src={`${API_BASE_URL}/uploads/thumbs/${fileName}`}
              alt="Схема"
              sx={{
                width: "100%",
                height: 80,
                maxWidth: 120,
                objectFit: "contain",
                // borderRadius: 2,
              }}
              loading="lazy"
            />
          );
        },
      },
      {
        field: "pointCount",
        headerName: "Точки, шт",
        type: "number",
        width: 120,
        flex: 0.3,
        align: "right",
        headerAlign: "right",
        renderCell: (params) => {
          const count = params.value as number;
          const color =
            count <= 10 ? "success" : count <= 20 ? "warning" : "error";

          return (
            <Chip
              label={highlightText(String(count), searchText)}
              size="small"
              color={color}
              variant="outlined"
              sx={{ fontWeight: 600, minWidth: 36 }}
            />
          );
        },
      },
      {
        field: "distanceToCamera",
        headerName: "Расстояние, м",
        type: "number",
        width: 150,
        flex: 0.3,
        align: "right",
        headerAlign: "right",
        renderCell: (params) => {
          const dist = params.value as number;
          const dotColor =
            dist <= 30
              ? "success.main"
              : dist <= 100
                ? "warning.main"
                : "error.main";

          return (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
              }}
            >
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  bgcolor: dotColor,
                  flexShrink: 0,
                }}
              />
              <span>{highlightText(String(params.value), searchText)}</span>
            </Box>
          );
        },
      },
      {
        field: "flightTime",
        headerName: "Время, мин:сек",
        type: "number",
        width: 120,
        flex: 0.3,
        align: "right",
        headerAlign: "right",
        renderCell: (params) => {
          const totalSeconds = params.value;
          const m = Math.floor(totalSeconds / 60);
          const s = Math.floor(totalSeconds % 60);

          const color =
            m <= 10 ? "success.main" : m <= 25 ? "warning.main" : "error.main";

          return (
            <Typography variant="body2" sx={{ fontWeight: 600, color }}>
              {highlightText(`${m}:${String(s).padStart(2, "0")}`, searchText)}
            </Typography>
          );
        },
      },
      {
        field: "isWeatherConditions",
        headerName: "Учёт погоды",
        width: 120,
        flex: 0.3,
        align: "right",
        headerAlign: "right",
        renderCell: (params) => (
          <Tooltip
            title={params.value ? "Погода учтена" : "Погода не учтена"}
            arrow
          >
            {params.value ? (
              <CheckCircleIcon sx={{ color: "#2e7d32" }} />
            ) : (
              <CancelIcon sx={{ color: "#9e9e9e" }} />
            )}
          </Tooltip>
        ),
      },
      {
        field: "methodType",
        headerName: "Тип метода",
        minWidth: 150,
        flex: 0.3,
        sortable: true,
        align: "center",
        headerAlign: "center",
        renderCell: (params) => {
          // const config = getMethodConfig(params.row.methodType);
          const config = getMethodConfig(params.row.methodType);
          return (
            <Tooltip title={`${config.tooltip}`} arrow>
              <Chip
                component="span"
                size="small"
                icon={config.icon}
                label={highlightText(config.label, searchText)}
                color={config.color}
                variant="outlined"
                sx={{ fontWeight: 500, minWidth: 90 }}
              />
            </Tooltip>
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
            <Box className="actions-wrapper" sx={{ display: "flex", gap: 0.5 }}>
              <Tooltip title="Просмотр" arrow>
                <IconButton
                  size="medium"
                  color="primary"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleView(id);
                  }}
                >
                  <VisibilityIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Скачать" arrow>
                <IconButton
                  size="small"
                  color="primary"
                  onClick={(e) => {
                    e.stopPropagation();
                    // Передаем id и название карты из params.row
                    handleDownload(id, params.row.schemaName); 
                  }}
                >
                  <DownloadIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Удалить" arrow>
                <IconButton
                  size="small"
                  color="error"
                  onClick={async (e) => {
                    e.stopPropagation();
                    const confirmed = await confirm("Вы действительно хотите удалить карту?", {
                      title: "Подтверждение",
                      okText: "Да",
                      cancelText: "Нет",
                    });

                    if (!confirmed) return;
                    try {
                      setIsLoading(true);
                      await schemasApi.delete(Number(id));
                      notifications.show("Схема удалена",
                        {
                          severity: "success",
                          autoHideDuration: 3000,
                        },)

                      handleDelete();

                    } catch {
                      notifications.show("Ошибка при удалении карты",
                        {
                          severity: "error",
                          autoHideDuration: 5000,
                        },)
                    }
                  }}
                >
                  <DeleteIcon fontSize="small" />
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
      title="Полётные карты"
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
              endAdornment: searchText && (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setSearchText("")}>
                    <ClearIcon fontSize="small" />
                  </IconButton>
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
            // rowHeight={96}
            getRowHeight={() => 96}
            localeText={russianLocale}
            onRowClick={(params, event) => {
              if ((event.target as HTMLElement).closest("button")) return;
              handleView(params.id.toString());
            }}
            slotProps={{
              loadingOverlay: {
                variant: "linear-progress",
                noRowsVariant: "circular-progress",
              },
            }}
            sx={{
              [`& .${gridClasses.columnHeader}, & .${gridClasses.cell}`]: {
                outline: "transparent",
              },
              [`& .${gridClasses.columnHeader}:focus-within, & .${gridClasses.cell}:focus-within`]:
                { outline: "none" },
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
          />
        )}
      </Box>
    </PageContainer>
  );
}
