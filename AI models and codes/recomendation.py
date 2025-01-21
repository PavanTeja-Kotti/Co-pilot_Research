import pandas as pd
import sqlite3
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np

# Connect to SQLite database
db_path = "db.sqlite3"  # Path to your SQLite database file
connection = sqlite3.connect(db_path)

# Load data from the database
query = """
SELECT id, title, abstract, authors, source, url, pdf_url, categories, publication_date, citation_count
FROM scraping_researchpaper;
"""
papers_df = pd.read_sql_query(query, connection)

# User history: IDs of papers read by the user
user_history_ids = ['8c89c47c9e0c4102854b98d1b82941e4', 'b9125a1da0d645a68ff161e62acdde7b', '9cca41d843fc44cc86d2069b3be607f6']  # Example: User has read papers with IDs 1 and 3

# Filter the user's history
user_history = papers_df[papers_df['id'].isin(user_history_ids)]

# Combine relevant fields for content-based filtering
papers_df['content'] = papers_df['title'] + " " + papers_df['abstract'] + " " + papers_df['categories']

# Vectorize content using TF-IDF
vectorizer = TfidfVectorizer()
content_vectors = vectorizer.fit_transform(papers_df['content'])

# Calculate similarity scores
similarity_scores = cosine_similarity(content_vectors, content_vectors)

# Get indices of user's history papers
user_indices = [papers_df[papers_df['id'] == paper_id].index[0] for paper_id in user_history_ids]

# Calculate mean similarity scores for all papers
mean_similarity_scores = np.mean(similarity_scores[user_indices], axis=0)

# Recommend top 5 papers excluding those already read
papers_df['similarity_score'] = mean_similarity_scores
recommendations = papers_df[~papers_df['id'].isin(user_history_ids)].sort_values(by='similarity_score', ascending=False).head(5)

# Output recommendations
print("Recommended Papers:")
print(len(recommendations))
for index, row in recommendations.iterrows():
    print(f"ID: {row['id']}, Title: {row['title']}, Similarity Score: {row['similarity_score']:.4f}")

# Close the database connection
connection.close()
