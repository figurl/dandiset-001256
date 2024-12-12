"""
system hash: 690fbcc140f83b0896fcb2ba5a53ac8c3a452668

You are going to create a bunch of plot images, upload to the server, and create a file ./genie_output/index.md that links to the images.

Start by removing ./genie_output/index.md and creating the ./genie_output directory if needed.

The files uploaded to the server will be as following

https://lindi.neurosift.org/tmp/dandi/dandiset-001256/genie/
    sessions/
        sub-AA0336_ses-20210623T170043/  # This is the session ID
            pupil_video_single_frame.png
            two_photon_video_single_frame.png
            average_pupil_response.png
            pupil_radius_acquisitions_aligned.png
            roi_responses_first_acquisition.png
        sub-AA0308_ses-20210414T173129/
            ...
        ...

The index.md will have some headings and links to the plots that are uploaded to the server

For each plot below, rather than showing the plot, create data for a .png, and upload to the appropriate location on the server.

The height of each plot should be 400 pixels and the width should be at most 600 pixels. So like this:
plt.figure(figsize=(6, 4))
But it should be square for the video frames, like this:
plt.figure(figsize=(6, 6))

Don't include any additional text in the markdown document (unless specified below) - the images should be self-explanatory.

Each plot image should have a relevant title, labels, etc, that sufficiently describes it.
Don't include the session ID or session path in the plot titles.

The main heading of the markdown should be "Dandiset 001256"

For each session in the Dandiset:
* Make a heading for the session, equal to the session ID.
* Plot a single frame of the pupil video
* Plot a single frame of the two-photon video
* Plot the average pupil response across all acquisitions.
* Plot all pupil radius acquisitions aligned to start time
* Plot the ROI responses for the first acquisition for all ROIs on the same plot.

Images should be side by side, not stacked. That means putting them in a div with display flex, as described in the system instructions. Use cache busting as shown with a short random string that is generated at the beginning of the script.

All images should be scaled to have a width of 300 pixels, while maintaining the aspect ratio.

Print the progress to the console, so the user knows what is happening.

At the end of every session, write the index.md, so the user may see the progress.

Important: some of the pupil_radius_xxx arrays for certain acquisitions may be missing. Use a try/except block to catch the error and continue to the next acquisition.

Important: the roi response series has different timestamps for different acquisitions within the same session.

Important: Do not show legends on the plots that involve multiple ROIs or multiple acquisitions. It's too cluttered.

"""

import os
import numpy as np
import matplotlib.pyplot as plt
from dandiset_001256_interface import load_session, get_dandiset_info
from helpers.upload_file import upload_file_data
from io import BytesIO
import random
import string

# Generate a cache buster string
def generate_cache_buster(length=5):
    return ''.join(random.choices(string.ascii_lowercase + string.digits, k=length))

# Function to upload a figure to the server
def upload_figure(fig, url):
    buf = BytesIO()
    fig.savefig(buf, format="png", bbox_inches='tight', pad_inches=0)
    buf.seek(0)
    binary_data = buf.read()
    upload_file_data(url, binary_data)

# Prepare directories and index file
output_dir = "./genie_output"
index_path = os.path.join(output_dir, "index.md")
if os.path.exists(index_path):
    os.remove(index_path)
if not os.path.exists(output_dir):
    os.makedirs(output_dir)

# Fetch information about the Dandiset and its sessions
info = get_dandiset_info()
sessions = info['sessions']

# Create the main heading for the index file
with open(index_path, 'a') as md_file:
    md_file.write("# Dandiset 001256\n\n")

