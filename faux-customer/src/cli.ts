#!/usr/bin/env node
/**
 * SimulaCust CLI
 *
 * Command-line interface for running customer simulations.
 */

import { Command } from 'commander';
import { SimulationRunner, runScenarios, aggregateResults } from './simulation/runner.js';
import {
  SCENARIOS,
  getAllScenarios,
  getAdversarialScenarios,
  getHappyPathScenarios,
  getScenariosByCategory,
} from './simulation/scenario.js';
import { PERSONAS, getPersonasByTier } from './personas/index.js';
import { ConversationEvaluator, generateReport } from './evaluation/evaluator.js';
import type { ScenarioConfig, SimulationResult } from './types/index.js';

const program = new Command();

program
  .name('simulacust')
  .description('SimulaCust: Behavioral simulation agents for testing agentic e-commerce')
  .version('0.1.0');

// ============================================================================
// Run Command
// ============================================================================

program
  .command('run')
  .description('Run simulation scenarios')
  .option('-s, --scenario <id>', 'Run a specific scenario by ID')
  .option('--suite <name>', 'Run a predefined suite (standard, adversarial, happy-path, all)')
  .option('-c, --category <category>', 'Run all scenarios in a category')
  .option('-p, --parallelism <number>', 'Number of parallel simulations', '5')
  .option('--commerce-url <url>', 'Commerce system endpoint URL')
  .option('--bank-url <url>', 'FauxBank endpoint URL')
  .option('-v, --verbose', 'Enable verbose output')
  .option('--json', 'Output results as JSON')
  .option('--evaluate', 'Run LLM-based evaluation on results')
  .action(async (options) => {
    let scenarios: ScenarioConfig[] = [];

    // Determine which scenarios to run
    if (options.scenario) {
      const scenario = Object.values(SCENARIOS).find((s) => s.id === options.scenario);
      if (!scenario) {
        console.error(`Scenario not found: ${options.scenario}`);
        console.log('Available scenarios:', Object.values(SCENARIOS).map((s) => s.id).join(', '));
        process.exit(1);
      }
      scenarios = [scenario];
    } else if (options.suite) {
      switch (options.suite) {
        case 'adversarial':
          scenarios = getAdversarialScenarios();
          break;
        case 'happy-path':
          scenarios = getHappyPathScenarios();
          break;
        case 'all':
          scenarios = getAllScenarios();
          break;
        case 'standard':
        default:
          scenarios = [...getHappyPathScenarios(), ...getScenariosByCategory('customer_service')];
          break;
      }
    } else if (options.category) {
      scenarios = getScenariosByCategory(options.category);
      if (scenarios.length === 0) {
        console.error(`No scenarios found in category: ${options.category}`);
        process.exit(1);
      }
    } else {
      // Default: run standard suite
      scenarios = [...getHappyPathScenarios(), ...getScenariosByCategory('customer_service')];
    }

    console.log(`Running ${scenarios.length} scenario(s)...`);
    if (options.verbose) {
      console.log('Scenarios:', scenarios.map((s) => s.id).join(', '));
    }

    const startTime = Date.now();

    // Run simulations
    const results = await runScenarios(scenarios, {
      commerceEndpoint: options.commerceUrl,
      bankEndpoint: options.bankUrl,
      parallelism: parseInt(options.parallelism),
      verbose: options.verbose,
      onMessage: options.verbose
        ? (msg, dir) => {
            const prefix = dir === 'customer' ? '  CUSTOMER:' : '  SYSTEM:';
            console.log(prefix, msg.content.slice(0, 100) + (msg.content.length > 100 ? '...' : ''));
          }
        : undefined,
    });

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

    // Aggregate results
    const summary = aggregateResults(results);

    // Evaluate if requested
    let report;
    if (options.evaluate) {
      console.log('\nRunning LLM evaluation...');
      const evaluator = new ConversationEvaluator({ useLLMJudge: true });
      report = await generateReport(results, evaluator);
    }

    // Output
    if (options.json) {
      console.log(JSON.stringify({ summary, report, results }, null, 2));
    } else {
      console.log('\n' + '='.repeat(60));
      console.log('SIMULATION RESULTS');
      console.log('='.repeat(60));
      console.log(`Total: ${summary.total}`);
      console.log(`Passed: ${summary.passed} (${((summary.passed / summary.total) * 100).toFixed(1)}%)`);
      console.log(`Failed: ${summary.failed}`);
      console.log(`Timeout: ${summary.timeout}`);
      console.log(`Errors: ${summary.errors}`);
      console.log(`Manipulation Detection Rate: ${(summary.manipulationDetectionRate * 100).toFixed(1)}%`);
      console.log(`Average Satisfaction: ${summary.averageSatisfaction.toFixed(2)}/5`);
      console.log(`Time: ${elapsed}s`);

      if (report) {
        console.log('\n' + '-'.repeat(60));
        console.log('EVALUATION SCORES');
        console.log('-'.repeat(60));
        console.log(`Empathy: ${report.summary.averageScores.empathy.toFixed(1)}/10`);
        console.log(`Helpfulness: ${report.summary.averageScores.helpfulness.toFixed(1)}/10`);
        console.log(`Clarity: ${report.summary.averageScores.clarity.toFixed(1)}/10`);
        console.log(`Policy Adherence: ${report.summary.averageScores.policyAdherence.toFixed(1)}/10`);
        console.log(`Overall: ${report.summary.averageScores.overall.toFixed(1)}/10`);

        if (report.recommendations.length > 0) {
          console.log('\nRecommendations:');
          report.recommendations.forEach((r) => console.log(`  - ${r}`));
        }
      }

      // Show failed scenarios
      const failed = results.filter((r) => !r.systemDefended);
      if (failed.length > 0 && !options.verbose) {
        console.log('\nFailed scenarios:');
        failed.forEach((r) => {
          console.log(`  - ${r.scenarioId}: ${r.error ?? 'System defense failed'}`);
        });
      }
    }
  });

