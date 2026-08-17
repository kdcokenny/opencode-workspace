interface NotifyBackendOptions {
	preferCmux: boolean
	tryCmuxNotify: () => Promise<boolean>
	sendDesktopNotification: () => void | Promise<void>
}

export interface DesktopNotificationOptions {
	title: string
	message: string
	subtitle?: string
	sound?: string
	senderBundleId?: string | null
}

interface DesktopNotificationRouterOptions extends DesktopNotificationOptions {
	platform: NodeJS.Platform | string
	sendNodeNotifierNotification: () => void
	sendMacOSNotification?: (options: DesktopNotificationOptions) => Promise<boolean>
}

interface AlerterProcess {
	exited: Promise<number>
}

interface AlerterRuntime {
	which?: (command: string) => string | null | Promise<string | null>
	spawnProcess?: (argv: string[]) => AlerterProcess
	warn?: (message: string) => void
}

const ALERTER_INSTALL_HINT =
	"install vjeantet/alerter (brew install vjeantet/tap/alerter) and ensure it is on PATH"

export function buildAlerterArguments(options: DesktopNotificationOptions): string[] {
	const argv = ["alerter", "--message", options.message, "--title", options.title]

	if (options.subtitle) {
		argv.push("--subtitle", options.subtitle)
	}

	if (options.sound) {
		argv.push("--sound", options.sound)
	}

	if (options.senderBundleId) {
		argv.push("--sender", options.senderBundleId)
	}

	return argv
}

export async function sendMacOSAlerterNotification(
	options: DesktopNotificationOptions,
	runtime: AlerterRuntime = {},
): Promise<boolean> {
	const which = runtime.which ?? Bun.which
	const warn = runtime.warn ?? console.warn

	try {
		const alerterPath = await which("alerter")
		if (!alerterPath) {
			warn(`notify: macOS desktop notification skipped; alerter not found on PATH (${ALERTER_INSTALL_HINT}).`)
			return false
		}

		const alerterArguments = buildAlerterArguments(options)
		const spawnProcess = runtime.spawnProcess ?? ((argv: string[]) => Bun.spawn(argv, { stdout: "ignore", stderr: "ignore" }))
		const process = spawnProcess([alerterPath, ...alerterArguments.slice(1)])

		// Alerter exits only after the user interacts with or dismisses the notification.
		// Observe failures without blocking the OpenCode hook that triggered it.
		void process.exited.then(
			(exitCode) => {
				if (exitCode !== 0) {
					warn(`notify: macOS desktop notification exited with code ${exitCode}.`)
				}
			},
			(error: unknown) => {
				const message = error instanceof Error ? error.message : String(error)
				warn(`notify: macOS desktop notification process failed (${message}).`)
			},
		)

		return true
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error)
		warn(`notify: macOS desktop notification skipped; alerter failed (${message}).`)
		return false
	}
}

export async function sendDesktopNotificationByPlatform(
	options: DesktopNotificationRouterOptions,
): Promise<void> {
	const { platform, sendNodeNotifierNotification, sendMacOSNotification, ...notificationOptions } = options

	if (platform === "darwin") {
		await (sendMacOSNotification ?? sendMacOSAlerterNotification)(notificationOptions)
		return
	}

	sendNodeNotifierNotification()
}

export async function sendNotificationWithFallback(options: NotifyBackendOptions): Promise<void> {
	if (!options.preferCmux) {
		await options.sendDesktopNotification()
		return
	}

	try {
		const sentViaCmux = await options.tryCmuxNotify()
		if (sentViaCmux) return
	} catch {
		// Fall through to desktop notification fallback
	}

	await options.sendDesktopNotification()
}
