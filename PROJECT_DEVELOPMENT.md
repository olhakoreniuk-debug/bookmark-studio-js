# Bookmark Studio — Project Development

## 1. Project Vision

Bookmark Studio is designed as an extensible digital resource catalogue for collecting, organising, managing and sharing information.
Bookmarks are the first supported record type. The long-term goal is to develop the application into a structured resource management platform capable of handling different types of content, including documents, files, notes and external resources.

## 2. Current Implementation

The current application provides:

- Bookmark creation, editing and deletion.
- Categories and category-based filtering.
- Tags for additional classification.
- Bookmark titles, URLs, descriptions and notes.
- Google authentication for the catalogue administrator.
- Individual public bookmark sharing through dedicated URLs.
- Read-only access to shared bookmarks without authentication.
- A browser bookmarklet for saving resources directly from Chrome.
- A modular frontend and backend architecture.
- PostgreSQL storage and local JSON storage.

## 3. Future Development Directions

The following development directions are designed as separate workstreams and can be pursued largely independently, while respecting shared architectural and technical dependencies.

### 3.1 Homepage Development

The homepage should gradually evolve from a single bookmark collection into a structured resource catalogue.
The planned homepage structure should include:

- Navigation between catalogue sections.
- Categories and subcategories.
- Resources grouped by their classification.
- Filtering by resource type, category and tags.
- Search across the catalogue.
- Access to individual resource pages.
  The homepage should provide an organised overview of the entire collection rather than simply displaying a continuous list of bookmarks.

### 3.2 Resource Classification

The catalogue should support several complementary levels of classification.
| Classification | Purpose |
|---|---|
| Sections | Organise the catalogue into major thematic areas. |
| Categories | Group related resources within the catalogue. |
| Subcategories | Provide more detailed hierarchical organisation. |
| Resource types | Identify the nature of each record. |
| Tags | Provide flexible, cross-category classification. |
The administrator should be able to create, edit and manage categories and subcategories and assign resources to them.
Categories and tags should coexist rather than replace each other.
The exact relationships between sections, categories, subcategories and resources should be defined before implementing the corresponding database changes.

### 3.3 Resource Types

Bookmarks represent the initial resource type.
The catalogue should eventually support:

- **Bookmarks:** links to external websites and online resources.
- **Documents:** PDF, Word and other document formats.
- **Files:** uploaded digital materials.
- **Notes:** independently created textual records.
- **Other resources:** additional record types introduced according to future requirements.
  Each resource type may have its own specific fields while sharing common catalogue functionality.
  Common fields may include:
- Title
- Description
- Notes and comments
- Category and subcategory
- Tags
- Resource type
- Creation date
- Last modification date
- Sharing status

### 3.4 File and Document Management

Future versions should allow the administrator to upload, organise and share files and documents directly through the catalogue.
Development should address:

- Supported file formats.
- File upload and storage.
- File metadata.
- Document preview and download.
- File size limitations.
- Secure access and sharing permissions.
- File replacement and deletion.
  The storage architecture should be evaluated separately before implementing file uploads.

### 3.5 User Roles and Access Management

#### Administrator

The application is initially intended to have one catalogue administrator.
The administrator should be able to:

- Create, edit and delete resources.
- Manage sections, categories and subcategories.
- Assign categories and tags.
- Upload and manage files.
- Organise the catalogue structure.
- Control resource sharing and visibility.
  Administrative operations must require authentication.

#### Public Readers

Public readers should be able to access publicly available resources without signing in.
Reader access should be read-only and should not expose administrative functionality or private content.

#### Future Registered Users

Additional authenticated user roles may be introduced at a later development stage if required.
Their permissions and functionality should be defined separately from the current single-administrator model.

### 3.6 Resource Sharing

The existing bookmark-sharing functionality should be preserved and extended to future resource types.
Each shared resource should have an individual public URL.
Sharing a resource should provide access to that specific record, including its relevant content and metadata, rather than automatically granting access to the entire catalogue.
Future development may include:

- Resource visibility settings.
- Sharing of documents and files.
- Public catalogue sections.
- Management of existing shared links.
- Revocation of public access.

### 3.7 Search and Filtering

The catalogue should provide efficient resource discovery through:

- Full-text search across relevant textual fields.
- Filtering by section, category and subcategory.
- Filtering by resource type.
- Tag-based filtering.
- Combined search and filtering.
- Sorting by title, creation date and modification date.
  Search results must respect resource visibility and access permissions.

## 4. Architecture and Data Model

Future development should preserve the separation between the frontend, backend and data storage layers.
The existing `bookmarks_js` database table should be reviewed before introducing additional resource types or hierarchical classification.
Development decisions should consider:

- A common resource data model.
- Resource-specific metadata.
- Relationships between resources and categories.
- Hierarchical category structures.
- Resource and tag relationships.
- File metadata and storage references.
- Public sharing identifiers.
- Database migrations and backward compatibility.
  Existing bookmarks and shared links should remain functional throughout the transition.

## 5. Development Roadmap

### Phase 1 — Consolidation

- [ ] Complete and verify the existing bookmark functionality.
- [ ] Verify category and tag management.
- [ ] Verify authentication and access permissions.
- [ ] Verify individual bookmark sharing.
- [ ] Review and maintain project documentation.
- [ ] Review existing automated tests.

### Phase 2 — Catalogue Structure

- [ ] Define the catalogue information architecture.
- [ ] Define relationships between sections, categories and subcategories.
- [ ] Redesign the homepage around the catalogue structure.
- [ ] Extend administrative classification functionality.
- [ ] Improve catalogue navigation.

### Phase 3 — Resource Model

- [ ] Design a common resource data model.
- [ ] Introduce additional resource types.
- [ ] Define resource-specific fields.
- [ ] Prepare database migrations.
- [ ] Preserve compatibility with existing bookmarks.

### Phase 4 — Documents and Files

- [ ] Select an appropriate file storage solution.
- [ ] Implement document and file uploads.
- [ ] Implement file metadata management.
- [ ] Implement document previews and downloads.
- [ ] Extend individual resource sharing.

### Phase 5 — Search and Discovery

- [ ] Implement extended search functionality.
- [ ] Introduce combined filters.
- [ ] Implement resource sorting.
- [ ] Improve navigation and usability.

### Phase 6 — Access Management

- [ ] Extend resource visibility settings.
- [ ] Review public catalogue access.
- [ ] Implement shared-link management.
- [ ] Evaluate additional authenticated user roles.
- [ ] Review application security.

## 6. Development Principles

- Maintain a modular and understandable codebase.
- Separate frontend, backend and storage responsibilities.
- Introduce changes incrementally.
- Develop and test new functionality locally before deployment.
- Preserve existing functionality and data.
- Review database migrations before applying them to production.
- Maintain automated tests and relevant documentation.
- Use dedicated Git branches and pull requests for development tasks.

## 7. Related Documentation

- [Main Project README](README.md)
- [Frontend Documentation](frontend/README.md)
- [Backend Documentation](backend/README.md)

---

This document describes the planned evolution of Bookmark Studio. Proposed features and architectural decisions are subject to further review and implementation.
