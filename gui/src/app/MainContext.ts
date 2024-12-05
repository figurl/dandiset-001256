import { createContext } from "react";

type MainContextType = {
  acquisitionId: string;
  setAcquisitionId: (id: string) => void;
};

export const MainContext = createContext<MainContextType | null>(null);
