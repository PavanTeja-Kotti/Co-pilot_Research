import datetime
import requests
import xmltodict
import json

def fetch_arxiv_papers(query, start_date=None, end_date=None, max_results=5):
    """
    Fetches papers from arXiv given a query string and optional date range.

    Parameters:
    -----------
    query : str
        The main search query for arXiv (e.g., "machine learning").
    start_date : datetime.date, optional
        The start date for filtering papers by submission date. 
        If None, no lower bound is applied.
    end_date : datetime.date, optional
        The end date for filtering papers by submission date. 
        If None, no upper bound is applied.
    max_results : int, optional
        How many results to fetch from the API (default is 5).

    Returns:
    --------
    list
        A list of dictionaries where each dictionary contains details about one paper.
    """

    results = []

    # Build the base search query
    # `all:{query}` means search for the query in title, abstract, and author fields
    search_query = f"all:{query}"

    # If both start_date and end_date are provided, add a date filter
    # arXiv's date format for filtering is YYYYMMDDHHmm. We typically set time to 000000 and 235959
    if start_date and end_date:
        # Convert dates to strings in the required format
        start_str = start_date.strftime("%Y%m%d000000")
        end_str = end_date.strftime("%Y%m%d235959")
        # Append date range filter
        search_query += f" AND submittedDate:[{start_str} TO {end_str}]"
    elif start_date and not end_date:
        # If only start_date is provided, use an open-ended range on the high side
        start_str = start_date.strftime("%Y%m%d000000")
        search_query += f" AND submittedDate:[{start_str} TO 999912312359]"
    elif end_date and not start_date:
        # If only end_date is provided, use an open-ended range on the low side
        end_str = end_date.strftime("%Y%m%d235959")
        search_query += f" AND submittedDate:[000001010000 TO {end_str}]"

    base_url = "http://export.arxiv.org/api/query"
    params = {
        "search_query": search_query,
        "start": 0,
        "max_results": max_results
    }

    resp = requests.get(base_url, params=params)
    if resp.status_code == 200:
        data = xmltodict.parse(resp.text)
        entries = data['feed'].get('entry', [])
        if isinstance(entries, dict):
            # If there's only one entry, it might not be a list
            entries = [entries]
        for entry in entries:
            title = entry.get('title', 'No Title')
            summary = entry.get('summary', 'No Abstract').strip()
            authors_raw = entry.get('author', [])
            # If there's only one author, it might not be a list
            if isinstance(authors_raw, dict):
                authors_raw = [authors_raw]
            authors = [auth.get('name', 'Unknown') for auth in authors_raw]

            links = entry.get('link', [])
            if isinstance(links, dict):
                links = [links]

            pdf_link = None
            for link in links:
                if link.get('@type') == 'application/pdf':
                    pdf_link = link.get('@href')

            # arXiv categories
            categories = []
            if 'category' in entry:
                category_data = entry['category']
                # Could be a list or a dict
                if isinstance(category_data, list):
                    categories = [cat['@term'] for cat in category_data]
                elif isinstance(category_data, dict) and '@term' in category_data:
                    categories = [category_data['@term']]

            # Publication date
            published_str = entry.get('published', None)
            pub_date_obj = _safe_parse_arxiv_date(published_str)

            paper = {
                "title": title,
                "abstract": summary,
                "authors": authors,
                "source": "arXiv",
                "url": entry.get('id', ''),
                "pdf_url": pdf_link,
                "categories": categories,
                "publication_date": pub_date_obj.isoformat() if pub_date_obj else None
            }
            results.append(paper)

    return results

def _safe_parse_arxiv_date(date_str):
    try:
        return datetime.datetime.strptime(date_str, "%Y-%m-%dT%H:%M:%SZ").date()
    except:
        return datetime.date.today()


# Example usage:
if __name__ == "__main__":
    # For instance, search for "machine learning in echocardiogram" from Jan 1, 2023 to Jan 31, 2023
    start = datetime.date(2020, 1, 1)
    end = datetime.date(2023, 1, 31)
    papers = fetch_arxiv_papers("machine learning in echocardiogram", start_date=start, end_date=end, max_results=5)
    print(json.dumps(papers, indent=2))