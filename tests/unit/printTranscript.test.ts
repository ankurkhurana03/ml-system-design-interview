import { describe, it, expect, vi, beforeEach } from 'vitest';

// The printTranscript module uses DOM APIs (document, iframe, window).
// We test the helper functions (escapeHtml, markdownToHtml) by importing
// the module and testing its internal behavior through the exported
// printTranscript function's output.

// Since escapeHtml and markdownToHtml are not exported, we replicate them
// for direct unit testing. The main printTranscript function is tested
// with DOM mocks.

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function markdownToHtml(text: string): string {
  let html = escapeHtml(text.trim());

  // Bold: **text**
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  // Italic: *text*
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  // Inline code: `text`
  html = html.replace(/`(.+?)`/g, '<code>$1</code>');
  // Links: [text](url)
  html = html.replace(
    /\[(.+?)\]\((.+?)\)/g,
    '<a href="$2" style="color:#3b82f6;text-decoration:underline;">$1</a>',
  );
  // Line breaks
  html = html.replace(/\n/g, '<br>');

  return html;
}

describe('escapeHtml', () => {
  it('escapes ampersands', () => {
    expect(escapeHtml('a & b')).toBe('a &amp; b');
  });

  it('escapes less-than signs', () => {
    expect(escapeHtml('a < b')).toBe('a &lt; b');
  });

  it('escapes greater-than signs', () => {
    expect(escapeHtml('a > b')).toBe('a &gt; b');
  });

  it('escapes double quotes', () => {
    expect(escapeHtml('say "hello"')).toBe('say &quot;hello&quot;');
  });

  it('escapes single quotes', () => {
    expect(escapeHtml("it's")).toBe('it&#039;s');
  });

  it('handles all special characters together', () => {
    expect(escapeHtml('<div class="test"> &foo\' </div>')).toBe(
      '&lt;div class=&quot;test&quot;&gt; &amp;foo&#039; &lt;/div&gt;',
    );
  });

  it('returns empty string for empty input', () => {
    expect(escapeHtml('')).toBe('');
  });

  it('does not modify text without special characters', () => {
    expect(escapeHtml('hello world')).toBe('hello world');
  });
});

describe('markdownToHtml', () => {
  it('converts bold markdown to strong tags', () => {
    expect(markdownToHtml('This is **bold** text')).toBe(
      'This is <strong>bold</strong> text',
    );
  });

  it('converts italic markdown to em tags', () => {
    expect(markdownToHtml('This is *italic* text')).toBe(
      'This is <em>italic</em> text',
    );
  });

  it('converts inline code to code tags', () => {
    expect(markdownToHtml('Use `console.log` here')).toBe(
      'Use <code>console.log</code> here',
    );
  });

  it('converts markdown links to anchor tags', () => {
    const result = markdownToHtml('Click [here](https://example.com) now');
    expect(result).toContain('<a href="https://example.com"');
    expect(result).toContain('here</a>');
  });

  it('converts newlines to br tags', () => {
    expect(markdownToHtml('Line 1\nLine 2')).toBe('Line 1<br>Line 2');
  });

  it('handles multiple formats together', () => {
    const result = markdownToHtml('**Bold** and *italic* with `code`');
    expect(result).toContain('<strong>Bold</strong>');
    expect(result).toContain('<em>italic</em>');
    expect(result).toContain('<code>code</code>');
  });

  it('escapes HTML inside markdown content', () => {
    const result = markdownToHtml('**<script>alert("xss")</script>**');
    expect(result).not.toContain('<script>');
    expect(result).toContain('&lt;script&gt;');
  });

  it('trims whitespace', () => {
    expect(markdownToHtml('  hello  ')).toBe('hello');
  });
});

