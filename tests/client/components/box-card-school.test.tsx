// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from 'vitest';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { ChakraProvider } from '@chakra-ui/react';

vi.mock('@client/service', () => ({
	callAPI: vi.fn(),
	progresses: { noScans: { color: 'gray', icon: () => null } },
}));
vi.mock('@client/components/BoxModal', () => ({ default: () => null }));
vi.mock('@client/service/stats', () => ({ getProgress: () => ({ color: 'gray', key: 'noScans' }) }));
vi.mock('@client/service/utils', () => ({ haversineDistance: () => 0 }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));
vi.mock('@client/components/Pill', () => ({ default: () => null }));

import BoxCard from '@client/components/BoxCard';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
afterEach(() => container?.remove());

async function render(box: any) {
	container = document.createElement('div');
	document.body.appendChild(container);
	await act(async () => {
		createRoot(container).render(
			<ChakraProvider>
				<BoxCard box={box} />
			</ChakraProvider>,
		);
	});
}

const base = { id: 'b1', progress: 'noScans', statusChanges: null, lastScan: null, schoolLatitude: 0, schoolLongitude: 0 };

describe('BoxCard school line', () => {
	it('shows "to <school>" when the box has a school', async () => {
		await render({ ...base, school: 'Springfield' });
		expect(container.textContent).toContain('Springfield');
	});

	it('shows no empty "to" line when the box has no school (e.g. Nigeria, two-step delivery)', async () => {
		await render({ ...base, school: '' });
		expect(container.textContent).not.toMatch(/\bto\b/);
	});
});
