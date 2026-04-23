import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from "@mui/material";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import { useState, useEffect } from "react";
import L from "leaflet";

interface Props {
  open: boolean;
  lat: number;
  lon: number;
  onClose: () => void;
  onSelect: (lat: number, lon: number) => void;
}

// фикс иконок leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const ClickHandler = ({
  onPick,
}: {
  onPick: (lat: number, lon: number) => void;
}) => {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
};

export const LocationPickerDialog = ({
  open,
  onClose,
  onSelect,
  lat,
  lon,
}: Props) => {
  const [position, setPosition] = useState<[number, number]>([lat, lon]);

  const handleClose = (
    _: object,
    reason: "backdropClick" | "escapeKeyDown",
  ) => {
    if (reason === "escapeKeyDown" || reason === "backdropClick") {
      return; // игнорируем
    }
    onClose();
  };

  useEffect(() => {
    if (open) {
      setPosition([lat, lon]);
    }
  }, [lat, lon, open]);

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="lg"
      fullWidth
      disableEscapeKeyDown
    >
      <DialogTitle>Выбор местоположения</DialogTitle>

      <DialogContent sx={{ height: 1000, p: 0 }}>
        <MapContainer
          center={position ?? [position[0], position[1]]}
          zoom={13}
          style={{ height: "100%", width: "100%" }}
          attributionControl={false}
        >
          <TileLayer
            attribution="© OpenStreetMap"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <ClickHandler onPick={(lat, lon) => setPosition([lat, lon])} />

          {position && <Marker position={position} />}
        </MapContainer>
      </DialogContent>

      <DialogActions>
        <Button variant="outlined" onClick={onClose}>Отмена</Button>
        <Button
          variant="contained"
          disabled={!position}
          onClick={() => {
            if (!position) return;
            onSelect(position[0], position[1]);
            onClose();
          }}
        >
          Выбрать
        </Button>
      </DialogActions>
    </Dialog>
  );
};
