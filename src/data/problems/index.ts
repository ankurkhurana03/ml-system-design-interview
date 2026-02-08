import flightDelayYaml from './flight-delay.yaml?raw';
import dynamicPricingYaml from './dynamic-pricing.yaml?raw';
import { parse } from 'yaml';
import type { Problem } from '@/types/tree';

export interface BuiltinProblem extends Problem {
  companies?: string[];
  domains?: string[];
}

export function loadBuiltinProblems(): BuiltinProblem[] {
  const problems: BuiltinProblem[] = [];

  const flightDelay = parse(flightDelayYaml) as BuiltinProblem;
  problems.push(flightDelay);

  const dynamicPricing = parse(dynamicPricingYaml) as BuiltinProblem;
  problems.push(dynamicPricing);

  return problems;
}
