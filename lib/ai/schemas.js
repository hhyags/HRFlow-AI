import { z } from 'zod'

const stringArray = z.array(z.string())

export const resumeAnalysisZod = z.object({
  skills: stringArray,
  education: z.array(z.object({
    institution: z.string(),
    degree: z.string(),
    field: z.string(),
    year: z.string(),
  })),
  certifications: z.array(z.object({
    name: z.string(),
    issuer: z.string(),
    year: z.string(),
  })),
  yearsOfExperience: z.number().min(0),
  recentRoles: z.array(z.object({
    title: z.string(),
    company: z.string(),
    duration: z.string(),
  })),
  summary: z.string(),
  confidence: z.number().min(0).max(1),
  warnings: stringArray,
})

export const rankingZod = z.object({
  matchScore: z.number().int().min(0).max(100),
  matchedSkills: stringArray,
  missingSkills: stringArray,
  transferableSkills: stringArray,
  experienceAssessment: z.string(),
  educationAssessment: z.string(),
  skillGapAnalysis: z.string(),
  hiringRecommendation: z.enum(['STRONG_YES', 'YES', 'MAYBE', 'NO']),
  recommendationRationale: z.string(),
  interviewFocusAreas: stringArray,
  confidence: z.number().min(0).max(1),
})

export const interviewQuestionsZod = z.object({
  technical: z.array(z.object({
    question: z.string(),
    competency: z.string(),
    evaluationGuide: z.string(),
  })),
  behavioral: z.array(z.object({
    question: z.string(),
    competency: z.string(),
    evaluationGuide: z.string(),
  })),
  roleSpecific: z.array(z.object({
    question: z.string(),
    competency: z.string(),
    evaluationGuide: z.string(),
  })),
})

export const copilotZod = z.object({
  answer: z.string(),
  keyInsights: stringArray,
  recommendedActions: stringArray,
  dataUsed: stringArray,
  report: z.object({
    title: z.string(),
    executiveSummary: z.string(),
    sections: z.array(z.object({
      heading: z.string(),
      content: z.string(),
    })),
  }).nullable(),
  followUpPrompts: stringArray,
  limitations: stringArray,
})

export const analyticsZod = z.object({
  analysisType: z.enum(['ATTRITION_RISK', 'HIRING_FORECAST', 'WORKFORCE_PLANNING']),
  executiveSummary: z.string(),
  riskLevel: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  findings: z.array(z.object({
    title: z.string(),
    evidence: z.string(),
    impact: z.string(),
  })),
  predictions: z.array(z.object({
    metric: z.string(),
    value: z.string(),
    timeframe: z.string(),
    confidence: z.number().min(0).max(1),
  })),
  recommendations: z.array(z.object({
    action: z.string(),
    rationale: z.string(),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  })),
  assumptions: stringArray,
  limitations: stringArray,
})

export const responseSchemas = {
  resumeAnalysis: {
    type: 'object',
    properties: {
      skills: { type: 'array', items: { type: 'string' } },
      education: { type: 'array', items: { type: 'object', properties: {
        institution: { type: 'string' }, degree: { type: 'string' },
        field: { type: 'string' }, year: { type: 'string' },
      }, required: ['institution', 'degree', 'field', 'year'] } },
      certifications: { type: 'array', items: { type: 'object', properties: {
        name: { type: 'string' }, issuer: { type: 'string' }, year: { type: 'string' },
      }, required: ['name', 'issuer', 'year'] } },
      yearsOfExperience: { type: 'number' },
      recentRoles: { type: 'array', items: { type: 'object', properties: {
        title: { type: 'string' }, company: { type: 'string' }, duration: { type: 'string' },
      }, required: ['title', 'company', 'duration'] } },
      summary: { type: 'string' },
      confidence: { type: 'number' },
      warnings: { type: 'array', items: { type: 'string' } },
    },
    required: ['skills', 'education', 'certifications', 'yearsOfExperience', 'recentRoles', 'summary', 'confidence', 'warnings'],
  },
  ranking: {
    type: 'object',
    properties: {
      matchScore: { type: 'integer' },
      matchedSkills: { type: 'array', items: { type: 'string' } },
      missingSkills: { type: 'array', items: { type: 'string' } },
      transferableSkills: { type: 'array', items: { type: 'string' } },
      experienceAssessment: { type: 'string' },
      educationAssessment: { type: 'string' },
      skillGapAnalysis: { type: 'string' },
      hiringRecommendation: { type: 'string', enum: ['STRONG_YES', 'YES', 'MAYBE', 'NO'] },
      recommendationRationale: { type: 'string' },
      interviewFocusAreas: { type: 'array', items: { type: 'string' } },
      confidence: { type: 'number' },
    },
    required: ['matchScore', 'matchedSkills', 'missingSkills', 'transferableSkills', 'experienceAssessment', 'educationAssessment', 'skillGapAnalysis', 'hiringRecommendation', 'recommendationRationale', 'interviewFocusAreas', 'confidence'],
  },
  interviewQuestions: {
    type: 'object',
    properties: Object.fromEntries(['technical', 'behavioral', 'roleSpecific'].map((key) => [key, {
      type: 'array',
      items: { type: 'object', properties: {
        question: { type: 'string' }, competency: { type: 'string' }, evaluationGuide: { type: 'string' },
      }, required: ['question', 'competency', 'evaluationGuide'] },
    }])),
    required: ['technical', 'behavioral', 'roleSpecific'],
  },
  copilot: {
    type: 'object',
    properties: {
      answer: { type: 'string' },
      keyInsights: { type: 'array', items: { type: 'string' } },
      recommendedActions: { type: 'array', items: { type: 'string' } },
      dataUsed: { type: 'array', items: { type: 'string' } },
      report: {
        type: 'object',
        nullable: true,
        properties: {
          title: { type: 'string' },
          executiveSummary: { type: 'string' },
          sections: { type: 'array', items: { type: 'object', properties: {
            heading: { type: 'string' }, content: { type: 'string' },
          }, required: ['heading', 'content'] } },
        },
        required: ['title', 'executiveSummary', 'sections'],
      },
      followUpPrompts: { type: 'array', items: { type: 'string' } },
      limitations: { type: 'array', items: { type: 'string' } },
    },
    required: ['answer', 'keyInsights', 'recommendedActions', 'dataUsed', 'report', 'followUpPrompts', 'limitations'],
  },
  analytics: {
    type: 'object',
    properties: {
      analysisType: { type: 'string', enum: ['ATTRITION_RISK', 'HIRING_FORECAST', 'WORKFORCE_PLANNING'] },
      executiveSummary: { type: 'string' },
      riskLevel: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH'] },
      findings: { type: 'array', items: { type: 'object', properties: {
        title: { type: 'string' }, evidence: { type: 'string' }, impact: { type: 'string' },
      }, required: ['title', 'evidence', 'impact'] } },
      predictions: { type: 'array', items: { type: 'object', properties: {
        metric: { type: 'string' }, value: { type: 'string' }, timeframe: { type: 'string' }, confidence: { type: 'number' },
      }, required: ['metric', 'value', 'timeframe', 'confidence'] } },
      recommendations: { type: 'array', items: { type: 'object', properties: {
        action: { type: 'string' }, rationale: { type: 'string' }, priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH'] },
      }, required: ['action', 'rationale', 'priority'] } },
      assumptions: { type: 'array', items: { type: 'string' } },
      limitations: { type: 'array', items: { type: 'string' } },
    },
    required: ['analysisType', 'executiveSummary', 'riskLevel', 'findings', 'predictions', 'recommendations', 'assumptions', 'limitations'],
  },
}
