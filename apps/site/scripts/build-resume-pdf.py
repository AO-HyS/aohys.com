from __future__ import annotations

import json
from pathlib import Path

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.pdfgen.canvas import Canvas
from reportlab.platypus import PageBreak, Paragraph, SimpleDocTemplate, Spacer


REPO_ROOT = Path(__file__).resolve().parents[3]
CONTENT_PATH = REPO_ROOT / "packages/content-graph/src/locales/en.json"
OUTPUT_PATH = REPO_ROOT / "apps/site/public/downloads/alejandro-ortiz-corro-resume.pdf"


class DeterministicCanvas(Canvas):
  def __init__(self, *args, **kwargs):
    kwargs["invariant"] = 1
    super().__init__(*args, **kwargs)


def paragraph(text: str, style: ParagraphStyle) -> Paragraph:
  return Paragraph(text.replace("&", "&amp;"), style)


def add_heading(story: list, text: str, style: ParagraphStyle) -> None:
  story.append(Spacer(1, 0.12 * inch))
  story.append(paragraph(text, style))


def add_bullets(story: list, bullets: list[str], style: ParagraphStyle) -> None:
  for bullet in bullets:
    story.append(paragraph(f"- {bullet}", style))


def build_pdf() -> None:
  data = json.loads(CONTENT_PATH.read_text(encoding="utf-8"))
  resume = data["resume"]["resumeContent"]
  OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)

  styles = getSampleStyleSheet()
  title = ParagraphStyle(
    "ResumeTitle",
    parent=styles["Title"],
    fontName="Helvetica-Bold",
    fontSize=17,
    leading=20,
    spaceAfter=4,
  )
  subtitle = ParagraphStyle(
    "ResumeSubtitle",
    parent=styles["Normal"],
    fontName="Helvetica",
    fontSize=9.25,
    leading=11,
    spaceAfter=5,
  )
  heading = ParagraphStyle(
    "ResumeHeading",
    parent=styles["Heading2"],
    fontName="Helvetica-Bold",
    fontSize=10.5,
    leading=12.5,
    spaceBefore=5,
    spaceAfter=2.5,
  )
  body = ParagraphStyle(
    "ResumeBody",
    parent=styles["BodyText"],
    fontName="Helvetica",
    fontSize=9.2,
    leading=11.2,
    spaceAfter=3,
  )
  body_bold = ParagraphStyle(
    "ResumeBodyBold",
    parent=body,
    fontName="Helvetica-Bold",
  )

  doc = SimpleDocTemplate(
    str(OUTPUT_PATH),
    pagesize=A4,
    rightMargin=0.56 * inch,
    leftMargin=0.56 * inch,
    topMargin=0.48 * inch,
    bottomMargin=0.48 * inch,
    title="Alejandro Ortiz Corro Resume",
    author="Alejandro Ortiz Corro",
    subject="Senior Software Engineer · AI-Native Product Development",
  )

  story = [
    paragraph(resume["name"], title),
    paragraph(f"{resume['role']} | {resume['location']}", subtitle),
    paragraph(" | ".join(link["text"] for link in resume["contactLinks"]), body),
    paragraph("Dynamic resume: https://aohys.com/resume", body),
    paragraph("Selected work: https://aohys.com/case-studies", body),
  ]

  add_heading(story, resume["summaryTitle"], heading)
  for summary in resume["summary"]:
    story.append(paragraph(summary, body))

  add_heading(story, resume["projectsTitle"], heading)
  for project in resume["projects"]:
    story.append(paragraph(project["title"], body_bold))
    story.append(paragraph(project["summary"], body))

  story.append(PageBreak())

  add_heading(story, resume["experienceTitle"], heading)
  for index, job in enumerate(resume["experience"]):
    story.append(paragraph(f"{job['role']} | {job['company']} | {job['period']}", body_bold))
    add_bullets(story, job["bullets"][:3 if index == 0 else 1], body)

  add_heading(story, resume["skillsTitle"], heading)
  for skill_group in resume["skills"]:
    story.append(paragraph(f"{skill_group['label']}: {', '.join(skill_group['items'])}", body))

  add_heading(story, resume["educationTitle"], heading)
  for education in resume["education"]:
    story.append(paragraph(f"{education['degree']} | {education['institution']} | {education['period']}", body))

  add_heading(story, resume["languagesTitle"], heading)
  story.append(paragraph(", ".join(resume["languages"]), body))

  doc.build(story, canvasmaker=DeterministicCanvas)


if __name__ == "__main__":
  build_pdf()
