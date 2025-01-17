from datetime import datetime
import os
from typing import List, Tuple, Dict, Optional, Union
from dataclasses import dataclass
from pathlib import Path
import tempfile
from urllib.parse import urlparse
import requests

import PyPDF2
from groq import Groq
from langchain_community.vectorstores import FAISS
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain.docstore.document import Document

@dataclass
class ChatHistory:
    question: str
    answer: str

class PDFProcessor:
    def __init__(self, pdf_source: str):
        """
        Initialize PDFProcessor with either a local path or URL to a PDF.
        
        Args:
            pdf_source: Local file path or HTTP URL to a PDF file
        """
        self.pdf_source = pdf_source
        self.is_url = bool(urlparse(pdf_source).scheme)

    def _download_pdf(self) -> str:
        """
        Download PDF from URL and save to temporary file.
        
        Returns:
            str: Path to temporary file
        """
        try:
            response = requests.get(self.pdf_source, stream=True)
            response.raise_for_status()  # Raise exception for bad status codes
            
            # Create temporary file with .pdf extension
            temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.pdf')
            temp_file.write(response.content)
            temp_file.close()
            
            return temp_file.name
        except requests.RequestException as e:
            raise ValueError(f"Failed to download PDF from URL: {str(e)}")

    def extract_text(self) -> str:
        """
        Extract text from PDF file, whether local or from URL.
        
        Returns:
            str: Extracted text from PDF
        """
        try:
            if self.is_url:
                temp_path = self._download_pdf()
                pdf_path = temp_path
            else:
                pdf_path = self.pdf_source

            with open(pdf_path, 'rb') as file:
                reader = PyPDF2.PdfReader(file)
                text = ""
                for page in reader.pages:
                    text += page.extract_text()

            # Clean up temporary file if it was downloaded
            if self.is_url:
                os.unlink(temp_path)

            return text
        except (PyPDF2.PdfReadError, OSError) as e:
            raise ValueError(f"Failed to read PDF: {str(e)}")
        except Exception as e:
            raise ValueError(f"Unexpected error processing PDF: {str(e)}")

    def create_chunks(self, text: str, chunk_size: int = 500) -> List[str]:
        """Split text into chunks of specified size."""
        return [text[i:i + chunk_size] for i in range(0, len(text), chunk_size)]

class VectorStoreManager:
    def __init__(self, index_path: str = 'faiss_index'):
        self.index_path = index_path
        self.embeddings = HuggingFaceEmbeddings(
            model_name="sentence-transformers/all-MiniLM-L6-v2"
        )
        self.vector_store = self._load_index()

    def _load_index(self) -> Optional[FAISS]:
        """Load existing FAISS index if it exists."""
        if os.path.exists(self.index_path):
            return FAISS.load_local(self.index_path, self.embeddings)
        return None

    def save_index(self):
        """Save FAISS index to disk."""
        if not os.path.exists(self.index_path):
            os.makedirs(self.index_path)
        self.vector_store.save_local(self.index_path)

    def add_documents(self, chunks: List[str]):
        """Add new documents to the vector store."""
        documents = [Document(page_content=chunk) for chunk in chunks]
        if self.vector_store is None:
            self.vector_store = FAISS.from_documents(documents, self.embeddings)
        else:
            self.vector_store.add_documents(documents)
        self.save_index()

    def similarity_search(self, query: str, k: int = 5) -> List[Document]:
        """Perform similarity search on the vector store."""
        if self.vector_store is None:
            raise ValueError("No documents have been indexed yet.")
        return self.vector_store.similarity_search(query, k=k)

class GroqClient:
    def __init__(self, api_key: str):
        self.client = Groq(api_key=api_key)

    def summarize_text(self, text: str) -> str:
        """Summarize text using Groq API."""
        response = self.client.chat.completions.create(
            messages=[{
                "role": "user",
                "content": f"""Your are chatbot capable of summarizing given text. 
                You can atmost 150 words to summarize a text and not more than that
                here is the text {text}"""
            }],
            model="llama-3.1-8b-instant",
        )
        return response.choices[0].message.content

    def answer_question(self, question: str, context: str, history_context: str) -> str:
        """Generate answer using Groq API."""
        response = self.client.chat.completions.create(
            messages=[{
                "role": "user",
                "content": f"""
                You are an intelligent AI assistant capable of generating insightful, 
                context-aware answers. Your goal is to understand the user's question 
                and craft a thoughtful, relevant response based on both the current 
                context and historical context.

                Question: {question}
                Current context: {context}
                Conversation history: {history_context}

                Guidelines:
                1. Use the context intelligently and integrate relevant information
                2. Provide answers based on reasoning
                3. Be concise and relevant
                4. Engage naturally with a friendly and professional tone
                """
            }],
            model="llama-3.3-70b-versatile",
        )
        return response.choices[0].message.content

@dataclass
class PDFContent:
    text: str
    summary: str
    file_name: str
    upload_time: str

