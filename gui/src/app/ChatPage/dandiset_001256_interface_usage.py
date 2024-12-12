# %%
import numpy as np
from dandiset_001256_interface import load_session, get_dandiset_info

# %%

# Get all the sessions in the dandiset

info = get_dandiset_info()
sessions = info['sessions']
for session in sessions:
    nwb_url = session['asset_url']
    nwb_path = session['asset_path']
    session_id = session['session_id']
    print(f"Session: {session_id} - {nwb_url}")

# %%

# For the rest of the examples, we will be using one of the sessions from the dandiset
nwb_path = sessions[0]['asset_path']
nwb_url = sessions[0]['asset_url']
S = load_session(nwb_url=nwb_url)

# %%
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
# %%

# Here is the plot of all pupil radius data across all acquisitions, with the
# figure width set to 800 pixels and x ticks at 300-second intervals including x
# grid lines:

import numpy as np
import matplotlib.pyplot as plt
from dandiset_001256_interface import load_session

nwb_url = "https://api.dandiarchive.org/api/assets/ff8b39ad-ff59-4043-9bd1-9fec403cb51b/download/"
S = load_session(nwb_url=nwb_url)

acquisition_names = S.get_acquisition_names()

plt.figure(figsize=(8, 6))
for acq_name in acquisition_names:
    pupil_radius = S.get_pupil_radius(acq_name)
    plt.plot(pupil_radius.get_timestamps(), pupil_radius.get_data(), label=acq_name)

plt.xlabel("Time (sec)")
plt.ylabel("Pupil radius (pixels)")
plt.xticks(np.arange(0, max(pupil_radius.get_timestamps()), 300))
plt.grid(axis='x')
plt.show()
# %%

# Here is the plot of all pupil radius data aligned to start time, with the
# figure width set to 800 pixels and x ticks every 2 seconds:

import numpy as np
import matplotlib.pyplot as plt
from dandiset_001256_interface import load_session

nwb_url = "https://api.dandiarchive.org/api/assets/ff8b39ad-ff59-4043-9bd1-9fec403cb51b/download/"
S = load_session(nwb_url=nwb_url)

acquisition_names = S.get_acquisition_names()

plt.figure(figsize=(8, 6))
for acq_name in acquisition_names:
    pupil_radius = S.get_pupil_radius(acq_name)
    plt.plot(pupil_radius.get_timestamps() - pupil_radius.starting_time, pupil_radius.get_data(), label=acq_name)

plt.xlabel("Time (sec)")
plt.ylabel("Pupil radius (pixels)")
plt.xticks(np.arange(0, int(max(pupil_radius.get_timestamps() - pupil_radius.starting_time)), 2))
plt.grid(axis='x')
plt.show()
# %%

# Here is the plot of the ROI response series data for a particular ROI (ROI number 28) across all acquisitions

import numpy as np
import matplotlib.pyplot as plt
from dandiset_001256_interface import load_session

nwb_url = "https://api.dandiarchive.org/api/assets/ff8b39ad-ff59-4043-9bd1-9fec403cb51b/download/"
S = load_session(nwb_url=nwb_url)

acquisition_names = S.get_acquisition_names()
roi_number = 28

plt.figure(figsize=(8, 6))
for acq_name in acquisition_names:
    roi_response_series = S.get_roi_response_series(acq_name)
    timestamps = roi_response_series.get_timestamps() - roi_response_series.starting_time
    roi_data = roi_response_series.get_data()
    plt.plot(timestamps, roi_data[:, roi_number - 1], label=acq_name)

plt.xlabel("Time (sec)")
plt.ylabel("Fluorescence intensity")
# plt.legend() # don't show legend because there are too many acquisitions
plt.show()
# %%
# Here is a single frame from the two-photon series:

import matplotlib.pyplot as plt
from dandiset_001256_interface import load_session

nwb_url = "https://api.dandiarchive.org/api/assets/ff8b39ad-ff59-4043-9bd1-9fec403cb51b/download/"
S = load_session(nwb_url=nwb_url)

two_photon_series = S.get_two_photon_series("000")
frame_index = 10
frame = two_photon_series.get_frame(frame_index)
plt.imshow(frame, cmap='gray')
plt.axis('off')
plt.show()

# %%
# Here is a single frame from the pupil video

import numpy as np
import matplotlib.pyplot as plt
from dandiset_001256_interface import load_session

nwb_url = "https://api.dandiarchive.org/api/assets/ff8b39ad-ff59-4043-9bd1-9fec403cb51b/download/"
S = load_session(nwb_url=nwb_url)

pupil_video = S.get_pupil_video("000")
frame_index = 10
frame = pupil_video.get_frame(frame_index)
# Increase brightness by a factor of 1.5
brighter_frame = np.clip(np.round(frame * 1.5), 0, 255)
plt.imshow(brighter_frame, cmap='gray')
plt.axis('off')
plt.show()

# %%

# Here is a plot of the average pupil radius response.

import numpy as np
import matplotlib.pyplot as plt
from dandiset_001256_interface import load_session

nwb_url = "https://api.dandiarchive.org/api/assets/ff8b39ad-ff59-4043-9bd1-9fec403cb51b/download/"
S = load_session(nwb_url=nwb_url)

acquisition_names = S.get_acquisition_names()

first_pupil_radius = S.get_pupil_radius(acquisition_names[0])
first_timestamps = first_pupil_radius.get_timestamps()

