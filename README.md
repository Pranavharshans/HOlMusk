# HolMusk AI - Intelligent Video Analysis Platform

A cutting-edge [Next.js](https://nextjs.org) application that transforms videos into actionable insights using advanced AI technology. Built with premium UX/UI design principles to deliver a venture capital-worthy user experience.

## 🌟 Features

### Core Capabilities
- **AI-Powered Video Analysis**: Upload videos and receive comprehensive AI-generated insights and markdown notes
- **Premium User Interface**: Modern, fluid design with smooth animations and intuitive interactions  
- **Dark/Light Mode**: Adaptive theming with system preference detection
- **Real-time Progress**: Beautiful upload progress indicators and status updates
- **Export Functionality**: Download analysis as PDF or copy markdown to clipboard
- **Responsive Design**: Optimized for all devices with mobile-first approach

### Technical Highlights
- **Next.js 14**: Latest App Router with server components
- **TypeScript**: Full type safety and enhanced developer experience
- **Framer Motion**: Smooth animations and micro-interactions
- **Heroicons**: Professional icon set for consistent design language
- **Tailwind CSS**: Utility-first styling with custom design system
- **File Upload**: Secure video file handling with validation
- **API Routes**: Robust backend endpoints for file processing

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn package manager
- Google AI API key (for video analysis)

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/yourusername/holmusk-ai.git
   cd holmusk-ai
   ```

2. **Install dependencies**:
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Set up environment variables**:
   ```bash
   cp env.example .env
   ```
   Edit `.env` and add your Google AI API key:
   ```env
   GOOGLE_API_KEY=your_google_api_key_here
   ```
   Get your API key from [Google AI Studio](https://ai.google.dev/)

4. **Run the development server**:
   ```bash
   npm run dev
   # or
   yarn dev
   # or
   pnpm dev
   # or
   bun dev
   ```

5. **Open your browser**:
   Navigate to [http://localhost:3000](http://localhost:3000) to see the application.

### File Structure
```
src/
├── app/
│   ├── api/           # API routes for upload, analysis, and export
│   ├── globals.css    # Global styles and Tailwind imports
│   ├── layout.tsx     # Root layout component
│   └── page.tsx       # Main application interface
├── components/        # Reusable UI components (future)
└── lib/              # Utility functions and helpers (future)
```

## 🎨 Design System

### Color Palette
- **Light Mode**: Gradient from slate-50 via blue-50 to indigo-100
- **Dark Mode**: Gradient from slate-900 via purple-900 to slate-900
- **Accent Colors**: Blue/Purple theme with semantic color usage

### Typography
- **Primary Font**: System font stack with Geist optimization
- **Hierarchy**: Clear heading structure with appropriate sizing
- **Readability**: Optimized line height and spacing

### Components
- **Glass morphism effects**: Backdrop blur with transparency
- **Rounded corners**: Consistent border radius (xl, 2xl, 3xl)
- **Shadows**: Layered shadow system for depth
- **Animations**: Purposeful motion with spring physics

## 📁 Supported File Types

- **MP4** - Most common web video format
- **AVI** - Audio Video Interleave
- **MOV** - QuickTime video format  
- **WMV** - Windows Media Video
- **WebM** - Open web video format

**File Size Limit**: 100MB maximum per upload

## 🔧 API Endpoints

### POST /api/upload
Upload video files for analysis
- **Input**: FormData with 'file' field
- **Output**: Upload ID, file path, MIME type, and metadata
- **Validation**: File type and size restrictions (100MB limit)
- **Supported formats**: MP4, AVI, MOV, WMV, WebM

### POST /api/analyze  
Process uploaded videos with Google Gemini AI
- **Input**: Upload ID, file path, and MIME type from upload endpoint
- **Output**: Structured educational markdown notes
- **Processing**: Google Gemini 2.5 Flash for video content analysis
- **Features**: Educational note generation with timestamps, key concepts, and actionable insights

### POST /api/export-pdf
Generate PDF reports from analysis
- **Input**: Markdown content
- **Output**: PDF file download
- **Format**: Professional document layout

## 🛠️ Development

### Adding New Features
The application is built with modularity in mind:

1. **UI Components**: Add to `src/components/` with TypeScript interfaces
2. **API Routes**: Create in `src/app/api/` following Next.js conventions  
3. **Styling**: Use Tailwind classes with the established design tokens
4. **Animations**: Leverage Framer Motion for consistent interactions

### Environment Variables
```bash
# Add to .env.local for local development
NEXT_PUBLIC_APP_NAME=HolMusk AI
NEXT_PUBLIC_APP_VERSION=1.0.0
```

## 🚢 Deployment

### Vercel (Recommended)
The fastest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme).

### Other Platforms
- **Netlify**: Configure build command as `npm run build`
- **AWS Amplify**: Use the Next.js preset
- **Docker**: Create Dockerfile for containerized deployment

## 📊 Performance Optimizations

- **Code Splitting**: Automatic with Next.js App Router
- **Image Optimization**: Next.js Image component for optimized loading
- **Bundle Analysis**: Use `npm run build` to analyze bundle size
- **Lazy Loading**: Components and routes loaded on demand

## 🔒 Security Considerations

- **File Validation**: Server-side type and size checking
- **Upload Limits**: Configurable file size restrictions  
- **CORS**: Properly configured for cross-origin requests
- **Input Sanitization**: Validation on all user inputs

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Code Standards
- **TypeScript**: Strict mode enabled
- **ESLint**: Follow the configured rules
- **Prettier**: Code formatting on save
- **Naming**: Use descriptive, camelCase names

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Links

- **Next.js Documentation**: [https://nextjs.org/docs](https://nextjs.org/docs)
- **Framer Motion**: [https://www.framer.com/motion](https://www.framer.com/motion)
- **Tailwind CSS**: [https://tailwindcss.com](https://tailwindcss.com)
- **Heroicons**: [https://heroicons.com](https://heroicons.com)

## 📞 Support

For support, email support@holmusk-ai.com or create an issue in this repository.

---

Built with ❤️ by the HolMusk AI Team
