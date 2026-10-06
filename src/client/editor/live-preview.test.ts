import { afterEach, describe, expect, it, vi } from 'vitest';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { deleteCharBackward } from '@codemirror/commands';
import { livePreview } from './live-preview';
import { renderMarkdown, renderMarkdownBlocks } from '../lib/markdown/renderer';
import { mergeSettings } from '@shared/constants';

describe('live preview Markdown compatibility', () => {
    it('keeps raw HTML details in source while rendering them in reading mode', () => {
        const source = '<details open>\n<summary><font color="#B84781">Total 10000</font></summary>\n\n- [ ] <font color="#16a34a">Item 400</font>\n\n</details>';
        const { blocks } = renderMarkdownBlocks(source);
        expect(blocks.some((block) => block.startLine === 0)).toBe(false);
        expect(blocks.some((block) => block.html.includes('<details'))).toBe(false);
        expect(blocks.some((block) => block.html.includes('data-task-line'))).toBe(true);
        const html = renderMarkdown(source).html;
        expect(html).toContain('<details open="">');
        expect(html).toContain('<summary>');
        expect(html).toContain('Item 400');
    });
    it('keeps HTML nested in Markdown blocks editable as source', () => {
        const { blocks } = renderMarkdownBlocks('> <details>\n> <summary>Title</summary>\n> </details>');
        expect(blocks).toEqual([]);
    });
    it('migrates old layouts while preserving split and unrelated settings', () => {
        for (const layout of ['edit', 'live']) {
            const settings = mergeSettings({ preview: { layout, math: false }, editor: { tabSize: 4 } });
            expect(settings.preview.layout).toBe('live');
            expect(settings.preview.math).toBe(false);
            expect(settings.editor.tabSize).toBe(4);
        }
        for (const layout of ['split', 'preview']) expect(mergeSettings({ preview: { layout } }).preview.layout).toBe(layout);
    });
    it('retains document-wide references and source lines across nested blocks', () => {
        const source = '# Heading\n\n[Reference][ref]\n\n- [ ] one\n  - [x] two\n\n| A | B |\n| - | - |\n| C | D |\n\n[ref]: https://example.com';
        const { blocks, headings } = renderMarkdownBlocks(source);
        expect(blocks.map((block) => [block.startLine, block.endLine])).toEqual([[0, 1], [2, 3], [4, 7], [7, 10]]);
        expect(blocks[1]!.html).toContain('href="https://example.com"');
        expect(blocks[2]!.html).toContain('data-task-line="4"');
        expect(blocks[2]!.html).toContain('data-task-line="5"');
        expect(blocks[3]!.html).toContain('<table');
        expect(headings[0]?.line).toBe(0);
    });
    it('keeps sanitization and comments source mapping intact', () => {
        const { blocks } = renderMarkdownBlocks('%% SECRET_COMMENT %%\n\n# Visible\n\n<img src="x" onerror="alert(1)">\n\n<script>alert(1)</script>');
        const html = blocks.map((block) => block.html).join('');
        expect(html).not.toContain('onerror');
        expect(html).not.toContain('<script');
        expect(html).not.toContain('SECRET_COMMENT');
        expect(blocks.find((block) => block.html.includes('Visible'))?.startLine).toBe(2);
    });
});

describe('live preview source editing', () => {
    let view: EditorView | undefined;
    afterEach(() => {
        view?.destroy();
        view = undefined;
        document.body.replaceChildren();
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
    });
    function createView(source: string) {
        vi.stubGlobal('ResizeObserver', class {
            observe() {}
            disconnect() {}
        });
        view = new EditorView({
            state: EditorState.create({ doc: source, extensions: [livePreview(() => {})] }),
            parent: document.body,
        });
        vi.spyOn(view, 'posAtCoords').mockReturnValue(null);
        return view;
    }
    it('exposes raw HTML tags for selection and deletion', () => {
        const source = '<details open>\n<summary>Title</summary>\n\nBody\n\n</details>';
        const editor = createView(source);
        expect(editor.contentDOM.querySelector('details')).toBeNull();
        expect(editor.contentDOM.textContent).toContain('<details open>');
        editor.dispatch({ selection: { anchor: 0, head: source.length } });
        expect(deleteCharBackward(editor)).toBe(true);
        expect(editor.state.doc.toString()).toBe('');
    });
    it('opens Markdown details source when its summary is tapped', () => {
        const source = '::: details [Title]\n\nBody\n\n:::';
        const editor = createView(source);
        const summary = editor.dom.querySelector('summary');
        expect(summary).not.toBeNull();
        summary!.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
        expect(editor.dom.querySelector('summary')).toBeNull();
        expect(editor.contentDOM.textContent).toContain('::: details [Title]');
        expect(editor.state.doc.toString()).toBe(source);
        expect(editor.state.selection.main.head).toBe(0);
    });
});