# Interpolate all pupil radius data to the same timestamps
pupil_radius_data = []
for acq_name in acquisition_names:
    pupil_radius = S.get_pupil_radius(acq_name)
    pupil_radius_data.append(np.interp(first_timestamps, pupil_radius.get_timestamps() - pupil_radius.starting_time, pupil_radius.get_data()))

pupil_radius_data = np.array(pupil_radius_data)
# Compute the mean, but ignore NaN values
mean_pupil_radius = np.nanmean(pupil_radius_data, axis=0)

plt.figure(figsize=(8, 6))
plt.plot(first_timestamps - first_pupil_radius.starting_time, mean_pupil_radius)
plt.xlabel("Time (sec)")
plt.ylabel("Average pupil radius (pixels)")
plt.xticks(np.arange(0, max(first_timestamps - first_pupil_radius.starting_time), 2))
plt.grid(axis='x')
plt.show()

# %%

# Here is the plot of the average pupil radius response across all acquisitions

import numpy as np
import matplotlib.pyplot as plt
from dandiset_001256_interface import load_session

nwb_url = "https://api.dandiarchive.org/api/assets/ff8b39ad-ff59-4043-9bd1-9fec403cb51b/download/"
S = load_session(nwb_url=nwb_url)

acquisition_names = S.get_acquisition_names()

first_roi_response_series = S.get_roi_response_series(acquisition_names[0])
first_timestamps = first_roi_response_series.get_timestamps()

# interpolate all ROI response data to the same timestamps
roi_number = 28
roi_response_data = []
for acq_name in acquisition_names:
    roi_response_series = S.get_roi_response_series(acq_name)
    roi_data = roi_response_series.get_data()[:, roi_number - 1]
    roi_response_data.append(np.interp(first_timestamps, roi_response_series.get_timestamps() - roi_response_series.starting_time, roi_data))

roi_response_data = np.array(roi_response_data)
# Compute the mean, but ignore NaN values
mean_roi_response = np.nanmean(roi_response_data, axis=0)

plt.figure(figsize=(8, 6))
plt.plot(first_timestamps - first_roi_response_series.starting_time, mean_roi_response)
plt.xlabel("Time (sec)")
plt.ylabel("Average Fluorescence Intensity")
plt.xticks(np.arange(0, max(first_timestamps), 2))
plt.grid(axis='x')
plt.show()

# %%

# Here is the scatter plot of pupil radius at 5 seconds versus pupil radius at 2
# seconds, including the line ( y = x ) for reference

import numpy as np
import matplotlib.pyplot as plt
from dandiset_001256_interface import load_session

nwb_url = "https://api.dandiarchive.org/api/assets/ff8b39ad-ff59-4043-9bd1-9fec403cb51b/download/"
S = load_session(nwb_url=nwb_url)

acquisition_names = S.get_acquisition_names()

pupil_radius_at_2s = []
pupil_radius_at_5s = []

for acq_name in acquisition_names:
    pupil_radius = S.get_pupil_radius(acq_name)
    pupil_timestamps = pupil_radius.get_timestamps() - pupil_radius.starting_time
    pupil_data = pupil_radius.get_data()
    pupil_data_at_2s = np.interp(2.0, pupil_timestamps, pupil_data)
    pupil_data_at_5s = np.interp(5.0, pupil_timestamps, pupil_data)
    pupil_radius_at_2s.append(pupil_data_at_2s)
    pupil_radius_at_5s.append(pupil_data_at_5s)

plt.figure(figsize=(8, 6))
plt.scatter(pupil_radius_at_2s, pupil_radius_at_5s)
plt.xlabel("Pupil radius at 2 seconds (pixels)")
plt.ylabel("Pupil radius at 5 seconds (pixels)")
# Plot y=x line
max_radius = max(max(pupil_radius_at_2s), max(pupil_radius_at_5s))
plt.plot([0, max_radius], [0, max_radius], 'r--', label='y=x')
plt.legend()
plt.show()

# %% Here is the scatter plot of activation at 4.2 seconds versus pupil radius
# at 2 seconds, for ROI number 28.

import numpy as np
import matplotlib.pyplot as plt
from dandiset_001256_interface import load_session

nwb_url = "https://api.dandiarchive.org/api/assets/ff8b39ad-ff59-4043-9bd1-9fec403cb51b/download/"
S = load_session(nwb_url=nwb_url)

acquisition_names = S.get_acquisition_names()

roi_number = 28
activation_at_4_2s = []
pupil_radius_at_2s = []

for acq_name in acquisition_names:
    roi_response_series = S.get_roi_response_series(acq_name)
    timestamps = roi_response_series.get_timestamps() - roi_response_series.starting_time
    roi_data = roi_response_series.get_data()[:, roi_number - 1]
    data_at_4_2s = np.interp(4.2, timestamps, roi_data)
    activation_at_4_2s.append(data_at_4_2s)

    pupil_radius = S.get_pupil_radius(acq_name)
    pupil_timestamps = pupil_radius.get_timestamps() - pupil_radius.starting_time
    pupil_data_at_2s = np.interp(2.0, pupil_timestamps, pupil_radius.get_data())
    pupil_radius_at_2s.append(pupil_data_at_2s)

plt.figure(figsize=(8, 6))
plt.scatter(activation_at_4_2s, pupil_radius_at_2s)
plt.xlabel("Activation at 4.2 seconds")
plt.ylabel("Pupil radius at 2 seconds (pixels)")
plt.show()
