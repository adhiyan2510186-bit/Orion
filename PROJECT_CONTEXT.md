# FloatChat: Multi-Modal Semantic Query Engine & 4D Visualization for ARGO Oceanographic Data

## 1. Executive Summary & Domain Overview
Global ocean climate monitoring relies on thousands of autonomous robotic ARGO profiling floats drifting through ocean depths, sampling salinity, temperature, and geochemical variables from the surface down to 2,000 meters depth. 

The goal of **FloatChat** is to build an intelligent, production-grade natural-language query interface combined with a spatio-temporal 4D WebGL visualization pipeline. This platform enables marine scientists, oceanographers, and policy analysts to query, cross-correlate, and forecast marine anomalies using multi-modal LLM reasoning and interactive 3D/4D spatial mapping.

---

## 2. Core Problem Statement Requirements

### Round 1 Technical Submission Criteria:
1. **Interactive WebGL 4D Marine Data Exploration Portal:**
   - 3D spatial mapping ($X$ = Longitude, $Y$ = Latitude, $Z$ = Depth/Pressure).
   - Time-series scrubbing capability (the 4th dimension) to observe trajectory movement and anomaly progression over time.
   - Dynamic visual encoding (e.g., color-coding water column points by temperature/salinity levels).

2. **Natural-Language Query Engine with NetCDF Multi-Variable Parsing:**
   - Extraction and ingestion of standard ARGO ocean variables (Latitude, Longitude, Pressure/Depth, Sea Water Temperature, Salinity, Timestamp, WMO Float ID).
   - Natural language to structured geospatial/temporal NetCDF queries (e.g., converting "marine heatwaves near the equator in 2026" into explicit spatio-temporal filters).

3. **Demonstration of Real ARGO Profiling Float Telemetry Ingestion:**
   - Python-based pipeline capable of reading and processing NetCDF/CSV datasets or fetching live float telemetry from ARGO GDAC (Global Data Assembly Centre) sources.

4. **Architecture Diagram Demonstrating Low-Latency Spatio-Temporal Retrieval:**
   - A clear operational diagram (Mermaid.js format) mapping the data lifecycle: Data Ingestion -> Spatial Vector/Parquet Indexing -> FastAPI Query Router -> WebGL Web Client.

---

## 3. Key Deliverables & System Architecture

### A. Core Deliverable Focus:
* **Natural Language to Geospatial/Temporal Queries:** Intent parsing using LLMs (with Tool/Function Calling) to translate human queries into bounds, thresholds, and SQL/Pandas filters.
* **Interactive 4D Spatio-Temporal Trajectory Renderer:** WebGL canvas rendering float points and trajectories in 3D depth space with time controls.
* **Thermocline & Salinity Gradient Depth-Profile Cross-Sections:** Linked analytical dashboard panels showing depth profile line charts (Temperature/Salinity vs. Depth) for selected floats.
* **Automated Marine Heatwave & Ocean Anomaly Detection:** Rule-based and semantic anomaly classification (e.g., flagging temperatures > 29°C as surface heatwaves).

### B. Recommended Tech Stack:
* **Frontend:** Next.js (React), Tailwind CSS, Deck.gl / React Three Fiber / Three.js (WebGL rendering framework), Lucide React, Recharts / Plotly.js.
* **Backend API:** Python (FastAPI), Uvicorn.
* **Data Ingestion & Processing:** Pandas, Xarray, NetCDF4, NumPy.
* **Semantic Vector & AI Engine:** OpenAI / Anthropic API (or local LLM provider) with structured tool calling / schema enforcement.
* **Diagrams & Documentation:** Mermaid.js architecture specs.

---

## 4. Expected System Workflow

1. **Data Ingestion Pipeline:** 
   - Backend loads and normalizes NetCDF/CSV ARGO float dataset into an in-memory spatio-temporal index (e.g., Pandas DataFrame / GeoPandas / Parquet format).
2. **Natural Language Interface:**
   - User inputs a plain text prompt via the frontend search bar.
   - FastAPI `/api/query` receives the prompt, invokes the LLM to extract structured search parameters (lat/lon bounding box, depth range, date range, temperature/salinity anomaly thresholds).
3. **Execution & Response Generation:**
   - Backend executes the generated filter over the dataset and returns matching 4D point arrays along with summary statistics and anomaly tags.
4. **Interactive Visualization:**
   - Frontend Deck.gl / WebGL engine updates map point layers in real time.
   - Time slider animates spatial trajectories over time.
   - Clicking a float trajectory triggers a sidebar containing the depth profile cross-section (Thermocline graph).

---

## 5. Instructions for Claude Code

As the principal software architect and developer:
1. **Planning:** Review these requirements and construct a modular, step-by-step development roadmap in `IMPLEMENTATION_PLAN.md`.
2. **Monorepo Setup:** Establish a clean codebase structure with `backend/` (FastAPI + Python data tools) and `frontend/` (Next.js + WebGL).
3. **Execution:** Build the complete end-to-end working software autonomously. Include setup scripts, sample ARGO data, data ingestion routines, the natural-language query router, the 4D WebGL map canvas, depth profile graphs, and a Mermaid.js system architecture diagram.
4. **Self-Correction:** Build cleanly without stopping for intermediate prompts; handle dependencies and fix any syntax/build errors until the entire system is verified functional.

## 6. Extensibility & Modular Architecture Guidelines
This build is a foundational baseline intended for incremental upgrades. Enforce strict modularity:

1. **Frontend Architecture (Pluggable UI):**
   - **Feature-Based Folder Structure:** Organize code by feature (e.g., `components/map/`, `components/inspector/`, `components/search/`, `lib/hooks/`) rather than flat component dumps.
   - **Data Layer Abstraction:** Do NOT hardcode API calls directly inside visual React components. Abstract all network requests into custom hooks (e.g., `useArgoQuery()`, `useFloatDetails()`) or dedicated API services (`lib/api.ts`).
   - **Theme & Design Tokens:** Centralize color schemes, typography, and status tags in Tailwind config and design token constants so UI theme upgrades require zero component refactoring.

2. **Backend Architecture (Pluggable Processing):**
   - **Adapter Pattern for Ingestion:** Wrap NetCDF/ARGO data loading inside an abstract DataProvider interface (`providers/argo_provider.py`). This allows swapping local JSON/CSV mock data for a live GDAC vector database or Parquet pipeline without touching the API endpoints.
   - **Modular Query Pipeline:** Separate the Natural Language Parser (`services/nlp_parser.py`) from the Data Filtering Engine (`services/query_engine.py`). Future teams should be able to swap out rule-based/OpenAI parsers for local LLMs (e.g., Ollama/LangChain) seamlessly.

3. **Schema Contract & Types:**
   - Define strict TypeScript interfaces for all float data points, trajectory arrays, depth profiles, and query requests in `types/argo.ts`.
   - Maintain matching Pydantic schemas in FastAPI (`schemas/argo.py`) to keep API contracts strictly typed.