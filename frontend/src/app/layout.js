import './globals.css';
import Header from '@/components/Header';
import SetupGuard from '@/components/SetupGuard';

export const metadata = {
  title: 'EduGraph — Multi-Agent AI Curriculum & Course Generator',
  description: 'Design comprehensive, modern curricula in real-time using LangGraph multi-agent orchestration.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🧠</text></svg>" />
      </head>
      <body>
        <div className="app-container">
          <Header />
          <main className="main-content">
            <SetupGuard>
              {children}
            </SetupGuard>
          </main>
        </div>
      </body>
    </html>
  );
}
