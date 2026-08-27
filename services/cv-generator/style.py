"""Style constants for the generated CV/cover-letter documents
(visual system originally prototyped with docx-js, ported here to python-docx).
"""

FONT_NAME = "Calibri"

# Hex colors without '#', same convention as docx-js.
COLOR_TITLE = "2C5F8A"
COLOR_NAME = "4A5568"
COLOR_TAGLINE = "4A5568"
COLOR_SUMMARY = "1A1A2E"
COLOR_SECTION_HEADER = "1E3A5F"
COLOR_JOB_COMPANY = "1A1A2E"
COLOR_JOB_DATES = "4A5568"
COLOR_JOB_SUBTITLE = "2C5F8A"
COLOR_BULLET = "1A1A2E"
COLOR_TECH_LABEL = "1A1A2E"
COLOR_TECH_VALUE = "4A5568"
COLOR_JOB_SHADING = "F2F2F2"
COLOR_TABLE_ROW_ALT = "EEF4FB"
COLOR_TABLE_ROW_BASE = "FFFFFF"

# Sizes in half-points, matching docx-js's "size" convention (size / 2 = pt).
SIZE_TITLE = 48       # 24pt
SIZE_NAME = 28        # 14pt
SIZE_TAGLINE = 19     # 9.5pt
SIZE_SUMMARY = 19
SIZE_SECTION_HEADER = 22   # 11pt
SIZE_JOB_COMPANY = 21      # 10.5pt
SIZE_JOB_DATES = 19
SIZE_JOB_SUBTITLE = 19
SIZE_BULLET = 19
SIZE_TECH = 18         # 9pt
SIZE_TABLE_TEXT = 19

# Character spacing (docx-js characterSpacing, in twips = 1/20 pt).
CHAR_SPACING_NAME = 80
CHAR_SPACING_SECTION_HEADER = 40

# Page margins (docx-js twips -> pt = twips / 20).
MARGIN_TOP_BOTTOM_TWIPS = 600
MARGIN_LEFT_RIGHT_TWIPS = 720

# Right tab stop for the company/dates line (dxa = twips).
JOB_HEADER_TAB_STOP_TWIPS = 10466

# Skills table (dxa).
TABLE_COL_LABEL_TWIPS = 2300
TABLE_COL_VALUE_TWIPS = 8166
