"""
업로드 자료(PDF·HWP) 전처리.
- PDF ≤100페이지: Claude 문서블록으로 그대로 전달 (표·레이아웃 이해).
- PDF >100페이지 또는 HWP: 서버에서 텍스트 추출해 평문으로 전달.
"""

import base64
from io import BytesIO

from services.hwp import extract_text as extract_hwp_text

try:
    from pypdf import PdfReader
except Exception:
    PdfReader = None

PDF_PAGE_LIMIT = 100
_MAX_TEXT = 15000


def prepare_upload(file_b64: str | None, file_name: str | None) -> tuple[str | None, str]:
    """반환: (문서블록용 PDF base64 or None, 추출 텍스트).

    - PDF ≤100p → (원본 b64, "")
    - PDF >100p → (None, 추출텍스트)
    - HWP       → (None, 추출텍스트)
    """
    if not file_b64:
        return None, ""
    name = (file_name or "").lower()
    try:
        raw = base64.b64decode(file_b64)
    except Exception:
        return None, ""

    if name.endswith(".hwp"):
        return None, extract_hwp_text(raw)

    # 그 외는 PDF로 간주
    if PdfReader is None:
        return file_b64, ""  # 파서 없으면 그대로 시도
    try:
        reader = PdfReader(BytesIO(raw))
        pages = len(reader.pages)
    except Exception:
        return file_b64, ""  # 읽기 실패 → 문서블록으로 시도

    if 0 < pages <= PDF_PAGE_LIMIT:
        return file_b64, ""

    # 100p 초과 → 앞부분 텍스트 추출
    text = []
    try:
        for p in reader.pages[:PDF_PAGE_LIMIT + 20]:
            t = p.extract_text() or ""
            if t:
                text.append(t)
    except Exception:
        pass
    return None, " ".join(" ".join(text).split())[:_MAX_TEXT]
