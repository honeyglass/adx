# How known CLIs keep their data folder

Research for adx. Every source was read on 2026-11-20. Source files were read on the branch head
of that day (named after each link), not on a pinned commit. "Not found" means the sources I read
do not show it; it does not mean the tool lacks it.

## Sources

| Key | Source |
| :--- | :--- |
| aws-files | https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-files.html |
| aws-env | https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-envvars.html |
| aws-writer | https://github.com/aws/aws-cli/blob/develop/awscli/customizations/configure/writer.py |
| aws-set | https://github.com/aws/aws-cli/blob/develop/awscli/customizations/configure/set.py |
| k8s-doc | https://kubernetes.io/docs/concepts/configuration/organize-cluster-access-kubeconfig/ |
| k8s-setctx | https://kubernetes.io/docs/reference/kubectl/generated/kubectl_config/kubectl_config_set-context/ |
| k8s-loader | https://github.com/kubernetes/client-go/blob/master/tools/clientcmd/loader.go |
| k8s-config | https://github.com/kubernetes/client-go/blob/master/tools/clientcmd/config.go |
| docker-doc | https://docs.docker.com/reference/cli/docker/ |
| docker-dir | https://github.com/docker/cli/blob/master/cli/config/config.go |
| docker-file | https://github.com/docker/cli/blob/master/cli/config/configfile/file.go |
| docker-meta | https://github.com/docker/cli/blob/master/cli/context/store/metadatastore.go and store.go |
| docker-ctx | https://github.com/docker/cli/blob/master/cli/command/context/create.go |
| gh-env | https://cli.github.com/manual/gh_help_environment |
| gogh-config | https://github.com/cli/go-gh/blob/trunk/pkg/config/config.go |
| gh-config | https://github.com/cli/cli/blob/trunk/internal/config/config.go |
| gh-migrate | https://github.com/cli/cli/blob/trunk/internal/config/migration/multi_account.go |
| gh-alias | https://github.com/cli/cli/blob/trunk/pkg/cmd/alias/set/set.go |
| gh-login | https://github.com/cli/cli/blob/trunk/pkg/cmd/auth/login/login.go |
| gcloud-conf | https://docs.cloud.google.com/sdk/docs/configurations |
| gcloud-topic | https://docs.cloud.google.com/sdk/gcloud/reference/topic/configurations |
| gcloud-cred | https://docs.cloud.google.com/docs/security/bps-for-protecting-developer-credentials |
| npm-rc | https://docs.npmjs.com/cli/v11/configuring-npm/npmrc |
| npm-config | https://docs.npmjs.com/cli/v11/using-npm/config |
| npm-save | https://github.com/npm/cli/blob/latest/workspaces/config/lib/index.js (`save`) |
| git-doc | https://git-scm.com/docs/git-config and https://github.com/git/git/blob/master/Documentation/config/core.adoc |
| git-lock | https://github.com/git/git/blob/master/lockfile.h |
| git-config | https://github.com/git/git/blob/master/config.c (`repo_config_set_multivar_in_file_gently`) |

## aws

- **Location and layout.** Two INI files: `~/.aws/config` and `~/.aws/credentials` (`%UserProfile%` on
  Windows). Sections are profiles, such as `[default]` and `[profile user1]`. Credentials may stand in
  either file; the docs suggest the credentials file, and its keys win when both name the same
  profile (aws-files). Caches stand beside them: `~/.aws/sso/cache`, `~/.aws/cli/cache`, and the
  history `~/.aws/cli/history/history.db` (aws-files, aws-env). So config and secrets are split,
  caches are subfolders of the same folder.
- **Moving it.** Only by environment variable: `AWS_CONFIG_FILE` and `AWS_SHARED_CREDENTIALS_FILE`.
  The docs say of both: "You can't specify this value in a named profile setting or by using a
  command line parameter" (aws-env). `--profile` picks a profile and wins over `AWS_PROFILE`, but it
  does not move the files. Handling of a set but empty variable: not found.
- **Creation and permissions.** The file and its parent folders are created at the first write, not
  before. The file is created with mode `0o600`; the folders with `os.makedirs` and its default mode
  (aws-writer, `_create_file`). When a credential key is written, the tool warns if the file is
  "more permissive than 0o600" (aws-writer, aws-set: `check_permissions=True` for the credential keys).
- **Changing.** `aws configure set <key> <value> [--profile p]` sets one key and overwrites an
  existing value with no switch (aws-set, aws-writer `update_config`). Keys and values with a line
  break are refused (aws-writer `_validate_no_newlines_or_carriage_returns`).
