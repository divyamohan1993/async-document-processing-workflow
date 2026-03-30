Title: Build an Async Document Processing Workflow System
Assignment Type: Full Stack
Expected Time: 12-16 hours
Submission Window: 3-4 days
Objective
Build a small production-style full stack application where users can upload documents, trigger
background processing, track progress live, review extracted output, edit/finalize results, and export
processed data.
The purpose of this assignment is to evaluate how well you design and implement a real-world
asynchronous workflow using modern backend and frontend engineering practices.
Mandatory Technology Requirements
Frontend: React or Next.js with TypeScript
Backend: Python with FastAPI
Database: PostgreSQL
Background processing: Celery
Messaging / state: Redis
Background processing must not run in the request-response cycle
Progress tracking must be implemented
Celery + Redis Pub/Sub is mandatory
Problem Statement
Users should be able to upload one or more documents into the system. Each uploaded document must
create a processing job that is handled asynchronously by background workers. The system should
publish progress events while processing is happening and allow users to track status from the
frontend.
Once processing is completed, users should be able to review the extracted structured output, make
edits if required, finalize the record, and export the final result.
Mandatory Features
1. Upload one or more documents.
2. Save document metadata and job details in PostgreSQL.
3. Create a background processing job using Celery .
4. Use Redis Pub/Sub to publish processing progress events from worker to application layer.
5. Display job states clearly:
Queued
Processing
Completed
Failed
6. Show live or near-real-time progress in frontend.
7. Implement a document list/dashboard with:
search
filter by status
sorting
8. Build a document detail page where the processed output can be reviewed and edited.
9. Allow finalization of reviewed output.
10. Support retry for failed jobs.
11. Export finalized records as JSON and CSV .
Document Processing Flow
Each document should follow a multi-step background workflow.
You may simulate the business logic if needed, but the async architecture must be real.
Suggested processing stages:
document received
parsing started
parsing completed
extraction started
extraction completed
final result stored
job completed / failed
Minimum Processing Logic
The processing itself can be simple, for example:
extract metadata such as filename, file type, size
parse text from the file or mock parsed content
generate structured fields such as:
title
category
summary
extracted keywords
status
store final JSON result in database
You are not being evaluated on advanced AI or OCR quality here.
You are being evaluated on system design, async workflow execution, and implementation quality.
Architecture Expectations
Your solution should contain:
frontend application
FastAPI backend
PostgreSQL persistence
Celery worker
Redis for broker and Pub/Sub progress updates
A clean architecture is expected. For example:
API routes for upload, list, detail, retry, finalize, export
service layer for business logic
worker layer for async processing
clear models / schemas / DTOs
separation between synchronous API handling and background execution
Progress Tracking Requirement
Workers must publish progress events during execution using Redis Pub/Sub .
Your app may consume and expose these updates using either:
WebSocket
Server-Sent Events
polling with Redis-backed status reads
Any of the above is acceptable, but progress visibility is mandatory.
Suggested Progress Events
You may use events like:
job_queued
job_started
document_parsing_started
document_parsing_completed
field_extraction_started
field_extraction_completed
job_completed
job_failed
Expected API Surface
Your backend should include endpoints similar to:
upload document(s)
list all jobs/documents
get document/job details
stream or fetch progress
retry failed job
update reviewed result
finalize result
export results
You are free to define the exact API design.
Frontend Expectations
Your frontend should include:
upload screen
jobs dashboard
progress/status visibility
detail/review screen
edit/finalize workflow
export action
UI does not need to be fancy, but should be clear, usable, and well-structured.
Submission Requirements
Please submit:
GitHub repository link
README.md including:
setup instructions
architecture overview
run steps
assumptions
tradeoffs
limitations
short demo video of 3-5 minutes [*MUST]
sample files used for testing
sample exported outputs
clear note if AI tools were used during development
Evaluation Criteria
We will evaluate on:
correctness of async workflow
proper use of Celery.
proper use of Redis Pub/Sub
backend API design
frontend-backend integration
database design
progress tracking implementation
error handling and retry strategy
code readability and maintainability
documentation quality
overall engineering maturity
Bonus Points
Docker Compose setup
tests
authentication
idempotent retry handling
cancellation support
file storage abstraction
clean deployment-ready structure
thoughtful handling of large files or edge cases
Important Notes
Background processing is mandatory.
Do not process documents directly inside request handlers.
Do not build this as a purely synchronous CRUD application.
Simpler processing logic is acceptable if the system design is strong.