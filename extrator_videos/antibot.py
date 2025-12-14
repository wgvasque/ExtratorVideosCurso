import random

def context_args(proxy: str = None):
    ua = random.choice([
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
    ])
    args = {"user_agent": ua, "locale": "pt-BR", "timezone_id": "America/Sao_Paulo", "permissions": ["geolocation"], "color_scheme": "light"}
    if proxy:
        args["proxy"] = {"server": proxy}
    return args

def human_delay():
    import time
    time.sleep(random.uniform(0.3, 1.2))
