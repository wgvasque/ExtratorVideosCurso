__version__ = "1.0.0"

from .schema import VideoExtractionResult
from .cli import main as cli_main
from .extractor import extract
