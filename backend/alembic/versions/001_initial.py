"""Initial migration - create all tables

Revision ID: 001_initial
Revises:
Create Date: 2026-03-30

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSONB

# revision identifiers, used by Alembic.
revision: str = "001_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create enum types
    document_status_enum = sa.Enum(
        "queued", "processing", "completed", "failed",
        name="documentstatus",
    )
    event_type_enum = sa.Enum(
        "job_queued", "job_started",
        "document_parsing_started", "document_parsing_completed",
        "field_extraction_started", "field_extraction_completed",
        "job_completed", "job_failed",
        name="eventtype",
    )

    # Users table
    op.create_table(
        "users",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("email", sa.String(255), unique=True, nullable=False, index=True),
        sa.Column("hashed_password", sa.String(255), nullable=False),
        sa.Column("full_name", sa.String(255), nullable=False),
        sa.Column("is_active", sa.Boolean(), default=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # Documents table
    op.create_table(
        "documents",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False, index=True),
        sa.Column("filename", sa.String(500), nullable=False),
        sa.Column("original_filename", sa.String(500), nullable=False),
        sa.Column("file_type", sa.String(100), nullable=False),
        sa.Column("file_size", sa.BigInteger(), nullable=False),
        sa.Column("file_path", sa.String(1000), nullable=False),
        sa.Column("status", document_status_enum, default="queued", index=True),
        sa.Column("celery_task_id", sa.String(255), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("retry_count", sa.Integer(), default=0),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # Processing results table
    op.create_table(
        "processing_results",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("document_id", UUID(as_uuid=True), sa.ForeignKey("documents.id"), unique=True, nullable=False),
        sa.Column("title", sa.String(500), nullable=True),
        sa.Column("category", sa.String(255), nullable=True),
        sa.Column("summary", sa.Text(), nullable=True),
        sa.Column("keywords", JSONB(), nullable=True),
        sa.Column("raw_text", sa.Text(), nullable=True),
        sa.Column("structured_data", JSONB(), nullable=True),
        sa.Column("is_finalized", sa.Boolean(), default=False),
        sa.Column("finalized_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # Processing events table
    op.create_table(
        "processing_events",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("document_id", UUID(as_uuid=True), sa.ForeignKey("documents.id"), nullable=False, index=True),
        sa.Column("event_type", event_type_enum, nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("progress_percent", sa.Integer(), default=0),
        sa.Column("metadata", JSONB(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("processing_events")
    op.drop_table("processing_results")
    op.drop_table("documents")
    op.drop_table("users")

    # Drop enum types
    sa.Enum(name="eventtype").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="documentstatus").drop(op.get_bind(), checkfirst=True)
