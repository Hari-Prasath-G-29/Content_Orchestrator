import os
import json
import requests
import io
import fitz  # PyMuPDF
import mimetypes


from fastapi.responses import StreamingResponse
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
from dotenv import load_dotenv

# Load environment variables from the .env file immediately
load_dotenv()

# --- 1. FastAPI App Initialization ---
app = FastAPI(
    title="Veeva Vault Regulatory Checker",
    description="API to perform regulatory status checks and digital signature verification."
)
pool=None

# --- 2. CORS Configuration (The Fix for Browser Errors) ---
# Allows your React app (typically on localhost:5173 or 3000) to talk to this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Use ["http://localhost:5173"] for production-level security
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- 3. Configuration (Load from Environment Variables) ---
VAULT_DNS = os.getenv("VEEVA_VAULT_DNS")
API_VER = os.getenv("VEEVA_API_VERSION")
VAULT_USERNAME = os.getenv("VEEVA_USERNAME")
VAULT_PASSWORD = os.getenv("VEEVA_PASSWORD")
VAULT_TIMEOUT = 30

# --- 4. Define Response Schemas (Pydantic Models) ---

class ApprovalVerification(BaseModel):
    """Schema for the Audit Trail check."""
    document_id: str
    verified: bool
    approver_name: Optional[str] = None
    approval_date: Optional[str] = None
    role: Optional[str] = None
    message: str

class RegulatoryStatus(BaseModel):
    """Schema for the Document Status Check response."""
    document_id: str
    is_approved: bool
    status_v: Optional[str] = None
    lifecycle__v: Optional[str] = None
    stage__sys: Optional[str] = None
    state_stage_id__sys: Optional[str] = None
    message: str

class QueryResult(BaseModel):
    document_id: str
    name: str
    status_v: str
    asset_type: str = "Document"
    description: Optional[str] = "No description available"
    document_content: Optional[str] = None # This will hold the actual text

class TextContentResponse(BaseModel):
    document_id: str
    file_name: str         # New field
    asset_type: str        # New field
    text_content: str
    status: str
    
# --- 5. Authentication Helper Function ---
def get_session_id():
    """Authenticates with Veeva Vault and returns a Session ID."""
    if not all([VAULT_USERNAME, VAULT_PASSWORD, VAULT_DNS, API_VER]):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Configuration error: Missing credentials in .env file."
        )

    auth_url = f"https://{VAULT_DNS}/api/{API_VER}/auth"
    headers = {"Content-Type": "application/x-www-form-urlencoded", "Accept": "application/json"}
    payload = {"username": VAULT_USERNAME, "password": VAULT_PASSWORD}

    try:
        response = requests.post(auth_url, data=payload, headers=headers, timeout=VAULT_TIMEOUT)
        response.raise_for_status()
        auth_data = response.json()
        if auth_data.get("responseStatus") == "SUCCESS":
            return auth_data.get("sessionId")
        raise HTTPException(status_code=401, detail="Vault Authentication Failed.")
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Connectivity Error: {str(e)}")

# --- 6. New Endpoint: The Approval Audit Check ---
@app.get("/verify_approval_audit/{doc_id}", response_model=ApprovalVerification)
async def verify_approval_audit(doc_id: str):
    session_id = get_session_id()
    audit_url = f"https://{VAULT_DNS}/api/{API_VER}/audittrail/document_audit_trail?all_dates=true"
    
    headers = {"Authorization": session_id, "Accept": "application/json"}

    try:
        response = requests.get(audit_url, headers=headers, timeout=VAULT_TIMEOUT)
        response.raise_for_status()
        records = response.json().get('data', [])
        
        for entry in records:
            doc_match = str(entry.get('item_id')) == doc_id or str(entry.get('doc_id')) == doc_id
            
            # BROADENED LOGIC: Check for Workflow Approve OR State Change to Approved
            event = str(entry.get('event_type__v', '')).lower()
            action = str(entry.get('action', '')).lower()
            desc = str(entry.get('event_description', '')).lower()
            
            is_workflow_approve = "workflow" in event and "approve" in action
            is_state_change_approve = "state change" in event and "approved" in desc

            if doc_match and (is_workflow_approve or is_state_change_approve):
                return ApprovalVerification(
                    document_id=doc_id,
                    verified=True,
                    approver_name=entry.get('user_name__v'),
                    approval_date=entry.get('timestamp'),
                    role=entry.get('role__v') or "System/Admin",
                    message="SUCCESS: Approval event (Workflow or State Change) found."
                )
        
        return ApprovalVerification(document_id=doc_id, verified=False, message="FAILED: No approval record found.")
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))

# --- 7. Existing Endpoints ---

