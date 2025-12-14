from faster_whisper import WhisperModel
import os

def transcribe_audio(path: str, language: str = "pt"):
    m = os.getenv("WHISPER_MODEL") or "small"
    dev = os.getenv("WHISPER_DEVICE") or "cpu"
    ct = os.getenv("WHISPER_COMPUTE_TYPE") or "int8"
    dr = os.getenv("WHISPER_DOWNLOAD_ROOT") or None
    try:
        model = WhisperModel(m, device=dev, compute_type=ct, download_root=dr)
    except Exception:
        model = WhisperModel(m, device="cpu", compute_type="int8")
    segments, info = model.transcribe(path, language=language, vad_filter=True, word_timestamps=True)
    out = []
    for s in segments:
        out.append({
            "start": s.start,
            "end": s.end,
            "text": s.text,
        })
    return {
        "language": info.language,
        "duration": info.duration,
        "segments": out,
    }
