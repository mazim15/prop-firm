import { redirect } from 'next/navigation';
import LoginPage from '@/components/LoginPage';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <LoginPage />
    </div>
  );
}
