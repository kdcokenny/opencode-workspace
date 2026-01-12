import * as crypto from "node:crypto"
import * as fs from "node:fs/promises"
import { stat } from "node:fs/promises"
import * as os from "node:os"
import * as path from "node:path"
import { type Plugin, tool } from "@opencode-ai/plugin"
import type { createOpencodeClient } from "@opencode-ai/sdk"
import { z } from "zod"

// ==========================================
// PROJECT ID UTILITIES (duplicated for plugin isolation)
// ==========================================

type OpencodeClient = ReturnType<typeof createOpencodeClient>

/**
 * Log warning via OpenCode client or console fallback.
 * @param client - Optional OpenCode client for proper logging
 * @param message - Warning message to log
 */
function logWarn(client: OpencodeClient | undefined, message: string): void {
	if (client) {
		client.app
			.log({
				body: { service: "worktree", level: "warn", message },
			})
			.catch(() => {})
	} else {
		console.warn(message)
	}
}

/**
 * Generate a short hash from a path for project ID fallback.
 * @param projectRoot - Absolute path to hash
 * @returns 16-char hex hash
 */
function hashPath(projectRoot: string): string {
	const hash = crypto.createHash("sha256").update(projectRoot).digest("hex")
	return hash.slice(0, 16)
}

/**
 * Generate a unique project ID from the project root path.
 *
 * Uses the first root commit SHA for stability across renames/moves.
 * Falls back to path hash for non-git repos or empty repos.
 * Caches result in .git/opencode for performance.
 *
 * Handles git worktrees: when .git is a file (worktree), resolves the
 * actual .git directory and uses shared cache.
 *
 * @param projectRoot - Absolute path to the project root
 * @returns 40-char hex SHA (git root) or 16-char hash (fallback)
 */
async function getProjectId(projectRoot: string, client?: OpencodeClient): Promise<string> {
	// Guard clause (Law 1)
	if (!projectRoot || typeof projectRoot !== "string") {
		throw new Error("getProjectId: projectRoot is required and must be a string")
	}

	const gitPath = path.join(projectRoot, ".git")

	// Check if .git exists and what type it is
	const gitStat = await stat(gitPath).catch(() => null)

	if (!gitStat) {
		// .git doesn't exist - not a git repo, use path hash fallback
		logWarn(client, `getProjectId: No .git found at ${projectRoot}, using path hash`)
		return hashPath(projectRoot)
	}

	let gitDir = gitPath

	// Handle worktree case: .git is a file containing gitdir reference
	if (gitStat.isFile()) {
		const content = await Bun.file(gitPath).text()
		const match = content.match(/^gitdir:\s*(.+)$/m)

		if (!match) {
			throw new Error(`getProjectId: .git file exists but has invalid format at ${gitPath}`)
		}

		// Resolve path (handles both relative and absolute)
		const gitdirPath = match[1].trim()
		const resolvedGitdir = path.resolve(projectRoot, gitdirPath)

		// The gitdir contains a 'commondir' file pointing to shared .git
		const commondirPath = path.join(resolvedGitdir, "commondir")
		const commondirFile = Bun.file(commondirPath)
		if (await commondirFile.exists()) {
			const commondirContent = (await commondirFile.text()).trim()
			gitDir = path.resolve(resolvedGitdir, commondirContent)
		} else {
			// Fallback to ../.. assumption for older git or unusual setups
			gitDir = path.resolve(resolvedGitdir, "../..")
		}

		// Validate resolved path exists
		const gitDirStat = await stat(gitDir).catch(() => null)
		if (!gitDirStat?.isDirectory()) {
			throw new Error(`getProjectId: Resolved gitdir ${gitDir} is not a directory`)
		}
	}

	// Check cache
	const cacheFile = path.join(gitDir, "opencode")
	const cache = Bun.file(cacheFile)

	if (await cache.exists()) {
		const cached = (await cache.text()).trim()
		// Validate cache content (40-char hex for git hash, or 16-char for path hash)
		if (/^[a-f0-9]{40}$/i.test(cached) || /^[a-f0-9]{16}$/i.test(cached)) {
			return cached
		}
		logWarn(client, `getProjectId: Invalid cache content at ${cacheFile}, regenerating`)
	}

	// Generate project ID from git root commit
	try {
		const proc = Bun.spawn(["git", "rev-list", "--max-parents=0", "--all"], {
			cwd: projectRoot,
			stdout: "pipe",
			stderr: "pipe",
			env: { ...process.env, GIT_DIR: undefined, GIT_WORK_TREE: undefined },
		})

		// 5 second timeout to prevent hangs on network filesystems
		const timeoutMs = 5000
		const exitCode = await Promise.race([
			proc.exited,
			new Promise<number>((_, reject) =>
				setTimeout(() => {
					proc.kill()
					reject(new Error(`git rev-list timed out after ${timeoutMs}ms`))
				}, timeoutMs),
			),
		]).catch(() => 1) // Treat timeout as failure, fall back to path hash
		if (exitCode === 0) {
			const output = await new Response(proc.stdout).text()
			const roots = output
				.split("\n")
				.filter(Boolean)
				.map((x) => x.trim())
				.sort()

			if (roots.length > 0 && /^[a-f0-9]{40}$/i.test(roots[0])) {
				const projectId = roots[0]
				// Cache the result
				try {
					await Bun.write(cacheFile, projectId)
				} catch (e) {
					logWarn(client, `getProjectId: Failed to cache project ID: ${e}`)
				}
				return projectId
			}
		} else {
			const stderr = await new Response(proc.stderr).text()
			logWarn(client, `getProjectId: git rev-list failed (${exitCode}): ${stderr.trim()}`)
		}
	} catch (error) {
		logWarn(client, `getProjectId: git command failed: ${error}`)
	}

	// Fallback to path hash
	return hashPath(projectRoot)
}

