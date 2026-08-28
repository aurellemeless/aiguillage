'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function SearchBox({ placeholder }: { placeholder: string }) {
	const router = useRouter();
	const [value, setValue] = useState('');

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		router.push(`/applications${value.trim() ? `?q=${encodeURIComponent(value.trim())}` : ''}`);
	}

	return (
		<form className='search' onSubmit={handleSubmit} role='search'>
			⌕
			<input
				value={value}
				onChange={(e) => setValue(e.target.value)}
				placeholder={placeholder}
				style={{ border: 'none', background: 'transparent', outline: 'none', flex: 1, font: 'inherit' }}
			/>
		</form>
	);
}
