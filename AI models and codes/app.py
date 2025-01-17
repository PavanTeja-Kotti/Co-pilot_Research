import streamlit as st
from langchain_community.vectorstores import FAISS
from langchain.embeddings import HuggingFaceEmbeddings
from langchain.docstore.document import Document
import PyPDF2
import os
from groq import Groq

FAISS_INDEX_PATH = 'faiss_index'

# PDF Upload & Extraction
def extract_pdf_text(pdf_file):
    reader = PyPDF2.PdfReader(pdf_file)
    text = ""
    for page in reader.pages:
        text += page.extract_text()
    return text

def summarize_text(text):
    client = Groq(
        api_key="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"
    )

    chat_completion = client.chat.completions.create(
        messages=[
            {
                "role": "user",
                "content": f"""Your are chatbot capable of summarizing given text. You can atmost 200 words to summarize a text and not more than that
                  here is the text {text}
                   """
            }
        ],
        model="llama-3.1-8b-instant",
    )

    return chat_completion.choices[0].message.content

def answer_question(question, history_context,context):

    client = Groq(
        api_key="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"
    )

    chat_completion = client.chat.completions.create(
        messages=[
            {
                "role": "user",
                "content": f"""
                You are an intelligent AI assistant capable of generating insightful, context-aware answers. Your goal is to understand the user's question and craft a thoughtful, relevant response based on both the current context and historical context, without merely pasting the context into your answer.
                here is the question:{question}
                Here is the current context: {context}
                And here is the history of the conversation: {history_context}

                Guidelines:
                1. **Use the context intelligently**: Integrate relevant information from the context only when it enhances your response. Avoid directly copying or repeating context unless it’s necessary for clarity.
                2. **Provide answers based on reasoning**: Generate your response by considering the user's current question, but also make sure to utilize any helpful information from the context. Your answer should be informed by both the context and your ability to understand the user's needs, without simply restating information.
                3. **Be concise and relevant**: Focus on answering the question directly. Only bring up historical context or additional context if it adds value to the answer.
                4. **Engage naturally**: Keep your tone friendly and professional, ensuring the conversation flows naturally without overloading the user with unnecessary details.
                
                Please answer the user's query using your intelligence, considering all the context provided and focusing on providing a helpful and concise response.
                """
            }
        ],
        model="llama-3.3-70b-versatile",
    )

    return chat_completion.choices[0].message.content

def save_faiss_index(vector_store, path):
    if not os.path.exists(path):
        os.makedirs(path)
    vector_store.save_local(path)



def load_faiss_index(path, embeddings):
    if os.path.exists(path):
        return FAISS.load_local(path, embeddings)
    return None

st.title('PDF Summarization and Chatbot')

embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")

if 'vector_store' not in st.session_state:
    st.session_state.vector_store = load_faiss_index(FAISS_INDEX_PATH, embeddings)
if 'chat_history' not in st.session_state:
    st.session_state.chat_history = []

uploaded_files = st.file_uploader("Upload your PDFs", type=["pdf"], accept_multiple_files=True)
if uploaded_files:
    for uploaded_file in uploaded_files:
  
        text = extract_pdf_text(uploaded_file)
        summary  = summarize_text(text)
        
        st.title('Summary of PDF')
        st.write(summary)
       
        chunk_size = 500 
        chunks = [text[i:i + chunk_size] for i in range(0, len(text), chunk_size)]

        documents = [Document(page_content=chunk) for chunk in chunks]

        if st.session_state.vector_store is None:
            st.session_state.vector_store = FAISS.from_documents(documents, embeddings)
            st.info("New FAISS index created.")
        else:
            st.session_state.vector_store.add_documents(documents)
            st.info(f"Documents from {uploaded_file.name} added to the FAISS index.")

        save_faiss_index(st.session_state.vector_store, FAISS_INDEX_PATH)

    st.success("Documents processed and indexed successfully!")


question = st.text_input("Ask a question from the document:")
if question:
   
    if st.session_state.vector_store is not None:
        retrieved_docs = st.session_state.vector_store.similarity_search(question, k=5)  
        print(retrieved_docs)
        retrieved_texts = " ".join([doc.page_content for doc in retrieved_docs])

        history_context = " ".join([entry['answer'] for entry in st.session_state.chat_history]) 
        answer = answer_question(question, history_context,retrieved_texts)
 
        st.write("Answer: ", answer)
 
        st.session_state.chat_history.append({
            'question': question,
            'answer': answer
        })
    else:
        st.warning("No documents available in the FAISS index. Please upload a PDF first.")