// src/components/CoalReceiptCreate.tsx
import * as React from "react";
import { useNavigate } from "react-router";
import useNotifications from "../../hooks/useNotifications/useNotifications";

import StepperContainer from "../StepperContainer";
import TrajectoryStepper from "./TrajectoryStepper";

import { api } from "../../api/client";
import { Box } from "@mui/material";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import CloseOutlinedIcon from "@mui/icons-material/CloseOutlined";

type ValidationResult = {
  issues: { message: string; path: (keyof any)[] }[];
};

export default function TrajectoryCreate() {
  const navigate = useNavigate();
  const notifications = useNotifications();

  const handleClose = React.useCallback(() => {
    navigate("/");
  }, [navigate]);

  const handleFormSubmit = React.useCallback(async () => {
    // const { issues } = validateCoalReceipt([]);
    // if (issues && issues.length > 0) {
    //   // setFormErrors(
    //   //   Object.fromEntries(
    //   //     issues.map((issue) => [issue.path?.[0], issue.message])
    //   //   )
    //   // );
    //   return;
    // }
    // setFormErrors({});

    try {
      // await api.coalReceipts.create(formValues as CreateCoalReceiptInput);

      notifications.show("Схема полётов создана", {
        severity: "success",
        autoHideDuration: 3000,
      });
      navigate("/trajectories");
    } catch (createError) {
      notifications.show(
        `Не удалось создать поступление. Причина: ${
          (createError as Error).message
        }`,
        {
          severity: "error",
          autoHideDuration: 5000,
        },
      );
    }
  }, [navigate, notifications]);

  return (
    <StepperContainer
      title="Создание новой схемы полёта"
      // actions={
      //   <Stack direction="row" alignItems="center" spacing={1}>
      //     <Tooltip title="Закрыть" placement="bottom" enterDelay={1000}>
      //       <div>
      //         <IconButton
      //           size="small"
      //           aria-label="refresh"
      //           onClick={handleClose}
      //           color="primary"
      //         >
      //           <CloseOutlinedIcon />
      //         </IconButton>
      //       </div>
      //     </Tooltip>
      //   </Stack>
      // }
      centerContent
    >
      <TrajectoryStepper onSubmit={handleFormSubmit} onReset={() => {}} />
    </StepperContainer>
  );
}