// ============================================================================
// List Command
// ============================================================================

program
  .command('list')
  .description('List available scenarios and personas')
  .option('--scenarios', 'List all scenarios')
  .option('--personas', 'List all personas')
  .option('--category <category>', 'Filter scenarios by category')
  .option('--tier <tier>', 'Filter personas by tier (1-5)')
  .action((options) => {
    if (options.scenarios || (!options.scenarios && !options.personas)) {
      console.log('\nAVAILABLE SCENARIOS');
      console.log('='.repeat(60));

      const scenarios = options.category
        ? getScenariosByCategory(options.category)
        : getAllScenarios();

      const byCategory: Record<string, ScenarioConfig[]> = {};
      for (const s of scenarios) {
        if (!byCategory[s.category]) {
          byCategory[s.category] = [];
        }
        byCategory[s.category].push(s);
      }

      for (const [category, items] of Object.entries(byCategory)) {
        console.log(`\n[${category.toUpperCase()}]`);
        for (const s of items) {
          console.log(`  ${s.id}`);
          console.log(`    ${s.name}`);
          console.log(`    ${s.description}`);
        }
      }
    }

    if (options.personas) {
      console.log('\nAVAILABLE PERSONAS');
      console.log('='.repeat(60));

      const tiers = options.tier ? [parseInt(options.tier)] : [1, 2, 3, 4, 5];

      for (const tier of tiers) {
        const personas = getPersonasByTier(tier);
        if (personas.length > 0) {
          console.log(`\nTIER ${tier}`);
          for (const p of personas) {
            console.log(`  ${p.archetype} (${p.id})`);
            console.log(`    Name: ${p.name}`);
            console.log(`    ${p.description}`);
          }
        }
      }
    }
  });

// ============================================================================
// Single Simulation Command
// ============================================================================

program
  .command('simulate')
  .description('Run a single interactive simulation')
  .requiredOption('-p, --persona <archetype>', 'Persona archetype to use')
  .option('-g, --goal <type>', 'Primary goal type', 'PURCHASE_PRODUCT')
  .option('--commerce-url <url>', 'Commerce system endpoint URL')
  .option('--turns <number>', 'Maximum turns', '30')
  .action(async (options) => {
    const persona = PERSONAS[options.persona as keyof typeof PERSONAS];
    if (!persona) {
      console.error(`Persona not found: ${options.persona}`);
      console.log('Available personas:', Object.keys(PERSONAS).join(', '));
      process.exit(1);
    }

    const { scenario } = await import('./simulation/scenario.js');
    const testScenario = scenario()
      .id('interactive-test')
      .name('Interactive Test')
      .description('Interactive simulation session')
      .category('interactive')
      .persona(options.persona)
      .addGoal(options.goal, 0.9)
      .maxTurns(parseInt(options.turns))
      .build();

    console.log(`\nStarting simulation with persona: ${persona.name} (${persona.archetype})`);
    console.log(`Goal: ${options.goal}`);
    console.log('='.repeat(60));

    const runner = new SimulationRunner({
      commerceEndpoint: options.commerceUrl,
      verbose: true,
      onMessage: (msg, dir) => {
        const label = dir === 'customer' ? 'CUSTOMER' : 'SYSTEM';
        console.log(`\n[${label}]`);
        console.log(msg.content);
      },
      onStateChange: (state) => {
        console.log(
          `  [State] Frustration: ${(state.frustration * 100).toFixed(0)}% | ` +
            `Patience: ${(state.patience * 100).toFixed(0)}% | ` +
            `Trend: ${state.trend}`
        );
      },
    });

    const result = await runner.runScenario(testScenario);

    console.log('\n' + '='.repeat(60));
    console.log('SIMULATION COMPLETE');
    console.log('='.repeat(60));
    console.log(`Status: ${result.status}`);
    console.log(`Turns: ${result.turnCount}`);
    console.log(`Goal Achieved: ${result.customerGoalAchieved}`);
    console.log(`System Defended: ${result.systemDefended}`);
    console.log(`Satisfaction Score: ${result.customerSatisfactionScore?.toFixed(2) ?? 'N/A'}/5`);
  });

// ============================================================================
// Info Command
// ============================================================================

program
  .command('info')
  .description('Show information about SimulaCust')
  .action(() => {
    console.log(`
SimulaCust: Behavioral Simulation Agent Framework
==================================================

SimulaCust creates AI-powered simulated customers that interact with
agentic e-commerce systems to stress-test, validate, and harden
autonomous commerce before real-world deployment.

Key Features:
  - 24 persona archetypes across 5 tiers
  - Probability-based behavioral modeling
  - Continuous emotional state evolution
  - 15 manipulation tactics for adversarial testing
  - Goal-driven customer behavior
  - LLM-based conversation evaluation

Quick Start:
  simulacust run --suite standard       Run standard test suite
  simulacust run --suite adversarial    Run adversarial scenarios
  simulacust list --scenarios           List available scenarios
  simulacust list --personas            List available personas
  simulacust simulate -p SOCIAL_ENGINEER  Run single simulation

For more information: https://github.com/CrazyDubya/fauxCustomer
`);
  });

program.parse();