class PDFChatbot:
    def __init__(self, groq_api_key: str, index_path: str = 'faiss_index'):
        self.vector_store_manager = VectorStoreManager(index_path)
        self.groq_client = GroqClient(groq_api_key)
        self.chat_history: List[ChatHistory] = []
        self.pdf_documents: Dict[str, PDFContent] = {}  # Store multiple PDF contents
        self.current_pdf_id: Optional[str] = None
        self.basic_responses = {
            "hi": "Hello! How can I help you today?",
            "hello": "Hi there! What can I do for you?",
            "hey": "Hey! How can I assist you?",
            "how are you": "I'm doing well, thank you for asking! How can I help you?",
            "bye": "Goodbye! Have a great day!",
            "goodbye": "Farewell! Feel free to return if you have more questions."
        }

    def process_pdf(self, pdf_source: str) -> str:
        """
        Process PDF from either local path or URL and return summary.
        
        Args:
            pdf_source: Local file path or HTTP URL to a PDF file
        
        Returns:
            str: Summary of the PDF content
        """
        try:
            processor = PDFProcessor(pdf_source)
            text = processor.extract_text()
            chunks = processor.create_chunks(text)
            self.vector_store_manager.add_documents(chunks)
            summary = self.groq_client.summarize_text(text)
            
            # Generate unique ID for this PDF
            pdf_id = str(len(self.pdf_documents) + 1)
            file_name = os.path.basename(pdf_source) if not processor.is_url else "uploaded_pdf.pdf"
            upload_time = datetime.now().isoformat()
            
            # Store PDF content
            self.pdf_documents[pdf_id] = PDFContent(
                text=text,
                summary=summary,
                file_name=file_name,
                upload_time=upload_time
            )
            self.current_pdf_id = pdf_id
            
            # Add to chat history
            self.chat_history.append(ChatHistory(
                question=f"[PDF_UPLOAD_{pdf_id}] {file_name}",
                answer=f"PDF Summary: {summary}\n\nFull Content Available for Reference"
            ))
            
            return summary
        except Exception as e:
            error_msg = f"Error processing PDF: {str(e)}"
            self.chat_history.append(ChatHistory(
                question="[PDF_UPLOAD_ERROR]",
                answer=error_msg
            ))
            raise ValueError(error_msg)

    def ask_question(self, question: str) -> str:
        """Ask a question about the processed documents or handle basic conversation."""
        # Convert question to lowercase for matching basic responses
        question_lower = question.lower().strip()
        
        # Check if it's a basic conversation pattern
        if question_lower in self.basic_responses:
            answer = self.basic_responses[question_lower]
            self.chat_history.append(ChatHistory(question=question, answer=answer))
            return answer

        # If no PDF is processed yet and it's not a basic conversation,
        # proceed with vector store check
        if self.vector_store_manager.vector_store is None:
            raise ValueError("No documents available. Please process a PDF first.")

        try:
            # Get relevant documents
            docs = self.vector_store_manager.similarity_search(question)
            context = " ".join([doc.page_content for doc in docs])
            
            # Get history context - exclude PDF content entries for clarity
            history_context = " ".join([
                f"Q: {h.question}\nA: {h.answer}" 
                for h in self.chat_history 
                if not h.question.startswith("[PDF_UPLOAD")
            ])

            # Generate answer
            answer = self.groq_client.answer_question(question, context, history_context)
            
            # Update chat history
            self.chat_history.append(ChatHistory(question=question, answer=answer))
            
            return answer
        except Exception as e:
            error_msg = f"Error generating answer: {str(e)}"
            self.chat_history.append(ChatHistory(
                question=question,
                answer=f"Error: {error_msg}"
            ))
            raise ValueError(error_msg)

    def get_pdf_content(self, pdf_id: Optional[str] = None) -> Optional[PDFContent]:
        """Get content of a specific PDF or current PDF."""
        if pdf_id is None:
            pdf_id = self.current_pdf_id
        return self.pdf_documents.get(pdf_id)

    def clear_history(self, include_pdfs: bool = True):
        """
        Clear chat history and optionally PDF contents.
        
        Args:
            include_pdfs: If True, also clear stored PDF contents
        """
        self.chat_history = []
        if include_pdfs:
            self.pdf_documents = {}
            self.current_pdf_id = None

def main():
    # Initialize chatbot with your Groq API key
    chatbot = PDFChatbot(
        groq_api_key="your_groq_api_key",
        index_path="faiss_index"
    )

    # Example usage
    try:
        # Test basic conversation
        print("Testing basic conversation:")
        print("Bot:", chatbot.ask_question("hi"))
        print("Bot:", chatbot.ask_question("how are you"))

        # Process a PDF
        print("\nProcessing PDF:")
        summary = chatbot.process_pdf("example.pdf")
        print(f"PDF Summary:\n{summary}\n")

        # Ask questions about the PDF
        print("Asking questions about the PDF:")
        questions = [
            "What is the main topic of the document?",
            "Can you summarize the key points?",
        ]
        
        for question in questions:
            answer = chatbot.ask_question(question)
            print(f"Q: {question}")
            print(f"A: {answer}\n")

    except Exception as e:
        print(f"Error: {str(e)}")

if __name__ == "__main__":
    main()