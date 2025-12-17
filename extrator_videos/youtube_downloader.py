"""
Módulo para download de áudio de YouTube e outras plataformas usando yt-dlp
Suporta YouTube, Vimeo, e outros 1000+ sites
"""
import os
import tempfile
import re
from typing import Optional, Tuple

# Padrões de URL para detectar plataformas suportadas
YOUTUBE_PATTERNS = [
    r'(?:https?://)?(?:www\.)?youtube\.com/watch\?v=[\w-]+',
    r'(?:https?://)?(?:www\.)?youtube\.com/shorts/[\w-]+',
    r'(?:https?://)?youtu\.be/[\w-]+',
    r'(?:https?://)?(?:www\.)?youtube\.com/embed/[\w-]+',
]

SUPPORTED_PLATFORMS = [
    *YOUTUBE_PATTERNS,
    r'(?:https?://)?(?:www\.)?vimeo\.com/\d+',
    r'(?:https?://)?(?:www\.)?dailymotion\.com/video/[\w-]+',
    r'(?:https?://)?(?:www\.)?twitter\.com/.+/status/\d+',
    r'(?:https?://)?(?:www\.)?x\.com/.+/status/\d+',
    r'(?:https?://)?(?:www\.)?facebook\.com/.+/videos/',
    r'(?:https?://)?(?:www\.)?instagram\.com/(?:p|reel)/[\w-]+',
    r'(?:https?://)?(?:www\.)?tiktok\.com/',
]


def is_supported_platform(url: str) -> bool:
    """
    Verifica se a URL é de uma plataforma suportada pelo yt-dlp
    """
    for pattern in SUPPORTED_PLATFORMS:
        if re.search(pattern, url, re.IGNORECASE):
            return True
    return False


def is_youtube_url(url: str) -> bool:
    """
    Verifica se a URL é do YouTube
    """
    for pattern in YOUTUBE_PATTERNS:
        if re.search(pattern, url, re.IGNORECASE):
            return True
    return False


def download_audio_ytdlp(url: str, output_path: Optional[str] = None) -> Tuple[str, dict]:
    """
    Baixa áudio de uma URL usando yt-dlp e retorna caminho do arquivo WAV
    
    Args:
        url: URL do vídeo (YouTube, Vimeo, etc)
        output_path: Caminho opcional para o arquivo de saída
        
    Returns:
        Tuple[str, dict]: (caminho do arquivo WAV, metadados do vídeo)
        
    Raises:
        Exception: Se o download falhar
    """
    import yt_dlp
    
    # Gerar caminho de saída se não fornecido
    if not output_path:
        output_path = os.path.join(tempfile.gettempdir(), f"ytdlp_audio_{os.getpid()}.wav")
    
    # Caminho temporário para o áudio extraído (antes da conversão para WAV)
    temp_audio = os.path.join(tempfile.gettempdir(), f"ytdlp_temp_{os.getpid()}")
    
    # Configurações do yt-dlp para extrair apenas áudio
    ydl_opts = {
        'format': 'bestaudio/best',
        'outtmpl': temp_audio,
        'quiet': True,
        'no_warnings': True,
        'extract_flat': False,
        'postprocessors': [{
            'key': 'FFmpegExtractAudio',
            'preferredcodec': 'wav',
            'preferredquality': '192',
        }],
        # Configurações adicionais para robustez
        'retries': 3,
        'fragment_retries': 3,
        'ignoreerrors': False,
        'no_color': True,
    }
    
    metadata = {}
    
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            # Extrair informações primeiro
            info = ydl.extract_info(url, download=False)
            if info:
                metadata = {
                    'title': info.get('title', 'Unknown'),
                    'duration': info.get('duration'),
                    'uploader': info.get('uploader'),
                    'description': info.get('description', '')[:500],  # Limitar descrição
                    'view_count': info.get('view_count'),
                    'upload_date': info.get('upload_date'),
                    'platform': info.get('extractor', 'unknown'),
                }
            
            # Baixar o áudio
            ydl.download([url])
        
        # O yt-dlp adiciona extensão automaticamente
        # Procurar o arquivo gerado
        wav_file = temp_audio + ".wav"
        
        if os.path.exists(wav_file):
            # Converter para WAV 16kHz mono (formato esperado pelo Whisper)
            import subprocess
            final_wav = output_path
            cmd = [
                "ffmpeg", "-y", "-loglevel", "error",
                "-i", wav_file,
                "-vn", "-ac", "1", "-ar", "16000",
                final_wav
            ]
            subprocess.run(cmd, check=True)
            
            # Limpar arquivo temporário
            try:
                os.remove(wav_file)
            except:
                pass
            
            return final_wav, metadata
        else:
            # Procurar outros formatos que podem ter sido baixados
            for ext in ['.m4a', '.mp3', '.webm', '.opus', '.ogg']:
                alt_file = temp_audio + ext
                if os.path.exists(alt_file):
                    import subprocess
                    final_wav = output_path
                    cmd = [
                        "ffmpeg", "-y", "-loglevel", "error",
                        "-i", alt_file,
                        "-vn", "-ac", "1", "-ar", "16000",
                        final_wav
                    ]
                    subprocess.run(cmd, check=True)
                    
                    try:
                        os.remove(alt_file)
                    except:
                        pass
                    
                    return final_wav, metadata
            
            raise Exception(f"Arquivo de áudio não encontrado após download: {temp_audio}.*")
            
    except Exception as e:
        # Limpar arquivos temporários em caso de erro
        for ext in ['.wav', '.m4a', '.mp3', '.webm', '.opus', '.ogg', '']:
            try:
                f = temp_audio + ext
                if os.path.exists(f):
                    os.remove(f)
            except:
                pass
        raise Exception(f"Erro ao baixar áudio com yt-dlp: {e}")


def get_video_info(url: str) -> dict:
    """
    Obtém informações do vídeo sem baixar
    
    Args:
        url: URL do vídeo
        
    Returns:
        dict com informações do vídeo
    """
    import yt_dlp
    
    ydl_opts = {
        'quiet': True,
        'no_warnings': True,
        'extract_flat': False,
    }
    
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            if info:
                return {
                    'title': info.get('title', 'Unknown'),
                    'duration': info.get('duration'),
                    'uploader': info.get('uploader'),
                    'description': info.get('description', ''),
                    'view_count': info.get('view_count'),
                    'upload_date': info.get('upload_date'),
                    'platform': info.get('extractor', 'unknown'),
                    'thumbnail': info.get('thumbnail'),
                }
    except Exception as e:
        return {'error': str(e)}
    
    return {}
