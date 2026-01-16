import os
import re
import ssl
from uuid import UUID # Added for UUID support
from datetime import datetime, date
from typing import Optional, List, Dict, Any
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
import asyncpg
from dotenv import load_dotenv

# Load variables from .env
load_dotenv()

app = FastAPI(title="Content Orchestrator API")
pool=None

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Shared Database Connection Pool
pool = None

@app.on_event("startup")
async def startup():
    global pool
    try:
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE 

        pool = await asyncpg.create_pool(
            dsn=os.getenv("DATABASE_URL"),
            ssl=ctx,
            min_size=1,
            max_size=10
        )
        print("Successfully connected to AWS RDS via SSL.")
    except Exception as e:
        print(f"Database connection error: {e}")

@app.on_event("shutdown")
async def shutdown():
    if pool:
        await pool.close()
        print("Database connection pool closed.")

# --- Pydantic Model (UPDATED to UUID) ---
class ProjectSchema(BaseModel):
    name: str
    # created_at is optional because the DB usually handles the timestamp
    created_at: Optional[datetime] = None
    
class ContentAssetSchema(BaseModel):
    project_id: UUID  # Changed from int
    brand_id: UUID    # Changed from int
    asset_name: str
    asset_type: str
    content_category: Optional[str] = None
    status: Optional[str] = "draft"
    primary_content: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    target_audience: Optional[str] = None
    channel_specifications: Optional[Dict[str, Any]] = None
    compliance_notes: Optional[str] = None
    performance_prediction: Optional[Dict[str, Any]] = None
    ai_analysis: Optional[Dict[str, Any]] = None
    created_by: UUID  # Changed from int
    updated_by: Optional[UUID] = None # Changed from int
    theme_id: Optional[UUID] = None    # Changed from int
    intake_context: Optional[Dict[str, Any]] = None
    linked_pi_ids: Optional[List[int]] = None

class CrossModuleContextSchema(BaseModel):
    user_id: UUID
    session_id: str
    brand_id: UUID
    context_type: str
    context_data: Dict[str, Any]  # jsonb in DB
    selections: Dict[str, Any]    # jsonb in DB
    metadata: Dict[str, Any]      # jsonb in DB
    is_active: bool               # boolean in DB
    therapeutic_area: Optional[str] = None # Nullable in DB

class ContentPerformanceSchema(BaseModel):
    content_registry_id: Optional[UUID] = None
    brand_id: UUID
    engagement_rate: Optional[float] = None
    conversion_rate: Optional[float] = None
    channel: Optional[str] = None
    audience_segment: Optional[str] = None
    source_system: str
    data_quality_score: Optional[int] = None
    theme_id: Optional[UUID] = None
    claims_used: Optional[List[str]] = []
    segments_used: Optional[List[str]] = []
    patterns_used: Optional[List[str]] = []

class LocalizationProjectSchema(BaseModel):
    brand_id: UUID
    project_name: str
    description: Optional[str] = None
    source_content_type: str
    source_content_id: Optional[UUID] = None
    target_markets: Dict[str, Any] = {}
    target_languages: Dict[str, Any] = {}
    project_type: str
    status: str
    priority_level: Optional[str] = None
    business_impact_score: Optional[int] = None
    content_readiness_score: Optional[int] = None
    total_budget: Optional[float] = None
    estimated_timeline: Optional[int] = None
    actual_timeline: Optional[int] = None
    regulatory_complexity: Optional[str] = None
    cultural_sensitivity_level: Optional[str] = None
    mlr_inheritance: Optional[Dict[str, Any]] = None
    metadata: Optional[Dict[str, Any]] = None
    created_by: Optional[UUID] = None
    updated_by: Optional[UUID] = None
    workflow_state: Optional[Dict[str, Any]] = None
    original_project_id: Optional[UUID] = None
    copy_number: Optional[int] = 0
    usage_count: Optional[int] = 0
    is_template: Optional[bool] = False
    last_auto_save: Optional[datetime] = None

class BrandMarketConfigSchema(BaseModel):
    brand_id: UUID
    market_code: str
    market_name: str
    language_code: str
    language_name: str
    is_primary_market: Optional[bool] = False
    therapeutic_area_relevance: Optional[int] = 50
    regulatory_complexity: Optional[str] = "medium"
    estimated_timeline_weeks: Optional[str] = "4-6 weeks"
    complexity_factors: Optional[List[Any]] = [] # jsonb field
    is_active: Optional[bool] = True

class BrandProfileSchema(BaseModel):
    brand_name: str
    company: str
    therapeutic_area: str
    logo_url: Optional[str] = None
    primary_color: str
    secondary_color: str
    accent_color: str
    font_family: Optional[str] = "Inter"

class ContentSessionSchema(BaseModel):
    user_id: UUID
    project_id: Optional[UUID] = None
    asset_id: Optional[UUID] = None
    session_type: str
    session_state: Dict[str, Any]  # jsonb - NO (Required)
    auto_save_data: Optional[Dict[str, Any]] = None # jsonb - YES
    last_activity: datetime = datetime.now()
    is_active: bool = True
class SegmentedContentSchema(BaseModel):
    document_name: str
    segmented_no: Optional[str] = None
    description: Optional[str] = None
    
class TranslatedContentSchema(BaseModel):
    source_text: str
    target_text: str
    source_language: str
    target_language: str
 
# --- CRUD ROUTES ---
# --- SIMPLE PROJECTS ROUTES (Integer ID) ---

@app.get("/api/projects")
async def get_projects():
    async with pool.acquire() as conn:
        rows = await conn.fetch("SELECT * FROM projects ORDER BY id ASC")
        return [dict(row) for row in rows]

