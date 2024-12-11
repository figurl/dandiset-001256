import { useEffect, useMemo, useReducer } from "react";
import {
  useNwbFile,
  useNwbFileSafe,
} from "../neurosift-lib/misc/NwbFileContext";
import { useGroup } from "../neurosift-lib/misc/hooks";
import { RemoteH5FileX, RemoteH5Group } from "../neurosift-lib/remote-h5-file";

type StimInfo = {
  file: string; // eg. "AA0304AAAA_00032_00001.tif"
  TwoPhotonSeries: string; // eg. "TwoPhotonSeries_001"
  fileTimeInstantiate: string; // eg. "2021-03-11 19:22:18.393000"
  starting_time: number; // eg. 125.14
  type: string; // eg. "stim"
  nFrames: number; // eg. 120
  frameRate: number; // eg. 5
  treatment: string; // eg. "none"
  pulseNames: string; // eg. "25msDRC_5-52kHz_50-60dB_8s_sin2-cos2_DRCramp_250kHz_stim_10000Hz_70dB_400ms_at_2s_4"
  pulseSets: string; // eg. "PC_PTinContrast_5-52kHz_25msDRC_10000Hz70dB_0s_delay"
  ISI: number; // eg. 0
  stimDelay: number; // eg. 4
  xsg: string; // eg. "AA0304AAAA0030.xsg"
};

export const useAnnotations = (acquisitionId: string) => {
  const stimTableData = useStimTableData();
  const stimInfo: StimInfo | undefined | null = useMemo(() => {
    if (!stimTableData) return stimTableData;
    if (!stimTableData["TwoPhotonSeries"]) return null;
    const i = stimTableData["TwoPhotonSeries"].indexOf(
      `TwoPhotonSeries_${acquisitionId}`,
    );
    if (i < 0) return null;
    const info: { [colname: string]: unknown } = {};
    for (const colname in stimTableData) {
      info[colname] = stimTableData[colname][i];
    }
    return info as StimInfo;
  }, [stimTableData, acquisitionId]);
  const annotations = useMemo(() => {
    if (!stimInfo) return undefined;
    // We are hard-coding this for now because parsing these fields is confusing
    const lowContrast = stimInfo.pulseNames.includes("50-60dB");
    const highContrast = stimInfo.pulseNames.includes("40-70dB");
    if (lowContrast || highContrast) {
      if (
        stimInfo.pulseNames.includes("dB_8s_sin") &&
        stimInfo.pulseSets ===
          "PC_PTinContrast_5-52kHz_25msDRC_10000Hz70dB_0s_delay"
      ) {
        return [
          {
            // DRC for 2s
            type: "interval" as const,
            data: {
              label: `DRC ${lowContrast ? "Low" : "High"}`,
              startSec: stimInfo.starting_time + stimInfo.stimDelay,
              endSec: stimInfo.starting_time + stimInfo.stimDelay + 2,
            },
          },
          {
            // pure tone for 400ms
            type: "interval" as const,
            data: {
              label: "PT",
              startSec: stimInfo.starting_time + stimInfo.stimDelay + 2,
              endSec: stimInfo.starting_time + stimInfo.stimDelay + 2.4,
            },
          },
          {
            // DRC for remaining time for a total of 8s
            type: "interval" as const,
            data: {
              label: `DRC ${highContrast ? "High" : "Low"}`,
              startSec: stimInfo.starting_time + stimInfo.stimDelay + 2.4,
              endSec: stimInfo.starting_time + stimInfo.stimDelay + 8,
            },
          },
        ];
      } else if (
        stimInfo.pulseNames.includes("dB_10s_sin") &&
        stimInfo.pulseSets ===
          "PC_contrastChange_25msDRC_5-52kHz_50-60_40-70dB_10sEach"
      ) {
        // DRC1 for 10 seconds, then DRC2 for 10 seconds
        return [
          {
            type: "interval" as const,
            data: {
              label: `DRC ${lowContrast ? "Low" : "High"}`,
              startSec: stimInfo.starting_time + stimInfo.stimDelay,
              endSec: stimInfo.starting_time + stimInfo.stimDelay + 10,
            },
          },
          {
            type: "interval" as const,
            data: {
              label: `DRC ${highContrast ? "High" : "Low"}`,
              startSec: stimInfo.starting_time + stimInfo.stimDelay + 10,
              endSec: stimInfo.starting_time + stimInfo.stimDelay + 20,
            },
          },
        ];
      } else {
        return [];
      }
    } else {
      return [];
    }
  }, [stimInfo]);
  return annotations;
};

const useStimTableData = () => {
  const nwbFile = useNwbFileSafe();
  const stimParamTable = useGroup(
    nwbFile || undefined,
    "/stimulus/presentation/stim param table",
  );
  const stimTableData = useDynamicTableData(
    nwbFile || undefined,
    stimParamTable,
  );
  return stimTableData;
};

type DynamicTableData = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [colname: string]: any[];
};

type DynamicTableDataAction =
  | {
      type: "set-column-data";
      colname: string;
      data: unknown[];
    }
  | {
      type: "clear";
    };

const dynamicTableDataReducer = (
  state: DynamicTableData,
  action: DynamicTableDataAction,
): DynamicTableData => {
  switch (action.type) {
    case "set-column-data": {
      return {
        ...state,
        [action.colname]: action.data,
      };
    }
    case "clear": {
      return {};
    }
  }
};

const useDynamicTableData = (
  nwbFile: RemoteH5FileX | undefined,
  group: RemoteH5Group | undefined,
): DynamicTableData | undefined => {
  const [dynamicTableData, dispatch] = useReducer(dynamicTableDataReducer, {});
  useEffect(() => {
    let canceled = false;
    const load = async () => {
      dispatch({ type: "clear" });
      if (!group) return;
      if (!nwbFile) return;
      const colnames = group.attrs["colnames"] as string[];
      if (!colnames) return;
      for (const colname of colnames) {
        const data = await nwbFile.getDatasetData(
          group.path + "/" + colname,
          {},
        );
        if (canceled) return;
        if (data && Array.isArray(data)) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          dispatch({ type: "set-column-data", colname, data: data as any });
        }
        // check if it's a typed array
        else if (data && data.buffer && data.buffer instanceof ArrayBuffer) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          dispatch({
            type: "set-column-data",
            colname,
            data: Array.from(data),
          });
        }
      }
    };
    load();
    return () => {
      canceled = true;
    };
  }, [group, nwbFile]);
  if (!group) {
    return undefined;
  }
  return dynamicTableData;
};
