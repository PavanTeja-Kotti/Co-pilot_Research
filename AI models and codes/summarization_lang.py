import os
import json
import requests
from tempfile import NamedTemporaryFile
from langchain.chains import RetrievalQA
from langchain_community.llms import OpenAI
from langchain_community.vectorstores import FAISS
from langchain_community.document_loaders import PyPDFLoader
from langchain_community.embeddings import OpenAIEmbeddings

# Set OpenAI API Key

# Directory to save chat history
CHAT_HISTORY_DIR = "chat_history"
os.makedirs(CHAT_HISTORY_DIR, exist_ok=True)

# Helper functions for saving and loading chat history
def save_chat_history(user_id, chat_history):
    """Save chat history to a JSON file."""
    file_path = os.path.join(CHAT_HISTORY_DIR, f"{user_id}_chat_history.json")
    with open(file_path, "w") as file:
        json.dump(chat_history, file)

def load_chat_history(user_id):
    """Load chat history from a JSON file."""
    file_path = os.path.join(CHAT_HISTORY_DIR, f"{user_id}_chat_history.json")
    if os.path.exists(file_path):
        with open(file_path, "r") as file:
            return json.load(file)
    return []

# Download the PDF from a URL
def download_pdf_from_url(url):
    """Download a PDF from a URL and save it temporarily."""
    response = requests.get(url, stream=True)
    if response.status_code == 200:
        temp_file = NamedTemporaryFile(delete=False, suffix=".pdf")
        with open(temp_file.name, "wb") as file:
            file.write(response.content)
        return temp_file.name
    else:
        raise ValueError(f"Failed to download PDF. Status code: {response.status_code}")

# Summarize long text using LangChain
def summarize_pdf(pdf_path):
    """Summarize a long PDF document."""
    # Load the PDF
    loader = PyPDFLoader(pdf_path)
    documents = loader.load()

    # Create embeddings and vector store
    embeddings = OpenAIEmbeddings()
    vector_store = FAISS.from_documents(documents, embeddings)

    # Use an LLM to summarize the document
    llm = OpenAI(model="gpt-3.5-turbo", temperature=0)
    qa_chain = RetrievalQA.from_chain_type(
        llm=llm,
        retriever=vector_store.as_retriever(),
        return_source_documents=True
    )

    # Summarize the document in chunks
    summary = qa_chain.run("Summarize the entire document in brief.")
    return summary, vector_store

# Chat with the PDF
def chat_with_pdf(user_id, query, vector_store, chat_history):
    """Answer queries about the PDF."""
    # Load LLM and QA chain
    llm = OpenAI(model="gpt-3")
    qa_chain = RetrievalQA.from_chain_type(
        llm=llm,
        retriever=vector_store.as_retriever(),
        return_source_documents=False
    )

    # Get the response
    response = qa_chain.run(query)

    # Save the query and response to chat history
    chat_history.append({"query": query, "response": response})
    save_chat_history(user_id, chat_history)

    return response

# Main function for processing the PDF and chat
def main():
    user_id = "user123"  # Replace with actual user ID in a real application

    # Step 1: User provides a URL to the PDF
    pdf_url = input("Enter the URL to the PDF file: ")

    # Step 2: Download the PDF
    print("Downloading the PDF...")
    try:
        pdf_path = download_pdf_from_url(pdf_url)
    except ValueError as e:
        print(e)
        return

    # Step 3: Summarize the PDF
    print("Summarizing the PDF, please wait...")
    summary, vector_store = summarize_pdf(pdf_path)
    print("\nSummary of the PDF:")
    print(summary)

    # Step 4: Chat with the PDF
    chat_history = load_chat_history(user_id)
    print("\nYou can now chat with the PDF. Type 'exit' to stop.")
    while True:
        query = input("\nAsk a question: ")
        if query.lower() == "exit":
            break
        response = chat_with_pdf(user_id, query, vector_store, chat_history)
        print(f"Response: {response}")

    # Step 5: Show chat history
    print("\nChat history:")
    for chat in chat_history:
        print(f"Q: {chat['query']}")
        print(f"A: {chat['response']}")

    # Step 6: Clean up temporary PDF file
    os.remove(pdf_path)
    print("Temporary PDF file removed.")

if __name__ == "__main__":
    main()
