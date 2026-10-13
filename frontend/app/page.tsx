import { redirect } from 'next/navigation';

// The old duplicate "Home" page (which just rendered the same
// DashboardContent as /dashboard) has been removed. This keeps any
// existing bookmarks/links to "/" landing somewhere valid instead of
// 404ing. If the visitor isn't logged in, /dashboard's own AuthGuard
// takes care of sending them to /login from there.
export default function RootPage() {
  redirect('/dashboard');
}
