import { execa } from 'execa';


/**
 * Runs a command using execa for better cross-platform support and error handling.
 * Only use with trusted commands and arguments.
 */
export async function runCommand(
  command: string,
  args: readonly string[],
  env: NodeJS.ProcessEnv
): Promise<void> {
  await execa(command, args, { env, stdio: 'inherit' });
}
