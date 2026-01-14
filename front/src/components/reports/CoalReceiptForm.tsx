// src/components/CoalReceiptForm.tsx
import * as React from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Grid from "@mui/material/Grid";
import TextField from "@mui/material/TextField";
import Autocomplete from "@mui/material/Autocomplete";
import CircularProgress from "@mui/material/CircularProgress";

import Divider from "@mui/material/Divider";
import Typography from "@mui/material/Typography";

import { LocalizationProvider } from '@mui/x-date-pickers';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';

import {
  api,
  Supplier,
  CokeBrand,
  Shakhtogroup,
  NaturalSheet,
} from "../../api/client";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { useNavigate } from "react-router";

export type FormFieldValue = string | number | boolean | null | undefined;

export interface CoalReceiptFormState {
  values: {
    supplierId?: number;
    cokeBrandId?: number;
    shakhtogroupId?: number;
    naturalSheetId?: number;
    wagonCount?: number;
    weightInTons?: number;
    receiptDate?: string;
  };
  errors: {
    supplierId?: string;
    cokeBrandId?: string;
    shakhtogroupId?: string;
    naturalSheetId?: string;
    wagonCount?: string;
    weightInTons?: string;
    receiptDate?: string;
  };
}

interface CoalReceiptFormProps {
  formState: CoalReceiptFormState;
  onFieldChange: (
    name: keyof CoalReceiptFormState["values"],
    value: FormFieldValue
  ) => void;
  onSubmit: () => void;
  onReset: () => void;
  submitButtonLabel: string;
}

