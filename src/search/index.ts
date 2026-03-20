// Barrel exports for the search module

export {
  TypesenseSearchClient,
  buildFilterBy,
  COLLECTION_SCHEMA,
  COLLECTION_NAME_DEFAULT,
  type TypesenseClientConfig,
  type TypesenseSearchQuery,
  type TypesenseSearchResult,
  type TypesenseSearchResponse,
  type TypesenseDocument,
} from './typesense-client.js';

export {
  noteToDocument,
  indexNote,
  deindexNote,
  fullReindex,
  toEpochMs,
} from './typesense-indexer.js';
