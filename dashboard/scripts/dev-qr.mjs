#!/usr/bin/env node
// Wraps `next dev` to also print a QR code for the local network URL once
// the server is ready, so the board can be opened straight from a phone.
import { spawn } from 'node:child_process';
import qrcode from 'qrcode-terminal';

const args = process.argv.slice(2);

const child = spawn('next', ['dev', ...args], {
	stdio: ['inherit', 'pipe', 'inherit'],
	shell: process.platform === 'win32',
});

let networkUrl = null;
let printed = false;
let buffer = '';

child.stdout.on('data', (chunk) => {
	const text = chunk.toString();
	process.stdout.write(text);
	buffer += text;

	if (!networkUrl) {
		const match = buffer.match(/Network:\s*(http:\/\/\S+)/);
		if (match) networkUrl = match[1];
	}

	if (!printed && /Ready in/i.test(text)) {
		printed = true;
		if (networkUrl) {
			const boardUrl = `${networkUrl.replace(/\/$/, '')}/applications`;
			console.log('\nScan to open the board on your phone (same Wi-Fi):');
			qrcode.generate(boardUrl, { small: true }, (qr) => {
				console.log(qr);
				console.log(`${boardUrl}\n`);
			});
		} else {
			console.log('\n(No network address detected — QR code skipped.)\n');
		}
	}
});

child.on('exit', (code) => process.exit(code ?? 0));
child.on('error', (err) => {
	console.error(err);
	process.exit(1);
});
