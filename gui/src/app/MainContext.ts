import { createContext } from "react";
import { TimeseriesAnnotation } from "../neurosift-lib/viewPlugins/TimeSeries/TimeseriesItemView/WorkerTypes";

type MainContextType = {
  acquisitionId: string;
  setAcquisitionId: (id: string) => void;
  roiIndex: number | "all";
  setRoiIndex: (index: number | "all") => void;
  annotations: TimeseriesAnnotation[] | undefined;
};

export const MainContext = createContext<MainContextType | null>(null);