@app.post("/api/projects", status_code=201)
async def create_project(project: ProjectSchema):
    async with pool.acquire() as conn:
        # We only insert 'name'. DB handles the integer ID and created_at.
        row = await conn.fetchrow(
            "INSERT INTO projects (name) VALUES ($1) RETURNING *",
            project.name
        )
        return dict(row)

@app.put("/api/projects/{project_id}")
async def update_project(project_id: int, project: ProjectSchema):
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "UPDATE projects SET name = $1 WHERE id = $2 RETURNING *",
            project.name, project_id
        )
        if not row:
            raise HTTPException(status_code=404, detail="Project not found")
        return dict(row)

@app.delete("/api/projects/{project_id}", status_code=204)
async def delete_project(project_id: int):
    async with pool.acquire() as conn:
        result = await conn.execute("DELETE FROM projects WHERE id = $1", project_id)
        if result == "DELETE 0":
            raise HTTPException(status_code=404, detail="Project not found")
        return None
    
@app.get("/api/health")
async def health():
    async with pool.acquire() as conn:
        now = await conn.fetchval("SELECT NOW()")
        return {"status": "ok", "db_time": now}

@app.get("/api/content-assets")
async def read_assets():
    async with pool.acquire() as conn:
        rows = await conn.fetch("SELECT * FROM content_assets ORDER BY created_at DESC")
        return [dict(row) for row in rows]

@app.post("/api/content-assets", status_code=201)
async def create_asset(asset: ContentAssetSchema):
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            INSERT INTO content_assets (
                project_id, brand_id, asset_name, asset_type, content_category, 
                status, primary_content, metadata, target_audience, 
                channel_specifications, compliance_notes, performance_prediction, 
                ai_analysis, created_by, theme_id, intake_context, linked_pi_ids
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17) 
            RETURNING *
            """,
            asset.project_id, asset.brand_id, asset.asset_name, asset.asset_type,
            asset.content_category, asset.status, asset.primary_content, asset.metadata,
            asset.target_audience, asset.channel_specifications, asset.compliance_notes,
            asset.performance_prediction, asset.ai_analysis, asset.created_by,
            asset.theme_id, asset.intake_context, asset.linked_pi_ids
        )
        return dict(row)

@app.put("/api/content-assets/{asset_id}")
async def update_asset(asset_id: UUID, asset: ContentAssetSchema): # asset_id is now UUID
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            UPDATE content_assets SET 
                project_id=$1, brand_id=$2, asset_name=$3, asset_type=$4, 
                content_category=$5, status=$6, primary_content=$7, metadata=$8, 
                target_audience=$9, channel_specifications=$10, compliance_notes=$11, 
                performance_prediction=$12, ai_analysis=$13, updated_by=$14, 
                theme_id=$15, intake_context=$16, linked_pi_ids=$17, updated_at=NOW()
            WHERE id = $18 RETURNING *
            """,
            asset.project_id, asset.brand_id, asset.asset_name, asset.asset_type,
            asset.content_category, asset.status, asset.primary_content, asset.metadata,
            asset.target_audience, asset.channel_specifications, asset.compliance_notes,
            asset.performance_prediction, asset.ai_analysis, asset.updated_by,
            asset.theme_id, asset.intake_context, asset.linked_pi_ids, asset_id
        )
        if not row:
            raise HTTPException(status_code=404, detail="Asset not found")
        return dict(row)

@app.delete("/api/content-assets/{asset_id}", status_code=204)
async def delete_asset(asset_id: UUID): # asset_id is now UUID
    async with pool.acquire() as conn:
        result = await conn.execute("DELETE FROM content_assets WHERE id = $1", asset_id)
        if result == "DELETE 0":
            raise HTTPException(status_code=404, detail="Asset not found")
        return None

@app.get("/api/cross-module-context")
async def get_all_contexts():
    async with pool.acquire() as conn:
        rows = await conn.fetch("SELECT * FROM cross_module_context ORDER BY created_at DESC")
        return [dict(row) for row in rows]

@app.post("/api/cross-module-context", status_code=201)
async def create_context(ctx: CrossModuleContextSchema):
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            INSERT INTO cross_module_context (
                user_id, session_id, brand_id, context_type, 
                context_data, selections, metadata, is_active, therapeutic_area
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
            RETURNING *
            """,
            ctx.user_id, ctx.session_id, ctx.brand_id, ctx.context_type,
            ctx.context_data, ctx.selections, ctx.metadata, ctx.is_active, ctx.therapeutic_area
        )
        return dict(row)

@app.put("/api/cross-module-context/{ctx_id}")
async def update_context(ctx_id: UUID, ctx: CrossModuleContextSchema):
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            UPDATE cross_module_context SET 
                user_id=$1, session_id=$2, brand_id=$3, context_type=$4, 
                context_data=$5, selections=$6, metadata=$7, is_active=$8, 
                therapeutic_area=$9, updated_at=NOW()
            WHERE id = $10 RETURNING *
            """,
            ctx.user_id, ctx.session_id, ctx.brand_id, ctx.context_type,
            ctx.context_data, ctx.selections, ctx.metadata, ctx.is_active, 
            ctx.therapeutic_area, ctx_id
        )
        if not row:
            raise HTTPException(status_code=404, detail="Context record not found")
        return dict(row)

@app.delete("/api/cross-module-context/{ctx_id}", status_code=204)
async def delete_context(ctx_id: UUID):
    async with pool.acquire() as conn:
        result = await conn.execute("DELETE FROM cross_module_context WHERE id = $1", ctx_id)
        if result == "DELETE 0":
            raise HTTPException(status_code=404, detail="Context record not found")
        return None
    
# --- CRUD ROUTES for Performance Attribution ---

@app.get("/api/content-performance-attribution")
async def get_performance_data():
    async with pool.acquire() as conn:
        rows = await conn.fetch("SELECT * FROM content_performance_attribution ORDER BY created_at DESC")
        return [dict(row) for row in rows]