# Iterate through each session
for session in sessions:
    session_id = session['session_id']
    print(f"Processing session: {session_id}")

    nwb_url = session['asset_url']
    S = load_session(nwb_url=nwb_url)

    acquisition_names = S.get_acquisition_names()

    # Prepare paths and headings
    session_path = f"dandi/dandiset-001256/genie/sessions/{session_id}"
    session_heading = f"## {session_id}\n\n"
    
    with open(index_path, 'a') as md_file:
        md_file.write(session_heading)

    # Create plots and upload them
    plot_urls = []
    
    # Plot a single frame of the pupil video
    try:
        pupil_video = S.get_pupil_video("000")
        frame = pupil_video.get_frame(10)
        plt.figure(figsize=(6, 6))
        plt.imshow(frame, cmap='gray')
        plt.title("Pupil Video Frame")
        plt.axis('off')
        cache_buster = generate_cache_buster()
        pupil_video_url = f"https://lindi.neurosift.org/tmp/{session_path}/pupil_video_single_frame.png?cb={cache_buster}"
        plot_urls.append(pupil_video_url)
        upload_figure(plt, pupil_video_url)
        plt.clf()

        # Plot a single frame of the two-photon video
        two_photon_series = S.get_two_photon_series("000")
        frame = two_photon_series.get_frame(10)
        plt.figure(figsize=(6, 6))
        plt.imshow(frame, cmap='gray')
        plt.title("Two-photon Video Frame")
        plt.axis('off')
        cache_buster = generate_cache_buster()
        two_photon_url = f"https://lindi.neurosift.org/tmp/{session_path}/two_photon_video_single_frame.png?cb={cache_buster}"
        plot_urls.append(two_photon_url)
        upload_figure(plt, two_photon_url)
        plt.clf()

        # Plot the average pupil response across all acquisitions
        pupil_radius_data = []
        first_timestamps = None
        for acq_name in acquisition_names:
            try:
                pupil_radius = S.get_pupil_radius(acq_name)
                if first_timestamps is None:
                    first_timestamps = pupil_radius.get_timestamps()
                pupil_radius_data.append(np.interp(first_timestamps, pupil_radius.get_timestamps() - pupil_radius.starting_time, pupil_radius.get_data()))
            except Exception as e:
                continue
                
        pupil_radius_data = np.array(pupil_radius_data)
        mean_pupil_radius = np.nanmean(pupil_radius_data, axis=0)
        plt.figure(figsize=(6, 4))
        plt.plot(first_timestamps - first_timestamps[0], mean_pupil_radius)
        plt.title("Average Pupil Response")
        plt.xlabel("Time (sec)")
        plt.ylabel("Pupil Radius (pixels)")
        plt.grid(axis='x')
        cache_buster = generate_cache_buster()
        average_pupil_url = f"https://lindi.neurosift.org/tmp/{session_path}/average_pupil_response.png?cb={cache_buster}"
        plot_urls.append(average_pupil_url)
        upload_figure(plt, average_pupil_url)
        plt.clf()

        # Plot all pupil radius acquisitions aligned to start time
        plt.figure(figsize=(6, 4))
        for acq_name in acquisition_names:
            try:
                pupil_radius = S.get_pupil_radius(acq_name)
                plt.plot(pupil_radius.get_timestamps() - pupil_radius.starting_time, pupil_radius.get_data())
            except Exception as e:
                continue
        plt.title("Pupil Radius Aligned to Start Time")
        plt.xlabel("Time (sec)")
        plt.ylabel("Pupil Radius (pixels)")
        plt.grid(axis='x')
        cache_buster = generate_cache_buster()
        pupil_radius_aligned_url = f"https://lindi.neurosift.org/tmp/{session_path}/pupil_radius_acquisitions_aligned.png?cb={cache_buster}"
        plot_urls.append(pupil_radius_aligned_url)
        upload_figure(plt, pupil_radius_aligned_url)
        plt.clf()

        # Plot the ROI responses for the first acquisition
        roi_response_series = S.get_roi_response_series(acquisition_names[0])
        timestamps = roi_response_series.get_timestamps() - roi_response_series.starting_time
        roi_data = roi_response_series.get_data()
        plt.figure(figsize=(6, 4))
        for roi_index in range(roi_data.shape[1]):
            plt.plot(timestamps, roi_data[:, roi_index])
        plt.title("ROI Responses First Acquisition")
        plt.xlabel("Time (sec)")
        plt.ylabel("Fluorescence Intensity")
        cache_buster = generate_cache_buster()
        roi_response_url = f"https://lindi.neurosift.org/tmp/{session_path}/roi_responses_first_acquisition.png?cb={cache_buster}"
        plot_urls.append(roi_response_url)
        upload_figure(plt, roi_response_url)
        plt.clf()
        
    except Exception as e:
        print(f"Error processing session {session_id}: {e}")

    # Write the URLs to the markdown file
    with open(index_path, 'a') as md_file:
        md_file.write("<div style=\"display: flex; justify-content: space-between;\">\n")
        for url in plot_urls:
            md_file.write(f"  <img src=\"{url}\" alt=\"Image\" width=\"300\" />\n")
        md_file.write("</div>\n\n")

print("Processing complete.")