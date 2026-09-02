'use client';

import { useSidebar } from '@/lib/sidebar-context';

export default function MenuButton() {
	const { toggle } = useSidebar();
	return (
		<button type='button' className='menu-btn' onClick={toggle} aria-label='Menu'>
			☰
		</button>
	);
}