@app.post("/api/content-performance-attribution", status_code=201)
async def create_performance_record(record: ContentPerformanceSchema):
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            INSERT INTO content_performance_attribution (
                content_registry_id, brand_id, engagement_rate, conversion_rate,
                channel, audience_segment, source_system, data_quality_score,
                theme_id, claims_used, segments_used, patterns_used
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) 
            RETURNING *
            """,
            record.content_registry_id, record.brand_id, record.engagement_rate,
            record.conversion_rate, record.channel, record.audience_segment,
            record.source_system, record.data_quality_score, record.theme_id,
            record.claims_used, record.segments_used, record.patterns_used
        )
        return dict(row)

@app.put("/api/content-performance-attribution/{record_id}")
async def update_performance_record(record_id: UUID, record: ContentPerformanceSchema):
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            UPDATE content_performance_attribution SET 
                content_registry_id=$1, 
                brand_id=$2, 
                engagement_rate=$3, 
                conversion_rate=$4,
                channel=$5, 
                audience_segment=$6, 
                source_system=$7, 
                data_quality_score=$8,
                theme_id=$9, 
                claims_used=$10, 
                segments_used=$11, 
                patterns_used=$12
            WHERE id = $13 
            RETURNING *
            """,
            record.content_registry_id, record.brand_id, record.engagement_rate,
            record.conversion_rate, record.channel, record.audience_segment,
            record.source_system, record.data_quality_score, record.theme_id,
            record.claims_used, record.segments_used, record.patterns_used,
            record_id
        )
        if not row:
            raise HTTPException(status_code=404, detail="Performance record not found")
        return dict(row)

@app.delete("/api/content-performance-attribution/{record_id}", status_code=204)
async def delete_performance_record(record_id: UUID):
    async with pool.acquire() as conn:
        result = await conn.execute(
            "DELETE FROM content_performance_attribution WHERE id = $1", 
            record_id
        )
        # result returns a string like "DELETE 1"
        if result == "DELETE 0":
            raise HTTPException(status_code=404, detail="Performance record not found")
        return None
    
# --- LOCALIZATION PROJECTS ROUTES ---

@app.get("/api/localization-projects")
async def get_localization_projects():
    async with pool.acquire() as conn:
        rows = await conn.fetch("SELECT * FROM localization_projects ORDER BY created_at DESC")
        return [dict(row) for row in rows]

@app.post("/api/localization-projects", status_code=201)
async def create_localization_project(proj: LocalizationProjectSchema):
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            INSERT INTO localization_projects (
                brand_id, project_name, description, source_content_type, 
                source_content_id, target_markets, target_languages, project_type, 
                status, priority_level, business_impact_score, content_readiness_score, 
                total_budget, estimated_timeline, actual_timeline, regulatory_complexity, 
                cultural_sensitivity_level, mlr_inheritance, metadata, created_by, 
                updated_by, workflow_state, original_project_id, copy_number, 
                usage_count, is_template, last_auto_save
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 
                      $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27) 
            RETURNING *
            """,
            proj.brand_id, proj.project_name, proj.description, proj.source_content_type,
            proj.source_content_id, proj.target_markets, proj.target_languages, proj.project_type,
            proj.status, proj.priority_level, proj.business_impact_score, proj.content_readiness_score,
            proj.total_budget, proj.estimated_timeline, proj.actual_timeline, proj.regulatory_complexity,
            proj.cultural_sensitivity_level, proj.mlr_inheritance, proj.metadata, proj.created_by,
            proj.updated_by, proj.workflow_state, proj.original_project_id, proj.copy_number,
            proj.usage_count, proj.is_template, proj.last_auto_save
        )
        return dict(row)

@app.put("/api/localization-projects/{project_id}")
async def update_localization_project(project_id: UUID, proj: LocalizationProjectSchema):
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            UPDATE localization_projects SET 
                brand_id=$1, project_name=$2, description=$3, source_content_type=$4, 
                source_content_id=$5, target_markets=$6, target_languages=$7, project_type=$8, 
                status=$9, priority_level=$10, business_impact_score=$11, content_readiness_score=$12, 
                total_budget=$13, estimated_timeline=$14, actual_timeline=$15, regulatory_complexity=$16, 
                cultural_sensitivity_level=$17, mlr_inheritance=$18, metadata=$19, created_by=$20, 
                updated_by=$21, workflow_state=$22, original_project_id=$23, copy_number=$24, 
                usage_count=$25, is_template=$26, last_auto_save=$27, updated_at=NOW()
            WHERE id = $28 RETURNING *
            """,
            proj.brand_id, proj.project_name, proj.description, proj.source_content_type,
            proj.source_content_id, proj.target_markets, proj.target_languages, proj.project_type,
            proj.status, proj.priority_level, proj.business_impact_score, proj.content_readiness_score,
            proj.total_budget, proj.estimated_timeline, proj.actual_timeline, proj.regulatory_complexity,
            proj.cultural_sensitivity_level, proj.mlr_inheritance, proj.metadata, proj.created_by,
            proj.updated_by, proj.workflow_state, proj.original_project_id, proj.copy_number,
            proj.usage_count, proj.is_template, proj.last_auto_save, project_id
        )
        if not row:
            raise HTTPException(status_code=404, detail="Project not found")
        return dict(row)

@app.delete("/api/localization-projects/{project_id}", status_code=204)
async def delete_localization_project(project_id: UUID):
    async with pool.acquire() as conn:
        result = await conn.execute("DELETE FROM localization_projects WHERE id = $1", project_id)
        if result == "DELETE 0":
            raise HTTPException(status_code=404, detail="Project not found")
        return None
    
# --- BRAND MARKET CONFIGURATION ROUTES ---

