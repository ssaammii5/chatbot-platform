import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'ChatAdmin — Chatbot Platform',
  description: 'Admin & Agent Workspace for the AI Chatbot Platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
