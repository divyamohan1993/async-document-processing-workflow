import os
import tempfile

import pytest

from app.utils.text_extractor import (
    determine_category,
    extract_keywords,
    extract_text,
    extract_title,
    generate_summary,
)


class TestTextExtraction:
    def test_extract_text_file(self):
        with tempfile.NamedTemporaryFile(
            mode="w", suffix=".txt", delete=False
        ) as f:
            f.write("Hello world. This is a test document.")
            f.flush()
            text = extract_text(f.name, "txt")
            assert "Hello world" in text
            os.unlink(f.name)

    def test_extract_csv_file(self):
        with tempfile.NamedTemporaryFile(
            mode="w", suffix=".csv", delete=False
        ) as f:
            f.write("name,age,city\nAlice,30,NYC\nBob,25,LA\n")
            f.flush()
            text = extract_text(f.name, "csv")
            assert "Alice" in text
            assert "Bob" in text
            os.unlink(f.name)

    def test_extract_json_file(self):
        with tempfile.NamedTemporaryFile(
            mode="w", suffix=".json", delete=False
        ) as f:
            f.write('{"name": "test", "value": 42}')
            f.flush()
            text = extract_text(f.name, "json")
            assert "test" in text
            assert "42" in text
            os.unlink(f.name)

    def test_extract_xml_file(self):
        with tempfile.NamedTemporaryFile(
            mode="w", suffix=".xml", delete=False
        ) as f:
            f.write("<root><item>Hello XML</item><item>World</item></root>")
            f.flush()
            text = extract_text(f.name, "xml")
            assert "Hello XML" in text
            assert "World" in text
            os.unlink(f.name)

    def test_extract_markdown_file(self):
        with tempfile.NamedTemporaryFile(
            mode="w", suffix=".md", delete=False
        ) as f:
            f.write("# Title\n\nThis is markdown content.")
            f.flush()
            text = extract_text(f.name, "md")
            assert "Title" in text
            assert "markdown" in text
            os.unlink(f.name)


class TestSummaryGeneration:
    def test_short_text(self):
        text = "Short text."
        summary = generate_summary(text)
        assert summary == "Short text."

    def test_long_text_truncation(self):
        text = "This is a sentence. " * 50
        summary = generate_summary(text, max_length=100)
        assert len(summary) <= 150  # Allow some buffer for sentence boundary
        assert summary.endswith(".") or summary.endswith("...")

    def test_empty_text(self):
        summary = generate_summary("")
        assert "no text" in summary.lower()

    def test_none_text(self):
        summary = generate_summary(None)
        assert "no text" in summary.lower()


class TestKeywordExtraction:
    def test_basic_keywords(self):
        text = (
            "Python programming language. Python is great for data science. "
            "Machine learning with Python. Python frameworks include Django."
        )
        keywords = extract_keywords(text)
        assert "python" in keywords
        assert len(keywords) <= 10

    def test_stopword_filtering(self):
        text = "The quick brown fox jumps over the lazy dog."
        keywords = extract_keywords(text)
        assert "the" not in keywords
        assert "over" not in keywords

    def test_empty_text(self):
        keywords = extract_keywords("")
        assert keywords == []


class TestCategoryDetermination:
    def test_invoice_detection(self):
        text = "Invoice #12345\nBill To: John Smith\nAmount Due: $500.00"
        assert determine_category("txt", text) == "Invoice"

    def test_letter_detection(self):
        text = "Dear Mr. Johnson,\nI am writing to inform you...\nSincerely, Jane"
        assert determine_category("txt", text) == "Letter"

    def test_report_detection(self):
        text = "Executive Summary\nThis report presents the findings of our analysis."
        assert determine_category("txt", text) == "Report"

    def test_spreadsheet_detection(self):
        assert determine_category("csv", "data,values") == "Spreadsheet Data"
        assert determine_category("xlsx", "data,values") == "Spreadsheet Data"

    def test_technical_detection(self):
        text = (
            "The API module provides a function interface. "
            "Import the class and call the return method. "
            "The implementation follows the specification."
        )
        assert determine_category("txt", text) == "Technical Document"

    def test_general_document(self):
        text = "Some generic text content that doesn't match any category."
        assert determine_category("txt", text) == "General Document"


class TestTitleExtraction:
    def test_title_from_first_line(self):
        text = "My Document Title\nSome body content here."
        title = extract_title(text, "document.txt")
        assert title == "My Document Title"

    def test_title_from_markdown_heading(self):
        text = "# My Heading\nContent below."
        title = extract_title(text, "doc.md")
        assert title == "My Heading"

    def test_title_from_filename(self):
        text = ""
        title = extract_title(text, "project-report_2024.txt")
        assert "Project Report 2024" in title

    def test_title_from_empty(self):
        title = extract_title("", "")
        assert title  # Should not be empty
