// In a GitHub job: the token in AWS_WEB_IDENTITY_TOKEN_FILE must verify against
// GitHub's published keys and name this repo, run, commit and event, with the
// audience AWS reads, and the job's role must be the one its kind gets (plan
// or apply). Outside a job (the script's own state apply) it checks nothing.
import { readFileSync } from "node:fs";
import { createPublicKey, verify } from "node:crypto";
const e = process.env;
if (e.GITHUB_ACTIONS !== "true") { console.log(JSON.stringify({ job: "none" })); process.exit(0); }
const kind = (e.AWS_ROLE_SESSION_NAME || "none").replace(/^terragucci-/, "");
const status = async (state, description) => {
  const r = await fetch(`${e.GITHUB_API_URL}/repos/${e.GITHUB_REPOSITORY}/statuses/${e.TG_SHA || e.GITHUB_SHA}`, {
    method: "POST",
    headers: { authorization: "token " + e.TG_TOKEN, "content-type": "application/json" },
    body: JSON.stringify({ context: "sandbox/oidc-" + kind, state, description: description.slice(0, 140),
      target_url: `${e.GITHUB_SERVER_URL}/${e.GITHUB_REPOSITORY}/actions/runs/${e.GITHUB_RUN_ID}` }),
  });
  if (!r.ok) console.error("oidc probe: the status answered " + r.status);
};
const fail = async (m) => { console.error("oidc probe: " + m); await status("failure", m); process.exit(1); };
if (!e.AWS_WEB_IDENTITY_TOKEN_FILE || !e.AWS_ROLE_ARN) await fail("no AWS_WEB_IDENTITY_TOKEN_FILE or AWS_ROLE_ARN, so the job took no role");
const jwt = readFileSync(e.AWS_WEB_IDENTITY_TOKEN_FILE, "utf8").trim();
const [h, p, s] = jwt.split(".");
if (!s) await fail("the token file holds no JWT");
const dec = (x) => JSON.parse(Buffer.from(x, "base64url").toString());
const head = dec(h), c = dec(p);
const ISS = "https://token.actions.githubusercontent.com";
const conf = await (await fetch(ISS + "/.well-known/openid-configuration")).json();
const jwk = (await (await fetch(conf.jwks_uri)).json()).keys.find((k) => k.kid === head.kid);
if (!jwk) await fail("no key GitHub publishes has kid " + head.kid);
const wrong = [];
if (head.alg !== "RS256") wrong.push("alg " + head.alg);
else if (!verify("sha256", Buffer.from(h + "." + p), createPublicKey({ key: jwk, format: "jwk" }), Buffer.from(s, "base64url"))) wrong.push("the signature does not verify");
const sub = `repo:${e.GITHUB_REPOSITORY}:` + (e.GITHUB_EVENT_NAME === "pull_request" ? "pull_request" : "ref:" + e.GITHUB_REF);
const want = { iss: ISS, aud: "sts.amazonaws.com", sub, repository: e.GITHUB_REPOSITORY, run_id: e.GITHUB_RUN_ID, sha: e.GITHUB_SHA, event_name: e.GITHUB_EVENT_NAME };
for (const [k, v] of Object.entries(want)) if (String(c[k]) !== String(v)) wrong.push(`${k} is ${c[k]}, not ${v}`);
const role = e.AWS_ROLE_ARN.split("/").pop();
if (role !== "terragucci-sandbox-" + kind) wrong.push(`a ${kind} job holds ${role}`);
if (wrong.length) await fail(wrong.join("; "));
await status("success", `${role}: a token GitHub signed for ${c.sub}, audience ${c.aud}`);
console.log(JSON.stringify({ sub: c.sub, role }));