@app.get("/api/brand-market-configs")
async def get_market_configs():
    async with pool.acquire() as conn:
        rows = await conn.fetch("SELECT * FROM brand_market_configurations ORDER BY market_name ASC")
        return [dict(row) for row in rows]

@app.post("/api/brand-market-configs", status_code=201)
async def create_market_config(config: BrandMarketConfigSchema):
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            INSERT INTO brand_market_configurations (
                brand_id, market_code, market_name, language_code, language_name,
                is_primary_market, therapeutic_area_relevance, regulatory_complexity,
                estimated_timeline_weeks, complexity_factors, is_active
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) 
            RETURNING *
            """,
            config.brand_id, config.market_code, config.market_name, 
            config.language_code, config.language_name, config.is_primary_market, 
            config.therapeutic_area_relevance, config.regulatory_complexity, 
            config.estimated_timeline_weeks, config.complexity_factors, config.is_active
        )
        return dict(row)

@app.put("/api/brand-market-configs/{config_id}")
async def update_market_config(config_id: UUID, config: BrandMarketConfigSchema):
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            UPDATE brand_market_configurations SET 
                brand_id=$1, market_code=$2, market_name=$3, language_code=$4, 
                language_name=$5, is_primary_market=$6, therapeutic_area_relevance=$7, 
                regulatory_complexity=$8, estimated_timeline_weeks=$9, 
                complexity_factors=$10, is_active=$11, updated_at=NOW()
            WHERE id = $12 RETURNING *
            """,
            config.brand_id, config.market_code, config.market_name, 
            config.language_code, config.language_name, config.is_primary_market, 
            config.therapeutic_area_relevance, config.regulatory_complexity, 
            config.estimated_timeline_weeks, config.complexity_factors, 
            config.is_active, config_id
        )
        if not row:
            raise HTTPException(status_code=404, detail="Configuration not found")
        return dict(row)

@app.delete("/api/brand-market-configs/{config_id}", status_code=204)
async def delete_market_config(config_id: UUID):
    async with pool.acquire() as conn:
        result = await conn.execute("DELETE FROM brand_market_configurations WHERE id = $1", config_id)
        if result == "DELETE 0":
            raise HTTPException(status_code=404, detail="Configuration not found")
        return None

# --- BRAND PROFILES ROUTES ---

@app.get("/api/brand-profiles")
async def get_brands():
    async with pool.acquire() as conn:
        rows = await conn.fetch("SELECT * FROM brand_profiles ORDER BY brand_name ASC")
        return [dict(row) for row in rows]

@app.post("/api/brand-profiles", status_code=201)
async def create_brand(brand: BrandProfileSchema):
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            INSERT INTO brand_profiles (
                brand_name, company, therapeutic_area, logo_url, 
                primary_color, secondary_color, accent_color, font_family
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
            RETURNING *
            """,
            brand.brand_name, brand.company, brand.therapeutic_area, 
            brand.logo_url, brand.primary_color, brand.secondary_color, 
            brand.accent_color, brand.font_family
        )
        return dict(row)

@app.put("/api/brand-profiles/{brand_id}")
async def update_brand(brand_id: UUID, brand: BrandProfileSchema):
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            UPDATE brand_profiles SET 
                brand_name=$1, company=$2, therapeutic_area=$3, logo_url=$4, 
                primary_color=$5, secondary_color=$6, accent_color=$7, 
                font_family=$8, updated_at=NOW()
            WHERE id = $9 RETURNING *
            """,
            brand.brand_name, brand.company, brand.therapeutic_area, 
            brand.logo_url, brand.primary_color, brand.secondary_color, 
            brand.accent_color, brand.font_family, brand_id
        )
        if not row:
            raise HTTPException(status_code=404, detail="Brand not found")
        return dict(row)

@app.delete("/api/brand-profiles/{brand_id}", status_code=204)
async def delete_brand(brand_id: UUID):
    async with pool.acquire() as conn:
        result = await conn.execute("DELETE FROM brand_profiles WHERE id = $1", brand_id)
        if result == "DELETE 0":
            raise HTTPException(status_code=404, detail="Brand not found")
        return None
    
# --- CONTENT SESSIONS ROUTES ---

@app.get("/api/content-sessions")
async def get_sessions():
    async with pool.acquire() as conn:
        rows = await conn.fetch("SELECT * FROM content_sessions ORDER BY last_activity DESC")
        return [dict(row) for row in rows]

@app.post("/api/content-sessions", status_code=201)
async def create_session(session: ContentSessionSchema):
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            INSERT INTO content_sessions (
                user_id, project_id, asset_id, session_type, 
                session_state, auto_save_data, last_activity, is_active
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
            RETURNING *
            """,
            session.user_id, session.project_id, session.asset_id, 
            session.session_type, session.session_state, session.auto_save_data, 
            session.last_activity, session.is_active
        )
        return dict(row)

@app.put("/api/content-sessions/{session_id}")
async def update_session(session_id: UUID, session: ContentSessionSchema):
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            UPDATE content_sessions SET 
                user_id=$1, project_id=$2, asset_id=$3, session_type=$4, 
                session_state=$5, auto_save_data=$6, is_active=$7,
                last_activity=NOW()
            WHERE id = $8 RETURNING *
            """,
            session.user_id, session.project_id, session.asset_id, 
            session.session_type, session.session_state, session.auto_save_data, 
            session.is_active, session_id
        )
        if not row:
            raise HTTPException(status_code=404, detail="Session not found")
        return dict(row)

@app.delete("/api/content-sessions/{session_id}", status_code=204)
async def delete_session(session_id: UUID):
    async with pool.acquire() as conn:
        result = await conn.execute("DELETE FROM content_sessions WHERE id = $1", session_id)
        if result == "DELETE 0":
            raise HTTPException(status_code=404, detail="Session not found")
        return None
    
                    # ---------- Smart TM Translation Page ---------------------

