import "./App.css";

import { FunctionComponent, useContext, useEffect, useMemo } from "react";
import { useNwbFileSafe } from "../neurosift-lib/misc/NwbFileContext";
import { MainContext } from "./MainContext";
import { useTimeseriesSelection } from "../neurosift-lib/contexts/context-timeseries-selection";

const AcquisitionSelector: FunctionComponent = () => {
  const { selectedSession, acquisitionId, setAcquisitionId } =
    useContext(MainContext)!;

  const { resetTimeseriesSelection } = useTimeseriesSelection();

  useEffect(() => {
    resetTimeseriesSelection();
  }, [selectedSession, acquisitionId, resetTimeseriesSelection]);

  // "000", "001", "002", etc.
  const acquisitionOptions = useMemo(() => {
    const numAcquisitions = selectedSession?.numAcquisitions || 0;
    return Array.from({ length: numAcquisitions }, (_, i) =>
      i.toString().padStart(3, "0"),
    );
  }, [selectedSession]);

  const nwbFile = useNwbFileSafe();
  if (!nwbFile) {
    return <div>No NWB file selected</div>;
  }

  return (
    <div>
      <p>
        Select an acquisition:&nbsp;&nbsp;
        {acquisitionOptions.map((option) => (
          <span
            onClick={() => setAcquisitionId(option)}
            style={{ cursor: "pointer" }}
          >
            <input
              type="radio"
              key={option}
              checked={acquisitionId === option}
            />
            &nbsp;{option}&nbsp;&nbsp;
          </span>
        ))}
      </p>
    </div>
  );
};

export const ROISelector: FunctionComponent = () => {
  const { roiNumber, setRoiNumber, selectedSession } = useContext(MainContext)!;

  // roiOptions: "all", 1, 2, 3, ...
  const roiOptions: ("all" | number)[] = [
    "all",
    ...Array.from({ length: selectedSession?.numRois || 0 }, (_, i) => i + 1),
  ];

  const nwbFile = useNwbFileSafe();
  if (!nwbFile) {
    return <div>No NWB file selected</div>;
  }

  return (
    <p>
      Select an ROI:&nbsp;&nbsp;
      {roiOptions.map((option) => {
        const optString = option === "all" ? "all" : `${option}`;
        return (
          <span
            onClick={() => setRoiNumber(option)}
            style={{ cursor: "pointer" }}
          >
            <input
              type="radio"
              key={optString}
              checked={roiNumber === option}
            />
            &nbsp;{optString}&nbsp;&nbsp;
          </span>
        );
      })}
    </p>
  );
};

const channelSeparationChoices = [0, 0.1, 0.5];

export const ChannelSeparationSelector: FunctionComponent = () => {
  const {
    channelSeparation,
    setChannelSeparation,
    roiNumber,
    playing,
    setPlaying,
    setPlaybackRate,
  } = useContext(MainContext)!;

  const nwbFile = useNwbFileSafe();
  if (!nwbFile) {
    return <div>No NWB file selected</div>;
  }

  return (
    <select
      value={channelSeparation}
      onChange={(e) => setChannelSeparation(parseFloat(e.target.value))}
      disabled={roiNumber !== "all"}
    >
      {channelSeparationChoices.map((choice) => (
        <option key={choice} value={choice}>
          Channel separation: {choice}
        </option>
      ))}
    </select>
  );
};

export default AcquisitionSelector;
