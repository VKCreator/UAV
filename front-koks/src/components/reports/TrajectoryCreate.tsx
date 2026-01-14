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