describe('printTranscript (DOM integration)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('creates an iframe and writes HTML content', async () => {
    // Mock the iframe and document APIs
    const mockIframeDoc = {
      open: vi.fn(),
      write: vi.fn(),
      close: vi.fn(),
    };

    const mockIframe = {
      style: {} as Record<string, string>,
      contentDocument: mockIframeDoc,
      contentWindow: { print: vi.fn() },
      onload: null as (() => void) | null,
    };

    const appendChildSpy = vi.fn();
    const removeChildSpy = vi.fn();
    const createElementSpy = vi.fn().mockReturnValue(mockIframe);
    const containsSpy = vi.fn().mockReturnValue(true);

    vi.stubGlobal('document', {
      createElement: createElementSpy,
      body: {
        appendChild: appendChildSpy,
        removeChild: removeChildSpy,
        contains: containsSpy,
      },
      documentElement: {
        classList: { add: vi.fn(), remove: vi.fn() },
      },
    });

    const { printTranscript } = await import('@/utils/printTranscript');

    const problem = {
      id: 'test',
      title: 'Test Problem',
      description: 'A test',
      root: 'n1',
      nodes: [
        {
          id: 'n1',
          stage: 'problem_definition' as const,
          type: 'info' as const,
          label: 'Start',
          speaker: 'interviewer' as const,
          content: 'Welcome to the test',
          next: 'n2',
        },
        {
          id: 'n2',
          stage: 'metrics' as const,
          type: 'terminal' as const,
          label: 'End',
          speaker: 'interviewer' as const,
          content: 'End of test',
        },
      ],
    };

    const path = [{ nodeId: 'n1' }];
    const nodeMap = new Map(problem.nodes.map((n) => [n.id, n]));

    printTranscript(problem, path, nodeMap);

    expect(createElementSpy).toHaveBeenCalledWith('iframe');
    expect(appendChildSpy).toHaveBeenCalled();
    expect(mockIframeDoc.open).toHaveBeenCalled();
    expect(mockIframeDoc.write).toHaveBeenCalledWith(
      expect.stringContaining('Test Problem'),
    );
    expect(mockIframeDoc.close).toHaveBeenCalled();
  });

  it('includes notes section when notes are provided', async () => {
    const mockIframeDoc = {
      open: vi.fn(),
      write: vi.fn(),
      close: vi.fn(),
    };

    const mockIframe = {
      style: {} as Record<string, string>,
      contentDocument: mockIframeDoc,
      contentWindow: { print: vi.fn() },
      onload: null as (() => void) | null,
    };

    vi.stubGlobal('document', {
      createElement: vi.fn().mockReturnValue(mockIframe),
      body: {
        appendChild: vi.fn(),
        removeChild: vi.fn(),
        contains: vi.fn().mockReturnValue(true),
      },
      documentElement: {
        classList: { add: vi.fn(), remove: vi.fn() },
      },
    });

    const { printTranscript } = await import('@/utils/printTranscript');

    const problem = {
      id: 'test',
      title: 'Test',
      description: 'Test',
      root: 'n1',
      nodes: [
        {
          id: 'n1',
          stage: 'problem_definition' as const,
          type: 'info' as const,
          label: 'Start',
          speaker: 'interviewer' as const,
          content: 'Content',
        },
      ],
    };

    printTranscript(problem, [{ nodeId: 'n1' }], new Map([['n1', problem.nodes[0]]]), 'My notes here');

    const writtenHtml = mockIframeDoc.write.mock.calls[0][0] as string;
    expect(writtenHtml).toContain('My notes here');
    expect(writtenHtml).toContain('Notes');
  });

  it('falls back to window.open when iframe document is not available', async () => {
    const mockIframe = {
      style: {} as Record<string, string>,
      contentDocument: null,
      contentWindow: null,
      onload: null as (() => void) | null,
    };

    const mockWin = {
      document: {
        write: vi.fn(),
        close: vi.fn(),
      },
      print: vi.fn(),
    };

    vi.stubGlobal('document', {
      createElement: vi.fn().mockReturnValue(mockIframe),
      body: {
        appendChild: vi.fn(),
        removeChild: vi.fn(),
        contains: vi.fn().mockReturnValue(true),
      },
      documentElement: {
        classList: { add: vi.fn(), remove: vi.fn() },
      },
    });

    vi.stubGlobal('window', {
      open: vi.fn().mockReturnValue(mockWin),
      matchMedia: vi.fn().mockReturnValue({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    });

    const { printTranscript } = await import('@/utils/printTranscript');

    const problem = {
      id: 'test',
      title: 'Test',
      description: 'Test',
      root: 'n1',
      nodes: [
        {
          id: 'n1',
          stage: 'problem_definition' as const,
          type: 'info' as const,
          label: 'Start',
          speaker: 'interviewer' as const,
          content: 'Content',
        },
      ],
    };

    printTranscript(problem, [], new Map([['n1', problem.nodes[0]]]));

    expect(mockWin.document.write).toHaveBeenCalled();
    expect(mockWin.document.close).toHaveBeenCalled();
  });
});
