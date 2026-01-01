# The sandbox keeps each root's state in this repo, beside its code, because a
# GitHub-hosted job reaches no state store without an account. This file
# overrides the s3 backend in main.tf and the platform root's state it reads.
terraform {
  backend "local" {}
}

data "terraform_remote_state" "platform" {
  backend = "local"
  config = {
    path = "../platform/terraform.tfstate"
  }
}
