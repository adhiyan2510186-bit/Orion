# FloatChat Architecture

Diagrams of the **system as built**, not as planned. Where the implementation diverged
from `IMPLEMENTATION_PLAN.md`, these reflect reality and the ADRs record why.

---

## 1. Component and data flow

Pluggable nodes are teal; generated contract artefacts are amber.

```mermaid
graph TB
    subgraph Client["Frontend - Next.js :3000"]
        UI["SearchBar<br/>features/search"]
        HOOKS["Hooks layer<br/>useArgoQuery · useMeta · useLayerBuilder<br/>usePlayback · useDepthProfile · useAnomalies"]
        CLIENT["lib/api/client.ts"]
        TRANS{"Transport<br/>HTTP | mock | future WS"}
        MAP["deck.gl OrbitView<br/>layer registry"]
        INSP["Inspector<br/>Recharts depth profile"]
        TOK["design/tokens.ts<br/>+ scales.ts"]
    end

    subgraph Edge["FastAPI - app/api/v1 :8000"]
        R1["POST /query"]
        R2["GET /floats/:wmo/profile"]
        R3["GET /meta"]
    end

    subgraph Core["Service layer"]
        QE["QueryEngine<br/>capability-aware split"]
        AN["Anomaly detector chain"]
        PROF["Profile diagnostics<br/>thermocline · MLD"]
    end

    subgraph Parsers["NLPParser registry"]
        P1["rule ✓ built"]
        P2["llm — not built<br/>no API key"]
    end

    subgraph Providers["DataProvider registry"]
        FB["FrameBackedProvider<br/>shared pandas logic"]
        D1["parquet ✓ default"]
        D2["netcdf ✓ raw GDAC"]
        D3["duckdb / postgis<br/>future"]
    end

    subgraph Domain["Domain layer"]
        UNITS["units.py<br/>QC masks · UNESCO depth<br/>sentinel scrub · lon wrap"]
        NC["argo_netcdf.py<br/>one reader, two consumers"]
    end

    subgraph Contract["contracts/*.schema.json"]
        SCH["31 definitions<br/>QuerySpec · ArgoFloatPoint<br/>DepthProfile · AnomalyTag"]
    end

    UI --> HOOKS --> CLIENT --> TRANS --> R1
    HOOKS --> MAP
    HOOKS --> INSP
    TOK -.-> MAP
    TOK -.-> INSP
    R3 --> QE
    R2 --> Providers
    R1 --> Parsers
    Parsers -->|QuerySpec| QE
    QE --> Providers
    QE --> AN
    Providers --> PROF
    D1 --> FB
    D2 --> FB
    D2 --> NC
    NC --> UNITS
    FB --> UNITS
    SCH -.generates.-> TRANS
    SCH -.generates.-> R1
    SCH -.validates.-> Providers
    SCH -.validates.-> Parsers

    classDef plug fill:#0f766e,stroke:#5eead4,color:#fff
    classDef contract fill:#7c2d12,stroke:#fdba74,color:#fff
    classDef unbuilt fill:#26231f,stroke:#97918a,color:#97918a,stroke-dasharray:4 3
    class P1,D1,D2,FB plug
    class SCH,TRANS contract
    class P2,D3 unbuilt
```

## 2. Low-latency spatio-temporal retrieval

The measured path for the headline query. Latencies are real, from the running system.

```mermaid
sequenceDiagram
    autonumber
    actor U as Scientist
    participant FE as useArgoQuery
    participant API as POST /query
    participant NLP as RuleParser
    participant QE as QueryEngine
    participant DP as ParquetProvider
    participant AN as Detector chain

    U->>FE: "marine heatwaves near the equator in 2026"
    FE->>FE: abort any in-flight request
    FE->>API: QueryRequest
    API->>NLP: parse(query, ParseContext{bounds, variables})
    Note over NLP: ParseContext carries the provider's real<br/>variables, so a parser cannot invent one
    NLP-->>API: QuerySpec + confidence 0.91 + unresolved[]
    Note over NLP,API: "heatwave" expands to BOTH<br/>temp > 29 °C AND depth 0-10 m
    API->>QE: execute(spec)
    QE->>DP: describe().capabilities
    DP-->>QE: {server_side_filtering, aggregation}
    QE->>DP: query_points(spec)
    DP->>DP: vectorised mask over 1,038,872 rows<br/>wrapped bbox = two OR-ed lon spans
    DP-->>QE: PointPage{411 points, total, truncated}
    QE->>DP: summarize(spec)
    Note over QE,DP: statistics over the FULL match, not the page -<br/>otherwise a truncated result reports<br/>"472,906 measurements from 1 float"
    DP-->>QE: QuerySummary
    QE->>AN: detect(points)
    AN-->>QE: AnomalyTag[] with auditable evidence
    QE-->>API: points + summary + anomalies
    API-->>FE: QueryResponse{meta:{provider, parser, latency_ms: 63}}
    FE->>FE: seed time domain from summary.time_range
    FE-->>U: 4D render + scrubber armed
```

