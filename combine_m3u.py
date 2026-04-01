import requests

# Kaynak M3U linklerin
urls = [
    "https://cutt.ly/GtYU85cD",
    "https://cutt.ly/moonflix"
]

def main():
    combined_content = "#EXTM3U\n"
    
    for url in urls:
        try:
            response = requests.get(url, timeout=10)
            if response.status_code == 200:
                # Başlık satırını (#EXTM3U) atlayıp içeriği alıyoruz
                lines = response.text.splitlines()
                if lines and "#EXTM3U" in lines[0]:
                    combined_content += "\n".join(lines[1:]) + "\n"
        except Exception as e:
            print(f"Hata oluştu: {url} - {e}")

    # Çıktı dosyasını kaydet
    with open("playlist.m3u", "w", encoding="utf-8") as f:
        f.write(combined_content)

if __name__ == "__main__":
    main()
