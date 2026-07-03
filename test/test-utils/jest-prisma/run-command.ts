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

/**
 * Retries a command a few times. Used for `prisma migrate deploy` right after
 * `docker compose up`, since the db container can take a few seconds to
 * accept connections after its process starts.
 */
export async function runCommandWithRetry(
  command: string,
  args: readonly string[],
  env: NodeJS.ProcessEnv,
  retries = 5,
  delayMs = 2000
): Promise<void> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`Attempt ${attempt} of ${retries}: Running command: ${command} ${args.join(' ')}`);
      await runCommand(command, args, env);

      return;
    } catch (error) {
      console.error(`Attempt ${attempt} failed:`, error);

      if (attempt === retries) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}
