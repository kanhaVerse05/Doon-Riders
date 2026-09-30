import { redirect } from 'next/navigation';

export default function HubRootPage() {
  redirect('/hub/login');
}