export default function CoalReceiptForm({
  formState,
  onFieldChange,
  onSubmit,
  onReset,
  submitButtonLabel,
}: CoalReceiptFormProps) {
  const navigate = useNavigate();

  const { values, errors } = formState;

  // Состояния для данных
  const [suppliers, setSuppliers] = React.useState<Supplier[]>([]);
  const [cokeBrands, setCokeBrands] = React.useState<CokeBrand[]>([]);
  const [shakhtogroups, setShakhtogroups] = React.useState<Shakhtogroup[]>([]);
  const [naturalSheets, setNaturalSheets] = React.useState<NaturalSheet[]>([]);

  // Состояния загрузки
  const [loading, setLoading] = React.useState({
    suppliers: true,
    cokeBrands: true,
    shakhtogroups: true,
    naturalSheets: true,
  });

  // Загрузка данных при монтировании
  React.useEffect(() => {
    const loadData = async () => {
      try {
        const [
          suppliersRes,
          cokeBrandsRes,
          shakhtogroupsRes,
          naturalSheetsRes,
        ] = await Promise.allSettled([
          api.suppliers.getAll(),
          api.cokeBrands.getAll(),
          api.shakhtogroups.getAll(),
          api.naturalSheets.getAll(),
        ]);

        if (suppliersRes.status === "fulfilled") {
          setSuppliers(suppliersRes.value.data);
        }
        if (cokeBrandsRes.status === "fulfilled") {
          setCokeBrands(cokeBrandsRes.value.data);
        }
        if (shakhtogroupsRes.status === "fulfilled") {
          setShakhtogroups(shakhtogroupsRes.value.data);
        }
        if (naturalSheetsRes.status === "fulfilled") {
          setNaturalSheets(naturalSheetsRes.value.data);
        }
      } catch (error) {
        console.error("Ошибка загрузки данных:", error);
      } finally {
        setLoading({
          suppliers: false,
          cokeBrands: false,
          shakhtogroups: false,
          naturalSheets: false,
        });
      }
    };

    loadData();
  }, []);

  const handleBack = React.useCallback(() => {
    navigate("/trajectories");
  }, [navigate]);

  const renderAutocompleteField = <
    T extends { id: number; name: string },
    K extends keyof CoalReceiptFormState["values"]
  >(
    label: string,
    name: K,
    items: T[],
    isLoading: boolean,
    displayValue?: (item: T) => string
  ) => {
    const selectedOption = items.find((item) => item.id === values[name]);

    return (
      <Autocomplete
        fullWidth
        disablePortal
        options={items}
        value={selectedOption || null}
        onChange={(event, newValue) => {
          onFieldChange(name, newValue?.id ?? null);
        }}
        getOptionLabel={(option) =>
          displayValue ? displayValue(option) : option.name
        }
        isOptionEqualToValue={(option, value) => option.id === value.id}
        loading={isLoading}
        disabled={isLoading}
        noOptionsText="Ничего не найдено"
        renderInput={(params) => (
          <TextField
            {...params}
            label={`${label} *`}
            error={!!errors[name]}
            helperText={errors[name]}
            autoFocus
            InputProps={{
              ...params.InputProps,
              endAdornment: (
                <>
                  {isLoading ? (
                    <CircularProgress color="inherit" size={20} />
                  ) : null}
                  {params.InputProps.endAdornment}
                </>
              ),
            }}
          />
        )}
        sx={{ width: "100%" }}
      />
    );
  };

  return (
<Box
  component="form"
  onSubmit={(e) => {
    e.preventDefault();
    onSubmit();
  }}
  noValidate
  sx={{ width: "100%", maxWidth: 800 }}
>
  <Grid container spacing={1} sx={{ mb: 3 }}>
    {/* Группа 1: Поставка */}
    <Grid size={12}>
      <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
        Поставка угля
      </Typography>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          {renderAutocompleteField(
            "Поставщик",
            "supplierId",
            suppliers,
            loading.suppliers,
            (option) => option.name
          )}
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          {renderAutocompleteField(
            "Марка кокса",
            "cokeBrandId",
            cokeBrands,
            loading.cokeBrands,
            (option) => option.name
          )}
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          {renderAutocompleteField(
            "Шахтогруппа",
            "shakhtogroupId",
            shakhtogroups,
            loading.shakhtogroups,
            (option) => option.name
          )}
        </Grid>
      </Grid>
    </Grid>

    {/* Группа 2: Документы */}
    <Grid size={12}>
      <Divider sx={{ my: 1 }} />
      <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
        Документы
      </Typography>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          {renderAutocompleteField(
            "Натурный лист",
            "naturalSheetId",
            naturalSheets,
            loading.naturalSheets,
            (item: NaturalSheet) =>
              `Лист №${item.id} от ${new Date(item.reportDate).toLocaleDateString("ru-RU")}`
          )}
        </Grid>
      </Grid>
    </Grid>

    {/* Группа 3: Объём поступления */}
    <Grid size={12}>
      <Divider sx={{ my: 1 }} />
      <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
        Объём поступления
      </Typography>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <TextField
            fullWidth
            label="Количество вагонов *"
            type="number"
            value={values.wagonCount ?? ""}
            onChange={(e) =>
              onFieldChange("wagonCount", Number(e.target.value) || null)
            }
            error={!!errors.wagonCount}
            helperText={errors.wagonCount}
            slotProps={{ htmlInput: { min: 0, step: 1 } }}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <TextField
            fullWidth
            label="Вес (тонн) *"
            type="number"
            value={values.weightInTons ?? ""}
            onChange={(e) =>
              onFieldChange("weightInTons", Number(e.target.value) || null)
            }
            error={!!errors.weightInTons}
            helperText={errors.weightInTons}
            slotProps={{ htmlInput: { min: 0, step: 0.01 } }}
          />
        </Grid>
      </Grid>
    </Grid>

    {/* Группа 4: Время поступления */}
    <Grid size={12}>
      <Divider sx={{ my: 1 }} />
      <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
        Время поступления
      </Typography>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="ru">
            <DateTimePicker
              label="Дата и время поступления"
              value={values.receiptDate ? dayjs(values.receiptDate) : null}
              onChange={(newValue) => {
                const isoString = newValue ? newValue.toISOString() : null;
                onFieldChange("receiptDate", isoString);
              }}
              format="DD.MM.YYYY HH:mm"
              slotProps={{
                textField: {
                  fullWidth: true,
                  error: !!errors.receiptDate,
                  helperText: errors.receiptDate,
                  required: true,
                },
                field: { clearable: true },
              }}
            />
          </LocalizationProvider>
        </Grid>
      </Grid>
    </Grid>

    {/* Кнопки */}
    <Grid size={12}>
      <Divider sx={{ my: 1 }} />
      <Grid
        container
        direction="row"
        sx={{
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Grid>
          <Button
            variant="contained"
            startIcon={<ArrowBackIcon />}
            onClick={handleBack}
          >
            Назад
          </Button>
        </Grid>

        <Grid>
          <Box sx={{ display: "flex", gap: 2 }}>
            <Button type="button" variant="outlined" onClick={onReset}>
              Сбросить
            </Button>
            <Button type="submit" variant="contained" color="primary">
              {submitButtonLabel}
            </Button>
          </Box>
        </Grid>
      </Grid>
    </Grid>
  </Grid>
</Box>
  );
}
