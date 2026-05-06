import { type Plugin, tool } from "@opencode-ai/plugin"

// ==========================================
// STATE TYPES
// ==========================================

type ReviewLoopState =
	| "idle"
	| "awaiting_changes"
	| "awaiting_review"
	| "review_in_progress"
	| "needs_discussion"

interface ReviewLoopEntry {
	state: ReviewLoopState
	active: boolean
	reviewerDelegationId?: string
	lastVerdictSummary?: string
}

// ==========================================
// IN-MEMORY STATE
// ==========================================

/** Per-rootSessionID review loop state */
const loopState = new Map<string, ReviewLoopEntry>()

/** Captures tool call args by callID for correlation in tool.execute.after */
const pendingToolArgs = new Map<string, Record<string, unknown>>()
const pendingToolArgsTimestamps = new Map<string, number>()

/** Stale call timeout matches MAX_RUN_TIME_MS in background-agents.ts */
const STALE_ARGS_TIMEOUT_MS = 15 * 60 * 1000

const cleanupInterval = setInterval(() => {
	const now = Date.now()
	for (const [callID, ts] of pendingToolArgsTimestamps) {
		if (now - ts > STALE_ARGS_TIMEOUT_MS) {
			pendingToolArgs.delete(callID)
			pendingToolArgsTimestamps.delete(callID)
		}
	}
}, 60_000)
cleanupInterval.unref?.()

// ==========================================
// HELPERS
// ==========================================

