# The sandbox's OIDC probe. Each plan of this root runs probe.mjs, which checks
# the token terragucci requested for the job's AWS role and writes what it
# found beside the job's report. The sandbox has no cloud account, so nothing
# trades the token with STS.
terraform {
  required_version = "~> 1.13.0"

  required_providers {
    external = {
      source  = "hashicorp/external"
      version = "2.3.5"
    }
  }
}

provider "external" {}

data "external" "oidc" {
  program = ["node", "${path.module}/probe.mjs"]
}

resource "terraform_data" "rev" {
  input = trimspace(file("${path.module}/rev.txt"))
}

output "oidc" {
  value = data.external.oidc.result
}
