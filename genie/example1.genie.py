"""
system hash: 6f84b1dc8a44e3d07bdc6b8735601f95c358bc4d

You are going to create a genie_output directory. First clear the directory.

The directory will have the following contents:

index.md
sessions/
    session_id/
        001.png
        002.png
        ...
    session_id/
        001.png
        002.png
        ...

For a session path of sub-AA0336/sub-AA0336_ses-20210623T170043_behavior+image+ophys.nwb, the session ID would be sub-AA0336_ses-20210623T170043.

The index.md will have some headings and links to the plots in the sessions directory, as described below.

For each plot below, rather than showing the plot, write it to a .png. They should be written to .png files as approprate.

Don't include any additional text in the markdown document (unless specified below) - the images should be self-explanatory.

Each plot image should have a relevant title, labels, etc, that sufficiently describes it.
Don't include the session ID or session path in the plot titles.

The main heading is "Dandiset 001256"

For each session in the Dandiset:
* Make a heading for the session, equal to the session ID.
* Plot a single frame of the pupil video
* Plot a single frame of the two-photon video
* Plot the average pupil response across all acquisitions.
* Plot all pupil radius acquisitions aligned to start time
* Plot the ROI responses for the first acquisition for all ROIs on the same plot.

Print the progress to the console, so the user knows what is happening.

At the end of every session, write the index.md, so the user may see the progress.

Note: some of the pupil_radius_xxx arrays for certain acquisitions may be missing. Use a try/except block to catch the error and continue to the next acquisition.

Note: the roi response series has different timestamps for different acquisitions within the same session.


"""

import os
import numpy as np
import matplotlib.pyplot as plt
from dandiset_001256_interface import load_session, get_dandiset_info

def ensure_dir(directory):
    if not os.path.exists(directory):
        os.makedirs(directory)

def generate_plots_for_session(session_id, nwb_url, output_dir):
    print(f"Generating plots for session {session_id}...")
    
    session_output_dir = os.path.join(output_dir, session_id)
    ensure_dir(session_output_dir)

    S = load_session(nwb_url=nwb_url)

    try:
        pupil_video = S.get_pupil_video("000")
        frame_index = 10
        frame = pupil_video.get_frame(frame_index)
        plt.imshow(frame, cmap='gray')
        plt.axis('off')
        plt.title("Pupil Video Frame at Index 10")
        plt.savefig(os.path.join(session_output_dir, "001.png"))
        plt.close()
    except Exception as e:
        print(f"Error in pupil video plot for session {session_id}: {e}")

    try:
        two_photon_series = S.get_two_photon_series("000")
        frame = two_photon_series.get_frame(frame_index)
        plt.imshow(frame, cmap='gray')
        plt.axis('off')
        plt.title("Two-Photon Series Frame at Index 10")
        plt.savefig(os.path.join(session_output_dir, "002.png"))
        plt.close()
    except Exception as e:
        print(f"Error in two-photon video plot for session {session_id}: {e}")

    try:
        acquisition_names = S.get_acquisition_names()

        first_pupil_radius = S.get_pupil_radius(acquisition_names[0])
        first_timestamps = first_pupil_radius.get_timestamps()

        pupil_radius_data = []
        for acq_name in acquisition_names:
            pupil_radius = S.get_pupil_radius(acq_name)
            pupil_radius_data.append(np.interp(first_timestamps, pupil_radius.get_timestamps() - pupil_radius.starting_time, pupil_radius.get_data()))

        pupil_radius_data = np.array(pupil_radius_data)
        mean_pupil_radius = np.nanmean(pupil_radius_data, axis=0)

        plt.figure(figsize=(8, 6))
        plt.plot(first_timestamps - first_pupil_radius.starting_time, mean_pupil_radius)
        plt.xlabel("Time (sec)")
        plt.ylabel("Average pupil radius (pixels)")
        plt.title("Average Pupil Radius Across Acquisitions")
        plt.grid(axis='x')
        plt.savefig(os.path.join(session_output_dir, "003.png"))
        plt.close()

    except Exception as e:
        print(f"Error in average pupil radius plot for session {session_id}: {e}")

    try:
        plt.figure(figsize=(8, 6))
        for acq_name in acquisition_names:
            pupil_radius = S.get_pupil_radius(acq_name)
            plt.plot(pupil_radius.get_timestamps() - pupil_radius.starting_time, pupil_radius.get_data(), label=acq_name)

        plt.xlabel("Time (sec)")
        plt.ylabel("Pupil radius (pixels)")
        plt.title("All Pupil Radius Data Aligned to Start Time")
        plt.grid(axis='x')
        plt.savefig(os.path.join(session_output_dir, "004.png"))
        plt.close()

    except Exception as e:
        print(f"Error in pupil radius aligned plot for session {session_id}: {e}")

    try:
        roi_response_series = S.get_roi_response_series("000")
        timestamps = roi_response_series.get_timestamps() - roi_response_series.starting_time
        roi_data = roi_response_series.get_data()

        plt.figure(figsize=(8, 6))
        for roi in range(roi_data.shape[1]):
            plt.plot(timestamps, roi_data[:, roi], label=f"ROI {roi+1}")
        
        plt.xlabel("Time (sec)")
        plt.ylabel("Fluorescence Intensity")
        plt.title("ROI Responses for First Acquisition")
        plt.savefig(os.path.join(session_output_dir, "005.png"))
        plt.close()
        
    except Exception as e:
        print(f"Error in ROI response plot for session {session_id}: {e}")

def update_index_md(output_dir, sessions_info):
    index_path = os.path.join(output_dir, "index.md")
    with open(index_path, 'w') as index_md:
        index_md.write("# Dandiset 001256\n\n")
        for session in sessions_info:
            session_id = session['asset_path'].split('/')[-1].replace('.nwb', '')
            index_md.write(f"## {session_id}\n")
            index_md.write(f"- ![{session_id} pupil video](sessions/{session_id}/001.png)\n")
            index_md.write(f"- ![{session_id} two-photon video](sessions/{session_id}/002.png)\n")
            index_md.write(f"- ![{session_id} average pupil response](sessions/{session_id}/003.png)\n")
            index_md.write(f"- ![{session_id} all pupil radius aligned](sessions/{session_id}/004.png)\n")
            index_md.write(f"- ![{session_id} ROI responses](sessions/{session_id}/005.png)\n\n")

def main():
    output_dir = "genie_output"
    ensure_dir(output_dir)
    sessions_dir = os.path.join(output_dir, "sessions")
    ensure_dir(sessions_dir)

    # Clear the sessions directory
    if os.path.exists(sessions_dir):
        for session_folder in os.listdir(sessions_dir):
            session_folder_path = os.path.join(sessions_dir, session_folder)
            for file in os.listdir(session_folder_path):
                file_path = os.path.join(session_folder_path, file)
                os.remove(file_path)
            os.rmdir(session_folder_path)

    info = get_dandiset_info()
    sessions = info['sessions']

    # Process each session
    for session in sessions:
        session_id = session['asset_path'].split('/')[-1].replace('.nwb', '')
        nwb_url = session['asset_url']
        session_output_dir = os.path.join(sessions_dir, session_id)
        ensure_dir(session_output_dir)
        
        generate_plots_for_session(session_id, nwb_url, sessions_dir)
        update_index_md(output_dir, sessions)
        print(f"Finished processing session {session_id}.")

    print("All sessions processed.")

if __name__ == "__main__":
    main()