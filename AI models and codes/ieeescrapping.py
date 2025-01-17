from playwright.sync_api import sync_playwright
from bs4 import BeautifulSoup
import time

def scrape_ieee(query, max_results=5):
    base_url = "https://ieeexplore.ieee.org"
    search_url = f"{base_url}/search/searchresult.jsp?newsearch=true&queryText={query}"

    results = []

    with sync_playwright() as p:
        # Launch a headless browser
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        
        # Go to the search results page
        page.goto(search_url, timeout=60000)

        # Wait a bit for JavaScript to load results
        # Increase this if your internet is slow or the site is busy
        time.sleep(3)
        
        # Optionally, wait for a specific selector (e.g., the search results container)
        page.wait_for_selector("div.List-results-items")
        
        # Now get the rendered HTML
        html_content = page.content()
        browser.close()

    # Parse with BeautifulSoup
    soup = BeautifulSoup(html_content, "html.parser")
    print(soup)

    # Each result might appear as a <div class="List-results-items"> or 
    # <div class="List-results-items"> containing multiple <div class="List-results-item">
    page.wait_for_selector("div.List-results-items", timeout=30000)

    items = soup.select("div.List-results-items > div.List-results-item")

    for idx, item in enumerate(items, start=1):
        if idx > max_results:
            break
        
        # Extract Title
        title_tag = item.select_one("h2.result-item-title > a")
        title = title_tag.get_text(strip=True) if title_tag else "No Title"
        link = title_tag["href"] if title_tag else ""
        full_link = base_url + link  # Combine with base URL
        
        # Extract authors, if present (authors can appear in multiple ways on IEEE Xplore)
        authors = []
        authors_block = item.select_one("p.author")
        if authors_block:
            # E.g.: "G. Brown; E. Moore; T. Davis"
            authors_text = authors_block.get_text(strip=True)
            # If you want a list:
            authors = [auth.strip() for auth in authors_text.split(";")]

        # Extract abstract snippet or publication info, if available
        abstract_snippet = ""
        abstract_block = item.select_one("div.description")
        if abstract_block:
            abstract_snippet = abstract_block.get_text(strip=True)
        
        # Build a data dictionary
        paper_data = {
            "title": title,
            "url": full_link,
            "authors": authors,
            "abstract_snippet": abstract_snippet,
            "source": "IEEE Xplore (Scraped)"
        }
        results.append(paper_data)

    return results

# Usage Example
if __name__ == "__main__":
    scraped_data = scrape_ieee("cardiology", max_results=5)
    for idx, item in enumerate(scraped_data, start=1):
        print(f"{idx}. {item['title']}")
        print(f"   Link: {item['url']}")
        print(f"   Authors: {item['authors']}")
        print(f"   Abstract snippet: {item['abstract_snippet'][:80]}...")
        print("------------------------------------------------------")
