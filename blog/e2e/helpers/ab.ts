/**
 * TypeScript wrapper for agent-browser CLI.
 * Provides typed methods with session isolation for E2E tests.
 */
import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';

interface SnapshotOptions {
  interactive?: boolean;
  compact?: boolean;
  depth?: number;
  selector?: string;
}

interface ScreenshotOptions {
  fullPage?: boolean;
}

const EXEC_TIMEOUT = 30_000;

function buildSessionFlag(session: string): string {
  return `--session ${session}`;
}

export class AgentBrowser {
  readonly session: string;

  constructor(session?: string) {
    this.session = session ?? `test-${randomUUID().slice(0, 8)}`;
  }

  private exec(args: string): string {
    const cmd = `agent-browser ${args} ${buildSessionFlag(this.session)}`;
    try {
      return execSync(cmd, {
        encoding: 'utf-8',
        timeout: EXEC_TIMEOUT,
        stdio: ['pipe', 'pipe', 'pipe'],
      }).trim();
    } catch (err) {
      const e = err as { stderr?: string; message?: string };
      const stderr = e.stderr?.trim() ?? '';
      throw new Error(
        `agent-browser command failed: ${cmd}\n${stderr || e.message}`,
      );
    }
  }

  // --- Core ---

  open(url: string): void {
    this.exec(`open "${url}"`);
  }

  close(): void {
    try {
      this.exec('close');
    } catch {
      // Browser may already be closed
    }
  }

  // --- Wait ---

  waitForLoad(state: 'load' | 'domcontentloaded' | 'networkidle' = 'networkidle'): void {
    this.exec(`wait --load ${state}`);
  }

  wait(ms: number): void {
    this.exec(`wait ${ms}`);
  }

  waitForText(text: string): void {
    this.exec(`wait --text "${text.replace(/"/g, '\\"')}"`);
  }

  waitForSelector(selector: string): void {
    this.exec(`wait "${selector}"`);
  }

  // --- Snapshot ---

  snapshot(opts?: SnapshotOptions): string {
    const flags: string[] = ['snapshot'];
    if (opts?.interactive) flags.push('-i');
    if (opts?.compact) flags.push('-c');
    if (opts?.depth) flags.push(`-d ${opts.depth}`);
    if (opts?.selector) flags.push(`-s "${opts.selector}"`);
    return this.exec(flags.join(' '));
  }

  // --- Interaction ---

  click(ref: string): void {
    this.exec(`click "${ref}"`);
  }

  press(key: string): void {
    this.exec(`press ${key}`);
  }

  scroll(direction: 'up' | 'down' | 'left' | 'right', px?: number): void {
    this.exec(`scroll ${direction}${px ? ` ${px}` : ''}`);
  }

  scrollIntoView(selector: string): void {
    this.exec(`scrollintoview "${selector}"`);
  }

  type(selector: string, text: string): void {
    this.exec(`type "${selector}" "${text.replace(/"/g, '\\"')}"`);
  }

  hover(ref: string): void {
    this.exec(`hover "${ref}"`);
  }

  // --- Visual ---

  screenshot(path?: string, opts?: ScreenshotOptions): string {
    const flags: string[] = ['screenshot'];
    if (opts?.fullPage) flags.push('--full');
    if (path) flags.push(path);
    return this.exec(flags.join(' '));
  }

  // --- JS Eval ---

  /**
   * Run JavaScript in the browser and return the raw string result.
   * For complex scripts, use base64 encoding to avoid shell quoting issues.
   */
  eval(js: string): string {
    const b64 = Buffer.from(js).toString('base64');
    return this.exec(`eval -b ${b64}`);
  }

  // --- Get Info ---

  getTitle(): string {
    return this.exec('get title');
  }

  getUrl(): string {
    return this.exec('get url');
  }

  getText(selector: string): string {
    return this.exec(`get text "${selector}"`);
  }

  // --- Viewport ---

  setViewport(width: number, height: number): void {
    this.exec(`set viewport ${width} ${height}`);
  }

  // --- Find helpers ---

  /**
   * Extract all @eN references from a snapshot string that match a text pattern.
   * Returns an array of ref strings like ["@e12", "@e45"].
   */
  static findRefs(snapshot: string, pattern: string | RegExp): string[] {
    const regex = pattern instanceof RegExp ? pattern : new RegExp(pattern, 'i');
    const refs: string[] = [];
    for (const line of snapshot.split('\n')) {
      if (regex.test(line)) {
        // Snapshot uses [ref=eN] format; click/interact uses @eN
        const refMatch = line.match(/\[ref=(e\d+)\]/g);
        if (refMatch) {
          refs.push(...refMatch.map(m => `@${m.slice(5, -1)}`));
        }
      }
    }
    return refs;
  }

  /**
   * Find the first @eN reference matching a text pattern.
   * Throws if no match found.
   */
  static findRef(snapshot: string, pattern: string | RegExp): string {
    const refs = AgentBrowser.findRefs(snapshot, pattern);
    if (refs.length === 0) {
      const pat = pattern instanceof RegExp ? pattern.source : pattern;
      throw new Error(`No ref found matching: ${pat}`);
    }
    return refs[0];
  }

  /**
   * Check if snapshot text contains a pattern (case-insensitive by default).
   */
  static contains(snapshot: string, text: string): boolean {
    return snapshot.toLowerCase().includes(text.toLowerCase());
  }
}
