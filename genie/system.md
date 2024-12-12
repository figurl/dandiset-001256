# Uploading files to the server

To upload a file to https://lindi.neurosift.org/tmp/... use the following:

```bash
from helpers.upload_file import upload_file_data

... prepare binary_data ...

upload_file_data("https://lindi.neurosift.org/tmp/path/to/file.png", binary_data)
```

Note that the URL must start with `https://lindi.neurosift.org/tmp/`.

So if you have a matplotlib figure that you want to upload, you can use the following:

```python
import matplotlib.pyplot as plt
from helpers.upload_file import upload_file_data
from io import BytesIO

fig, ax = plt.subplots()
ax.plot([1, 2, 3], [1, 2, 3])
buf = BytesIO()
fig.savefig(buf, format="png", bbox_inches='tight', pad_inches=0) # it's good to remove padding
buf.seek(0)
binary_data = buf.read()
upload_file_data("https://lindi.neurosift.org/tmp/path/to/file.png", binary_data)
```


# Displaying images side by side

To make images float next to each other in GitHub-flavored Markdown (GFM), you can use inline HTML within your Markdown file. GFM supports a subset of HTML, which allows you to achieve a layout where images are displayed side by side.


```markdown
<div style="display: flex; justify-content: space-between;">
  <img src="image1_url.png?cb=xuhyb" alt="Image 1" width="400" />
  <img src="image2_url.png?cb=djsdfu" alt="Image 2" width="400" />
  <img src="image3_url.png?cb=asdfj" alt="Image 3" width="400" />
</div>
```

Here we use cb=xxx for cache busting. This is useful when you update the image and want to make sure the browser fetches the new version instead of using the cached one. You should use a short random string.
