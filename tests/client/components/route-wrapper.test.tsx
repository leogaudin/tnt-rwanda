// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from 'vitest';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { ChakraProvider } from '@chakra-ui/react';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';

vi.mock('@client/components/Navbar', () => ({ default: () => null }));

import RouteWrapper from '@client/components/RouteWrapper';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
afterEach(() => container?.remove());

async function renderRoute(route: any) {
	container = document.createElement('div');
	document.body.appendChild(container);
	await act(async () => {
		createRoot(container).render(
			<HelmetProvider>
				<MemoryRouter>
					<ChakraProvider>
						<RouteWrapper route={route} />
					</ChakraProvider>
				</MemoryRouter>
			</HelmetProvider>,
		);
	});
}

describe('RouteWrapper attribution footer', () => {
	it('shows "Powered by TnT" linking to the upstream repo, below the page content', async () => {
		await renderRoute({ public: true, title: 'x', component: () => <p id='page'>content</p> });
		const link = container.querySelector('footer a') as HTMLAnchorElement;
		expect(link.textContent).toBe('Powered by TnT (Track-and-Trace)');
		expect(link.getAttribute('href')).toBe('https://github.com/leogaudin/tnt');
		expect(link.getAttribute('target')).toBe('_blank');
		expect(link.getAttribute('rel')).toContain('noopener');
		const page = container.querySelector('#page')!;
		expect(page.compareDocumentPosition(link) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
	});

	it('is shown exactly once and the page content is still rendered', async () => {
		await renderRoute({ public: true, component: () => <p id='page'>content</p> });
		expect(container.querySelectorAll('footer').length).toBe(1);
		expect(container.querySelector('#page')!.textContent).toBe('content');
	});
});
