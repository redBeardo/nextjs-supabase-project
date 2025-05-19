# TB Speaker Portal

A Next.js application for managing speaker presentations and schedules, featuring a PowerPoint add-in for seamless presentation management.

## Features

- PowerPoint Add-in for direct presentation management
- OneDrive integration for file storage
- Supabase backend for data persistence
- Azure AD authentication
- Modern UI with Tailwind CSS

## Recent Updates

### PowerPoint Add-in (2024-03-20)
- Successfully implemented and tested PowerPoint add-in
- Added OneDrive integration for file storage
- Implemented Azure AD authentication
- Added database support for OneDrive file metadata
- Created test page for add-in functionality

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## PowerPoint Add-in Development

The PowerPoint add-in is located in the `src/app/powerpoint-test` directory. To test the add-in:

1. Ensure you have the manifest file installed in your Office environment
2. Open PowerPoint and load the add-in
3. Navigate to the test page to verify functionality

## Database Schema

The application uses Supabase with the following main tables:

- `presentations`: Stores presentation metadata and file information
  - Basic fields: id, title, description
  - File fields: file_url, file_provider
  - OneDrive fields: onedrive_file_id, onedrive_web_url

## Learn More

To learn more about the technologies used:

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Office Add-ins Documentation](https://learn.microsoft.com/en-us/office/dev/add-ins/)
- [Microsoft Graph API](https://learn.microsoft.com/en-us/graph/overview)

## Deployment

The application can be deployed on Vercel, with the PowerPoint add-in requiring additional configuration for Office integration.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
