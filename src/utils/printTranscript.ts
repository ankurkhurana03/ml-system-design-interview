import type { Problem, PathEntry, TreeNode, MLStage } from '@/types/tree';

const STAGE_NAMES: Record<MLStage, string> = {
  problem_definition: 'Problem Definition',
  metrics: 'Metrics',
  data: 'Data',
  features: 'Features',
  model: 'Model',
  training: 'Training',
  deployment: 'Deployment',
  monitoring: 'Monitoring',
};

const STAGE_COLORS: Record<MLStage, string> = {
  problem_definition: '#3b82f6', // blue-500
  metrics: '#a855f7',            // purple-500
  data: '#22c55e',               // green-500
  features: '#f59e0b',           // amber-500
  model: '#ef4444',              // red-500
  training: '#f97316',           // orange-500
  deployment: '#06b6d4',         // cyan-500
  monitoring: '#ec4899',         // pink-500
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Converts basic markdown formatting to HTML.
 * Handles: **bold**, *italic*, `code`, [links](url), and newlines.
 */
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
    '<a href="$2" style="color:#3b82f6;text-decoration:underline;">$1</a>'
  );
  // Line breaks
  html = html.replace(/\n/g, '<br>');

  return html;
}

function buildPrintStyles(): string {
  return `
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    @page {
      margin: 1in 0.75in;
      size: letter;
    }

    body {
      font-family: Georgia, 'Times New Roman', serif;
      font-size: 11pt;
      line-height: 1.6;
      color: #1a1a1a;
      max-width: 7in;
      margin: 0 auto;
      padding: 0;
    }

    h1 {
      font-family: 'Helvetica Neue', Arial, sans-serif;
      font-size: 20pt;
      font-weight: 700;
      color: #111827;
      margin-bottom: 6pt;
      line-height: 1.2;
    }

    .meta {
      font-family: 'Helvetica Neue', Arial, sans-serif;
      font-size: 9.5pt;
      color: #6b7280;
      margin-bottom: 4pt;
    }

    .meta strong {
      color: #374151;
    }

    .divider {
      border: none;
      border-top: 1px solid #d1d5db;
      margin: 12pt 0;
    }

    .path-summary {
      font-family: 'Helvetica Neue', Arial, sans-serif;
      font-size: 9.5pt;
      background: #f3f4f6;
      padding: 8pt 12pt;
      border-radius: 4pt;
      margin-bottom: 16pt;
      color: #374151;
    }

    .path-summary strong {
      color: #111827;
    }

    .stage-section {
      margin-bottom: 8pt;
      page-break-inside: avoid;
    }

    .stage-header {
      font-family: 'Helvetica Neue', Arial, sans-serif;
      font-size: 14pt;
      font-weight: 600;
      padding: 6pt 0 4pt 12pt;
      margin-top: 16pt;
      margin-bottom: 8pt;
      border-left: 4px solid #ccc;
      page-break-after: avoid;
    }

    .node-block {
      margin-bottom: 12pt;
      padding-left: 12pt;
      page-break-inside: avoid;
    }

    .decision-block {
      background: #fef3c7;
      border: 1px solid #fcd34d;
      border-radius: 4pt;
      padding: 8pt 12pt;
      margin-bottom: 8pt;
      font-family: 'Helvetica Neue', Arial, sans-serif;
      font-size: 10pt;
    }

    .decision-block .decision-label {
      font-weight: 600;
      color: #92400e;
    }

    .decision-block .choice-label {
      display: inline-block;
      background: #fbbf24;
      color: #78350f;
      padding: 2pt 8pt;
      border-radius: 3pt;
      font-weight: 600;
      margin-top: 4pt;
    }

    .speaker-line {
      margin-bottom: 6pt;
    }

    .speaker-tag {
      font-family: 'Helvetica Neue', Arial, sans-serif;
      font-size: 9pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5pt;
      margin-bottom: 2pt;
    }

    .speaker-tag.interviewer {
      color: #1d4ed8;
    }

    .speaker-tag.candidate {
      color: #047857;
    }

    .speaker-content {
      font-size: 11pt;
      line-height: 1.6;
    }

    .speaker-content code {
      font-family: 'Courier New', monospace;
      font-size: 10pt;
      background: #f3f4f6;
      padding: 1pt 3pt;
      border-radius: 2pt;
    }

    .multi-select-block {
      background: #ede9fe;
      border: 1px solid #c4b5fd;
      border-radius: 4pt;
      padding: 8pt 12pt;
      margin-bottom: 8pt;
      font-family: 'Helvetica Neue', Arial, sans-serif;
      font-size: 10pt;
    }

    .multi-select-block .ms-label {
      font-weight: 600;
      color: #5b21b6;
      margin-bottom: 4pt;
    }

    .multi-select-block .ms-item {
      margin-left: 12pt;
      color: #4c1d95;
    }

    .citations {
      margin-top: 4pt;
      font-family: 'Helvetica Neue', Arial, sans-serif;
      font-size: 9pt;
      color: #6b7280;
    }

    .citations a {
      color: #3b82f6;
      text-decoration: underline;
    }

    .notes-section {
      margin-top: 20pt;
      padding: 12pt;
      background: #f0fdf4;
      border: 1px solid #86efac;
      border-radius: 4pt;
      page-break-inside: avoid;
    }

    .notes-section h2 {
      font-family: 'Helvetica Neue', Arial, sans-serif;
      font-size: 13pt;
      font-weight: 600;
      color: #166534;
      margin-bottom: 8pt;
    }

    .notes-section .notes-content {
      font-size: 10.5pt;
      color: #1a1a1a;
    }

    .footer {
      margin-top: 24pt;
      padding-top: 8pt;
      border-top: 1px solid #d1d5db;
      font-family: 'Helvetica Neue', Arial, sans-serif;
      font-size: 8.5pt;
      color: #9ca3af;
      text-align: center;
    }

    @media print {
      body {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }

      .stage-header {
        break-after: avoid;
      }

      .node-block {
        break-inside: avoid;
      }

      .notes-section {
        break-inside: avoid;
      }
    }
  `;
}

