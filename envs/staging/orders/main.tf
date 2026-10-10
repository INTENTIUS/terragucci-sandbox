terraform {
  required_version = "~> 1.13.0"

  backend "s3" {
    bucket       = "shop-terraform-state"
    key          = "envs/staging/orders.tfstate"
    region       = "us-east-1"
    use_lockfile = true

    # Path-style S3 addresses work on AWS and on floci, the local stand-in.
    use_path_style = true
  }
}

data "terraform_remote_state" "platform" {
  backend = "s3"
  config = {
    bucket         = "shop-terraform-state"
    key            = "envs/staging/platform.tfstate"
    region         = "us-east-1"
    use_path_style = true
  }
}

module "service" {
  source = "git::https://github.com/INTENTIUS/terragucci-sandbox.git//modules/service?ref=modules/service/v0.1791639902.0"

  env         = "staging"
  name        = "orders"
  logs_bucket = data.terraform_remote_state.platform.outputs.logs_bucket
}

output "jobs_queue" {
  value = module.service.jobs_queue
}
