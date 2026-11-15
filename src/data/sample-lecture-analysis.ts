import type { LectureAnalysis, TranscriptSegment } from '@/types/lecture';

/**
 * Placeholder results used until the transcription backend is connected.
 * Shape matches what the backend will return (see AUDIO_PROCESSING_SPEC.md),
 * so screens built on it work unchanged with real data.
 */

const SAMPLE_LINES = [
  "Good morning everyone. Today we're starting a new topic: dynamic programming.",
  'Dynamic programming is a way of solving problems by breaking them into smaller subproblems and reusing their answers.',
  'For dynamic programming to apply, a problem needs two properties. The first is optimal substructure.',
  'Optimal substructure means the best solution to the whole problem is built from the best solutions to its subproblems.',
  "Think of the shortest route from Lagos to Abuja through Ibadan. The Lagos to Ibadan part must itself be the shortest route.",
  'The second property is overlapping subproblems: the same smaller problems come up again and again.',
  'Take the Fibonacci sequence. A naive recursive solution recomputes fib of n minus two many times over.',
  'Memoization fixes that. It is the top-down approach: recurse as normal, but cache every answer the first time you compute it.',
  'Tabulation is the bottom-up approach. You start from the base cases and fill a table until you reach the answer you want.',
  'Both approaches turn an exponential algorithm into a linear one for Fibonacci.',
  'The heart of every DP solution is the state transition equation, for example dp of i equals dp of i minus one plus dp of i minus two.',
  'When you meet a new problem, first define the state, then write the transition, then decide your base cases.',
  "Note that not every problem has optimal substructure. The longest simple path in a graph does not.",
  "For next class, read chapter fifteen and attempt the coin change problem. It will come up in your test.",
];

function buildTranscript(durationSeconds: number): TranscriptSegment[] {
  // Spread the lines over the real recording length (min 1s per line).
  const total = Math.max(durationSeconds, SAMPLE_LINES.length);
  const step = total / SAMPLE_LINES.length;
  return SAMPLE_LINES.map((text, i) => ({
    start: Math.round(i * step * 10) / 10,
    end: Math.round((i + 1) * step * 10) / 10,
    text,
  }));
}

export function buildSampleAnalysis(input: {
  courseCode: string;
  courseTitle: string;
  durationSeconds: number;
}): LectureAnalysis {
  return {
    source: 'sample',
    title: 'Introduction to Dynamic Programming',
    summary:
      'An introduction to dynamic programming: the two properties a problem needs (optimal substructure and overlapping subproblems), the top-down memoization and bottom-up tabulation approaches, and how to write a state transition equation.',
    transcript: buildTranscript(input.durationSeconds),
    concepts: [
      {
        id: 'c1',
        title: 'Memoization',
        summary: 'Top-down approach. Cache the result of each recursive call so it is computed only once.',
        icon: 'hardware-chip-outline',
      },
      {
        id: 'c2',
        title: 'Tabulation',
        summary: 'Bottom-up approach. Start at the base cases and fill a table up to the answer.',
        icon: 'grid-outline',
      },
      {
        id: 'c3',
        title: 'Optimal Substructure',
        summary: 'The best solution to the problem is made of best solutions to its subproblems.',
        icon: 'git-network-outline',
      },
      {
        id: 'c4',
        title: 'Overlapping Subproblems',
        summary: 'The same smaller problems are solved repeatedly, so storing their answers saves work.',
        icon: 'layers-outline',
      },
      {
        id: 'c5',
        title: 'State Transition Equation',
        summary: 'The recurrence that defines a bigger state from smaller ones, e.g. dp[i] = dp[i-1] + dp[i-2].',
        icon: 'calculator-outline',
      },
    ],
    knowledgeGap: {
      concept: 'Optimal Substructure',
      reason:
        'This is the property students most often confuse with overlapping subproblems, and it decides whether DP applies at all. Expect it in your test.',
      explanation:
        'A problem has optimal substructure if an optimal solution contains optimal solutions to its subproblems.\n\nExample: if the shortest route from Lagos to Abuja passes through Ibadan, then the Lagos → Ibadan part must also be the shortest route between those two cities.\n\nWhere it fails: the longest simple path in a graph. Joining two longest sub-paths can repeat vertices, so the property does not hold.',
    },
    questions: [
      {
        id: 'q1',
        question: 'Which approach builds the solution bottom-up by filling a table from the base cases?',
        options: ['Greedy choice', 'Tabulation', 'Memoization', 'Divide and conquer'],
        correctIndex: 1,
        explanation: 'Tabulation starts at the base cases and fills the table iteratively up to the answer.',
      },
      {
        id: 'q2',
        question: 'What does memoization store?',
        options: [
          'The input array in sorted order',
          'Results of subproblems already computed',
          'Every possible path through the problem',
          'Only the final answer',
        ],
        correctIndex: 1,
        explanation: 'Memoization caches each subproblem result so a repeated call returns instantly.',
      },
      {
        id: 'q3',
        question: 'Which problem does NOT have optimal substructure?',
        options: ['Shortest path', 'Fibonacci', 'Longest simple path', 'Coin change'],
        correctIndex: 2,
        explanation: 'Combining two longest simple sub-paths can repeat vertices, so the property breaks.',
      },
      {
        id: 'q4',
        question: 'Why is naive recursive Fibonacci slow?',
        options: [
          'It uses too much memory',
          'It recomputes the same subproblems many times',
          'It cannot handle large numbers',
          'It sorts the input first',
        ],
        correctIndex: 1,
        explanation: 'Overlapping subproblems: fib(n-2) and smaller values are recomputed exponentially often.',
      },
      {
        id: 'q5',
        question: 'What is the first step when designing a DP solution?',
        options: ['Write the base cases', 'Define the state', 'Choose a sorting algorithm', 'Draw the recursion tree'],
        correctIndex: 1,
        explanation: 'Define what a state represents; the transition and base cases follow from it.',
      },
    ],
    flashcards: [
      {
        question: 'What are the two properties a problem needs for dynamic programming?',
        answer: '1. Optimal substructure.\n2. Overlapping subproblems.',
      },
      {
        question: 'Memoization vs tabulation?',
        answer: 'Memoization: top-down recursion with a cache.\nTabulation: bottom-up, fill a table from the base cases.',
      },
      {
        question: 'What is a state transition equation?',
        answer: 'The recurrence defining a larger state from smaller ones, e.g. dp[i] = dp[i-1] + dp[i-2].',
      },
      {
        question: 'Give a problem without optimal substructure.',
        answer: 'Longest simple path in a graph.',
      },
    ],
    notes: [
      {
        heading: 'What dynamic programming is',
        points: [
          'Break a problem into smaller subproblems and reuse their answers.',
          'Needs optimal substructure and overlapping subproblems.',
        ],
      },
      {
        heading: 'Two approaches',
        points: [
          'Memoization (top-down): recurse, cache each result the first time.',
          'Tabulation (bottom-up): fill a table from base cases upward.',
          'Both make Fibonacci linear instead of exponential.',
        ],
      },
      {
        heading: 'Designing a solution',
        points: ['Define the state.', 'Write the state transition equation.', 'Set the base cases.'],
      },
      {
        heading: 'For next class',
        points: ['Read chapter 15.', 'Attempt the coin change problem (likely in the test).'],
      },
    ],
  };
}