class TranslationMemorySchema(BaseModel):
    brand_id: UUID
    source_text: str
    target_text: str
    source_language: str
    target_language: str
    domain_context: Optional[str] = None
    match_type: str # e.g., 'exact', 'fuzzy', 'machine'
    quality_score: int
    confidence_level: Optional[float] = None
    usage_count: Optional[int] = 0
    last_used: Optional[datetime] = None
    cultural_adaptations: Optional[Dict[str, Any]] = None
    regulatory_notes: Optional[str] = None
    created_by: Optional[UUID] = None
    asset_id: Optional[UUID] = None
    project_id: Optional[UUID] = None
    market: Optional[str] = None

# --- TRANSLATION MEMORY ROUTES ---

@app.get("/api/translation-memory")
async def get_tm_entries():
    async with pool.acquire() as conn:
        rows = await conn.fetch("SELECT * FROM translation_memory ORDER BY created_at DESC")
        return [dict(row) for row in rows]

@app.post("/api/translation-memory", status_code=201)
async def create_tm_entry(entry: TranslationMemorySchema):
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            INSERT INTO translation_memory (
                brand_id, source_text, target_text, source_language, target_language,
                domain_context, match_type, quality_score, confidence_level,
                usage_count, last_used, cultural_adaptations, regulatory_notes,
                created_by, asset_id, project_id, market
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17) 
            RETURNING *
            """,
            entry.brand_id, entry.source_text, entry.target_text, entry.source_language,
            entry.target_language, entry.domain_context, entry.match_type,
            entry.quality_score, entry.confidence_level, entry.usage_count,
            entry.last_used, entry.cultural_adaptations, entry.regulatory_notes,
            entry.created_by, entry.asset_id, entry.project_id, entry.market
        )
        return dict(row)

@app.put("/api/translation-memory/{tm_id}")
async def update_tm_entry(tm_id: UUID, entry: TranslationMemorySchema):
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            UPDATE translation_memory SET 
                brand_id=$1, source_text=$2, target_text=$3, source_language=$4, 
                target_language=$5, domain_context=$6, match_type=$7, quality_score=$8, 
                confidence_level=$9, usage_count=$10, last_used=$11, 
                cultural_adaptations=$12, regulatory_notes=$13, created_by=$14, 
                asset_id=$15, project_id=$16, market=$17, updated_at=NOW()
            WHERE id = $18 RETURNING *
            """,
            entry.brand_id, entry.source_text, entry.target_text, entry.source_language,
            entry.target_language, entry.domain_context, entry.match_type,
            entry.quality_score, entry.confidence_level, entry.usage_count,
            entry.last_used, entry.cultural_adaptations, entry.regulatory_notes,
            entry.created_by, entry.asset_id, entry.project_id, entry.market, tm_id
        )
        if not row:
            raise HTTPException(status_code=404, detail="Entry not found")
        return dict(row)

@app.delete("/api/translation-memory/{tm_id}", status_code=204)
async def delete_tm_entry(tm_id: UUID):
    async with pool.acquire() as conn:
        # We use .execute() instead of .fetchrow() because we don't need data back
        result = await conn.execute(
            "DELETE FROM translation_memory WHERE id = $1", 
            tm_id
        )  
        # asyncpg returns a string like "DELETE 1" or "DELETE 0"
        if result == "DELETE 0":
            raise HTTPException(
                status_code=404, 
                detail="Translation memory entry not found"
            )
        # status_code 204 means "No Content" - the standard for successful deletes
        return None
    
# ------------------- Cultural Intelligence Page -------------------

class GlocalTMIntelligenceSchema(BaseModel):
    segment_id: UUID
    project_id: UUID
    tm_source_text: str
    tm_target_text: str
    match_score: float
    match_type: str
    source_language: str
    target_language: str
    therapeutic_area: Optional[str] = None
    domain_context: Optional[str] = None
    quality_score: Optional[float] = None
    confidence_level: Optional[float] = None
    human_approval_rating: Optional[float] = None
    tm_metadata: Optional[Dict[str, Any]] = None
    usage_count: Optional[int] = 0
    last_used_at: Optional[datetime] = None
    exact_match_words: Optional[int] = 0
    fuzzy_match_words: Optional[int] = 0
    new_words: Optional[int] = 0
    leverage_percentage: Optional[float] = None
    ai_medical_accuracy_score: Optional[float] = None
    ai_brand_consistency_score: Optional[float] = None
    ai_cultural_fit_score: Optional[float] = None
    ai_regulatory_risk: Optional[str] = None
    ai_reasoning: Optional[Dict[str, Any]] = None
    human_feedback: Optional[str] = None
    human_approval_status: Optional[str] = None
    reviewed_by: Optional[UUID] = None
    reviewed_at: Optional[datetime] = None

class GlocalRegulatoryComplianceSchema(BaseModel):
    segment_id: UUID
    project_id: UUID
    target_market: str
    regulatory_body: str # e.g., 'FDA', 'EMA'
    compliance_requirements: Optional[Dict[str, Any]] = None
    fair_balance_assessment: Optional[Dict[str, Any]] = None
    claims_validation: Optional[Dict[str, Any]] = None
    required_disclaimers: Optional[Dict[str, Any]] = None
    compliance_score: Optional[float] = None
    risk_level: Optional[str] = None # e.g., 'Low', 'Medium', 'High'
    compliance_issues: Optional[Dict[str, Any]] = None
    recommendations: Optional[Dict[str, Any]] = None
    compliance_metadata: Optional[Dict[str, Any]] = None

class GlocalAnalyticsSchema(BaseModel):
    project_id: UUID
    metric_type: str # e.g., 'translation_speed', 'cost_per_word', 'engagement'
    metric_value: float
    metric_context: Optional[Dict[str, Any]] = None
    measurement_date: date

