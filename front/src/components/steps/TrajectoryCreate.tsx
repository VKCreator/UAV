import StepperContainer from "../StepperContainer";
import TrajectoryStepper from "./TrajectoryStepper";

export default function TrajectoryCreate() {
  return (
    <StepperContainer title="Создание новой схемы полёта" centerContent>
      <TrajectoryStepper />
    </StepperContainer>
  );
}
