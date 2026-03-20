// Barrel exports for the search module

export {
  TypesenseSearchClient,
  buildFilterBy,
  COLLECTION_SCHEMA,
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
} from './typesense-indexer.js';
