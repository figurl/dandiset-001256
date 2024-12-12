import requests


def get_dandiset_info():
    dandiset_id = '001256'
    dandiset_version = '0.241120.2150'
    url = f'https://api.dandiarchive.org/api/dandisets/{dandiset_id}/versions/{dandiset_version}/assets/?order=path&metadata=false'
    response = requests.get(url)
    if response.status_code != 200:
        raise ValueError(f'Failed to fetch {url}: {response.status_code} {response.reason}')

    results = response.json()['results']

    sessions = []
    for r in results:
        asset_id = r['asset_id']
        asset_url = f'https://api.dandiarchive.org/api/assets/{asset_id}/download/'
        sessions.append({
            'asset_path': r['path'],
            'asset_id': asset_id,
            'asset_url': asset_url,
            'session_id': _session_id_from_asset_path(r['path']),
        })

    return {
        'sessions': sessions
    }


def _session_id_from_asset_path(asset_path):
    # "sub-AA03008/sub-AA0308_ses-20210414T173129_behavior+image+ophys.nwb" -> "sub-AA0308_ses-20210414T173129"
    return '_'.join(asset_path.split('/')[1].split('_')[:2])
