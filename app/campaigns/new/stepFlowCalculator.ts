import { ChannelType, StepType, CHANNEL_CONFIGS, COMMON_STEPS } from './channelConfig';

export interface StepInfo {
  stepNumber: number;
  stepType: StepType;
  channel?: ChannelType;
  isCommon: boolean;
}

/**
 * Calculate the complete step flow based on selected channels and their configurations
 */
export function calculateStepFlow(
  selectedChannels: ChannelType[],
  channelConfigs: Record<string, any> = {}
): StepInfo[] {
  const steps: StepInfo[] = [];
  let stepNumber = 1;

  // Step 1: Basic Setup (always first)
  steps.push({
    stepNumber: stepNumber++,
    stepType: 'basic_setup',
    isCommon: true
  });

  // Step 2: Core Details Part 1 (always second)
  steps.push({
    stepNumber: stepNumber++,
    stepType: 'core_details_part1',
    isCommon: true
  });

  // Step 3: Core Details Part 2 - Segments (always third)
  steps.push({
    stepNumber: stepNumber++,
    stepType: 'core_details_part2',
    isCommon: true
  });

  // Process channels in order, adding their specific steps
  // Channels are processed in the order they appear in CHANNEL_CONFIGS
  const channelOrder: ChannelType[] = ['email', 'linkedin', 'whatsapp', 'call'];
  
  for (const channel of channelOrder) {
    if (!selectedChannels.includes(channel)) continue;
    
    const config = CHANNEL_CONFIGS[channel];
    if (!config) continue;

    // Sort steps by order
    const channelSteps = [...config.steps].sort((a, b) => a.order - b.order);

    for (const channelStep of channelSteps) {
      // Check conditional steps
      if (channelStep.conditional) {
        const shouldInclude = channelStep.conditional(channelConfigs);
        if (!shouldInclude) continue;
      }

      steps.push({
        stepNumber: stepNumber++,
        stepType: channelStep.stepType,
        channel: channel,
        isCommon: false
      });
    }
  }

  // Schedule step (before review)
  steps.push({
    stepNumber: stepNumber++,
    stepType: 'schedule',
    isCommon: true
  });

  // Review step (always last)
  steps.push({
    stepNumber: stepNumber++,
    stepType: 'review',
    isCommon: true
  });

  return steps;
}

/**
 * Get step information for a specific step number
 */
export function getStepInfo(
  stepNumber: number,
  selectedChannels: ChannelType[],
  channelConfigs: Record<string, any> = {}
): StepInfo | null {
  const flow = calculateStepFlow(selectedChannels, channelConfigs);
  return flow.find(s => s.stepNumber === stepNumber) || null;
}

/**
 * Get total number of steps
 */
export function getTotalSteps(
  selectedChannels: ChannelType[],
  channelConfigs: Record<string, any> = {}
): number {
  return calculateStepFlow(selectedChannels, channelConfigs).length;
}

/**
 * Get the step number for a specific step type
 */
export function getStepNumberForType(
  stepType: StepType,
  selectedChannels: ChannelType[],
  channelConfigs: Record<string, any> = {}
): number | null {
  const flow = calculateStepFlow(selectedChannels, channelConfigs);
  const step = flow.find(s => s.stepType === stepType);
  return step?.stepNumber || null;
}

/**
 * Get all steps for a specific channel
 */
export function getChannelSteps(
  channel: ChannelType,
  selectedChannels: ChannelType[],
  channelConfigs: Record<string, any> = {}
): StepInfo[] {
  const flow = calculateStepFlow(selectedChannels, channelConfigs);
  return flow.filter(s => s.channel === channel);
}

/**
 * Check if a step is valid for the current channel selection
 */
export function isValidStep(
  stepNumber: number,
  selectedChannels: ChannelType[],
  channelConfigs: Record<string, any> = {}
): boolean {
  const stepInfo = getStepInfo(stepNumber, selectedChannels, channelConfigs);
  return stepInfo !== null;
}

