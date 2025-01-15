<div class="acquisition-selector"></div>

<div class="ROI-selector"></div>

<div class="channel-separation-selector"></div>

<div class="motion-corrected-selector"></div>

---

<div class="roi-view"></div>

---

<div class="acquisition-timeseries-view"></div>

**Top plot**: Shows the pre-processed pupil diameter over time, derived from video of the animal's right eye. The diameter is obtained from a least squares circle fit to dots fitted to the pupil perimeter using a DeepLabCut convolutional neural network model.

**Bottom plot**: Displays the average raw fluorescence time series within the selected ROI(s) derived from the two-photon image series.

**Highlighting**: Sound stimulation is annotated with purple and yellow highlighting. Stimulation duration and labels are derived from the pulseNames, pulseSets, and stimDelay columns from the stim param table row corresponding to the selected acquisition (path in .nwb: `/stimulus/presentation/stim param table`)




---

<div class="acquisition-pupil-video-view"></div>

This video captures the pupil of the mouse's right eye. Use the range slider to adjust brightness and contrast. Use the arrows to step through frames.

---

<div class="acquisition-two-photon-series-view"></div>

Two-photon image series that records calcium activity in the primary auditory cortex.

---

<!-- [Open chat for this session](https://figurl.github.io/dandiset-001256/?p=/chat&nwbUrl={{ nwbUrl }}&nwbPath={{ nwbPath }}) -->
