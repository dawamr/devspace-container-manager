import { createDockerClient } from '#/modules/docker/infrastructure/docker-client'
import { validateCommand } from '#/modules/agent/domain/exec-whitelist'

/**
 * Execute a command inside a Docker container.
 * Returns stdout/stderr and exit code.
 *
 * The Docker host (and optional cert path) must be provided so the correct
 * Docker Engine is contacted — matching the multi-host architecture where
 * each Environment carries its own dockerHost + dockerCertPath.
 */
export async function execInContainer(
  containerId: string,
  command: string,
  dockerHost: string,
  dockerCertPath?: string | null,
  workingDir?: string,
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const validation = validateCommand(command)
  if (!validation.valid) {
    throw new Error(`EXEC_REJECTED: ${validation.reason}`)
  }

  const docker = createDockerClient(dockerHost, dockerCertPath)
  const container = docker.getContainer(containerId)

  const exec = await container.exec({
    Cmd: ['sh', '-c', command],
    AttachStdout: true,
    AttachStderr: true,
    WorkingDir: workingDir,
  })

  const stream = await exec.start({ hijack: true, stdin: false })

  return new Promise<{ stdout: string; stderr: string; exitCode: number }>((resolve, reject) => {
    let stdout = ''
    let stderr = ''

    // dockerode streams are multiplexed when using hijack.
    // We need to handle the multiplexed protocol: each frame has an 8-byte
    // header — byte 0 = stream type (1=stdout, 2=stderr), bytes 4-7 = payload
    // length (big-endian uint32) — followed by the payload.
    stream.on('data', (chunk: Buffer) => {
      if (chunk.length > 0) {
        const streamType = chunk[0]
        const payload = chunk.slice(8).toString('utf8') // Skip 8-byte header
        if (streamType === 2) {
          stderr += payload
        } else {
          stdout += payload
        }
      }
    })

    stream.on('end', () => {
      exec.inspect().then((info) => {
        resolve({ stdout, stderr, exitCode: info.ExitCode ?? 0 })
      }).catch(reject)
    })

    stream.on('error', reject)
  })
}
