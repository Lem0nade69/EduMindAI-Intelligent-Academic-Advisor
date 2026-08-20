import requests
from bs4 import BeautifulSoup
import pandas as pd
import re
import time

BASE_URL = "https://www.mobiledokan.co/official-mobile-phones/"
TARGET = 2500
OUTPUT_FILE = "mobiledokan_official_phones.csv"

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/139.0.0.0 Safari/537.36"
    )
}

session = requests.Session()
session.headers.update(HEADERS)


# ---------------------------------------------------------
# GET PAGE
# ---------------------------------------------------------

def get_page(url):

    try:
        response = session.get(
            url,
            timeout=30
        )

        print("Status:", response.status_code)

        if response.status_code == 200:
            return response.text

    except requests.RequestException as e:
        print("Request Error:", e)

    return None


# ---------------------------------------------------------
# CLEAN TEXT
# ---------------------------------------------------------

def clean(text):

    if not text:
        return ""

    return re.sub(
        r"\s+",
        " ",
        text
    ).strip()


# ---------------------------------------------------------
# GET BRAND
# ---------------------------------------------------------

def get_brand(model):

    brands = [
        "Samsung",
        "Apple",
        "Xiaomi",
        "Redmi",
        "POCO",
        "Realme",
        "Oppo",
        "Vivo",
        "OnePlus",
        "Huawei",
        "Honor",
        "Google",
        "Motorola",
        "Nokia",
        "Tecno",
        "Infinix",
        "Itel",
        "Walton",
        "Symphony",
        "Asus",
        "Sony",
        "ZTE",
        "Nubia",
        "Lenovo",
        "Nothing",
        "HTC",
        "LG",
        "Meizu",
        "Lava",
        "Blackview",
        "Ulefone",
        "Umidigi",
        "Doogee",
        "Oukitel",
        "Microsoft",
        "TCL",
        "Sharp",
        "Wiko",
        "Fairphone",
        "Cat",
        "iQOO"
    ]

    model_lower = model.lower()

    # Longest brand names first
    brands.sort(
        key=len,
        reverse=True
    )

    for brand in brands:

        if model_lower.startswith(
            brand.lower()
        ):
            return brand

    # Fallback
    words = model.split()

    if words:
        return words[0]

    return ""


# ---------------------------------------------------------
# EXTRACT PRICE
# ---------------------------------------------------------

def get_price(text):

    # Examples:
    # ৳19,999
    # Tk 19,999
    # 19,999 BDT

    patterns = [

        r"৳\s*([\d,]+(?:\.\d+)?)",

        r"Tk\.?\s*([\d,]+(?:\.\d+)?)",

        r"BDT\s*([\d,]+(?:\.\d+)?)",

        r"Price\s*:?\s*৳?\s*([\d,]+(?:\.\d+)?)"

    ]

    for pattern in patterns:

        match = re.search(
            pattern,
            text,
            re.I
        )

        if match:
            return match.group(1)

    return ""


# ---------------------------------------------------------
# SCRAPE ONE PAGE
# ---------------------------------------------------------

def scrape_page(url):

    html = get_page(url)

    if not html:
        return []

    soup = BeautifulSoup(
        html,
        "html.parser"
    )

    data = []

    # -----------------------------------------------------
    # Find product headings
    # -----------------------------------------------------

    headings = soup.find_all(
        ["h2", "h3"]
    )

    for heading in headings:

        model = clean(
            heading.get_text(
                " ",
                strip=True
            )
        )

        if not model:
            continue

        # Ignore common page headings
        ignored = [
            "official mobile phones",
            "mobile phones",
            "latest mobile phones",
            "smartphones"
        ]

        if model.lower() in ignored:
            continue

        # -------------------------------------------------
        # Find product container
        # -------------------------------------------------

        container = (
            heading.find_parent(
                class_=re.compile(
                    r"product|post|item|card",
                    re.I
                )
            )
            or heading.parent
        )

        if not container:
            continue

        container_text = clean(
            container.get_text(
                " ",
                strip=True
            )
        )

        # -------------------------------------------------
        # PRICE
        # -------------------------------------------------

        price = get_price(
            container_text
        )

        if not price:

            # Try nearby parent
            parent = container.parent

            if parent:

                parent_text = clean(
                    parent.get_text(
                        " ",
                        strip=True
                    )
                )

                price = get_price(
                    parent_text
                )

        # Skip if no price
        if not price:
            continue

        # -------------------------------------------------
        # BRAND
        # -------------------------------------------------

        brand = get_brand(
            model
        )

        # -------------------------------------------------
        # ADD DATA
        # -------------------------------------------------

        data.append({
            "brand": brand,
            "model": model,
            "price": price
        })

    return data


# ---------------------------------------------------------
# MAIN
# ---------------------------------------------------------

def main():

    print("=" * 70)
    print("MobileDokan Official Phone Scraper")
    print("Target:", TARGET)
    print("=" * 70)

    all_data = []

    seen = set()

    # -----------------------------------------------------
    # PAGINATION
    # -----------------------------------------------------

    for page in range(1, 400):

        if len(all_data) >= TARGET:
            break

        if page == 1:

            url = BASE_URL

        else:

            url = (
                BASE_URL
                + "page/"
                + str(page)
                + "/"
            )

        print("\n" + "-" * 70)
        print("Page:", page)
        print("URL:", url)

        page_data = scrape_page(
            url
        )

        print(
            "Found on page:",
            len(page_data)
        )

        new_count = 0

        for item in page_data:

            # Duplicate key
            key = (
                item["brand"].lower(),
                item["model"].lower()
            )

            if key in seen:
                continue

            seen.add(key)

            all_data.append(
                item
            )

            new_count += 1

            if len(all_data) >= TARGET:
                break

        print(
            "New records:",
            new_count
        )

        print(
            "Total records:",
            len(all_data)
        )

        # -------------------------------------------------
        # SAVE PROGRESS
        # -------------------------------------------------

        if (
            len(all_data) > 0
            and len(all_data) % 100 < new_count
        ):

            df = pd.DataFrame(
                all_data
            )

            df.to_csv(
                OUTPUT_FILE,
                index=False,
                encoding="utf-8-sig"
            )

            print(
                "Progress CSV saved:",
                len(df)
            )

        # Wait between requests
        time.sleep(1)

    # -----------------------------------------------------
    # FINAL CSV
    # -----------------------------------------------------

    df = pd.DataFrame(
        all_data
    )

    if not df.empty:

        df = df[
            [
                "brand",
                "model",
                "price"
            ]
        ]

        df = df.drop_duplicates()

        df = df.head(
            TARGET
        )

    df.to_csv(
        OUTPUT_FILE,
        index=False,
        encoding="utf-8-sig"
    )

    print("\n" + "=" * 70)
    print("DONE!")
    print("=" * 70)

    print(
        "Total records:",
        len(df)
    )

    print(
        "CSV file:",
        OUTPUT_FILE
    )

    print("\nFirst 20 records:")

    print(
        df.head(20).to_string(
            index=False
        )
    )


# ---------------------------------------------------------
# RUN
# ---------------------------------------------------------

if __name__ == "__main__":
    main()