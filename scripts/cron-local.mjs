// Fires POST /api/generate-tasks every 15 minutes (same as prod GitHub Actions cron).
// Runs immediately on start, then on interval.

const URL = 'http://localhost:5173/api/generate-tasks';
const INTERVAL_MS = 15 * 60 * 1000;

async function run() {
	try {
		const res = await fetch(URL, { method: 'POST' });
		const body = await res.json();
		console.log(`[cron] ${new Date().toLocaleTimeString()} — ${res.status} ${JSON.stringify(body)}`);
	} catch (e) {
		console.log(`[cron] ${new Date().toLocaleTimeString()} — server not ready yet`);
	}
}

// Wait a few seconds on first run so vite has time to start
setTimeout(() => {
	run();
	setInterval(run, INTERVAL_MS);
}, 5000);
