import StepperContainer from "../StepperContainer";
import TrajectoryStepper from "./TrajectoryStepper";

export default function TrajectoryCreate() {
  return (
    <StepperContainer title="Создание новой полётной карты" centerContent>
      <TrajectoryStepper />
    </StepperContainer>
  );
}
