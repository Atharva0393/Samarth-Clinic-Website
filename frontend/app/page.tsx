import { redirect } from 'next/navigation';

export default function HomePage() {
  // Root redirects to dashboard; middleware will intercept if unauthenticated
  redirect('/dashboard');
}
