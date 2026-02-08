import flightDelayYaml from './flight-delay.yaml?raw';
import dynamicPricingYaml from './dynamic-pricing.yaml?raw';
import { parse } from 'yaml';
import type { Problem } from '@/types/tree';

export function loadBuiltinProblems(): Problem[] {
  const problems: Problem[] = [];

  const flightDelay = parse(flightDelayYaml) as Problem;
  problems.push(flightDelay);

  const dynamicPricing = parse(dynamicPricingYaml) as Problem;
  problems.push(dynamicPricing);

  return problems;
}
