# Design Document

## Overview

This design outlines the consolidation and reindexing of SmartEdify's documentation from the current scattered structure into a clean, hierarchical organization that improves discoverability, eliminates redundancy, and provides clear entry points for different user personas (developers, operators, security engineers, stakeholders).

## Architecture

### Current State Analysis

The current documentation is spread across:
- Root level files: README.md, ARCHITECTURE.md, CONTRIBUTING.md, SECURITY.md, task.md, plan.md
- docs/ directory with multiple subdirectories and files
- Nested documentation in service directories
- Some deprecated/outdated files (docs/tareas.md)

### Target Structure

```
docs/
├── README.md                 # Main index and navigation
├── architecture.md           # Consolidated architecture guide  
├── spec.md                   # API specifications and technical rules
├── testing.md                # Complete testing strategy and guidelines
├── docker.md                 # Docker setup and container management
├── status.md                 # Project status, roadmap, and feature parity
├── operations/
│   └── ci-cd.md             # CI/CD processes and deployment
├── runbooks/                # Operational runbooks (existing structure)
├── observability/           # Metrics, tracing, dashboards (existing structure)  
├── security/
│   ├── policy.md            # Security policies (from SECURITY.md)
│   └── hardening.md         # Security hardening procedures
└── [existing subdirectories preserved]
```

## Components and Interfaces

### Documentation Index (docs/README.md)
- **Purpose**: Single entry point with clear navigation paths
- **Content**: Overview, quick links by persona, structure explanation
- **Interfaces**: Links to all major documentation sections
- **Maintenance**: Updated whenever new major documentation is added

### Architecture Documentation (docs/architecture.md)
- **Purpose**: Consolidated architectural guidance
- **Content**: Merge ARCHITECTURE.md + docs/architecture/guidelines.md + relevant parts from other files
- **Interfaces**: References to design diagrams, ADRs, and implementation details
- **Maintenance**: Updated with architectural changes

### API Specification (docs/spec.md)
- **Purpose**: Technical specifications and API contracts
- **Content**: Consolidate API documentation, Spectral rules, OpenAPI guidelines
- **Interfaces**: Links to actual OpenAPI files, contract testing information
- **Maintenance**: Updated with API changes and new services

### Testing Documentation (docs/testing.md)
- **Purpose**: Complete testing strategy and guidelines
- **Content**: Consolidate testing strategies from multiple services, contract testing, coverage requirements
- **Interfaces**: Links to service-specific testing documentation
- **Maintenance**: Updated with testing strategy changes

### Operations Documentation (docs/operations/ci-cd.md)
- **Purpose**: CI/CD processes and deployment procedures
- **Content**: Keep existing comprehensive CI/CD documentation
- **Interfaces**: Links to runbooks, security procedures, Docker documentation
- **Maintenance**: Updated with pipeline changes

### Security Documentation (docs/security/)
- **Purpose**: Centralized security information
- **Content**: 
  - policy.md: Based on SECURITY.md with vulnerability reporting
  - hardening.md: Security hardening procedures and best practices
- **Interfaces**: Links to security runbooks, incident procedures
- **Maintenance**: Updated with security policy changes

### Status Documentation (docs/status.md)
- **Purpose**: Project status, roadmap, and progress tracking
- **Content**: Consolidate status information, roadmap, feature parity tracking
- **Interfaces**: Links to task tracking, technical documentation
- **Maintenance**: Regular updates with project progress

## Data Models

### Documentation Metadata
Each major documentation file will include:
- Last updated date
- Responsible team/person
- Related documents (cross-references)
- Deprecation status (if applicable)

### Cross-Reference System
- Consistent linking format between documents
- Automated link checking capability
- Clear deprecation and redirect notices

## Error Handling

### Broken Links
- Implement link checking in CI/CD pipeline
- Provide clear error messages for broken internal links
- Maintain redirect notices for moved content

### Deprecated Content
- Clear deprecation notices in old files
- Redirect information to new locations
- Gradual removal process for truly obsolete content

### Inconsistent Information
- Single source of truth principle
- Clear ownership for each documentation section
- Regular consistency reviews

## Testing Strategy

### Documentation Quality
- Markdown linting and formatting consistency
- Link validation in CI/CD pipeline
- Spell checking and grammar validation
- Structure validation against defined schema

### Content Validation
- Technical accuracy reviews by domain experts
- Regular updates aligned with code changes
- User feedback collection and incorporation

### Migration Validation
- Ensure all existing content is preserved or properly redirected
- Validate that all cross-references are updated
- Confirm that external links to documentation remain functional