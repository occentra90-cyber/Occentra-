import './globals.css';
import './cv-styles.css';
export const metadata = {
  title: 'Occentra | Design. Personalize. Celebrate.',
  description: 'Editable CVs and beautiful personalized invitations.',
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
