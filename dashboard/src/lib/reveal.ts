import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

// Opens the OS's native file manager on a given file. Always invoked via
// execFile with an argument array (never a shell string), so nothing in
// the resolved path — which never comes from the client directly, only
// from a server-side lookup — can be interpreted as a shell command.
export async function revealInFileManager(filePath: string): Promise<void> {
	if (process.platform === 'darwin') {
		await execFileAsync('open', ['-R', filePath]);
		return;
	}
	if (process.platform === 'win32') {
		// explorer.exe routinely exits non-zero even on success; a spawn
		// failure (e.g. explorer missing) would reject with ENOENT instead.
		try {
			await execFileAsync('explorer', [`/select,${filePath}`]);
		} catch (err) {
			if (err instanceof Error && 'code' in err && err.code === 'ENOENT') throw err;
		}
		return;
	}
	// Linux: no desktop-environment-agnostic way to select a specific file,
	// so open its containing folder instead.
	await execFileAsync('xdg-open', [path.dirname(filePath)]);
}