## 3. Ingestion and normalisation

Every step here exists because a real GDAC file broke something without it.

```mermaid
flowchart LR
    subgraph Sources
        S1[("Ifremer GDAC<br/>data-argo.ifremer.fr")]
        S2[("data/raw/*.nc<br/>78 MB, gitignored")]
        S3[("data/samples/<br/>committed, 9 MB")]
    end

    subgraph Read["argo_netcdf.read_profile_file"]
        N1["decode byte identifiers<br/>object dtype wraps np.bytes_"]
        N2["prefer *_ADJUSTED<br/>when mode ≠ real-time"]
        N3["per-variable QC mask<br/>drops 1.71-52.02 PSU"]
        N4["scrub -999 / 9999 → null"]
        N5["lon wrap to ±180<br/>UNESCO pressure → depth"]
        N6["drop NaT timestamps<br/>never fabricate a time"]
    end

    subgraph Out["Normalised flat table"]
        F1["one row per<br/>(profile, level)"]
    end

    S1 -->|fetch_gdac.py| S2
    S2 --> N1 --> N2 --> N3 --> N4 --> N5 --> N6 --> F1
    F1 -->|seed_sample_data.py<br/>round to sensor resolution| S3
    S3 -->|ParquetProvider| Q["QueryEngine"]
    S2 -.->|NetCDFProvider<br/>direct, no pre-processing| Q

    classDef fix fill:#0f766e,stroke:#5eead4,color:#fff
    class N2,N3,N5 fix
```

## 4. Why swapping a provider is safe

```mermaid
flowchart TB
    T["tests/contract/test_provider_contract.py<br/>14 tests · PROVIDERS = [parquet, netcdf]"]
    T --> C1["limit honoured, truncation reported"]
    T --> C2["declared capabilities are TRUE<br/>over-claiming returns wrong results silently"]
    T --> C3["wrapped bbox matches both sides of 180°"]
    T --> C4["normalisation holds: ±90/±180, depth ≥ 0, Z-suffixed"]
    T --> C5["no implausible measurement survives QC"]
    T --> C6["summary describes the full match, not the page"]
    T --> C7["profiles depth-ordered, trajectories time-ordered"]

    C1 & C2 & C3 & C4 & C5 & C6 & C7 --> G{"29 tests pass<br/>= 14 × 2 providers + registry"}
    G --> OK["A new provider is trusted only<br/>once it answers identically"]

    classDef gate fill:#7c2d12,stroke:#fdba74,color:#fff
    class G gate
```

---

## Measured characteristics

| | |
|---|---|
| Fixture | 1,038,872 measurements · 12 floats · 1,567 profiles · 5.9 MB |
| Query latency | 63 ms (surface heatwave, 411 results) to 311 ms (472k-row deep scan) |
| Startup | Parquet ~0.4 s · NetCDF ~1 s per float |
| Frontend smoke test | 15/15 (`npm run verify`) — WebGL paints, query round-trips, picking works |
| Frame rate | **not verified** — software rasteriser only, ADR 0003 |
| Backend tests | 78 green |
| Contract definitions | 31, generation verified idempotent |

## Divergences from the plan

| Planned | Built | Why |
|---|---|---|
| `csv` provider | `parquet` | 159 MB vs 5.9 MB — see ADR 0001 |
| `llm` parser (P8) | not built | No API key; decided with the user. The rule parser is the permanent fallback, not a placeholder. |
| Dark + light + colorblind themes | dark only | Decided with the user; one ground fully resolved beats three partial ones |
| Per-provider duplicate logic | `FrameBackedProvider` | Two providers sharing query logic cannot drift apart |
