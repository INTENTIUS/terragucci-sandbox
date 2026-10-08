// In a GitHub job: the token in AWS_WEB_IDENTITY_TOKEN_FILE must verify against
// GitHub's published keys and name this repo, run, commit and event, with the
// audience AWS reads, and the job's role must be the one its kind gets (plan
// or apply). What it found goes to terragucci-report/oidc-<plan|apply>.json,
// which the job keeps as an artifact. Outside a job (the script's own state
// apply) it checks nothing.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createPublicKey, verify } from "node:crypto";
import { resolve } from "node:path";
const e = process.env;
if (e.GITHUB_ACTIONS !== "true") { console.log(JSON.stringify({ job: "none" })); process.exit(0); }
const kind = (e.AWS_ROLE_SESSION_NAME || "none").replace(/^terragucci-/, "");
const out = resolve(e.GITHUB_WORKSPACE || "../../..", "terragucci-report");
const found = { kind, event: e.GITHUB_EVENT_NAME, run_id: e.GITHUB_RUN_ID, problems: [] };
const done = (code) => {
  mkdirSync(out, { recursive: true });
  writeFileSync(resolve(out, `oidc-${kind}.json`), JSON.stringify(found, null, 2) + "\n");
  if (code) { console.error("oidc probe: " + found.problems.join("; ")); process.exit(code); }
  console.log(JSON.stringify({ sub: found.sub, role: found.role }));
  process.exit(0);
};
if (!e.AWS_WEB_IDENTITY_TOKEN_FILE || !e.AWS_ROLE_ARN) { found.problems.push("no AWS_WEB_IDENTITY_TOKEN_FILE or AWS_ROLE_ARN, so the job took no role"); done(1); }
const [h, p, s] = readFileSync(e.AWS_WEB_IDENTITY_TOKEN_FILE, "utf8").trim().split(".");
if (!s) { found.problems.push("the token file holds no JWT"); done(1); }
const dec = (x) => JSON.parse(Buffer.from(x, "base64url").toString());
const head = dec(h), c = dec(p);
const ISS = "https://token.actions.githubusercontent.com";
const conf = await (await fetch(ISS + "/.well-known/openid-configuration")).json();
const jwk = (await (await fetch(conf.jwks_uri)).json()).keys.find((k) => k.kid === head.kid);
found.verified = head.alg === "RS256" && !!jwk
  && verify("sha256", Buffer.from(h + "." + p), createPublicKey({ key: jwk, format: "jwk" }), Buffer.from(s, "base64url"));
if (!found.verified) found.problems.push(`the signature (${head.alg}, kid ${head.kid}) does not verify against ${conf.jwks_uri}`);
// The subject names the repo by name, or by name@id where the owner asks for
// immutable subjects.
const [owner, name] = e.GITHUB_REPOSITORY.split("/");
const what = e.GITHUB_EVENT_NAME === "pull_request" ? "pull_request" : "ref:" + e.GITHUB_REF;
const subs = [`repo:${owner}/${name}:${what}`, `repo:${owner}@${e.GITHUB_REPOSITORY_OWNER_ID}/${name}@${e.GITHUB_REPOSITORY_ID}:${what}`];
if (!subs.includes(c.sub)) found.problems.push(`sub is ${c.sub}, not ${subs.join(" or ")}`);
const want = { iss: ISS, aud: "sts.amazonaws.com", repository: e.GITHUB_REPOSITORY, repository_id: e.GITHUB_REPOSITORY_ID, run_id: e.GITHUB_RUN_ID, sha: e.GITHUB_SHA, event_name: e.GITHUB_EVENT_NAME };
for (const [k, v] of Object.entries(want)) if (String(c[k]) !== String(v)) found.problems.push(`${k} is ${c[k]}, not ${v}`);
found.role = e.AWS_ROLE_ARN.split("/").pop();
// The drift job plans, so it holds the plan role.
if (found.role !== "terragucci-sandbox-" + (kind === "drift" ? "plan" : kind)) found.problems.push(`a ${kind} job holds ${found.role}`);
Object.assign(found, { iss: c.iss, aud: c.aud, sub: c.sub, sha: c.sha });
done(found.problems.length ? 1 : 0);
