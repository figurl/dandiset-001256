import { createContext } from "react";
import { TimeseriesAnnotation } from "../neurosift-lib/viewPlugins/TimeSeries/TimeseriesItemView/WorkerTypes";

type MainContextType = {
  acquisitionId: string;
  setAcquisitionId: (id: string) => void;
  annotations: TimeseriesAnnotation[] | undefined;
};

export const MainContext = createContext<MainContextType | null>(null);