class ProfileSchema(BaseModel):
    user_id: UUID
    display_name: Optional[str] = None
    email: Optional[EmailStr] = None # EmailStr validates the format automatically
    is_demo_user: bool = False

@app.get("/api/glocal-tm-intelligence")
async def get_all_tm_intelligence():
    async with pool.acquire() as conn:
        # We order by created_at DESC so the newest analysis appears first
        rows = await conn.fetch("SELECT * FROM glocal_tm_intelligence ORDER BY created_at DESC")
        return [dict(row) for row in rows]

@app.post("/api/glocal-tm-intelligence", status_code=201)
async def create_tm_intelligence(data: GlocalTMIntelligenceSchema):
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            INSERT INTO glocal_tm_intelligence (
                segment_id, project_id, tm_source_text, tm_target_text, 
                match_score, match_type, source_language, target_language, 
                therapeutic_area, domain_context, quality_score, confidence_level, 
                human_approval_rating, tm_metadata, usage_count, last_used_at, 
                exact_match_words, fuzzy_match_words, new_words, leverage_percentage, 
                ai_medical_accuracy_score, ai_brand_consistency_score, 
                ai_cultural_fit_score, ai_regulatory_risk, ai_reasoning, 
                human_feedback, human_approval_status, reviewed_by, reviewed_at
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 
                $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29
            ) RETURNING *
            """,
            data.segment_id, data.project_id, data.tm_source_text, data.tm_target_text,
            data.match_score, data.match_type, data.source_language, data.target_language,
            data.therapeutic_area, data.domain_context, data.quality_score, data.confidence_level,
            data.human_approval_rating, data.tm_metadata, data.usage_count, data.last_used_at,
            data.exact_match_words, data.fuzzy_match_words, data.new_words, data.leverage_percentage,
            data.ai_medical_accuracy_score, data.ai_brand_consistency_score,
            data.ai_cultural_fit_score, data.ai_regulatory_risk, data.ai_reasoning,
            data.human_feedback, data.human_approval_status, data.reviewed_by, data.reviewed_at
        )
        return dict(row)

@app.put("/api/glocal-tm-intelligence/{intelligence_id}")
async def update_tm_intelligence(intelligence_id: UUID, data: GlocalTMIntelligenceSchema):
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            UPDATE glocal_tm_intelligence SET 
                segment_id=$1, project_id=$2, tm_source_text=$3, tm_target_text=$4, 
                match_score=$5, match_type=$6, source_language=$7, target_language=$8, 
                therapeutic_area=$9, domain_context=$10, quality_score=$11, confidence_level=$12, 
                human_approval_rating=$13, tm_metadata=$14, usage_count=$15, last_used_at=$16, 
                exact_match_words=$17, fuzzy_match_words=$18, new_words=$19, leverage_percentage=$20, 
                ai_medical_accuracy_score=$21, ai_brand_consistency_score=$22, 
                ai_cultural_fit_score=$23, ai_regulatory_risk=$24, ai_reasoning=$25, 
                human_feedback=$26, human_approval_status=$27, reviewed_by=$28, reviewed_at=$29
            WHERE id = $30 RETURNING *
            """,
            data.segment_id, data.project_id, data.tm_source_text, data.tm_target_text,
            data.match_score, data.match_type, data.source_language, data.target_language,
            data.therapeutic_area, data.domain_context, data.quality_score, data.confidence_level,
            data.human_approval_rating, data.tm_metadata, data.usage_count, data.last_used_at,
            data.exact_match_words, data.fuzzy_match_words, data.new_words, data.leverage_percentage,
            data.ai_medical_accuracy_score, data.ai_brand_consistency_score,
            data.ai_cultural_fit_score, data.ai_regulatory_risk, data.ai_reasoning,
            data.human_feedback, data.human_approval_status, data.reviewed_by, data.reviewed_at,
            intelligence_id
        )
        if not row:
            raise HTTPException(status_code=404, detail="Intelligence record not found")
        return dict(row)
    
@app.delete("/api/glocal-tm-intelligence/{intelligence_id}", status_code=204)
async def delete_tm_intelligence(intelligence_id: UUID):
    async with pool.acquire() as conn:
        # .execute() returns the status string (e.g., "DELETE 1")
        result = await conn.execute(
            "DELETE FROM glocal_tm_intelligence WHERE id = $1", 
            intelligence_id
        )
        # Check if the record actually existed
        if result == "DELETE 0":
            raise HTTPException(status_code=404, detail="Intelligence record not found")
            
        # 204 No Content is returned on success
        return None
    
@app.get("/api/glocal-regulatory-compliance")
async def get_all_compliance_records():
    async with pool.acquire() as conn:
        rows = await conn.fetch("SELECT * FROM glocal_regulatory_compliance ORDER BY created_at DESC")
        return [dict(row) for row in rows]
    
@app.post("/api/glocal-regulatory-compliance", status_code=201)
async def create_compliance_record(data: GlocalRegulatoryComplianceSchema):
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            INSERT INTO glocal_regulatory_compliance (
                segment_id, project_id, target_market, regulatory_body,
                compliance_requirements, fair_balance_assessment, claims_validation,
                required_disclaimers, compliance_score, risk_level,
                compliance_issues, recommendations, compliance_metadata
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) 
            RETURNING *
            """,
            data.segment_id, data.project_id, data.target_market, data.regulatory_body,
            data.compliance_requirements, data.fair_balance_assessment, data.claims_validation,
            data.required_disclaimers, data.compliance_score, data.risk_level,
            data.compliance_issues, data.recommendations, data.compliance_metadata
        )
        return dict(row)
    
@app.put("/api/glocal-regulatory-compliance/{compliance_id}")
async def update_compliance_record(compliance_id: UUID, data: GlocalRegulatoryComplianceSchema):
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            UPDATE glocal_regulatory_compliance SET 
                segment_id=$1, project_id=$2, target_market=$3, regulatory_body=$4,
                compliance_requirements=$5, fair_balance_assessment=$6, claims_validation=$7,
                required_disclaimers=$8, compliance_score=$9, risk_level=$10,
                compliance_issues=$11, recommendations=$12, compliance_metadata=$13,
                updated_at=NOW()
            WHERE id = $14 RETURNING *
            """,
            data.segment_id, data.project_id, data.target_market, data.regulatory_body,
            data.compliance_requirements, data.fair_balance_assessment, data.claims_validation,
            data.required_disclaimers, data.compliance_score, data.risk_level,
            data.compliance_issues, data.recommendations, data.compliance_metadata,
            compliance_id
        )
        if not row:
            raise HTTPException(status_code=404, detail="Compliance record not found")
        return dict(row)
    