@app.post("/query_documents", response_model=List[QueryResult])
async def query_documents(vql_query: str):
    session_id = get_session_id()
    query_url = f"https://{VAULT_DNS}/api/{API_VER}/query"
    headers = {"Authorization": session_id, "Accept": "application/json"}
    payload = {"q": vql_query}

    try:
        response = requests.post(query_url, data=payload, headers=headers, timeout=VAULT_TIMEOUT)
        response.raise_for_status()
        data = response.json()
        return [QueryResult(document_id=str(d['id']), name=d.get('name__v', 'N/A'), status_v=d.get('status__v', 'N/A')) for d in data.get('data', [])]
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))

@app.get("/check_regulatory_status/{doc_id}", response_model=RegulatoryStatus)
async def check_document_status(doc_id: str):
    session_id = get_session_id()
    doc_url = f"https://{VAULT_DNS}/api/{API_VER}/objects/documents/{doc_id}"
    headers = {"Authorization": session_id, "Accept": "application/json"}

    try:
        response = requests.get(doc_url, headers=headers, timeout=VAULT_TIMEOUT)
        response.raise_for_status()
        doc = response.json().get('document', {})
        status_v = doc.get('status__v')
        is_approved = status_v in ['Approved for Distribution', 'Approved for Production', 'Approved']
        return RegulatoryStatus(document_id=doc_id, is_approved=is_approved, status_v=status_v, lifecycle__v=doc.get('lifecycle__v'), message="CHECK PASSED" if is_approved else "CHECK FAILED")
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


@app.get("/list_approved_documents", response_model=List[QueryResult])
async def list_approved_documents(status_filter: str = 'Approved'):
    session_id = get_session_id()
    headers = {"Authorization": session_id, "Accept": "application/json"}
    
    query_url = f"https://{VAULT_DNS}/api/{API_VER}/query"
    vql_query = f"SELECT id, name__v, status__v, description__v, format__v FROM documents WHERE status__v = '{status_filter}'"
    
    try:
        query_response = requests.post(query_url, data={"q": vql_query}, headers=headers, timeout=VAULT_TIMEOUT)
        query_response.raise_for_status()
        docs_data = query_response.json().get('data') or []
        
        results = []
        for d in docs_data:
            doc_id = str(d['id'])
            
            # 1. Handle Friendly Asset Type (Dictionary Logic)
            val = d.get('format__v')
            raw_format = str(val).lower() if val is not None else ""
            asset_type = get_friendly_format(raw_format) # Using your existing helper

            # 2. Integrated Multi-Stage Text Extraction
            extracted_text = "No content available."
            
            # --- Stage A: Veeva Native Text ---
            text_url = f"https://{VAULT_DNS}/api/{API_VER}/objects/documents/{doc_id}/text"
            try:
                text_resp = requests.get(text_url, headers=headers, timeout=VAULT_TIMEOUT)
                if text_resp.status_code == 200 and text_resp.text.strip():
                    extracted_text = text_resp.text[:2000]
                else:
                    # --- Stage B: Fallback to PDF Rendition ---
                    rend_url = f"https://{VAULT_DNS}/api/{API_VER}/objects/documents/{doc_id}/renditions/viewable_rendition__v"
                    rend_resp = requests.get(rend_url, headers=headers, timeout=VAULT_TIMEOUT)
                    
                    if rend_resp.status_code == 200:
                        pdf_stream = io.BytesIO(rend_resp.content)
                        with fitz.open(stream=pdf_stream, filetype="pdf") as pdf_doc:
                            extracted_text = "".join([page.get_text() for page in pdf_doc])[:2000]
            except Exception:
                extracted_text = "Error during content extraction."

            results.append(QueryResult(
                document_id=doc_id,
                name=d.get('name__v', 'N/A'),
                status_v=d.get('status__v', 'N/A'),
                asset_type=asset_type, 
                description=d.get('description__v') or "No description provided.",
                document_content=extracted_text.strip() or "No text found in file."
            ))
            
        return results
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Error: {str(e)}")


# --- New Endpoint: Download Source File ---
@app.get("/download_source/{doc_id}")
async def download_source(doc_id: str):
    session_id = get_session_id()
    download_url = f"https://{VAULT_DNS}/api/{API_VER}/objects/documents/{doc_id}/file"
    
    # CHANGE: Remove 'application/octet-stream' or set to '*/*'
    headers = {
        "Authorization": session_id,
        "Accept": "*/*"  # This tells Veeva 'I will accept any response format'
    }

    try:
        response = requests.get(download_url, headers=headers, stream=True, timeout=VAULT_TIMEOUT)
        
        # If Veeva returns a JSON error instead of a file, catch it here
        if "application/json" in response.headers.get("Content-Type", ""):
            error_detail = response.json()
            raise HTTPException(status_code=400, detail=error_detail)

        if response.status_code != 200:
            raise HTTPException(status_code=response.status_code, detail="Vault error")

        content_disposition = response.headers.get("Content-Disposition", f"attachment; filename=document_{doc_id}")

        return StreamingResponse(
            response.iter_content(chunk_size=1024 * 8),
            media_type=response.headers.get("Content-Type", "application/octet-stream"),
            headers={"Content-Disposition": content_disposition}
        )

    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=502, detail=f"Download error: {str(e)}")
    


