import { parse } from 'yaml';
import type { Problem } from '@/types/tree';
import { validateTree } from './validateTree';

/**
 * Parse and validate a YAML string into a Problem object.
 *
 * @param yamlString - The YAML string to parse
 * @returns A validated Problem object
 * @throws Error if the YAML is invalid or the tree structure is invalid
 */
export function parseYaml(yamlString: string): Problem {
  try {
    const parsed = parse(yamlString) as Problem;

    if (!parsed) {
      throw new Error('Failed to parse YAML: result is null or undefined');
    }

    const errors = validateTree(parsed);
    if (errors.length > 0) {
      throw new Error(`Invalid tree: ${errors.join(', ')}`);
    }

    return parsed;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(`Failed to parse YAML: ${String(error)}`);
  }
}
