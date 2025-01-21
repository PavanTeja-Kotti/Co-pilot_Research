import asyncio
from crawl4ai import AsyncWebCrawler

async def fetch_research_papers(keyword):
    # Define the target URL for the IEEE search
    search_url = f"https://ieeexplore.ieee.org/search/searchresult.jsp?newsearch=true&queryText=cardiology"

    # Set up headers to mimic a real browser
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
    }

    async with AsyncWebCrawler(headers=headers) as crawler:
        try:
            # Fetch the page
            result = await crawler.arun(url=search_url)
            print(result)

            # Extract and display research paper data
            # Assuming `result` contains structured data
            # for item in result.extract("div.paper-item"):  # Adjust selector based on page structure
            #     title = item.extract_one("h3.title::text")
            #     authors = item.extract_one("p.authors::text")
            #     abstract = item.extract_one("p.abstract::text")
            #     pdf_url = item.extract_one("a.pdf-link::attr(href)")

            #     # Print the extracted paper information
            #     print("Title:", title)
            #     print("Authors:", authors)
            #     print("Abstract:", abstract)
            #     print("PDF URL:", pdf_url)
            #     print("-" * 50)

        except Exception as e:
            print("Error occurred while fetching research papers:", e)


if __name__ == "__main__":
    # Replace 'machine learning' with your desired search keyword
    asyncio.run(fetch_research_papers("machine learning"))
