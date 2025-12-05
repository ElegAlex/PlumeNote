// ===========================================
// Export Wikilink Extension (US-036, US-037, US-038)
// ===========================================

export {
  WikilinkExtension,
  createWikilinkExtension,
  parseWikilink,
  type WikilinkOptions,
  type ParsedWikilink,
} from './Wikilink';
export { WikilinkSuggestionPopup } from './WikilinkSuggestionPopup';
export { useWikilinkSuggestion, type NoteSuggestion } from './useWikilinkSuggestion';
