from setuptools import setup, find_packages

setup(
    name="dandiset_001256_interface",
    version="0.1.0",
    packages=find_packages(),
    install_requires=[
        "lindi",
        "pynwb"
    ],
    description="A Python package for interfacing with dandiset 001256",
    author="Jeremy Magland",
)
