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
import MergeIcon from '@mui/icons-material/Merge';

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
import html2canvas from 'html2canvas'

import { createKonvaScene, exportSceneImageToDataURL } from "../utils/exportSceneImage";

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
    "mixed-d": {
      label: "mixed-d",
      icon: <MergeIcon fontSize="small" />,
      color: "primary",
      tooltip: "Смешанная плотность точек",
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
      const methodLabel = row.methodType.toLowerCase();
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

  // Скачивание pdf-файла.
  // const handleDownload = React.useCallback(
  //   (id: string, schemaName: string) => {
  //     // 1. Создаем временный невидимый div с нужным текстом
  //     const element = document.createElement("div");
  //     element.style.fontFamily = "Arial, sans-serif";
  //     element.style.padding = "40px";
  //     element.innerHTML = `
  //       <h1 style="margin: 0 0 15px 0; color: #333;">Полётная карта</h1>
  //       <h2 style="margin: 0; font-weight: normal; color: #555;">${schemaName}</h2>
  //     `;

  //     // 2. Настраиваем параметры PDF
  //     const opt = {
  //       margin: 10,
  //       filename: `${schemaName || 'Карта'}.pdf`,
  //       image: { type: 'jpeg', quality: 0.98 },
  //       html2canvas: { scale: 2 }, // Увеличиваем качество
  //       jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  //     };

  //     // 3. Генерируем и скачаем
  //     html2pdf().set(opt).from(element).save();
  //   },
  //   [],
  // );


  const handleDownloadPDF = React.useCallback(
    async (schemaData: any, baseImageObj: HTMLImageElement) => {
      if (!schemaData || !baseImageObj) return;

      const getNum = (val: any, fallback: number = 0): number => {
        if (val && typeof val === "object" && "parsedValue" in val) {
          return val.parsedValue;
        }
        if (typeof val === "number") return val;
        return fallback;
      };

      const formatTime = (sec: number): string => {
        if (!sec) return "0 сек";
        const m = Math.floor(sec / 60);
        const s = Math.round(sec % 60);
        return `${m} мин ${s} сек`;
      };

      const getWindDirectionLabel = (deg: number) => {
        const dirs = [
          "Север", "Северо-восток", "Восток", "Юго-восток",
          "Юг", "Юго-запад", "Запад", "Северо-запад",
        ];
        return dirs[Math.round(deg / 45) % 8];
      };

      function calcFrameSize(distance: number, fovDeg: number): number {
        const fovRad = (fovDeg * Math.PI) / 180;
        return 2 * distance * Math.tan(fovRad / 2);
      }

      try {
        // ====== 1. Данные ======
        const mapName = schemaData.map_name || "Карта";
        const createdAt = schemaData.created_at
          ? new Date(schemaData.created_at).toLocaleDateString("ru-RU", {
            day: "2-digit", month: "long", year: "numeric",
          })
          : "";

        const priorityMethod = schemaData.priority_opt_method;
        const priorityItem = schemaData.opt_results?.items?.find(
          (item: any) => item.method_id === priorityMethod?.method_id,
        );
        const traj = priorityItem?.taxons;

        const drn = schemaData.drone_params.drone ?? {};
        const cam = schemaData.drone_params.camera_params ?? {};

        const fov = getNum(cam.vertical_fov) ?? getNum(drn.default_vertical_fov) ?? 77;
        const resW = getNum(cam.resolution_width) ?? getNum(drn.default_resolution_width) ?? 5472;
        const resH = getNum(cam.resolution_height) ?? getNum(drn.default_resolution_height) ?? 3648;
        const baseDist = getNum(schemaData.drone_params.base_distance) ?? 75;
        const plannedDist = getNum(schemaData.drone_params.planned_distance) ?? 15;

        const frameHeightBase = calcFrameSize(baseDist, fov);
        const frameWidthBase = frameHeightBase * (resW / resH);
        const frameHeightPlanned = calcFrameSize(plannedDist, fov);
        const frameWidthPlanned = frameHeightPlanned * (resW / resH);

        // ====== 2. Konva-сцена ======
        const params = {
          image: baseImageObj,
          width_m: frameWidthBase,
          height_m: frameHeightBase,
          GRID_COLS: frameWidthBase / frameWidthPlanned,
          GRID_ROWS: frameHeightBase / frameHeightPlanned,
          flightLineY: schemaData.traj_shapes?.line,
          obstacles: schemaData.traj_shapes?.obstacles || [],
          points: schemaData.traj_shapes?.points || [],
          trajectoryData: traj,
          showGrid: true,
          showObstacles: true,
          showUserTrajectory: false,
          showTaxonTrajectory: true,
          showNavTriangles: true,
        };

        const stage = await createKonvaScene(params);
        const sceneDataUrl = exportSceneImageToDataURL(stage);

        // ====== 3. Подсчёты ======
        const reachedCount = traj?.B.reduce(
          (sum: number, t: any) => sum + (t.points?.length || 0), 0,
        ) || 0;
        const unreachedCount = traj?.C?.length || 0;
        const totalCount = reachedCount + unreachedCount;

        // ====== 4. Стили (Times New Roman, поля по ГОСТ) ======
        // Поля: левое 30мм, правое 15мм, верх/низ 20мм
        const FONT = `"Times New Roman", Times, serif`;

        // Универсальный шаблон таблицы "Параметр — Значение"
        const renderTable = (title: string, rows: [string, string][]) => `
        <h3 style="font-family:${FONT}; font-size: 14pt; font-weight: bold;
                   color: #bbb; margin: 14pt 0 6pt 0;">
          ${title}
        </h3>
        <table style="width: 100%; border-collapse: collapse;
                      font-family:${FONT}; font-size: 12pt;
                      border: 0.5px solid #bbb;">
          <thead>
            <tr style="background: #e8eef5;">
              <th style="border: 0.5px solid #bbb; padding: 5pt 8pt;
                         text-align: left; font-weight: bold; width: 55%;">
                Параметр
              </th>
              <th style="border: 0.5px solid #bbb; padding: 5pt 8pt;
                         text-align: left; font-weight: bold;">
                Значение
              </th>
            </tr>
          </thead>
          <tbody>
            ${rows.map(([k, v], i) => `
              <tr style="background: ${i % 2 === 0 ? "#fff" : "#f7f9fc"};">
                <td style="border: 0.5px solid #bbb; padding: 5pt 8pt;">${k}</td>
                <td style="border: 0.5px solid #bbb; padding: 5pt 8pt;">${v}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      `;

        // ====== 5. Маршрут — отдельная таблица сессий ======
        const routeTableHtml = traj?.B && traj.B.length > 0 ? `
        <table style="width: 100%; border-collapse: collapse;
                      font-family:${FONT}; font-size: 11pt;
                      border: 0.5px solid #bbb;">
          <thead>
            <tr style="background: #e8eef5;">
              <th style="border: 0.5px solid #bbb; padding: 5pt 8pt;
                         text-align: left; width: 18%;">Сессия</th>
              <th style="border: 0.5px solid #bbb; padding: 5pt 8pt;
                         text-align: left;">Точки маршрута</th>
            </tr>
          </thead>
          <tbody>
            ${traj.B.map((taxon: any, idx: number) => {
          const pointsStr = taxon.route
            .map((p: number[]) => `(${p[0].toFixed(1)} м; ${p[1].toFixed(1)} м)`)
            .join(" → ");
          return `
                <tr style="background: ${idx % 2 === 0 ? "#fff" : "#f7f9fc"};">
                  <td style="border: 0.5px solid #bbb; padding: 5pt 8pt;
                             vertical-align: top;">
                    <span style="display:inline-block; width:10pt; height:10pt;
                                 background:${taxon.color}; margin-right:4pt;
                                 vertical-align: middle;"></span>
                    №${idx + 1}
                  </td>
                  <td style="border: 0.5px solid #bbb; padding: 5pt 8pt;
                             font-size: 10pt; line-height: 1.5;">
                    ${pointsStr}
                  </td>
                </tr>
              `;
        }).join("")}
          </tbody>
        </table>
      ` : `<div style="font-family:${FONT}; font-size: 12pt; color:#555;">
            Данные отсутствуют
          </div>`;

        // ====== 6. Препятствия — таблица ======
        const obstaclesRows: [string, string][] =
          schemaData.traj_shapes?.obstacles?.map((obs: any, idx: number) =>
            [`Препятствие №${idx + 1}`, `${obs.safeZone || 0} м`] as [string, string]
          ) || [];

        // ====== 7. Данные для таблиц ======
        const drone = schemaData.drone_params;
        const droneRows: [string, string][] = [
          ["Модель БПЛА", drone?.drone?.model || "—"],
          ["Рабочая скорость", `${getNum(drone?.speed).toFixed(2)} м/с`],
          ["Время работы батареи", `${getNum(drone?.battery_time).toFixed(0)} мин`],
          ["Время зависания для фото", `${getNum(drone?.hover_time).toFixed(0)} с`],
          ["Сопротивляемость ветру", `${getNum(drone?.wind_resistance).toFixed(0)} м/с`],
          ["Расстояние до объекта", `${getNum(drone?.planned_distance).toFixed(1)} м`],
        ];

        const weatherRows: [string, string][] = [
          ["Скорость ветра", `${getNum(schemaData.weather?.wind_speed).toFixed(1)} м/с`],
          ["Направление ветра", getWindDirectionLabel(getNum(schemaData.weather?.wind_direction))],
          ["Учёт погоды при расчёте", schemaData.is_use_weather ? "Да" : "Нет"],
        ];

        const optRows: [string, string][] | null = traj
          ? [
            ["Количество зон исследования", `${traj.N_k || traj.B.length}`],
            ["Охвачено точек", `${reachedCount} из ${totalCount}`],
            ["Количество недостижимых точек", `${unreachedCount}`],
            ["Оптимальное время облёта", formatTime(priorityItem?.total_flight_time)],
          ]
          : null;

        // ====== 8. СТРАНИЦА 1 — портрет ======
        // Полезная область A4 portrait при полях 30/15/20/20 мм:
        // ширина = 210 - 30 - 15 = 165 мм
        // высота = 297 - 20 - 20 = 257 мм
        const portraitElement = document.createElement("div");
        portraitElement.style.fontFamily = FONT;
        portraitElement.style.color = "#000";
        portraitElement.style.background = "#fff";

        portraitElement.innerHTML = `
        <div style="position: relative; min-height: 257mm; box-sizing: border-box;">
          <!-- ШАПКА -->
          <div style="border-bottom: 2px solid #004E9E;
                      padding-bottom: 8pt; margin-bottom: 14pt;
                      display: flex; justify-content: space-between; align-items: flex-end;">
            <div>
              <div style="font-family:${FONT}; font-size: 16pt;
                          letter-spacing: 1.5pt; color: #004E9E;
                          text-transform: uppercase;
                          font-weight: bold;">
                <b style="font-size: 18pt; color: #004E9E;">Полётная карта</b>
              </div>
              <div style="font-family:${FONT}; font-size: 16pt;
                          font-weight: bold; margin-top: 3pt; color: #000;">
                «${mapName}»
              </div>
            </div>
            <div style="text-align: right; font-family:${FONT};
                        font-size: 10pt; color: #555;">
              <div>Дата создания</div>
              <div style="color:#000; font-weight: bold;">${createdAt}</div>
            </div>
          </div>

          <!-- 1. МАРШРУТ -->
          <h3 style="font-family:${FONT}; font-size: 14pt; font-weight: bold;
                     color: #000; margin: 10pt 0 6pt 0;">
            1. Полный маршрут (см. приложение)
          </h3>
          ${routeTableHtml}

          <!-- 2. БПЛА -->
          ${renderTable("2. Характеристики БПЛА и параметры съёмки", droneRows)}

          <!-- 3. ПРЕПЯТСТВИЯ -->
          ${obstaclesRows.length > 0
            ? renderTable("3. Безопасная зона вокруг препятствий", obstaclesRows)
            : `<h3 style="font-family:${FONT}; font-size: 14pt; font-weight: bold;
                            color: #000; margin: 14pt 0 6pt 0;">
                  3. Безопасная зона вокруг препятствий
                </h3>
                <div style="font-family:${FONT}; font-size: 12pt; color:#555;">
                  Препятствия отсутствуют
                </div>`
          }

          <!-- 4. ПОГОДА -->
          ${renderTable("4. Погодные условия", weatherRows)}

          <!-- 5. ОПТИМИЗАЦИЯ -->
          ${optRows
            ? renderTable(
              `5. Параметры оптимизации`,
              optRows
            )
            : `<h3 style="font-family:${FONT}; font-size: 14pt; font-weight: bold;
                            color: #000; margin: 14pt 0 6pt 0;">
                  5. Параметры оптимизации
                </h3>
                <div style="font-family:${FONT}; font-size: 12pt; color:#555;">
                  Оптимизация не выполнена
                </div>`
          }

          <!-- ФУТЕР -->
          <div style="margin-top: 30pt; border-top: 1px solid #cbc5c5;
                      padding-top: 6pt;
                      display: flex; justify-content: space-between; align-items: center;
                      font-family:${FONT}; font-size: 9pt; color: #555;">
            <div style="font-style: italic;">
              Схема полёта прилагается отдельным листом (приложение)
            </div>
            <div style="color: #d1d0d0">
              © SkyPath Service
            </div>
          </div>
        </div>
      `;

        // СТРАНИЦА 2 — альбом
        const landscapeElement = document.createElement("div");
        landscapeElement.style.fontFamily = FONT;
        // landscapeElement.style.color = "#000";
        landscapeElement.style.background = "#fff";

        landscapeElement.innerHTML = `
        <div style="box-sizing: border-box; width: 100%;">
          <div style="width: 100%; display: flex; justify-content: space-between;
                      align-items: flex-end;
                      border-bottom: 2px solid #004E9E;
                      padding-bottom: 6pt; margin-bottom: 10pt;">
            <div>
              <div style="font-family:${FONT}; font-size: 9pt; font-weight: bold;
                          letter-spacing: 1.5pt; color: #004E9E;
                          text-transform: uppercase;">
                <b>Приложение к полному маршруту</b>
              </div>
              <div style="font-family:${FONT}; font-size: 14pt;
                          font-weight: bold; color: #000;">
                Схема полёта: «${mapName}»
              </div>
            </div>
            <div style="font-family:${FONT}; font-size: 9pt;
                        color: #555; text-align: right;">
              <div>Дата: <strong style="color:#000;">${createdAt}</strong></div>
              <div style="margin-top:2pt; color: #d1d0d0;">
                © SkyPath Service
              </div>
            </div>
          </div>
          <div style="text-align: center;">
            ${sceneDataUrl
            ? `<img src="${sceneDataUrl}"
                        style="width: 100%; height: auto;
                               display: inline-block;
                               border: 0.5px solid #888;" />`
            : `<div style="font-family:${FONT}; padding:50pt;
                              text-align:center; color:#888;">
                    Изображение не сгенерировано
                  </div>`
          }
          </div>
        </div>
      `;

        // ====== 10. Сборка PDF ======
        const safeName = mapName.replace(/[^a-zа-яё0-9]/gi, "_");

        // Даём UI кадр перед тяжёлой работой
        await new Promise((r) => requestAnimationFrame(() => r(null)));

        // Поля A4 portrait: top, left, bottom, right (мм)
        const PORTRAIT_MARGIN: [number, number, number, number] = [20, 30, 20, 15];

        const worker = html2pdf()
          .set({
            margin: PORTRAIT_MARGIN,
            filename: `Полётная карта_${safeName}.pdf`,
            image: { type: "png" },
            html2canvas: { scale: 3, useCORS: true, backgroundColor: "#ffffff", logging: false },
            jsPDF: { unit: "mm", format: "a4", orientation: "portrait", compress: false },
            pagebreak: { mode: ['css', 'legacy', 'avoid-all'], avoid: ['tr', 'table', 'h3'] },
          })
          .from(portraitElement);

        const pdf = await worker.toPdf().get("pdf");

        // Альбомная страница через прямой html2canvas
        landscapeElement.style.position = "fixed";
        landscapeElement.style.left = "-10000px";
        landscapeElement.style.top = "0";
        landscapeElement.style.width = "297mm"; // полная ширина A4 landscape

        document.body.appendChild(landscapeElement);

        try {
          const canvas = await html2canvas(landscapeElement, {
            scale: 3,
            useCORS: true,
            backgroundColor: "#ffffff",
            logging: false,
            letterRendering: true,
          });
          const imgData = canvas.toDataURL("image/jpeg");
          pdf.addPage("a4", "landscape");

          // Размеры листа A4 landscape
          const PAGE_W = 297;
          const PAGE_H = 210;

          // Минимальные поля (если нужны нулевые — поставьте 0)
          const MARGIN = 5;
          const maxW = PAGE_W - MARGIN * 2; // 287мм
          const maxH = PAGE_H - MARGIN * 2; // 200мм

          const canvasAspect = canvas.width / canvas.height;

          // Подбираем размер так, чтобы вписаться И по ширине, И по высоте
          let finalW = maxW;
          let finalH = finalW / canvasAspect;

          if (finalH > maxH) {
            finalH = maxH;
            finalW = finalH * canvasAspect;
          }

          // Центрируем по обеим осям
          const offsetX = (PAGE_W - finalW) / 2;
          // const offsetY = (PAGE_H - finalH) / 2;

          pdf.addImage(imgData, "JPEG", offsetX, MARGIN, finalW, finalH, undefined, 'FAST');
        } finally {
          document.body.removeChild(landscapeElement);
        }

        pdf.save(`Полётная карта_${safeName}.pdf`);
      } catch (e) {
        console.error("Ошибка генерации PDF:", e);
        alert("Не удалось создать PDF. Проверьте консоль.");
      }
    },
    [],
  );

  const handleDownload = React.useCallback(
    async (id: string) => {
      // 1. Начинаем загрузку
      setIsLoading(true);

      try {
        // 2. Получаем данные схемы по ID
        const schemaData = await schemasApi.getById(Number(id));

        // Проверка наличия данных изображения
        if (!schemaData?.base_image) {
          throw new Error("Отсутствует базовое изображение для генерации отчета");
        }

        // 3. Загружаем само изображение (HTMLImageElement)
        // Это необходимо для Konva, которая рисует сцену для PDF
        const imageUrl = `${API_BASE_URL}/${schemaData.base_image.image_path.replace(/\\/g, "/")}`;

        const image = new Image();
        image.crossOrigin = "anonymous"; // Важно для корректной работы в браузере

        await new Promise((resolve, reject) => {
          image.onload = resolve;
          image.onerror = reject;
          image.src = imageUrl;
        });

        // 4. Вызываем функцию генерации PDF
        // Передаем данные схемы и загруженный объект изображения
        await handleDownloadPDF(schemaData, image);

        notifications.show("Карта сформирована",
          {
            severity: "success",
            autoHideDuration: 3000,
          },)

      } catch (error) {
        console.error("Ошибка при скачивании:", error);
        notifications.show("Ошибка при скачивании",
          {
            severity: "error",
            autoHideDuration: 3000,
          },)
      } finally {
        // 5. В любом случае завершаем загрузку

        setIsLoading(false);

      }
    },
    [handleDownloadPDF, setIsLoading], // handleDownloadPDF должен быть зависимостью
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
          if (config) {
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
        }
        return (
          "Неизвестно"
        )
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
                    handleDownload(id);
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
