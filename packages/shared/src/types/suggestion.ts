export type SuggestionCategory = 'greeting' | 'scheduling' | 'listing_info' | 'follow_up' | 'general';

export interface Suggestion {
  text: string;
  category?: SuggestionCategory;
}

export interface ConversationListingContext {
  id: string;
  tenant_id: string;
  contact_id: string;
  listing_id: string;
  created_at: string;
  updated_at: string;
}
