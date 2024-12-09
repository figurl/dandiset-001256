import { createContext } from "react";
import { Session } from "./SessionsTable";

type MainContextType = {
  selectedSession: Session | undefined;
  setSelectedSession: (session: Session) => void;
  acquisitionId: string;
  setAcquisitionId: (id: string) => void;
  roiIndex: number | "all";
  setRoiIndex: (index: number | "all") => void;
};

export const MainContext = createContext<MainContextType | null>(null);
