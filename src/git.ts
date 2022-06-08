import * as exec from '@actions/exec'
import * as io from '@actions/io'

export class Git {
  private gitCmd = ''
  private repoPath = ''

  private constructor() {}

  static async getInstance(repoPath: string): Promise<Git> {
    const git = new Git()
    await git.initialize(repoPath)
    return git
  }

  async clone(repository: string, ref: string): Promise<void> {
    await this.execGit(['init', this.repoPath])
    await this.execGit(['remote', 'add', 'origin', repository])
    await this.execGit(['config', '--local', 'gc.auto', '0'])
    await this.execGit([
      'fetch',
      '--prune',
      '--no-tags',
      '--no-recurse-submodules',
      '--depth=1',
      'origin',
      `+refs/heads/${ref}*:refs/remotes/origin/${ref}*`,
      `+refs/tags/${ref}*:refs/tags/${ref}*`
    ])

    let checkoutArgs: string[]
    if (await this.tagExists(ref)) {
      checkoutArgs = [ref]
    } else if (await this.branchExists(ref)) {
      checkoutArgs = ['-B', ref, `refs/remotes/origin/${ref}`]
    } else {
      throw new Error(`No ref ${ref} found in ${repository}`)
    }

    await this.execGit(['checkout', '--force', ...checkoutArgs])
  }

  private async initialize(repoPath: string): Promise<void> {
    this.gitCmd = await io.which('git', true)
    await io.mkdirP(repoPath)
    this.repoPath = repoPath
  }

  private async execGit(args: string[]): Promise<exec.ExecOutput> {
    return await exec.getExecOutput(this.gitCmd, args, {
      silent: true,
      cwd: this.repoPath
    })
  }

  private async branchExists(branchName: string): Promise<boolean> {
    const branchList = await this.execGit([
      'branch',
      '--list',
      '--remote',
      `origin/${branchName}`
    ])
    return !!branchList.stdout.trim()
  }

  private async tagExists(tagName: string): Promise<boolean> {
    const tagList = await this.execGit(['tag', '--list', tagName])
    return !!tagList.stdout.trim()
  }
}