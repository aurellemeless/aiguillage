'use client';

import { useState } from 'react';
import { Button, Group, Input } from '@chakra-ui/react';

export default function CopyablePath({ label, path }: { label: string; path: string }) {
	const [copied, setCopied] = useState(false);

	async function handleCopy() {
		await navigator.clipboard.writeText(path);
		setCopied(true);
		setTimeout(() => setCopied(false), 1500);
	}

	return (
		<Group attached w='100%'>
			<Input readOnly value={path} title={label} onFocus={(e) => e.target.select()} />
			<Button onClick={handleCopy} variant='outline'>
				{copied ? 'Copié !' : 'Copier'}
			</Button>
		</Group>
	);
}
