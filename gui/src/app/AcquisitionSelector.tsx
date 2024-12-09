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

// roiOptions: "all", 0, 1, 2, ..., 50
const roiOptions: ("all" | number)[] = [
  "all",
  ...Array.from({ length: 51 }, (_, i) => i),
];

export const ROISelector: FunctionComponent = () => {
  const { roiIndex, setRoiIndex } = useContext(MainContext)!;

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
            onClick={() => setRoiIndex(option)}
            style={{ cursor: "pointer" }}
          >
            <input type="radio" key={optString} checked={roiIndex === option} />
            &nbsp;{optString}&nbsp;&nbsp;
          </span>
        );
      })}
    </p>
  );
};

export default AcquisitionSelector;
