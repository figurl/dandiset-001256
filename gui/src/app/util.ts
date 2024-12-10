export const getTwoPhotonSeriesPath = (
  acquisitionId: string,
  { motionCorrected }: { motionCorrected: boolean },
): string => {
  if (motionCorrected) {
    return `/processing/ophys/Motion Corrected TwoPhotonSeries/motion_corrected_TwoPhotonSeries_${acquisitionId}/corrected`;
  } else {
    return `/acquisition/TwoPhotonSeries_${acquisitionId}`;
  }
};
