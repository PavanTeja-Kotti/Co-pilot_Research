from langchain.chains import RetrievalQA
from langchain.prompts import PromptTemplate
from langchain_community.document_loaders import PyPDFLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.embeddings import HuggingFaceEmbeddings
from langchain.vectorstores import FAISS
from langchain_community.llms import HuggingFacePipeline
from transformers import pipeline

# Step 1: Load the PDF
def load_pdf(file_path):
    """
    Load PDF content using LangChain's PyPDFLoader.
    """
    document_loader = PyPDFLoader(file_path)
    documents = document_loader.load()
    return documents

# Step 2: Create a LangChain LLM from Hugging Face
def create_huggingface_pipeline():
    """
    Create a Hugging Face summarization pipeline and wrap it in LangChain's HuggingFacePipeline.
    """
    hf_summarizer = pipeline("summarization", model="t5-small")  # Use a smaller T5 model
    llm = HuggingFacePipeline(pipeline=hf_summarizer)
    return llm

# Step 3: Summarize Documents
def summarize_documents(documents, llm):
    """
    Summarize documents using LangChain's LLMChain.
    """
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000, 
        chunk_overlap=200, 
        separators=["\n\n", "\n", ".", " "]
    )
    chunks = text_splitter.split_documents(documents)

    summaries = []
    for chunk in chunks:
        text = chunk.page_content  # Extract the text from the chunk
        summary = llm.predict({"text": text})  # Use `predict` to generate output
        summaries.append(summary)
    return "\n".join(summaries)

# Step 4: Create a Retrieval-Based QA System
def create_retrieval_qa(summarized_text):
    """
    Create a retrieval-based QA system using FAISS for the summarized text.
    """
    # Create embeddings for the summarized text
    embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")
    
    # Load the summarized text into FAISS
    vectorstore = FAISS.from_texts([summarized_text], embeddings)

    # Create a retrieval-based QA chain
    qa_chain = RetrievalQA.from_chain_type(
        llm=HuggingFacePipeline(pipeline=pipeline("text-generation", model="gpt2")),  # For QA
        retriever=vectorstore.as_retriever(),
        return_source_documents=True,
    )
    return qa_chain

# Main Function
def main():
    pdf_path = "test.pdf"  # Path to your PDF file
    print("Loading the PDF...")
    documents = load_pdf(pdf_path)
    print(f"PDF loaded. Total documents: {len(documents)}")

    print("\nCreating Hugging Face pipeline...")
    summarizer = create_huggingface_pipeline()
    print("Pipeline created.")

    print("\nSummarizing the document...")
    summarized_text = summarize_documents(documents, summarizer)
    print("Summarization completed.")

    print("\nCreating the QA system...")
    qa_chain = create_retrieval_qa(summarized_text)
    print("QA system ready. You can now interact with the summarized text.")

    print("\nAsk questions about the document (type 'exit' to quit):")
    while True:
        query = input("Your question: ").strip()
        if query.lower() == "exit":
            break
        result = qa_chain.run(query)
        print(f"Answer: {result}")
        print(f"Source Document: {result.get('source_documents', 'N/A')}")

if __name__ == "__main__":
    main()