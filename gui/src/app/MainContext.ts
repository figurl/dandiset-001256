import { createContext } from "react";

type MainContextType = {
  nwbUrl: string;
  setNwbUrl: (url: string) => void;
  acquisitionId: string;
  setAcquisitionId: (id: string) => void;
  roiIndex: number | "all";
  setRoiIndex: (index: number | "all") => void;
};

export const MainContext = createContext<MainContextType | null>(null);