function buildHtmlBody(
  problem: Problem,
  path: PathEntry[],
  nodeMap: Map<string, TreeNode>,
  notes?: string
): string {
  const today = new Date().toISOString().split('T')[0];

  // Build path summary
  const pathSummary = path
    .filter((entry) => entry.choiceLabel)
    .map((entry) => entry.choiceLabel)
    .join(' &rarr; ');

  let html = '';

  // Title + metadata
  html += `<h1>ML System Design Interview: ${escapeHtml(problem.title)}</h1>\n`;
  html += `<div class="meta"><strong>Date:</strong> ${today}</div>\n`;
  html += `<div class="meta"><strong>Problem:</strong> ${escapeHtml(problem.description)}</div>\n`;
  html += `<hr class="divider">\n`;
  html += `<div class="path-summary"><strong>Decision Path:</strong> ${pathSummary || 'No choices made yet'}</div>\n`;

  // Track current stage for section headers
  let currentStage: MLStage | null = null;

  for (const pathEntry of path) {
    const node = nodeMap.get(pathEntry.nodeId);
    if (!node) continue;

    // Stage header
    if (node.stage !== currentStage) {
      currentStage = node.stage;
      const color = STAGE_COLORS[node.stage];
      html += `<div class="stage-section">\n`;
      html += `  <div class="stage-header" style="border-left-color:${color};color:${color};">${STAGE_NAMES[node.stage]}</div>\n`;
    }

    html += `<div class="node-block">\n`;

    if (node.type === 'question') {
      // Decision block
      html += `  <div class="decision-block">\n`;
      html += `    <div class="decision-label">Decision: ${escapeHtml(node.label)}</div>\n`;
      if (pathEntry.choiceLabel) {
        html += `    <div><span class="choice-label">${escapeHtml(pathEntry.choiceLabel)}</span></div>\n`;
      }
      html += `  </div>\n`;

      // Interviewer question
      html += `  <div class="speaker-line">\n`;
      html += `    <div class="speaker-tag interviewer">Interviewer</div>\n`;
      html += `    <div class="speaker-content">${markdownToHtml(node.content)}</div>\n`;
      html += `  </div>\n`;

      // Candidate answer
      if (pathEntry.choiceIndex !== undefined && node.choices) {
        const choice = node.choices[pathEntry.choiceIndex];
        if (choice && choice.answer) {
          html += `  <div class="speaker-line">\n`;
          html += `    <div class="speaker-tag candidate">Candidate</div>\n`;
          html += `    <div class="speaker-content">${markdownToHtml(choice.answer)}</div>\n`;
          html += `  </div>\n`;
        }
      }
    } else if (node.type === 'multi_select' && pathEntry.multiSelectValues) {
      // Multi-select block
      html += `  <div class="multi-select-block">\n`;
      html += `    <div class="ms-label">Multi-Select: ${escapeHtml(node.label)}</div>\n`;
      const dims = node.dimensionGroups?.flatMap((g) => g.dimensions) || [];
      for (const dim of dims) {
        const selectedValue = pathEntry.multiSelectValues[dim.id];
        const selectedOption = dim.options.find((o) => o.value === selectedValue);
        html += `    <div class="ms-item"><strong>${escapeHtml(dim.label)}:</strong> ${escapeHtml(selectedOption?.label || selectedValue || 'N/A')}</div>\n`;
      }
      html += `  </div>\n`;

      // Content
      const speaker = node.speaker === 'interviewer' ? 'interviewer' : 'candidate';
      const speakerLabel = node.speaker === 'interviewer' ? 'Interviewer' : 'Candidate';
      html += `  <div class="speaker-line">\n`;
      html += `    <div class="speaker-tag ${speaker}">${speakerLabel}</div>\n`;
      html += `    <div class="speaker-content">${markdownToHtml(node.content)}</div>\n`;
      html += `  </div>\n`;
    } else if (node.dialogue && node.dialogue.length > 0) {
      // Dialogue lines
      for (const line of node.dialogue) {
        const speaker = line.speaker === 'interviewer' ? 'interviewer' : 'candidate';
        const speakerLabel = line.speaker === 'interviewer' ? 'Interviewer' : 'Candidate';
        html += `  <div class="speaker-line">\n`;
        html += `    <div class="speaker-tag ${speaker}">${speakerLabel}</div>\n`;
        html += `    <div class="speaker-content">${markdownToHtml(line.text)}</div>\n`;
        html += `  </div>\n`;
      }
    } else {
      // Info / terminal nodes
      const speaker = node.speaker === 'interviewer' ? 'interviewer' : 'candidate';
      const speakerLabel = node.speaker === 'interviewer' ? 'Interviewer' : 'Candidate';
      html += `  <div class="speaker-line">\n`;
      html += `    <div class="speaker-tag ${speaker}">${speakerLabel}</div>\n`;
      html += `    <div class="speaker-content">${markdownToHtml(node.content)}</div>\n`;
      html += `  </div>\n`;
    }

    // Citations
    if (node.citations && node.citations.length > 0) {
      html += `  <div class="citations">\n`;
      html += `    <strong>Sources:</strong>\n`;
      for (let i = 0; i < node.citations.length; i++) {
        const url = escapeHtml(node.citations[i]);
        html += `    <div>${i + 1}. <a href="${url}">${url}</a></div>\n`;
      }
      html += `  </div>\n`;
    }

    html += `</div>\n`; // .node-block
  }

  // Close last stage section
  if (currentStage !== null) {
    html += `</div>\n`; // .stage-section
  }

  // Notes
  if (notes && notes.trim()) {
    html += `<div class="notes-section">\n`;
    html += `  <h2>Notes</h2>\n`;
    html += `  <div class="notes-content">${markdownToHtml(notes)}</div>\n`;
    html += `</div>\n`;
  }

  // Footer
  html += `<div class="footer">Generated by ML System Design Interview Tool</div>\n`;

  return html;
}

