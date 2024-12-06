from typing import List
import requests
import numpy as np
from pynwb import NWBHDF5IO
import lindi


class Session:
    def __init__(self, *, nwb_url: str):
        self.nwb_url = nwb_url

        lindi_url = _try_get_lindi_url(nwb_url, "001256")
        if lindi_url is not None:
            print("Loading from lindi")
            f = lindi.LindiH5pyFile.from_lindi_file(lindi_url)
        else:
            print("Loading from HDF5")
            f = lindi.LindiH5pyFile.from_hdf5_file(nwb_url)
        self.nwb = NWBHDF5IO(file=f, mode="r").read()

        self._acquisition_names: List[str] = []
        # Get the acquisition names from TwoPhotonSeries_000, TwoPhotonSeries_001, etc.
        for k in self.nwb.acquisition.keys():  # type: ignore
            if k.startswith("TwoPhotonSeries_"):
                p = k.split("_")
                if len(p) == 2:
                    self._acquisition_names.append(p[1])

    def get_acquisition_names(self):
        return [a for a in self._acquisition_names]

    def get_two_photon_series(self, acquisition_name: str):
        return ImageSeries(self.nwb.acquisition[f"TwoPhotonSeries_{acquisition_name}"])  # type: ignore

    def get_pupil_video(self, acquisition_name: str):
        return ImageSeries(self.nwb.processing["behavior"][f"pupil_video_{acquisition_name}"])  # type: ignore

    def get_pupil_radius(self, acquisition_name: str):
        return TimeSeries(self.nwb.processing["behavior"]["PupilTracking"][f"pupil_radius_{acquisition_name}"])  # type: ignore

    def get_num_rois(self):
        first_acquisition_name = self._acquisition_names[0]
        r = self.get_roi_response_series(first_acquisition_name)
        return r.num_channels

    def get_roi_response_series(self, acquisition_name: str):
        return MultichannelTimeSeries(self.nwb.processing["ophys"]["Fluorescence"][f"RoiResponseSeries_{acquisition_name}"])  # type: ignore


class ImageSeries:
    def __init__(self, obj):
        self.obj = obj
        self.starting_time = obj.starting_time
        self.rate = obj.rate
        self.num_frames = obj.data.shape[0]
        self.frame_shape = obj.data.shape[1:]

    def get_frame(self, i):
        return self.obj.data[i][:, :]

    def get_timestamps(self):
        return self.starting_time + np.arange(self.num_frames) / self.rate


class TimeSeries:
    def __init__(self, obj):
        self.obj = obj
        self.starting_time = obj.starting_time
        self.rate = obj.rate
        self.num_samples = obj.data.shape[0]

    def get_data(self):
        return self.obj.data[:]

    def get_timestamps(self):
        return self.starting_time + np.arange(self.num_samples) / self.rate


class MultichannelTimeSeries:
    def __init__(self, obj):
        self.obj = obj
        self.starting_time = obj.starting_time
        self.rate = obj.rate
        self.num_samples = obj.data.shape[0]
        self.num_channels = obj.data.shape[1]

    def get_data(self):
        return self.obj.data[:]

    def get_timestamps(self):
        return self.starting_time + np.arange(self.num_samples) / self.rate


_session_cache = {}


def load_session(*, nwb_url: str):
    if nwb_url in _session_cache:
        return _session_cache[nwb_url]
    S = Session(nwb_url=nwb_url)
    _session_cache[nwb_url] = S
    return S


