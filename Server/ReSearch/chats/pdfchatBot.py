from datetime import datetime
from typing import List, Tuple, Dict, Optional
from dataclasses import dataclass
from pathlib import Path
import tempfile
from urllib.parse import urlparse
import requests
import pdfplumber
import PyPDF2
from groq import Groq
from langchain_community.vectorstores import FAISS
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain.docstore.document import Document
import os
import io

import fitz  # PyMuPDF
import open_clip
import torch
from torchvision import transforms
from PIL import Image
import numpy as np
import faiss
import base64
import json
from django.conf import settings

def create_FissIndex_directory():
        """Create upload directory if it doesn't exist"""
        FissIndex = os.path.join(settings.BASE_DIR, 'FissIndex')
        if not os.path.exists(FissIndex):
            os.makedirs(FissIndex)
        return FissIndex

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
            response.raise_for_status()
            
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

            if self.is_url:
                os.unlink(temp_path)

            return text
        except (PyPDF2.errors.PdfReadError, OSError) as e:
            raise ValueError(f"Failed to read PDF: {str(e)}")
        except Exception as e:
            raise ValueError(f"Unexpected error processing PDF: {str(e)}")

    def extract_tables(self) -> List[List[List[str]]]:
        """
        Extract tables from a PDF file, whether local or from a URL.

        Returns:
            List[List[List[str]]]: Extracted tables as nested lists.
        """
        try:
            if self.is_url:
                temp_path = self._download_pdf()
                pdf_path = temp_path
            else:
                pdf_path = self.pdf_source

            tables = []
            with pdfplumber.open(pdf_path) as pdf:
                for page in pdf.pages:
                    tables.extend(page.extract_tables())

            if self.is_url:
                os.unlink(temp_path)

            return tables
        except Exception as e:
            raise ValueError(f"Error extracting tables: {str(e)}")
    
    def extract_images_from_pdf(self):
        """Extract images from a PDF."""
        
        if self.is_url:
            temp_path = self._download_pdf()
            pdf_path = temp_path
        else:
            pdf_path = self.pdf_source

        pdf_document = fitz.open(pdf_path)
        images = []
        for page_num in range(len(pdf_document)):
            page = pdf_document[page_num]
            for img_index, img in enumerate(page.get_images(full=True)):
                try:
                    xref = img[0]
                    base_image = pdf_document.extract_image(xref)
                    image_bytes = base_image["image"]
                    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
                    images.append(image)
                except Exception as e:
                    print(f"Failed to process image {img_index} on page {page_num}: {e}")
        return images
    

    def generate_image_embeddings(self,images, model, transform):
        """Generate embeddings for a list of images."""
        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        embeddings = []
        for img in images:
            img_tensor = transform(img).unsqueeze(0).to(device)
            with torch.no_grad():
                embedding = model.encode_image(img_tensor)
            embedding = embedding / embedding.norm(dim=-1, keepdim=True)  # Normalize
            embeddings.append(embedding.cpu().numpy())
        return np.vstack(embeddings)
    
    def save_embeddings_to_faiss(self,image_embeddings, faiss_index_path):
        """Append new embeddings to the Faiss index."""
        dim = image_embeddings.shape[1]
        if os.path.exists(faiss_index_path):
            faiss_index = faiss.read_index(faiss_index_path)
        else:
            faiss_index = faiss.IndexFlatL2(dim)
        faiss_index.add(image_embeddings)
        faiss.write_index(faiss_index, faiss_index_path)
    
    def save_image_mapping(self,image_embeddings, images, image_mapping_path):
        """Append new image mappings to the JSON file."""
        with open(image_mapping_path, "r") as f:
            image_mapping = json.load(f)

        start_index = len(image_mapping)
        for idx, embedding in enumerate(image_embeddings):
            # Convert image to base64
            buffered = io.BytesIO()
            images[idx].save(buffered, format="PNG")
            img_base64 = base64.b64encode(buffered.getvalue()).decode("utf-8")
            image_mapping[start_index + idx] = {
                "base64": img_base64
            }

        with open(image_mapping_path, "w") as f:
            json.dump(image_mapping, f)




    def process_table(self, tables: List[List[List[str]]]) -> List[Document]:
        """
        Convert extracted tables into Document objects for indexing.

        Args:
            tables: List of tables, where each table is a list of rows.

        Returns:
            List[Document]: List of processed table documents.
        """
        table_documents = []
        if not tables:  # Check if tables are empty
            return table_documents

        for table in tables:
            if not table or not isinstance(table, list):  # Validate table structure
                continue
            for row in table:
                row_content = " | ".join([str(cell) for cell in row])  # Convert row to a string
                table_documents.append(Document(page_content=f"Table Row: {row_content}"))

        return table_documents


    def create_chunks(self, text: str, chunk_size: int = 500) -> List[str]:
        """Split text into chunks of specified size."""
        return [text[i:i + chunk_size] for i in range(0, len(text), chunk_size)]

