import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Typography,
  Box,
  Divider,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

// ─── SVG-примитивы для иконок легенды ────────────────────────────────────────
// Все иконки отрисованы через SVG, чтобы точно соответствовать
// тому, что рисует Konva на сцене.

const ICON_SIZE = 36; // размер области SVG

/** Синяя точка съёмки с номером — пользовательская траектория */
const UserPointIcon: React.FC = () => (
  <svg width={ICON_SIZE} height={ICON_SIZE}>
    <circle cx={18} cy={18} r={10} fill="blue" />
    <text
      x={18}
      y={22}
      textAnchor="middle"
      fontSize={12}
      fill="white"
      fontFamily="sans-serif"
    >
      1
    </text>
  </svg>
);

/** Красная стрелка между точками — пользовательская траектория */
const UserArrowIcon: React.FC = () => (
  <svg width={ICON_SIZE} height={ICON_SIZE}>
    <defs>
      <marker
        id="arrow-red"
        markerWidth="6"
        markerHeight="6"
        refX="5"
        refY="3"
        orient="auto"
      >
        <path d="M0,0 L0,6 L6,3 z" fill="red" />
      </marker>
    </defs>
    <line
      x1={4}
      y1={18}
      x2={28}
      y2={18}
      stroke="red"
      strokeWidth={2}
      markerEnd="url(#arrow-red)"
    />
  </svg>
);

/** Цветная точка таксона с номером + стрелка того же цвета */
const TaxonIcon: React.FC = () => (
  <svg width={ICON_SIZE} height={ICON_SIZE}>
    <defs>
      <marker
        id="arrow-taxon"
        markerWidth="6"
        markerHeight="6"
        refX="5"
        refY="3"
        orient="auto"
      >
        <path d="M0,0 L0,6 L6,3 z" fill="#65b9f7" />
      </marker>
    </defs>
    <circle cx={18} cy={18} r={10} fill="#65b9f7" />
    <text
      x={18}
      y={22}
      textAnchor="middle"
      fontSize={12}
      fill="black"
      fontFamily="sans-serif"
    >
      1
    </text>
  </svg>
);

/** Треугольник — база таксона (точка взлёта/посадки таксона) */
const TaxonBaseIcon: React.FC = () => (
  <svg width={ICON_SIZE} height={ICON_SIZE}>
    {/* Треугольник как в Konva: три точки */}
    <polygon points="10,26 18,10 26,26" fill="#65b9f7" />
  </svg>
);

/** Стрелка цвета таксона — маршрут внутри таксона */
const TaxonArrowIcon: React.FC = () => (
  <svg width={ICON_SIZE} height={ICON_SIZE}>
    <defs>
      <marker
        id="arrow-taxon2"
        markerWidth="6"
        markerHeight="6"
        refX="5"
        refY="3"
        orient="auto"
      >
        <path d="M0,0 L0,6 L6,3 z" fill="#65b9f7" />
      </marker>
    </defs>
    <line
      x1={4}
      y1={18}
      x2={28}
      y2={18}
      stroke="#65b9f7"
      strokeWidth={2}
      markerEnd="url(#arrow-taxon2)"
    />
  </svg>
);

/** Оранжевая линия + серая зона — линия взлёта/посадки */
const FlightLineIcon: React.FC = () => (
  <svg width={ICON_SIZE} height={ICON_SIZE}>
    {/* Серая зона под линией */}
    <rect x={2} y={18} width={32} height={14} fill="rgba(128,128,128,0.3)" />
    {/* Оранжевая линия */}
    <line x1={2} y1={18} x2={34} y2={18} stroke="orange" strokeWidth={2} />
  </svg>
);

/** Разноцветный полигон — препятствие */
const ObstacleIcon: React.FC = () => (
  <svg width={ICON_SIZE} height={ICON_SIZE}>
    <polygon
      points="8,28 18,8 28,28"
      fill="rgba(158,105,196,0.2)"
      stroke="#9e69c4"
      strokeWidth={2}
    />
    {/* Вершины полигона */}
    <circle cx={8} cy={28} r={3} fill="#9e69c4" />
    <circle cx={18} cy={8} r={3} fill="#9e69c4" />
    <circle cx={28} cy={28} r={3} fill="#9e69c4" />
  </svg>
);

