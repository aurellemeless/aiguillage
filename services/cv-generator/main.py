import json
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

import generator

PROFILE_PATH = Path(__file__).resolve().parent.parent.parent / "profile" / "profile.json"

app = FastAPI(title="CV Generator")


def load_profile() -> dict:
    if not PROFILE_PATH.exists():
        raise HTTPException(status_code=500, detail=f"Profil introuvable : {PROFILE_PATH}")
    return json.loads(PROFILE_PATH.read_text())


class SkillLine(BaseModel):
    label: str
    values: list[str]


class Experience(BaseModel):
    company: str
    dates: str = ""
    role: str = ""
    bullets: list[str] = []
    tech: list[str] = []


class GenerateCVRequest(BaseModel):
    output_name: str
    subdir: Optional[str] = None
    headline: str
    tagline: Optional[str] = None
    summary: Optional[str] = None
    skills: list[SkillLine]
    experience: list[Experience]
    personal_projects: Optional[list[Experience]] = None


class GenerateCoverLetterRequest(BaseModel):
    output_name: str
    subdir: Optional[str] = None
    recipient: Optional[str] = None
    subject: Optional[str] = None
    body: list[str]


@app.get("/")
def health():
    return {"status": "ok"}


@app.post("/generate-cv")
def generate_cv(payload: GenerateCVRequest):
    profile = load_profile()
    content = payload.model_dump(exclude={"output_name", "subdir"})
    doc = generator.build_cv(profile, content)
    path = generator.save_document(doc, payload.output_name, payload.subdir or "")
    return {"path": str(path)}


@app.post("/generate-cover-letter")
def generate_cover_letter(payload: GenerateCoverLetterRequest):
    profile = load_profile()
    content = payload.model_dump(exclude={"output_name", "subdir"})
    doc = generator.build_cover_letter(profile, content)
    path = generator.save_document(doc, payload.output_name, payload.subdir or "")
    return {"path": str(path)}