- **Concurrency.** None found. The file is read, changed in memory, and written in place with
  `open(config_filename, 'w')`; a new section is appended with mode `'a'` (aws-writer). No temporary
  file, no rename, no lock.
- **Versions.** No version field found.

## kubectl

- **Location and layout.** One YAML file, `$HOME/.kube/config`, with `apiVersion: v1`, `kind: Config`
  and the lists `clusters`, `users` and `contexts` (k8s-doc). Credentials live in `users` of the same
  file. No split of config and secrets.
- **Moving it.** `KUBECONFIG` holds a list of files, merged by fixed rules ("The first file to set a
  particular value or map key wins"). `--kubeconfig` names one file, and wins: "If the --kubeconfig
  flag is set, use only the specified file. Do not merge." (k8s-doc). An empty `KUBECONFIG` counts
  as not set: the loader takes the default file (k8s-loader, `NewDefaultClientConfigLoadingRules`,
  `len(envVarFiles) != 0`).
- **Creation and permissions.** `WriteToFile` creates the folder with `0755` and writes the file with
  `0600`; the comment says it "stomps the contents" of an existing file (k8s-loader). A new entry
  goes to the explicit file, else the first existing file of the list, else the first in the list
  (k8s-loader `GetDefaultFilename`).
- **Changing.** `kubectl config set-context` on an existing name merges: "Specifying a name that
  already exists will merge new fields on top of existing values for those fields" (k8s-setctx).
  No switch needed.
- **Concurrency.** `ModifyConfig` takes a lock file `<file>.lock` for every file in the list,
  created with `O_CREATE|O_EXCL`, sorted "to avoid deadlock", and removed afterwards; it fails at
  once when the lock exists, with no retry (k8s-config `lockFile`, `UseModifyConfigLock = true`). The
  write itself is `os.WriteFile` in place, not a temporary file plus rename (k8s-loader).
- **Versions.** The file carries `apiVersion` and `kind`, and is decoded against the version the
  library knows (k8s-loader, `Decode` with `clientcmdlatest.Version`). A migration of the location
  exists: `currentMigrationRules` copies the old `~/.kube/.kubeconfig` to `~/.kube/config`, and the
  comment asks that "Any future changes to RecommendedHomeFile" add a rule there (k8s-loader).

## docker

- **Location and layout.** `~/.docker` holds `config.json` (JSON) and folders the CLI manages; the
  docs say you "shouldn't modify them" (docker-doc). Contexts live in `contexts/meta/<digest>/meta.json`
  and `contexts/tls/...`, where the folder name is the digest of the context name, never the name
  itself (docker-meta, `contextdirOf` uses `digest.FromString(name)`).
- **Secrets.** With `credsStore` set, `docker login` hands the credentials to an external program
  `docker-credential-<value>`; without it they stand in `auths` in `config.json` (docker-doc).
- **Moving it.** `DOCKER_CONFIG` or `--config`; "the --config option overrides the DOCKER_CONFIG
  environment variable" (docker-doc). An empty `DOCKER_CONFIG` falls back to `~/.docker`
  (docker-dir, `if configDir == ""`).
- **Creation and permissions.** `Save` creates the folder with `0o700` at the first save, writes a
  temporary file from `os.CreateTemp` beside the target, copies owner and mode of the existing file
  to it, then renames (docker-file). Context folders are created with `0o755` and `meta.json` is
  written with `0o644` through an atomic writer (docker-meta).
- **Links.** `Save` follows a link at `config.json` on purpose and replaces the link's target
  ("Handle situation where the configfile is a symlink", `filepath.EvalSymlinks`, docker-file).
- **Changing.** `docker context create` refuses a taken name: `context %q already exists`
  (docker-ctx, `checkContextNameForCreation`); changing goes through a separate command
  (`docker context update`, as `docker context --help` of the installed CLI lists it).
- **Concurrency.** Temporary file plus rename gives whole files; no lock found, so two parallel
  saves end with the last one.
- **Versions.** No version field in `config.json` found.

## gh

- **Location and layout.** Two YAML files in the config folder: `config.yml` and `hosts.yml`
  (gogh-config). gh splits by XDG: config in `$XDG_CONFIG_HOME/gh` or `~/.config/gh`, state in
  `~/.local/state/gh`, data in `~/.local/share/gh`, cache in `~/.cache/gh`; on Windows
  `%AppData%\GitHub CLI` for config and `%LocalAppData%\GitHub CLI` for the rest (gogh-config
  `ConfigDir`, `StateDir`, `DataDir`, `CacheDir`; gh-env).
- **Secrets.** `gh auth login` stores the token in the system credential store; `--insecure-storage`
  saves it "in plain text instead of credential store" (gh-login), in `hosts.yml`.
- **Moving it.** `GH_CONFIG_DIR`, "the directory where gh will store configuration files" (gh-env).
  No option found. An empty `GH_CONFIG_DIR` is skipped and the next source is used (gogh-config,
  `a != ""`).
- **Creation and permissions.** At the first write: folders with `0771`, files with `0600`
  (gogh-config `writeFile`).
- **Changing.** `gh alias set` refuses a taken name: "name already taken, use the --clobber flag to
  overwrite it"; `--clobber` means "Overwrite existing aliases of the same name" (gh-alias).
  `gh config set` overwrites with no switch (not checked in source).
- **Concurrency.** Only an in-process mutex (gogh-config `c.mu`). The file is opened with
  `O_TRUNC` and written in place (gogh-config `writeFile`): no temporary file, no lock between
  processes.
- **Versions.** `config.yml` has a top-level `version` key (gh-config, default config `version: 1`).
  `Migrate` runs a migration only when the file's version equals the migration's `PreVersion`, sets
  `PostVersion`, and writes the file back; a mismatch is an error ("pre migration version did not
  match config version") (gh-config). The one migration goes from no version to `"1"` (gh-migrate).

## gcloud

- **Location and layout.** "typically ~/.config/gcloud on MacOS and Linux, or %APPDATA%\gcloud on
  Windows" (gcloud-conf). Named configurations exist, and one is active (gcloud-topic). Their file
  names and format: not found in the official docs. The CLI keeps "credential metadata and refresh
  tokens in a local credentials database" and caches access tokens in the configuration folder;
  `gcloud auth application-default login` "writes a plaintext JSON file",
  `application_default_credentials.json` (gcloud-cred).
- **Moving it.** `CLOUDSDK_CONFIG` moves the folder (gcloud-conf, gcloud-topic). `--configuration`
  and `CLOUDSDK_ACTIVE_CONFIG_NAME` pick a named configuration for one call, they do not move the
  folder. An option that moves the folder: not found. Precedence of flag and variable: not found.
- **Creation and permissions.** Not found.
- **Changing.** `gcloud config set` changes the active configuration (gcloud-conf); whether it needs
  a switch: not found. `gcloud init` on an existing configuration "will remove all its existing
  properties!" (gcloud-topic).
- **Concurrency.** Not found.
- **Versions.** Not found.

## npm

- **Location and layout.** INI files `key = value`: per project `.npmrc`, per user `$HOME/.npmrc`,
  global `$PREFIX/etc/npmrc`, and the built-in file (npm-rc). Credentials (`_auth`, `_authToken`,
  ...) stand in the same files, scoped to a registry prefix (npm-rc). No split of config and secrets.
- **Moving it.** `--userconfig` or `NPM_CONFIG_USERCONFIG`; flags rank above environment variables
  in the list of sources (npm-config).
- **Creation and permissions.** At `save`: `mkdir(dir, { recursive: true })`, `writeFile`, then
  `chmod` to `0o600` for the user file and `0o666` otherwise (npm-save). The mode is set after the
  write, so a new file exists briefly with the default mode.
- **Changing.** `npm config set` overwrites with no switch; a save that leaves the file empty deletes
  it (npm-save).
- **Concurrency.** None: `writeFile` in place, no lock, no rename (npm-save).
- **Versions.** Not found.

## git

- **Location and layout.** INI-like files: system `$(prefix)/etc/gitconfig`, global `~/.gitconfig`
  and `$XDG_CONFIG_HOME/git/config`, local `.git/config` (git-doc). With `--global`, git writes
  `~/.gitconfig`, or the XDG file "if this file exists and the ~/.gitconfig file doesn't" (git-doc).
- **Moving it.** `GIT_CONFIG_GLOBAL` and `GIT_CONFIG_SYSTEM`; `git config --file` names one file for
  that command (git-doc).
- **Creation and permissions.** A missing file is created at the first write (git-config: `ENOENT`
  is "happy: we are creating this file anew"). A read-only file is refused, not replaced ("Do not
  allow updating a read-only configuration file"). The new file keeps the mode of the old one
  (`chmod` of the lock file to `st.st_mode & 07777`) (git-config).
- **Changing.** `set` overwrites one value; it "refuses to write multi-valued config options" unless
  `--all` or `--value=` is given; `--replace-all` and `--append` exist; a set on a key with several
  matching lines fails with exit code 5 (git-doc).
- **Concurrency.** A lock file `<file>.lock`, created with `O_CREAT|O_EXCL`; the new content is
  written into the lock file and renamed into place, so "Readers do not block, but they are
  guaranteed to see either the old contents of the file or the new contents" (git-lock). The lock is
  removed on exit and on signals (git-lock). For config files git retries for
  `core.configLockTimeout`, default 1000 ms (git-doc core.adoc, git-config).
- **Versions.** The repository config holds `core.repositoryFormatVersion`, "identifying the
  repository format and layout version" (git-doc core.adoc). A version for the global file: not found.

## Patterns across the seven

- **Location.** Four keep a dot folder or dot file in the home folder (aws, kubectl, docker, npm).
  gh and gcloud use `~/.config/<tool>`; gh alone splits config, state, data and cache by XDG. On
  Windows, gh and gcloud use `%APPDATA%`; aws uses `%UserProfile%\.aws`.
- **Moving.** Every tool has an environment variable. aws and gh have no option; kubectl, docker
  and npm have one, and there the option wins.
- **An empty variable.** Where the source shows it (kubectl, docker, gh), an empty variable is
  treated as not set and the default folder is used.
- **Creation.** Every tool that shows it creates the folder and the file at the first write, never at
  a read.
- **Secrets.** Files with secrets get `0600` in aws, kubectl, gh and npm; docker creates its folder
  `0700`. Three tools can keep secrets outside the files: gh (system credential store), docker
  (credential helper), gcloud (a credentials database).
- **Changing.** Overwrite with no switch: aws, kubectl, npm, git for a single value. Refusal of a
  taken name: docker context create, gh alias set (`--clobber`), git for multi-valued keys (`--all`).
- **Writing.** Temporary file plus rename: docker, git. In place: aws, kubectl, gh, npm.
- **Parallel writers.** A lock file: git (retry 1 s) and kubectl (no retry). No tool found compares
  the file with what it read before writing.
- **Versions.** gh (`version` key with migrations that write back) and kubectl (`apiVersion`, plus
  one location migration). The others: not found.

## What adx takes over

1. **The folder moves only by an environment variable, never by an option** (from aws and gh). The
   variable is the person's choice; an option is the caller's, and the caller may be an agent.
   Decided already; aws shows a large tool works this way.
2. **An empty or wrong variable is refused with `ROOT_NOT_FOUND`** (against kubectl, docker and gh,
   which fall back). A silent fallback writes into a folder the person did not choose; rule 4's
   lesson says refuse. Decided already.
3. **The folder and the file are created at the first write, never at a read** (all seven). A read
   of a missing root sees an empty folder, as oriko does. Nothing on disk changes on a dry run.
4. **Folders `0700`, files `0600`, and a replaced file keeps its mode** (gh, kubectl, aws, docker;
   mode kept from git and docker). An agent's memory can hold queries, names and tokens, and one
   rule for every file is simpler than a list of secret files. Decided (`decisions.md` 17).
5. **A temporary file plus a rename, never an in-place write** (docker, git). An in-place write can
   leave half a file; this is rule 9. Decided already.
6. **Never follow a link** (against docker's `EvalSymlinks`). Rule 4's lesson. Decided already.
7. **Replacing needs `--replace`, and the refusal names it** (gh `--clobber`, docker context create,
   git `--all`). aws, kubectl and npm overwrite silently, which is the case design.md forbids.
   Decided today.
8. **A taken name is never turned into a path** (docker's digest folders, oriko's lookup among the
   files that exist). Already in rule 4.
9. **A check that the file did not change since the plan, before the rename** (no tool found does
   this; git and kubectl lock instead). adx's plan can take seconds, and the agent decides on the
   plan; a lock held that long would block, and a lock alone does not tell the agent that the file
   it planned against has changed. Taken further in `concurrency.md` (decision 20 defers it).
10. **A version only where a schema breaks, with migration in memory** (gh's version chain, but not
    its write back on read). A command that reads must not write (rules 5 and 9), and a tool must
    refuse a file newer than itself so it never drops fields it does not know. Decided
    (`decisions.md` 21).
11. **No XDG split by default** (against gh). One folder and one variable are easier to find, back up
    and move; most adx tools have no config apart from their data. Decided (`decisions.md` 18).
12. **Secrets in a credential store are not taken over** (gh, docker). adx has no keychain API; a
   tool that needs a token reads it from an environment variable. Decided (`decisions.md` 22).
