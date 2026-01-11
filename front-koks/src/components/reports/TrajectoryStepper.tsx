import * as React from "react";
import { Stepper, Step, StepLabel, Button, Typography, Paper, Box } from "@mui/material";

// Тип для состояния формы
type CoalReceiptFormState = {
  values: Partial<Record<string, any>>;
  errors: Partial<Record<string, string>>;
};

const TrajectoryStepper: React.FC<{
  formState: CoalReceiptFormState;
  onFieldChange: (name: keyof CoalReceiptFormState["values"], value: any) => void;
  onSubmit: () => void;
  onReset: () => void;
}> = ({ formState, onFieldChange, onSubmit, onReset }) => {
  const [activeStep, setActiveStep] = React.useState(0);

  const steps = ['Загрузка изображения', 'Построение траектории', 'Оптимизация траектории', 'Сравнение траекторий'];

  const handleNext = () => {
    if (activeStep < steps.length - 1) {
      setActiveStep(activeStep + 1);
    }
  };

  const handleBack = () => {
    if (activeStep > 0) {
      setActiveStep(activeStep - 1);
    }
  };

  const handleReset = () => {
    setActiveStep(0);
    onReset();
  };

  return (
    <Box sx={{ width: '100%', mx: 'auto', mt: 4 }}>
      <Stepper activeStep={activeStep} alternativeLabel>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      <Paper sx={{ p: 3, mt: 3, minHeight: 200 }}>
        <Typography variant="h6" gutterBottom>
          {steps[activeStep]}
        </Typography>
        <Typography variant="body1">
          Содержимое шага {activeStep + 1}
        </Typography>
      </Paper>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
        <Button 
          disabled={activeStep === 0} 
          onClick={handleBack}
          variant="outlined"
        >
          Назад
        </Button>
        
        <Button 
          onClick={activeStep === steps.length - 1 ? onSubmit : handleNext}
          variant="contained"
          color="primary"
        >
          {activeStep === steps.length - 1 ? 'Создать' : 'Далее'}
        </Button>
      </Box>
    </Box>
  );
};

export default TrajectoryStepper;