def _try_get_lindi_url(nwb_url: str, dandiset_id: str):
    if nwb_url.endswith(".lindi.json") or nwb_url.endswith(".lindi.tar"):
        return nwb_url
    asset_id = None
    staging = None
    if nwb_url.startswith("https://api-staging.dandiarchive.org/api/assets/"):
        staging = True
        asset_id = nwb_url.split("/")[5]
    elif nwb_url.startswith("https://api-staging.dandiarchive.org/api/dandisets/"):
        staging = True
        dandiset_id = nwb_url.split("/")[5]
        index_of_assets_part = nwb_url.split("/").index("assets")
        if index_of_assets_part == -1:
            return None
        asset_id = nwb_url.split("/")[index_of_assets_part + 1]
    elif nwb_url.startswith("https://api.dandiarchive.org/api/assets/"):
        staging = False
        asset_id = nwb_url.split("/")[5]
    elif nwb_url.startswith("https://api.dandiarchive.org/api/dandisets/"):
        staging = False
        dandiset_id = nwb_url.split("/")[5]
        index_of_assets_part = nwb_url.split("/").index("assets")
        if index_of_assets_part == -1:
            return None
        asset_id = nwb_url.split("/")[index_of_assets_part + 1]
    else:
        return None
    if not dandiset_id:
        return None
    if not asset_id:
        return None
    aa = "dandi-staging" if staging else "dandi"
    try_url = f"https://lindi.neurosift.org/{aa}/dandisets/{dandiset_id}/assets/{asset_id}/nwb.lindi.json"
    file_exists = _check_url_exists(try_url)
    if file_exists:
        return try_url
    return None


def _check_url_exists(url: str):
    resp = requests.head(url)
    return resp.ok


def example_usage():
    # https://neurosift.app/?p=/nwb&url=https://api.dandiarchive.org/api/assets/ff8b39ad-ff59-4043-9bd1-9fec403cb51b/download/&dandisetId=001256&dandisetVersion=0.241120.2150
    nwb_url = "https://api.dandiarchive.org/api/assets/ff8b39ad-ff59-4043-9bd1-9fec403cb51b/download/"
    S = load_session(nwb_url=nwb_url)

    acquisition_names = S.get_acquisition_names()
    print(f"Number of acquisitions: {len(acquisition_names)}")
    print(f"Number of ROIs: {S.get_num_rois()}")
    print("")

    two_photon_series = S.get_two_photon_series("000")
    print("===== TWO PHOTON SERIES =====")
    print(f"Starting time (sec): {two_photon_series.starting_time}")
    print(f"Rate (Hz): {two_photon_series.rate}")
    print(f"Number of frames: {two_photon_series.num_frames}")
    print(f"Image size: {two_photon_series.frame_shape[0]} x {two_photon_series.frame_shape[1]}")
    print("")

    pupil_video = S.get_pupil_video("000")
    print("===== PUPIL VIDEO =====")
    print(f"Starting time (sec): {pupil_video.starting_time}")
    print(f"Rate (Hz): {pupil_video.rate}")
    print(f"Number of frames: {pupil_video.num_frames}")
    print(f"Image size: {pupil_video.frame_shape[0]} x {pupil_video.frame_shape[1]}")
    print("")

    pupil_radius = S.get_pupil_radius("000")
    print("===== PUPIL RADIUS =====")
    print(f"Starting time (sec): {pupil_radius.starting_time}")
    print(f"Rate (Hz): {pupil_radius.rate}")
    print(f"Number of samples: {pupil_radius.num_samples}")
    print("")

    roi_response_series = S.get_roi_response_series("000")
    print("===== ROI RESPONSE SERIES =====")
    print(f"Starting time (sec): {roi_response_series.starting_time}")
    print(f"Rate (Hz): {roi_response_series.rate}")
    print(f"Number of samples: {roi_response_series.num_samples}")
    print(f'Number of roi channels: {roi_response_series.num_channels}')
    print("")

    # To get the actual data:
    # two_photon_frame = two_photon_series.get_frame(0)  # shape: (height, width)
    # pupil_video_frame = pupil_video.get_frame(0)  # shape: (height, width)
    # pupil_radius_data = pupil_radius.get_data()  # shape: (num_samples,)
    # data = roi_response_series.get_data()  # shape: (num_samples, num_channels)

    # For convenience, to get the timestamps:
    # timestamps = two_photon_series.get_timestamps()  # shape: (num_frames,)
    # timestamps = pupil_video.get_timestamps()  # shape: (num_frames,)
    # timestamps = pupil_radius.get_timestamps()  # shape: (num_samples,)
    # timestamps = roi_response_series.get_timestamps()  # shape: (num_samples,)