@app.delete("/api/glocal-regulatory-compliance/{compliance_id}", status_code=204)
async def delete_compliance_record(compliance_id: UUID):
    async with pool.acquire() as conn:
        result = await conn.execute("DELETE FROM glocal_regulatory_compliance WHERE id = $1", compliance_id)
        if result == "DELETE 0":
            raise HTTPException(status_code=404, detail="Compliance record not found")
        return None
    
@app.get("/api/glocal-analytics")
async def get_analytics():
    async with pool.acquire() as conn:
        rows = await conn.fetch("SELECT * FROM glocal_analytics ORDER BY measurement_date DESC")
        return [dict(row) for row in rows]
    
@app.post("/api/glocal-analytics", status_code=201)
async def create_analytics_entry(data: GlocalAnalyticsSchema):
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            INSERT INTO glocal_analytics (
                project_id, metric_type, metric_value, 
                metric_context, measurement_date
            ) VALUES ($1, $2, $3, $4, $5) 
            RETURNING *
            """,
            data.project_id, data.metric_type, data.metric_value,
            data.metric_context, data.measurement_date
        )
        return dict(row)
    
@app.put("/api/glocal-analytics/{analytics_id}")
async def update_analytics_entry(analytics_id: UUID, data: GlocalAnalyticsSchema):
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            UPDATE glocal_analytics SET 
                project_id=$1, 
                metric_type=$2, 
                metric_value=$3, 
                metric_context=$4, 
                measurement_date=$5
            WHERE id = $6 RETURNING *
            """,
            data.project_id, 
            data.metric_type, 
            data.metric_value,
            data.metric_context, 
            data.measurement_date,
            analytics_id
        )
        
        if not row:
            raise HTTPException(status_code=404, detail="Analytics record not found")
            
        return dict(row)
    
@app.delete("/api/glocal-analytics/{analytics_id}", status_code=204)
async def delete_analytics_entry(analytics_id: UUID):
    async with pool.acquire() as conn:
        result = await conn.execute("DELETE FROM glocal_analytics WHERE id = $1", analytics_id)
        if result == "DELETE 0":
            raise HTTPException(status_code=404, detail="Analytics record not found")
        return None
    
@app.get("/api/profiles")
async def get_profiles():
    async with pool.acquire() as conn:
        rows = await conn.fetch("SELECT * FROM profiles ORDER BY created_at DESC")
        return [dict(row) for row in rows]
    
@app.post("/api/profiles", status_code=201)
async def create_profile(profile: ProfileSchema):
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            INSERT INTO profiles (
                user_id, display_name, email, is_demo_user
            ) VALUES ($1, $2, $3, $4) 
            RETURNING *
            """,
            profile.user_id, profile.display_name, profile.email, profile.is_demo_user
        )
        return dict(row)
    
@app.put("/api/profiles/{profile_id}")
async def update_profile(profile_id: UUID, profile: ProfileSchema):
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            UPDATE profiles SET 
                user_id=$1, display_name=$2, email=$3, is_demo_user=$4, 
                updated_at=NOW()
            WHERE id = $5 RETURNING *
            """,
            profile.user_id, profile.display_name, profile.email, 
            profile.is_demo_user, profile_id
        )
        if not row:
            raise HTTPException(status_code=404, detail="Profile not found")
        return dict(row)
    
@app.delete("/api/profiles/{profile_id}", status_code=204)
async def delete_profile(profile_id: UUID):
    async with pool.acquire() as conn:
        result = await conn.execute("DELETE FROM profiles WHERE id = $1", profile_id)
        if result == "DELETE 0":
            raise HTTPException(status_code=404, detail="Profile not found")
        return None

"""---------- Segmented Content Page ---------------------"""
@app.get("/api/segmented-content")
async def get_all_segmented_content():
    async with pool.acquire() as conn:
        rows = await conn.fetch("SELECT * FROM segmented_content ORDER BY id ASC")
        return [dict(row) for row in rows]
@app.put("/api/segmented-content/by-no/{segmented_no}")
async def update_segmented_content_by_no(segmented_no: str, content: SegmentedContentSchema):
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            UPDATE segmented_content
            SET description = $1,
                segmented_no = $2
            WHERE segmented_no = $3
            RETURNING *
            """,
            content.description,
            content.segmented_no,
            segmented_no          
        )
       
        if not row:
            raise HTTPException(
                status_code=404,
                detail=f"Segmented content '{segmented_no}' not found"
            )
        return dict(row)
 
@app.post("/api/segmented-content", status_code=201)
async def create_segmented_content(content: SegmentedContentSchema):
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            INSERT INTO segmented_content (document_name,segmented_no, description)
            VALUES ($1, $2, $3)
            RETURNING *
            """,
            content.document_name, content.segmented_no, content.description
        )
        return dict(row)