def get_friendly_format(mime_string: str) -> str:
    """
    Converts technical format strings to simple labels (html, png, pdf, etc.).
    Handles unknown formats by extracting the extension from the MIME type.
    """
    if not mime_string or mime_string == "Unknown":
        return "unknown"
    
    mime_lower = mime_string.lower().strip()
    
    # Tier 1: Precise Mapping
    format_map = {
        "pdf": "pdf",
        "wordprocessingml": "docx",
        "presentationml": "ppt",
        "spreadsheetml": "excel",
        "html": "html",
        "xhtml": "html",
        "png": "png",
        "jpeg": "jpg",
        "jpg": "jpg",
        "text/plain": "txt"
    }

    # Check for keywords in the string
    for tech_key, friendly_name in format_map.items():
        if tech_key in mime_lower:
            return friendly_name

    # Tier 2: Dynamic fallback for unspecified formats
    # Splits 'application/vnd.something+xml' -> 'xml'
    try:
        base_part = mime_lower.split('/')[-1] # gets 'xhtml+xml' or 'xml'
        clean_ext = base_part.split('+')[0].split('.')[-1]
        if clean_ext:
            return clean_ext
    except Exception:
        pass

    # Tier 3: Standard library guess
    guessed_ext = mimetypes.guess_extension(mime_lower)
    return guessed_ext.replace('.', '') if guessed_ext else "file"



@app.get("/get_document_text/{doc_id}", response_model=TextContentResponse)
async def get_document_text(doc_id: str):
    session_id = get_session_id()
    auth_header = f"Bearer {session_id}" if not session_id.startswith("Bearer ") else session_id
    headers = {"Authorization": auth_header}

    try:
        # --- STEP 1: Fetch Metadata (Name and Asset Type) ---
        meta_url = f"https://{VAULT_DNS}/api/{API_VER}/objects/documents/{doc_id}"
        meta_resp = requests.get(meta_url, headers=headers, timeout=VAULT_TIMEOUT)
        
        if meta_resp.status_code == 200:
            doc_data = meta_resp.json().get("document", {})
            doc_name = doc_data.get("name__v", "Unknown")
            raw_format = doc_data.get("format__v", "Unknown")
            
            # Use the helper to get html, png, jpg, etc.
            asset_type = get_friendly_format(raw_format)
        else:
            raise HTTPException(status_code=404, detail="Document metadata not found.")

        # --- STEP 2: Try Veeva's Native Text Extraction ---
        text_url = f"https://{VAULT_DNS}/api/{API_VER}/objects/documents/{doc_id}/text"
        text_headers = {**headers, "Accept": "text/plain"}
        
        text_response = requests.get(text_url, headers=text_headers, timeout=VAULT_TIMEOUT)
        
        if text_response.status_code == 200 and text_response.text.strip():
            return TextContentResponse(
                document_id=doc_id,
                file_name=doc_name,
                asset_type=asset_type,
                text_content=text_response.text,
                status="SUCCESS: Extracted via Veeva Text Index"
            )

        # --- STEP 3: Fallback to PDF Rendition (Works for PPT, Word, etc.) ---
        rendition_url = f"https://{VAULT_DNS}/api/{API_VER}/objects/documents/{doc_id}/renditions/viewable_rendition__v"
        rend_resp = requests.get(rendition_url, headers=headers, stream=True, timeout=VAULT_TIMEOUT)

        if rend_resp.status_code == 200:
            pdf_stream = io.BytesIO(rend_resp.content)
            with fitz.open(stream=pdf_stream, filetype="pdf") as doc:
                extracted_text = "".join([page.get_text() for page in doc])
            
            return TextContentResponse(
                document_id=doc_id,
                file_name=doc_name,
                asset_type=asset_type,
                text_content=extracted_text.strip() or "No text found in PDF.",
                status="SUCCESS: Extracted from Viewable Rendition (PDF)"
            )

        # Final return if no text is found anywhere
        return TextContentResponse(
            document_id=doc_id,
            file_name=doc_name,
            asset_type=asset_type,
            text_content="",
            status="FAILED: No text available"
        )

    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Error: {str(e)}")