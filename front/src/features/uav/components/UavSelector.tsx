// src/components/UavSelector.tsx
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  SelectChangeEvent
} from "@mui/material";
import type { Drone } from "../types/uav.types";

interface UavSelectorProps {
  drones: Drone[];
  value: string;
  onChange: (drone: Drone) => void;
  loading: boolean;
}

export default function UavSelector({
  drones,
  value,
  onChange,
  loading,
}: UavSelectorProps) {
  const handleChange = (event: SelectChangeEvent<string>) => {
    const selectedId = event.target.value as string;
    const drone = drones.find((d) => String(d.drone_id) === selectedId);
    if (drone) {
      onChange(drone); // передаём весь объект
    }
  };

  if (loading) {
    return <CircularProgress size={24} />;
  }

  return (
    <FormControl fullWidth size="small">
      <InputLabel id="uav-type-label">Модель БПЛА</InputLabel>
      <Select
        labelId="uav-type-label"
        value={value}
        label="Модель БПЛА"
        onChange={handleChange}
      >
        {drones.length === 0 ? (
          <MenuItem disabled value="">
            Нет данных
          </MenuItem>
        ) : (
          drones.map((drone) => (
            <MenuItem key={drone.drone_id} value={String(drone.drone_id)}>
              {drone.model}
            </MenuItem>
          ))
        )}
      </Select>
    </FormControl>
  );
}