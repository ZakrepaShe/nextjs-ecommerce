# Blueprint Recognition System

## Overview

Automated blueprint detection and recognition system using OpenCV image processing.

## Setup

Install dependencies:

```bash
npm install
```

## Deployment

Templates are automatically included in serverless deployments via `experimental.outputFileTracingIncludes` in `next.config.mjs`. This ensures the `public/templates/` directory is accessible in production environments like Vercel.

## Usage

1. Navigate to the Blueprints page
2. Click "Upload Screenshot"
3. Select a screenshot of your blueprint inventory
4. System automatically detects and marks found blueprints

## Templates

Blueprint templates are stored in `public/templates/` directory.
Template files must match blueprint IDs and be in PNG format.

## Configuration

Adjust detection parameters in `app/actions/blueprint-recognizer-actions.ts`:

```typescript
const MIN_AREA = 2500; // Minimum slot size
const MAX_AREA = 25000; // Maximum slot size
const MIN_ASPECT = 0.8; // Min width/height ratio
const MAX_ASPECT = 1.2; // Max width/height ratio
const MATCH_THRESHOLD = 0.75; // Match confidence (0-1)
```

## Troubleshooting

### No slots detected

- Adjust `MIN_AREA` and `MAX_AREA` values
- Ensure screenshot shows clear grid layout

### Low recognition accuracy

- Lower `MATCH_THRESHOLD` value
- Verify template images match game appearance
- Check screenshot quality and resolution
