# Campaign Creation Architecture

## Overview

The campaign creation flow has been refactored to be **channel-agnostic** and **easily extensible**. The architecture allows you to add new channels (WhatsApp, Call, etc.) by simply updating configuration files, without modifying the core component logic.

## Architecture Components

### 1. Channel Configuration (`channelConfig.ts`)

Defines all available channels and their requirements:

```typescript
export const CHANNEL_CONFIGS: ChannelConfigs = {
  email: {
    id: 'email',
    label: 'Email',
    icon: Icons.Mail,
    requiresIntegration: true,
    integrationProvider: 'sendgrid',
    maxThrottle: 100,
    steps: [
      { stepType: 'email_followup_preferences', channel: 'email', required: true, order: 1 },
      { stepType: 'email_templates', channel: 'email', required: true, order: 2 },
    ]
  },
  // ... other channels
};
```

**To add a new channel:**
1. Add the channel configuration to `CHANNEL_CONFIGS`
2. Define the channel's steps in the `steps` array
3. Set `maxThrottle` (can be a function for dynamic limits)
4. The rest is handled automatically!

### 2. Step Flow Calculator (`stepFlowCalculator.ts`)

Dynamically calculates the step flow based on selected channels:

- **Common steps** (always present): Basic Setup, Core Details Part 1, Core Details Part 2, Schedule, Review
- **Channel-specific steps**: Added in order based on channel configuration
- **Conditional steps**: Steps that only appear under certain conditions (e.g., LinkedIn templates only if "with message" is selected)

**Key Functions:**
- `calculateStepFlow()`: Generates the complete step flow
- `getStepInfo()`: Gets information about a specific step
- `getTotalSteps()`: Returns total number of steps

### 3. Step Validation (`stepValidation.ts`)

Centralized validation logic that works with any channel combination:

- `canProceedToNextStep()`: Validates if current step can proceed
- `getValidationError()`: Returns error message for validation failures

**Benefits:**
- No hardcoded step numbers
- Works with any channel combination
- Easy to add new validation rules

### 4. Channel State Management (`channelState.ts`)

Type definitions for channel-specific state:

```typescript
export interface ChannelState {
  email?: EmailChannelState;
  linkedin?: LinkedInChannelState;
  whatsapp?: WhatsAppChannelState;
  call?: CallChannelState;
}
```

## How It Works

### Step Flow Example

**Selected Channels:** Email + LinkedIn

1. **Step 1:** Basic Setup (common)
2. **Step 2:** Core Details Part 1 (common)
3. **Step 3:** Core Details Part 2 - Segments (common)
4. **Step 4:** Email Follow-up Preferences (email-specific)
5. **Step 5:** Email Templates (email-specific)
6. **Step 6:** LinkedIn Message Type (linkedin-specific)
7. **Step 7:** LinkedIn Templates (linkedin-specific, conditional)
8. **Step 8:** Schedule (common)
9. **Step 9:** Review (common)

The flow is calculated automatically based on:
- Selected channels
- Channel configurations
- Conditional step logic

## Adding a New Channel

### Step 1: Add Channel Configuration

In `channelConfig.ts`:

```typescript
export const CHANNEL_CONFIGS: ChannelConfigs = {
  // ... existing channels
  newchannel: {
    id: 'newchannel',
    label: 'New Channel',
    icon: Icons.YourIcon,
    requiresIntegration: true,
    integrationProvider: 'provider_name',
    maxThrottle: 50,
    throttleKey: 'newchannel',
    steps: [
      { stepType: 'newchannel_config', channel: 'newchannel', required: true, order: 1 },
      { stepType: 'newchannel_templates', channel: 'newchannel', required: true, order: 2 },
    ]
  }
};
```

### Step 2: Add Step Type

In `channelConfig.ts`:

```typescript
export type StepType = 
  | 'basic_setup'
  | 'core_details_part1'
  | 'core_details_part2'
  | // ... existing steps
  | 'newchannel_config'
  | 'newchannel_templates'
  | 'schedule'
  | 'review';
```

### Step 3: Add Step Rendering

In `page.tsx`, add the step rendering logic:

```typescript
case 'newchannel_config':
  return <NewChannelConfigStep />;
case 'newchannel_templates':
  return <NewChannelTemplatesStep />;
```

### Step 4: Add Validation (if needed)

In `stepValidation.ts`:

```typescript
case 'newchannel_config':
  return !!context.newChannelConfig;
case 'newchannel_templates':
  return context.newChannelTemplates?.length > 0;
```

### Step 5: Add Channel State (if needed)

In `channelState.ts`:

```typescript
export interface NewChannelState {
  config: string;
  templates: string[];
}

export interface ChannelState {
  // ... existing channels
  newchannel?: NewChannelState;
}
```

## Benefits

1. **Scalability**: Add new channels by updating configuration
2. **Maintainability**: Step logic is centralized and reusable
3. **Type Safety**: Full TypeScript support
4. **Flexibility**: Conditional steps, dynamic throttles, etc.
5. **Testability**: Each component can be tested independently

## Current Channels

- ✅ **Email**: Follow-up preferences, templates
- ✅ **LinkedIn**: Message type, templates (conditional)
- 🔄 **WhatsApp**: Configuration ready (templates step defined)
- 🔄 **Call**: Configuration ready (script config step defined)

## Next Steps

To fully implement WhatsApp and Call channels:

1. Create step components for each channel
2. Add channel-specific state management
3. Implement template generation logic
4. Add integration checks
5. Update validation rules

The architecture is ready - just add the channel-specific UI and logic!

