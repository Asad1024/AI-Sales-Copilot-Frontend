import { create } from "zustand";
import { persist } from "zustand/middleware";

type SparkBarStore = {
  visible: boolean;
  toggle: () => void;
  setVisible: (visible: boolean) => void;
};

export const useSparkBarStore = create<SparkBarStore>()(
  persist(
    (set, get) => ({
      visible: true,
      toggle: () => set({ visible: !get().visible }),
      setVisible: (visible) => set({ visible }),
    }),
    { name: "sparkai:spark-ai-banner-visible" }
  )
);
