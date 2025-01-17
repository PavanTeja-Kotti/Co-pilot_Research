import datetime
import requests
import xmltodict
import json
import numpy as np
import torch

# Sentence Transformers for semantic embeddings
# pip install sentence_transformers
from sentence_transformers import SentenceTransformer, util

###############################################################################
# Global Structures
###############################################################################

# Model for embedding abstracts (you might load this just once)
EMBEDDING_MODEL = SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')

# For simplicity, we store user data in a dictionary:
# user_id -> list of (paper_metadata, embedding_vector)
user_papers_db = {}

###############################################################################
# Data Fetching Functions
###############################################################################

def fetch_arxiv_papers(query, start_date=None, end_date=None, max_results=5):
    """
    Fetches papers from arXiv given a query string and optional date range,
    returning a list of dictionaries with metadata (title, abstract, etc.).
    """

    results = []
    search_query = f"all:{query}"

    # Handle date range if provided
    if start_date and end_date:
        start_str = start_date.strftime("%Y%m%d000000")
        end_str = end_date.strftime("%Y%m%d235959")
        search_query += f" AND submittedDate:[{start_str} TO {end_str}]"
    elif start_date and not end_date:
        start_str = start_date.strftime("%Y%m%d000000")
        search_query += f" AND submittedDate:[{start_str} TO 999912312359]"
    elif end_date and not start_date:
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

            categories = []
            if 'category' in entry:
                category_data = entry['category']
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

###############################################################################
# Embedding & Storage
###############################################################################

def store_user_papers(user_id, papers):
    """
    For each paper in `papers`, embed its abstract and store both metadata
    and embedding in the global 'user_papers_db' for that user.
    """
    if user_id not in user_papers_db:
        user_papers_db[user_id] = []

    abstracts = [paper["abstract"] for paper in papers]
    if not abstracts:
        return

    # Embed abstracts
    embeddings = EMBEDDING_MODEL.encode(abstracts, convert_to_tensor=True)

    # Store (paper_metadata, embedding_vector) for each paper
    for paper, embedding_vector in zip(papers, embeddings):
        user_papers_db[user_id].append((paper, embedding_vector))


###############################################################################
# Recommendation Function (Semantic)
###############################################################################

def recommend_papers_semantic(user_id, new_papers, top_n=5):
    """
    Rank new papers by semantic similarity to the user's stored papers.
    """
    # If the user has no stored papers/embeddings, just return the new papers.
    if user_id not in user_papers_db or len(user_papers_db[user_id]) == 0:
        return new_papers[:top_n]

    # 1) Embed the new papers
    new_abstracts = [p["abstract"] for p in new_papers]
    new_embeddings = EMBEDDING_MODEL.encode(new_abstracts, convert_to_tensor=True)
    # new_embeddings has shape [num_new_papers, embedding_dim]

    # 2) Convert user's stored embeddings into a single 2D tensor
    #    user_papers_db[user_id] is a list of (paper_metadata, embedding_vector)
    user_paper_embeddings = [item[1] for item in user_papers_db[user_id]]
    user_paper_embeddings = torch.stack(user_paper_embeddings, dim=0)
    # user_paper_embeddings has shape [num_user_papers, embedding_dim]

    # 3) For each new paper embedding, compute the average similarity
    scores = []
    for i, new_emb in enumerate(new_embeddings):
        # Reshape new_emb to [1, embedding_dim]
        new_emb = new_emb.unsqueeze(0)

        # Compute similarity with user_paper_embeddings -> shape [1, num_user_papers]
        sim_values = util.pytorch_cos_sim(new_emb, user_paper_embeddings)

        # Take the average (or max) as a single "score"
        avg_score = sim_values.mean().item()
        scores.append((i, avg_score))

    # 4) Sort the new papers by descending similarity
    scores.sort(key=lambda x: x[1], reverse=True)

    # 5) Return the top N recommended papers
    top_paper_indices = [s[0] for s in scores[:top_n]]
    recommended_papers = [new_papers[i] for i in top_paper_indices]
    return recommended_papers
###############################################################################
# Example Usage
###############################################################################
if __name__ == "__main__":
    user_id = "user123"

    # 1) Suppose the user previously searched for "machine learning in echocardiogram"
    old_papers = fetch_arxiv_papers("machine learning in echocardiogram", max_results=5)
    # Store them (along with embeddings) in our mini "database"
    store_user_papers(user_id, old_papers)

    # 2) Now the user does a *new* query: "deep learning in cardiology"
    new_papers = fetch_arxiv_papers("deep learning in cardiology", max_results=10)

    # 3) We want to recommend from these new papers based on similarity to the user's stored papers
    recommended = recommend_papers_semantic(user_id, new_papers, top_n=5)

    # 4) Print them out
    print("=== Recommended Papers ===")
    for idx, paper in enumerate(recommended, start=1):
        print(f"{idx}. {paper['title']} (Score is not shown here, but was computed.)")
        print(f"   URL: {paper['url']}")
        print(f"   Abstract: {paper['abstract'][:200]}...")  # show partial
        print()
