import requests
from bs4 import BeautifulSoup
from langchain.embeddings.openai import OpenAIEmbeddings
from langchain.vectorstores import FAISS
from langchain.text_splitter import CharacterTextSplitter
from langchain.docstore.document import Document

# Initialize OpenAI embeddings
embeddings = OpenAIEmbeddings()

# Create a vector store for fast search
vector_store = FAISS.load_local("vector_store_index")  # Load or create an index


def search_ieee(query, api_key):
    """Search IEEE Xplore API"""
    url = f"https://ieeexploreapi.ieee.org/api/v1/search/articles?querytext={query}&apikey={api_key}"
    response = requests.get(url)
    return response.json().get("articles", [])


def search_sciencedirect(query, api_key):
    """Search ScienceDirect API"""
    url = f"https://api.elsevier.com/content/search/scidir?query={query}&apiKey={api_key}"
    response = requests.get(url)
    return response.json().get("search-results", {}).get("entry", [])


def search_arxiv(query):
    """Scrape Arxiv for research papers"""
    url = f"https://export.arxiv.org/api/query?search_query={query}"
    response = requests.get(url)
    soup = BeautifulSoup(response.content, "html.parser")
    papers = []
    for entry in soup.find_all("entry"):
        paper = {
            "title": entry.title.text.strip(),
            "summary": entry.summary.text.strip(),
            "authors": [author.find("name").text for author in entry.find_all("author")],
            "url": entry.id.text,
        }
        papers.append(paper)
    return papers


def query_sources(query):
    """Query multiple sources and combine results"""
    ieee_api_key = "YOUR_IEEE_API_KEY"
    scidir_api_key = "YOUR_SCIENCEDIRECT_API_KEY"

    ieee_results = search_ieee(query, ieee_api_key)
    scidir_results = search_sciencedirect(query, scidir_api_key)
    arxiv_results = search_arxiv(query)

    # Combine all results
    all_results = []

    for result in ieee_results:
        all_results.append({
            "title": result.get("title"),
            "abstract": result.get("abstract"),
            "authors": result.get("authors", []),
            "source": "IEEE",
            "url": result.get("html_url"),
        })

    for result in scidir_results:
        all_results.append({
            "title": result.get("dc:title"),
            "abstract": result.get("dc:description", ""),
            "authors": [author.get("$") for author in result.get("authors", {}).get("author", [])],
            "source": "ScienceDirect",
            "url": result.get("link", {}).get("@href"),
        })

    for result in arxiv_results:
        all_results.append({
            "title": result["title"],
            "abstract": result["summary"],
            "authors": result["authors"],
            "source": "Arxiv",
            "url": result["url"],
        })

    return all_results


def rank_results(query, results):
    """Rank results using embeddings and cosine similarity"""
    # Convert query to embedding
    query_embedding = embeddings.embed_query(query)

    # Convert documents to embeddings
    documents = [
        Document(page_content=doc["abstract"], metadata=doc) for doc in results
    ]
    vector_store.add_documents(documents)
    vector_store.save_local("vector_store_index")  # Save index for reuse

    # Perform similarity search
    similar_docs = vector_store.similarity_search_with_score(query_embedding, k=10)

    # Extract and rank results
    ranked_results = []
    for doc, score in similar_docs:
        doc.metadata["score"] = score
        ranked_results.append(doc.metadata)
    return ranked_results


if __name__ == "__main__":
    user_query = input("Enter your search query: ")

    # Step 1: Query all sources
    papers = query_sources(user_query)

    # Step 2: Rank results
    ranked_papers = rank_results(user_query, papers)

    # Step 3: Display results
    for idx, paper in enumerate(ranked_papers, start=1):
        print(f"\n{idx}. {paper['title']}")
        print(f"   Source: {paper['source']}")
        print(f"   URL: {paper['url']}")
        print(f"   Authors: {', '.join(paper['authors'])}")
        print(f"   Abstract: {paper['abstract'][:300]}...")
