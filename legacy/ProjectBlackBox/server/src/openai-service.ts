import OpenAI from 'openai';

export interface CoachingAnalysis {
  sessionId: string;
  driverId: string;
  timestamp: number;
  analysis: {
    performance: string;
    recommendations: string[];
    riskLevel: 'low' | 'medium' | 'high';
    keyInsights: string[];
  };
  rawResponse: any;
}

export class OpenAIService {
  private client: OpenAI | null = null;
  private enabled: boolean = false;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.warn('⚠️  OPENAI_API_KEY not configured - AI coaching disabled');
      return;
    }

    this.client = new OpenAI({
      apiKey: apiKey,
    });
    this.enabled = true;
    console.log('✅ OpenAI service initialized');
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  async analyzeTelemetryData(
    telemetryData: any[],
    sessionInfo: { track?: string; sessionId: string },
    driverInfo: { id: string; name?: string }
  ): Promise<CoachingAnalysis> {
    const systemPrompt = `You are an expert racing coach analyzing telemetry data from a professional racing session.
Provide detailed analysis focusing on:
1. Driver performance assessment
2. Technical recommendations for improvement
3. Risk assessment and safety considerations
4. Key insights from the data patterns

Be specific, actionable, and professional in your analysis. Focus on data-driven insights.`;

    const telemetrySummary = this.summarizeTelemetryData(telemetryData);

    const userPrompt = `Analyze this racing telemetry data for driver ${driverInfo.name || driverInfo.id}:

Track: ${sessionInfo.track || 'Unknown'}
Session: ${sessionInfo.sessionId}
Data Points: ${telemetryData.length}

Summary Statistics:
${telemetrySummary}

Please provide:
- Overall performance assessment
- Specific recommendations for improvement
- Risk level assessment (low/medium/high)
- Key insights from the data patterns

Be specific and focus on actionable insights.`;

    if (!this.client) {
      throw new Error('OpenAI service not configured');
    }

    try {
      const completion = await this.client.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 1000,
        temperature: 0.7,
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) {
        throw new Error('No response from OpenAI');
      }

      // Parse the response into structured format
      const analysis = this.parseAnalysisResponse(response);

      return {
        sessionId: sessionInfo.sessionId,
        driverId: driverInfo.id,
        timestamp: Date.now(),
        analysis,
        rawResponse: completion
      };

    } catch (error) {
      console.error('OpenAI API error:', error);
      throw new Error(`Failed to analyze telemetry data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private summarizeTelemetryData(data: any[]): string {
    if (!data.length) return 'No telemetry data available';

    const speeds = data.map(d => d.speed).filter(s => s != null);
    const rpms = data.map(d => d.rpm).filter(r => r != null);
    const laps = data.map(d => d.lap).filter(l => l != null);

    const avgSpeed = speeds.length ? (speeds.reduce((a, b) => a + b, 0) / speeds.length).toFixed(1) : 'N/A';
    const maxSpeed = speeds.length ? Math.max(...speeds).toFixed(1) : 'N/A';
    const avgRpm = rpms.length ? (rpms.reduce((a, b) => a + b, 0) / rpms.length).toFixed(0) : 'N/A';
    const maxLap = laps.length ? Math.max(...laps) : 'N/A';

    return `
Average Speed: ${avgSpeed} km/h
Max Speed: ${maxSpeed} km/h
Average RPM: ${avgRpm}
Max Lap: ${maxLap}
Data Points: ${data.length}
Time Span: ${data.length > 1 ? ((data[data.length - 1].timestamp - data[0].timestamp) / 1000).toFixed(0) + ' seconds' : 'N/A'}
    `.trim();
  }

  private parseAnalysisResponse(response: string): CoachingAnalysis['analysis'] {
    // Simple parsing - in production, you might want more sophisticated parsing
    const lines = response.split('\n');
    const recommendations: string[] = [];
    const keyInsights: string[] = [];
    let performance = '';
    let riskLevel: 'low' | 'medium' | 'high' = 'medium';

    for (const line of lines) {
      const lowerLine = line.toLowerCase();
      if (lowerLine.includes('recommend') || lowerLine.includes('should') || lowerLine.includes('improve')) {
        recommendations.push(line.trim());
      } else if (lowerLine.includes('insight') || lowerLine.includes('key') || lowerLine.includes('important')) {
        keyInsights.push(line.trim());
      } else if (lowerLine.includes('performance') || lowerLine.includes('overall')) {
        performance += line.trim() + ' ';
      } else if (lowerLine.includes('risk')) {
        if (lowerLine.includes('high')) riskLevel = 'high';
        else if (lowerLine.includes('low')) riskLevel = 'low';
      }
    }

    return {
      performance: performance.trim() || 'Performance analysis completed',
      recommendations: recommendations.length > 0 ? recommendations : ['Continue current driving approach'],
      riskLevel,
      keyInsights: keyInsights.length > 0 ? keyInsights : ['Data analysis completed successfully']
    };
  }

  async generateCoachingReport(analyses: CoachingAnalysis[]): Promise<string> {
    const systemPrompt = `You are an expert racing coach creating a comprehensive report from multiple telemetry analyses.
Create a structured report with:
1. Executive Summary
2. Performance Overview
3. Key Recommendations
4. Risk Assessment
5. Action Items

Be professional, data-driven, and actionable.`;

    const analysesSummary = analyses.map((a, i) =>
      `Analysis ${i + 1} (${new Date(a.timestamp).toISOString()}):
${a.analysis.performance}
Risk Level: ${a.analysis.riskLevel}
Recommendations: ${a.analysis.recommendations.join(', ')}
Insights: ${a.analysis.keyInsights.join(', ')}`
    ).join('\n\n');

    const userPrompt = `Generate a comprehensive coaching report from these analyses:

${analysesSummary}

Please structure the report professionally with clear sections and actionable insights.`;

    if (!this.client) {
      throw new Error('OpenAI service not configured');
    }

    try {
      const completion = await this.client.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 2000,
        temperature: 0.7,
      });

      return completion.choices[0]?.message?.content || 'Report generation failed';

    } catch (error) {
      console.error('OpenAI report generation error:', error);
      throw new Error(`Failed to generate coaching report: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
