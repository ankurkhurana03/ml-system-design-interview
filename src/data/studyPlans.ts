/**
 * Static study plans that recommend a learning path through the 53 built-in problems.
 * Each plan targets a different skill level and interview goal.
 */

export interface StudyPlan {
  id: string;
  title: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedHours: number;
  problemIds: string[]; // ordered list of problem IDs
}

export const STUDY_PLANS: StudyPlan[] = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    description:
      'Classic, well-known problems that cover all 8 ML stages. Great first exposure to the full system design interview format — from problem definition through monitoring.',
    difficulty: 'beginner',
    estimatedHours: 6,
    problemIds: [
      'sentiment-analysis',
      'flight-delay',
      'fraud-detection',
      'netflix-top-picks',
      'content-moderation',
      'demand-forecasting',
    ],
  },
  {
    id: 'faang-interview-prep',
    title: 'FAANG Interview Prep',
    description:
      'Problems commonly asked at top tech companies — covering ranking, recommendations, search, ads, and real-time systems. Practice the patterns interviewers actually test.',
    difficulty: 'intermediate',
    estimatedHours: 12,
    problemIds: [
      'ad-ctr-prediction',
      'search-engine-ranking',
      'instagram-explore-ranking',
      'spotify-discover-weekly',
      'maps-eta',
      'twitter-news-feed',
      'dynamic-pricing',
      'tiktok-for-you',
      'youtube-video-search',
      'linkedin-pymk',
    ],
  },
  {
    id: 'advanced-systems',
    title: 'Advanced Systems',
    description:
      'Complex, cutting-edge ML systems that require deep thinking about scale, multi-modal inputs, real-time constraints, and production reliability.',
    difficulty: 'advanced',
    estimatedHours: 10,
    problemIds: [
      'self-driving-detection',
      'realtime-ad-auction',
      'visual-search',
      'rag-system',
      'text-to-image',
      'machine-translation',
      'distributed-training',
      'experimentation-platform',
    ],
  },
  {
    id: 'trust-and-safety',
    title: 'Trust & Safety',
    description:
      'Focused track on abuse detection, content moderation, and platform integrity — a high-demand specialization at every major platform company.',
    difficulty: 'intermediate',
    estimatedHours: 8,
    problemIds: [
      'content-moderation',
      'fraud-detection',
      'bot-detection',
      'fake-news-detection',
      'harmful-content-visual',
      'bad-ad-detection',
      'duplicate-listing-detection',
    ],
  },
];
