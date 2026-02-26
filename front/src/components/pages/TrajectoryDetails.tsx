import { useParams } from "react-router";
import { Box, Typography, Tooltip } from "@mui/material";
import FlightSchemaPage from "./FlightSchemaPage";
import { useNavigate } from "react-router";
import { useSearchParams } from "react-router";
import { Fab, Zoom, useScrollTrigger } from "@mui/material";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import { useRef, useEffect } from "react";

import { api
  
 } from "../../api/client";
export default function TrajectoryDetails() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const { id } = useParams();
  // Здесь получаем данные схемы по id

  const page = searchParams.get("page");
  const pageSize = searchParams.get("pageSize");

  const handleClose = () => {
    // navigate(-1); // назад

    if (page && pageSize)
      navigate(`/trajectories?page=${page}&pageSize=${pageSize}`);
    else navigate(-1)
  };
  // создаём ref для контейнера
  const containerRef = useRef<HTMLDivElement>(null);

  // триггер на этом контейнере
  const trigger = useScrollTrigger({
    disableHysteresis: true,
    threshold: 100,
    target: containerRef.current, // <-- важная часть
  });
  const handleClick = () => {
    containerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  useEffect(() => {
    const verifyToken = async () => {
      try {
        const result = await api.auth.check();

        if (!result) {
          navigate("/login");
        }
      } catch (error) {
        api.auth.logout();
        navigate("/login");
      }
    };

    verifyToken();
  }, [navigate]);

  return (
    <Box
      sx={{ height: "100%", overflow: "auto", maxHeight: "100%" }}
      ref={containerRef}
    >
      <FlightSchemaPage
        imageData={null}
        exifData={[]}
        onClose={handleClose}
        weatherConditions={null}
        droneParams={null}
        points={[]} // передаём пустой массив точек
        obstacles={[]} // передаём пустой массив препятствий
        trajectoryData={null} // передаём null для данных траектории
        width_m={0}
        height_m={0}
      ></FlightSchemaPage>
      <Zoom in={true}>
        <Box
          onClick={handleClick}
          role="presentation"
          sx={{
            position: "fixed",
            bottom: 24,
            right: 32,
            zIndex: 1000,
          }}
        >
          <Tooltip title="Наверх" arrow>
            <Fab
              size="small"
              aria-label="scroll back to top"
              sx={{
                bgcolor: "#004E9E", // фон кнопки
                "&:hover": {
                  bgcolor: "#004E9E", // фон при наведении
                },
              }}
            >
              <KeyboardArrowUpIcon sx={{ fill: "white" }} />
            </Fab>
          </Tooltip>
        </Box>
      </Zoom>
    </Box>
  );
}
