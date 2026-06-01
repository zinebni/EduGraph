'use client';

export default function CurriculumReport({ markdown }) {
  if (!markdown) return null;

  // Regex-based parser to compile Markdown into styled elements
  const parseMarkdown = (text) => {
    let html = text;

    // 1. Headers
    html = html.replace(/^# (.*?)$/gm, '<h1 class="gradient-text" style="font-size: 30px; font-weight: 800; border-bottom: 1px solid var(--border-glass); padding-bottom: 8px; margin-top: 40px; margin-bottom: 20px; font-family: var(--font-heading);">$1</h1>');
    html = html.replace(/^## (.*?)$/gm, '<h2 style="font-size: 22px; font-weight: 700; border-left: 4px solid var(--accent-primary); padding-left: 16px; margin-top: 36px; margin-bottom: 16px; font-family: var(--font-heading);">$1</h2>');
    html = html.replace(/^### (.*?)$/gm, '<h3 style="font-size: 17px; font-weight: 600; color: var(--accent-secondary); margin-top: 28px; margin-bottom: 12px; font-family: var(--font-heading);">$1</h3>');

    // 2. Bold & Italic
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong style="color: var(--text-primary); font-weight: 600;">$1</strong>');
    html = html.replace(/\*(.*?)\*/g, '<em style="color: var(--text-secondary);">$1</em>');

    // 3. Lists
    html = html.replace(/^\s*-\s+(.*?)$/gm, '<li style="margin-left: 20px; list-style-type: square; margin-bottom: 8px; color: var(--text-secondary);">$1</li>');
    html = html.replace(/^\s*\*\s+(.*?)$/gm, '<li style="margin-left: 20px; list-style-type: square; margin-bottom: 8px; color: var(--text-secondary);">$1</li>');

    // Wrap successive <li> tags in <ul>
    html = html.replace(/((?:<li[^>]*>.*?<\/li>\s*)+)/g, '<ul style="margin-bottom: 24px; padding-left: 12px;">$1</ul>');

    // 4. Tables (converts markdown tables)
    // Match complete table blocks
    html = html.replace(/^\|(.*?)\|\s*$/gm, '<tr>|$1|</tr>');
    html = html.replace(/<tr>\|(.*?)\|<\/tr>/g, (match, content) => {
      const cells = content.split('|');
      const tags = cells.map(cell => `<td style="padding: 12px; border-bottom: 1px solid var(--border-glass); color: var(--text-secondary);">${cell.trim()}</td>`).join('');
      return `<tr style="border-bottom: 1px solid var(--border-glass);">${tags}</tr>`;
    });
    // Wrap groups of <tr> in table
    html = html.replace(/((?:<tr[^>]*>.*?<\/tr>\s*)+)/g, '<table style="width:100%; border-collapse: collapse; margin: 24px 0; border: 1px solid var(--border-glass); border-radius: var(--radius-md); overflow: hidden;">$1</table>');

    // Clean up empty lines or formatting lines (like |---|---|)
    html = html.replace(/<td[^>]*>-+<\/td>/g, '');

    // 5. Paragraph blocks
    const blocks = html.split(/\n{2,}/);
    const parsedBlocks = blocks.map(block => {
      const trimmed = block.trim();
      if (!trimmed) return '';
      if (trimmed.startsWith('<h') || trimmed.startsWith('<ul') || trimmed.startsWith('<ol') || trimmed.startsWith('<table') || trimmed.startsWith('<blockquote') || trimmed.startsWith('<li')) {
        return trimmed;
      }
      return `<p style="color: var(--text-secondary); margin-bottom: 16px; font-size: 15px; line-height: 1.7;">${trimmed}</p>`;
    });

    return parsedBlocks.join('\n');
  };

  return (
    <div 
      className="markdown-content animate-fade-in"
      dangerouslySetInnerHTML={{ __html: parseMarkdown(markdown) }}
    />
  );
}
