from langchain.chains import RetrievalQA
from langchain_community.llms import OpenAI
from langchain_community.vectorstores import FAISS
from langchain_community.document_loaders import PyPDFLoader
from langchain.text_splitter import CharacterTextSplitter

document_loder = PyPDFLoader("test.pdf")
documents = document_loder.load()
print("documents: ", documents)

text_splitter = CharacterTextSplitter(
    separator="\n\n",
    chunk_size=1000,
    chunk_overlap=200,
)

texts = text_splitter.split_documents(documents)
print(texts)