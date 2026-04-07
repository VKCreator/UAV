import { FC, useEffect, useState } from "react";
import { TextField } from "@mui/material";
import { SxProps } from '@mui/material/styles';

interface FloatInputProps {
  value: number;
  onChange: (val: number) => void;
  min?: number;
  max?: number;
  fullWidth?: boolean;
  label?: string;
  error?: boolean;
  helperText?: string;
  InputProps?: object;
  sx?: SxProps;
  disabled?: boolean;
}

export const FloatInput: FC<FloatInputProps> = ({ value, onChange, min = 0, max, fullWidth, label, error, helperText, InputProps, sx, disabled }) => {
  const [inputValue, setInputValue] = useState(value.toFixed(2));

  // Синхронизируем если value изменился снаружи
  useEffect(() => {
    setInputValue(value.toFixed(2));
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    // Разрешаем: цифры, одну точку или запятую, минус в начале
    if (/^\d*[.,]?\d*$/.test(val)) {
      setInputValue(val);
    }
  };

  const handleBlur = () => {
    // Заменяем запятую на точку и парсим
    const parsed = parseFloat(inputValue.replace(",", "."));
    if (!isNaN(parsed) && parsed >= min && (max === undefined || parsed <= max)) {
      onChange(parsed);
      setInputValue(parsed.toFixed(2));
    } else {
      // Откатываем к последнему валидному значению
      setInputValue(value.toFixed(2));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    handleBlur();
  }
};

  return (
    <TextField
      type="text"
      inputMode="decimal"
      label={label}
      value={inputValue}
      onChange={handleChange}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      variant="outlined"
      size="small"
      fullWidth={fullWidth}
      error={error}
      helperText={helperText}
      InputProps={InputProps}
      sx={{ width: fullWidth ? undefined : 120, ...sx }}
      disabled={disabled}
    />
  );
};