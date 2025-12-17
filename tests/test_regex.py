
import re

url_normal = "https://customer-59tox5ldd8eaq4uj.cloudflarestream.com/token/manifest/video.m3u8"
url_escaped = "https:\/\/customer-59tox5ldd8eaq4uj.cloudflarestream.com\/token\/manifest\/video.m3u8"

regex = r'https://[a-zA-Z0-9-]+\.cloudflarestream\.com/.+?/manifest/video\.m3u8'

print(f"Testing regex: {regex}")

match_normal = re.findall(regex, url_normal)
print(f"Match Normal: {match_normal}")

match_escaped = re.findall(regex, url_escaped)
print(f"Match Escaped: {match_escaped}")

# Improved regex for both
regex_improved = r'https?:\\?/\\?/[a-zA-Z0-9-]+\.cloudflarestream\.com\\?/.+?\\?/manifest\\?/video\.m3u8'
print(f"Testing Improved: {regex_improved}")

match_escaped_2 = re.findall(regex_improved, url_escaped)
print(f"Match Escaped Handled: {match_escaped_2}")
