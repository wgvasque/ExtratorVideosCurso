"""Setup script para extrator_videos"""
from setuptools import setup, find_packages
from pathlib import Path

# Ler README para long_description
readme_file = Path(__file__).parent / "README.md"
long_description = readme_file.read_text(encoding="utf-8") if readme_file.exists() else ""

# Ler requirements.txt
requirements_file = Path(__file__).parent / "requirements.txt"
requirements = []
if requirements_file.exists():
    requirements = [
        line.strip()
        for line in requirements_file.read_text(encoding="utf-8").split("\n")
        if line.strip() and not line.startswith("#")
    ]

setup(
    name="extrator-videos",
    version="1.0.0",
    author="ExtratorVideosCurso",
    description="Sistema de extração, transcrição e resumo de vídeos educacionais",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://github.com/seu-usuario/ExtratorVideosCurso",
    packages=find_packages(exclude=["tests", "tests.*", "*.tests", "*.tests.*"]),
    classifiers=[
        "Development Status :: 4 - Beta",
        "Intended Audience :: Education",
        "Topic :: Education",
        "Topic :: Multimedia :: Video",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
    ],
    python_requires=">=3.8",
    install_requires=requirements,
    extras_require={
        "dev": [
            "pytest>=7.4.0",
            "pytest-cov>=4.1.0",
            "flake8>=6.1.0",
            "black>=23.9.0",
            "mypy>=1.6.0",
        ],
        "web": [
            "flask>=3.0.0",
            "flask-socketio>=5.3.5",
            "eventlet>=0.33.3",
        ],
    },
    entry_points={
        "console_scripts": [
            "extrator-videos=extrator_videos.cli:main",
            "extrator-transcribe=extrator_videos.transcribe_cli:main",
            "extrator-batch=extrator_videos.batch_cli:main",
        ],
    },
    include_package_data=True,
    zip_safe=False,
)

