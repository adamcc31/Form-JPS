# JPSmart Registration Form

## Setup

```bash
npm install
```

## Development

```bash
npm run dev
```

## Build

```bash
npm run build
```

## Configuration

Update Google Apps Script URL in `components/RegistrationForm.tsx`:

```typescript
const response = await fetch("YOUR_GOOGLE_APPS_SCRIPT_URL", {
```

## Images

Place banner images in `/public/img/`:
- `pict-1.jpg` - Paspor banner
- `pict-2.jpg` - KTP banner  
- `pict-3.png` - Paket banner
