# terragucci sandbox

A plan-only copy of the [terragucci example](https://github.com/INTENTIUS/terragucci/tree/main/example), run by `stack/sandbox-github.sh` in [INTENTIUS/terragucci](https://github.com/INTENTIUS/terragucci). The GitHub screenshots in terragucci's docs are taken here.

| What | How |
|---|---|
| Resources | each AWS resource of the example is a `terraform_data` holding its arguments, so a plan or an apply needs no cloud account and spends nothing |
| State | each root's `terraform.tfstate` sits beside its code; `state_override.tf` points the backend there, and the script commits the state after an apply |
| Pipeline | `.github/workflows/terragucci.yml` as `npx @intentius/terragucci@0.3.1 init` writes it, on the published images |
| Approvals | `.chant/allowed_signers` lists a key made for one sandbox run |

The script resets this repo to its first commit, so its pull requests and history do not last.
