import { connection } from 'next/server';
import { App } from '../ui/App';

export default async function Page() {
  // Rendered per request: the Content-Security-Policy nonce from src/proxy.ts needs it.
  await connection();
  return <App />;
}