// ==========================================
// PLAN SCHEMA & VALIDATION
// ==========================================

const PhaseStatus = z.enum(["PENDING", "IN PROGRESS", "COMPLETE", "BLOCKED"])

const TaskSchema = z.object({
	id: z.string().regex(/^\d+\.\d+$/, "Task ID must be hierarchical (e.g., '2.1')"),
	checked: z.boolean(),
	content: z.string().min(1, "Task content cannot be empty"),
	isCurrent: z.boolean().optional(),
	citation: z
		.string()
		.regex(/^ref:[a-z]+-[a-z]+-[a-z]+$/, "Citation must be ref:word-word-word format")
		.optional(),
})

const PhaseSchema = z.object({
	number: z.number().int().positive(),
	name: z.string().min(1, "Phase name cannot be empty"),
	status: PhaseStatus,
	tasks: z.array(TaskSchema).min(1, "Phase must have at least one task"),
})

const FrontmatterSchema = z.object({
	status: z.enum(["not-started", "in-progress", "complete", "blocked"]),
	phase: z.number().int().positive(),
	updated: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
})

const PlanSchema = z.object({
	frontmatter: FrontmatterSchema,
	goal: z.string().min(10, "Goal must be at least 10 characters"),
	context: z
		.array(
			z.object({
				decision: z.string(),
				rationale: z.string(),
				source: z.string(),
			}),
		)
		.optional(),
	phases: z.array(PhaseSchema).min(1, "Plan must have at least one phase"),
})

/**
 * Result type for plan parsing - either valid data or descriptive error.
 * Follows Law 2: Parse Don't Validate - boundary parsing returns trusted types.
 */
type ParseResult =
	| { ok: true; data: z.infer<typeof PlanSchema>; warnings: string[] }
	| { ok: false; error: string; hint: string }

/**
 * Raw extracted parts from markdown (no validation).
 * Used as intermediate type before Zod validation.
 */
interface ExtractedParts {
	frontmatter: Record<string, string | number> | null
	goal: string | null
	phases: Array<{
		number: number
		name: string
		status: string
		tasks: Array<{
			id: string
			checked: boolean
			content: string
			isCurrent: boolean
			citation?: string
		}>
	}>
}

/**
 * Extract all parts from markdown without validation (Law 2: Parse Don't Validate).
 * Returns raw extracted data - validation happens in parsePlanMarkdown.
 * This is a pure extraction function (Law 3: Purity).
 */