class VectorStoreManager:
    def __init__(self, index_path: str):
        self.index_path = index_path
        self.embeddings = HuggingFaceEmbeddings(
            model_name="sentence-transformers/all-MiniLM-L6-v2"
        )
        self.vector_store = self._load_index()

    def _load_index(self) -> Optional[FAISS]:
        """Load existing FAISS index if it exists."""
        if os.path.exists(self.index_path):
            return FAISS.load_local(self.index_path, self.embeddings, allow_dangerous_deserialization=True)
        return None

    def save_index(self):
        """Save FAISS index to disk."""
        if not os.path.exists(self.index_path):
            os.makedirs(self.index_path)
        self.vector_store.save_local(self.index_path)

    def add_documents(self, documents: List[Document]):
        """Add new documents to the vector store."""
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

    def explain_image(self,base64_image):
     
       
        try:
            chat_completion = self.client.chat.completions.create(
                    messages=[
                        {
                            "role": "user",
                            "content": [
                                {"type": "text", "text": "What's in this image?"},
                                {
                                    "type": "image_url",
                                    "image_url": {
                                        "url": f"data:image/jpeg;base64,{base64_image}",
                                    },
                                },
                            ],
                        }
                    ],
                    model="llama-3.2-90b-vision-preview",
                )
            return chat_completion.choices[0].message.content
        except:
            return "Invalid image url"
    
    def chunk_text(self,text, max_length=5000):
        
        chunks = []
        current_chunk = ""

        # Iterate through the text and add lines to current_chunk
        for line in text.splitlines():
            if len(current_chunk) + len(line) + 1 > max_length:  # +1 for newline
                chunks.append(current_chunk)
                current_chunk = line  # Start a new chunk
            else:
                current_chunk += "\n" + line if current_chunk else line

        if current_chunk:  # Append the last chunk
            chunks.append(current_chunk)
        
        return chunks
                


    def summarize_text(self, text: str) -> str:
        """Summarize large text by chunking it if necessary."""
        max_length = 5000  # Character limit per chunk (adjust based on your needs)

        # Split text into chunks if it exceeds max_length
        chunks = self.chunk_text(text, max_length)
        summaries = []

        for chunk in chunks:
            response = self.client.chat.completions.create(
                messages=[{
                    "role": "user",
                    "content": f"""Summarize this text in less than 20 words: {chunk}
                     Guidlines:
                     1.Striclty dont include this line at start of text line-"Here is a summary of the text in under 100 words: "
                     2.Only provide summary and no other introductory text.
                    """
                }],
                model="llama3-8b-8192"
            )
            summaries.append(response.choices[0].message.content)

        # Combine the summaries (optional)
        final_summary = " ".join(summaries)
        return final_summary
        

    def answer_question(self, question: str, context: str, history_context: str,flag:bool=False) -> str:
        print("question: ------------->>>>>>>>>>>>>> ", question)
        """Generate answer using Groq API."""
        if(flag):
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
                4. Engage naturally with a friendly and professional tone'
                5 Please respond with a well-structured with proper format but no markdown formatting
                   *Use bullet points for lists or key points.
                   *Add line breaks between paragraphs to improve readability.
                   *Use headings or bold text to emphasize important sections or concepts when necessary.
                6.Dont use phrase like "this was the context and history context given by user"
                7.Do not include any information about the context, just respond directly to the question based on the provided context.
         
            """
            }],
            model="llama-3.1-70b-versatile",
        )
        else :
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

                    if - user question has greeting(hi,How are you,hello) respond with appropriate greeting and keep the answer short(one line)
                    else - Repons with "Sorry i cant answer this question" for any other generic question which is not related to given context and keep the answer short(one line).
                    

                    Guidelines:
                    1. Use the context intelligently and integrate relevant information
                    2. Provide answers based on reasoning
                    3. Be concise and relevant
                    4. Engage naturally with a friendly and professional tone'
                    5 Please respond with a well-structured with proper format but no markdown formatting
                    *Use bullet points for lists or key points.
                    *Add line breaks between paragraphs to improve readability.
                    *Use headings or bold text to emphasize important sections or concepts when necessary.
                    6.Dont use phrase like "this was the context and history context given by user"
                    7.Do not include any information about the context, just respond directly to the question based on the provided context.
            
                """
                }],
                model="llama-3.1-70b-versatile",
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
        TEXT_INDEX_PATH = os.path.join(create_FissIndex_directory(), index_path + "_text")
        TABLE_INDEX_PATH = os.path.join(create_FissIndex_directory(),index_path + "_table")
        self.text_vector_store = VectorStoreManager(TEXT_INDEX_PATH)
        self.table_vector_store = VectorStoreManager(TABLE_INDEX_PATH)
        self.groq_client = GroqClient(groq_api_key)
        self.chat_history: List[ChatHistory] = []
        self.pdf_documents: Dict[str, PDFContent] = {}
        self.current_pdf_id: Optional[str] = None

    def process_pdf(self, pdf_source: str) -> str:
        try:
            INDEX_PATH = "persistent_data/faiss_index"
            IMAGE_MAPPING_PATH = "persistent_data/image_mapping.json"

            # Ensure the persistent storage directories exist
            os.makedirs(INDEX_PATH, exist_ok=True)
            if not os.path.exists(IMAGE_MAPPING_PATH):
                with open(IMAGE_MAPPING_PATH, "w") as f:
                    json.dump({}, f)
            processor = PDFProcessor(pdf_source)
            text = processor.extract_text()
            tables = processor.extract_tables()
            table_documents = processor.process_table(tables)
            extracted_images = processor.extract_images_from_pdf()
            if(extracted_images):
                device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
                model, _, transform = open_clip.create_model_and_transforms('ViT-B-32', pretrained='openai')
                model.eval()
                model.to(device)
                INDEX_PATH = "persistent_data/faiss_index"
                IMAGE_MAPPING_PATH = "persistent_data/image_mapping.json"


        
                image_embeddings = processor.generate_image_embeddings(extracted_images, model, transform)

                processor.save_embeddings_to_faiss(image_embeddings, os.path.join(INDEX_PATH, "image_embeddings.index"))
                processor.save_image_mapping(image_embeddings, extracted_images, IMAGE_MAPPING_PATH)


            text_chunks = processor.create_chunks(text)
            text_documents = [Document(page_content=chunk) for chunk in text_chunks]

            # Index text documents
            self.text_vector_store.add_documents(text_documents)

            # Only index tables if there are valid table documents
            if table_documents:
                self.table_vector_store.add_documents(table_documents)

            # Generate summary using Groq
            summary = self.groq_client.summarize_text(text)
            pdf_id = str(len(self.pdf_documents) + 1)

            self.pdf_documents[pdf_id] = PDFContent(
                text=text,
                summary=summary,
                file_name=os.path.basename(pdf_source),
                upload_time=datetime.now().isoformat()
            )
            self.current_pdf_id = pdf_id  # Set current PDF ID
            return summary
        except Exception as e:
            raise ValueError(f"Error processing PDF: {str(e)}")



    def ask_question(self, question: str,group :bool=False, k: int = 5) -> str:
        """
        Ask a question by fetching similar documents from both text and table indices.

        Args:
            question: User's question.
            k: Number of top results to consider for similarity search.

        Returns:
            str: Answer to the question.
        """
        keywords = {"diagram", "image", "picture", "pic", "photo"}
        words = question.lower().split()
        flag = any(word in keywords for word in words)

        print(flag)

        if(flag):
            device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
            model, _, transform = open_clip.create_model_and_transforms('ViT-B-32', pretrained='openai')
            model.eval()
            model.to(device) 

            text_embedding = self.generate_text_embedding(question, model, open_clip.tokenize)
            INDEX_PATH = "persistent_data/faiss_index"
            faiss_index = self.load_embeddings_from_faiss(os.path.join(INDEX_PATH, "image_embeddings.index"))
            D, I = faiss_index.search(np.array([text_embedding]), k=1)
            best_match_index = I[0][0]
            similarity = D[0][0]
            print("Smilarity score",similarity)
            IMAGE_MAPPING_PATH = "persistent_data/image_mapping.json"
            image_mapping = self.load_image_mapping(IMAGE_MAPPING_PATH)
            best_match_base64 = image_mapping[str(best_match_index)]["base64"]
            img_data = base64.b64decode(best_match_base64)
            img_explanation = self.groq_client.explain_image(best_match_base64)
            print("img explanaation",img_explanation)
            image = Image.open(io.BytesIO(img_data))
            imagePath=os.path.join(settings.BASE_DIR, 'uploads',f"{datetime.now().strftime('%Y%m%d_%H%M%S')}_AiChatBot.PNG")
            image.save(imagePath)
            image_size_kb = os.path.getsize(imagePath) / 1024
            return img_explanation,imagePath,image_size_kb


        text_docs = []
        table_docs = []

        # Fetch top-k similar documents from both text and table indices
        if self.text_vector_store.vector_store:
            text_docs = self.text_vector_store.similarity_search(question, k=k)

        if self.table_vector_store.vector_store:
            table_docs = self.table_vector_store.similarity_search(question, k=k)
        
       
        
        combined_context = " ".join([doc.page_content for doc in text_docs + table_docs])
        # print("Question: question: ------------>>>>>>><<<<<<<<<>>>>>>>><<<<<: ", question, combined_context)


        if not combined_context:
            answer = self.groq_client.answer_question(question, "", "",group)
        

        # Combine history context
        history_context = " ".join([f"Q: {h.question}\nA: {h.answer}" for h in self.chat_history])

        # Generate answer using Groq API
        answer = self.groq_client.answer_question(question, combined_context, history_context)
        self.chat_history.append(ChatHistory(question=question, answer=answer))
        return answer,None,None
    
    def load_embeddings_from_faiss(self,faiss_index_path):
        """Load the image embeddings from a Faiss index file."""
        if os.path.exists(faiss_index_path):
            return faiss.read_index(faiss_index_path)
        return None
    
    def load_image_mapping(self,image_mapping_path):
        """Load image mapping from JSON."""
        with open(image_mapping_path, "r") as f:
            return json.load(f)
        

    def generate_text_embedding(self,query, model, tokenizer):
        """Generate an embedding for a text query."""
        tokens = tokenizer([query])  # Tokenize text as a batch
        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        tokens = tokens.to(device)
        model = model.to(device)

        with torch.no_grad():
            embedding = model.encode_text(tokens)
        embedding = embedding / embedding.norm(dim=-1, keepdim=True)  # Normalize
        return embedding.squeeze(0).cpu().numpy()

    def get_pdf_content(self, pdf_id: Optional[str] = None) -> Optional[PDFContent]:
        """Get content of a specific PDF or the current PDF."""
        if pdf_id is None:
            pdf_id = self.current_pdf_id
        return self.pdf_documents.get(pdf_id)

    def clear_history(self, include_pdfs: bool = True):
        """
        Clear chat history and optionally PDF contents.
        
        Args:
            include_pdfs: If True, also clear stored PDF contents.
        """
        self.chat_history = []
        if include_pdfs:
            self.pdf_documents = {}
            self.current_pdf_id = None

def main():
    # Initialize chatbot with your Groq API key
    chatbot = PDFChatbot(
        groq_api_key="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",
        index_path='faiss_index'
    )

    try:
        # Test basic conversation
        print("Testing basic conversation:")
        print("Bot:", chatbot.ask_question("hi"))
        print("Bot:", chatbot.ask_question("how are you"))

        # Process a PDF
        print("\nProcessing PDF:")
        summary = chatbot.process_pdf("https://etc.usf.edu/lit2go/pdf/passage/394/aesops-fables-029-the-fox-and-the-crow.pdf")
        
        print(f"PDF Summary:\n{summary}\n")

        # Ask questions about the combined content
        print("Asking questions about the combined content:")
        questions = [      
            "What is transformer",
            # "Exaplain transformer architecture with image",
            "crow doing",
            "Explain tranformer with architecture image"
        ]
        for question in questions:
            answer,img = chatbot.ask_question(question)
            print(f"Q: {question}")
            print(f"A: {answer}\n")
        
    except Exception as e:
        print(f"Error: {str(e)}")

if __name__ == "__main__":
    main()

