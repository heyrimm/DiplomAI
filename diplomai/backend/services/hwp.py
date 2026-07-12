"""
HWP(한글 5.x) 텍스트 추출 — OLE 복합문서에서 BodyText 섹션의 문단 텍스트를 뽑는다.
외부 CLI 없이 olefile + zlib 만으로 처리. AI에는 추출한 평문을 넘긴다.
"""

import struct
import zlib

try:
    import olefile
except Exception:  # olefile 미설치 시 graceful
    olefile = None


def extract_text(data: bytes, max_chars: int = 12000) -> str:
    """HWP 바이트 → 평문 텍스트 (최대 max_chars)."""
    if olefile is None or not olefile.isOleFile(data):
        return ""
    try:
        ole = olefile.OleFileIO(data)
    except Exception:
        return ""

    try:
        fh = ole.openstream("FileHeader").read()
        compressed = bool(fh[36] & 1)
    except Exception:
        compressed = True

    def parse_section(raw: bytes) -> list[str]:
        out, i, n = [], 0, len(raw)
        while i + 4 <= n:
            header = struct.unpack("<I", raw[i:i + 4])[0]
            i += 4
            tag = header & 0x3FF
            size = (header >> 20) & 0xFFF
            if size == 0xFFF:
                if i + 4 > n:
                    break
                size = struct.unpack("<I", raw[i:i + 4])[0]
                i += 4
            rec = raw[i:i + size]
            i += size
            if tag == 67:  # HWPTAG_PARA_TEXT
                try:
                    s = rec.decode("utf-16-le", "ignore")
                except Exception:
                    continue
                s = "".join(ch if (ch in "\n\t" or ord(ch) >= 32) else " " for ch in s)
                out.append(s)
        return out

    texts: list[str] = []
    try:
        for entry in ole.listdir():
            name = "/".join(entry)
            if not name.startswith("BodyText/"):
                continue
            raw = ole.openstream(entry).read()
            if compressed:
                try:
                    raw = zlib.decompress(raw, -15)
                except Exception:
                    pass
            texts.extend(parse_section(raw))
    except Exception:
        pass
    finally:
        ole.close()

    full = "\n".join(t for t in texts if t.strip())
    full = " ".join(full.split())  # 과다 공백 정리
    return full[:max_chars]
