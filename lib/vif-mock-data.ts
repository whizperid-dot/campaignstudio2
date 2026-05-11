export type VifSegment = {
  segment_id: string;
  segment_name: string;
  segment_type: string;
  audience_size: number;
  avg_monthly_spend: number;
  spend_growth_rate: number;
  primary_category: string;
  risk_score: string;
  description: string;
};

export const VIF_XB_SEGMENTS: VifSegment[] = [
  {
    segment_id: 'xb_001',
    segment_name: 'High-Value Cross-Border Shoppers',
    segment_type: 'Cross-Border',
    audience_size: 18500,
    avg_monthly_spend: 12500000,
    spend_growth_rate: 18.4,
    primary_category: 'International E-Commerce',
    risk_score: 'Low',
    description: 'Cardholders with consistent cross-border transaction activity, primarily in USD and EUR.',
  },
  {
    segment_id: 'xb_002',
    segment_name: 'Occasional Cross-Border Users',
    segment_type: 'Cross-Border',
    audience_size: 42300,
    avg_monthly_spend: 4800000,
    spend_growth_rate: 7.2,
    primary_category: 'Travel & Accommodation',
    risk_score: 'Low',
    description: 'Cardholders who make 1–3 cross-border transactions per quarter, often travel-related.',
  },
  {
    segment_id: 'xb_003',
    segment_name: 'Business Travel Spenders',
    segment_type: 'Cross-Border',
    audience_size: 9200,
    avg_monthly_spend: 22000000,
    spend_growth_rate: 12.1,
    primary_category: 'Business Services & Flights',
    risk_score: 'Low',
    description: 'Corporate card users with regular international business travel and entertainment spend.',
  },
  {
    segment_id: 'xb_004',
    segment_name: 'Lapsed Cross-Border Customers',
    segment_type: 'Cross-Border',
    audience_size: 31700,
    avg_monthly_spend: 1200000,
    spend_growth_rate: -4.5,
    primary_category: 'Retail & Entertainment',
    risk_score: 'Medium',
    description: 'Previously active cross-border spenders with declining transaction frequency in the last 6 months.',
  },
];

export const VIF_SPEND_STIMULATION_SEGMENTS: VifSegment[] = [
  {
    segment_id: 'ss_001',
    segment_name: 'Dormant High-Potential Cardholders',
    segment_type: 'Spend Stimulation',
    audience_size: 56800,
    avg_monthly_spend: 850000,
    spend_growth_rate: -12.3,
    primary_category: 'Grocery & Dining',
    risk_score: 'Low',
    description: 'Cardholders with historically high spend who have reduced activity in the past 3 months.',
  },
  {
    segment_id: 'ss_002',
    segment_name: 'Young Urban Professionals',
    segment_type: 'Spend Stimulation',
    audience_size: 89400,
    avg_monthly_spend: 2300000,
    spend_growth_rate: 22.7,
    primary_category: 'Dining & Entertainment',
    risk_score: 'Low',
    description: '24–35 age segment with growing spend patterns concentrated in food delivery and entertainment.',
  },
  {
    segment_id: 'ss_003',
    segment_name: 'Mid-Tier Daily Spenders',
    segment_type: 'Spend Stimulation',
    audience_size: 124000,
    avg_monthly_spend: 1750000,
    spend_growth_rate: 3.8,
    primary_category: 'Supermarket & Transport',
    risk_score: 'Low',
    description: 'Steady everyday spenders using cards primarily for recurring daily needs.',
  },
  {
    segment_id: 'ss_004',
    segment_name: 'Low-Frequency Activatable Segment',
    segment_type: 'Spend Stimulation',
    audience_size: 203500,
    avg_monthly_spend: 380000,
    spend_growth_rate: 1.2,
    primary_category: 'Convenience & Fuel',
    risk_score: 'Medium',
    description: 'Large segment with infrequent usage. High potential for activation with right incentive.',
  },
  {
    segment_id: 'ss_005',
    segment_name: 'Premium Lifestyle Spenders',
    segment_type: 'Spend Stimulation',
    audience_size: 14200,
    avg_monthly_spend: 18500000,
    spend_growth_rate: 9.3,
    primary_category: 'Luxury Retail & Travel',
    risk_score: 'Low',
    description: 'High-net-worth cardholders with luxury brand affinity and travel spend concentration.',
  },
];

export const VIF_PACKAGES = [
  {
    name: 'VIF XB',
    fullName: 'Visa Insights Feed Cross-Border',
    color: 'blue',
    icon: 'Globe',
    description: 'Leverage Visa\'s cross-border intelligence to identify and activate high-value international spenders.',
    features: [
      'Cross-border segment profiles',
      'Currency spend breakdown',
      'International merchant categories',
      'Travel behavior signals',
    ],
  },
  {
    name: 'VIF Spend Stimulation',
    fullName: 'Visa Insights Feed Spend Stimulation',
    color: 'teal',
    icon: 'TrendingUp',
    description: 'Use AI-powered spend propensity models to reactivate dormant cardholders and drive incremental spend.',
    features: [
      'Dormancy detection models',
      'Uplift propensity scores',
      'Spend stimulation segments',
      'Category affinity data',
    ],
  },
  {
    name: 'VIF Retention',
    fullName: 'Visa Insights Feed Retention',
    color: 'amber',
    icon: 'Shield',
    description: 'Predict and prevent cardholder churn with Visa\'s retention intelligence and lifecycle signals.',
    features: [
      'Churn prediction scores',
      'At-risk cardholder lists',
      'Retention propensity models',
      'Lifecycle stage signals',
    ],
  },
  {
    name: 'VIF Fraud & Authorization',
    fullName: 'Visa Insights Feed Fraud & Authorization',
    color: 'red',
    icon: 'Lock',
    description: 'Reduce false declines and optimize authorization rates using Visa\'s fraud intelligence.',
    features: [
      'Fraud pattern detection',
      'Authorization optimization',
      'False decline reduction',
      'Risk scoring models',
    ],
  },
  {
    name: 'VIF Acquisition',
    fullName: 'Visa Insights Feed Acquisition',
    color: 'green',
    icon: 'UserPlus',
    description: 'Identify high-propensity acquisition prospects using Visa\'s market intelligence and lookalike models.',
    features: [
      'Prospect lookalike models',
      'Acquisition propensity scores',
      'Market penetration insights',
      'Demographic signals',
    ],
  },
];
