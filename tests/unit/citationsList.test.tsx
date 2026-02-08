import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CitationsList } from '@/components/wizard/CitationsList';

describe('CitationsList', () => {
  it('renders nothing when no citations', () => {
    const { container } = render(<CitationsList />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing for empty array', () => {
    const { container } = render(<CitationsList citations={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders citations as numbered links', () => {
    const citations = [
      'https://arxiv.org/abs/2301.12345',
      'https://engineering.meta.com/blog/ml-systems',
    ];
    render(<CitationsList citations={citations} />);

    expect(screen.getByText('Sources')).toBeDefined();
    const links = screen.getAllByRole('link');
    expect(links.length).toBe(2);
    expect(links[0].getAttribute('href')).toBe(citations[0]);
    expect(links[0].getAttribute('target')).toBe('_blank');
    expect(links[1].getAttribute('href')).toBe(citations[1]);
  });

  it('truncates long URLs for display', () => {
    const longUrl = 'https://very-long-domain-name.example.com/some/very/deep/path/to/a/resource/that/is/really/long';
    render(<CitationsList citations={[longUrl]} />);

    const link = screen.getByRole('link');
    // The display text should be truncated (less than the full URL hostname+path)
    const displayText = link.textContent || '';
    expect(displayText.length).toBeLessThanOrEqual(63); // 60 + "..."
    expect(displayText.endsWith('...')).toBe(true);
  });

  it('shows all citations when 5 or fewer', () => {
    const citations = ['https://a.com', 'https://b.com', 'https://c.com', 'https://d.com', 'https://e.com'];
    render(<CitationsList citations={citations} />);

    const links = screen.getAllByRole('link');
    expect(links.length).toBe(5);
    // No "more" button
    expect(screen.queryByText(/more sources/)).toBeNull();
  });

  it('collapses when more than 5 citations', () => {
    const citations = Array.from({ length: 8 }, (_, i) => `https://source${i + 1}.com`);
    render(<CitationsList citations={citations} />);

    // Initially shows 5
    let links = screen.getAllByRole('link');
    expect(links.length).toBe(5);

    // Shows the expand button
    const moreButton = screen.getByText('+3 more sources');
    expect(moreButton).toBeDefined();

    // Expand
    fireEvent.click(moreButton);
    links = screen.getAllByRole('link');
    expect(links.length).toBe(8);

    // Shows "Show fewer" button
    expect(screen.getByText('Show fewer')).toBeDefined();

    // Collapse again
    fireEvent.click(screen.getByText('Show fewer'));
    links = screen.getAllByRole('link');
    expect(links.length).toBe(5);
  });
});
