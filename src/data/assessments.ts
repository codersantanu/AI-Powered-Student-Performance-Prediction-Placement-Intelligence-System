import type { AssessmentAttempt, AssessmentQuestion, AssessmentResult } from '../types';

export interface PreviewAssessment { id: number; title: string; category: string; difficulty: string; duration: number; questions: (AssessmentQuestion & { correctIndex: number })[]; }
const question = (id: number, category: string, text: string, options: string[], correctIndex: number, explanation: string): AssessmentQuestion & { correctIndex: number } => ({ id, category, text, options, correctIndex, explanation, difficulty: 'Basic' });
export const previewQuestionBank: PreviewAssessment[] = [
  { id: 101, title: 'Python Fundamentals', category: 'Python', difficulty: 'Basic', duration: 600, questions: [
    question(1, 'Python', 'What is the output of print(2 + 3 * 4)?', ['20', '14', '24', '9'], 1, 'Multiplication is evaluated before addition.'),
    question(2, 'Python', 'Which keyword defines a function in Python?', ['function', 'def', 'func', 'define'], 1, 'Python uses def to define a function.'),
    question(3, 'Python', 'Which collection is immutable?', ['List', 'Dictionary', 'Set', 'Tuple'], 3, 'Tuples cannot be modified after creation.'),
    question(4, 'Python', 'What does len([1, 2, 3]) return?', ['2', '3', '4', '6'], 1, 'len returns the number of items in a collection.'),
    question(5, 'Python', 'Which statement handles exceptions?', ['try / except', 'if / else', 'for / in', 'with / as'], 0, 'try / except handles exceptions.'),
  ] },
  { id: 102, title: 'Data Structures & Algorithms', category: 'Data Structures', difficulty: 'Basic', duration: 600, questions: [
    question(6, 'Data Structures', 'Which data structure uses FIFO ordering?', ['Stack', 'Queue', 'Tree', 'Set'], 1, 'A queue removes the first inserted element first.'),
    question(7, 'Data Structures', 'What is the average complexity of binary search on a sorted array?', ['O(1)', 'O(log n)', 'O(n)', 'O(n²)'], 1, 'Binary search halves the search interval each step.'),
    question(8, 'Data Structures', 'Which structure typically uses LIFO ordering?', ['Queue', 'Stack', 'Heap', 'Graph'], 1, 'A stack removes the most recently added element first.'),
    question(9, 'Data Structures', 'Which algorithm finds shortest paths with nonnegative edge weights?', ['Linear search', 'Dijkstra’s algorithm', 'Bubble sort', 'Binary search'], 1, 'Dijkstra’s algorithm works for nonnegative edge weights.'),
    question(10, 'Data Structures', 'What is lookup complexity in a balanced binary search tree?', ['O(1)', 'O(log n)', 'O(n)', 'O(n²)'], 1, 'A balanced tree has logarithmic height.'),
  ] },
  { id: 103, title: 'Database Management', category: 'DBMS', difficulty: 'Basic', duration: 600, questions: [
    question(11, 'DBMS', 'Which SQL clause filters rows?', ['ORDER BY', 'WHERE', 'GROUP BY', 'SELECT'], 1, 'WHERE filters rows before grouping.'),
    question(12, 'DBMS', 'Which key uniquely identifies a row?', ['Foreign key', 'Candidate key', 'Primary key', 'Index'], 2, 'A primary key uniquely identifies each row.'),
    question(13, 'DBMS', 'Which normal form removes transitive dependencies?', ['1NF', '2NF', '3NF', 'Unnormalized'], 2, 'Third normal form removes transitive dependencies.'),
    question(14, 'DBMS', 'Which JOIN returns all rows from the left table?', ['INNER JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'CROSS JOIN'], 1, 'LEFT JOIN preserves all rows from the left table.'),
    question(15, 'DBMS', 'Which SQL function counts rows?', ['SUM', 'COUNT', 'AVG', 'MIN'], 1, 'COUNT returns the number of rows or non-null values.'),
  ] },
  { id: 104, title: 'Java Programming', category: 'Java', difficulty: 'Basic', duration: 600, questions: [
    question(16, 'Java', 'Which keyword creates an object?', ['new', 'create', 'object', 'make'], 0, 'new allocates an object instance.'),
    question(17, 'Java', 'Which type stores true/false?', ['int', 'boolean', 'char', 'float'], 1, 'boolean has true and false values.'),
    question(18, 'Java', 'Which construct handles exceptions?', ['try / catch', 'handle / error', 'throw / end', 'guard / else'], 0, 'try / catch handles exceptions.'),
    question(19, 'Java', 'Which method starts a Java application?', ['start', 'run', 'main', 'init'], 2, 'The main method is the entry point.'),
    question(20, 'Java', 'Which keyword enables class inheritance?', ['implements', 'extends', 'inherits', 'super'], 1, 'extends creates a subclass.'),
  ] },
  { id: 105, title: 'C Programming', category: 'C', difficulty: 'Basic', duration: 600, questions: [
    question(21, 'C', 'Which header declares printf?', ['stdlib.h', 'stdio.h', 'string.h', 'math.h'], 1, 'printf is declared in stdio.h.'),
    question(22, 'C', 'Which operator dereferences a pointer?', ['&', '*', '.', '->'], 1, 'The unary * operator dereferences a pointer.'),
    question(23, 'C', 'What is the first array index?', ['-1', '0', '1', '2'], 1, 'C arrays are zero-indexed.'),
    question(24, 'C', 'Which function allocates uninitialized heap memory?', ['malloc', 'calloc', 'realloc', 'free'], 0, 'malloc allocates uninitialized memory.'),
    question(25, 'C', 'Which loop executes at least once?', ['for', 'while', 'do / while', 'if'], 2, 'The condition is checked after the body.'),
  ] },
  { id: 106, title: 'C++ Programming', category: 'C++', difficulty: 'Basic', duration: 600, questions: [
    question(26, 'C++', 'Which stream outputs to the console?', ['cin', 'cout', 'cerr', 'ifstream'], 1, 'cout writes to standard output.'),
    question(27, 'C++', 'Which operator extracts input from a stream?', ['<<', '>>', '::', '->'], 1, '>> extracts input from a stream.'),
    question(28, 'C++', 'Which feature models an is-a relationship?', ['Encapsulation', 'Inheritance', 'Polymorphism', 'Abstraction'], 1, 'Inheritance models an is-a relationship.'),
    question(29, 'C++', 'Which pointer has no valid target?', ['Reference', 'Null pointer', 'Array pointer', 'Function pointer'], 1, 'A null pointer does not point to an object.'),
    question(30, 'C++', 'Which header provides std::vector?', ['vector', 'array', 'list', 'map'], 0, 'std::vector is declared in vector.'),
  ] },
  { id: 107, title: 'Operating Systems', category: 'Operating Systems', difficulty: 'Basic', duration: 600, questions: [
    question(31, 'Operating Systems', 'What is a deadlock?', ['A completed process', 'Circular waiting for resources', 'A file operation', 'A scheduling policy'], 1, 'Deadlock involves circular waiting for resources.'),
    question(32, 'Operating Systems', 'Which technique uses disk space to extend logical memory?', ['Virtual memory', 'Cache invalidation', 'Interrupts', 'Buffering'], 0, 'Virtual memory extends logical memory using storage.'),
    question(33, 'Operating Systems', 'Which component schedules CPU execution?', ['Compiler', 'Scheduler', 'Linker', 'Assembler'], 1, 'The scheduler selects the next runnable process.'),
    question(34, 'Operating Systems', 'Which mechanism synchronizes concurrent processes?', ['Mutex', 'Filename', 'Register', 'Compiler flag'], 0, 'A mutex protects a shared resource.'),
    question(35, 'Operating Systems', 'Which is a page replacement algorithm?', ['FIFO', 'TCP', 'SQL', 'Quick sort'], 0, 'FIFO can replace pages.'),
  ] },
  { id: 108, title: 'Computer Networks', category: 'Computer Networks', difficulty: 'Basic', duration: 600, questions: [
    question(36, 'Computer Networks', 'Which protocol resolves domain names to IP addresses?', ['DHCP', 'DNS', 'FTP', 'ARP'], 1, 'DNS resolves domain names.'),
    question(37, 'Computer Networks', 'Which transport protocol is connection-oriented?', ['UDP', 'TCP', 'ICMP', 'ARP'], 1, 'TCP establishes a connection before transferring data.'),
    question(38, 'Computer Networks', 'Which device forwards packets between networks?', ['Hub', 'Router', 'Repeater', 'Modem'], 1, 'Routers forward packets between networks.'),
    question(39, 'Computer Networks', 'What does HTTPS use to protect communication?', ['Compression', 'TLS', 'DNS only', 'FTP'], 1, 'HTTPS uses TLS.'),
    question(40, 'Computer Networks', 'Which IP version uses 128-bit addresses?', ['IPv2', 'IPv4', 'IPv6', 'IPv8'], 2, 'IPv6 uses 128-bit addresses.'),
  ] },
  { id: 109, title: 'Artificial Intelligence', category: 'Artificial Intelligence', difficulty: 'Basic', duration: 600, questions: [
    question(41, 'Artificial Intelligence', 'Which search algorithm uses a heuristic?', ['Breadth-first search', 'A* search', 'Depth-first search', 'Linear search'], 1, 'A* uses a heuristic to prioritize nodes.'),
    question(42, 'Artificial Intelligence', 'Which is a supervised learning task?', ['Clustering', 'Dimensionality reduction', 'Classification with labels', 'Pattern discovery'], 2, 'Classification learns from labeled examples.'),
    question(43, 'Artificial Intelligence', 'What is an admissible heuristic?', ['Always zero', 'Never overestimates the true cost', 'Always overestimates', 'A random value'], 1, 'An admissible heuristic never overestimates remaining cost.'),
    question(44, 'Artificial Intelligence', 'Which algorithm alternates assignment and centroid updates?', ['Linear search', 'K-means', 'Bubble sort', 'Binary search'], 1, 'K-means alternates assignment and centroid updates.'),
    question(45, 'Artificial Intelligence', 'What is overfitting?', ['Good performance only on training data', 'Too little data', 'A model with no parameters', 'A training loop'], 0, 'Overfitting fits training-specific patterns and generalizes poorly.'),
  ] },
  { id: 110, title: 'Machine Learning', category: 'Machine Learning', difficulty: 'Basic', duration: 600, questions: [
    question(46, 'Machine Learning', 'Which metric is useful for imbalanced classification?', ['Training time', 'F1-score', 'File size', 'Number of features'], 1, 'F1 balances precision and recall.'),
    question(47, 'Machine Learning', 'Why is a test set held out?', ['Increase complexity', 'Estimate unseen performance', 'Remove missing values', 'Train the model'], 1, 'A held-out test set estimates generalization.'),
    question(48, 'Machine Learning', 'Where should preprocessing be fitted to avoid leakage?', ['Full dataset', 'Test set', 'Training pipeline only', 'After prediction'], 2, 'Preprocessing is learned from training data only.'),
    question(49, 'Machine Learning', 'What does a decision tree split on?', ['Row identifiers', 'Feature conditions', 'Random filenames', 'Test accuracy'], 1, 'Trees split using feature conditions.'),
    question(50, 'Machine Learning', 'What does a random forest combine?', ['Multiple decision trees', 'Only linear models', 'A single neighbor', 'A single rule'], 0, 'Random forests aggregate multiple trees.'),
  ] },
  { id: 111, title: 'Web Development', category: 'Web Development', difficulty: 'Basic', duration: 600, questions: [
    question(51, 'Web Development', 'Which language describes web page structure?', ['CSS', 'HTML', 'SQL', 'Python'], 1, 'HTML defines web content structure.'),
    question(52, 'Web Development', 'Which CSS property controls space inside an element?', ['margin', 'padding', 'border', 'outline'], 1, 'Padding creates space inside the border.'),
    question(53, 'Web Development', 'Which method retrieves data?', ['POST', 'GET', 'PATCH', 'DELETE'], 1, 'GET retrieves a resource representation.'),
    question(54, 'Web Development', 'What does React use to describe UI?', ['SQL tables', 'Components', 'Packets', 'File permissions'], 1, 'React builds interfaces from components.'),
    question(55, 'Web Development', 'What is an API?', ['Database index', 'Application programming interface', 'CSS framework', 'Password policy'], 1, 'An API defines software communication.'),
  ] },
];
const scenarios: [string, string[], string][] = [
  ['A teammate is struggling with your project update. What would you do?', ['Explain with a clear example and invite questions.', 'Speak more quickly.', 'Avoid the discussion.', 'Ask someone else without offering support.'], 'Communication'],
  ['You notice a misunderstanding in a discussion. What is your next step?', ['Ignore it.', 'Clarify the concern respectfully and check understanding.', 'Assign blame.', 'End the discussion without clarification.'], 'Communication'],
  ['Two deadlines overlap. How would you respond?', ['Work without a plan.', 'Prioritize by urgency and impact, communicate, and negotiate a realistic plan.', 'Wait until the last minute.', 'Do neither task and do not inform anyone.'], 'Decision-making'],
  ['An approach is not producing useful results. How would you investigate?', ['Change everything at once.', 'Reproduce the issue, break it down, and test one cause at a time.', 'Assume the first fix works.', 'Avoid testing.'], 'Problem-solving'],
  ['A teammate suggests a different approach. What would you do?', ['Dismiss it.', 'Discuss evidence and agree how to compare approaches.', 'Accept without considering goals.', 'Stop contributing.'], 'Teamwork'],
  ['Your team is uncertain about the next step. How could you help?', ['Assign every task without listening.', 'Clarify the goal, invite input, and agree responsibilities.', 'Wait for someone else.', 'Ignore the uncertainty.'], 'Leadership'],
  ['You have several tasks this week. What is a practical approach?', ['Schedule realistically, break down tasks, and review progress.', 'Ignore deadlines.', 'Change the plan hourly.', 'Leave everything until the final evening.'], 'Time management'],
  ['Requirements change after you start. How would you respond?', ['Continue without reviewing.', 'Understand the reason, assess impact, and adapt with the team.', 'Restart without a plan.', 'Refuse to discuss.'], 'Adaptability'],
  ['You read a surprising technology claim. What next?', ['Accept it because it sounds convincing.', 'Check original evidence and reliable sources.', 'Share without review.', 'Treat all claims as equally reliable.'], 'Critical thinking'],
  ['A familiar solution may not fit a new context. What next?', ['Use it without testing.', 'Evaluate assumptions, test a small version, and compare requirements.', 'Reject it because it is unfamiliar.', 'Change requirements to fit.'], 'Critical thinking'],
  ['You discover a mistake affecting the schedule. What next?', ['Hide it.', 'Inform the team, explain the impact, and help plan recovery.', 'Blame someone.', 'Promise a solution without investigation.'], 'Decision-making'],
  ['A teammate feels unheard. How could you support them?', ['Tell them to speak louder.', 'Invite their perspective and make space for discussion.', 'Ignore the concern.', 'Ask the team to exclude them.'], 'Leadership'],
];
export const psychometricBank: PreviewAssessment = { id: 201, title: 'Professional Skills & Self-Assessment', category: 'Psychometric', difficulty: 'Basic', duration: 900, questions: scenarios.map(([text, options, category], i) => question(301 + i, category, text, options, 0, 'A reflection prompt, not a clinical test. Consider the trade-offs and discuss your approach with a mentor.')) };
export function previewStart(assessmentId: number): AssessmentAttempt {
  const bank = assessmentId === 201 ? psychometricBank : previewQuestionBank.find((item) => item.id === assessmentId);
  if (!bank) throw new Error('This sample assessment is not available.');
  return { id: Date.now(), assessmentId, startedAt: new Date().toISOString(), submittedAt: null, duration: bank.duration, questions: bank.questions.map(({ id, text, options, category }) => ({ id, text, options, category, difficulty: 'Basic' })), result: null };
}
export function previewSubmit(attempt: AssessmentAttempt, answers: (number | null)[]): AssessmentResult {
  const bank = attempt.assessmentId === 201 ? psychometricBank : previewQuestionBank.find((item) => item.id === attempt.assessmentId)!;
  const psychometric = attempt.assessmentId === 201;
  const correct = attempt.questions.filter((_, i) => answers[i] === bank.questions[i].correctIndex).length;
  const categories = [...new Set(attempt.questions.map((question) => question.category))].map((name) => {
    const indices = attempt.questions.map((question, i) => question.category === name ? i : -1).filter((i) => i >= 0);
    const points = indices.filter((i) => answers[i] === (psychometric ? 0 : bank.questions[i].correctIndex)).length;
    return { name, score: Math.round(points / Math.max(1, indices.length) * 100) };
  });
  return { id: Date.now(), assessmentId: bank.id, title: bank.title, category: bank.category, score: psychometric ? null : Math.round(correct / attempt.questions.length * 100), correct, total: attempt.questions.length, date: new Date().toISOString(), categories, review: attempt.questions.map((question, i) => ({ question: question.text, selected: answers[i] == null ? 'Not answered' : question.options[answers[i]!], correctAnswer: question.options[bank.questions[i].correctIndex], explanation: question.explanation || '', correct: answers[i] === bank.questions[i].correctIndex })) };
}
