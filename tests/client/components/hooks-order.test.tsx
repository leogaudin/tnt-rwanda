// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest';
import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { ChakraProvider } from '@chakra-ui/react';

import Pagination from '@client/components/Pagination';
import UploadModal from '@client/pages/Import/components/UploadModal';
import ProjectInsights from '@client/pages/Home/components/ProjectInsights';
import SchoolModal from '@client/components/SchoolModal';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

function mount() {
	container = document.createElement('div');
	document.body.appendChild(container);
	root = createRoot(container);
}

const render = (ui: React.ReactElement) => act(async () => { root.render(<ChakraProvider>{ui}</ChakraProvider>); });

beforeAll(() => {
	// React logs hook-order violations through console.error; fail loudly on them.
	vi.spyOn(console, 'error').mockImplementation((...args: any[]) => {
		const msg = String(args[0]);
		if (/hooks|Rendered (more|fewer)/i.test(msg)) throw new Error(msg);
	});
});

afterEach(() => {
	act(() => root.unmount());
	container.remove();
});

describe('Pagination', () => {
	const base = { pageSize: 10, setPageSize: vi.fn() };

	it('renders nothing, then buttons when the list grows (no hook-order error)', async () => {
		mount();
		const setCurrentPage = vi.fn();
		await render(<Pagination {...base} length={0} currentPage={1} setCurrentPage={setCurrentPage} />);
		expect(container.querySelectorAll('button').length).toBe(0);
		await render(<Pagination {...base} length={100} currentPage={1} setCurrentPage={setCurrentPage} />);
		expect(container.querySelectorAll('button').length).toBeGreaterThan(2);
		await render(<Pagination {...base} length={5} currentPage={1} setCurrentPage={setCurrentPage} />);
		expect(container.querySelectorAll('button').length).toBe(0);
	});

	it('renders nothing when everything fits on one page', async () => {
		mount();
		await render(<Pagination {...base} length={10} currentPage={1} setCurrentPage={vi.fn()} />);
		expect(container.innerHTML).not.toContain('button');
	});

	it('resets to page 1 when the current page is past the end (as before)', async () => {
		mount();
		const setCurrentPage = vi.fn();
		await render(<Pagination {...base} length={100} currentPage={20} setCurrentPage={setCurrentPage} />);
		expect(setCurrentPage).toHaveBeenCalledWith(1);
	});

	it('does not reset the page while it is valid', async () => {
		mount();
		const setCurrentPage = vi.fn();
		await render(<Pagination {...base} length={100} currentPage={3} setCurrentPage={setCurrentPage} />);
		expect(setCurrentPage).not.toHaveBeenCalled();
	});

	it('also resets the page when the list shrinks to a single page (effect now runs while hidden)', async () => {
		mount();
		const setCurrentPage = vi.fn();
		await render(<Pagination {...base} length={5} currentPage={3} setCurrentPage={setCurrentPage} />);
		expect(container.querySelectorAll('button').length).toBe(0);
		expect(setCurrentPage).toHaveBeenCalledWith(1);
	});

	it('does nothing for an empty list', async () => {
		mount();
		const setCurrentPage = vi.fn();
		await render(<Pagination {...base} length={0} currentPage={4} setCurrentPage={setCurrentPage} />);
		expect(setCurrentPage).not.toHaveBeenCalled();
	});
});

describe('UploadModal', () => {
	it('renders nothing without a file, then runs handleFile once when a file arrives', async () => {
		mount();
		const handleFile = vi.fn();
		await render(<UploadModal isOpen={true} file={null as any} handleFile={handleFile} />);
		expect(handleFile).not.toHaveBeenCalled();
		const file = new File(['a,b'], 'x.csv');
		await render(<UploadModal isOpen={true} file={file as any} handleFile={handleFile} />);
		expect(handleFile).toHaveBeenCalledTimes(1);
		expect(handleFile.mock.calls[0][0]).toBe(file);
		expect(typeof handleFile.mock.calls[0][1]).toBe('function');
		await render(<UploadModal isOpen={true} file={null as any} handleFile={handleFile} />);
		expect(handleFile).toHaveBeenCalledTimes(1);
	});
});

describe('ProjectInsights', () => {
	it('goes from "nothing to see" to data without a hook-order error', async () => {
		mount();
		const repartition = { total: 10, validated: 5, noProgress: 5, inProgress: 0, received: 0, reachedGps: 0, reachedAndReceived: 0 };
		await render(<ProjectInsights insights={null as any} project='p' menu={null} />);
		await render(<ProjectInsights insights={{ timeline: [], repartition, content: {} } as any} project='p' menu={null} />);
		expect(container.textContent).toContain('p');
		await render(<ProjectInsights insights={undefined as any} project='p' menu={null} />);
	});
});

describe('SchoolModal', () => {
	it('goes from no school to a school (and back) without a hook-order error', async () => {
		mount();
		const noop = () => {};
		await render(<SchoolModal isOpen={true} onClose={noop} school={null} />);
		await render(<SchoolModal isOpen={true} onClose={noop} school={{ name: 'S', boxes: [] }} />);
		await render(<SchoolModal isOpen={true} onClose={noop} school={null} />);
	});
});
