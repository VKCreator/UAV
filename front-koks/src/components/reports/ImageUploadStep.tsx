import * as React from "react";
import {
  Box,
  Typography,
  Paper,
  IconButton,
  Alert,
  Dialog,
  DialogContent,
  DialogActions,
  DialogTitle,
  Button,
  Tooltip,
  Checkbox,
  FormControlLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Grid,
} from "@mui/material";
import { useDropzone, FileRejection } from "react-dropzone";
import FileUploadOutlinedIcon from "@mui/icons-material/FileUploadOutlined";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import VisibilityIcon from "@mui/icons-material/Visibility";
import CloseIcon from "@mui/icons-material/Close";
import FindReplaceOutlinedIcon from "@mui/icons-material/FindReplaceOutlined";

// Тип для EXIF данных
interface ExifData {
  fileName: string;
  fileSize: string;
  width?: number;
  height?: number;
  dateTime?: string;
  make?: string;
  model?: string;
  orientation?: number;
  xResolution?: number;
  yResolution?: number;
  resolutionUnit?: number;
  software?: string;
  artist?: string;
  copyright?: string;
  focalLength: number;
  focalLengthIn35mmFormat: number;
  latitude: string;
  longitude: string;
}

const ImageUploadStep: React.FC = () => {
  const [files, setFiles] = React.useState<File[]>([]);
  const [exifData, setExifData] = React.useState<ExifData[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [openPreview, setOpenPreview] = React.useState(false);
  const [originalSize, setOriginalSize] = React.useState(false); // чекбокс

  const onDrop = (acceptedFiles: File[], fileRejections: FileRejection[]) => {
    if (fileRejections.length > 0) {
      const rejection = fileRejections[0];
      setError(`Ошибка: ${rejection.errors[0].message}`);
      return;
    }

    const validFiles = acceptedFiles.filter((file) =>
      file.type.startsWith("image/")
    );
    if (validFiles.length === 0) return;

    const file = validFiles[0];

    setFiles([file]);
    setError(null); // сбрасываем ошибку

    readExif(file);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) {
      return `${bytes} B`;
    } else if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(2)} KB`;
    } else if (bytes < 1024 * 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    } else {
      return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    }
  };

  const readImageDimensions = (
    file: File
  ): Promise<{ width: number; height: number }> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);

      img.onload = () => {
        resolve({ width: img.naturalWidth, height: img.naturalHeight });
        URL.revokeObjectURL(url); // очищаем URL
      };

      img.onerror = () => {
        reject(new Error("Не удалось загрузить изображение"));
        URL.revokeObjectURL(url);
      };

      img.src = url;
    });
  };

  const readExif = async (file: File) => {
    try {
      const exifr = await import("exifr");
      const tags = await exifr.parse(file);

      console.log(tags);
      // Получаем размеры изображения
      let width: number | undefined;
      let height: number | undefined;

      if (tags && tags.ImageWidth && tags.ImageHeight) {
        width = tags.ImageWidth;
        height = tags.ImageHeight;
      } else {
        // Если EXIF не содержит размеры — читаем из файла
        const dimensions = await readImageDimensions(file);
        width = dimensions.width;
        height = dimensions.height;
      }

      const newExifData: ExifData = {
        fileName: file.name,
        fileSize: formatFileSize(file.size),
        width,
        height,
        dateTime: tags?.DateTimeOriginal || tags?.DateTime,
        make: tags?.Make,
        model: tags?.Model,
        orientation: tags?.Orientation,
        xResolution: tags?.XResolution,
        yResolution: tags?.YResolution,
        resolutionUnit: tags?.ResolutionUnit,
        software: tags?.Software,
        focalLength: tags?.FocalLength,
        focalLengthIn35mmFormat: tags?.FocalLengthIn35mmFormat,
        latitude: tags?.latitude,
        longitude: tags?.longitude,
      };

      setExifData([newExifData]);
    } catch (err) {
      console.error("Ошибка при чтении EXIF или размеров:", err);
      setError("Не удалось прочитать метаданные изображения");
    }
  };

  const handleDelete = () => {
    setFiles([]);
    setExifData([]);
    setError(null);
  };

  const handleReplace = () => {
    setFiles([]);
    setExifData([]);
    setError(null);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".jpeg", ".jpg", ".png"],
    },
    maxFiles: 1,
    maxSize: 30 * 1024 * 1024, // 30 МБ
  });

  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleOpenFileDialog = () => {
    if (inputRef.current) {
      inputRef.current.click();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      onDrop([file], []);
    }
  };

  // Получаем URL изображения, если файл загружен
  const imageUrl = files.length > 0 ? URL.createObjectURL(files[0]) : "";

  React.useEffect(() => {
    // Очищаем URL при размонтировании
    return () => {
      if (imageUrl) {
        URL.revokeObjectURL(imageUrl);
      }
    };
  }, [imageUrl]);

  const handleOriginalSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setOriginalSize(e.target.checked);
  };

  const createTables = (data: ExifData) => {
    const entries = Object.entries(data).filter(
      ([key]) => key !== "fileName" && key !== "fileSize" // пропускаем дубли
    );

    const tables = [];
    for (let i = 0; i < entries.length; i += 5) {
      tables.push(entries.slice(i, i + 5));
    }

    return tables;
  };

  return (
    <Box
      sx={{
        p: 2,
        display: "flex",
        height: "100%",
        width: "100%",
        flexDirection: "column",
      }}
    >
      {files.length > 0 ? (
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" gutterBottom>
            Информация о загруженном изображении
          </Typography>
          {/* Карточка информации о файле */}
          <Paper
            elevation={0}
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              p: 2,
              mb: 2,
              borderRadius: 1,
              border: "1px solid #e0e0e0",
            }}
          >
            {/* Иконка файла */}
            <Tooltip title="Просмотр">
              <Box
                sx={{
                  width: 64,
                  height: 64,
                  borderRadius: 1,
                  backgroundColor: "#f5f5f5",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  mr: 2,
                  cursor: "pointer",
                  overflow: "hidden",
                  border: "1px solid #e0e0e0",
                  "&:hover": {
                    backgroundColor: "#f0f0f0",
                  },
                }}
                onClick={() => setOpenPreview(true)}
              >
                {imageUrl && (
                  <img
                    src={imageUrl}
                    alt="Превью"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      borderRadius: "4px",
                    }}
                  />
                )}
              </Box>
            </Tooltip>

            {/* Название файла */}
            <Typography
              variant="body1"
              noWrap
              sx={{ flexGrow: 1, fontWeight: 500 }}
            >
              {files[0].name}
            </Typography>

            {/* Размер файла */}
            <Typography variant="caption" color="textSecondary" sx={{ mr: 2 }}>
              {exifData.length > 0 ? exifData[0].fileSize : ""}
            </Typography>

            {/* Действия: глаз, удалить, заменить */}
            <Box>
              <Tooltip title="Просмотр">
                <IconButton
                  onClick={() => setOpenPreview(true)}
                  size="medium"
                  color="primary"
                >
                  <VisibilityIcon fontSize="medium" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Удалить">
                <IconButton onClick={handleDelete} size="medium" color="error">
                  <DeleteIcon fontSize="medium" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Заменить">
                <IconButton
                  onClick={handleOpenFileDialog}
                  size="medium"
                  color="primary"
                >
                  <FindReplaceOutlinedIcon fontSize="medium" />
                </IconButton>
              </Tooltip>
              <input
                type="file"
                ref={inputRef}
                style={{ display: "none" }}
                accept="image/*"
                onChange={handleInputChange}
              />
            </Box>
          </Paper>

          {/* Заголовок метаданных */}
          <Typography variant="h6" gutterBottom>
            Метаданные изображения
          </Typography>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          {/* Таблица EXIF */}
          {/* Таблицы метаданных (до 5 столбцов в каждой) */}
          {exifData.length > 0 && (
            <>
              {createTables(exifData[0]).map((tableData, tableIndex) => (
                <TableContainer
                  component={Paper}
                  key={tableIndex}
                  sx={{ mb: 2, border: "1px solid #e0e0e0", borderRadius: 1 }}
                >
                  <Table>
                    <TableHead>
                      <TableRow>
                        {tableData.map(([key]) => (
                          <TableCell key={key}>{key}</TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      <TableRow>
                        {tableData.map(([key, value]) => (
                          <TableCell key={key}>
                            {value === undefined || value === null
                              ? "—"
                              : key === "width" || key === "height"
                              ? `${value} px`
                              : String(value)}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              ))}
            </>
          )}
        </Box>
      ) : (
        /* Иначе — показываем drag & drop */
        <>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box
            {...getRootProps()}
            sx={{
              border: "2px dashed #ccc",
              borderRadius: 2,
              p: 4,
              textAlign: "center",
              cursor: "pointer",
              backgroundColor: isDragActive ? "#f0f8ff" : "transparent",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              flex: 1,
            }}
          >
            <input {...getInputProps()} />
            <FileUploadOutlinedIcon
              sx={{ fontSize: 55, color: "#014488ff", mb: 1 }}
            />
            <Typography variant="body1" sx={{ fontWeight: 500, mb: 0.5 }}>
              Перетащите изображение сюда
            </Typography>
            <Typography variant="caption" color="textSecondary">
              или нажмите для выбора файла (JPG, PNG, не более 30Мб одно
              изображение)
            </Typography>
          </Box>
        </>
      )}

      {/* Диалог просмотра изображения */}
      <Dialog
        open={openPreview}
        onClose={(event, reason) => {
          if (reason !== "backdropClick") {
            setOpenPreview(false);
          }
        }}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            height: "90vh",
          },
        }}
      >
        <DialogTitle
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            Просмотр загруженного изображения
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={originalSize}
                  onChange={handleOriginalSizeChange}
                  size="medium"
                  sx={{
                    color: "#014488", // цвет unchecked
                    "&.Mui-checked": {
                      color: "#014488", // цвет checked
                    },
                  }}
                />
              }
              label={
                <Typography variant="caption">Оригинальный размер</Typography>
              }
            />
            <IconButton
              onClick={() => setOpenPreview(false)}
              sx={{ color: "gray" }}
            >
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent
          sx={{
            p: 0,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            flex: 1,
            overflow: "hidden", // 🚫 Скролл убран!
            m: 2,
          }}
        >
          {/* Внутренний контейнер — column */}
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "space-between",
              height: "100%",
              width: "100%",
              overflow: "hidden", // чтобы не было скролла внутри
            }}
          >
            {/* Изображение — растягивается по высоте, но не выходит за границы */}
            <Box
              sx={{
                flex: 1,
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                overflow: "auto",
                width: "100%",
                maxHeight: "calc(100% - 40px)", // оставляем место для подписи
              }}
            >
              <img
                src={imageUrl}
                alt="Полноэкранный просмотр"
                style={{
                  ...(originalSize
                    ? {}
                    : {
                        maxWidth: "100%",
                        maxHeight: "100%",
                        objectFit: "contain",
                      }),
                }}
              />
            </Box>
            {/* Подпись снизу */}
            {originalSize ? (
              <Typography
                variant="caption"
                color="textSecondary"
                sx={{
                  mt: 1,
                  textAlign: "center",
                  mb: 1,
                  fontSize: "0.75rem",
                }}
              >
                Используйте полосы прокрутки для перемещения по изображению
              </Typography>
            ) : (
              <></>
            )}
          </Box>
        </DialogContent>
        {/* Убираем DialogActions */}
      </Dialog>
    </Box>
  );
};

export default ImageUploadStep;