function extractAssessmentSummary(text: string): string {
	const match = text.match(/###\s*Overall Assessment\s*\n+([^\n]+)/)
	return match?.[1]?.trim() ?? text.slice(0, 200).replace(/\n/g, " ")
}

// ==========================================
// PLUGIN
// ==========================================

const ReviewLoopPlugin: Plugin = async (ctx) => {
	async function getRootSessionID(sessionID?: string): Promise<string> {
		if (!sessionID) throw new Error("sessionID is required to resolve root session scope")
		let currentID = sessionID
		for (let depth = 0; depth < 10; depth++) {
			const session = await ctx.client.session.get({ path: { id: currentID } })
			if (!session.data?.parentID) return currentID
			currentID = session.data.parentID
		}
		throw new Error("Failed to resolve root session: maximum traversal depth exceeded")
	}

	function getOrCreateEntry(rootID: string): ReviewLoopEntry {
		if (!loopState.has(rootID)) {
			loopState.set(rootID, { state: "idle", active: false })
		}
		return loopState.get(rootID)!
	}

	return {
		tool: {
			review_loop_start: tool({
				description:
					"Activate the iterative plan review loop for this session. Call this BEFORE delegating to the reviewer agent.",
				args: {},
				async execute(_args, toolCtx) {
					if (!toolCtx?.sessionID)
						return "❌ review_loop_start requires sessionID. This is a system error."
					const rootID = await getRootSessionID(toolCtx.sessionID)
					const entry = getOrCreateEntry(rootID)
					entry.state = "review_in_progress"
					entry.active = true
					entry.reviewerDelegationId = undefined
					entry.lastVerdictSummary = undefined
					return "Review loop activated. Now call plan_read, then delegate to the reviewer agent with the full plan content."
				},
			}),

			review_loop_status: tool({
				description: "Check the current state of the review loop for this session.",
				args: {},
				async execute(_args, toolCtx) {
					if (!toolCtx?.sessionID)
						return "❌ review_loop_status requires sessionID. This is a system error."
					const rootID = await getRootSessionID(toolCtx.sessionID)
					const entry = loopState.get(rootID)
					if (!entry?.active) return "Review loop is not active."
					return [
						`State: ${entry.state}`,
						`Reviewer delegation ID: ${entry.reviewerDelegationId ?? "none"}`,
						`Last verdict: ${entry.lastVerdictSummary ?? "none"}`,
					].join("\n")
				},
			}),
		},

		"tool.execute.before": async (
			input: { tool: string; callID?: string },
			output: { args?: Record<string, unknown> },
		) => {
			if (!input.callID) return
			if (input.tool !== "delegate" && input.tool !== "delegation_read") return
			if (!output.args) return
			pendingToolArgs.set(input.callID, { ...output.args })
			pendingToolArgsTimestamps.set(input.callID, Date.now())
		},

		"tool.execute.after": async (
			input: { tool: string; sessionID: string; callID: string },
			output: { output: string },
		) => {
			if (!input.sessionID) return

			let rootID: string
			try {
				rootID = await getRootSessionID(input.sessionID)
			} catch {
				return
			}

			// Retrieve and clean up captured args
			const savedArgs = pendingToolArgs.get(input.callID)
			if (input.tool === "delegate" || input.tool === "delegation_read") {
				pendingToolArgs.delete(input.callID)
				pendingToolArgsTimestamps.delete(input.callID)
			}

			const entry = loopState.get(rootID)
			if (!entry?.active) return

			// Store reviewer delegation ID when delegate(reviewer) fires
			if (input.tool === "delegate" && (savedArgs?.agent as string) === "reviewer") {
				const delegationId = output.output?.trim()
				if (delegationId) {
					entry.reviewerDelegationId = delegationId
					entry.state = "review_in_progress"
				}
				return
			}

			// Detect verdict when the tracked reviewer delegation result is read
			if (input.tool === "delegation_read" && savedArgs?.id === entry.reviewerDelegationId) {
				const text = output.output ?? ""
				if (text.includes("REQUEST_CHANGES")) {
					entry.state = "awaiting_changes"
					entry.lastVerdictSummary = extractAssessmentSummary(text)
					output.output +=
						"\n\n<system-reminder>Reviewer requested changes. " +
						"Revise the plan and call plan_save when ready.</system-reminder>"
				} else if (text.includes("NEEDS_DISCUSSION")) {
					entry.state = "needs_discussion"
					entry.active = false
					entry.lastVerdictSummary = extractAssessmentSummary(text)
					output.output +=
						"\n\n<system-reminder>Reviewer flagged items for discussion. " +
						"Review loop paused. Resolve concerns with the user, " +
						"then re-run /review-loop.</system-reminder>"
				} else if (text.includes("APPROVE")) {
					entry.state = "idle"
					entry.active = false
					output.output +=
						"\n\n<system-reminder>Plan approved. Review loop complete.</system-reminder>"
				}
				return
			}

			// plan_save while awaiting changes → transition, override workspace-plugin nudge
			if (input.tool === "plan_save" && entry.state === "awaiting_changes") {
				entry.state = "awaiting_review"
				output.output +=
					"\n\n<system-reminder>Review loop active — delegation to reviewer will " +
					"occur automatically at next idle. Do NOT call delegate manually.</system-reminder>"
			}
		},

		event: async ({
			event,
		}: {
			event: { type: string; properties: Record<string, unknown> }
		}) => {
			const isIdle =
				event.type === "session.idle" ||
				(event.type === "session.status" &&
					(event.properties.status as { type?: string } | undefined)?.type === "idle")

			if (!isIdle) return

			const sessionID = event.properties.sessionID as string | undefined
			if (!sessionID) return

			let rootID: string
			try {
				rootID = await getRootSessionID(sessionID)
			} catch {
				return
			}

			const entry = loopState.get(rootID)
			if (!entry?.active) return

			if (entry.state === "awaiting_changes") {
				await ctx.client.session.prompt({
					path: { id: sessionID },
					body: {
						parts: [
							{
								type: "text",
								text: "The reviewer requested changes. Please revise the plan and call plan_save when ready.",
							},
						],
					},
				})
			} else if (entry.state === "awaiting_review") {
				await ctx.client.session.prompt({
					path: { id: sessionID },
					body: {
						parts: [
							{
								type: "text",
								text: "The plan has been revised. Please delegate to the reviewer agent now with the full plan content.",
							},
						],
					},
				})
			}
		},

		"experimental.session.compacting": async (
			input: { sessionID: string },
			output: { context: string[]; prompt?: string },
		) => {
			let rootID: string
			try {
				rootID = await getRootSessionID(input.sessionID)
			} catch {
				return
			}

			const entry = loopState.get(rootID)
			if (!entry?.active) return

			output.context.push(
				`Review loop is active. Current state: ${entry.state}. ` +
					`Last reviewer verdict: ${entry.lastVerdictSummary ?? "none yet"}. ` +
					`Continue iterating on the plan until the reviewer returns APPROVE.`,
			)
		},
	}
}

export default ReviewLoopPlugin