@app.delete("/api/segmented-content/by-no/{segmented_no}", status_code=204)
async def delete_segmented_content_by_no(segmented_no: str):
    async with pool.acquire() as conn:
        result = await conn.execute(
            "DELETE FROM segmented_content WHERE segmented_no = $1",
            segmented_no
        )
       
        if result == "DELETE 0":
            raise HTTPException(
                status_code=404,
                detail=f"Segmented content '{segmented_no}' not found"
            )
        return None

@app.get("/api/translated-content")
async def get_all_translations():
    async with pool.acquire() as conn:
        rows = await conn.fetch("SELECT * FROM translated_content ORDER BY id ASC")
        return [dict(row) for row in rows]
   
@app.post("/api/translated-content", status_code=201)
async def create_translation(item: TranslatedContentSchema):
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            INSERT INTO translated_content (source_text, target_text, source_language, target_language)
            VALUES ($1, $2, $3, $4)
            RETURNING *
            """,
            item.source_text, item.target_text, item.source_language, item.target_language
        )
        return dict(row)
 
@app.put("/api/translated-content/{id}")
async def update_translation(id: int, item: TranslatedContentSchema):
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            UPDATE translated_content
            SET source_text=$1, target_text=$2, source_language=$3, target_language=$4
            WHERE id = $5
            RETURNING *
            """,
            item.source_text, item.target_text, item.source_language, item.target_language, id
        )
        if not row:
            raise HTTPException(status_code=404, detail="Translation ID not found")
        return dict(row)
 
@app.delete("/api/translated-content/{id}", status_code=204)
async def delete_translation(id: int):
    async with pool.acquire() as conn:
        result = await conn.execute("DELETE FROM translated_content WHERE id = $1", id)
        if result == "DELETE 0":
            raise HTTPException(status_code=404, detail="Translation ID not found")
        return None

# @app.get("/api/translation-memory/match-fragments")
# async def match_fragments(text: str, target_lang: str, brand_id: str): # Use str or UUID
#     async with pool.acquire() as conn:
#         # Clean and split into words of 4+ characters to avoid 'the', 'is', 'at'
#         words = list(set(re.findall(r'\b\w{4,}\b', text.lower())))
#         glossary_hints = {}

#         for word in words:
#             # Query refined to find the word even near punctuation
#             query = """
#                 SELECT target_text 
#                 FROM translation_memory 
#                 WHERE source_text ILIKE $1 
#                 AND target_language = $2 
#                 AND brand_id = $3
#                 LIMIT 1
#             """
#             # We use %word% to find it anywhere in the sentence
#             match = await conn.fetchrow(query, f"%{word}%", target_lang, brand_id)
            
#             if match:
#                 # We return the whole target sentence as context for the AI
#                 glossary_hints[word] = match['target_text']

#         return {"matches": glossary_hints}

# @app.post("/api/translation-memory", status_code=201)
# async def create_tm_entry(entry: TranslationMemorySchema):
#     async with pool.acquire() as conn:
#         row = await conn.fetchrow(
#             """
#             INSERT INTO translation_memory (
#                 brand_id, source_text, target_text, source_language, target_language,
#                 domain_context, match_type, quality_score, confidence_level,
#                 usage_count, last_used, project_id, market
#             ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), $11, $12) 
#             RETURNING id
#             """,
#             entry.brand_id, entry.source_text, entry.target_text, entry.source_language,
#             entry.target_language, entry.domain_context, entry.match_type,
#             entry.quality_score, entry.confidence_level, entry.usage_count,
#             entry.project_id, entry.market
#         )


@app.get("/api/translation-memory/match-fragments")
async def match_fragments(text: str, target_lang: str, brand_id: str):
    if pool is None:
        raise HTTPException(status_code=500, detail="Database pool not initialized")

    async with pool.acquire() as conn:
        # Tokenize: Finds words with 3+ characters (e.g., 'back', 'go')
        words = list(set(re.findall(r'\b\w{3,}\b', text.lower())))
        glossary_hints = {}

        for word in words:
            # STEP A: Check the high-precision Glossary (Word-to-Word)
            # This is where your "Go -> Po" mapping lives
            glossary_match = await conn.fetchrow(
                "SELECT term_target FROM glossary_terms WHERE term_en ILIKE $1", 
                word
            )
            
            if glossary_match:
                glossary_hints[word] = glossary_match['term_target']
            else:
                # STEP B: Fallback to Translation Memory (Sentence Search)
                # This finds "jogging" inside "Kid is jogging"
                tm_match = await conn.fetchrow(
                    """
                    SELECT target_text FROM translation_memory 
                    WHERE source_text ILIKE $1 AND target_language = $2 AND brand_id = $3
                    LIMIT 1
                    """,
                    f"%{word}%", target_lang, brand_id
                )
                if tm_match:
                    glossary_hints[word] = f"Context: {tm_match['target_text']}"

        return {"matches": glossary_hints}

class GlossarySchema(BaseModel):
    term_en: str
    term_target: str

# @app.post("/api/glossary-terms", status_code=201)
# async def create_glossary_entry(entry: GlossarySchema):
#     async with pool.acquire() as conn:
#         await conn.execute(
#             "INSERT INTO glossary_terms (term_en, term_target) VALUES ($1, $2)",
#             entry.term_en, entry.term_target
#         )
#         return {"status": "term_saved"}

@app.post("/api/glossary/bulk-sync")
async def bulk_sync_glossary(terms: list[dict]):
    if pool is None:
        raise HTTPException(status_code=500, detail="Database pool not initialized")
        
    async with pool.acquire() as conn:
        for item in terms:
            # We save the English word in lowercase for easier matching later
            await conn.execute(
                """
                INSERT INTO glossary_terms (term_en, term_target)
                VALUES ($1, $2)
                ON CONFLICT (term_en) DO NOTHING
                """,
                item['en'].lower().strip(), 
                item['target'].strip()
            )
        return {"status": "success", "terms_indexed": len(terms)}
    
    