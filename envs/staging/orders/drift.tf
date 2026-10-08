# The sandbox's drift scenario: a file standing in for the jobs queue, which
# stack/sandbox-github.sh drift deletes outside the code.
resource "local_file" "jobs_queue" {
  filename = "${path.module}/jobs-queue.txt"
  content  = "shop-staging-orders-jobs\n"
}
