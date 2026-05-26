# DocMind AI 🧠

DocMind AI is a state-of-the-art, multimodal document intelligence SaaS platform that can parse, analyze, categorize, and query various document formats (PDFs, Images, DOCX, TXT, Invoices, Resumes, and Handwritten notes). 

Combining **Classical OCR engines**, **OpenCV preprocessing**, **Groq Vision-Language Models (VLMs)**, and **Semantic Retrieval-Augmented Generation (RAG)**, DocMind AI delivers contextual answers with source page citations and deep document diagnostics.

---

## 🚀 Key Features

* **AI Document Summarizer**: Automatically generates structured multi-level summaries (TL;DR, executive highlights, action items checklist, detailed overview).
* **Interactive Citations RAG Chat**: Conversational chat interface backed by semantic search with clickable page and text citations. Includes Web Speech API for voice search and voice reader.
* **Hybrid Multimodal OCR**: Image preprocessing using OpenCV (grayscale binarization, noise reduction, deskewing) and Tesseract, refined using Groq `llama-3.2-11b-vision-preview` to resolve handwritten notes and layout tables.
* **Resume Intelligence (ATS Matcher)**: Matches resumes against custom job descriptions, returning matching scores, keyword coverage analysis, missing skills list, and resume optimization tips.
* **Fake Document Forensics**: Inspects EXIF metadata for photoshop footprint logs, flags text block misalignments (tampered overlays), and performs mathematical checks of line items.
* **Legal Risk & Urgency Engine**: Flags contract liabilities (indemnification, waivers), maps sentiment tone, and categorizes urgency based on deadlines.
* **Intelligence Report Exporter**: Download structured Markdown analytical reports summarizing all insights.

---

## 🛠️ Tech Stack

* **Frontend**: React (Vite) + Tailwind CSS (v3) + Lucide Icons + Recharts
* **Backend**: FastAPI (Python 3.10) + Uvicorn
* **Database**: MongoDB Atlas (async Motor connection driver)
* **Vector Store**: FAISS (isolated per-document binary indices)
* **Embeddings**: Sentence-Transformers (`all-MiniLM-L6-v2`)
* **AI Models**: Groq Cloud API
  - `llama-3.3-70b-versatile` (High-reasoning RAG & ATS Analysis)
  - `llama-3.2-11b-vision-preview` (OCR layout alignment and correction)
  - `mixtral-8x7b-32768` (Rapid text summaries)
* **OCR Suite**: Tesseract OCR engine + OpenCV + PIL (Pillow)

---

## 📂 Repository Layout

```
docmind-ai/
├── backend/
│   ├── app/
│   │   ├── api/          # Auth, documents, chat, insights, analytics routes
│   │   ├── core/         # Config loader, Security helpers, MongoDB client
│   │   ├── models/       # Pydantic schemas (User, Document, Chat)
│   │   ├── services/     # Groq client, OCR preprocessors, FAISS RAG, Forensics
│   │   └── main.py       # FastAPI application bootstrap
│   ├── requirements.txt  # Python packages
│   └── Dockerfile        # Container setup
├── frontend/
│   ├── src/
│   │   ├── components/   # UI view layouts (Dashboard, Chat, Previewer, Upload)
│   │   ├── context/      # AuthContext and ThemeContext
│   │   ├── services/     # Axios client configuration
│   │   ├── App.jsx       # Main navigation router
│   │   └── main.jsx      # React mounting entrypoint
│   ├── tailwind.config.js
│   └── package.json
└── README.md
```

---

## ⚙️ Setup & Configuration

### Prerequisites
* Python 3.10+
* Node.js v16+
* Tesseract OCR binary (install details below)
* MongoDB Atlas cluster account
* Groq API access token

---

### Step 1: Install Tesseract Binary
* **Windows**: Download installer from [UB Mannheim](https://github.com/UB-Mannheim/tesseract/wiki). Add `C:\Program Files\Tesseract-OCR` to your system environment variables `PATH`.
* **Mac**: `brew install tesseract`
* **Linux**: `sudo apt-get install tesseract-ocr`

---

### Step 2: Configure Backend Service

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a python virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```
3. Install package requirements:
   ```bash
   pip install -r requirements.txt
   ```
4. Create a `.env` file using the template:
   ```bash
   cp .env.example .env
   ```
5. Populate `.env` with your active database URI and Groq credentials:
   ```env
   MONGO_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/docmind_db
   GROQ_API_KEY=gsk_your_groq_api_key
   ```
6. Run the FastAPI development server:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```
   API Swagger docs will be accessible at [http://localhost:8000/docs](http://localhost:8000/docs).

---

### Step 3: Configure Frontend App

1. Navigate to the frontend directory:
   ```bash
   cd ../frontend
   ```
2. Install Node packages:
   ```bash
   npm install
   ```
3. Run the Vite React developer server:
   ```bash
   npm run dev
   ```
   Open your browser to the URL printed in the CLI (default: [http://localhost:5173](http://localhost:5173)).

---

## 🐳 Docker Deployment

To build and run the backend inside a Docker container (incorporating OpenCV and Tesseract libraries):
```bash
cd backend
docker build -t docmind-backend .
docker run -p 8000:8000 --env-file .env docmind-backend
```

---

## 📜 Resume Description Details

**DocMind AI — Multimodal Document Analysis & Insights SaaS Platform**
* Architected and developed a full-stack SaaS platform utilizing FastAPI, React.js, and MongoDB Atlas to analyze text, images, invoices, and research papers.
* Built a hybrid OCR pipeline using OpenCV (binarization, skew correction), Tesseract OCR, and Groq Llama 3.2 Vision to clean OCR errors and reconstruct markdown tables from scans.
* Engineered a custom RAG solution incorporating semantic chunking (calculating embedding distances of consecutive sentences), local Sentence-Transformers, and FAISS indices to support real-time user-document chatting with citations.
* Implemented specialized AI modules including EXIF and layout forensics for fake document detection, contract risk evaluation, and an ATS resume matcher.
