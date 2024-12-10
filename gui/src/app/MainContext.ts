import { createContext } from "react";
import { Session } from "./SessionsTable";

type MainContextType = {
  selectedSession: Session | undefined;
  setSelectedSession: (session: Session) => void;
  acquisitionId: string;
  setAcquisitionId: (id: string) => void;
  roiNumber: number | "all";
  setRoiNumber: (index: number | "all") => void;
  channelSeparation: number;
  setChannelSeparation: (separation: number) => void;
  playing: boolean;
  setPlaying: (playing: boolean) => void;
  playbackRate: number;
  setPlaybackRate: (rate: number) => void;
  motionCorrected: boolean;
  setMotionCorrected: (motionCorrected: boolean) => void;
};

export const MainContext = createContext<MainContextType | null>(null);