/**
 * Opens a print dialog with a professionally formatted HTML transcript.
 * Uses the browser's built-in window.print() API, allowing the user to
 * print to paper or save as PDF via the system print dialog.
 *
 * @param problem - The problem definition
 * @param path - The path entries representing the user's journey
 * @param nodeMap - Map of node IDs to TreeNode objects
 * @param notes - Optional notes to append at the end
 */
export function printTranscript(
  problem: Problem,
  path: PathEntry[],
  nodeMap: Map<string, TreeNode>,
  notes?: string
): void {
  const styles = buildPrintStyles();
  const body = buildHtmlBody(problem, path, nodeMap, notes);

  const htmlDocument = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>ML System Design Interview: ${escapeHtml(problem.title)}</title>
  <style>${styles}</style>
</head>
<body>
${body}
</body>
</html>`;

  // Create a hidden iframe for printing
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = 'none';
  iframe.style.opacity = '0';
  document.body.appendChild(iframe);

  const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!iframeDoc) {
    // Fallback: open in a new window
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(htmlDocument);
      win.document.close();
      // Wait for content to render before triggering print
      setTimeout(() => {
        win.print();
      }, 250);
    }
    document.body.removeChild(iframe);
    return;
  }

  iframeDoc.open();
  iframeDoc.write(htmlDocument);
  iframeDoc.close();

  // Wait for content to render, then print
  iframe.onload = () => {
    setTimeout(() => {
      iframe.contentWindow?.print();
      // Clean up after printing
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 1000);
    }, 250);
  };

  // If onload doesn't fire (same-origin iframe with document.write),
  // trigger print after a short delay as fallback
  setTimeout(() => {
    if (document.body.contains(iframe)) {
      try {
        iframe.contentWindow?.print();
      } catch {
        // Already printed or removed
      }
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 1000);
    }
  }, 500);
}
