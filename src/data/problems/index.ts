import { parse } from 'yaml';
import type { Problem } from '@/types/tree';

// Built-in YAML problem files
import flightDelayYaml from './flight-delay.yaml?raw';
import dynamicPricingYaml from './dynamic-pricing.yaml?raw';

// Recommendations & Feeds
import instagramExploreYaml from './instagram-explore-ranking.yaml?raw';
import spotifyDiscoverYaml from './spotify-discover-weekly.yaml?raw';
import netflixTopPicksYaml from './netflix-top-picks.yaml?raw';
import similarArtistsYaml from './similar-artists.yaml?raw';
import twitterNewsFeedYaml from './twitter-news-feed.yaml?raw';
import pinterestHomeFeedYaml from './pinterest-home-feed.yaml?raw';
import linkedinPymkYaml from './linkedin-pymk.yaml?raw';

// Ads & Monetization
import adCtrPredictionYaml from './ad-ctr-prediction.yaml?raw';
import adsRerankingYaml from './ads-reranking-calibration.yaml?raw';
import realtimeAdAuctionYaml from './realtime-ad-auction.yaml?raw';
import badAdDetectionYaml from './bad-ad-detection.yaml?raw';

// Search & Ranking
import amazonAutocompleteYaml from './amazon-autocomplete.yaml?raw';
import searchEngineRankingYaml from './search-engine-ranking.yaml?raw';
import visualSearchYaml from './visual-search.yaml?raw';
import youtubeVideoSearchYaml from './youtube-video-search.yaml?raw';
import podcastSearchYaml from './podcast-search.yaml?raw';

// Security, Safety & Fraud
import fraudDetectionYaml from './fraud-detection.yaml?raw';
import contentModerationYaml from './content-moderation.yaml?raw';
import botDetectionYaml from './bot-detection.yaml?raw';
import fakeNewsDetectionYaml from './fake-news-detection.yaml?raw';
import duplicateListingYaml from './duplicate-listing-detection.yaml?raw';

// Forecasting & Operations
import mapsEtaYaml from './maps-eta.yaml?raw';
import uberDynamicPricingYaml from './uber-dynamic-pricing.yaml?raw';
import airbnbOccupancyYaml from './airbnb-occupancy.yaml?raw';
import demandForecastingYaml from './demand-forecasting.yaml?raw';
import insuranceClaimYaml from './insurance-claim-estimation.yaml?raw';

// NLP & Generative AI
import ragSystemYaml from './rag-system.yaml?raw';
import sentimentAnalysisYaml from './sentiment-analysis.yaml?raw';
import supportChatbotYaml from './support-chatbot.yaml?raw';
import ticketClassificationYaml from './ticket-classification.yaml?raw';
import languageDetectionYaml from './language-detection.yaml?raw';

// Computer Vision & Infrastructure
import privacyBlurringYaml from './privacy-blurring.yaml?raw';
import landmarkRecognitionYaml from './landmark-recognition.yaml?raw';
import selfDrivingDetectionYaml from './self-driving-detection.yaml?raw';
import recyclingClassifierYaml from './recycling-classifier.yaml?raw';
import featureStoreYaml from './feature-store.yaml?raw';
import driftMonitoringYaml from './drift-monitoring.yaml?raw';
import distributedTrainingYaml from './distributed-training.yaml?raw';
import evaluationStoreYaml from './evaluation-store.yaml?raw';

// Recommendations & Marketplace (Wave 2)
import tiktokForYouYaml from './tiktok-for-you.yaml?raw';
import foodDeliveryRankingYaml from './food-delivery-ranking.yaml?raw';
import notificationRelevanceYaml from './notification-relevance.yaml?raw';
import rideMatchingYaml from './ride-matching.yaml?raw';
import creditRiskYaml from './credit-risk.yaml?raw';
import experimentationPlatformYaml from './experimentation-platform.yaml?raw';

// Multimodal & Generation (Wave 2)
import harmfulContentVisualYaml from './harmful-content-visual.yaml?raw';
import machineTranslationYaml from './machine-translation.yaml?raw';
import textToImageYaml from './text-to-image.yaml?raw';

// NLP Understanding (Wave 2)
import queryUnderstandingYaml from './query-understanding.yaml?raw';
import voiceAssistantYaml from './voice-assistant.yaml?raw';
import documentExtractionYaml from './document-extraction.yaml?raw';

export interface BuiltinProblem extends Problem {
  companies?: string[];
  domains?: string[];
}

const yamlSources: string[] = [
  flightDelayYaml,
  dynamicPricingYaml,
  // Recommendations & Feeds
  instagramExploreYaml,
  spotifyDiscoverYaml,
  netflixTopPicksYaml,
  similarArtistsYaml,
  twitterNewsFeedYaml,
  pinterestHomeFeedYaml,
  linkedinPymkYaml,
  // Ads & Monetization
  adCtrPredictionYaml,
  adsRerankingYaml,
  realtimeAdAuctionYaml,
  badAdDetectionYaml,
  // Search & Ranking
  amazonAutocompleteYaml,
  searchEngineRankingYaml,
  visualSearchYaml,
  youtubeVideoSearchYaml,
  podcastSearchYaml,
  // Security, Safety & Fraud
  fraudDetectionYaml,
  contentModerationYaml,
  botDetectionYaml,
  fakeNewsDetectionYaml,
  duplicateListingYaml,
  // Forecasting & Operations
  mapsEtaYaml,
  uberDynamicPricingYaml,
  airbnbOccupancyYaml,
  demandForecastingYaml,
  insuranceClaimYaml,
  // NLP & Generative AI
  ragSystemYaml,
  sentimentAnalysisYaml,
  supportChatbotYaml,
  ticketClassificationYaml,
  languageDetectionYaml,
  // Computer Vision & Infrastructure
  privacyBlurringYaml,
  landmarkRecognitionYaml,
  selfDrivingDetectionYaml,
  recyclingClassifierYaml,
  featureStoreYaml,
  driftMonitoringYaml,
  distributedTrainingYaml,
  evaluationStoreYaml,
  // Recommendations & Marketplace (Wave 2)
  tiktokForYouYaml,
  foodDeliveryRankingYaml,
  notificationRelevanceYaml,
  rideMatchingYaml,
  creditRiskYaml,
  experimentationPlatformYaml,
  // Multimodal & Generation (Wave 2)
  harmfulContentVisualYaml,
  machineTranslationYaml,
  textToImageYaml,
  // NLP Understanding (Wave 2)
  queryUnderstandingYaml,
  voiceAssistantYaml,
  documentExtractionYaml,
];

export function loadBuiltinProblems(): BuiltinProblem[] {
  return yamlSources.map((yaml) => parse(yaml) as BuiltinProblem);
}
