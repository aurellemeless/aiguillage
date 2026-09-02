'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

interface SidebarContextValue {
	open: boolean;
	setOpen: (open: boolean) => void;
	toggle: () => void;
}

const SidebarContext = createContext<SidebarContextValue | null>(null);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
	const [open, setOpen] = useState(false);
	const pathname = usePathname();

	// Closes the mobile drawer whenever the user navigates to a new page.
	useEffect(() => {
		setOpen(false);
	}, [pathname]);

	return (
		<SidebarContext.Provider value={{ open, setOpen, toggle: () => setOpen((o) => !o) }}>
			{children}
		</SidebarContext.Provider>
	);
}

export function useSidebar(): SidebarContextValue {
	const ctx = useContext(SidebarContext);
	if (!ctx) throw new Error('useSidebar must be used within a SidebarProvider');
	return ctx;
}
