import requests
from bs4 import BeautifulSoup
from datetime import date

def scrape_science_direct(query, max_results=5):
    base_url = "https://www.sciencedirect.com"
    search_url = f"{base_url}/search"
    
    # Example query params – might change as ScienceDirect updates
    params = {
        'qs': query,  # the search term
        'show': max_results,
    }

    headers = {
        "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
                      "(KHTML, like Gecko) Chrome/91.0.4472.77 Safari/537.36"
    }

    resp = requests.get(search_url, params=params, headers=headers)

    print(resp.status_code)
    if resp.status_code != 200:
        print(f"Error fetching page: HTTP {resp.status_code}")
        return []

    soup = BeautifulSoup(resp.text, "html.parser")

    div = soup.find("div", {"class": "result-item-content"})
    if not div:
        return None  # snippet not found or invalid HTML

    # 1. Article type (e.g., "Research article")
    article_type_tag = div.find("span", {"class": "article-type"})
    article_type = article_type_tag.get_text(strip=True) if article_type_tag else "N/A"

    # 2. Title + relative URL
    title_link = div.find("a", {"class": "result-list-title-link"})
    if not title_link:
        return None
    title = title_link.get_text(strip=True)
    relative_url = title_link.get("href", "")
    # Build the full URL
    article_url = base_url + relative_url

    # 3. Publication date
    sub_type_div = div.find("div", {"class": "SubType"})
    if sub_type_div:
        # The date often appears as last text node under "span.srctitle-date-fields"
        date_span = sub_type_div.select_one("span.srctitle-date-fields")
        # Typically, the date is the last text node (e.g. "December 2024")
        # We can do something like this:
        pub_date = date_span.contents[-1].strip() if date_span and date_span.contents else "N/A"
    else:
        pub_date = "N/A"

    # 4. Authors
    authors = []
    authors_list = div.find("ol", {"class": "Authors"})
    if authors_list:
        author_items = authors_list.find_all("li")
        for item in author_items:
            name_tag = item.find("span", {"class": "author"})
            if name_tag:
                authors.append(name_tag.get_text(strip=True))

    # 5. PDF URL
    pdf_link = div.find("a", {"class": "download-link"})
    if pdf_link:
        pdf_url = base_url + pdf_link.get("href", "")
    else:
        pdf_url = None

    # Return a standardized dictionary
    paper_info = {
        "title": title,
        "article_type": article_type,
        "publication_date": pub_date,
        "authors": authors,
        "url": article_url,
        "pdf_url": pdf_url,
        "source": "ScienceDirect (Scraped)",
    }
    return paper_info


# Example usage
if __name__ == "__main__":
    query = "cardiology"
    scraped_papers = scrape_science_direct(query, max_results=5)
    for p in scraped_papers:
        print(p)