function extractMarkdownParts(content: string): ExtractedParts {
	// Extract frontmatter (no validation - just extraction)
	const fmMatch = content.match(/^---\n([\s\S]*?)\n---/)
	let frontmatter: Record<string, string | number> | null = null

	if (fmMatch) {
		frontmatter = {}
		const fmLines = fmMatch[1].split("\n")
		for (const line of fmLines) {
			const [key, ...valueParts] = line.split(":")
			if (key && valueParts.length > 0) {
				const value = valueParts.join(":").trim()
				frontmatter[key.trim()] = key.trim() === "phase" ? parseInt(value, 10) : value
			}
		}
	}

	// Extract goal (no validation - just extraction)
	const goalMatch = content.match(/## Goal\n([^\n#]+)/)
	const goal = goalMatch?.[1]?.trim() || null

	// Extract phases (no validation - just extraction)
	const phases: ExtractedParts["phases"] = []
	const phaseRegex =
		/## Phase (\d+): ([^[]+)\[([^\]]+)\]\n([\s\S]*?)(?=## Phase \d+:|## Notes|## Blockers|$)/g

	let phaseMatch = phaseRegex.exec(content)
	while (phaseMatch !== null) {
		const phaseNum = parseInt(phaseMatch[1], 10)
		const phaseName = phaseMatch[2].trim()
		const phaseStatus = phaseMatch[3].trim()
		const phaseContent = phaseMatch[4]

		const tasks: ExtractedParts["phases"][0]["tasks"] = []
		const taskRegex =
			/- \[([ x])\] (\*\*)?(\d+\.\d+) ([^←\n]+)(← CURRENT)?.*?(`ref:[a-z]+-[a-z]+-[a-z]+`)?/g

		let taskMatch = taskRegex.exec(phaseContent)
		while (taskMatch !== null) {
			tasks.push({
				id: taskMatch[3],
				checked: taskMatch[1] === "x",
				content: taskMatch[4].trim().replace(/\*\*/g, ""),
				isCurrent: !!taskMatch[5],
				citation: taskMatch[6]?.replace(/`/g, ""),
			})
			taskMatch = taskRegex.exec(phaseContent)
		}

		// Include phase even if no tasks (let Zod validate)
		phases.push({
			number: phaseNum,
			name: phaseName,
			status: phaseStatus,
			tasks,
		})
		phaseMatch = phaseRegex.exec(content)
	}

	return { frontmatter, goal, phases }
}

/**
 * Format Zod validation errors into human-readable messages (Law 4: Fail Loud).
 * Shows ALL errors at once with clear paths.
 */
function formatZodErrors(error: z.ZodError): string {
	const errorMessages: string[] = []

	for (const issue of error.issues) {
		const path = issue.path.length > 0 ? `[${issue.path.join(".")}]` : "[root]"

		// Provide helpful context based on error type
		let message = issue.message
		if (issue.code === "invalid_enum_value" && "options" in issue) {
			message = `Invalid value. Expected: ${(issue.options as string[]).join(" | ")}`
		} else if (issue.code === "invalid_type" && issue.received === "null") {
			message = "Required field missing"
		}

		errorMessages.push(`${path}: ${message}`)
	}

	return errorMessages.join("\n")
}

/**
 * Parse and validate markdown plan in a single boundary operation.
 * Returns ParseResult: either trusted data or descriptive error with hint.
 *
 * Follows all 5 Laws:
 * - Law 1 (Early Exit): Guard at top for empty content
 * - Law 2 (Parse Don't Validate): Extract all → validate once at end
 * - Law 3 (Purity): No side effects, same input = same output
 * - Law 4 (Fail Loud): Shows ALL validation errors with clear paths
 * - Law 5 (Intentional Naming): Self-documenting function names
 */
function parsePlanMarkdown(content: string): ParseResult {
	const skillHint = "Load skill('plan-protocol') for the full format spec."

	// Guard: Content must be string (Law 1: Early Exit, Law 2: Parse at boundary)
	if (typeof content !== "string") {
		return {
			ok: false,
			error: `Expected markdown string, received ${typeof content}`,
			hint: skillHint,
		}
	}

	// Guard: Empty content (Law 1: Early Exit)
	if (!content.trim()) {
		return {
			ok: false,
			error: "Empty content provided",
			hint: skillHint,
		}
	}

	// Extract all parts without validation (Law 2: Parse Don't Validate)
	const parts = extractMarkdownParts(content)

	// Build candidate object for validation
	const candidate = {
		frontmatter: parts.frontmatter,
		goal: parts.goal,
		phases: parts.phases,
	}

	// Single validation point: Zod schema (Law 2: Parse Don't Validate)
	const result = PlanSchema.safeParse(candidate)
	if (!result.success) {
		return {
			ok: false,
			error: formatZodErrors(result.error),
			hint: skillHint,
		}
	}

	// Business rules validation (still part of single boundary)
	const warnings: string[] = []
	let currentCount = 0
	let inProgressCount = 0

	for (const phase of result.data.phases) {
		if (phase.status === "IN PROGRESS") inProgressCount++
		for (const task of phase.tasks) {
			if (task.isCurrent) currentCount++
		}
	}

	if (currentCount > 1) {
		return {
			ok: false,
			error: `Multiple tasks marked ← CURRENT (found ${currentCount}). Only one task may be current.`,
			hint: skillHint,
		}
	}

	if (inProgressCount > 1) {
		warnings.push("Multiple phases marked IN PROGRESS. Consider focusing on one phase at a time.")
	}

	return { ok: true, data: result.data, warnings }
}

/**
 * Format parse error with actionable guidance (Law 4: Fail Loud).
 * Includes error message, example, and skill hint.
 */
function formatParseError(error: string, hint: string): string {
	return `❌ Plan validation failed:

${error}

💡 ${hint}`
}

/**
 * Type guard for Node.js filesystem errors (ENOENT, EACCES, etc.)
 * Follows "Parse, Don't Validate" - handle uncertainty at boundaries.
 */
function isNodeError(error: unknown): error is NodeJS.ErrnoException {
	return error instanceof Error && "code" in error
}

/**
 * Expected input for experimental.chat.system.transform hook.
 * Note: The official SDK types this as {}, but runtime provides these properties.
 * See: https://github.com/sst/opencode/issues/6142
 */
interface SystemTransformInput {
	agent?: string
	sessionID?: string
}

/**
 * KDCO Workspace Plugin
 *
 * Provides plan management and targeted rule injection.
 * Research functionality has been moved to the delegation system (background-agents).
 * Follows "Elegant Defense" philosophy: Flat, Safe, and Fast.
 */

// ==========================================
// CODER TASK TRACKING FOR REVIEW TRIGGER
// ==========================================

/** Tracks in-flight coder task callIDs with timestamps for stale cleanup */
const activeCoderCalls = new Map<string, { startTime: number }>()

/** Stale call timeout - matches MAX_RUN_TIME_MS in background-agents.ts */
const STALE_CALL_TIMEOUT_MS = 15 * 60 * 1000

/** Periodic cleanup of orphaned callIDs (runs every 60s) */
const cleanupInterval = setInterval(() => {
	const now = Date.now()
	for (const [callID, data] of activeCoderCalls) {
		if (now - data.startTime > STALE_CALL_TIMEOUT_MS) {
			activeCoderCalls.delete(callID)
		}
	}
}, 60_000)
// Prevent interval from keeping process alive
cleanupInterval.unref?.()

// ==========================================
// RULES FOR INJECTION
// ==========================================

const PLAN_RULES = `<system-reminder>
<workspace-routing policy_level="critical">

## Agent Routing (STRICT BOUNDARIES)

| Agent | Scope | Use For |
|-------|-------|---------|
| \`explore\` | **INTERNAL ONLY** - codebase files | Find files, understand code structure, trace logic |
| \`researcher\` | **EXTERNAL ONLY** - outside codebase | Documentation, websites, npm packages, APIs, tutorials |
| \`scribe\` | Human-facing content | Documentation drafts, commit messages, PR descriptions |

## Critical Constraints

**You are a READ-ONLY orchestrator. You coordinate research, you do NOT search yourself.**

- \`explore\` CANNOT access external resources (docs, web, APIs)
- \`researcher\` CANNOT search codebase files
- For external docs about a library used in the codebase → \`researcher\`
- For how that library is used in THIS codebase → \`explore\`

<example>
User: "What does the OpenAI API say about function calling?"
Correct: delegate to researcher (EXTERNAL - API documentation)
Wrong: Try to answer from memory or use MCP tools directly
</example>

<example>
User: "Where is the auth middleware in this project?"
Correct: delegate to explore (INTERNAL - codebase search)
Wrong: Use grep/glob directly
</example>

<example>
User: "How should I implement OAuth2 in this project?"
Correct: 
  1. delegate to researcher for OAuth2 best practices (EXTERNAL)
  2. delegate to explore for existing auth patterns (INTERNAL)
Wrong: Search codebase yourself or answer from memory
</example>

</workspace-routing>

<philosophy>
Load relevant skills before finalizing plan:
- Planning work → \`skill\` load \`plan-protocol\` (REQUIRED before using plan_save)
- Backend/logic work → \`skill\` load \`code-philosophy\`
- UI/frontend work → \`skill\` load \`frontend-philosophy\`
</philosophy>

<plan-format>
Use \`plan_save\` to save your implementation plan as markdown.

### Format
\`\`\`markdown
---
status: in-progress
phase: 2
updated: YYYY-MM-DD
---

# Implementation Plan

## Goal
[One sentence describing the outcome]

## Context & Decisions
| Decision | Rationale | Source |
|----------|-----------|--------|
| [choice] | [why] | \`ref:delegation-id\` |

## Phase 1: [Name] [COMPLETE]
- [x] 1.1 Task description
- [x] 1.2 Another task → \`ref:delegation-id\`

## Phase 2: [Name] [IN PROGRESS]
- [x] 2.1 Completed task
- [ ] **2.2 Current task** ← CURRENT
- [ ] 2.3 Pending task
\`\`\`

### Rules
1. **One CURRENT task** - Only one task may have ← CURRENT
2. **Cite decisions** - Use \`ref:delegation-id\` for research-informed choices
3. **Update immediately** - Mark tasks complete right after finishing
4. **Auto-save after approval** - When user approves your plan, immediately call \`plan_save\`. Do NOT wait for user to remind you or switch modes.
</plan-format>

<instruction name="plan_persistence" policy_level="critical">

## Plan Mode Active
You are in PLAN MODE. Your primary deliverable is a saved implementation plan.

## Requirements
1. **First**: Load the \`plan-protocol\` skill to understand the required plan schema
2. **During**: Collaborate with the user to develop a comprehensive, well-cited plan
3. **Before exiting**: You MUST call \`plan_save\` with the finalized plan

## CRITICAL
Saving your plan is a REQUIREMENT, not a request. Plans that are not saved will be lost when the session ends or mode changes. The user cannot see your plan unless you save it.

</instruction>
</system-reminder>`

const BUILD_RULES = `<system-reminder>
<delegation-mandate policy_level="critical">

## You Are an ORCHESTRATOR

You coordinate work. You do NOT implement.

**CRITICAL CONSTRAINTS:**
- ALL code changes → delegate to \`coder\`
- ALL documentation → delegate to \`scribe\`
- Codebase questions → delegate to \`explore\` (INTERNAL only)
- External docs/APIs → delegate to \`researcher\` (EXTERNAL only)

**You may directly:**
- Read files for quick context

**You may NOT:**
- Edit or write any files
- Run bash commands (delegate verification to \`coder\`)

## Verification Workflow
For any command execution (bun check, bun test, git operations):
1. Delegate to \`coder\` with specific instructions
2. Coder runs commands and reports results
3. You interpret results and decide next actions

\`coder\` is your execution proxy for ALL bash operations.

</delegation-mandate>

<workspace-routing policy_level="critical">

## Agent Routing (STRICT BOUNDARIES)

| Agent | Scope | Use For |
|-------|-------|---------|
| \`explore\` | **INTERNAL ONLY** - codebase files | Find files, understand code structure, trace logic |
| \`researcher\` | **EXTERNAL ONLY** - outside codebase | Documentation, websites, npm packages, APIs, tutorials |
| \`coder\` | Implementation | Write/edit code, run builds and tests |
| \`scribe\` | Human-facing content | Documentation, commit messages, PR descriptions |

## Boundary Rules

- \`explore\` CANNOT access external resources (docs, web, APIs)
- \`researcher\` CANNOT search codebase files
- \`coder\` handles ALL code modifications
- \`scribe\` handles ALL human-facing content

</workspace-routing>

<build-workflow>

### Before Writing Code
1. Call \`plan_read\` to get the current plan
2. Call \`delegation_list\` ONCE to see available research
3. Call \`delegation_read\` for relevant findings
4. **REUSE code snippets from researcher research** - they are production-ready

### Philosophy Loading
Load the relevant skill BEFORE delegating to coder:
- Frontend work → \`skill\` load \`frontend-philosophy\`
- Backend work → \`skill\` load \`code-philosophy\`

### Execution
1. Orient: Read plan with \`plan_read\` and check delegation findings
2. Load: Load relevant philosophy skill(s)
3. Delegate: Send implementation tasks to \`coder\`
4. Verify: Check coder's results, run \`bun check\` if needed
5. Document: Delegate doc updates to \`scribe\`
6. Update: Mark tasks complete in plan

</build-workflow>

<code-review-protocol>

## Code Review Protocol

When implementation is complete (all plan steps done OR user's request fulfilled):
1. BEFORE reporting completion to the user
2. Delegate to \`reviewer\` agent with the list of changed files
3. Include review findings in your completion report
4. If critical (🔴) or major (🟠) issues found, offer to fix them

Do NOT skip this step. Do NOT ask permission to review.
The user expects reviewed code, not just implemented code.

Review triggers:
- All plan tasks marked complete
- User's implementation request fulfilled
- Before saying "done" or "complete"

</code-review-protocol>
</system-reminder>`

export const WorkspacePlugin: Plugin = async (ctx) => {
	const { directory } = ctx

	// Use git root commit hash for cross-worktree consistency
	const projectId = await getProjectId(directory)
	const baseDir = path.join(os.homedir(), ".local", "share", "opencode", "workspace", projectId)

	/**
	 * Resolves the root session ID by walking up the parent chain.
	 */
	async function getRootSessionID(sessionID?: string): Promise<string> {
		if (!sessionID) {
			throw new Error("sessionID is required to resolve root session scope")
		}

		let currentID = sessionID
		for (let depth = 0; depth < 10; depth++) {
			const session = await ctx.client.session.get({
				path: { id: currentID },
			})

			if (!session.data?.parentID) {
				return currentID
			}

			currentID = session.data.parentID
		}

		throw new Error("Failed to resolve root session: maximum traversal depth exceeded")
	}

	return {
		tool: {
			plan_save: tool({
				description:
					"Save the implementation plan as markdown. Must include citations (ref:delegation-id) for decisions based on research. Plan is validated before saving.",
				args: {
					content: tool.schema.string().describe("The full plan in markdown format"),
				},
				async execute(args, toolCtx) {
					// Guard 1: Session required (Law 1: Early Exit)
					if (!toolCtx?.sessionID) {
						return "❌ plan_save requires sessionID. This is a system error."
					}

					const rootID = await getRootSessionID(toolCtx.sessionID)
					const sessionDir = path.join(baseDir, rootID)
					await fs.mkdir(sessionDir, { recursive: true })

					// Guard 2: Parse and validate at boundary (Law 2: Parse Don't Validate)
					const result = parsePlanMarkdown(args.content)
					if (!result.ok) {
						return formatParseError(result.error, result.hint)
					}

					// Happy path: save
					await fs.writeFile(path.join(sessionDir, "plan.md"), args.content, "utf8")
					const warningCount = result.warnings?.length ?? 0
					const warningText =
						warningCount > 0 ? ` (${warningCount} warnings: ${result.warnings?.join(", ")})` : ""

					return `Plan saved.${warningText}`
				},
			}),

			plan_read: tool({
				description: "Read the current implementation plan for this session.",
				args: {
					reason: tool.schema
						.string()
						.describe("Brief explanation of why you are calling this tool"),
				},
				async execute(_args, toolCtx) {
					// Guard: Session required (Law 1: Early Exit)
					if (!toolCtx?.sessionID) {
						return "❌ plan_read requires sessionID. This is a system error."
					}
					const rootID = await getRootSessionID(toolCtx.sessionID)
					const planPath = path.join(baseDir, rootID, "plan.md")
					try {
						return await fs.readFile(planPath, "utf8")
					} catch (error) {
						if (isNodeError(error) && error.code === "ENOENT") return "No plan found."
						throw error
					}
				},
			}),
		},

		// Targeted Rule Injection
		"experimental.chat.system.transform": async (input: SystemTransformInput, output) => {
			const agent = input.agent

			// Universal date awareness (all agents) - Law 2: Parse intent, not just data
			const today = new Date().toISOString().split("T")[0]
			output.system.push(`<date-awareness>
Today is ${today}. When searching for documentation, APIs, or external resources, use the current year (${new Date().getFullYear()}). Do not default to outdated years from training data.
</date-awareness>`)

			// Agent-specific rules
			if (agent === "plan") {
				output.system.push(PLAN_RULES)
			} else if (agent === "build") {
				output.system.push(BUILD_RULES)
			}
		},

		// Track coder task starts for review trigger
		"tool.execute.before": async (
			input: { tool: string; callID?: string },
			output: { args?: { subagent_type?: string } },
		) => {
			if (input.tool !== "task") return
			if (!input.callID) return
			if (output.args?.subagent_type !== "coder") return

			activeCoderCalls.set(input.callID, { startTime: Date.now() })
		},

		// Trigger review reminder when plan_save or all coder tasks complete
		"tool.execute.after": async (
			input: { tool: string; sessionID: string; callID: string },
			output: { title: string; output: string; metadata: unknown },
		) => {
			// Plan save triggers reviewer delegation reminder
			if (input.tool === "plan_save") {
				output.output += `\n\n<system-reminder>
Plan saved successfully. You MUST now delegate to the reviewer:
1. Use the \`delegate\` tool to send the plan to the \`reviewer\` agent
2. The reviewer will load \`plan-review\` and \`code-philosophy\` skills
3. Use \`plan_read\` to get the plan content for the delegation prompt
4. This is NON-BLOCKING - continue work while review runs in background
</system-reminder>`
				return
			}

			// Coder task completion tracking
			if (!input.callID) return
			if (!activeCoderCalls.has(input.callID)) return

			activeCoderCalls.delete(input.callID)

			if (activeCoderCalls.size === 0) {
				output.output += `\n\n<system-reminder>
Coder task complete. Proceed to code review:
1. Delegate to \`reviewer\` agent with the changed files
2. Include findings in your completion report
3. Offer to fix any critical/major issues found
</system-reminder>`
			}
		},

		// Compaction Hook - Inject plan context when session is compacted
		"experimental.session.compacting": async (
			input: { sessionID: string },
			output: { context: string[]; prompt?: string },
		) => {
			const rootID = await getRootSessionID(input.sessionID)
			const planPath = path.join(baseDir, rootID, "plan.md")

			let planContent: string | null = null
			try {
				planContent = await fs.readFile(planPath, "utf8")
			} catch (error) {
				if (!isNodeError(error) || error.code !== "ENOENT") throw error
			}

			if (!planContent) return

			// Extract current task from plan
			const currentMatch = planContent.match(/← CURRENT/)
			const currentTask = currentMatch
				? planContent
						.slice(Math.max(0, currentMatch.index! - 100), currentMatch.index! + 50)
						.match(/\d+\.\d+ [^\n←]+/)?.[0]
				: null

			output.context.push(`<workspace-context>
## Current Plan
${planContent}

## Resume Point
${currentTask ? `Current task: ${currentTask}` : "No task marked as CURRENT"}

## Verification
To verify any cited decision, use \`delegation_read("ref:id")\`.
</workspace-context>`)
		},
	}
}

export default WorkspacePlugin
