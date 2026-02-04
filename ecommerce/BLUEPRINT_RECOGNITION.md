# Blueprint Recognition System

## Overview

Automated blueprint detection and recognition system using OpenCV image processing.

## Setup

Install dependencies:

```bash
npm install
```

## Deployment

The system includes a build script that ensures templates are available in serverless environments:

- Templates are stored in `public/templates/` for development
- During build, `scripts/copy-templates.js` copies templates to `.next/server/public/templates/`
- This ensures templates are accessible in Vercel's serverless functions

When deploying, simply run:

```bash
npm run build
```

The postbuild script will automatically copy templates to the correct location.

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
