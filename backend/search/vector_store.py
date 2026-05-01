import faiss
import numpy as np
import json
import os
from db import files_collection

INDEX_FILE = "synced_docs/faiss.index"
CHUNKS_FILE = "synced_docs/chunks.json"
DIMENSION = 384 # Dimension for 'all-MiniLM-L6-v2'

def load_faiss_index():
    if os.path.exists(INDEX_FILE):
        return faiss.read_index(INDEX_FILE)
    # Using IndexFlatIP for Cosine Similarity (requires normalized embeddings)
    return faiss.IndexFlatIP(DIMENSION)

def load_chunks():
    if os.path.exists(CHUNKS_FILE):
        with open(CHUNKS_FILE, "r") as f:
            return json.load(f)
    return []

def save_faiss_index(index):
    if not os.path.exists("synced_docs"):
        os.makedirs("synced_docs")
    faiss.write_index(index, INDEX_FILE)

def save_chunks(chunks):
    if not os.path.exists("synced_docs"):
        os.makedirs("synced_docs")
    with open(CHUNKS_FILE, "w") as f:
        json.dump(chunks, f)

def add_to_faiss(new_chunks):
    index = load_faiss_index()
    existing_chunks = load_chunks()

    embeddings = np.array([chunk['embedding'] for chunk in new_chunks]).astype('float32')
    if len(embeddings) > 0:
        index.add(embeddings)

    # Strip embeddings before saving to JSON to save space
    for chunk in new_chunks:
        if 'embedding' in chunk:
            del chunk['embedding']

    existing_chunks.extend(new_chunks)

    save_faiss_index(index)
    save_chunks(existing_chunks)

def search_faiss(query, k=5, filters=None):
    from embedding.embedder import model
    index = load_faiss_index()
    chunks = load_chunks()

    if index.ntotal == 0 or len(chunks) == 0:
        return []

    # Ensure search_k doesn't exceed the total number of vectors in FAISS
    # If filtering, search the ENTIRE database to guarantee we find the matching document's chunks
    search_k = index.ntotal if filters else min(k, index.ntotal)

    query_embedding = model.encode([query], normalize_embeddings=True).astype('float32')
    distances, indices = index.search(query_embedding, search_k)

    results = []
    for i in indices[0]:
        if i < len(chunks) and i != -1:
            chunk = chunks[i]
            # Apply metadata filtering
            if filters:
                doc_id = chunk["doc_id"]
                metadata = get_document_metadata(doc_id)
                if metadata:
                    match = True
                    for key, val in filters.items():
                        if metadata.get(key) != val:
                            match = False
                            break
                    if not match:
                        continue
            results.append(chunk)
            if len(results) >= k:
                break

    return results

def get_document_metadata(doc_id):
    # Strip the _chunk_X suffix to get the real doc_id
    base_doc_id = doc_id.split('_chunk_')[0] if '_chunk_' in doc_id else doc_id
    
    # Instead of looking for a local metadata.json, we fetch from MongoDB
    # Try both 'file_id' and 'id' depending on how it was saved
    doc = files_collection.find_one({"file_id": base_doc_id})
    if not doc:
        doc = files_collection.find_one({"id": base_doc_id})
    if doc:
        return {
            "name": doc.get("name"),
            "mimeType": doc.get("mimeType"),
            "modifiedTime": doc.get("modifiedTime")
        }
    return None
