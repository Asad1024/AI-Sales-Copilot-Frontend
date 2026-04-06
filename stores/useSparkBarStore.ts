import { create } from "zustand";
import { persist } from "zustand/middleware";

type SparkBarStore = {
  visible: boolean;
  /** Getting started stepper below the greeting (“Setup steps” pill toggles this). */
  setupStepperVisible: boolean;
  toggle: () => void;
  toggleSetupStepper: () => void;
  setVisible: (visible: boolean) => void;
  setSetupStepperVisible: (visible: boolean) => void;
};

export const useSparkBarStore = create<SparkBarStore>()(
  persist(
    (set, get) => ({
      visible: true,
      setupStepperVisible: true,
      toggle: () => set({ visible: !get().visible }),
      toggleSetupStepper: () => set({ setupStepperVisible: !get().setupStepperVisible }),
      setVisible: (visible) => set({ visible }),
      setSetupStepperVisible: (setupStepperVisible) => set({ setupStepperVisible }),
    }),
    {
      name: "sparkai:spark-ai-banner-visible",
      partialize: (state) => ({
        visible: state.visible,
        setupStepperVisible: state.setupStepperVisible,
      }),
    }
  )
);