/** Круг с крестиком — недостижимая точка */
const UnreachablePointIcon: React.FC = () => (
  <svg width={ICON_SIZE} height={ICON_SIZE}>
    <circle
      cx={18}
      cy={18}
      r={10}
      fill="rgba(255, 107, 53, 0.15)"
      stroke="#FF6B35"
      strokeWidth={1.5}
    />
    <line
      x1={13}
      y1={13}
      x2={23}
      y2={23}
      stroke="#FF6B35"
      strokeWidth={2}
    />
    <line
      x1={23}
      y1={13}
      x2={13}
      y2={23}
      stroke="#FF6B35"
      strokeWidth={2}
    />
  </svg>
);

// ─── Структура легенды ────────────────────────────────────────────────────────

interface LegendItem {
  icon: React.ReactNode;
  label: string;
  description: string;
}

interface LegendSection {
  title: string;
  items: LegendItem[];
}

const LEGEND_SECTIONS: LegendSection[] = [
  {
    title: "Пользовательская траектория",
    items: [
      {
        icon: <UserPointIcon />,
        label: "Точка съёмки",
        description: "Точка, заданная пользователем. Цифра — порядковый номер.",
      },
      {
        icon: <UserArrowIcon />,
        label: "Направление полёта",
        description: "Красная стрелка показывает порядок обхода точек.",
      },
    ],
  },
  {
    title: "Оптимизированная траектория (таксоны)",
    items: [
      {
        icon: <TaxonBaseIcon />,
        label: "База таксона",
        description:
          "Треугольник — точка взлёта и посадки дрона для данного таксона.",
      },
      {
        icon: <TaxonIcon />,
        label: "Точка таксона",
        description:
          "Точка съёмки в рамках таксона. Каждый таксон имеет свой цвет.",
      },
      {
        icon: <TaxonArrowIcon />,
        label: "Маршрут таксона",
        description:
          "Стрелка цвета таксона показывает порядок облёта точек внутри группы.",
      },
    ],
  },
  {
    title: "Прочие обозначения",
    items: [
      {
        icon: <ObstacleIcon />,
        label: "Препятствие",
        description:
          "Полигон произвольной формы. Каждое препятствие выделено своим цветом.",
      },
      {
        icon: <FlightLineIcon />,
        label: "Линия взлёта и посадки",
        description:
          "Оранжевая линия. Серая область ниже — неинформативная зона, точки в ней не размещаются.",
      },
      {
        icon: <UnreachablePointIcon />,
        label: "Недостижимая точка",
        description:
          "Точка, которую дрон не может посетить в рамках ограничений заряда или маршрута.",
      },
    ],
  },
];

// ─── Компонент строки легенды ─────────────────────────────────────────────────

const LegendRow: React.FC<LegendItem> = ({ icon, label, description }) => (
  <Box
    sx={{
      display: "flex",
      alignItems: "center",
      gap: 2,
      py: 1,
    }}
  >
    {/* Иконка фиксированной ширины */}
    <Box
      sx={{
        width: 36,
        height: 36,
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {icon}
    </Box>

    {/* Текст */}
    <Box>
      <Typography variant="body2" fontWeight={600}>
        {label}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {description}
      </Typography>
    </Box>
  </Box>
);

// ─── Основной компонент диалога ───────────────────────────────────────────────

interface FlightSchemaLegendDialogProps {
  open: boolean;
  onClose: () => void;
}

const FlightSchemaLegendDialog: React.FC<FlightSchemaLegendDialogProps> = ({
  open,
  onClose,
}) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          pb: 1,
        }}
      >
        Легенда карты полёта
        <IconButton onClick={onClose} size="small" aria-label="Закрыть">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ pt: 1 }}>
        {LEGEND_SECTIONS.map((section, sIdx) => (
          <Box key={section.title}>
            {/* Заголовок секции */}
            <Typography
              variant="overline"
              color="text.secondary"
              sx={{ display: "block", mb: 0.5, mt: sIdx > 0 ? 1 : 0 }}
            >
              {section.title}
            </Typography>

            {section.items.map((item, iIdx) => (
              <React.Fragment key={item.label}>
                <LegendRow {...item} />
                {iIdx < section.items.length - 1 && (
                  <Divider sx={{ ml: 6 }} />
                )}
              </React.Fragment>
            ))}

            {sIdx < LEGEND_SECTIONS.length - 1 && (
              <Divider sx={{ mt: 1.5, mb: 0.5 }} />
            )}
          </Box>
        ))}
      </DialogContent>
    </Dialog>
  );
};

export default FlightSchemaLegendDialog;
