from dataclasses import dataclass, field
from typing import List, Optional, Dict

@dataclass
class VideoVariant:
    url: str
    type: str
    resolution: Optional[str] = None
    bitrate_bps: Optional[int] = None
    frame_rate: Optional[float] = None
    codec: Optional[str] = None
    duration_seconds: Optional[float] = None
    estimated_size_bytes: Optional[int] = None
    download_url: Optional[str] = None

@dataclass
class VideoSource:
    source_url: str
    type: str
    drm: Optional[str] = None
    variants: List[VideoVariant] = field(default_factory=list)
    notes: Optional[str] = None

@dataclass
class VideoExtractionResult:
    url: str
    sources: List[VideoSource] = field(default_factory=list)
    metadata: Dict[str, str] = field(default_factory=dict)
