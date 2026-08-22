import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

const scriptUrl = new URL("./ak-bermet-production-backup.sh", import.meta.url);
const scriptPath = fileURLToPath(scriptUrl);
const script = await readFile(scriptUrl, "utf8");

test("backup is operator-gated and uses the fixed private destination", () => {
  assert.match(
    script,
    /readonly BACKUP_ROOT='\/home\/agent\/ai-prof-backups\/ak-bermet'/
  );
  assert.match(script, /AK_BERMET_BACKUP_APPROVED:-} == 'YES'/);
  assert.match(script, /chmod 0700 -- "\$BACKUP_ROOT"/);
  assert.match(script, /chmod 0600 -- "\$1" SHA256SUMS/);
  assert.match(script, /The backup root must not be a symbolic link/);
});

test("database password is sent over stdin and absent from Docker/process arguments", () => {
  assert.match(
    script,
    /printf '%s\\n' "\$database_password" \| docker run[\s\S]*?--interactive/
  );
  assert.doesNotMatch(script, /--env ['"]?PGPASSWORD=/);
  assert.doesNotMatch(script, /pg_dump[\s\\]*--dbname/);
  assert.match(script, /--env "PGHOST=\$\{database_host\}"/);
  assert.match(script, /--env "PGPORT=\$\{database_port\}"/);
  assert.match(script, /--env "PGUSER=\$\{database_user\}"/);
  assert.match(script, /--env "PGDATABASE=\$\{database_name\}"/);
  assert.match(script, /passfile=\/tmp\/ak-bermet\.pgpass/);
  assert.match(script, /export PGPASSFILE="\$passfile"/);
  assert.match(script, /chmod 0600 "\$passfile"/);
  const pgDumpAt = script.indexOf("    if ! pg_dump");
  const pgDumpEnd = script.indexOf('      2>"$error_file"; then', pgDumpAt);
  assert.ok(pgDumpAt >= 0 && pgDumpEnd > pgDumpAt);
  assert.doesNotMatch(script.slice(pgDumpAt, pgDumpEnd), /\$database_password|\$database_url/);
  assert.match(script, /Refusing to run with shell tracing enabled/);
  assert.match(script, /unset AK_BERMET_DATABASE_URL/);
  assert.match(script, /unset SUPABASE_DB_PASSWORD/);
});

test("Session Pooler URI is decomposed into non-secret libpq parameters", () => {
  assert.match(script, /uri_rest=\$\{database_url#\*:\/\/\}/);
  assert.match(script, /database_user=\$\{userinfo%%:\*\}/);
  assert.match(script, /database_host=\$\{hostport%:\*\}/);
  assert.match(script, /database_port=\$\{hostport##\*:\}/);
  assert.match(script, /database_name=\$\{host_and_path#\*\/\}/);
  assert.match(script, /database_url=''/);
});

test("Docker client enforces read-only transactions and a hardened container", () => {
  assert.match(script, /docker image inspect "\$postgres_image"/);
  assert.match(script, /--read-only/);
  assert.match(script, /--cap-drop=ALL/);
  assert.match(script, /--security-opt=no-new-privileges/);
  assert.match(script, /default_transaction_read_only=on/);
  assert.match(script, /PGSSLMODE=require/);
  assert.match(script, /database URL must not contain query parameters/);
  assert.match(script, /pg_dump[\s\S]*?--format=custom/);
  assert.doesNotMatch(script, /docker (?:pull|build|compose up)/);
});

test("archive and checksum validation happen before atomic publication", () => {
  const restoreListAt = script.indexOf('pg_restore --list "$dump_file"');
  const checksumCreateAt = script.indexOf(
    'sha256sum "$1" > SHA256SUMS'
  );
  const checksumCheckAt = script.indexOf(
    "sha256sum -c SHA256SUMS >/dev/null"
  );
  const publishAt = script.indexOf(
    'mv --no-target-directory -- "$staging_dir" "$final_dir"'
  );

  assert.ok(restoreListAt >= 0);
  assert.ok(restoreListAt < checksumCreateAt);
  assert.ok(checksumCreateAt < checksumCheckAt);
  assert.ok(checksumCheckAt < publishAt);
  assert.match(script, /\.partial/);
  assert.match(script, /error_file=\/tmp\/pg_dump\.stderr/);
  assert.match(script, /no backup was published/);
});

test("backup script cannot apply SQL, migrations, restore, or deployment", () => {
  const executableLines = script
    .split("\n")
    .filter((line) => !line.trimStart().startsWith("#"))
    .join("\n");

  assert.doesNotMatch(executableLines, /\bpsql\b/);
  assert.doesNotMatch(executableLines, /\bsupabase\b/);
  assert.doesNotMatch(executableLines, /pg_restore\s+(?!--list\b)/);
  assert.doesNotMatch(executableLines, /\b(?:git|npm|npx)\b/);
});

test("missing approval fails before a supplied secret can be exposed", () => {
  const sentinel = "do-not-print-this-password";
  const result = spawnSync("bash", [scriptPath], {
    encoding: "utf8",
    env: {
      PATH: process.env.PATH ?? "",
      AK_BERMET_DATABASE_URL: `postgresql://backup:${sentinel}@example.invalid/db`,
      SUPABASE_DB_PASSWORD: sentinel,
    },
  });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Owner approval is required/);
  assert.doesNotMatch(result.stdout, new RegExp(sentinel));
  assert.doesNotMatch(result.stderr, new RegExp(sentinel));
});

test("connection parameters cannot override read-only or TLS enforcement", () => {
  const sentinel = "another-secret-password";
  const result = spawnSync("bash", [scriptPath], {
    encoding: "utf8",
    env: {
      PATH: process.env.PATH ?? "",
      AK_BERMET_BACKUP_APPROVED: "YES",
      AK_BERMET_DATABASE_URL:
        `postgresql://backup:${sentinel}@example.invalid/db?sslmode=disable`,
      SUPABASE_DB_PASSWORD: sentinel,
    },
  });

  assert.equal(result.status, 64);
  assert.match(result.stderr, /must not contain query parameters/);
  assert.doesNotMatch(result.stdout, new RegExp(sentinel));
  assert.doesNotMatch(result.stderr, new RegExp(sentinel));
});
