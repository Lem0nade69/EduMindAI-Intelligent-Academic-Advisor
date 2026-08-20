import requests
from bs4 import BeautifulSoup
import pandas as pd
import re
import time

BASE = "https://www.mobiledokan.co/official-mobile-phones/"
TARGET = 2500
FILE = "mobiledokan_phones.csv"

headers = {
    "User-Agent": "Mozilla/5.0"
}

data = []
seen = set()

def brand(model):
    brands = [
        "Samsung","Apple","Xiaomi","Redmi","POCO","Realme",
        "Oppo","Vivo","OnePlus","Huawei","Honor","Google",
        "Motorola","Nokia","Tecno","Infinix","Itel","Walton",
        "Symphony","Asus","Sony","ZTE","Nubia","Lenovo",
        "Nothing","HTC","LG","Meizu","Lava","iQOO"
    ]

    for b in brands:
        if model.lower().startswith(b.lower()):
            return b

    return model.split()[0] if model else ""


for page in range(1, 400):

    if len(data) >= TARGET:
        break

    url = BASE if page == 1 else f"{BASE}page/{page}/"

    print("Page:", page)

    try:
        r = requests.get(
            url,
            headers=headers,
            timeout=20
        )

        soup = BeautifulSoup(
            r.text,
            "html.parser"
        )

        for h in soup.find_all(["h2", "h3"]):

            model = h.get_text(
                " ",
                strip=True
            )

            if not model:
                continue

            box = h.find_parent(
                class_=re.compile(
                    "product|post|item|card",
                    re.I
                )
            ) or h.parent

            text = box.get_text(
                " ",
                strip=True
            )

            price = re.search(
                r"(?:৳|Tk\.?|BDT)\s*([\d,]+)",
                text,
                re.I
            )

            if not price:
                continue

            price = price.group(1)

            key = model.lower()

            if key in seen:
                continue

            seen.add(key)

            data.append({
                "brand": brand(model),
                "model": model,
                "price": price
            })

            if len(data) >= TARGET:
                break

        print("Total:", len(data))

        time.sleep(1)

    except Exception as e:
        print("Error:", e)


df = pd.DataFrame(data)

df.to_csv(
    FILE,
    index=False,
    encoding="utf-8-sig"
)

print("\nDONE!")
print("Total records:", len(df))
print("CSV:", FILE)

print(df.head(10))