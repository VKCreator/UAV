// src/components/CoalReceiptCreate.tsx
import * as React from "react";
import { useNavigate } from "react-router";
import useNotifications from "../../hooks/useNotifications/useNotifications";

import CoalReceiptForm, {
  type FormFieldValue,
  type CoalReceiptFormState,
} from "./CoalReceiptForm";
import StepperContainer from "../StepperContainer";
import TrajectoryStepper from "./TrajectoryStepper";

import { api, CreateCoalReceiptInput } from "../../api/client";
import { Box } from "@mui/material";

type ValidationResult = {
  issues: { message: string; path: (keyof CoalReceiptInput)[] }[];
};

// Тип входных данных для валидации
interface CoalReceiptInput {
  supplierId?: number;
  cokeBrandId?: number;
  shakhtogroupId?: number;
  naturalSheetId?: number;
  wagonCount?: number;
  weightInTons?: number;
  receiptDate?: string; // ISO string
}

export function validateCoalReceipt(
  coalReceipt: Partial<CoalReceiptInput>
): ValidationResult {
  let issues: ValidationResult["issues"] = [];

  // supplierId — обязательно, положительное число
  if (coalReceipt.supplierId == null) {
    issues.push({ message: "Поставщик обязателен", path: ["supplierId"] });
  } else if (
    typeof coalReceipt.supplierId !== "number" ||
    coalReceipt.supplierId <= 0
  ) {
    issues.push({
      message: "ID поставщика должен быть положительным числом",
      path: ["supplierId"],
    });
  }

  // cokeBrandId — обязательно, положительное число
  if (coalReceipt.cokeBrandId == null) {
    issues.push({ message: "Марка кокса обязательна", path: ["cokeBrandId"] });
  } else if (
    typeof coalReceipt.cokeBrandId !== "number" ||
    coalReceipt.cokeBrandId <= 0
  ) {
    issues.push({
      message: "ID марки кокса должен быть положительным числом",
      path: ["cokeBrandId"],
    });
  }

  // shakhtogroupId — обязательно, положительное число
  if (coalReceipt.shakhtogroupId == null) {
    issues.push({
      message: "Шахтогруппа обязательна",
      path: ["shakhtogroupId"],
    });
  } else if (
    typeof coalReceipt.shakhtogroupId !== "number" ||
    coalReceipt.shakhtogroupId <= 0
  ) {
    issues.push({
      message: "ID шахтогруппы должен быть положительным числом",
      path: ["shakhtogroupId"],
    });
  }

  // naturalSheetId — обязательно, положительное число
  if (coalReceipt.naturalSheetId == null) {
    issues.push({
      message: "Натурный лист обязателен",
      path: ["naturalSheetId"],
    });
  } else if (
    typeof coalReceipt.naturalSheetId !== "number" ||
    coalReceipt.naturalSheetId <= 0
  ) {
    issues.push({
      message: "ID натурного листа должен быть положительным числом",
      path: ["naturalSheetId"],
    });
  }

  // wagonCount — обязательно, неотрицательное целое
  if (coalReceipt.wagonCount == null) {
    issues.push({
      message: "Количество вагонов обязательно",
      path: ["wagonCount"],
    });
  } else if (
    typeof coalReceipt.wagonCount !== "number" ||
    coalReceipt.wagonCount < 0 ||
    !Number.isInteger(coalReceipt.wagonCount)
  ) {
    issues.push({
      message: "Количество вагонов должно быть целым неотрицательным числом",
      path: ["wagonCount"],
    });
  }

  // weightInTons — обязательно, неотрицательное число
  if (coalReceipt.weightInTons == null) {
    issues.push({ message: "Вес обязателен", path: ["weightInTons"] });
  } else if (
    typeof coalReceipt.weightInTons !== "number" ||
    coalReceipt.weightInTons < 0
  ) {
    issues.push({
      message: "Вес должен быть неотрицательным числом",
      path: ["weightInTons"],
    });
  }

  // receiptDate — обязательно, корректная дата
  if (!coalReceipt.receiptDate) {
    issues.push({
      message: "Дата поступления обязательна",
      path: ["receiptDate"],
    });
  } else {
    const date = new Date(coalReceipt.receiptDate);
    if (isNaN(date.getTime())) {
      issues.push({
        message: "Некорректный формат даты поступления",
        path: ["receiptDate"],
      });
    }
  }

  return { issues };
}

// Начальные значения формы
const INITIAL_FORM_VALUES: Partial<CoalReceiptFormState["values"]> = {
  wagonCount: 1,
  weightInTons: 1,
  receiptDate: new Date().toISOString(), // UTC
};

export default function TrajectoryCreate() {
  const navigate = useNavigate();
  const notifications = useNotifications();

  const [formState, setFormState] = React.useState<CoalReceiptFormState>(
    () => ({
      values: INITIAL_FORM_VALUES,
      errors: {},
    })
  );

  const formValues = formState.values;
  const formErrors = formState.errors;

  const setFormValues = React.useCallback(
    (newFormValues: Partial<CoalReceiptFormState["values"]>) => {
      setFormState((prevState) => ({
        ...prevState,
        values: newFormValues,
      }));
    },
    []
  );

  const setFormErrors = React.useCallback(
    (newFormErrors: Partial<CoalReceiptFormState["errors"]>) => {
      setFormState((prevState) => ({
        ...prevState,
        errors: newFormErrors,
      }));
    },
    []
  );

  const handleFormFieldChange = React.useCallback(
    (name: keyof CoalReceiptFormState["values"], value: FormFieldValue) => {
      const validateField = async (
        values: Partial<CoalReceiptFormState["values"]>
      ) => {
        const { issues } = validateCoalReceipt(values);
        setFormErrors({
          ...formErrors,
          [name]: issues?.find((issue) => issue.path?.[0] === name)?.message,
        });
      };

      const newFormValues = { ...formValues, [name]: value };
      setFormValues(newFormValues);
      validateField(newFormValues);
    },
    [formValues, formErrors, setFormErrors, setFormValues]
  );

  const handleFormReset = React.useCallback(() => {
    setFormValues(INITIAL_FORM_VALUES);
    setFormErrors({});
  }, [setFormValues, setFormErrors]);

  const handleFormSubmit = React.useCallback(async () => {
    const { issues } = validateCoalReceipt(formValues);
    if (issues && issues.length > 0) {
      setFormErrors(
        Object.fromEntries(
          issues.map((issue) => [issue.path?.[0], issue.message])
        )
      );
      return;
    }
    setFormErrors({});

    try {
      await api.coalReceipts.create(formValues as CreateCoalReceiptInput);

      notifications.show("Поступление создано", {
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
        }
      );
    }
  }, [formValues, navigate, notifications, setFormErrors]);

  return (
    <StepperContainer title="Создание новой схемы полётов" centerContent>
      <TrajectoryStepper
        formState={formState}
        onFieldChange={handleFormFieldChange}
        onSubmit={handleFormSubmit}
        onReset={handleFormReset}
      />
    </StepperContainer>
  );
}
