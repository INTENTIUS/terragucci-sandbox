terraform {
  required_version = "~> 1.13.0"

  backend "s3" {
    bucket       = "shop-terraform-state"
    key          = "envs/dev/platform.tfstate"
    region       = "us-east-1"
    use_lockfile = true

    # Path-style S3 addresses work on AWS and on floci, the local stand-in.
    use_path_style = true
  }
}

# The dev environment's shared pieces. Every service root in envs/dev reads
# this root's outputs, so it is applied before them.

resource "terraform_data" "logs" {
  input = {
    bucket = "shop-dev-logs"
  }

  triggers_replace = ["shop-dev-logs"]
}

output "logs_bucket" {
  value = terraform_data.logs.input.bucket
}
